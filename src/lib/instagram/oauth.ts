import 'server-only'
import {
  AUTHORIZE_URL,
  GRAPH_HOST,
  SCOPE_PARAM,
  TOKEN_EXCHANGE_URL,
  getAppConfig,
} from './config'
import { redactSecrets } from './redact'

/**
 * The three-legged OAuth dance for Business Login for Instagram.
 *
 *   1. buildAuthorizeUrl   → send the creator to Instagram
 *   2. exchangeCodeForShortLivedToken  (1 hour)
 *   3. exchangeForLongLivedToken       (60 days)
 *
 * Step 3 is not optional. A short-lived token expires in an hour, which is
 * shorter than the gap between a creator connecting and us ever syncing again,
 * so a connection stored at step 2 is dead on arrival.
 *
 * Every error path here goes through `redactSecrets`, because the natural thing
 * to log — the request URL, or Meta's echoed response — can carry the client
 * secret or the token itself.
 */

export type ShortLivedToken = {
  accessToken: string
  igUserId: string
  permissions: string[]
}

export type LongLivedToken = {
  accessToken: string
  /** Seconds until expiry, as Instagram reports it. ~5,184,000 (60 days). */
  expiresIn: number | null
}

/**
 * Where to send the creator to approve the connection.
 *
 * `state` is ours: a random value we also drop in an httpOnly cookie and
 * compare on the way back, so a forged callback cannot attach someone else's
 * Instagram account to the signed-in session.
 */
export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const { appId } = getAppConfig()

  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPE_PARAM)
  url.searchParams.set('state', state)

  return url.toString()
}

/**
 * Step 2. The authorization code is single-use and short-lived.
 *
 * `redirect_uri` must be byte-identical to the one used in step 1 — Meta
 * re-validates it here, and a mismatch surfaces as a generic invalid-request
 * error that reads like a bad code.
 */
export async function exchangeCodeForShortLivedToken(
  code: string,
  redirectUri: string
): Promise<ShortLivedToken> {
  const { appId, appSecret } = getAppConfig()

  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  })

  const response = await fetch(TOKEN_EXCHANGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(
      `Instagram code exchange failed (${response.status}): ${redactSecrets(text)}`
    )
  }

  let payload: { access_token?: string; user_id?: string | number; permissions?: unknown }
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`Instagram code exchange returned non-JSON: ${redactSecrets(text)}`)
  }

  if (!payload.access_token || payload.user_id === undefined) {
    throw new Error('Instagram code exchange returned no access_token / user_id.')
  }

  // `permissions` has arrived as both a comma-joined string and an array across
  // versions; normalise so callers can just check membership.
  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.map(String)
    : typeof payload.permissions === 'string'
      ? payload.permissions.split(',').map((p) => p.trim()).filter(Boolean)
      : []

  return {
    accessToken: payload.access_token,
    igUserId: String(payload.user_id),
    permissions,
  }
}

/**
 * Step 3. Short-lived → long-lived (60 days).
 *
 * Note the host change: the exchange in step 2 is on api.instagram.com, this
 * one is on graph.instagram.com. Sending either to the other's host returns an
 * unhelpful error.
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<LongLivedToken> {
  const { appSecret } = getAppConfig()

  const url = new URL(`${GRAPH_HOST}/access_token`)
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('access_token', shortLivedToken)

  const response = await fetch(url, { cache: 'no-store' })
  const text = await response.text()

  if (!response.ok) {
    throw new Error(
      `Instagram long-lived token exchange failed (${response.status}): ${redactSecrets(text)}`
    )
  }

  const payload = JSON.parse(text) as { access_token?: string; expires_in?: number }
  if (!payload.access_token) {
    throw new Error('Instagram long-lived token exchange returned no access_token.')
  }

  return {
    accessToken: payload.access_token,
    expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : null,
  }
}

/**
 * Extend a long-lived token by another 60 days.
 *
 * Instagram only refreshes a token that is at least 24 hours old and not yet
 * expired. There is no recovery once it lapses — the creator has to reconnect —
 * so refreshing is a maintenance job that must run well inside the window
 * (see TOKEN_REFRESH_AFTER_DAYS), not a reaction to a 401.
 */
export async function refreshLongLivedToken(
  longLivedToken: string
): Promise<LongLivedToken> {
  const url = new URL(`${GRAPH_HOST}/refresh_access_token`)
  url.searchParams.set('grant_type', 'ig_refresh_token')
  url.searchParams.set('access_token', longLivedToken)

  const response = await fetch(url, { cache: 'no-store' })
  const text = await response.text()

  if (!response.ok) {
    throw new Error(
      `Instagram token refresh failed (${response.status}): ${redactSecrets(text)}`
    )
  }

  const payload = JSON.parse(text) as { access_token?: string; expires_in?: number }
  if (!payload.access_token) {
    throw new Error('Instagram token refresh returned no access_token.')
  }

  return {
    accessToken: payload.access_token,
    expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : null,
  }
}

/** Absolute expiry from a relative `expires_in`, or null when unreported. */
export function expiryFromNow(expiresIn: number | null): string | null {
  if (expiresIn === null) return null
  return new Date(Date.now() + expiresIn * 1000).toISOString()
}
