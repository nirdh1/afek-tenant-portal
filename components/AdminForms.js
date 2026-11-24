'use client'
import { useActionState } from 'react'
import * as A from '@/app/actions'
import { DOC_CATEGORIES, OCCUPANCY, ROLES, STAGES } from '@/lib/labels'
import FormStatus from './FormStatus'

function useForm(fn) { return useActionState(fn, null) }

export function ApartmentForm({ apt }) {
  const [state, action, pending] = useForm(apt ? A.updateApartment : A.createApartment)
  const a = apt || {}
  const F = ({ name, label, type = 'text', ...rest }) => (
    <div><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} defaultValue={a[name] ?? ''} {...rest} /></div>
  )
  return (
    <form action={action}>
      {apt && <input type="hidden" name="id" value={apt.id} />}
      <div className="grid g3" style={{ marginTop: 0, gap: 10 }}>
        <F name="building" label="בניין (רחוב ומספר)" required placeholder="רבין 12" />
        <F name="unit" label="מספר דירה" required />
        <F name="gush" label="גוש" />
        <F name="helka" label="חלקה" />
        <F name="sub_helka" label="תת־חלקה" />
        <F name="registered_area" label='שטח רשום בנסח (מ"ר)' type="number" step="0.01" />
        <F name="measured_area" label='שטח מדוד (מ"ר)' type="number" step="0.01" />
        <F name="measured_at" label="תאריך מדידה" type="date" />
        <div><label htmlFor="occupancy">מגורים</label>
          <select id="occupancy" name="occupancy" defaultValue={a.occupancy || 'owner'}>
            {Object.entries(OCCUPANCY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <F name="renter_name" label="שם השוכר" />
        <F name="renter_phone" label="טלפון השוכר" type="tel" dir="ltr" />
        <F name="lease_end" label="סיום שכירות" type="date" />
        <F name="signed_at" label="תאריך חתימה" type="date" />
      </div>
      <label htmlFor="compensation">תמורה מוצעת</label>
      <input id="compensation" name="compensation" defaultValue={a.compensation ?? ''} placeholder='דירה של 93 מ"ר + מרפסת 12 מ"ר + חניה' />
      <label htmlFor="notes">הערות פנימיות</label>
      <textarea id="notes" name="notes" rows={2} defaultValue={a.notes ?? ''} />
      <label style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" name="signed" defaultChecked={!!a.signed} style={{ width: 'auto' }} /> חתם על ההסכם</label>
      <div className="row"><button className="btn btn-navy" disabled={pending}>{apt ? 'שמירה' : 'הוספת דירה'}</button></div>
      <FormStatus state={state} />
    </form>
  )
}

export function InviteForm({ apartments, apartmentId }) {
  const [state, action, pending] = useForm(A.inviteUser)
  return (
    <form action={action} key={state?.ok}>
      <label htmlFor="inv-name">שם מלא</label><input id="inv-name" name="full_name" required />
      <label htmlFor="inv-email">כתובת מייל (לכניסה)</label><input id="inv-email" name="email" type="email" dir="ltr" required />
      <label htmlFor="inv-phone">טלפון נייד</label><input id="inv-phone" name="phone" type="tel" dir="ltr" />
      <label htmlFor="inv-role">תפקיד</label>
      <select id="inv-role" name="role" defaultValue="tenant">
        {['tenant', 'lawyer', 'admin'].map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
      </select>
      {apartmentId ? <input type="hidden" name="apartment_id" value={apartmentId} /> : <>
        <label htmlFor="inv-apt">דירה (לדיירים)</label>
        <select id="inv-apt" name="apartment_id" defaultValue="">
          <option value="">ללא</option>
          {apartments.map((a) => <option key={a.id} value={a.id}>{a.building} / {a.unit}</option>)}
        </select>
      </>}
      <div className="row"><button className="btn btn-navy" disabled={pending}>הוספת משתמש מורשה</button></div>
      <FormStatus state={state} />
    </form>
  )
}

export function UploadForm({ apartmentId, category }) {
  const [state, action, pending] = useForm(A.uploadDocument)
  return (
    <form action={action} key={state?.ok}>
      {apartmentId && <input type="hidden" name="apartment_id" value={apartmentId} />}
      {category ? <><input type="hidden" name="category" value={category} /><input type="hidden" name="is_public" value="on" /></> : <>
      <label htmlFor="doc-cat">סוג מסמך</label>
      <select id="doc-cat" name="category" defaultValue={apartmentId ? 'nesach' : 'presentation'}>
        {Object.entries(DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select></>}
      <label htmlFor="doc-title">שם המסמך</label><input id="doc-title" name="title" placeholder="נסח טאבו 10.2026" />
      <label htmlFor="doc-file">קובץ</label><input id="doc-file" name="file" type="file" required />
      {!apartmentId && !category && <label style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" name="is_public" defaultChecked style={{ width: 'auto' }} /> גלוי לכל הדיירים המאומתים</label>}
      <div className="row"><button className="btn btn-navy" disabled={pending}>העלאה</button></div>
      <FormStatus state={state} />
    </form>
  )
}

// פיצול תאריך ושעה לפי שעון ישראל
function ilParts(iso) {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

export function MeetingForm({ meeting }) {
  const [state, action, pending] = useForm(meeting ? A.updateMeeting : A.createMeeting)
  const m = meeting || {}
  const { date, time } = ilParts(m.starts_at)
  const p = m.id ? `m${m.id}-` : 'm-'
  return (
    <form action={action} key={meeting ? m.id : state?.ok}>
      {meeting && <input type="hidden" name="id" value={m.id} />}
      <label htmlFor={p + 'title'}>שם האירוע</label><input id={p + 'title'} name="title" defaultValue={m.title || ''} placeholder="כנס דיירים" required />
      <div className="grid g2" style={{ marginTop: 0, gap: 10 }}>
        <div><label htmlFor={p + 'date'}>תאריך</label><input id={p + 'date'} name="date" type="date" defaultValue={date} required /></div>
        <div><label htmlFor={p + 'time'}>שעה</label><input id={p + 'time'} name="time" type="time" defaultValue={time} /></div>
      </div>
      <label htmlFor={p + 'loc'}>מקום</label><input id={p + 'loc'} name="location" defaultValue={m.location || ''} />
      <label htmlFor={p + 'notes'}>פרטים נוספים</label><textarea id={p + 'notes'} name="notes" rows={2} defaultValue={m.notes || ''} />
      <div className="row"><button className="btn btn-navy" disabled={pending}>{meeting ? 'שמירת שינויים' : 'פרסום אירוע'}</button></div>
      <FormStatus state={state} />
    </form>
  )
}

export function StatusForm({ status }) {
  const [state, action, pending] = useForm(A.updateStatus)
  return (
    <form action={action}>
      <label htmlFor="stage">שלב נוכחי</label>
      <select id="stage" name="stage" defaultValue={status?.stage}>
        {[...new Set([status?.stage, ...STAGES].filter(Boolean))].map((s) => <option key={s}>{s}</option>)}
      </select>
      <label htmlFor="target">יעד חתימות (%)</label>
      <input id="target" name="signed_target" type="number" min="1" max="100" defaultValue={status?.signed_target} />
      <div className="row"><button className="btn btn-navy" disabled={pending}>שמירה</button></div>
      <FormStatus state={state} />
    </form>
  )
}
