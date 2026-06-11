'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Wordmark } from '@/components/Wordmark'
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
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-10 flex justify-center">
            <Wordmark />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="text-sm text-muted">
            We sent a confirmation link to{' '}
            <span className="text-foreground">{email}</span>. Click it to activate your
            account.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Wordmark />
        </div>

        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mb-8 text-center text-sm text-muted">
          Start codifying your visual identity
        </p>

        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-panel px-4 py-3 text-sm font-medium transition-colors hover:border-white/20 disabled:opacity-60"
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>

        <div className="mb-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
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
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
