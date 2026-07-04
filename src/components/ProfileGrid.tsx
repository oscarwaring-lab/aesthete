'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { DnaStrand } from '@/components/DnaStrand'
import { SparklineChart } from '@/components/SparklineChart'
import { CountUp, Reveal } from '@/components/studio-motion'
import type { AestheticDna } from '@/lib/aesthetic-dna'

export type ProfileRow = {
  id: string
  dna: AestheticDna
  created_at: string
  analysis_type: string | null
  pillar_name: string | null
  parent_profile_id: string | null
  creator_handle: string | null
}

const MAX_PILLARS = 3
const RECENT_MS = 30 * 24 * 60 * 60 * 1000
// Captured once at module load so the "Recent" filter stays a pure function of
// its inputs across re-renders (calling Date.now() during render is impure).
const LOADED_AT = Date.now()

export type CheckPoint = { score: number; date: string }
export type ChecksHistory = Record<string, CheckPoint[]>

type Filter = 'all' | 'standard' | 'pillars' | 'recent'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'standard', label: 'Standard' },
  { key: 'pillars', label: 'With pillars' },
  { key: 'recent', label: 'Recent' },
]

/**
 * Client-side specimen grid. Holds the list in local state so a soft-delete
 * removes the card immediately, and carries the cool filter chips (§4 — visual
 * parity first, wired here as simple client filters).
 */
export function ProfileGrid({
  profiles,
  checksHistory,
}: {
  profiles: ProfileRow[]
  checksHistory: ChecksHistory
}) {
  const [rows, setRows] = useState<ProfileRow[]>(profiles)
  const [filter, setFilter] = useState<Filter>('all')

  function removeRow(id: string) {
    setRows((prev) => prev.filter((p) => p.id !== id))
  }

  // Standard profiles are top-level cards; pillars hang off their parent. A
  // null/absent analysis_type is treated as standard.
  const standard = useMemo(
    () => rows.filter((p) => p.analysis_type !== 'pillar'),
    [rows]
  )
  const pillarsByParent = useMemo(() => {
    const map: Record<string, ProfileRow[]> = {}
    for (const p of rows) {
      if (p.analysis_type === 'pillar' && p.parent_profile_id) {
        ;(map[p.parent_profile_id] ??= []).push(p)
      }
    }
    return map
  }, [rows])

  const visible = useMemo(() => {
    return standard.filter((p) => {
      const pillarCount = (pillarsByParent[p.id] ?? []).length
      if (filter === 'standard') return pillarCount === 0
      if (filter === 'pillars') return pillarCount > 0
      if (filter === 'recent')
        return LOADED_AT - new Date(p.created_at).getTime() < RECENT_MS
      return true
    })
  }, [standard, pillarsByParent, filter])

  return (
    <>
      <div className="toolbar">
        <div className="count">
          Showing <b>{visible.length}</b>{' '}
          {visible.length === 1 ? 'identity' : 'identities'}
        </div>
        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chipbtn${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        <Reveal>
          <Link href="/dashboard/upload" className="new-tile">
            <div className="plus">+</div>
            <div className="nt-t">New analysis</div>
            <div className="nt-d">Add a set of images to the wall</div>
          </Link>
        </Reveal>

        {visible.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            pillars={pillarsByParent[profile.id] ?? []}
            checks={checksHistory[profile.id] ?? []}
            onDeleted={removeRow}
          />
        ))}

        {standard.length === 0 && (
          <div className="studio-empty">
            <p>Your first analysis awaits.</p>
          </div>
        )}
      </div>
    </>
  )
}

function ProfileCard({
  profile,
  pillars,
  checks,
  onDeleted,
}: {
  profile: ProfileRow
  pillars: ProfileRow[]
  checks: CheckPoint[]
  onDeleted: (id: string) => void
}) {
  const dna = profile.dna
  const palette = (dna.color?.palette ?? []).map((s) => s.hex).filter(Boolean)
  const dominant = palette[0] ?? '#1E3A5F'
  const date = new Date(profile.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const scores = checks.map((c) => c.score)
  const handle = profile.creator_handle?.trim()

  // Trend compares the two most recent checks.
  let trend: 'up' | 'down' | 'flat' | 'none' = checks.length === 0 ? 'none' : 'flat'
  if (scores.length > 1) {
    const last = scores[scores.length - 1]
    const prev = scores[scores.length - 2]
    trend = last > prev ? 'up' : last < prev ? 'down' : 'flat'
  }
  const trendEl =
    trend === 'up' ? (
      <span className="up">Trending up ↑</span>
    ) : trend === 'down' ? (
      <span className="down">Slipping ↓</span>
    ) : trend === 'flat' ? (
      <span className="flat">Holding —</span>
    ) : (
      <span className="flat">Awaiting first check</span>
    )

  return (
    <Reveal>
      <article className="card">
        {/* Faint palette-grade field behind the glass, from the dominant colour. */}
        <div
          className="cfield"
          style={{ background: `radial-gradient(120% 90% at 15% 0%, ${dominant}, transparent 55%)` }}
        />

        <Link href={`/dashboard/report/${profile.id}`} className="card-main">
          <div className="ctop">
            <div className="arche">{dna.identity.archetype}</div>
            <div className="cscore">
              <CountUp to={dna.consistency_score} />
              <small>Consistency</small>
            </div>
          </div>

          {handle && (
            <div className="meta meta--amber curated">Curated for @{handle}</div>
          )}

          <DnaStrand dna={dna} />

          <div className="cont-row">
            <div className="cl">
              <div className="k">Continuity</div>
              <div className="tv">{trendEl}</div>
            </div>
            {scores.length > 0 && (
              <SparklineChart scores={scores} width={120} height={38} className="spark" />
            )}
          </div>
        </Link>

        {pillars.length > 0 && (
          <div className="pillars">
            {pillars.map((pl) => {
              const bands = (pl.dna.color?.palette ?? []).slice(0, 3).map((s) => s.hex)
              return (
                <Link key={pl.id} href={`/dashboard/report/${pl.id}`} className="pillar">
                  <div className="pbands">
                    {bands.map((c, i) => (
                      <span key={`${c}-${i}`} style={{ background: c }} />
                    ))}
                  </div>
                  <div className="pname">{pl.pillar_name ?? pl.dna.identity.archetype}</div>
                  <div className="pscore">{pl.dna.consistency_score}</div>
                </Link>
              )
            })}
          </div>
        )}

        {pillars.length < MAX_PILLARS && (
          <Link href={`/dashboard/pillar/${profile.id}`} className="add-pillar">
            + Add content pillar
          </Link>
        )}

        <div className="cfoot">
          <span className="meta">{date}</span>
          <span className="meta">
            {palette.length} colours · {checks.length}{' '}
            {checks.length === 1 ? 'check' : 'checks'}
          </span>
        </div>

        <div className="card-actions">
          <Link href={`/dashboard/check/${profile.id}`} className="check-link">
            Check a post <span aria-hidden>→</span>
          </Link>
          <DeleteControl profileId={profile.id} onDeleted={onDeleted} />
        </div>
      </article>
    </Reveal>
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
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
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
        style={{ ...base, color: '#C4933A' }}
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
        style={{ ...base, color: 'rgba(242,242,245,0.3)' }}
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
        Confirm
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
