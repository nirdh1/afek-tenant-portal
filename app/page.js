import { createClient } from '@/lib/supabase/server'
import { fmtDate, fmtDateTime } from '@/lib/labels'
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

  return (
    <section>
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
