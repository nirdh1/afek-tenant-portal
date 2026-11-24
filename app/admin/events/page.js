import { createClient } from '@/lib/supabase/server'
import { fmtDateTime } from '@/lib/labels'
import { deleteMeeting } from '@/app/actions'
import { MeetingForm } from '@/components/AdminForms'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: meetings } = await supabase.from('meetings').select('*').order('starts_at', { ascending: false })
  const now = new Date().toISOString()
  return (
    <section>
      <div className="grid g2" style={{ marginTop: 0, gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)' }}>
        <div className="card"><h3>אירוע חדש</h3><MeetingForm /></div>
        <div>
          <h3 style={{ marginTop: 0 }}>כל האירועים ({meetings?.length || 0})</h3>
          {meetings?.length ? meetings.map((m) => (
            <details key={m.id} className="card" style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <b>{m.title}</b><span className="small">{fmtDateTime(m.starts_at)} · {m.location || 'ללא מקום'}</span>
                {m.starts_at < now ? <span className="pill lock">עבר</span> : <span className="pill ok">קרוב</span>}
                <span className="small" style={{ marginInlineStart: 'auto' }}>לחיצה לעריכה</span>
              </summary>
              <div style={{ marginTop: 12 }}>
                <MeetingForm meeting={m} />
                <form action={deleteMeeting} style={{ marginTop: 10 }}>
                  <input type="hidden" name="id" value={m.id} /><input type="hidden" name="title" value={m.title} />
                  <button className="btn btn-light">מחיקת האירוע</button>
                </form>
              </div>
            </details>
          )) : <p className="small">עדיין אין אירועים.</p>}
        </div>
      </div>
    </section>
  )
}
