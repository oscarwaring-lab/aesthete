'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Field } from '@/components/auth-ui'

export default function ForgotPasswordPage() {
  const [supabase] = useState(() => createClient())

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Route the recovery link through the existing auth callback, which
    // exchanges the code for a session and then forwards to /reset-password —
    // the same route used for signup confirmation and OAuth.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    // Supabase does not report whether the address is registered, so a normal
    // request never reveals account existence. Only genuine failures (rate
    // limiting, transport) surface here; otherwise we show the same neutral
    // confirmation either way.
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="editorial">
        <main className="auth-main">
          <div className="auth-card text-center">
            <div className="mb-12">
              <Link href="/" className="auth-wordmark">
                Aesthete
              </Link>
            </div>
            <p className="auth-eyebrow mb-4">Check your inbox</p>
            <h1 className="auth-title mb-3">A reset link is on its way.</h1>
            <p className="auth-sub">
              If an account exists for{' '}
              <span style={{ color: 'var(--ink)' }}>{email}</span>, we&apos;ve
              sent a link to set a new password.
            </p>
            <p className="auth-switch mt-8">
              <Link href="/login">Back to sign in</Link>
            </p>
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
            <p className="auth-eyebrow mb-4">Reset password</p>
            <h1 className="auth-title mb-3">Forgot your password?</h1>
            <p className="auth-sub">
              Enter your email and we&apos;ll send a link to set a new one.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={loading} className="btn-ink">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send reset link
            </button>
          </form>

          <p className="auth-switch mt-8 text-center">
            Remembered it? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
