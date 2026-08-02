import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { buildAuthorizeUrl } from '@/lib/instagram/oauth'
import {
  STATE_COOKIE,
  getRedirectUri,
  isInstagramConfigured,
} from '@/lib/instagram/config'
import { hasEncryptionKey } from '@/lib/instagram/token-cipher'

// node:crypto and the token cipher both need the Node.js runtime.
export const runtime = 'nodejs'

/**
 * Step 1 of connecting an Instagram account: send the creator to Instagram.
 *
 * A GET because it is a top-level navigation the user clicks, not a fetch. It
 * mutates nothing except the CSRF cookie set below.
 */

const STATE_TTL_SECONDS = 600 // 10 minutes is ample to approve a dialog

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/dashboard`)
  }

  // Refuse to start a flow we cannot finish. Without the encryption key the
  // callback would have a live token and nowhere safe to put it — better to
  // stop here than to reach that point and have to discard a real credential.
  if (!isInstagramConfigured() || !hasEncryptionKey()) {
    console.error(
      'Instagram connect attempted without INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET / INSTAGRAM_TOKEN_ENCRYPTION_KEY.'
    )
    return NextResponse.redirect(`${origin}/dashboard?instagram=unconfigured`)
  }

  const state = randomBytes(32).toString('base64url')

  const response = NextResponse.redirect(
    buildAuthorizeUrl(getRedirectUri(origin), state)
  )

  // The state cookie is the whole CSRF defence: the callback only accepts a
  // `state` that matches this cookie, so a link crafted by someone else cannot
  // graft their Instagram account onto this user's session.
  //
  // sameSite 'lax' is required, not preferred — the callback arrives as a
  // top-level navigation from instagram.com, and 'strict' would withhold the
  // cookie on exactly that request and break every connection.
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith('https://'),
    sameSite: 'lax',
    path: '/api/instagram',
    maxAge: STATE_TTL_SECONDS,
  })

  return response
}
