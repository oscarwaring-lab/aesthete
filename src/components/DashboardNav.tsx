'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Studio nav — a cool liquid-glass bar (§2: cool = interface chrome).
 * Æ monogram + wordmark + cool "Studio" tag on the left, section links in
 * the middle with a cool active underline, and a toned-down cool glass
 * "+ New analysis" button + avatar + sign-out on the right.
 */
export function DashboardNav({ email }: { email?: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = (email?.[0] ?? '?').toUpperCase()

  // Only real routes — the prototype's Continuity/Journal links have no pages
  // yet, and dead nav links are worse than an honest set.
  const links: { href: string; label: string; active: boolean }[] = [
    { href: '/dashboard', label: 'Dashboard', active: pathname === '/dashboard' },
    {
      href: '/dashboard/upload',
      label: 'Upload',
      active: pathname.startsWith('/dashboard/upload'),
    },
  ]

  return (
    <header className="studio-nav">
      <div className="brand">
        <div className="mono">Æ</div>
        <Link href="/dashboard" className="wm">
          Aesthete
        </Link>
        <span className="tag">Studio</span>
      </div>

      <ul className="links">
        {links.map(({ href, label, active }) => (
          <li key={href}>
            <Link href={href} className={active ? 'active' : undefined}>
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="nav-right">
        <Link href="/dashboard/upload" className="new-btn">
          + New analysis
        </Link>
        <div className="avatar" title={email ?? undefined}>
          {initial}
        </div>
        <button onClick={signOut} aria-label="Sign out" className="signout">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
