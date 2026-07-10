import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email/welcome'

// This route reads the welcome template from disk and talks to Resend, so it
// must run on the Node.js runtime (the default for Route Handlers, pinned here
// for clarity now that we depend on Node APIs).
export const runtime = 'nodejs'

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // First successful session for this user (email confirmation or first
      // OAuth sign-in): fire the one-time welcome email. Best-effort and never
      // allowed to block or fail the redirect.
      if (data.user?.email) {
        await maybeSendWelcome(data.user.id, data.user.email)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code or exchange failed — send back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`)
}

/**
 * Send the welcome email exactly once per user.
 *
 * The guard is an atomic conditional UPDATE on public.profiles: we stamp
 * welcome_email_sent_at only where it is still NULL and let Postgres return the
 * row that was actually claimed. Because a row-level lock serialises concurrent
 * callbacks (double-clicked confirm links, retried OAuth), at most one request
 * ever wins the claim — so the email is sent at most once. The stamp uses the
 * service-role client because RLS intentionally grants users no UPDATE on this
 * column.
 *
 * We stamp first, then send via `after()` so Resend's latency never delays the
 * redirect. The trade-off is deliberate: a failed send is not retried (at-most-
 * once), which we prefer over risking a duplicate welcome. The whole thing is
 * wrapped so nothing here can throw into the auth flow.
 */
async function maybeSendWelcome(userId: string, email: string): Promise<void> {
  try {
    const admin = createAdminClient()

    const { data: claimed, error } = await admin
      .from('profiles')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', userId)
      .is('welcome_email_sent_at', null)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('maybeSendWelcome: guard update failed:', error)
      return
    }

    // No row claimed → already welcomed (or no profile row). Nothing to do.
    if (!claimed) return

    after(() => sendWelcomeEmail(email))
  } catch (err) {
    console.error('maybeSendWelcome: unexpected error:', err)
  }
}
