'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterButton() {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    const { error } = await createClient().from('registration_requests').insert({
      full_name: f.get('full_name'), email: f.get('email'), phone: f.get('phone'), address: f.get('address'),
    })
    setBusy(false)
    setMsg(error ? 'השליחה נכשלה, נסו שוב.' : 'הבקשה נשלחה. הנציגות תאמת את הפרטים ותאשר בקרוב.')
  }

  return (
    <>
      <button className="btn btn-gold" onClick={() => { setOpen(true); setMsg('') }}>הרשמה לפורטל הדיירים</button>
      {open && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form className="card" onSubmit={submit} style={{ color: 'var(--text)' }}>
            <h3>הרשמה לפורטל הדיירים</h3>
            {msg ? <p className="okmsg">{msg}</p> : <>
              <label htmlFor="full_name">שם מלא</label><input id="full_name" name="full_name" required />
              <label htmlFor="reg-email">כתובת מייל</label><input id="reg-email" name="email" type="email" dir="ltr" required />
              <label htmlFor="phone">טלפון נייד</label><input id="phone" name="phone" type="tel" dir="ltr" />
              <label htmlFor="address">כתובת ומספר דירה</label><input id="address" name="address" placeholder="רבין 12, דירה 7" />
            </>}
            <div className="row">
              {!msg && <button className="btn btn-gold" disabled={busy}>שליחת בקשה</button>}
              <button type="button" className="btn btn-light" onClick={() => setOpen(false)}>סגירה</button>
            </div>
            <p className="small">הבקשה מאושרת על ידי הנציגות לאחר אימות מול רשימת בעלי הדירות.</p>
          </form>
        </div>
      )}
    </>
  )
}
