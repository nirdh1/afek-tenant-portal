import { createClient } from '@/lib/supabase/server'
import { fmtDate, fmtDateTime, isImage, isPdf } from '@/lib/labels'
import RegisterButton from '@/components/RegisterButton'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const [{ data: status }, { data: news }, { data: meetings }, { data: stats }] = await Promise.all([
    supabase.from('project_status').select('*').single(),
    supabase.from('posts').select('id,title,body,created_at').eq('is_announcement', true)
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('meetings').select('*').gte('starts_at', new Date().toISOString())
      .order('starts_at').limit(5),
    supabase.rpc('public_stats'),
  ])
  const { data: featured } = await supabase.from('posts').select('id,title,body,created_at,attachment_path,attachment_name')
    .eq('featured', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const next = meetings?.[0]
  let fileUrl = null
  if (featured?.attachment_path && (isImage(featured.attachment_path) || isPdf(featured.attachment_path))) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(featured.attachment_path, 60 * 60)
    fileUrl = data?.signedUrl
  }

  return (
    <section>
      {featured ? (
        <div className="featured">
          <span className="badge">הודעה חשובה</span>
          <h2>{featured.title}</h2>
          {featured.body && <p style={{ whiteSpace: 'pre-wrap' }}>{featured.body}</p>}
          {fileUrl && isImage(featured.attachment_path) && (
            <a href={fileUrl} target="_blank"><img src={fileUrl} alt={featured.title} className="featured-img" /></a>
          )}
          {fileUrl && isPdf(featured.attachment_path) && (
            <iframe src={`${fileUrl}#toolbar=0&view=FitH`} title={featured.title} className="featured-pdf" />
          )}
          {featured.attachment_path && <div><a className="btn btn-gold" href={`/attachment/${featured.id}`} target="_blank">📎 {isImage(featured.attachment_path) ? 'פתיחת התמונה בגודל מלא' : featured.attachment_name || 'לצפייה בקובץ'}</a></div>}
        </div>
      ) : next && (
        <div className="featured">
          <span className="badge">האירוע הקרוב</span>
          <h2>{next.title}</h2>
          <p className="when">{fmtDateTime(next.starts_at)}{next.location && <> · {next.location}</>}</p>
          {next.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{next.notes}</p>}
        </div>
      )}

      <div className="hero">
        <span className="badge">פורטל רשמי של נציגות הדיירים</span>
        <h2>הבית שלכם. הפרויקט שלכם.</h2>
        <p>כל המידע על פרויקט ההתחדשות העירונית במתחם יצחק רבין–אפק, במקום אחד, באופן ברור ונגיש.</p>
        <RegisterButton />
      </div>

      <div className="grid g3">
        <div className="card stat"><div className="lbl">מצב הפרויקט</div><div className="val">{status?.stage}</div>
          <div className="small">עודכן {fmtDate(status?.updated_at)}</div></div>
        <div className="card stat"><div className="lbl">חתימות על ההסכם</div>
          <div className="val">{stats?.signed ?? 0} / {stats?.apartments ?? 0}</div>
          <div className="progress"><span style={{ width: `${stats?.apartments ? (stats.signed / stats.apartments) * 100 : 0}%` }} /></div>
          <div className="small">יעד: {status?.signed_target}%</div></div>
        <div className="card stat"><div className="lbl">המסמך המרכזי</div><div className="val">אוגדן ההסכם</div>
          <div className="small">זמין לדיירים מאומתים באזור האישי</div></div>
      </div>

      <div className="grid g3">
        <div className="card"><h3>חדשות ועדכונים</h3>
          {news?.length ? news.map((n) => (
            <div className="item" key={n.id}><b>{n.title}</b><div>{n.body}</div><span className="small">{fmtDate(n.created_at)}</span></div>
          )) : <p className="small">אין עדכונים כרגע.</p>}
        </div>
        <div className="card"><h3>מפגשים וכנסים</h3>
          {meetings?.length ? meetings.map((m) => (
            <div className="item" key={m.id}><b>{m.title}</b><div>{fmtDateTime(m.starts_at)}</div><div>{m.location}</div>
              {m.notes && <span className="small">{m.notes}</span>}</div>
          )) : <p className="small">אין מפגשים מתוכננים.</p>}
        </div>
        <div className="card"><h3>הדמיות ומסמכים</h3>
          <p>הדמיות, מצגות וסיכומי מפגשים מתפרסמים באזור האישי לאחר אישור הנציגות.</p>
          <div className="note">מסמכי ההסכם, הנסחים והמדידות מוצגים רק לבעל הדירה, אחרי כניסה עם קוד שנשלח במייל.</div>
        </div>
      </div>
    </section>
  )
}
