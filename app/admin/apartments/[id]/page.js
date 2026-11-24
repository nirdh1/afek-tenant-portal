import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DOC_CATEGORIES, ROLES, fmtDate, fmtDateTime } from '@/lib/labels'
import { deleteDocument } from '@/app/actions'
import { ApartmentForm, InviteForm, UploadForm } from '@/components/AdminForms'

export const dynamic = 'force-dynamic'

export default async function ApartmentPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: apt } = await supabase.from('apartments').select('*').eq('id', id).single()
  if (!apt) notFound()
  const [{ data: owners }, { data: invites }, { data: docs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('apartment_id', id),
    supabase.from('invites').select('*').eq('apartment_id', id),
    supabase.from('documents').select('*').eq('apartment_id', id).order('created_at', { ascending: false }),
  ])
  const ownerIds = (owners || []).map((o) => o.id)
  const { data: acts } = ownerIds.length
    ? await supabase.from('activity_log').select('*').in('user_id', ownerIds).order('created_at', { ascending: false }).limit(50)
    : { data: [] }

  return (
    <section>
      <p><Link href="/admin">חזרה לניהול</Link></p>
      <div className="card"><h3>{apt.building}, דירה {apt.unit}</h3><ApartmentForm apt={apt} /></div>
      <div className="grid g2">
        <div className="card"><h3>מסמכי הדירה</h3>
          {docs?.length ? docs.map((d) => (
            <form key={d.id} action={deleteDocument} className="inline">
              <input type="hidden" name="id" value={d.id} />
              <a href={`/doc/${d.id}`} target="_blank" style={{ flex: 1 }}>{d.title}</a>
              <span className="small">{DOC_CATEGORIES[d.category]} · {fmtDate(d.created_at)}</span>
              <button className="btn btn-light" style={{ padding: '4px 12px', fontSize: 13 }}>מחיקה</button>
            </form>
          )) : <p className="small">אין מסמכים.</p>}
          <h3 style={{ marginTop: 20 }} id="upload">העלאת נסח טאבו או מסמך אחר לדירה</h3>
          <p className="small">המסמך יוצג רק לבעלי הדירה הזו, לנציגות ולעורכי הדין.</p>
          <UploadForm apartmentId={apt.id} />
        </div>
        <div className="card"><h3>בעלי הדירה</h3>
          {(owners || []).map((o) => (
            <div className="item" key={o.id}><b>{o.full_name || 'ללא שם'}</b>
              <span className="small"><span dir="ltr">{o.email}</span> · <span dir="ltr">{o.phone || 'ללא טלפון'}</span> · {ROLES[o.role]} · כניסה אחרונה {fmtDateTime(o.last_seen_at) || '—'}</span></div>
          ))}
          {(invites || []).filter((i) => !(owners || []).some((o) => o.email === i.email)).map((i) => (
            <div className="item" key={i.email}><b>{i.full_name}</b><span className="small"><span dir="ltr">{i.email}</span> · טרם נכנס</span></div>
          ))}
          <h3 style={{ marginTop: 20 }}>הוספת בעלים</h3>
          <InviteForm apartmentId={apt.id} />
        </div>
      </div>
      <div className="card" style={{ marginTop: 18 }}><h3>פעילות בעלי הדירה</h3>
        {acts?.length ? <div className="tbl"><table><tbody>{acts.map((a) => (
          <tr key={a.id}><td className="small">{fmtDateTime(a.created_at)}</td><td>{a.action}</td><td className="small">{a.details}</td></tr>
        ))}</tbody></table></div> : <p className="small">אין פעילות עדיין.</p>}
      </div>
    </section>
  )
}
