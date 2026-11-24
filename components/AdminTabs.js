'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin', label: 'לוח בקרה' },
  { href: '/admin/users', label: 'כל הנרשמים' },
  { href: '/admin/events', label: 'אירועים' },
]

export default function AdminTabs() {
  const path = usePathname()
  return (
    <div className="chips" style={{ marginBottom: 18 }}>
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`chip${path === t.href ? ' active' : ''}`}>{t.label}</Link>
      ))}
    </div>
  )
}
