'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Account-connection card for the studio.
 *
 * Deliberately says nothing about performance. This is the connect + ingest
 * foundation only: the numbers it shows are counts of what we have harvested,
 * not analytics about the creator's account. Anything resembling "your saves
 * are up" belongs to a later pass, once the DNA-consistency correlation has
 * actually been tested.
 *
 * Every prop is computed server-side. No Supabase query runs from this
 * component, so no token-adjacent column is ever named in the client bundle.
 */

export type InstagramConnectionSummary = {
  username: string | null
  connectedAt: string
  lastSyncedAt: string | null
  postCount: number
}

const STATUS_MESSAGES: Record<string, string> = {
  connected: 'Instagram connected. Your recent posts are in.',
  connected_no_data:
    'Instagram connected, but the first sync failed. Try Sync now.',
  denied: 'Instagram connection was cancelled.',
  state_mismatch: 'That connection link expired. Please try again.',
  missing_insights_scope:
    'Aesthete needs the insights permission to read post performance. Please reconnect and allow it.',
  unconfigured: 'Instagram is not configured on this deployment yet.',
  error: 'Something went wrong connecting Instagram. Please try again.',
}

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function InstagramConnectCard({
  connection,
  configured,
  status,
}: {
  connection: InstagramConnectionSummary | null
  configured: boolean
  /** The `?instagram=` flag the OAuth callback redirected back with. */
  status?: string
}) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(
    status ? (STATUS_MESSAGES[status] ?? null) : null
  )

  async function sync() {
    setSyncing(true)
    setMessage(null)
    try {
      const response = await fetch('/api/instagram/sync', { method: 'POST' })
      const body = await response.json()
      if (!response.ok) {
        setMessage(body.error ?? 'Sync failed.')
      } else {
        setMessage(
          `Synced ${body.posts_written} posts (${body.posts_with_insights} with insights).`
        )
        // Refresh the server component so the counts above update too.
        router.refresh()
      }
    } catch {
      setMessage('Sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="ig-card">
      <div className="ig-head">
        <div>
          <div className="k">Instagram</div>
          <div className="v">
            {connection
              ? (connection.username ? `@${connection.username}` : 'Connected')
              : 'Not connected'}
          </div>
        </div>

        <div className="ig-actions">
          {connection && (
            <button
              type="button"
              className="ig-btn"
              onClick={sync}
              disabled={syncing}
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          )}
          {configured ? (
            <a className="ig-btn primary" href="/api/instagram/connect">
              {connection ? 'Reconnect' : 'Connect account'}
            </a>
          ) : (
            <span className="ig-note">Not configured</span>
          )}
        </div>
      </div>

      <div className="ig-meta">
        {connection ? (
          <>
            <span>
              {connection.postCount} {connection.postCount === 1 ? 'post' : 'posts'} stored
            </span>
            <span className="dot">·</span>
            <span>
              {connection.lastSyncedAt
                ? `synced ${relativeTime(connection.lastSyncedAt)}`
                : 'never synced'}
            </span>
          </>
        ) : (
          <span>
            Connect your account so Aesthete can see how your posts actually perform.
          </span>
        )}
      </div>

      {message && <div className="ig-msg">{message}</div>}
    </div>
  )
}
