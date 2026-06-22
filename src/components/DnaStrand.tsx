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
 * Deterministic height (35%–100%) for a band, derived from its colour + index
 * so server and client render identically (no hydration mismatch, no Math.random).
 */
function bandHeight(color: string, index: number): number {
  const [r, g, b] = parseHex(color)
  const seed = (r * 7 + g * 13 + b * 17 + index * 53) % 100
  return 38 + (seed / 100) * 62 // 38% – 100%
}

/**
 * The animated "DNA strand": a row of flex bands that rise on entrance
 * (staggered) and then breathe forever. Pure CSS animation via globals.css.
 */
export function DnaStrand({ dna }: { dna: AestheticDna }) {
  const colors = buildBandColors(dna)

  if (colors.length === 0) {
    return <div style={{ height: 64 }} aria-hidden />
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64 }}
      aria-hidden
    >
      {colors.map((color, i) => {
        const riseDelay = i * 0.05
        const breatheDelay = riseDelay + 0.65
        const breatheDuration = 4 + i * 0.35
        return (
          <span
            key={i}
            className="dash-band"
            style={{
              flex: 1,
              height: `${bandHeight(color, i)}%`,
              background: color,
              borderRadius: '1px 1px 0 0',
              transformOrigin: 'bottom',
              animation: `dash-band-rise 0.55s cubic-bezier(0.16,1,0.3,1) both, dash-band-breathe ${breatheDuration}s ease-in-out infinite`,
              animationDelay: `${riseDelay}s, ${breatheDelay}s`,
            }}
          />
        )
      })}
    </div>
  )
}
