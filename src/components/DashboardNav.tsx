'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Top nav for dashboard pages.
 * Wordmark left, links centre, avatar + sign-out right.
 */
export function DashboardNav({
  email,
  dominantHex = '#1E3A5F',
}: {
  email?: string | null
  dominantHex?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = (email?.[0] ?? '?').toUpperCase()

  const links = [
    { href: '/dashboard', label: 'Profiles' },
    { href: '/dashboard/upload', label: 'New analysis' },
  ]

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'transparent',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${dominantHex}28`,
      }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 62,
          padding: '0 28px',
        }}
      >
        {/* ─── Wordmark ───────────────────────────────────────── */}
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 16,
            color: '#f2f2f5',
          }}
        >
          {/* Glowing dot — pulses with the user's dominant DNA colour. */}
          <span
            aria-hidden
            className="nav-dna-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              marginRight: 8,
              background: dominantHex,
              boxShadow: `0 0 8px ${dominantHex}99`,
            }}
          />
          Aesthete
          <sup
            style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#3D6699',
              marginLeft: 3,
            }}
          >
            Studio
          </sup>
        </Link>

        {/* ─── Centre links ───────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {links.map(({ href, label }) => {
            const active =
              href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '5px 11px',
                  borderRadius: 5,
                  color: active ? '#f2f2f5' : 'rgba(255,255,255,0.45)',
                  background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                  border: active
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid transparent',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* ─── Avatar + sign-out ──────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            title={email ?? undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 29,
              width: 29,
              borderRadius: '50%',
              background: '#111820',
              color: '#5a7a9e',
              border: '1px solid rgba(61,102,153,0.35)',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {initial}
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 29,
              width: 29,
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </nav>
    </header>
  )
}
