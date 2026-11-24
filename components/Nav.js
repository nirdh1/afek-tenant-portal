import Link from 'next/link'
import { getMe } from '@/lib/supabase/server'
import NavLinks from './NavLinks'

// מה ממתין לטיפול המנהל
async function adminPending(supabase) {
  const [req, users, reports, posts] = await Promise.all([
    supabase.from('registration_requests').select('id', { count: 'exact', head: true }).eq('handled', false),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'pending'),
    supabase.from('ownership_votes').select('id', { count: 'exact', head: true }).eq('vote', 'report').eq('resolved', false),
    supabase.from('posts').select('id, replies(id)').eq('approved', false),
  ])
  const questions = (posts.data || []).filter((p) => !p.replies?.length).length
  return { requests: (req.count || 0) + (users.count || 0), reports: reports.count || 0, questions }
}

export default async function Nav() {
  const { supabase, profile } = await getMe()
  const links = [{ href: '/', label: 'דף הבית' }]
  let pending = null
  if (profile) {
    links.push({ href: '/me', label: 'האזור האישי' })
    if (profile.role !== 'pending') {
      links.push({ href: '/binder', label: 'אוגדן דיירים' })
      links.push({ href: '/board', label: 'לוח הודעות ושאלות' })
    }
    if (profile.role === 'admin') {
      pending = await adminPending(supabase)
      links.find((l) => l.href === '/board').badge = pending.questions
      links.push({ href: '/admin', label: 'ניהול', badge: pending.requests + pending.reports })
    }
  }
  const total = pending ? pending.requests + pending.reports + pending.questions : 0
  return (
    <>
      <NavLinks links={links} loggedIn={!!profile} />
      {total > 0 && (
        <div className="alert-bar">
          <b>🔔 ממתין לטיפול שלך:</b>
          {pending.requests > 0 && <Link href="/admin">{pending.requests} בקשות הרשמה</Link>}
          {pending.reports > 0 && <Link href="/admin">{pending.reports} דיווחים על בעלות</Link>}
          {pending.questions > 0 && <Link href="/board?pending=1">{pending.questions} הודעות ושאלות חדשות</Link>}
        </div>
      )}
    </>
  )
}
