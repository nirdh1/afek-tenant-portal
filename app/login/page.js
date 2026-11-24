'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizePhone } from '@/lib/labels'

function Login() {
  const router = useRouter()
  const next = useSearchParams().get('next') || '/me'
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState('phone')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const supabase = createClient()

  async function sendCode(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: '+' + normalizePhone(phone) })
    setBusy(false)
    if (error) setErr('שליחת הקוד נכשלה. בדקו את המספר ונסו שוב.')
    else setStep('code')
  }

  async function verify(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    const token = new FormData(e.currentTarget).get('code')
    const { error } = await supabase.auth.verifyOtp({ phone: '+' + normalizePhone(phone), token, type: 'sms' })
    if (error) { setBusy(false); setErr('הקוד שגוי או שפג תוקפו.'); return }
    await supabase.rpc('log_activity', { p_action: 'התחבר לפורטל' })
    router.replace(next); router.refresh()
  }

  return (
    <div className="card login">
      <h3>כניסה לאזור האישי</h3>
      <p className="small">הכניסה עם מספר הטלפון שרשום אצל הנציגות. נשלח אליכם קוד ב-SMS.</p>
      {step === 'phone' ? (
        <form onSubmit={sendCode}>
          <label htmlFor="phone">מספר טלפון נייד</label>
          <input id="phone" type="tel" inputMode="tel" dir="ltr" placeholder="050-0000000" required
            value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="row"><button className="btn btn-navy" disabled={busy}>שליחת קוד אימות</button></div>
        </form>
      ) : (
        <form onSubmit={verify}>
          <label htmlFor="code">קוד אימות שנשלח ב-SMS</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" required autoFocus />
          <div className="row">
            <button className="btn btn-navy" disabled={busy}>כניסה</button>
            <button type="button" className="btn btn-light" onClick={() => setStep('phone')}>חזרה</button>
          </div>
        </form>
      )}
      {err && <p className="err">{err}</p>}
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><Login /></Suspense>
}
