import type { CSSProperties } from 'react'
import type { AestheticDna } from '@/lib/aesthetic-dna'

const MIN_BANDS = 6
const MAX_BANDS = 12

/** Clamp a channel to 0–255. */
function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

/** Parse a #rgb or #rrggbb hex into [r, g, b]. */
function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const int = parseInt(h, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')
}

/** Shift a hex toward lighter (>0) or darker (<0) by `amount` (0–1). */
function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  if (amount >= 0) {
    return toHex([r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount])
  }
  const k = 1 + amount
  return toHex([r * k, g * k, b * k])
}

/**
 * Build 6–12 band colours from the stored DNA. The palette is the primary
 * source; we cycle through it and apply small lightness shifts on repeat
 * passes so a 3-swatch palette still yields a rich, varied strand.
 */
function buildBandColors(dna: AestheticDna): string[] {
  const base = (dna.color?.palette ?? []).map((s) => s.hex).filter(Boolean)
  if (base.length === 0) return []

  const target = Math.max(MIN_BANDS, Math.min(MAX_BANDS, base.length * 2))
  const bands: string[] = []
  for (let i = 0; i < target; i++) {
    const color = base[i % base.length]
    const pass = Math.floor(i / base.length)
    // First pass untouched; later passes alternate lighter / darker.
    const amount = pass === 0 ? 0 : (pass % 2 === 1 ? 0.16 : -0.14) * Math.ceil(pass / 2)
    bands.push(amount === 0 ? color : shade(color, amount))
  }
  return bands
}

/**
 * The DNA strand: a flat row of equal palette bands with a slow diagonal
 * shimmer sweep (staggered per band, gated by `prefers-reduced-motion` in
 * globals.css). Restyled from the old breathing bar chart to match the
 * studio prototype's specimen card.
 */
export function DnaStrand({ dna }: { dna: AestheticDna }) {
  const colors = buildBandColors(dna)

  if (colors.length === 0) {
    return <div className="strand" aria-hidden />
  }

  return (
    <div className="strand" aria-hidden>
      {colors.map((color, i) => (
        <span
          key={i}
          style={
            { background: color, '--sd': `${(i % 6) * 0.4}s` } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
