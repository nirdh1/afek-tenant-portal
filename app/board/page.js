import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMe } from '@/lib/supabase/server'
import { CATEGORIES, fmtDateTime, isImage } from '@/lib/labels'
import { createReply, deletePost, approvePost, approveReply, toggleFeatured } from '@/app/actions'
import PostForm from '@/components/PostForm'

export const dynamic = 'force-dynamic'

export default async function BoardPage({ searchParams }) {
  const { supabase, profile } = await getMe()
  if (!profile) redirect('/login')
  if (profile.role === 'pending') redirect('/me')
  const { cat, pending } = await searchParams
  const isAdmin = profile.role === 'admin'
  const staff = profile.role === 'admin' || profile.role === 'lawyer'

  let q = supabase.from('posts').select('*, replies(*)').order('created_at', { ascending: false }).limit(100)
  if (cat && CATEGORIES[cat]) q = q.eq('category', cat)
  if (pending && isAdmin) q = q.eq('approved', false)
  const [{ data: posts }, { data: status }, { data: stats }] = await Promise.all([
    q, supabase.from('project_status').select('*').single(), supabase.rpc('public_stats'),
  ])

  const imgPaths = (posts || []).map((p) => p.attachment_path).filter(isImage)
  const imgUrl = {}
  if (imgPaths.length) {
    const { data } = await supabase.storage.from('documents').createSignedUrls(imgPaths, 60 * 60)
    ;(data || []).forEach((d) => { if (d.signedUrl) imgUrl[d.path] = d.signedUrl })
  }

  return (
    <section>
      <div className="card"><h3 style={{ margin: 0 }}>לוח הודעות ושאלות</h3>
        <div className="small">כנסים, התקדמות ההסכם ושאלות לעורכי הדין של הפרויקט</div></div>
      <div className="grid g2" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
        <div>
          <div className="chips">
            <Link href="/board" className={`chip${!cat && !pending ? ' active' : ''}`}>הכול</Link>
            {isAdmin && <Link href="/board?pending=1" className={`chip${pending ? ' active' : ''}`}>ממתינות לאישור שלך</Link>}
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <Link key={k} href={`/board?cat=${k}`} className={`chip${cat === k ? ' active' : ''}`}>{v}</Link>
            ))}
          </div>
          {posts?.length ? posts.map((p) => {
            const canReply = staff || p.author_id === profile.id
            const replies = [...(p.replies || [])].sort((a, b) => a.created_at.localeCompare(b.created_at))
            return (
              <div className="post" key={p.id}>
                <div className="meta">
                  <span className="pill cat">{CATEGORIES[p.category] || "כללי"}</span>
                  {p.visibility === 'private' && <span className="pill lock">פרטי</span>}
                  {!p.approved && p.visibility === 'public' && <span className="pill wait">ממתין לאישור פרסום</span>}
                  {p.to_lawyers && <span className="pill ok">נשלח לעורכי הדין</span>}
                  {p.featured ? <span className="pill ok">בגדול בדף הבית</span> : p.is_announcement && <span className="pill ok">בדף הבית</span>}
                  <span>{p.author_label} · {fmtDateTime(p.created_at)}</span>
                </div>
                <h4>{p.title}</h4>
                {p.body && <div style={{ whiteSpace: 'pre-wrap' }}>{p.body}</div>}
                {imgUrl[p.attachment_path] && (
                  <a href={imgUrl[p.attachment_path]} target="_blank"><img src={imgUrl[p.attachment_path]} alt={p.title} className="post-img" /></a>
                )}
                {p.attachment_path && <div style={{ marginTop: 6 }}>📎 <a href={`/attachment/${p.id}`} target="_blank">{p.attachment_name || 'קובץ מצורף'}</a></div>}
                {replies.map((r) => (
                  <div key={r.id} className={`reply${r.visibility === 'private' ? ' private' : ''}`}>
                    <b>{r.author_label}</b>{' '}
                    {r.visibility === 'private' ? <span className="pill lock">פרטי</span> : r.approved ? <span className="pill ok">פומבי</span> : <span className="pill wait">ממתין לאישור</span>}
                    {isAdmin && !r.approved && (
                      <form action={approveReply} style={{ display: 'inline', marginInlineStart: 8 }}>
                        <input type="hidden" name="id" value={r.id} /><input type="hidden" name="title" value={p.title} />
                        <button className="btn btn-gold" style={{ padding: '2px 10px', fontSize: 12 }}>פרסום לכל הדיירים</button>
                      </form>
                    )}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{r.body}</div>
                    <span className="small">{fmtDateTime(r.created_at)}</span>
                  </div>
                ))}
                {canReply && (
                  <form action={createReply} className="inline">
                    <input type="hidden" name="post_id" value={p.id} />
                    <input type="hidden" name="post_title" value={p.title} />
                    <input name="body" placeholder={staff ? 'תשובה' : 'תגובה'} required />
                    {staff && p.visibility === 'public'
                      ? <select name="visibility"><option value="public">פומבי לכל הדיירים</option><option value="private">פרטי לשואל בלבד</option></select>
                      : <input type="hidden" name="visibility" value={p.visibility} />}
                    <button className="btn btn-navy">שליחה</button>
                  </form>
                )}
                {isAdmin && (
                  <div className="inline">
                    {!p.approved && (
                      <form action={approvePost}>
                        <input type="hidden" name="id" value={p.id} /><input type="hidden" name="title" value={p.title} />
                        <button className="btn btn-gold" style={{ padding: '4px 12px', fontSize: 13 }}>אישור ופרסום לכל הדיירים</button>
                      </form>
                    )}
                    <form action={toggleFeatured}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="title" value={p.title} />
                      <input type="hidden" name="on" value={p.featured ? '0' : '1'} />
                      <button className="btn btn-light" style={{ padding: '4px 12px', fontSize: 13 }}>{p.featured ? 'הסרה מראש דף הבית' : 'הצגה בגדול בדף הבית'}</button>
                    </form>
                    <form action={deletePost}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn btn-light" style={{ padding: '4px 12px', fontSize: 13 }}>מחיקה</button>
                    </form>
                  </div>
                )}
              </div>
            )
          }) : <p className="small">אין הודעות בנושא הזה.</p>}
        </div>
        <div>
          <div className="card"><h3>התקדמות ההסכם</h3>
            <div><b>{status?.stage}</b></div>
            <div className="progress" style={{ marginTop: 12 }}>
              <span style={{ width: `${stats?.apartments ? (stats.signed / stats.apartments) * 100 : 0}%` }} />
            </div>
            <div className="small">{stats?.signed ?? 0} מתוך {stats?.apartments ?? 0} חתמו · יעד {status?.signed_target}%</div>
          </div>
          <div className="card" style={{ marginTop: 18 }}>
            <h3>{staff ? 'פרסום הודעה' : 'שאלה או הודעה חדשה'}</h3>
            <PostForm role={profile.role} />
          </div>
        </div>
      </div>
    </section>
  )
}
