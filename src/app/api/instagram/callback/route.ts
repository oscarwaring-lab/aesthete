import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STATE_COOKIE, getRedirectUri } from '@/lib/instagram/config'
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  expiryFromNow,
} from '@/lib/instagram/oauth'
import { encryptToken, safeEqual } from '@/lib/instagram/token-cipher'
import { redactError } from '@/lib/instagram/redact'
import { fetchProfile } from '@/lib/instagram/api'
import { ingestConnection } from '@/lib/instagram/ingest'

export const runtime = 'nodejs'

// The first sync happens inline, before the redirect: ~50 insight calls behind a
// small concurrency pool. It is deliberately not deferred to `after()` — a
// creator who has just clicked through an OAuth dialog should land on a
// dashboard that already knows about their posts, and a failure here should be
// something they can see and retry rather than a silent background loss.
export const maxDuration = 60

/**
 * Step 2 of connecting an Instagram account: Instagram redirects back here.
 *
 * Order matters and is defensive throughout:
 *   1. authenticated user, 2. state check, 3. token exchange, 4. encrypt,
 *   5. persist, 6. first ingest.
 *
 * Nothing touches the database until the state check has passed, and the token
 * is encrypted before it is ever handed to the database client.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const dashboard = (status: string) => `${origin}/dashboard?instagram=${status}`

  // Clearing the one-shot state cookie on every exit path, success or not, so a
  // stale state can never be replayed against a later attempt.
  const finish = (url: string) => {
    const response = NextResponse.redirect(url)
    response.cookies.set(STATE_COOKIE, '', { path: '/api/instagram', maxAge: 0 })
    return response
  }

  // The creator declined, or Instagram refused. `error_description` is theirs,
  // not ours, so it is logged but never reflected back into the page.
  const oauthError = searchParams.get('error')
  if (oauthError) {
    console.warn(
      'Instagram authorization was not granted:',
      searchParams.get('error_description') ?? oauthError
    )
    return finish(dashboard('denied'))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return finish(`${origin}/login?next=/dashboard`)
  }

  // ─── CSRF ────────────────────────────────────────────────────────────────
  // Compared in constant time. A `===` here would leak the state prefix through
  // response timing, which is the one thing this value has to keep.
  const state = searchParams.get('state')
  const expectedState = request.cookies.get(STATE_COOKIE)?.value

  if (!state || !expectedState || !safeEqual(state, expectedState)) {
    console.warn('Instagram callback rejected: OAuth state mismatch.')
    return finish(dashboard('state_mismatch'))
  }

  const code = searchParams.get('code')
  if (!code) {
    return finish(dashboard('error'))
  }

  // ─── Token exchange ──────────────────────────────────────────────────────
  let longLivedToken: string
  let expiresAt: string | null
  let igUserId: string
  let igUsername: string | null = null

  try {
    // The redirect_uri must be byte-identical to step 1's or Meta rejects it.
    const shortLived = await exchangeCodeForShortLivedToken(code, getRedirectUri(origin))
    igUserId = shortLived.igUserId

    const longLived = await exchangeForLongLivedToken(shortLived.accessToken)
    longLivedToken = longLived.accessToken
    expiresAt = expiryFromNow(longLived.expiresIn)

    // Insights are the entire point of connecting; without that scope we would
    // store a token and harvest nothing. Fail loudly instead.
    if (
      shortLived.permissions.length > 0 &&
      !shortLived.permissions.includes('instagram_business_manage_insights')
    ) {
      console.warn('Instagram connection granted without the insights permission.')
      return finish(dashboard('missing_insights_scope'))
    }

    const profile = await fetchProfile(longLivedToken)
    igUsername = profile.username
    // /me is authoritative for the account id; the exchange's user_id has been
    // both the app-scoped and the IG-scoped id across versions.
    igUserId = profile.igUserId
  } catch (err) {
    console.error('Instagram token exchange failed:', redactError(err))
    return finish(dashboard('error'))
  }

  // ─── Persist ─────────────────────────────────────────────────────────────
  const admin = createAdminClient()

  // AAD binds this ciphertext to this IG account, so a token blob moved to
  // another row fails its authentication tag rather than decrypting. Encrypted
  // once and reused below, so the row and the ingest carry the same blob.
  const encrypted = encryptToken(longLivedToken, igUserId)

  let connectionId: string
  try {
    const { data, error } = await admin
      .from('instagram_connections')
      .upsert(
        {
          user_id: user.id,
          ig_user_id: igUserId,
          ig_username: igUsername,
          access_token: encrypted,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,ig_user_id' }
      )
      .select('id')
      .single()

    if (error || !data) throw new Error(error?.message ?? 'no row returned')
    connectionId = data.id
  } catch (err) {
    console.error('Failed to store Instagram connection:', redactError(err))
    return finish(dashboard('error'))
  }

  // ─── First ingest ────────────────────────────────────────────────────────
  // The connection is already saved, so a failure here costs the creator their
  // first batch of data but not the connection itself — they can retry with
  // Sync rather than re-authorising.
  try {
    const result = await ingestConnection(admin, {
      id: connectionId,
      user_id: user.id,
      ig_user_id: igUserId,
      access_token: encrypted,
      token_expires_at: expiresAt,
    })
    console.log(
      `Instagram first sync for connection ${connectionId}: ` +
        `${result.postsWritten} posts (${result.postsWithInsights} with insights), ` +
        `${result.accountDaysWritten} account days.`
    )
  } catch (err) {
    console.error('Instagram first sync failed:', redactError(err))
    return finish(dashboard('connected_no_data'))
  }

  return finish(dashboard('connected'))
}
