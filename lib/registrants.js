import { OCCUPANCY, ROLES, fmtDate, fmtDateTime } from '@/lib/labels'

// כל הנרשמים: משתמשים שנכנסו, הרשאות שטרם נוצלו ובקשות הרשמה
export async function loadRegistrants(supabase) {
  const [{ data: profiles }, { data: invites }, { data: apts }, { data: requests }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('invites').select('*'),
    supabase.from('apartments').select('*'),
    supabase.from('registration_requests').select('*').order('created_at', { ascending: false }),
  ])
  const aptById = Object.fromEntries((apts || []).map((a) => [a.id, a]))
  const row = (src, kind) => {
    const a = aptById[src.apartment_id] || {}
    return {
      kind, email: src.email, full_name: src.full_name, phone: src.phone, role: ROLES[src.role] || '',
      apartment: a.building ? `${a.building} / ${a.unit}` : '', apartment_id: src.apartment_id,
      occupancy: OCCUPANCY[a.occupancy] || '', renter_name: a.renter_name || '', renter_phone: a.renter_phone || '',
      lease_end: fmtDate(a.lease_end), signed: a.building ? (a.signed ? 'כן' : 'לא') : '',
      created: fmtDate(src.created_at), last_seen: fmtDateTime(src.last_seen_at),
    }
  }
  const users = (profiles || []).map((p) => row(p, 'נכנס לפורטל'))
  const notYet = (invites || []).filter((i) => !(profiles || []).some((p) => p.email === i.email)).map((i) => row(i, 'טרם נכנס'))
  return { users: [...users, ...notYet], requests: requests || [] }
}

export const COLUMNS = [
  ['full_name', 'שם'], ['email', 'מייל'], ['phone', 'טלפון'], ['role', 'תפקיד'], ['apartment', 'דירה'],
  ['occupancy', 'מגורים'], ['renter_name', 'שם השוכר'], ['renter_phone', 'טלפון השוכר'], ['lease_end', 'סיום שכירות'],
  ['signed', 'חתם'], ['kind', 'מצב'], ['created', 'נרשם'], ['last_seen', 'כניסה אחרונה'],
]
