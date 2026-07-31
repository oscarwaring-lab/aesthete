'use client'

import { useRef, useState } from 'react'
import { Check, Copy, Download, Loader2, Sparkles } from 'lucide-react'
import { isLightPalette } from '@/lib/colour'
import { exportJpeg, exportPdf, exportPng } from '@/lib/export-image'
import type { AestheticDna, Evidence } from '@/lib/aesthetic-dna'

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

/** Plate numerals. Only ever three dimensions carry evidence. */
const NUMERALS = ['I', 'II', 'III'] as const

/**
 * The three dimensions the model is asked to ground in a frame, in the order
 * they appear in the spread. Colour leads because its codified data (the
 * palette) is the card's strongest visual, so the spread opens on colour.
 */
const DIMENSIONS = [
  { key: 'color', label: 'Colour' },
  { key: 'composition', label: 'Composition' },
  { key: 'mood', label: 'Mood' },
] as const

type DimensionKey = (typeof DIMENSIONS)[number]['key']

/** An evidence binding that resolved to a frame we can actually show. */
type ResolvedEvidence = {
  imageUrl: string
  /** 1-based, as cited — shown on the frame chip and the contact sheet. */
  frameNumber: number
  reasoning: string
}

type ResolvedEvidenceMap = Record<DimensionKey, ResolvedEvidence | null>

/**
 * Turn one dimension's binding into something renderable, or null.
 *
 * `image_index` is 1-based over the images in the order the model was shown
 * them, which is the order they were stored — so the cited frame is
 * `imageUrls[image_index - 1]`. Getting that off by one shows the creator a
 * photograph that has nothing to do with the sentence beside it, which is the
 * single worst failure this feature has; the -1 lives here and nowhere else.
 *
 * Returns null — meaning "this dimension degrades to a text section" — when:
 *  - there is no binding (v1/v2 profiles, or the model declined to attribute);
 *  - the route's `sanitiseEvidence` already dropped it;
 *  - the reasoning is blank;
 *  - the cited frame is not in `imageUrls`. That last one is real, not
 *    defensive: v2 rows kept only the first 4 of the images analysed, so a
 *    binding written against frame 9 has nothing to resolve to.
 */
function resolveEvidence(
  evidence: Evidence | undefined,
  imageUrls: string[] | null | undefined
): ResolvedEvidence | null {
  if (!evidence?.reasoning) return null
  const reasoning = evidence.reasoning.trim()
  if (!reasoning) return null

  const imageUrl = imageUrls?.[evidence.image_index - 1]
  if (!imageUrl) return null

  return { imageUrl, frameNumber: evidence.image_index, reasoning }
}

/**
 * The centrepiece. Renders an Aesthetic DNA profile as a premium card that
 * embodies the creator's aesthetic: a bright dominant palette colour earns a
 * cream card, a dark one keeps the dark studio card. The light/dark switch is
 * purely visual — it flips the `--card-*` tokens via `data-theme` and changes
 * no data. The amber accent, DNA bands and score bar are identical in both.
 *
 * Two bodies hang off one shell:
 *  - the evidence spread, where each claim travels with the frame that
 *    justifies it (v3+ profiles, and only where a binding actually resolved);
 *  - the original dense stack, for profiles with no usable evidence at all.
 *
 * The branch is on resolved evidence, never on `prompt_version`: a v3 report
 * whose bindings were all sanitised away has exactly as little to show as a v2
 * one, and must fall back just as cleanly.
 *
 * Used by both the authenticated report page and the public share page.
 * `shareSlug` enables the copy-link button. `createdAt` is optional metadata.
 */
export function DnaReport({
  dna,
  shareSlug,
  createdAt,
  imageUrls,
  creatorHandle,
}: {
  dna: AestheticDna
  shareSlug?: string | null
  createdAt?: string
  imageUrls?: string[] | null
  creatorHandle?: string | null
}) {
  const lightMode = isLightPalette(dna.color.palette[0]?.hex ?? '#111110')
  const cardRef = useRef<HTMLDivElement>(null)
  const fileBase = `aesthete-${(creatorHandle || dna.identity.archetype || 'report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-dna`

  const evidence: ResolvedEvidenceMap = {
    color: resolveEvidence(dna.color.evidence, imageUrls),
    composition: resolveEvidence(dna.composition.evidence, imageUrls),
    mood: resolveEvidence(dna.mood.evidence, imageUrls),
  }
  const hasEvidence = DIMENSIONS.some((d) => evidence[d.key] !== null)

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        ref={cardRef}
        data-theme={lightMode ? 'light' : 'dark'}
        className="dna overflow-hidden rounded-3xl border"
        style={{
          background: 'var(--card-bg)',
          color: 'var(--card-text)',
          borderColor: 'var(--card-cborder)',
        }}
      >
        {hasEvidence ? (
          <EvidenceBody
            dna={dna}
            evidence={evidence}
            imageUrls={imageUrls}
            creatorHandle={creatorHandle}
          />
        ) : (
          <LegacyBody dna={dna} imageUrls={imageUrls} creatorHandle={creatorHandle} />
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between border-t px-5 py-4 sm:px-8 sm:py-5"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--card-muted)' }}>
            <Sparkles className="h-3.5 w-3.5 text-[#C4933A]" />
            Refined with Aesthete
          </div>
          {createdAt && (
            <span className="text-xs" style={{ color: 'var(--card-muted)' }}>
              {formatReportDate(createdAt)}
            </span>
          )}
        </div>
      </div>

      <DownloadBar targetRef={cardRef} fileBase={fileBase} />
      {shareSlug && <ShareBar slug={shareSlug} />}
    </div>
  )
}

/**
 * The editorial opening, shared by both bodies.
 *
 * `hero` is the ONLY difference between them, and it applies to exactly one
 * element: the creative-director signature. In the evidence spread that line
 * is the billboard — the one sharp curated sentence, and the largest statement
 * on the card. Legacy reports keep the 18px version they ship with today,
 * because §4 requires a v2 report to render identically to what a creator has
 * already been sent. Anything else added here lands on both.
 */
function ReportHeader({
  dna,
  creatorHandle,
  hero,
}: {
  dna: AestheticDna
  creatorHandle?: string | null
  hero: boolean
}) {
  return (
    <div
      className={`relative px-5 pt-9 pb-7 sm:px-8 sm:pt-10 sm:pb-8${
        hero ? ' dna-header' : ''
      }`}
      style={{ background: 'var(--card-bg-inner)' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at top, #C4933A, transparent 70%)',
        }}
      />
      <div className="relative">
        <span
          className="text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: 'var(--card-muted)' }}
        >
          Aesthetic DNA
        </span>
        {creatorHandle && (
          <div
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 11,
              fontWeight: 300,
              letterSpacing: '0.08em',
              color: 'rgba(196,147,58,0.7)',
              marginBottom: 8,
            }}
          >
            Curated by Aesthete for @{creatorHandle}
          </div>
        )}
        <h1
          className="mt-2 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
          style={{ color: 'var(--card-text)' }}
        >
          {dna.identity.archetype}
        </h1>
        {dna.creative_brief?.signature &&
          (hero ? (
            <p className="dna-signature">{dna.creative_brief.signature}</p>
          ) : (
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
          ))}
        <p
          className="mt-3 max-w-prose text-sm leading-relaxed"
          style={{ color: 'var(--card-muted)' }}
        >
          {dna.identity.summary}
        </p>
      </div>
    </div>
  )
}

/**
 * The evidence spread: three plates, then the codified reference, then the
 * feed the whole thing was read off.
 *
 * Both the plate numeral and the image-left/image-right alternation count only
 * the plates that actually render. A dropped binding therefore leaves no gap
 * in the numbering and never strands two consecutive images on the same side —
 * the spread just gets shorter.
 */
function EvidenceBody({
  dna,
  evidence,
  imageUrls,
  creatorHandle,
}: {
  dna: AestheticDna
  evidence: ResolvedEvidenceMap
  imageUrls?: string[] | null
  creatorHandle?: string | null
}) {
  let plateCount = 0
  const sections = DIMENSIONS.map((dimension) => {
    const resolved = evidence[dimension.key]
    return { ...dimension, resolved, plateNo: resolved ? ++plateCount : 0 }
  })

  const citedFrames = DIMENSIONS.map((d) => evidence[d.key]?.frameNumber).filter(
    (n): n is number => typeof n === 'number'
  )

  return (
    <>
      <ReportHeader dna={dna} creatorHandle={creatorHandle} hero />

      <div className="dna-body">
        <div className="dna-spread">
          {sections.map(({ key, label, resolved, plateNo }) =>
            resolved ? (
              <article
                key={key}
                className="dna-plate"
                data-side={plateNo % 2 === 0 ? 'right' : 'left'}
              >
                {/* Tag, frame, note in that DOM order: it is the reading
                    order on a phone and the announcement order for a screen
                    reader, and grid-template-areas moves the tag beside the
                    frame on wider screens without reordering the source. */}
                <PlateTag numeral={NUMERALS[plateNo - 1]} label={label} />

                <figure className="dna-plate-figure">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="dna-plate-img"
                    src={resolved.imageUrl}
                    alt={`The frame cited for ${label.toLowerCase()}`}
                  />
                  <figcaption className="dna-frame-chip">
                    Frame {padFrame(resolved.frameNumber)}
                  </figcaption>
                </figure>

                <div className="dna-plate-body">
                  <p className="dna-reasoning">{resolved.reasoning}</p>
                  <div className="dna-plate-data">
                    <DimensionData dimension={key} dna={dna} />
                  </div>
                  <p className="dna-plate-note">{dna[key].description}</p>
                </div>
              </article>
            ) : (
              /* §4: no frame to stand on, so this dimension degrades to a
                 compact text section rather than an empty plate. */
              <section key={key} className="dna-compact">
                <PlateTag label={label} />
                <p className="dna-plate-note dna-plate-note--lead">
                  {dna[key].description}
                </p>
                <div className="dna-plate-data">
                  <DimensionData dimension={key} dna={dna} />
                </div>
              </section>
            )
          )}
        </div>

        <hr className="dna-rule" />

        {/* Codified reference — the dense content, kept whole but repositioned
            after the story it belongs to. */}
        <div className="dna-reference">
          <Section title="Tone">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Exposure" value={dna.tone.exposure} />
              <Stat label="Shadows" value={dna.tone.shadows} />
              <Stat label="Grain" value={dna.tone.grain} />
            </div>
          </Section>

          <Section title="Identity traits">
            <div className="flex flex-wrap gap-2">
              {dna.identity.keywords.map((kw, i) => (
                <Pill key={`${kw}-${i}`}>{kw}</Pill>
              ))}
            </div>
          </Section>

          {dna.creative_brief && (
            <section>
              <h2
                className="mb-5 text-xs font-medium uppercase tracking-[0.18em]"
                style={{ color: 'var(--card-muted)' }}
              >
                Creative brief
              </h2>
              {dna.creative_brief.colour_story && (
                <p
                  style={{
                    fontSize: 14,
                    color: 'rgba(var(--card-text-rgb), 0.55)',
                    lineHeight: 1.7,
                    fontStyle: 'italic',
                    marginBottom: 26,
                    borderLeft: '2px solid rgba(196,147,58,0.3)',
                    paddingLeft: 16,
                  }}
                >
                  {dna.creative_brief.colour_story}
                </p>
              )}
              <BriefDirections brief={dna.creative_brief} />
            </section>
          )}

          <Section title="Technical direction">
            <blockquote
              className="rounded-2xl border-l-2 border-[#C4933A] px-5 py-4 text-sm italic leading-relaxed"
              style={{
                background: 'rgba(var(--card-text-rgb), 0.03)',
                color: 'rgba(var(--card-text-rgb), 0.9)',
              }}
            >
              {dna.processing_directives.reference_note}
            </blockquote>
            <ul className="mt-4 space-y-2">
              {dna.processing_directives.recommended_adjustments.map((adj, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--card-muted)' }}>
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#C4933A]" />
                  {adj}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Consistency score">
            <ConsistencyScore score={dna.consistency_score} />
          </Section>
        </div>

        <ContactSheet imageUrls={imageUrls} cited={citedFrames} />
      </div>
    </>
  )
}

/** Two-digit frame numbers, so the chips and the contact sheet line up. */
function padFrame(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * The lab tag that opens every plate: numeral · rule · dimension. Same three
 * pieces as the landing's section rails (`.landing .plate-tag`), so the card
 * speaks the site's plate language rather than inventing its own. Degraded
 * dimensions get no numeral — they are not plates.
 */
function PlateTag({ numeral, label }: { numeral?: string; label: string }) {
  return (
    <div className="dna-tag">
      {numeral && <span className="dna-tag-no">Plate {numeral}</span>}
      <span className="dna-tag-rule" aria-hidden />
      <span className="dna-tag-meta">{label}</span>
    </div>
  )
}

/** The codified data that supports each dimension's claim. */
function DimensionData({ dimension, dna }: { dimension: DimensionKey; dna: AestheticDna }) {
  if (dimension === 'color') {
    return (
      <>
        <div className="dna-rail" aria-hidden>
          {dna.color.palette.map((swatch, i) => (
            <span key={`band-${swatch.hex}-${i}`} style={{ background: swatch.hex }} />
          ))}
        </div>
        <div className="dna-swatches">
          {dna.color.palette.map((swatch, i) => (
            <div key={`${swatch.hex}-${i}`} className="dna-swatch">
              <i style={{ background: swatch.hex }} />
              <b>{swatch.hex}</b>
              <em>{swatch.name}</em>
            </div>
          ))}
        </div>
      </>
    )
  }

  const items =
    dimension === 'composition' ? dna.composition.tendencies : dna.mood.descriptors

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <Pill key={`${item}-${i}`} subtle>
          {item}
        </Pill>
      ))}
    </div>
  )
}

/**
 * The feed the report was read off. Every stored frame appears, numbered to
 * match the plate chips, with the cited ones ringed in amber — so a creator
 * can trace a claim back to the photograph it came from. Deliberately modest:
 * the three frames that matter are already large in the spread.
 */
function ContactSheet({
  imageUrls,
  cited,
}: {
  imageUrls?: string[] | null
  cited: number[]
}) {
  if (!imageUrls || imageUrls.length === 0) return null

  return (
    <section>
      <h2
        className="mb-4 text-xs font-medium uppercase tracking-[0.18em]"
        style={{ color: 'var(--card-muted)' }}
      >
        The frames analysed
      </h2>
      <div className="dna-contact-grid">
        {imageUrls.map((url, i) => (
          <figure
            key={`${url}-${i}`}
            className="dna-contact-cell"
            data-cited={cited.includes(i + 1) ? 'true' : undefined}
          >
            <div className="dna-contact-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
            </div>
            <figcaption className="dna-contact-no">{padFrame(i + 1)}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function ConsistencyScore({ score }: { score: number }) {
  return (
    <>
      <div className="flex items-end gap-4">
        <span
          className="text-5xl font-semibold leading-none tracking-tight"
          style={{ color: 'var(--card-text)' }}
        >
          {score}
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
          style={{ width: `${score}%`, background: '#C4933A' }}
        />
      </div>
    </>
  )
}

/**
 * Shoot this / Avoid / Where this goes next. Shared verbatim by both bodies —
 * the legacy layout wraps it in its own rule and heading, the spread puts the
 * colour story above it. The markup itself must not drift, or v2 reports do.
 */
function BriefDirections({
  brief,
}: {
  brief: NonNullable<AestheticDna['creative_brief']>
}) {
  return (
    <>
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
        {brief.shoot_next.map((item, i) => (
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
      {brief.avoid && brief.avoid.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {brief.avoid.map((item, i) => (
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
      {brief.evolution && (
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
            {brief.evolution}
          </p>
        </>
      )}
    </>
  )
}

/**
 * The pre-evidence layout, kept whole for profiles that have no binding this
 * card can stand a photograph on — every v1 and v2 report already in storage,
 * and any v3 report whose bindings were all sanitised away.
 *
 * Five of these have been sent to real creators, so this is a compatibility
 * surface, not dead code: it must keep rendering exactly what they were sent.
 * The only class it shares with the spread is `.dna` on the shell, and every
 * rule in that block is `.dna .dna-*` — none of which appears below.
 */
function LegacyBody({
  dna,
  imageUrls,
  creatorHandle,
}: {
  dna: AestheticDna
  imageUrls?: string[] | null
  creatorHandle?: string | null
}) {
  return (
    <>
      <ReportHeader dna={dna} creatorHandle={creatorHandle} hero={false} />

      <div className="space-y-8 px-5 pb-7 sm:px-8 sm:pb-8">
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

        {/* Source material.
            The grid is the §6 fix and the one intentional departure from what
            these reports render today: the old `flex` row gave each thumbnail
            `w-full`, so at a 360px viewport four of them each tried to occupy
            the full card width and blew out of it. `auto-fit` tracks capped at
            120px lay out identically wherever four fit on a line — which is
            every viewport the shipped v2 reports were ever read at — and wrap
            instead of overflowing once they don't. */}
        {imageUrls && imageUrls.length > 0 && (
          <Section title="Source material">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(0, 120px))' }}
            >
              {imageUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt=""
                  className="aspect-square w-full rounded object-cover"
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
          <ConsistencyScore score={dna.consistency_score} />
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
            <BriefDirections brief={dna.creative_brief} />
          </section>
        )}

        {/* Technical direction (processing directives) */}
        <Section title="Technical direction">
          <blockquote
            className="rounded-2xl border-l-2 border-[#C4933A] px-5 py-4 text-sm italic leading-relaxed"
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
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#C4933A]" />
                {adj}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}

function DownloadBar({
  targetRef,
  fileBase,
}: {
  targetRef: React.RefObject<HTMLDivElement | null>
  fileBase: string
}) {
  const [busy, setBusy] = useState<null | 'png' | 'jpg' | 'pdf'>(null)
  const [error, setError] = useState(false)

  async function run(kind: 'png' | 'jpg' | 'pdf') {
    const node = targetRef.current
    if (!node || busy) return
    setBusy(kind)
    setError(false)
    try {
      if (kind === 'png') await exportPng(node, `${fileBase}.png`)
      else if (kind === 'jpg') await exportJpeg(node, `${fileBase}.jpg`)
      else await exportPdf(node, `${fileBase}.pdf`)
    } catch {
      setError(true)
    } finally {
      setBusy(null)
    }
  }

  const cls =
    'flex items-center justify-center gap-2 rounded-xl border border-border bg-panel px-3 py-3 text-sm font-medium transition-colors hover:border-white/20 disabled:opacity-50'

  const labels: Array<['png' | 'jpg' | 'pdf', string]> = [
    ['png', 'PNG'],
    ['jpg', 'JPG'],
    ['pdf', 'PDF'],
  ]

  return (
    <div className="mt-4">
      <div className="grid grid-cols-3 gap-2">
        {labels.map(([kind, label]) => (
          <button key={kind} onClick={() => run(kind)} disabled={busy !== null} className={cls}>
            {busy === kind ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-center text-xs text-red-400">
          Export failed — please try again, or use PNG.
        </p>
      )}
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
          <Check className="h-4 w-4 text-[#C4933A]" />
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
          : { background: 'color-mix(in srgb, #C4933A 15%, transparent)', color: 'var(--card-text)' }
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
