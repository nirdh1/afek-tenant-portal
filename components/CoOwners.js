'use client'
import { useActionState, useState } from 'react'
import { voteOwner } from '@/app/actions'
import { fmtDate } from '@/lib/labels'
import FormStatus from './FormStatus'

function Owner({ o }) {
  const [state, action, pending] = useActionState(voteOwner, null)
  const [reporting, setReporting] = useState(false)
  return (
    <div className="item">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <b>{o.full_name}</b>{o.is_me && <span className="pill cat">את/ה</span>}
        <span className="small">נרשם {fmtDate(o.registered_at)}</span>
        {o.confirmations > 0 && <span className="pill ok">אושר על ידי {o.confirmations}</span>}
        {o.reports > 0 && <span className="pill wait">דווח · בבדיקת הנציגות</span>}
      </div>
      {!o.is_me && (
        <form action={action} className="inline">
          <input type="hidden" name="subject" value={o.id} />
          {o.my_vote === 'confirm'
            ? <span className="small">אישרת שזה בעלים של הדירה.</span>
            : <button className="btn btn-navy" name="vote" value="confirm" disabled={pending} style={{ padding: '6px 14px' }}>אישור בעלות</button>}
          {o.my_vote === 'report'
            ? <span className="small">דיווחת שהאדם הזה לא קשור לדירה.</span>
            : !reporting && <button type="button" className="btn btn-light" onClick={() => setReporting(true)} style={{ padding: '6px 14px' }}>דיווח: לא קשור לדירה</button>}
          {reporting && o.my_vote !== 'report' && <>
            <input name="note" placeholder="הערה לנציגות (לא חובה)" />
            <button className="btn btn-gold" name="vote" value="report" disabled={pending} style={{ padding: '6px 14px' }}>שליחת דיווח</button>
            <button type="button" className="btn btn-light" onClick={() => setReporting(false)} style={{ padding: '6px 14px' }}>ביטול</button>
          </>}
        </form>
      )}
      <FormStatus state={state} />
    </div>
  )
}

export default function CoOwners({ owners }) {
  return (
    <>
      <p className="small">כל מי שרשום כבעלים על הדירה. אם מופיע כאן מישהו שאינו קשור לדירה, דווחו לנציגות.</p>
      {owners.map((o) => <Owner key={o.id} o={o} />)}
    </>
  )
}
