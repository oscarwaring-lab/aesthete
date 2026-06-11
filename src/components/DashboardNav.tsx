'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Wordmark } from '@/components/Wordmark'

/**
 * Minimal top nav for dashboard pages.
 * Wordmark left, links centre, avatar + sign-out right.
 */
export function DashboardNav({ email }: { email?: string | null }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = (email?.[0] ?? '?').toUpperCase()

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Wordmark href="/dashboard" />

        <div className="hidden items-center gap-6 text-sm sm:flex">
          <Link href="/dashboard" className="text-muted transition-colors hover:text-foreground">
            Profiles
          </Link>
          <Link
            href="/dashboard/upload"
            className="text-muted transition-colors hover:text-foreground"
          >
            New analysis
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--violet))' }}
            title={email ?? undefined}
          >
            {initial}
          </div>
          <button
            onClick={signOut}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>
    </header>
  )
}
