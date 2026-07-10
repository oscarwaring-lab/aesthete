import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Resend } from 'resend'

/**
 * One-time branded welcome email, sent after a user confirms their account.
 *
 * Design contract: this must be *best-effort*. Every failure mode — missing
 * RESEND_API_KEY, unreadable template, Resend API error — is logged and
 * swallowed so a failed send can never block or break the auth flow that calls
 * it (see src/app/auth/callback/route.ts). It never throws.
 */

const FROM = 'Aesthete <hello@getaesthete.com>'
const SUBJECT = 'Your Aesthete studio is open'

// The template lives at src/emails/welcome.html. It is read at runtime rather
// than imported, so it is bundled into the /auth/callback serverless function
// via `outputFileTracingIncludes` in next.config.ts. process.cwd() is the
// function root at runtime, where the traced file preserves this relative path.
const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'emails', 'welcome.html')

// Read once per server process, then reuse. Only successful reads are cached,
// so a transient read failure doesn't get memoised.
let cachedHtml: string | null = null

async function loadTemplate(): Promise<string> {
  if (cachedHtml !== null) return cachedHtml
  const html = await readFile(TEMPLATE_PATH, 'utf8')
  cachedHtml = html
  return html
}

/**
 * Send the welcome email to `to`. Resolves (never rejects) regardless of
 * outcome; problems are reported via console.error only.
 */
export async function sendWelcomeEmail(to: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('sendWelcomeEmail: RESEND_API_KEY is not set; skipping send')
      return
    }

    const html = await loadTemplate()
    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: SUBJECT,
      html,
    })

    if (error) {
      console.error('sendWelcomeEmail: Resend returned an error:', error)
    }
  } catch (err) {
    console.error('sendWelcomeEmail: unexpected error:', err)
  }
}
