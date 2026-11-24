import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DOC_CATEGORIES, OCCUPANCY, ROLES, fmtDate, fmtDateTime } from '@/lib/labels'
import { approveRequest, markRequestHandled, updateProfile, deleteDocument, resolveReport } from '@/app/actions'
import { ApartmentForm, InviteForm, UploadForm, StatusForm } from '@/components/AdminForms'

export const dynamic = 'force-dynamic'

export default async function AdminPage({ searchParams }) {
  const { who, q } = await searchParams
  const supabase = await createClient()
  let acts = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200)
  if (who && ROLES[who]) acts = acts.eq('role', who)
  const [apts, profiles, invites, requests, activity, meetings, status, docs, openQ] = await Promise.all([
    supabase.from('apartments').select('*').order('building').order('unit'),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('invites').select('*'),
    supabase.from('registration_requests').select('*').eq('handled', false).order('created_at'),
    acts,
    supabase.from('meetings').select('*').order('starts_at', { ascending: false }).limit(10),
    supabase.from('project_status').select('*').single(),
    supabase.from('documents').select('*').is('apartment_id', null).neq('category', 'binder').order('created_at', { ascending: false }),
    supabase.from('posts').select('id, replies(id)').eq('to_lawyers', true),
  ])
  const { data: reports } = await supabase.from('ownership_votes').select('*').eq('vote', 'report').eq('resolved', false).order('created_at', { ascending: false })
  const { count: pendingPosts } = await supabase.from('posts').select('id', { count: 'exact', head: true }).eq('approved', false)
  const apartments = apts.data || []
  const users = profiles.data || []
  const docsByApt = {}
  const { data: aptDocs } = await supabase.from('documents').select('apartment_id, category').not('apartment_id', 'is', null)
  ;(aptDocs || []).forEach((d) => { (docsByApt[d.apartment_id] ||= new Set()).add(d.category) })
  const ownersByApt = {}
  users.forEach((u) => u.apartment_id && (ownersByApt[u.apartment_id] ||= []).push(u))
  const tenants = users.filter((u) => u.role === 'tenant').length
  const signed = apartments.filter((a) => a.signed).length
  const unanswered = (openQ.data || []).filter((p) => !p.replies?.length).length
  const pending = users.filter((u) => u.role === 'pending')
  const aptLabel = (id) => { const a = apartments.find((x) => x.id === id); return a ? `${a.building} / ${a.unit}` : '—' }
  const shown = q ? apartments.filter((a) => `${a.building} ${a.unit} ${(ownersByApt[a.id] || []).map((o) => o.full_name).join(' ')}`.includes(q)) : apartments

  return (
    <section>
      <div className="grid g3" style={{ marginTop: 0 }}>
        <div className="card stat"><div className="lbl">דיירים רשומים בפורטל</div><div className="val">{tenants}</div>
          <div className="small">{apartments.length} דירות במתחם</div></div>
        <div className="card stat"><div className="lbl">חתימות על ההסכם</div><div className="val">{signed} / {apartments.length}</div>
          <div className="progress"><span style={{ width: `${apartments.length ? (signed / apartments.length) * 100 : 0}%` }} /></div>
          <div className="small">יעד: {status.data?.signed_target}%</div></div>
        <div className="card stat"><div className="lbl">שאלות לעורכי הדין שלא נענו</div><div className="val">{unanswered}</div>
          <div className="small"><Link href="/board?cat=lawyers">ללוח השאלות</Link></div></div>
      </div>

      {reports?.length > 0 && (
        <div className="card" style={{ marginTop: 18, borderColor: 'var(--gold)' }}><h3>דיווחים על בעלות ({reports.length})</h3>
          {Object.values(reports.reduce((acc, r) => { (acc[r.subject_id] ||= []).push(r); return acc }, {})).map((rs) => {
            const r = rs[0]
            const subj = users.find((u) => u.id === r.subject_id)
            const voters = rs.map((x) => users.find((u) => u.id === x.voter_id)?.full_name || 'בעלים').join(', ')
            const label = `${subj?.full_name || ''} ${subj?.email || ''} · ${aptLabel(r.apartment_id)}`
            return (
              <div className="item" key={r.subject_id}>
                <div><b>{subj?.full_name || 'ללא שם'}</b> (<span dir="ltr">{subj?.email}</span>) רשום על <Link href={`/admin/apartments/${r.apartment_id}`}>{aptLabel(r.apartment_id)}</Link></div>
                <div className="small">דווח על ידי: {voters}{rs.some((x) => x.note) && <> · הערות: {rs.filter((x) => x.note).map((x) => x.note).join(' | ')}</>}</div>
                <div className="inline">
                  <form action={resolveReport}>
                    <input type="hidden" name="subject" value={r.subject_id} /><input type="hidden" name="action" value="remove" />
                    <input type="hidden" name="label" value={label} /><input type="hidden" name="apartment_id" value={r.apartment_id} />
                    <button className="btn btn-navy" style={{ padding: '6px 14px' }}>הסרה מהדירה</button>
                  </form>
                  <form action={resolveReport}>
                    <input type="hidden" name="subject" value={r.subject_id} /><input type="hidden" name="action" value="dismiss" />
                    <input type="hidden" name="label" value={label} /><input type="hidden" name="apartment_id" value={r.apartment_id} />
                    <button className="btn btn-light" style={{ padding: '6px 14px' }}>הדיווח לא נכון, להשאיר</button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pendingPosts > 0 && (
        <div className="note" style={{ marginTop: 18 }}>
          יש <b>{pendingPosts}</b> הודעות של דיירים שממתינות לאישור שלך. <Link href="/board?pending=1">לצפייה ואישור</Link>
        </div>
      )}

      {(pending.length > 0 || requests.data?.length > 0) && (
        <div className="card" style={{ marginTop: 18 }}><h3>ממתינים לאישור</h3>
          {pending.map((u) => (
            <form key={u.id} action={updateProfile} className="inline">
              <input type="hidden" name="id" value={u.id} /><input type="hidden" name="label" value={u.email} />
              <span dir="ltr">{u.email}</span>
              <select name="apartment_id" defaultValue=""><option value="">בחירת דירה</option>
                {apartments.map((a) => <option key={a.id} value={a.id}>{a.building} / {a.unit}</option>)}</select>
              <select name="role" defaultValue="tenant">{['tenant', 'lawyer', 'admin'].map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}</select>
              <button className="btn btn-navy">אישור</button>
            </form>
          ))}
          {requests.data?.map((r) => (
            <div key={r.id} className="item">
              <div>בקשת הרשמה: <b>{r.full_name}</b> · <span dir="ltr">{r.email}</span>{r.phone && <> · <span dir="ltr">{r.phone}</span></>}{r.address && <> · {r.address}</>} · <span className="small">{fmtDate(r.created_at)}</span></div>
              <form action={approveRequest} className="inline">
                <input type="hidden" name="id" value={r.id} />
                <select name="apartment_id" defaultValue="" style={{ flex: 2 }}>
                  <option value="">דירה חדשה (לפי השדות משמאל)</option>
                  {apartments.map((a) => <option key={a.id} value={a.id}>{a.building} / {a.unit}</option>)}
                </select>
                <input name="building" placeholder="בניין, למשל רבין 12" defaultValue={r.address || ''} />
                <input name="unit" placeholder="מס' דירה" style={{ maxWidth: 110 }} />
                <button className="btn btn-navy">אישור</button>
              </form>
              <form action={markRequestHandled} style={{ marginTop: 6 }}>
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="label" value={`${r.full_name} ${r.email}`} />
                <button className="btn btn-light" style={{ padding: '4px 12px', fontSize: 13 }}>דחיית הבקשה</button>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>רשימת דירות ודיירים</h3>
          <form className="inline" style={{ marginTop: 0 }}><input name="q" defaultValue={q || ''} placeholder="חיפוש לפי כתובת או שם" /><button className="btn btn-light">חיפוש</button></form>
        </div>
        <div className="tbl"><table>
          <thead><tr><th>כתובת / דירה</th><th>בעלים</th><th>מגורים</th><th>שטח בנסח</th><th>שטח מדוד</th><th>נסח</th><th>הסכם</th><th>כניסה אחרונה</th></tr></thead>
          <tbody>{shown.map((a) => {
            const owners = ownersByApt[a.id] || []
            const last = owners.map((o) => o.last_seen_at).filter(Boolean).sort().pop()
            return (
              <tr key={a.id}>
                <td><Link href={`/admin/apartments/${a.id}`}>{a.building} / {a.unit}</Link></td>
                <td>{owners.map((o) => o.full_name).join(', ') || <span className="small">לא רשום</span>}</td>
                <td>{OCCUPANCY[a.occupancy]}</td>
                <td>{a.registered_area ?? '—'}</td>
                <td>{a.measured_area ?? '—'}</td>
                <td>{docsByApt[a.id]?.has('nesach') ? <span className="pill ok">קיים</span> : <Link href={`/admin/apartments/${a.id}#upload`} className="pill wait">חסר · העלאה</Link>}</td>
                <td>{a.signed ? <span className="pill ok">נחתם</span> : <span className="pill wait">טרם נחתם</span>}</td>
                <td className="small">{fmtDateTime(last) || '—'}</td>
              </tr>
            )
          })}</tbody>
        </table></div>
        <details style={{ marginTop: 14 }}><summary className="btn btn-light" style={{ display: 'inline-block' }}>הוספת דירה</summary>
          <div style={{ marginTop: 12 }}><ApartmentForm /></div></details>
      </div>

      <div className="grid g2">
        <div className="card"><h3>הוספת משתמש מורשה</h3>
          <p className="small">דייר, עורך דין או חבר נציגות. הוא ייכנס עם כתובת המייל הזו.</p>
          <InviteForm apartments={apartments} /></div>
        <div className="card"><h3>משתמשים ({users.filter((u) => u.role !== 'pending').length})</h3>
          <p>את כל הנרשמים וכל הפרטים שהזינו, כולל טלפון, מגורים ופרטי שוכרים, רואים בלשונית <Link href="/admin/users">כל הנרשמים</Link>, ומשם אפשר גם לייצא לאקסל.</p>
        </div>
        <div className="card"><h3>מצב הפרויקט</h3><StatusForm status={status.data} /></div>
        <div className="card"><h3>אירועים קרובים</h3>
          {meetings.data?.length ? meetings.data.slice(0, 4).map((m) => (
            <div className="item" key={m.id}><b>{m.title}</b><span className="small">{fmtDateTime(m.starts_at)} · {m.location}</span></div>
          )) : <p className="small">אין אירועים.</p>}
          <div className="row"><Link className="btn btn-navy" href="/admin/events" style={{ textDecoration: 'none' }}>הוספה ועריכה של אירועים</Link></div>
        </div>
        <div className="card"><h3>מסמכים כלליים</h3>
          <p className="small">מצגות, חוזה מכר לדוגמה וכדומה. מסמך של דירה מסוימת (נסח, מדידה) מעלים מדף הדירה.</p>
          <UploadForm />
          {docs.data?.map((d) => (
            <form key={d.id} action={deleteDocument} className="inline">
              <input type="hidden" name="id" value={d.id} />
              <a href={`/doc/${d.id}`} target="_blank" style={{ flex: 1 }}>{d.title}</a>
              <span className="small">{DOC_CATEGORIES[d.category]}{d.is_public ? '' : ' · מוסתר'}</span>
              <button className="btn btn-light" style={{ padding: '4px 12px', fontSize: 13 }}>מחיקה</button>
            </form>
          ))}
        </div>
        <div className="card"><h3>פרסום עדכון</h3>
          <p>עדכונים והודעות מפרסמים מתוך <Link href="/board">לוח ההודעות</Link>. אפשר לסמן שם "להציג גם בדף הבית".</p></div>
      </div>

      <div className="card" style={{ marginTop: 18 }}><h3>מעקב פעילות משתמשים</h3>
        <div className="chips">
          <Link href="/admin" className={`chip${!who ? ' active' : ''}`}>הכול</Link>
          {['tenant', 'lawyer', 'admin'].map((r) => <Link key={r} href={`/admin?who=${r}`} className={`chip${who === r ? ' active' : ''}`}>{ROLES[r]}</Link>)}
        </div>
        <div className="tbl"><table><thead><tr><th>זמן</th><th>משתמש</th><th>תפקיד</th><th>פעולה</th><th>פרטים</th></tr></thead>
          <tbody>{(activity.data || []).map((a) => (
            <tr key={a.id}><td className="small">{fmtDateTime(a.created_at)}</td><td>{a.user_label}</td><td>{ROLES[a.role]}</td><td>{a.action}</td><td className="small">{a.details}</td></tr>
          ))}</tbody></table></div>
      </div>
    </section>
  )
}
