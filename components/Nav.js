import { getMe } from '@/lib/supabase/server'
import NavLinks from './NavLinks'

export default async function Nav() {
  const { profile } = await getMe()
  const links = [{ href: '/', label: 'דף הבית' }]
  if (profile) {
    links.push({ href: '/me', label: 'האזור האישי' })
    if (profile.role !== 'pending') {
      links.push({ href: '/binder', label: 'אוגדן דיירים' })
      links.push({ href: '/board', label: 'לוח הודעות ושאלות' })
    }
    if (profile.role === 'admin') links.push({ href: '/admin', label: 'ניהול' })
  }
  return <NavLinks links={links} loggedIn={!!profile} />
}
