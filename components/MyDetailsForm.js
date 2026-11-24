'use client'
import { useActionState, useState } from 'react'
import { updateMyDetails } from '@/app/actions'
import { OCCUPANCY } from '@/lib/labels'
import FormStatus from './FormStatus'

export default function MyDetailsForm({ profile, apartment }) {
  const [state, action, pending] = useActionState(updateMyDetails, null)
  const [occ, setOcc] = useState(apartment?.occupancy || 'owner')
  return (
    <form action={action}>
      <label htmlFor="full_name">שם מלא</label>
      <input id="full_name" name="full_name" defaultValue={profile.full_name || ''} />
      <label htmlFor="phone">טלפון נייד</label>
      <input id="phone" name="phone" type="tel" dir="ltr" defaultValue={profile.phone || ''} />
      {apartment && <>
        <label htmlFor="occupancy">מי גר בדירה?</label>
        <select id="occupancy" name="occupancy" value={occ} onChange={(e) => setOcc(e.target.value)}>
          {Object.entries(OCCUPANCY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {occ === 'rented' && <>
          <label htmlFor="renter_name">שם השוכר</label>
          <input id="renter_name" name="renter_name" defaultValue={apartment.renter_name || ''} />
          <label htmlFor="renter_phone">טלפון השוכר</label>
          <input id="renter_phone" name="renter_phone" type="tel" dir="ltr" defaultValue={apartment.renter_phone || ''} />
          <label htmlFor="lease_end">סיום חוזה השכירות</label>
          <input id="lease_end" name="lease_end" type="date" defaultValue={apartment.lease_end || ''} />
        </>}
      </>}
      <div className="row"><button className="btn btn-navy" disabled={pending}>שמירת פרטים</button></div>
      <FormStatus state={state} />
    </form>
  )
}
