/**
 * The link preview image for a shared report.
 *
 * Graded from the creator's own palette using the same stops as the page's
 * specimen plate, so the unfurl and the page it opens read as one object.
 *
 * Satori (which backs ImageResponse) supports flexbox and a subset of CSS
 * only — no grid, and every element with children needs an explicit display.
 * It also has no access to the app's CSS, so the tokens below are the literal
 * values of --amber / --cream from globals.css.
 */
import { ImageResponse } from 'next/og'
import { deriveSharePlate } from '@/lib/share-plate'
import { getSharedProfile } from '@/lib/share-profile'

export const alt = 'An Aesthetic DNA report by Aesthete'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const AMBER = '#c4933a'
const CREAM = '#faf9f5'

/** Trims to a word boundary so the card never clips mid-word. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const profile = await getSharedProfile(slug)

  // Withdrawn or missing: a plain branded card, no creator data.
  if (!profile || profile.deleted_at) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1d1811, #0b0a08)',
            color: CREAM,
            fontSize: 64,
            letterSpacing: '0.02em',
          }}
        >
          Aesthete
        </div>
      ),
      { ...size }
    )
  }

  const dna = profile.dna
  const palette = dna.color?.palette ?? []
  const plate = deriveSharePlate(palette)
  const signature = dna.creative_brief?.signature ?? dna.identity.summary

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: `linear-gradient(135deg, ${plate.stops.hi}, ${plate.stops.baseBottom})`,
          color: CREAM,
          fontSize: 28,
        }}
      >
        {/* Lab strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 20,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(250,249,245,0.55)',
          }}
        >
          <div style={{ display: 'flex' }}>Aesthete · Specimen</div>
          <div style={{ display: 'flex', color: AMBER }}>
            № {profile.share_slug.slice(0, 6).toUpperCase()}
          </div>
        </div>

        {/* Archetype + signature */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 82,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              maxWidth: 1000,
            }}
          >
            {truncate(dna.identity.archetype, 44)}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 26,
              fontSize: 29,
              lineHeight: 1.5,
              maxWidth: 830,
              color: 'rgba(250,249,245,0.68)',
            }}
          >
            {truncate(signature, 150)}
          </div>
        </div>

        {/* Palette strip + score */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            {palette.slice(0, 6).map((swatch, i) => (
              <div
                key={`${swatch.hex}-${i}`}
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 10,
                  background: swatch.hex,
                  border: '1px solid rgba(250,249,245,0.22)',
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ display: 'flex', fontSize: 76, lineHeight: 1, color: AMBER }}>
              {dna.consistency_score}
              <span style={{ fontSize: 30, color: 'rgba(250,249,245,0.45)' }}>/100</span>
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 10,
                fontSize: 17,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(250,249,245,0.45)',
              }}
            >
              Consistency
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
