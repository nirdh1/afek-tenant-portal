'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function Login() {
  const router = useRouter()
  const next = useSearchParams().get('next') || '/me'
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('email')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const supabase = createClient()
  const addr = email.trim().toLowerCase()

  async function sendCode(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ email: addr })
    setBusy(false)
    if (error) setErr(error.status === 429 ? 'נשלחו יותר מדי קודים. נסו שוב בעוד כמה דקות.' : 'שליחת הקוד נכשלה. בדקו את הכתובת ונסו שוב.')
    else setStep('code')
  }

  async function verify(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    const token = String(new FormData(e.currentTarget).get('code')).trim()
    const { error } = await supabase.auth.verifyOtp({ email: addr, token, type: 'email' })
    if (error) { setBusy(false); setErr('הקוד שגוי או שפג תוקפו.'); return }
    await supabase.rpc('log_activity', { p_action: 'התחבר לפורטל' })
    router.replace(next); router.refresh()
  }

  return (
    <div className="card login">
      <h3>כניסה לאזור האישי</h3>
      <p className="small">הכניסה עם כתובת המייל שרשומה אצל הנציגות. נשלח אליכם קוד כניסה במייל.</p>
      {step === 'email' ? (
        <form onSubmit={sendCode}>
          <label htmlFor="email">כתובת מייל</label>
          <input id="email" type="email" dir="ltr" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="row"><button className="btn btn-navy" disabled={busy}>שליחת קוד כניסה</button></div>
        </form>
      ) : (
        <form onSubmit={verify}>
          <p>שלחנו קוד אל <b dir="ltr">{addr}</b>. אם הוא לא מגיע, בדקו גם בתיקיית הספאם.</p>
          <label htmlFor="code">קוד הכניסה מהמייל</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} dir="ltr" required autoFocus />
          <div className="row">
            <button className="btn btn-navy" disabled={busy}>כניסה</button>
            <button type="button" className="btn btn-light" onClick={() => setStep('email')}>חזרה</button>
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
