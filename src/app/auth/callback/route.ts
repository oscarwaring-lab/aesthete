import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth / email-confirmation callback.
 * Supabase redirects here with a `code` that we exchange for a session,
 * then forward the user to `next` (defaults to the dashboard).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code or exchange failed — send back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
