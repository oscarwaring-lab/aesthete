import 'server-only'
import {
  ACCOUNT_INSIGHT_DAYS,
  GRAPH_BASE,
  MAX_MEDIA_PAGES,
  MEDIA_LIMIT,
  MEDIA_PAGE_SIZE,
} from './config'
import { redactSecrets } from './redact'

/**
 * Read-side client for the Instagram Graph API.
 *
 * The organising principle here is that Meta's metric and field catalogue moves
 * under us — `impressions` was replaced by `views`, fields come and go per
 * media type, and an account that has never had 100 followers is refused some
 * metrics outright. A client that demands the perfect field list gets a 400 and
 * ingests nothing.
 *
 * So every read DEGRADES: we ask for the richest set we know of, and on
 * rejection retry with a smaller one, down to a floor of "whatever we can get".
 * Missing data is stored as NULL, which is deliberately distinguishable from a
 * real zero — a post with no `saved` reading and a post that was saved zero
 * times must not look the same to the correlation analysis this feeds.
 */

export class InstagramApiError extends Error {
  readonly status: number
  readonly code: number | null
  readonly subcode: number | null

  constructor(message: string, status: number, code: number | null, subcode: number | null) {
    super(message)
    this.name = 'InstagramApiError'
    this.status = status
    this.code = code
    this.subcode = subcode
  }

  /**
   * True when the token itself is the problem (expired, revoked, or the user
   * removed the app) rather than the request. The caller's response to this is
   * different in kind: not "retry with fewer fields" but "ask the creator to
   * reconnect".
   */
  get isAuthError(): boolean {
    return this.status === 401 || this.code === 190 || this.code === 102
  }
}

/**
 * One GET against the Graph API.
 *
 * The token goes in the query string because that is the only form this API
 * accepts; it is therefore never included in any thrown message — see the
 * `redactSecrets` on the error path, and note that the URL is not interpolated
 * into it.
 */
async function graphGet<T>(
  path: string,
  params: Record<string, string>,
  accessToken: string
): Promise<T> {
  const url = new URL(`${GRAPH_BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url, { cache: 'no-store' })
  const text = await response.text()

  if (!response.ok) {
    let code: number | null = null
    let subcode: number | null = null
    let message = redactSecrets(text)
    try {
      const parsed = JSON.parse(text) as {
        error?: { message?: string; code?: number; error_subcode?: number }
      }
      if (parsed.error) {
        code = parsed.error.code ?? null
        subcode = parsed.error.error_subcode ?? null
        message = redactSecrets(parsed.error.message ?? message)
      }
    } catch {
      // Non-JSON error body; the redacted text above is the best we have.
    }
    throw new InstagramApiError(
      `Instagram API ${path} failed (${response.status}): ${message}`,
      response.status,
      code,
      subcode
    )
  }

  return JSON.parse(text) as T
}

// ─── Profile ────────────────────────────────────────────────────────────────

export type InstagramProfile = {
  igUserId: string
  username: string | null
  followersCount: number | null
}

/**
 * The connected account itself.
 *
 * `followers_count` is a point-in-time total and is NOT available as a daily
 * insight — the `follower_count` *metric* is the number of new follows per day,
 * a different quantity. So the total is read here, once per sync, and stamped
 * onto that day's account_metrics row only.
 */
export async function fetchProfile(accessToken: string): Promise<InstagramProfile> {
  type Response = { user_id?: string; id?: string; username?: string; followers_count?: number }

  let data: Response
  try {
    data = await graphGet<Response>(
      'me',
      { fields: 'user_id,username,followers_count' },
      accessToken
    )
  } catch (err) {
    if (err instanceof InstagramApiError && err.isAuthError) throw err
    // followers_count is refused on accounts below Instagram's threshold, which
    // would otherwise cost us the username too.
    data = await graphGet<Response>('me', { fields: 'user_id,username' }, accessToken)
  }

  const igUserId = data.user_id ?? data.id
  if (!igUserId) throw new Error('Instagram /me returned no user id.')

  return {
    igUserId: String(igUserId),
    username: data.username ?? null,
    followersCount: typeof data.followers_count === 'number' ? data.followers_count : null,
  }
}

// ─── Media ──────────────────────────────────────────────────────────────────

export type MediaChild = {
  id: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
}

export type MediaItem = {
  id: string
  media_type?: string
  media_product_type?: string
  permalink?: string
  caption?: string
  timestamp?: string
  media_url?: string
  thumbnail_url?: string
  like_count?: number
  comments_count?: number
  children?: { data?: MediaChild[] }
}

type MediaPage = {
  data?: MediaItem[]
  paging?: { cursors?: { after?: string }; next?: string }
}

/**
 * Field sets, richest first. Each entry is tried in order until one is accepted.
 *
 * `caption` and `media_product_type` sit in the first tier alone because they
 * are the two Meta has moved between login flavours; losing them costs us the
 * post text and the format segmentation, but not the metrics, so they must not
 * be able to take the whole request down with them.
 */
const MEDIA_FIELD_TIERS = [
  'id,media_type,media_product_type,permalink,caption,timestamp,media_url,thumbnail_url,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}',
  'id,media_type,permalink,caption,timestamp,media_url,thumbnail_url,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}',
  'id,media_type,permalink,timestamp,media_url,thumbnail_url,like_count,comments_count',
]

/**
 * The most recent `limit` media items, newest first, following paging cursors.
 *
 * Media order is Instagram's (reverse chronological) and is preserved. Stories
 * are not on this edge at all — they live on /stories and expire in 24h — so
 * everything here is a permanent feed post, which is what we want to correlate.
 */
export async function fetchRecentMedia(
  accessToken: string,
  igUserId: string,
  limit: number = MEDIA_LIMIT
): Promise<MediaItem[]> {
  const items: MediaItem[] = []
  let fieldTier = 0
  let after: string | undefined

  for (let page = 0; page < MAX_MEDIA_PAGES && items.length < limit; page++) {
    const params: Record<string, string> = {
      fields: MEDIA_FIELD_TIERS[fieldTier],
      limit: String(Math.min(MEDIA_PAGE_SIZE, limit - items.length)),
    }
    if (after) params.after = after

    let response: MediaPage
    try {
      response = await graphGet<MediaPage>(`${igUserId}/media`, params, accessToken)
    } catch (err) {
      // An auth failure is terminal; a field rejection means try a poorer set.
      if (err instanceof InstagramApiError && err.isAuthError) throw err
      if (fieldTier < MEDIA_FIELD_TIERS.length - 1) {
        fieldTier++
        console.warn(
          `Instagram media fields tier ${fieldTier - 1} rejected — retrying with a reduced set.`
        )
        page-- // this page did not count
        continue
      }
      throw err
    }

    const batch = response.data ?? []
    items.push(...batch)

    after = response.paging?.cursors?.after
    // No cursor, or a short page, means we have reached the end of the feed.
    if (!after || !response.paging?.next || batch.length === 0) break
  }

  return items.slice(0, limit)
}

/**
 * The frames of a post that can actually be scored against a creator's DNA.
 *
 * Which field holds an image depends on the media type, and getting it wrong is
 * silent: `media_url` on a REEL is an .mp4, so a scorer handed it would fail on
 * every video post. Resolved once, here, at ingest.
 *
 *   IMAGE           → media_url
 *   VIDEO / REELS   → thumbnail_url (the poster frame)
 *   CAROUSEL_ALBUM  → each child, same rule, in carousel order
 */
export function scorableImageUrls(item: MediaItem): string[] {
  const frameOf = (m: { media_type?: string; media_url?: string; thumbnail_url?: string }) =>
    m.media_type === 'VIDEO' ? (m.thumbnail_url ?? null) : (m.media_url ?? m.thumbnail_url ?? null)

  if (item.media_type === 'CAROUSEL_ALBUM') {
    const children = item.children?.data ?? []
    const urls = children.map(frameOf).filter((u): u is string => Boolean(u))
    // A carousel whose children we could not read still has a cover image.
    if (urls.length > 0) return urls
  }

  const single = frameOf(item)
  return single ? [single] : []
}

// ─── Media insights ─────────────────────────────────────────────────────────

export type MediaInsights = {
  values: Record<string, number>
  /** Which of views/impressions actually answered, or null if neither did. */
  viewsMetric: 'views' | 'impressions' | null
  /** Raw payload as returned, for metrics we do not model yet. */
  raw: unknown
}

/**
 * Metric sets, richest first.
 *
 * Tier 1 is the current catalogue. Tier 2 swaps `views` back to the deprecated
 * `impressions` — kept because an app still pinned to an older API version, or
 * an account on an older backend, answers the old name and nothing else, and a
 * reach-only row would be much poorer. Tier 3 is the floor: `reach` and `saved`
 * are the two the whole conversion thesis actually needs.
 */
const MEDIA_METRIC_TIERS: { metrics: string[]; viewsMetric: 'views' | 'impressions' | null }[] = [
  {
    metrics: ['reach', 'views', 'saved', 'likes', 'comments', 'shares', 'total_interactions'],
    viewsMetric: 'views',
  },
  {
    metrics: ['reach', 'impressions', 'saved', 'likes', 'comments', 'shares', 'total_interactions'],
    viewsMetric: 'impressions',
  },
  { metrics: ['reach', 'saved'], viewsMetric: null },
]

type InsightEntry = {
  name?: string
  values?: { value?: unknown }[]
  total_value?: { value?: unknown }
}

type InsightsResponse = { data?: InsightEntry[] }

/**
 * Pull a plain number out of either insight response shape. Lifetime metrics
 * arrive as a single-element `values` array; the newer aggregate metrics arrive
 * as `total_value`. Both are read so a metric that migrates between the two
 * does not silently start returning null.
 */
function readMetric(entry: InsightEntry): number | null {
  const fromValues = entry.values?.[0]?.value
  if (typeof fromValues === 'number') return fromValues
  const fromTotal = entry.total_value?.value
  if (typeof fromTotal === 'number') return fromTotal
  return null
}

/**
 * Per-post insights, degrading through MEDIA_METRIC_TIERS.
 *
 * Returns nulls rather than throwing when every tier is refused: insights are
 * simply absent for some posts (very old ones, and accounts that switched to a
 * Business account after posting), and one such post must not abort a 50-item
 * sync. An auth error still propagates — that is not a per-post problem.
 */
export async function fetchMediaInsights(
  accessToken: string,
  mediaId: string
): Promise<MediaInsights> {
  for (const tier of MEDIA_METRIC_TIERS) {
    let response: InsightsResponse
    try {
      response = await graphGet<InsightsResponse>(
        `${mediaId}/insights`,
        { metric: tier.metrics.join(',') },
        accessToken
      )
    } catch (err) {
      if (err instanceof InstagramApiError && err.isAuthError) throw err
      continue // try a poorer metric set
    }

    const values: Record<string, number> = {}
    for (const entry of response.data ?? []) {
      const value = readMetric(entry)
      if (entry.name && value !== null) values[entry.name] = value
    }

    return { values, viewsMetric: tier.viewsMetric, raw: response }
  }

  return { values: {}, viewsMetric: null, raw: null }
}

// ─── Account insights ───────────────────────────────────────────────────────

export type AccountDayMetrics = {
  /** ISO date, YYYY-MM-DD. */
  date: string
  profileViews: number | null
  linkClicks: number | null
}

/**
 * Account-level metric names, richest first.
 *
 * Link clicks are the awkward one. Meta renamed `website_clicks` to
 * `profile_links_taps` when profiles gained multiple links, and which name an
 * account answers to depends on its backend, so both are tried. There is no
 * per-post equivalent of either — see the note in the migration.
 */
const LINK_CLICK_METRICS = ['profile_links_taps', 'website_clicks']

type DaySeries = Map<string, number>

/** Fetch one day-period metric as a date→value series. Empty map if refused. */
async function fetchDaySeries(
  accessToken: string,
  igUserId: string,
  metric: string,
  since: number,
  until: number
): Promise<DaySeries> {
  const series: DaySeries = new Map()

  let response: {
    data?: { name?: string; values?: { value?: unknown; end_time?: string }[] }[]
  }
  try {
    response = await graphGet(
      `${igUserId}/insights`,
      {
        metric,
        period: 'day',
        metric_type: 'time_series',
        since: String(since),
        until: String(until),
      },
      accessToken
    )
  } catch (err) {
    if (err instanceof InstagramApiError && err.isAuthError) throw err
    console.warn(`Instagram account metric "${metric}" unavailable — storing null.`)
    return series
  }

  for (const entry of response.data ?? []) {
    for (const point of entry.values ?? []) {
      if (typeof point.value !== 'number' || !point.end_time) continue
      // end_time is the END of the day the value covers, so the value belongs to
      // the day before it. Off by one here would shift the whole series against
      // the post timestamps it will eventually be joined to.
      const end = new Date(point.end_time)
      end.setUTCDate(end.getUTCDate() - 1)
      series.set(end.toISOString().slice(0, 10), point.value)
    }
  }

  return series
}

/**
 * Daily profile views and link clicks for the last ACCOUNT_INSIGHT_DAYS.
 *
 * Both are account-level ONLY. Instagram exposes no per-post attribution for
 * either, and none is invented here: a click is stored against the day it
 * happened and nothing more.
 */
export async function fetchAccountInsights(
  accessToken: string,
  igUserId: string,
  days: number = ACCOUNT_INSIGHT_DAYS
): Promise<AccountDayMetrics[]> {
  const until = Math.floor(Date.now() / 1000)
  const since = until - days * 24 * 60 * 60

  const profileViews = await fetchDaySeries(accessToken, igUserId, 'profile_views', since, until)

  let linkClicks: DaySeries = new Map()
  for (const metric of LINK_CLICK_METRICS) {
    linkClicks = await fetchDaySeries(accessToken, igUserId, metric, since, until)
    if (linkClicks.size > 0) break
  }

  const dates = new Set([...profileViews.keys(), ...linkClicks.keys()])
  return [...dates]
    .sort()
    .map((date) => ({
      date,
      profileViews: profileViews.get(date) ?? null,
      linkClicks: linkClicks.get(date) ?? null,
    }))
}
