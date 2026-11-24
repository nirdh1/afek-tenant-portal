import { redirect } from 'next/navigation'
import { getMe } from '@/lib/supabase/server'
import { fmtDate } from '@/lib/labels'
import { deleteDocument } from '@/app/actions'
import { UploadForm } from '@/components/AdminForms'

export const dynamic = 'force-dynamic'

export default async function BinderPage({ searchParams }) {
  const { supabase, profile } = await getMe()
  if (!profile) redirect('/login?next=/binder')
  if (profile.role === 'pending') redirect('/me')
  const { doc } = await searchParams
  const { data: docs } = await supabase.from('documents').select('*').eq('category', 'binder').order('created_at', { ascending: false })
  const current = docs?.find((d) => String(d.id) === doc) || docs?.[0]
  let url = null
  if (current) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(current.storage_path, 60 * 30)
    url = data?.signedUrl
    await supabase.rpc('log_activity', { p_action: 'עיין באוגדן הדיירים', p_details: current.title })
  }
  const isAdmin = profile.role === 'admin'

  return (
    <section>
      <div className="card"><h3 style={{ margin: 0 }}>אוגדן דיירים</h3>
        <div className="small">המסמכים המרכזיים של הפרויקט לעיון בעלי הדירות.</div></div>
      <div className="grid g2" style={{ gridTemplateColumns: 'minmax(0,3fr) minmax(0,1fr)' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 300 }}>
          {url ? <>
            <iframe src={`${url}#toolbar=1&view=FitH`} title={current.title} style={{ width: '100%', height: '80vh', border: 0, display: 'block' }} />
            <div style={{ padding: '10px 16px' }} className="small">
              אם המסמך לא מוצג (למשל בחלק מהטלפונים), <a href={url} target="_blank" rel="noopener">פתחו אותו כאן</a>.
            </div>
          </> : <p style={{ padding: 20 }}>עדיין לא הועלה אוגדן.</p>}
        </div>
        <div>
          {docs?.length > 0 && <div className="card"><h3>מסמכים באוגדן</h3>
            {docs.map((d) => (
              <div className="item" key={d.id}>
                <b>{d.id === current?.id ? d.title : <a href={`/binder?doc=${d.id}`}>{d.title}</a>}</b>
                <span className="small">{fmtDate(d.created_at)}</span>
                {isAdmin && <form action={deleteDocument} style={{ marginTop: 6 }}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="btn btn-light" style={{ padding: '4px 12px', fontSize: 13 }}>מחיקה</button>
                </form>}
              </div>
            ))}
          </div>}
          {isAdmin && <div className="card" style={{ marginTop: 18 }}><h3>העלאת קובץ לאוגדן</h3>
            <p className="small">מומלץ PDF. הקובץ יוצג לכל הדיירים המאושרים.</p>
            <UploadForm category="binder" />
          </div>}
        </div>
      </div>
    </section>
  )
}
