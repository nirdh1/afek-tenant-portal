'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/labels'

const val = (f, k) => {
  const v = f.get(k)
  return v === null || String(v).trim() === '' ? null : String(v).trim()
}
const num = (f, k) => (val(f, k) === null ? null : Number(val(f, k)))
const log = (supabase, action, details) => supabase.rpc('log_activity', { p_action: action, p_details: details ?? null })

// ---------- דייר ----------
export async function updateMyDetails(_prev, f) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('update_my_details', {
    p_full_name: val(f, 'full_name'), p_email: val(f, 'email'), p_occupancy: val(f, 'occupancy') || 'owner',
    p_renter_name: val(f, 'renter_name'), p_renter_phone: val(f, 'renter_phone'), p_lease_end: val(f, 'lease_end'),
  })
  revalidatePath('/me')
  return error ? { error: 'השמירה נכשלה' } : { ok: 'הפרטים נשמרו' }
}

// ---------- לוח הודעות ----------
export async function createPost(_prev, f) {
  const supabase = await createClient()
  const title = val(f, 'title')
  if (!title) return { error: 'נא להזין כותרת' }
  const row = {
    category: val(f, 'category'), title, body: val(f, 'body'),
    visibility: val(f, 'visibility') || 'public',
    to_lawyers: f.get('to_lawyers') === 'on' || val(f, 'category') === 'lawyers',
    is_announcement: f.get('is_announcement') === 'on',
  }
  const { error } = await supabase.from('posts').insert(row)
  if (error) return { error: 'הפרסום נכשל' }
  await log(supabase, row.visibility === 'private' ? 'פרסם הודעה פרטית' : 'פרסם הודעה', title)
  revalidatePath('/board'); revalidatePath('/')
  return { ok: row.to_lawyers ? 'נשלח. עורכי הדין יראו את ההודעה בלוח.' : 'פורסם' }
}

export async function createReply(f) {
  const supabase = await createClient()
  const body = val(f, 'body')
  if (!body) return
  const postId = num(f, 'post_id')
  const visibility = val(f, 'visibility') || 'public'
  await supabase.from('replies').insert({ post_id: postId, body, visibility })
  await log(supabase, visibility === 'private' ? 'ענה באופן פרטי' : 'ענה פומבית', val(f, 'post_title'))
  revalidatePath('/board')
}

export async function deletePost(f) {
  const supabase = await createClient()
  await supabase.from('posts').delete().eq('id', num(f, 'id'))
  revalidatePath('/board'); revalidatePath('/')
}

// ---------- ניהול ----------
const APT_FIELDS = ['building', 'unit', 'gush', 'helka', 'sub_helka', 'compensation', 'occupancy',
  'renter_name', 'renter_phone', 'lease_end', 'measured_at', 'signed_at', 'notes']

function aptFromForm(f) {
  const row = {}
  APT_FIELDS.forEach((k) => (row[k] = val(f, k)))
  row.registered_area = num(f, 'registered_area')
  row.measured_area = num(f, 'measured_area')
  row.signed = f.get('signed') === 'on'
  if (!row.occupancy) row.occupancy = 'owner'
  return row
}

export async function createApartment(_prev, f) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('apartments').insert(aptFromForm(f)).select('id').single()
  if (error) return { error: error.code === '23505' ? 'הדירה כבר קיימת' : 'השמירה נכשלה' }
  await log(supabase, 'הוסיף דירה', `${val(f, 'building')} / ${val(f, 'unit')}`)
  redirect(`/admin/apartments/${data.id}`)
}

export async function updateApartment(_prev, f) {
  const supabase = await createClient()
  const id = num(f, 'id')
  const { error } = await supabase.from('apartments').update(aptFromForm(f)).eq('id', id)
  if (error) return { error: 'השמירה נכשלה' }
  await log(supabase, 'עדכן פרטי דירה', `${val(f, 'building')} / ${val(f, 'unit')}`)
  revalidatePath(`/admin/apartments/${id}`); revalidatePath('/admin')
  return { ok: 'נשמר' }
}

export async function inviteUser(_prev, f) {
  const supabase = await createClient()
  const phone = normalizePhone(val(f, 'phone'))
  if (phone.length < 11) return { error: 'מספר טלפון לא תקין' }
  const row = { phone, full_name: val(f, 'full_name'), role: val(f, 'role') || 'tenant', apartment_id: num(f, 'apartment_id') }
  const { error } = await supabase.from('invites').upsert(row)
  if (error) return { error: 'השמירה נכשלה' }
  // אם המשתמש כבר נכנס בעבר, מעדכנים גם את הפרופיל הקיים
  await supabase.from('profiles').update({ role: row.role, apartment_id: row.apartment_id, full_name: row.full_name }).eq('phone', phone)
  await log(supabase, 'הוסיף משתמש מורשה', `${row.full_name || ''} ${phone}`)
  revalidatePath('/admin'); if (row.apartment_id) revalidatePath(`/admin/apartments/${row.apartment_id}`)
  return { ok: 'נשמר. המשתמש יוכל להיכנס עם מספר הטלפון.' }
}

export async function updateProfile(f) {
  const supabase = await createClient()
  await supabase.from('profiles').update({ role: val(f, 'role'), apartment_id: num(f, 'apartment_id') }).eq('id', val(f, 'id'))
  await log(supabase, 'עדכן הרשאות משתמש', val(f, 'label'))
  revalidatePath('/admin')
}

export async function markRequestHandled(f) {
  const supabase = await createClient()
  await supabase.from('registration_requests').update({ handled: true }).eq('id', num(f, 'id'))
  revalidatePath('/admin')
}

export async function uploadDocument(_prev, f) {
  const supabase = await createClient()
  const file = f.get('file')
  if (!file || !file.size) return { error: 'נא לבחור קובץ' }
  const aptId = num(f, 'apartment_id')
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${aptId ? 'apt-' + aptId : 'general'}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { contentType: file.type })
  if (upErr) return { error: 'ההעלאה נכשלה' }
  const title = val(f, 'title') || file.name
  const { error } = await supabase.from('documents').insert({
    apartment_id: aptId, category: val(f, 'category') || 'other', title, storage_path: path,
    is_public: !aptId && f.get('is_public') === 'on',
  })
  if (error) { await supabase.storage.from('documents').remove([path]); return { error: 'השמירה נכשלה' } }
  await log(supabase, 'העלה מסמך', title)
  revalidatePath('/admin'); if (aptId) revalidatePath(`/admin/apartments/${aptId}`)
  return { ok: 'המסמך הועלה' }
}

export async function deleteDocument(f) {
  const supabase = await createClient()
  const { data: doc } = await supabase.from('documents').select('*').eq('id', num(f, 'id')).single()
  if (!doc) return
  await supabase.storage.from('documents').remove([doc.storage_path])
  await supabase.from('documents').delete().eq('id', doc.id)
  await log(supabase, 'מחק מסמך', doc.title)
  revalidatePath('/admin'); if (doc.apartment_id) revalidatePath(`/admin/apartments/${doc.apartment_id}`)
}

export async function createMeeting(_prev, f) {
  const supabase = await createClient()
  const date = val(f, 'date'), time = val(f, 'time') || '19:00'
  if (!val(f, 'title') || !date) return { error: 'נא להזין שם ותאריך' }
  // Postgres מפרש את השעה לפי שעון ישראל, כולל שעון קיץ
  const startsAt = `${date} ${time}:00 Asia/Jerusalem`
  const { error } = await supabase.from('meetings').insert({
    title: val(f, 'title'), starts_at: startsAt, location: val(f, 'location'), notes: val(f, 'notes'),
  })
  if (error) return { error: 'השמירה נכשלה' }
  await log(supabase, 'פרסם מפגש', val(f, 'title'))
  revalidatePath('/'); revalidatePath('/admin')
  return { ok: 'המפגש פורסם' }
}

export async function deleteMeeting(f) {
  const supabase = await createClient()
  await supabase.from('meetings').delete().eq('id', num(f, 'id'))
  revalidatePath('/'); revalidatePath('/admin')
}

export async function updateStatus(_prev, f) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_status')
    .update({ stage: val(f, 'stage'), signed_target: num(f, 'signed_target') || 66, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) return { error: 'השמירה נכשלה' }
  await log(supabase, 'עדכן את מצב הפרויקט', val(f, 'stage'))
  revalidatePath('/'); revalidatePath('/admin')
  return { ok: 'נשמר' }
}
