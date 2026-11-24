import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { loadRegistrants, COLUMNS } from '@/lib/registrants'
import { fmtDate } from '@/lib/labels'

export const dynamic = 'force-dynamic'

const STATUS = { pending: ['ממתינה', 'wait'], approved: ['אושרה', 'ok'], rejected: ['נדחתה', 'lock'] }

export default async function UsersPage({ searchParams }) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { users, requests } = await loadRegistrants(supabase)
  const match = (r) => !q || Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase())
  const shown = users.filter(match)

  return (
    <section>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>כל הנרשמים ({shown.length})</h3>
          <div className="inline" style={{ marginTop: 0 }}>
            <form className="inline" style={{ marginTop: 0 }}><input name="q" defaultValue={q || ''} placeholder="חיפוש בכל השדות" /><button className="btn btn-light">חיפוש</button></form>
            <a className="btn btn-navy" href="/admin/export" style={{ textDecoration: 'none' }}>ייצוא לאקסל</a>
          </div>
        </div>
        <div className="tbl" style={{ marginTop: 12 }}><table>
          <thead><tr>{COLUMNS.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.email}>{COLUMNS.map(([k]) => (
              <td key={k} dir={['email', 'phone', 'renter_phone'].includes(k) ? 'ltr' : undefined} style={{ textAlign: 'right' }}>
                {k === 'apartment' && r.apartment_id ? <Link href={`/admin/apartments/${r.apartment_id}`}>{r[k]}</Link> : r[k] || '—'}
              </td>
            ))}</tr>
          ))}</tbody>
        </table></div>
      </div>

      <div className="card" style={{ marginTop: 18 }}><h3>בקשות הרשמה מהאתר ({requests.length})</h3>
        <div className="tbl"><table>
          <thead><tr><th>תאריך</th><th>שם</th><th>מייל</th><th>טלפון</th><th>כתובת</th><th>סטטוס</th></tr></thead>
          <tbody>{requests.filter(match).map((r) => {
            const [label, cls] = STATUS[r.status] || STATUS.pending
            return (
              <tr key={r.id}><td className="small">{fmtDate(r.created_at)}</td><td>{r.full_name}</td>
                <td dir="ltr" style={{ textAlign: 'right' }}>{r.email}</td><td dir="ltr" style={{ textAlign: 'right' }}>{r.phone}</td>
                <td>{r.address}</td><td><span className={`pill ${cls}`}>{label}</span></td></tr>
            )
          })}</tbody>
        </table></div>
        <p className="small">אישור או דחייה של בקשה ממתינה נעשים ב<Link href="/admin">לוח הבקרה</Link>.</p>
      </div>
    </section>
  )
}
