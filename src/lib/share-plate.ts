/**
 * Derives the share page's reactive specimen plate from a profile's palette.
 *
 * The report card floats as a glass specimen on a colour field graded from the
 * creator's own dominant colour — that's what makes a shared report feel
 * bespoke rather than templated. The dominant/secondary lookup is delegated to
 * `extractDnaAmbient` (the studio's reactive-tint logic) so both surfaces read
 * the palette the same way.
 *
 * Grading is done in HSL: we keep each swatch's hue, clamp its saturation into
 * a band that stays rich without going lurid, and pin its lightness to a fixed
 * target. Pinning rather than scaling is what makes the plate predictable —
 * a near-black navy and a bright khaki both land on a deep, saturated field.
 *
 * Contrast safeguard: when the dominant colour is light the card flips to its
 * cream theme (see `isLightPalette`), so the plate is graded a further step
 * darker to keep a light card from washing out on it.
 */
import { extractDnaAmbient } from './dna-ambient'
import { isLightPalette } from './colour'

type PaletteSwatch = { hex: string; name?: string }

export type SharePlate = {
  /** Multi-stop CSS background for the graded field. */
  background: string
  /** Colour for the slow-drifting mesh over the plate. */
  drift: string
  /** True when no palette was available and the neutral cream plate is used. */
  neutral: boolean
  /**
   * The individual graded stops. The plate composes them into layered radial
   * gradients; the OG image re-composes them into a single linear gradient,
   * because Satori only handles simple gradients. Sharing the stops keeps the
   * link preview graded from the same colours as the page it opens.
   */
  stops: { hi: string; lo: string; baseTop: string; baseBottom: string }
}

/** Neutral stops behind the cream fallback plate. */
const NEUTRAL_STOPS = {
  hi: '#faf9f5',
  lo: '#f3f1ea',
  baseTop: '#faf9f5',
  baseBottom: '#f3f1ea',
} as const

/** Lightness/saturation targets for each plate layer, per card theme. */
const GRADE = {
  // Dark card: the plate can sit a little brighter — the near-black card
  // still reads as the darkest object on it.
  dark: { hi: 0.3, lo: 0.24, baseTop: 0.115, baseBottom: 0.065, drift: 0.4 },
  // Light (cream) card: deepen the whole field so the card pops off it.
  light: { hi: 0.22, lo: 0.17, baseTop: 0.085, baseBottom: 0.05, drift: 0.32 },
} as const

const SAT = { min: 0.32, max: 0.62 }
const BASE_SAT = { min: 0.16, max: 0.28 }

/** Expands `#abc` to `#aabbcc`; returns null for anything unparseable. */
function normaliseHex(hex: string | undefined | null): string | null {
  if (!hex) return null
  const raw = hex.trim().replace(/^#/, '')
  if (raw.length === 3 && /^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase()
  }
  if (raw.length === 6 && /^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`
  return null
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Standard sRGB hex → HSL, all components normalised to 0–1 except hue (deg). */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) return { h: 0, s: 0, l }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h: h * 360, s, l }
}

function hslCss(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

/** Keeps the hue, clamps saturation into `band`, pins lightness to `targetL`. */
function grade(
  hex: string,
  targetL: number,
  band: { min: number; max: number }
): string {
  const { h, s } = hexToHsl(hex)
  return hslCss(h, clamp(s, band.min, band.max), targetL)
}

/**
 * Builds the plate for one profile's palette.
 *
 * Palette handling matches the dashboard: the dominant is the first swatch and
 * the secondary is the next one, falling back to the dominant when a creator
 * only has a single colour. An empty/missing palette drops to the neutral cream
 * plate — the page still reads as Aesthete, just without a creator's grade.
 */
export function deriveSharePlate(
  palette: PaletteSwatch[] | undefined | null
): SharePlate {
  const swatches = (palette ?? [])
    .map((s) => normaliseHex(s?.hex))
    .filter((h): h is string => h !== null)

  if (swatches.length === 0) {
    return {
      background: 'linear-gradient(155deg, var(--cream), var(--cream-2))',
      drift: 'transparent',
      neutral: true,
      stops: { ...NEUTRAL_STOPS },
    }
  }

  // Dominant via the studio's reactive-tint lookup; secondary is the next
  // palette colour, or the dominant again for single-colour profiles.
  const { dominantHex } = extractDnaAmbient(swatches.map((hex) => ({ hex })))
  const dominant = normaliseHex(dominantHex) ?? swatches[0]
  const secondary = swatches[1] ?? dominant

  const g = isLightPalette(dominant) ? GRADE.light : GRADE.dark

  const hi = grade(dominant, g.hi, SAT)
  const lo = grade(secondary, g.lo, SAT)
  const baseTop = grade(dominant, g.baseTop, BASE_SAT)
  const baseBottom = grade(secondary, g.baseBottom, BASE_SAT)

  return {
    background: [
      `radial-gradient(125% 85% at 16% 6%, ${hi}, transparent 58%)`,
      `radial-gradient(115% 80% at 88% 94%, ${lo}, transparent 55%)`,
      `linear-gradient(155deg, ${baseTop}, ${baseBottom})`,
    ].join(', '),
    drift: grade(dominant, g.drift, { min: 0.4, max: 0.72 }),
    neutral: false,
    stops: { hi, lo, baseTop, baseBottom },
  }
}
