'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Field, GoogleIcon } from '@/components/auth-ui'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('error') ? 'Authentication failed. Please try again.' : null
  )

  const supabase = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  async function handleGoogleLogin() {
    setError(null)
    setGoogleLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
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
            <p className="auth-eyebrow mb-4">Return to the studio</p>
            <h1 className="auth-title mb-3">Welcome back.</h1>
            <p className="auth-sub">Sign in to access your Aesthetic DNA.</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
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

          <form onSubmit={handleEmailLogin} className="space-y-6">
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
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <p className="auth-switch -mt-2 text-right">
              <Link href="/forgot-password">Forgot password?</Link>
            </p>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={loading} className="btn-ink">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="auth-switch mt-8 text-center">
            New here? <Link href="/signup">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
