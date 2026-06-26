'use client'

import { useState } from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'
import { isLightPalette } from '@/lib/colour'
import type { AestheticDna } from '@/lib/aesthetic-dna'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

/**
 * Locale- and timezone-independent date formatter, e.g. "Jun 22, 2026".
 * Uses UTC getters so the server and client render identical output,
 * avoiding the hydration mismatch that toLocaleDateString() caused.
 */
function formatReportDate(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

/**
 * The centrepiece. Renders an Aesthetic DNA profile as a premium card that
 * embodies the creator's aesthetic: a bright dominant palette colour earns a
 * cream card, a dark one keeps the dark studio card. The light/dark switch is
 * purely visual — it flips the `--card-*` tokens via `data-theme` and changes
 * no data. The amber accent, DNA bands and score bar are identical in both.
 *
 * Used by both the authenticated report page and the public share page.
 * `shareSlug` enables the copy-link button. `createdAt` is optional metadata.
 */
export function DnaReport({
  dna,
  shareSlug,
  createdAt,
  imageUrls,
}: {
  dna: AestheticDna
  shareSlug?: string | null
  createdAt?: string
  imageUrls?: string[] | null
}) {
  const lightMode = isLightPalette(dna.color.palette[0]?.hex ?? '#111110')

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        data-theme={lightMode ? 'light' : 'dark'}
        className="overflow-hidden rounded-3xl border"
        style={{
          background: 'var(--card-bg)',
          color: 'var(--card-text)',
          borderColor: 'var(--card-cborder)',
        }}
      >
        {/* Header */}
        <div
          className="relative px-8 pt-10 pb-8"
          style={{ background: 'var(--card-bg-inner)' }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-30"
            style={{
              background:
                'radial-gradient(ellipse at top, var(--accent), transparent 70%)',
            }}
          />
          <div className="relative">
            <span
              className="text-xs font-medium uppercase tracking-[0.2em]"
              style={{ color: 'var(--card-muted)' }}
            >
              Aesthetic DNA
            </span>
            <h1
              className="mt-2 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
              style={{ color: 'var(--card-text)' }}
            >
              {dna.identity.archetype}
            </h1>
            {dna.creative_brief?.signature && (
              <p
                style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: 'rgba(var(--card-text-rgb), 0.65)',
                  lineHeight: 1.5,
                  maxWidth: 600,
                  marginTop: 8,
                }}
              >
                {dna.creative_brief.signature}
              </p>
            )}
            <p
              className="mt-3 max-w-prose text-sm leading-relaxed"
              style={{ color: 'var(--card-muted)' }}
            >
              {dna.identity.summary}
            </p>
          </div>
        </div>

        <div className="space-y-8 px-8 pb-8">
          {/* Palette */}
          <Section title="Colour palette" note={dna.color.description}>
            <div className="flex flex-wrap gap-3">
              {dna.color.palette.map((swatch, i) => (
                <div key={`${swatch.hex}-${i}`} className="flex flex-col items-center gap-2">
                  <div
                    className="h-16 w-16 rounded-2xl border shadow-inner"
                    style={{
                      backgroundColor: swatch.hex,
                      borderColor: 'rgba(var(--card-text-rgb), 0.1)',
                    }}
                  />
                  <div className="text-center">
                    <div
                      className="font-mono text-[11px] uppercase"
                      style={{ color: 'var(--card-text)' }}
                    >
                      {swatch.hex}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--card-muted)' }}>
                      {swatch.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {dna.creative_brief?.colour_story && (
              <p
                style={{
                  fontSize: 14,
                  color: 'rgba(var(--card-text-rgb), 0.5)',
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                  marginTop: 12,
                  borderLeft: '2px solid rgba(196,147,58,0.3)',
                  paddingLeft: 16,
                }}
              >
                {dna.creative_brief.colour_story}
              </p>
            )}
          </Section>

          {/* Source material */}
          {imageUrls && imageUrls.length > 0 && (
            <Section title="Source material">
              <div className="flex gap-2">
                {imageUrls.slice(0, 4).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt=""
                    className="aspect-square w-full flex-1 rounded object-cover"
                    style={{ maxWidth: 120 }}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Trait pills */}
          <Section title="Identity traits">
            <div className="flex flex-wrap gap-2">
              {dna.identity.keywords.map((kw, i) => (
                <Pill key={`${kw}-${i}`}>{kw}</Pill>
              ))}
            </div>
          </Section>

          {/* Tone */}
          <Section title="Tone">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Exposure" value={dna.tone.exposure} />
              <Stat label="Shadows" value={dna.tone.shadows} />
              <Stat label="Grain" value={dna.tone.grain} />
            </div>
          </Section>

          {/* Composition */}
          <Section title="Composition" note={dna.composition.description}>
            <div className="flex flex-wrap gap-2">
              {dna.composition.tendencies.map((t, i) => (
                <Pill key={`${t}-${i}`} subtle>
                  {t}
                </Pill>
              ))}
            </div>
          </Section>

          {/* Mood */}
          <Section title="Mood" note={dna.mood.description}>
            <div className="flex flex-wrap gap-2">
              {dna.mood.descriptors.map((m, i) => (
                <Pill key={`${m}-${i}`} subtle>
                  {m}
                </Pill>
              ))}
            </div>
          </Section>

          {/* Consistency score */}
          <Section title="Consistency score">
            <div className="flex items-end gap-4">
              <span
                className="text-5xl font-semibold leading-none tracking-tight"
                style={{ color: 'var(--card-text)' }}
              >
                {dna.consistency_score}
                <span className="text-xl" style={{ color: 'var(--card-muted)' }}>
                  /100
                </span>
              </span>
            </div>
            <div
              className="mt-3 h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: 'rgba(var(--card-text-rgb), 0.05)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${dna.consistency_score}%`,
                  background: '#C4933A',
                }}
              />
            </div>
          </Section>

          {/* Creative brief — only present on v2+ profiles */}
          {dna.creative_brief && (
            <section>
              <hr style={{ border: 0, borderTop: '1px solid rgba(var(--card-text-rgb), 0.055)', margin: 0 }} />
              <h2
                className="mb-5 mt-8 text-xs font-medium uppercase tracking-[0.18em]"
                style={{ color: 'var(--card-muted)' }}
              >
                Creative brief
              </h2>

              {/* Shoot this */}
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: 'rgba(196,147,58,0.7)',
                }}
              >
                Shoot this
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {dna.creative_brief.shoot_next.map((item, i) => (
                  <div key={`shoot-${i}`} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: 'rgba(196,147,58,0.9)', flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 14, color: 'rgba(var(--card-text-rgb), 0.7)', lineHeight: 1.6 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Avoid */}
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: 'rgba(var(--card-text-rgb), 0.35)',
                  marginTop: 28,
                }}
              >
                Avoid
              </div>
              {dna.creative_brief.avoid && dna.creative_brief.avoid.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {dna.creative_brief.avoid.map((item, i) => (
                    <div key={`avoid-${i}`} style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: 'rgba(var(--card-text-rgb), 0.3)', flexShrink: 0 }}>×</span>
                      <span style={{ fontSize: 14, color: 'rgba(var(--card-text-rgb), 0.45)', lineHeight: 1.6 }}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Where this goes next */}
              {dna.creative_brief.evolution && (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      color: 'rgba(var(--card-text-rgb), 0.35)',
                      marginTop: 28,
                    }}
                  >
                    Where this goes next
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-playfair), serif',
                      fontStyle: 'italic',
                      fontSize: 15,
                      color: 'rgba(var(--card-text-rgb), 0.6)',
                      lineHeight: 1.75,
                      marginTop: 10,
                    }}
                  >
                    {dna.creative_brief.evolution}
                  </p>
                </>
              )}
            </section>
          )}

          {/* Technical direction (processing directives) */}
          <Section title="Technical direction">
            <blockquote
              className="rounded-2xl border-l-2 border-[var(--accent)] px-5 py-4 text-sm italic leading-relaxed"
              style={{
                background: 'rgba(var(--card-text-rgb), 0.03)',
                color: 'rgba(var(--card-text-rgb), 0.9)',
              }}
            >
              {dna.processing_directives.reference_note}
            </blockquote>
            <ul className="mt-4 space-y-2">
              {dna.processing_directives.recommended_adjustments.map((adj, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm"
                  style={{ color: 'var(--card-muted)' }}
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--violet)]" />
                  {adj}
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between border-t px-8 py-5"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--card-muted)' }}>
            <Sparkles className="h-3.5 w-3.5 text-[var(--violet)]" />
            Refined with Aesthete
          </div>
          {createdAt && (
            <span className="text-xs" style={{ color: 'var(--card-muted)' }}>
              {formatReportDate(createdAt)}
            </span>
          )}
        </div>
      </div>

      {shareSlug && <ShareBar slug={shareSlug} />}
    </div>
  )
}

function ShareBar({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}/share/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (e.g. insecure context) — no-op.
    }
  }

  return (
    <button
      onClick={copy}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-panel px-4 py-3 text-sm font-medium transition-colors hover:border-white/20"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-[var(--accent)]" />
          Link copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy share link
        </>
      )}
    </button>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2
        className="mb-3 text-xs font-medium uppercase tracking-[0.18em]"
        style={{ color: 'var(--card-muted)' }}
      >
        {title}
      </h2>
      {children}
      {note && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--card-muted)' }}>
          {note}
        </p>
      )}
    </section>
  )
}

function Pill({ children, subtle }: { children: React.ReactNode; subtle?: boolean }) {
  return (
    <span
      className="rounded-full px-3 py-1.5 text-sm"
      style={
        subtle
          ? { border: '1px solid var(--card-border)', color: 'rgba(var(--card-text-rgb), 0.8)' }
          : { background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--card-text)' }
      }
    >
      {children}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: 'var(--card-border)',
        background: 'rgba(var(--card-text-rgb), 0.02)',
      }}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--card-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-sm" style={{ color: 'var(--card-text)' }}>
        {value}
      </div>
    </div>
  )
}
