'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Field } from '@/components/auth-ui'

type Phase = 'checking' | 'ready' | 'no-session'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // The recovery link only reaches this page after /auth/callback has exchanged
  // the code for a session. Confirm that session exists before revealing the
  // form: a direct visit or an expired link has none, so we show the lapsed
  // state instead of a form that could never succeed.
  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return
      setPhase(data.user && !error ? 'ready' : 'no-session')
    })
    return () => {
      active = false
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("Those passwords don't match.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // updateUser keeps the current (recovery) session valid, so the user stays
    // signed in — send them straight to the studio.
    setDone(true)
    router.refresh()
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  if (done) {
    return (
      <div className="editorial">
        <main className="auth-main">
          <div className="auth-card text-center">
            <div className="mb-12">
              <Link href="/" className="auth-wordmark">
                Aesthete
              </Link>
            </div>
            <p className="auth-eyebrow mb-4">All set</p>
            <h1 className="auth-title mb-3">Password updated.</h1>
            <p className="auth-sub">Taking you to your studio…</p>
            <div className="mt-8 flex justify-center">
              <Loader2
                className="h-5 w-5 animate-spin"
                style={{ color: 'var(--ink-low)' }}
              />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (phase === 'checking') {
    return (
      <div className="editorial">
        <main className="auth-main">
          <div className="auth-card text-center">
            <div className="mb-12">
              <Link href="/" className="auth-wordmark">
                Aesthete
              </Link>
            </div>
            <div className="flex justify-center">
              <Loader2
                className="h-5 w-5 animate-spin"
                style={{ color: 'var(--ink-low)' }}
              />
            </div>
            <p className="auth-sub mt-6">Verifying your reset link…</p>
          </div>
        </main>
      </div>
    )
  }

  if (phase === 'no-session') {
    return (
      <div className="editorial">
        <main className="auth-main">
          <div className="auth-card text-center">
            <div className="mb-12">
              <Link href="/" className="auth-wordmark">
                Aesthete
              </Link>
            </div>
            <p className="auth-eyebrow mb-4">Link expired</p>
            <h1 className="auth-title mb-3">This link has lapsed.</h1>
            <p className="auth-sub mb-8">
              Password reset links expire after a short while, or this page was
              opened directly. Request a fresh one and we&apos;ll send it right
              over.
            </p>
            <Link href="/forgot-password" className="btn-ink">
              Request a new link
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="editorial">
      <main className="auth-main">
        <div className="auth-card">
          <div className="mb-12 text-center">
            <Link href="/" className="auth-wordmark">
              Aesthete
            </Link>
          </div>

          <div className="mb-9 text-center">
            <p className="auth-eyebrow mb-4">Choose a new password</p>
            <h1 className="auth-title mb-3">Set a new password.</h1>
            <p className="auth-sub">
              Pick something memorable — at least 8 characters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Field
              label="New password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <Field
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={loading} className="btn-ink">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
