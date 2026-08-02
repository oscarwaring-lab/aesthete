import 'server-only'

/**
 * Endpoints, scopes and limits for the Instagram API with Instagram Login
 * (a.k.a. "Business Login for Instagram").
 *
 * Everything Meta can rename lives in this one file, because it renames things
 * often — `impressions` became `views`, `business_basic` became
 * `instagram_business_basic`, and the API host differs from the Facebook Login
 * flavour of the same product. Code elsewhere imports from here rather than
 * inlining a URL.
 *
 * This is NOT the Instagram API with *Facebook* Login. That variant talks to
 * graph.facebook.com, needs a linked Facebook Page, and uses `instagram_basic` /
 * `instagram_manage_insights`. Mixing the two is the most common way to get an
 * inexplicable OAuthException — if you are reading this while debugging one,
 * check which flavour the Meta app is configured for first.
 */

/** Where the creator is sent to approve the connection. */
export const AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize'

/** Code → short-lived token. POST, form-encoded. Note: api.instagram.com. */
export const TOKEN_EXCHANGE_URL = 'https://api.instagram.com/oauth/access_token'

/** Short-lived → long-lived, and long-lived refresh. Note: graph.instagram.com. */
export const GRAPH_HOST = 'https://graph.instagram.com'
export const GRAPH_VERSION = 'v25.0'
export const GRAPH_BASE = `${GRAPH_HOST}/${GRAPH_VERSION}`

/**
 * Scopes. `instagram_business_basic` gets the profile and the media list;
 * `instagram_business_manage_insights` is what unlocks reach/saves — without it
 * every /insights call 400s and the whole point of this integration is gone.
 *
 * We ask for nothing else. Publishing, comments and messaging scopes would all
 * widen the blast radius of a leaked token for no benefit here.
 */
export const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
] as const

/** Comma-separated, as the authorize endpoint expects. */
export const SCOPE_PARAM = SCOPES.join(',')

/** How many media items a sync pulls. */
export const MEDIA_LIMIT = 50

/**
 * Instagram serves at most 25 media per page on this edge in practice, so 50
 * items means paging. Capped so a malformed `next` cursor can never spin.
 */
export const MEDIA_PAGE_SIZE = 25
export const MAX_MEDIA_PAGES = 6

/**
 * Account-level insight window. Instagram rejects day-period insight ranges
 * longer than 30 days in a single call, so this is a hard ceiling, not a taste
 * decision.
 */
export const ACCOUNT_INSIGHT_DAYS = 30

/** Long-lived tokens last 60 days; refresh once past this age. */
export const TOKEN_REFRESH_AFTER_DAYS = 45

/**
 * Name of the httpOnly cookie carrying the OAuth `state` between the connect
 * redirect and the callback. Shared here rather than exported from one route
 * into the other, so neither route file has to import the other's module.
 */
export const STATE_COOKIE = 'ig_oauth_state'

type InstagramAppConfig = {
  appId: string
  appSecret: string
}

/**
 * App credentials. Throws at call time rather than module load so an unrelated
 * route that happens to share an import never dies on a missing Instagram key.
 */
export function getAppConfig(): InstagramAppConfig {
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error(
      'INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET must be set to connect an Instagram account.'
    )
  }
  return { appId, appSecret }
}

/**
 * The OAuth redirect URI.
 *
 * Meta matches this against the app's registered list byte-for-byte — a
 * trailing slash or an http/https mismatch is rejected — and the *same* value
 * must be sent again on the token exchange. So it is read from a single env var
 * where possible, and only derived from the request origin as a development
 * convenience.
 */
export function getRedirectUri(origin: string): string {
  return process.env.INSTAGRAM_REDIRECT_URI ?? `${origin}/api/instagram/callback`
}

/** True when the integration is configured enough to attempt a connection. */
export function isInstagramConfigured(): boolean {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET)
}
