import { redirect } from 'next/navigation'
import { getMe } from '@/lib/supabase/server'
import { DOC_CATEGORIES, fmtDate } from '@/lib/labels'
import MyDetailsForm from '@/components/MyDetailsForm'

export const dynamic = 'force-dynamic'

const STEPS = ['פרטי הדירה אומתו מול הנציגות', 'עיון באוגדן ההסכם', 'פגישה עם עורך הדין של הדיירים', 'חתימה על ההסכם']

export default async function MePage() {
  const { supabase, profile } = await getMe()
  if (!profile) redirect('/login')

  if (profile.role === 'pending') {
    return <div className="card login"><h3>החשבון ממתין לאישור</h3>
      <p>מספר הטלפון שלכם עדיין לא שויך לדירה. הנציגות תאמת את הפרטים ותאשר את הגישה.</p></div>
  }

  const apt = profile.apartment
  const { data: docs } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
  const myDocs = (docs || []).filter((d) => d.apartment_id)
  const generalDocs = (docs || []).filter((d) => !d.apartment_id)
  const step = apt?.signed ? 4 : 1

  return (
    <section>
      <div className="card">
        <div className="small">שלום,</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{profile.full_name || 'דייר/ת'}</div>
        <div className="small">{apt ? `${apt.building}, דירה ${apt.unit}` : ''} · <span dir="ltr">+{profile.phone}</span></div>
      </div>

      <div className="grid g2">
        {apt && <div className="card"><h3>הסטטוס שלי</h3>
          <div className="row" style={{ margin: '0 0 10px' }}>
            {apt.signed ? <span className="pill ok">נחתם {fmtDate(apt.signed_at)}</span> : <span className="pill wait">טרם נחתם</span>}
          </div>
          <ul className="steps">
            {STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>{s}</li>)}
          </ul>
        </div>}

        {apt && <div className="card"><h3>הדירה שלי</h3>
          <dl className="kv">
            <dt>גוש / חלקה / תת־חלקה</dt><dd>{[apt.gush, apt.helka, apt.sub_helka].map((x) => x || '—').join(' / ')}</dd>
            <dt>שטח רשום בנסח</dt><dd>{apt.registered_area ? `${apt.registered_area} מ"ר` : '—'}</dd>
            <dt>שטח לפי מדידה</dt><dd>{apt.measured_area ? `${apt.measured_area} מ"ר` : 'טרם נמדד'}{apt.measured_at && <span className="small"> · {fmtDate(apt.measured_at)}</span>}</dd>
            <dt>תמורה מוצעת</dt><dd>{apt.compensation || 'לפי ההסכם הסופי'}</dd>
          </dl>
        </div>}

        <div className="card"><h3>המסמכים שלי</h3>
          {myDocs.length ? myDocs.map((d) => (
            <div className="item" key={d.id}><b><a href={`/doc/${d.id}`} target="_blank">{d.title}</a></b>
              <span className="small">{DOC_CATEGORIES[d.category]} · {fmtDate(d.created_at)}</span></div>
          )) : <p className="small">עדיין לא הועלו מסמכים לדירה שלכם.</p>}
          {generalDocs.length > 0 && <>
            <h3 style={{ marginTop: 20 }}>מסמכים כלליים</h3>
            {generalDocs.map((d) => (
              <div className="item" key={d.id}><b><a href={`/doc/${d.id}`} target="_blank">{d.title}</a></b>
                <span className="small">{DOC_CATEGORIES[d.category]} · {fmtDate(d.created_at)}</span></div>
            ))}
          </>}
        </div>

        <div className="card"><h3>הפרטים שלי</h3>
          <MyDetailsForm profile={profile} apartment={apt} />
        </div>
      </div>
    </section>
  )
}
