'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavLinks({ links, loggedIn }) {
  const path = usePathname()
  const active = (href) => (href === '/' ? path === '/' : path.startsWith(href))
  return (
    <nav>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={active(l.href) ? 'active' : ''}>
          {l.label}{l.badge > 0 && <span className="nav-badge" aria-label={`${l.badge} ממתינים`}>{l.badge}</span>}
        </Link>
      ))}
      <span className="spacer" />
      {loggedIn
        ? <form action="/auth/signout" method="post"><button className="btn btn-light">יציאה</button></form>
        : <Link href="/login" className={active('/login') ? 'active' : ''}>כניסה</Link>}
    </nav>
  )
}
