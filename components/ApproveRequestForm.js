'use client'
import { useActionState, useState } from 'react'
import { approveRequest } from '@/app/actions'
import FormStatus from './FormStatus'

// apartments: [{ id, label, owners: [שמות] }]
export default function ApproveRequestForm({ request, apartments, suggestedId }) {
  const [state, action, pending] = useActionState(approveRequest, null)
  const [aptId, setAptId] = useState(suggestedId ? String(suggestedId) : '')
  const chosen = apartments.find((a) => String(a.id) === aptId)
  return (
    <form action={action}>
      <input type="hidden" name="id" value={request.id} />
      <div className="inline">
        <select name="apartment_id" value={aptId} onChange={(e) => setAptId(e.target.value)} style={{ flex: 2 }}>
          <option value="">דירה חדשה (ממלאים בניין ומספר דירה)</option>
          {apartments.map((a) => (
            <option key={a.id} value={a.id}>{a.label}{a.owners.length ? ` · רשומים: ${a.owners.length}` : ''}</option>
          ))}
        </select>
        {!aptId && <>
          <input name="building" placeholder="בניין, למשל רבין 12" defaultValue={request.address || ''} />
          <input name="unit" placeholder="מס' דירה" style={{ maxWidth: 110 }} />
        </>}
        <button className="btn btn-navy" disabled={pending}>{pending ? 'מאשר...' : 'אישור'}</button>
      </div>
      {chosen?.owners.length > 0 && (
        <p className="small" style={{ marginTop: 6 }}>כבר רשומים כבעלים על הדירה הזו: <b>{chosen.owners.join(', ')}</b>. אפשר לאשר, והמשתמש יתווסף כבעלים נוסף.</p>
      )}
      <FormStatus state={state} />
    </form>
  )
}
