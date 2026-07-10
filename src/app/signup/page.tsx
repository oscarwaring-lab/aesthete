'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Field, GoogleIcon } from '@/components/auth-ui'

export default function SignupPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // If email confirmation is required, Supabase returns a user with no session.
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setNeedsConfirmation(true)
      setLoading(false)
    }
  }

  async function handleGoogleSignup() {
    setError(null)
    setGoogleLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  if (needsConfirmation) {
    return (
      <div className="editorial">
        <main className="auth-main">
          <div className="auth-card text-center">
            <div className="mb-12">
              <Link href="/" className="auth-wordmark">
                Aesthete
              </Link>
            </div>
            <p className="auth-eyebrow mb-4">Almost there</p>
            <h1 className="auth-title mb-3">Check your inbox.</h1>
            <p className="auth-sub">
              We sent a confirmation link to{' '}
              <span style={{ color: 'var(--ink)' }}>{email}</span>. Click it to
              activate your account.
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
            <p className="auth-eyebrow mb-4">Begin</p>
            <h1 className="auth-title mb-3">Create your account.</h1>
            <p className="auth-sub">Start codifying your visual identity.</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="btn-outline mb-6"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <div className="auth-divider mb-6">
            <span className="line" />
            <span>or</span>
            <span className="line" />
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <Field
              label="Name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Your name"
              autoComplete="name"
            />
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={loading} className="btn-ink">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account
            </button>
          </form>

          <p className="auth-switch mt-8 text-center">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
