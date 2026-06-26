'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DnaStrand } from '@/components/DnaStrand'
import { SparklineChart } from '@/components/SparklineChart'
import type { AestheticDna } from '@/lib/aesthetic-dna'

export type ProfileRow = {
  id: string
  dna: AestheticDna
  created_at: string
}

export type CheckPoint = { score: number; date: string }
export type ChecksHistory = Record<string, CheckPoint[]>

/**
 * Client-side profile grid. Holds the list in local state so a soft-delete
 * removes the card immediately, with no full-page reload.
 */
export function ProfileGrid({
  profiles,
  checksHistory,
}: {
  profiles: ProfileRow[]
  checksHistory: ChecksHistory
}) {
  const [rows, setRows] = useState<ProfileRow[]>(profiles)

  function removeRow(id: string) {
    setRows((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
      }}
    >
      {rows.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          checks={checksHistory[profile.id] ?? []}
          onDeleted={removeRow}
        />
      ))}
      <BlankCanvasCard />
    </div>
  )
}

function ProfileCard({
  profile,
  checks,
  onDeleted,
}: {
  profile: ProfileRow
  checks: CheckPoint[]
  onDeleted: (id: string) => void
}) {
  const dna = profile.dna
  const date = new Date(profile.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div>
      <Link href={`/dashboard/report/${profile.id}`} className="cc">
        <DnaStrand dna={dna} />

        <hr
          style={{
            height: 1,
            border: 'none',
            background: 'rgba(255,255,255,0.08)',
            margin: '10px 0 8px',
          }}
        />

        <div
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 12,
            color: '#f2f2f5',
            lineHeight: 1.3,
            marginBottom: 6,
          }}
        >
          {dna.identity.archetype}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.06em' }}>
            {date}
          </span>
          <span style={{ fontSize: 10, color: '#C4933A', letterSpacing: '0.04em', fontWeight: 500 }}>
            {dna.consistency_score}/100
          </span>
        </div>
      </Link>

      <ContinuityHistory checks={checks} />

      {/* Sits below the card, separate from its click target. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href={`/dashboard/check/${profile.id}`} className="check-post-link">
          Check a post <span aria-hidden>→</span>
        </Link>
        <DeleteControl profileId={profile.id} onDeleted={onDeleted} />
      </div>
    </div>
  )
}

/**
 * Continuity score history for a single profile: a labelled most-recent score,
 * a trend glyph, and a mini sparkline of every check run against the profile.
 * Falls back to a quiet "no checks yet" line before the first check.
 */
function ContinuityHistory({ checks }: { checks: CheckPoint[] }) {
  if (checks.length === 0) {
    return (
      <div
        style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 10,
          color: 'rgba(242,242,245,0.25)',
          margin: '8px 0 2px',
        }}
      >
        No continuity checks yet
      </div>
    )
  }

  const scores = checks.map((c) => c.score)
  const latest = scores[scores.length - 1]

  // Trend compares the two most recent checks. A single check has no trend.
  let trend = '—'
  if (scores.length > 1) {
    const prev = scores[scores.length - 2]
    if (latest > prev) trend = '↑'
    else if (latest < prev) trend = '↓'
  }

  return (
    <div style={{ margin: '8px 0 2px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 9,
            color: 'rgba(242,242,245,0.35)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          Continuity
        </span>
        <span
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13,
            color: '#C4933A',
          }}
        >
          {latest}
          <span style={{ marginLeft: 4 }} aria-hidden>
            {trend}
          </span>
        </span>
      </div>
      <SparklineChart scores={scores} />
    </div>
  )
}

/**
 * Two-step inline delete: a quiet "Delete" label expands to
 * "Confirm delete" / "Cancel" on first click. No modal, no window.confirm().
 */
function DeleteControl({
  profileId,
  onDeleted,
}: {
  profileId: string
  onDeleted: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    setError(false)
    try {
      const res = await fetch(`/api/profiles/${profileId}`, { method: 'PATCH' })
      if (!res.ok) throw new Error('delete failed')
      onDeleted(profileId)
    } catch {
      setError(true)
      setConfirming(false)
      setDeleting(false)
    }
  }

  const base = {
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: 11,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  } as const

  if (error) {
    return (
      <button
        type="button"
        onClick={() => setError(false)}
        style={{ ...base, color: '#C4933A', cursor: 'pointer' }}
      >
        Could not delete
      </button>
    )
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{ ...base, color: 'rgba(242,242,245,0.25)' }}
      >
        Delete
      </button>
    )
  }

  return (
    <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={deleting}
        style={{ ...base, color: '#C4933A', cursor: deleting ? 'progress' : 'pointer' }}
      >
        Confirm delete
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={deleting}
        style={{ ...base, color: 'rgba(242,242,245,0.4)' }}
      >
        Cancel
      </button>
    </span>
  )
}

function BlankCanvasCard() {
  return (
    <Link href="/dashboard/upload" className="blank-canvas">
      <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.14)', lineHeight: 1 }}>+</span>
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.18)',
          marginTop: 8,
        }}
      >
        Begin new work
      </span>
    </Link>
  )
}
