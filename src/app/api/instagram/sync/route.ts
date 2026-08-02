import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InstagramApiError } from '@/lib/instagram/api'
import { ingestConnection, loadConnection } from '@/lib/instagram/ingest'
import { redactError } from '@/lib/instagram/redact'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Re-ingest the signed-in user's connected account.
 *
 * The same routine the OAuth callback runs, exposed so a sync can be repeated
 * without re-authorising — for a manual refresh now, and for the scheduled job
 * that will eventually keep post_metrics current.
 *
 * The connection is resolved from the session, never from the request body:
 * there is no connection id to pass, so there is nothing to tamper with.
 */

/**
 * Minimum gap between syncs. Instagram meters API calls per user per hour and a
 * full sync spends ~55 of them, so an unthrottled button is a genuine way to
 * lock a creator out of their own data for an hour.
 */
const SYNC_COOLDOWN_MS = 60_000

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const connection = await loadConnection(admin, user.id)

  if (!connection) {
    return NextResponse.json(
      { error: 'No Instagram account is connected.' },
      { status: 404 }
    )
  }

  const { data: lastSync } = await admin
    .from('instagram_connections')
    .select('last_synced_at')
    .eq('id', connection.id)
    .maybeSingle()

  if (lastSync?.last_synced_at) {
    const elapsed = Date.now() - new Date(lastSync.last_synced_at).getTime()
    if (elapsed < SYNC_COOLDOWN_MS) {
      return NextResponse.json(
        {
          error: 'Just synced. Try again in a moment.',
          retry_after_seconds: Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000),
        },
        { status: 429 }
      )
    }
  }

  try {
    const result = await ingestConnection(admin, connection)
    return NextResponse.json({
      media_fetched: result.mediaFetched,
      posts_written: result.postsWritten,
      posts_with_insights: result.postsWithInsights,
      account_days_written: result.accountDaysWritten,
      warnings: result.warnings,
    })
  } catch (err) {
    // An expired or revoked token is the one failure the creator can act on, so
    // it gets its own status and message instead of a generic 500.
    if (err instanceof InstagramApiError && err.isAuthError) {
      console.warn('Instagram sync hit an auth error:', redactError(err))
      return NextResponse.json(
        {
          error: 'Instagram access has expired. Reconnect the account.',
          code: 'REAUTH_REQUIRED',
        },
        { status: 401 }
      )
    }
    console.error('Instagram sync failed:', redactError(err))
    return NextResponse.json({ error: 'Sync failed.' }, { status: 502 })
  }
}
