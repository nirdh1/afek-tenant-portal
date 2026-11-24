export const CATEGORIES = {
  meetings: 'כנסים',
  agreement_progress: 'התקדמות ההסכם',
  lawyers: 'שאלה לעורכי הדין',
  general: 'כללי',
}
export const DOC_CATEGORIES = {
  binder: 'אוגדן דיירים',
  nesach: 'נסח טאבו',
  agreement: 'הסכם',
  sale_contract: 'חוזה מכר',
  measurement: 'מדידה',
  presentation: 'מצגת',
  other: 'אחר',
}
export const OCCUPANCY = { owner: 'הבעלים גרים בדירה', rented: 'הדירה מושכרת', empty: 'הדירה ריקה' }
export const ROLES = { pending: 'ממתין לאישור', tenant: 'דייר', lawyer: 'עורך דין', admin: 'נציגות' }
export const STAGES = [
  'היערכות לקידום ההסכם', 'משא ומתן עם היזם', 'איסוף חתימות',
  'הגשת תוכנית לוועדה', 'היתר בנייה', 'פינוי ובנייה', 'מסירת דירות',
]

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '')
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }) : ''

// 050-1234567 -> 972501234567 (הפורמט שבו Supabase שומר טלפונים)
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) d = d.slice(1)
  return '972' + d
}
