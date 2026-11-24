'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
    p_full_name: val(f, 'full_name'), p_phone: val(f, 'phone'), p_occupancy: val(f, 'occupancy') || 'owner',
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
  const { data: me } = await supabase.rpc('my_role')
  const staff = me === 'admin' || me === 'lawyer'
  await log(supabase, staff ? 'פרסם הודעה' : 'שלח הודעה', title)
  revalidatePath('/board'); revalidatePath('/'); revalidatePath('/admin')
  if (staff) return { ok: 'פורסם' }
  return { ok: row.visibility === 'public'
    ? 'ההודעה נשלחה ותתפרסם לכל הדיירים אחרי אישור הנציגות.'
    : 'ההודעה נשלחה. רק הנציגות' + (row.to_lawyers ? ' ועורכי הדין' : '') + ' יראו אותה.' }
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

// פרסום הודעה או תגובה של דייר לכל הדיירים (מנהל בלבד, נאכף במסד הנתונים)
export async function approvePost(f) {
  const supabase = await createClient()
  await supabase.from('posts').update({ approved: true, visibility: 'public' }).eq('id', num(f, 'id'))
  await log(supabase, 'אישר פרסום הודעה', val(f, 'title'))
  revalidatePath('/board'); revalidatePath('/admin')
}

export async function approveReply(f) {
  const supabase = await createClient()
  await supabase.from('replies').update({ approved: true, visibility: 'public' }).eq('id', num(f, 'id'))
  await log(supabase, 'אישר פרסום תגובה', val(f, 'title'))
  revalidatePath('/board'); revalidatePath('/admin')
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
  const email = (val(f, 'email') || '').toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'כתובת מייל לא תקינה' }
  const row = { email, phone: val(f, 'phone'), full_name: val(f, 'full_name'), role: val(f, 'role') || 'tenant', apartment_id: num(f, 'apartment_id') }
  const { error } = await supabase.from('invites').upsert(row)
  if (error) return { error: 'השמירה נכשלה' }
  // אם המשתמש כבר נכנס בעבר, מעדכנים גם את הפרופיל הקיים
  await supabase.from('profiles').update({ role: row.role, apartment_id: row.apartment_id, full_name: row.full_name }).eq('email', email)
  await log(supabase, 'הוסיף משתמש מורשה', `${row.full_name || ''} ${email}`)
  revalidatePath('/admin'); if (row.apartment_id) revalidatePath(`/admin/apartments/${row.apartment_id}`)
  return { ok: 'נשמר. המשתמש יוכל להיכנס עם כתובת המייל הזו.' }
}

export async function updateProfile(f) {
  const supabase = await createClient()
  await supabase.from('profiles').update({ role: val(f, 'role'), apartment_id: num(f, 'apartment_id') }).eq('id', val(f, 'id'))
  await log(supabase, 'עדכן הרשאות משתמש', val(f, 'label'))
  revalidatePath('/admin')
}

// אישור בקשת הרשמה: משייך את הדייר לדירה קיימת, או יוצר דירה חדשה לפי הכתובת
export async function approveRequest(_prev, f) {
  const supabase = await createClient()
  const { data: r } = await supabase.from('registration_requests').select('*').eq('id', num(f, 'id')).single()
  if (!r) return { error: 'הבקשה לא נמצאה' }
  const email = (r.email || '').toLowerCase()
  let aptId = num(f, 'apartment_id')
  if (!aptId) {
    const building = val(f, 'building'), unit = val(f, 'unit')
    if (!building || !unit) return { error: 'בחר דירה קיימת מהרשימה, או מלא בניין ומספר דירה כדי ליצור דירה חדשה' }
    const { data: found } = await supabase.from('apartments').select('id').eq('building', building).eq('unit', unit).maybeSingle()
    if (found) aptId = found.id
    else {
      const { data: apt, error } = await supabase.from('apartments').insert({ building, unit }).select('id').single()
      if (error) return { error: 'יצירת הדירה נכשלה' }
      aptId = apt.id
      await log(supabase, 'הוסיף דירה', `${building} / ${unit}`)
    }
  }
  // לא מורידים הרשאה של מנהל או עורך דין שנרשם גם כדייר
  const { data: existing } = await supabase.from('invites').select('role').eq('email', email).maybeSingle()
  const { data: prof } = await supabase.from('profiles').select('role').eq('email', email).maybeSingle()
  const role = [existing?.role, prof?.role].find((x) => x === 'admin' || x === 'lawyer') || 'tenant'
  const { error: invErr } = await supabase.from('invites').upsert({ email, phone: r.phone, full_name: r.full_name, role, apartment_id: aptId })
  if (invErr) return { error: 'השמירה נכשלה' }
  await supabase.from('profiles').update({ role, apartment_id: aptId, full_name: r.full_name, phone: r.phone }).eq('email', email)
  // סוגרים את כל הבקשות של אותו מייל (גם כפולות)
  await supabase.from('registration_requests').update({ handled: true }).eq('email', r.email)
  await supabase.from('registration_requests').update({ status: 'approved' }).eq('email', r.email)
  await log(supabase, 'אישר בקשת הרשמה', `${r.full_name} ${email}`)
  revalidatePath('/admin'); revalidatePath('/admin/users')
  return { ok: 'אושר' }
}

export async function markRequestHandled(f) {
  const supabase = await createClient()
  await supabase.from('registration_requests').update({ handled: true }).eq('id', num(f, 'id'))
  await supabase.from('registration_requests').update({ status: 'rejected' }).eq('id', num(f, 'id'))
  await log(supabase, 'דחה בקשת הרשמה', val(f, 'label'))
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
  revalidatePath('/admin'); revalidatePath('/binder'); if (aptId) revalidatePath(`/admin/apartments/${aptId}`)
  return { ok: 'המסמך הועלה' }
}

export async function deleteDocument(f) {
  const supabase = await createClient()
  const { data: doc } = await supabase.from('documents').select('*').eq('id', num(f, 'id')).single()
  if (!doc) return
  await supabase.storage.from('documents').remove([doc.storage_path])
  await supabase.from('documents').delete().eq('id', doc.id)
  await log(supabase, 'מחק מסמך', doc.title)
  revalidatePath('/admin'); revalidatePath('/binder'); if (doc.apartment_id) revalidatePath(`/admin/apartments/${doc.apartment_id}`)
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
  revalidatePath('/'); revalidatePath('/admin'); revalidatePath('/admin/events')
  return { ok: 'המפגש פורסם' }
}

export async function updateMeeting(_prev, f) {
  const supabase = await createClient()
  const date = val(f, 'date'), time = val(f, 'time') || '19:00'
  if (!val(f, 'title') || !date) return { error: 'נא להזין שם ותאריך' }
  const { error } = await supabase.from('meetings').update({
    title: val(f, 'title'), starts_at: `${date} ${time}:00 Asia/Jerusalem`, location: val(f, 'location'), notes: val(f, 'notes'),
  }).eq('id', num(f, 'id'))
  if (error) return { error: 'השמירה נכשלה' }
  await log(supabase, 'עדכן מפגש', val(f, 'title'))
  revalidatePath('/'); revalidatePath('/admin'); revalidatePath('/admin/events')
  return { ok: 'נשמר' }
}

export async function deleteMeeting(f) {
  const supabase = await createClient()
  await supabase.from('meetings').delete().eq('id', num(f, 'id'))
  await log(supabase, 'מחק מפגש', val(f, 'title'))
  revalidatePath('/'); revalidatePath('/admin'); revalidatePath('/admin/events')
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

// ---------- אימות בעלות ----------
export async function voteOwner(_prev, f) {
  const supabase = await createClient()
  const vote = val(f, 'vote')
  const { error } = await supabase.rpc('vote_owner', { p_subject: val(f, 'subject'), p_vote: vote, p_note: val(f, 'note') })
  revalidatePath('/me'); revalidatePath('/admin')
  if (error) return { error: 'הפעולה נכשלה' }
  return { ok: vote === 'confirm' ? 'תודה, האישור נרשם.' : 'הדיווח נשלח לנציגות, והיא תבדוק אותו.' }
}

export async function resolveReport(f) {
  const supabase = await createClient()
  const subject = val(f, 'subject')
  const remove = val(f, 'action') === 'remove'
  if (remove) {
    const { data: p } = await supabase.from('profiles').select('email, apartment_id').eq('id', subject).single()
    await supabase.from('profiles').update({ apartment_id: null, role: 'pending' }).eq('id', subject)
    if (p?.email) await supabase.from('invites').delete().eq('email', p.email)
    await supabase.from('ownership_votes').delete().eq('subject_id', subject)
  } else {
    await supabase.from('ownership_votes').update({ resolved: true }).eq('subject_id', subject).eq('vote', 'report')
  }
  await log(supabase, remove ? 'הסיר משתמש מדירה בעקבות דיווח' : 'דחה דיווח על בעלות', val(f, 'label'))
  revalidatePath('/admin'); revalidatePath('/me')
  const apt = val(f, 'apartment_id'); if (apt) revalidatePath(`/admin/apartments/${apt}`)
}
