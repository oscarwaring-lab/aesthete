import 'server-only'
import type { createAdminClient } from '@/lib/supabase/admin'
import { TOKEN_REFRESH_AFTER_DAYS, MEDIA_LIMIT } from './config'
import { decryptToken, encryptToken } from './token-cipher'
import { expiryFromNow, refreshLongLivedToken } from './oauth'
import { redactError } from './redact'
import {
  InstagramApiError,
  fetchAccountInsights,
  fetchMediaInsights,
  fetchProfile,
  fetchRecentMedia,
  scorableImageUrls,
  type MediaItem,
} from './api'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Pull a connected account's recent performance into post_metrics and
 * account_metrics.
 *
 * Runs entirely server-side with the service-role client: the access token is
 * decrypted in memory, used, and never written back in plaintext or logged.
 *
 * Idempotent by construction. Both writes upsert on a natural key
 * (connection+media, connection+day), so syncing twice refreshes the numbers
 * rather than duplicating rows — which matters because insights on a post keep
 * moving for days after it is published, and the latest reading is the one we
 * want.
 */

export type IngestResult = {
  mediaFetched: number
  postsWritten: number
  postsWithInsights: number
  accountDaysWritten: number
  /** Non-fatal problems worth surfacing without failing the sync. */
  warnings: string[]
}

export type ConnectionRow = {
  id: string
  user_id: string
  ig_user_id: string
  access_token: string
  token_expires_at: string | null
}

/**
 * How many insight calls are in flight at once.
 *
 * One call per post, so a 50-post sync is ~50 requests on top of paging. Meta
 * meters this per user (a few hundred calls an hour), and bursting all 50 at
 * once is the reliable way to trip it. Five keeps a full sync inside a few
 * seconds while staying well under the ceiling.
 */
const INSIGHT_CONCURRENCY = 5

/** Map over `items` with a fixed number of workers, preserving input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  })

  await Promise.all(workers)
  return results
}

/**
 * Return a usable plaintext token for this connection, refreshing it first if
 * it is close to expiry.
 *
 * A long-lived token cannot be renewed once it lapses — the creator has to
 * reconnect — so the refresh happens on a timer (TOKEN_REFRESH_AFTER_DAYS)
 * rather than in response to a 401. A failed refresh is non-fatal while the
 * current token is still valid: we log and carry on with what we have.
 */
async function resolveAccessToken(
  admin: AdminClient,
  connection: ConnectionRow,
  warnings: string[]
): Promise<string> {
  // AAD binds the ciphertext to this IG account; see token-cipher.ts.
  const token = decryptToken(connection.access_token, connection.ig_user_id)

  if (!connection.token_expires_at) return token

  const msRemaining = new Date(connection.token_expires_at).getTime() - Date.now()
  const refreshThresholdMs =
    (60 - TOKEN_REFRESH_AFTER_DAYS) * 24 * 60 * 60 * 1000 // 60-day token lifetime
  if (msRemaining > refreshThresholdMs) return token

  try {
    const refreshed = await refreshLongLivedToken(token)
    const { error } = await admin
      .from('instagram_connections')
      .update({
        access_token: encryptToken(refreshed.accessToken, connection.ig_user_id),
        token_expires_at: expiryFromNow(refreshed.expiresIn),
      })
      .eq('id', connection.id)

    if (error) {
      // The new token works but we failed to persist it. Use it for this sync;
      // the next one will try to refresh again from the stored (older) token,
      // which is still valid — so this degrades rather than breaks.
      warnings.push('Refreshed token could not be saved; will retry next sync.')
      console.error('Failed to persist refreshed Instagram token:', error.message)
    }
    return refreshed.accessToken
  } catch (err) {
    warnings.push('Token refresh failed; using the existing token.')
    console.error('Instagram token refresh failed:', redactError(err))
    return token
  }
}

/** Shape one media item + its insights into a post_metrics row. */
function toPostRow(
  connectionId: string,
  item: MediaItem,
  insights: Awaited<ReturnType<typeof fetchMediaInsights>>
) {
  const { values, viewsMetric } = insights

  // Prefer the insight reading, fall back to the counter on the media object.
  // They can differ slightly, and the insight is the one Instagram's own UI
  // reports, so it wins where both exist.
  const likes = values.likes ?? item.like_count ?? null
  const comments = values.comments ?? item.comments_count ?? null

  const impressionsOrViews = viewsMetric ? (values[viewsMetric] ?? null) : null

  return {
    ig_connection_id: connectionId,
    ig_media_id: item.id,
    permalink: item.permalink ?? null,
    media_type: item.media_type ?? null,
    media_product_type: item.media_product_type ?? null,
    caption: item.caption ?? null,
    posted_at: item.timestamp ?? null,
    media_url: item.media_url ?? null,
    thumbnail_url: item.thumbnail_url ?? null,
    image_urls: scorableImageUrls(item),
    reach: values.reach ?? null,
    impressions_or_views: impressionsOrViews,
    // Only record which metric answered if it actually produced a number —
    // otherwise the column would claim a provenance for a null.
    impressions_or_views_metric: impressionsOrViews === null ? null : viewsMetric,
    saved: values.saved ?? null,
    likes,
    comments,
    shares: values.shares ?? null,
    total_interactions: values.total_interactions ?? null,
    insights_raw: insights.raw ?? null,
    ingested_at: new Date().toISOString(),
  }
}

export async function ingestConnection(
  admin: AdminClient,
  connection: ConnectionRow
): Promise<IngestResult> {
  const warnings: string[] = []
  const accessToken = await resolveAccessToken(admin, connection, warnings)

  // Refresh the username on every sync — creators rename accounts, and a stale
  // handle in our table would quietly break any later outreach or reporting.
  let followersCount: number | null = null
  try {
    const profile = await fetchProfile(accessToken)
    followersCount = profile.followersCount
    await admin
      .from('instagram_connections')
      .update({ ig_username: profile.username })
      .eq('id', connection.id)
  } catch (err) {
    if (err instanceof InstagramApiError && err.isAuthError) throw err
    warnings.push('Could not refresh the account profile.')
    console.error('Instagram profile fetch failed:', redactError(err))
  }

  // ─── Posts ────────────────────────────────────────────────────────────────
  const media = await fetchRecentMedia(accessToken, connection.ig_user_id, MEDIA_LIMIT)

  const insights = await mapWithConcurrency(media, INSIGHT_CONCURRENCY, async (item) => {
    try {
      return await fetchMediaInsights(accessToken, item.id)
    } catch (err) {
      if (err instanceof InstagramApiError && err.isAuthError) throw err
      // One unreadable post must not cost us the other 49.
      console.warn(`Insights unavailable for media ${item.id}:`, redactError(err))
      return { values: {}, viewsMetric: null, raw: null } as const
    }
  })

  const postRows = media.map((item, i) => toPostRow(connection.id, item, insights[i]))

  let postsWritten = 0
  if (postRows.length > 0) {
    const { error } = await admin
      .from('post_metrics')
      .upsert(postRows, { onConflict: 'ig_connection_id,ig_media_id' })
    if (error) {
      throw new Error(`Failed to write post_metrics: ${error.message}`)
    }
    postsWritten = postRows.length
  }

  // ─── Account-level series ────────────────────────────────────────────────
  // Profile views and link clicks only exist at account level. followers_count
  // is a running total read once per sync, so it is stamped on today's row only
  // — back-filling it across the window would invent history we never observed.
  let accountDaysWritten = 0
  try {
    const today = new Date().toISOString().slice(0, 10)
    const daily = await fetchAccountInsights(accessToken, connection.ig_user_id)

    const rows = daily.map((day) => ({
      ig_connection_id: connection.id,
      date: day.date,
      profile_views: day.profileViews,
      link_clicks: day.linkClicks,
      followers_count: day.date === today ? followersCount : null,
      ingested_at: new Date().toISOString(),
    }))

    // If the insight window returned nothing at all but we do know the follower
    // total, that total is still worth a row — it is the start of the series.
    if (rows.length === 0 && followersCount !== null) {
      rows.push({
        ig_connection_id: connection.id,
        date: today,
        profile_views: null,
        link_clicks: null,
        followers_count: followersCount,
        ingested_at: new Date().toISOString(),
      })
    }

    if (rows.length > 0) {
      const { error } = await admin
        .from('account_metrics')
        .upsert(rows, { onConflict: 'ig_connection_id,date' })
      if (error) throw new Error(error.message)
      accountDaysWritten = rows.length
    }
  } catch (err) {
    if (err instanceof InstagramApiError && err.isAuthError) throw err
    // Account metrics are secondary to the per-post data this whole feature
    // exists for, so they never sink a sync that got the posts.
    warnings.push('Account-level metrics were unavailable this sync.')
    console.error('Instagram account insights failed:', redactError(err))
  }

  await admin
    .from('instagram_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', connection.id)

  return {
    mediaFetched: media.length,
    postsWritten,
    postsWithInsights: insights.filter((i) => Object.keys(i.values).length > 0).length,
    accountDaysWritten,
    warnings,
  }
}

/**
 * Load a user's connection, token column included.
 *
 * Service-role only — `authenticated` has no privilege on access_token at all
 * (see the column grants in 009_instagram_ingest.sql), so this query is only
 * possible from trusted server code.
 */
export async function loadConnection(
  admin: AdminClient,
  userId: string
): Promise<ConnectionRow | null> {
  const { data, error } = await admin
    .from('instagram_connections')
    .select('id, user_id, ig_user_id, access_token, token_expires_at')
    .eq('user_id', userId)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to load Instagram connection:', error.message)
    return null
  }
  return (data as ConnectionRow | null) ?? null
}
