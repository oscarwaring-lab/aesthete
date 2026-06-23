'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import type { AestheticDna } from '@/lib/aesthetic-dna'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Dimension = { score: number; note: string }
type CheckResult = {
  id: string
  created_at: string
  image_url: string | null
  overall_score: number
  dimensions: {
    colour: Dimension
    tone: Dimension
    mood: Dimension
    composition: Dimension
  }
  verdict: { summary: string; post_it: boolean; fix_note: string }
}

type HistoryItem = {
  id: string
  overall_score: number
  created_at: string
  verdict: { summary: string; post_it: boolean; fix_note: string }
}

const AMBER = '#C4933A'

/** Colour-coded label for the overall score. */
function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 85) return { text: 'Strong match', color: AMBER }
  if (score >= 70) return { text: 'Good fit', color: 'rgba(255,255,255,0.6)' }
  if (score >= 50) return { text: 'Needs work', color: 'rgba(255,255,255,0.4)' }
  return { text: 'Off identity', color: 'rgba(196,147,58,0.5)' }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function CheckPage({
  params,
}: {
  params: Promise<{ profileId: string }>
}) {
  const { profileId } = use(params)
  const inputRef = useRef<HTMLInputElement>(null)

  const [archetype, setArchetype] = useState<string | null>(null)
  const [dna, setDna] = useState<AestheticDna | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  const [selected, setSelected] = useState<{ file: File; url: string } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch the profile (for the archetype + DNA) and recent checks on mount.
  useEffect(() => {
    const supabase = createClient()
    let active = true

    async function load() {
      const [{ data: profile }, { data: checks }] = await Promise.all([
        supabase
          .from('aesthetic_profiles')
          .select('dna')
          .eq('id', profileId)
          .maybeSingle(),
        supabase
          .from('continuity_checks')
          .select('id, overall_score, verdict, created_at')
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false })
          .limit(3),
      ])
      if (!active) return
      if (profile?.dna) {
        const d = profile.dna as AestheticDna
        setDna(d)
        setArchetype(d.identity.archetype)
      }
      if (checks) setHistory(checks as HistoryItem[])
    }

    load()
    return () => {
      active = false
    }
  }, [profileId])

  // Trigger the bar reveal animation a tick after the result lands.
  useEffect(() => {
    if (status === 'done') {
      const t = setTimeout(() => setRevealed(true), 60)
      return () => clearTimeout(t)
    }
  }, [status])

  const selectFile = useCallback((file: File) => {
    setError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG and WebP images are supported.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`"${file.name}" is larger than 8MB.`)
      return
    }
    setSelected((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { file, url: URL.createObjectURL(file) }
    })
  }, [])

  async function check() {
    if (!selected) return
    setError(null)
    setStatus('loading')

    const formData = new FormData()
    formData.append('image', await compressImage(selected.file))
    formData.append('profile_id', profileId)

    try {
      const res = await fetch('/api/continuity-check', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setStatus('idle')
        return
      }
      setResult(data as CheckResult)
      setStatus('done')
      setHistory((prev) => [data as HistoryItem, ...prev].slice(0, 3))
    } catch {
      setError('Network error. Please try again.')
      setStatus('idle')
    }
  }

  function reset() {
    if (selected) URL.revokeObjectURL(selected.url)
    setSelected(null)
    setResult(null)
    setRevealed(false)
    setStatus('idle')
    setError(null)
  }

  return (
    <div style={{ background: '#0a0a0c', minHeight: '100%', padding: 28 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* ─── Header ──────────────────────────────────────────── */}
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            fontSize: 10,
            color: 'rgba(255,255,255,0.35)',
            marginBottom: 28,
          }}
        >
          ← Profiles
        </Link>

        <h1
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: 24,
            fontWeight: 500,
            color: '#f2f2f5',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Check a post
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
          Checking against:{' '}
          <span style={{ fontStyle: 'italic' }}>{archetype ?? '…'}</span>
        </p>

        {/* ─── Idle: upload zone ───────────────────────────────── */}
        {status === 'idle' && (
          <>
            <div
              className="upload-zone"
              style={{ marginTop: 24, padding: 32 }}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.files?.[0]) selectFile(e.dataTransfer.files[0])
              }}
            >
              {selected ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.url}
                  alt=""
                  style={{
                    maxHeight: 240,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: 2,
                  }}
                />
              ) : (
                <>
                  <ImagePlus
                    size={28}
                    style={{ color: 'rgba(255,255,255,0.2)' }}
                    strokeWidth={1.5}
                  />
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
                    Drop a single image here
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
                    or click to browse — JPEG, PNG, WebP up to 8MB
                  </p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) selectFile(e.target.files[0])
                  e.target.value = ''
                }}
              />
            </div>

            {error && <p style={{ marginTop: 16, fontSize: 13, color: AMBER }}>{error}</p>}

            <button
              className="analyse-btn"
              style={{ marginTop: selected ? 8 : 24 }}
              onClick={check}
              disabled={!selected}
            >
              Check this post →
            </button>

            <RecentChecks history={history} />
          </>
        )}

        {/* ─── Loading ─────────────────────────────────────────── */}
        {status === 'loading' && selected && (
          <div
            style={{
              position: 'relative',
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.url}
              alt=""
              style={{
                maxHeight: 320,
                maxWidth: '100%',
                objectFit: 'contain',
                borderRadius: 2,
                opacity: 0.4,
              }}
            />
            <span
              className="continuity-pulse"
              style={{
                position: 'absolute',
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              Reading against your DNA…
            </span>
          </div>
        )}

        {/* ─── Result ──────────────────────────────────────────── */}
        {status === 'done' && result && (
          <ResultView
            result={result}
            revealed={revealed}
            imageUrl={selected?.url ?? result.image_url}
            onReset={reset}
          />
        )}
      </div>
    </div>
  )
}

const DIMENSIONS: { key: keyof CheckResult['dimensions']; label: string }[] = [
  { key: 'colour', label: 'Colour' },
  { key: 'tone', label: 'Tone' },
  { key: 'mood', label: 'Mood' },
  { key: 'composition', label: 'Composition' },
]

function ResultView({
  result,
  revealed,
  imageUrl,
  onReset,
}: {
  result: CheckResult
  revealed: boolean
  imageUrl: string | null | undefined
  onReset: () => void
}) {
  const label = scoreLabel(result.overall_score)
  const postIt = result.verdict.post_it

  return (
    <div style={{ marginTop: 28 }}>
      {/* Overall score — the centrepiece */}
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: 72,
            color: '#f2f2f5',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          {result.overall_score}
        </span>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>/ 100</span>
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: label.color,
          }}
        >
          {label.text}
        </div>
      </div>

      {/* Dimension breakdown */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {DIMENSIONS.map(({ key, label: dimLabel }) => {
          const dim = result.dimensions[key]
          return (
            <div key={key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 7,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {dimLabel}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{dim.score}</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 4,
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: revealed ? `${dim.score}%` : '0%',
                    background: `linear-gradient(90deg, #1E3A5F, ${AMBER})`,
                    borderRadius: 999,
                    transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.35)',
                  fontStyle: 'italic',
                  marginTop: 4,
                }}
              >
                {dim.note}
              </p>
            </div>
          )
        })}
      </div>

      {/* Verdict */}
      <hr
        style={{
          height: 1,
          border: 'none',
          background: 'rgba(255,255,255,0.055)',
          margin: '24px 0',
        }}
      />

      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: postIt ? AMBER : 'rgba(255,255,255,0.4)',
        }}
      >
        {postIt ? 'Post it' : 'Hold it'}
      </div>

      <p
        style={{
          fontFamily: 'var(--font-playfair), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 16,
          color: 'rgba(255,255,255,0.8)',
          lineHeight: 1.7,
          marginTop: 10,
        }}
      >
        {result.verdict.summary}
      </p>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 12 }}>
        <span style={{ color: AMBER, marginRight: 6 }}>→</span>
        {result.verdict.fix_note}
      </p>

      {/* Source image */}
      {imageUrl && (
        <div style={{ marginTop: 28 }}>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.25)',
              marginBottom: 8,
            }}
          >
            Checked image
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Checked"
            style={{
              width: '100%',
              maxHeight: 320,
              objectFit: 'cover',
              borderRadius: 2,
              display: 'block',
            }}
          />
        </div>
      )}

      <button
        onClick={onReset}
        style={{
          display: 'inline-block',
          marginTop: 24,
          background: 'none',
          border: 'none',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer',
        }}
      >
        Check another post →
      </button>
    </div>
  )
}

function RecentChecks({ history }: { history: HistoryItem[] }) {
  if (history.length === 0) return null

  return (
    <div style={{ marginTop: 40 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.25)',
          marginBottom: 12,
        }}
      >
        Recent checks
      </div>
      {history.map((item, i) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.055)',
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid rgba(196,147,58,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: AMBER,
            }}
          >
            {item.overall_score}
          </span>
          <span style={{ flexShrink: 0, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            {formatDate(item.created_at)}
          </span>
          <span
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.4)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.verdict?.summary}
          </span>
        </div>
      ))}
    </div>
  )
}
