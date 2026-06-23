/**
 * Derives the dashboard's ambient colour signals from a profile's DNA palette.
 *
 * The dominant colour tints the nav accent and the ceiling wash; up to three
 * palette colours feed the side washes. When a user has no profile yet we fall
 * back to Prussian blue — the space is ready, but not yet personalised.
 *
 * Note: the palette schema (see `aesthetic-dna.ts`) carries `hex` + `name` only.
 * We still check for a `role: 'dominant'` swatch first so the lookup keeps
 * working if roles are ever added, then fall back to the first swatch, which is
 * the dominant colour today.
 */
export const PRUSSIAN_FALLBACK = '#1E3A5F'

type PaletteSwatch = { hex: string; name?: string; role?: string }

export type DnaAmbient = {
  dominantHex: string
  paletteHex: string[]
}

export function extractDnaAmbient(
  palette: PaletteSwatch[] | undefined | null
): DnaAmbient {
  const swatches = palette ?? []

  const dominantHex =
    swatches.find((s) => s.role === 'dominant')?.hex ??
    swatches[0]?.hex ??
    PRUSSIAN_FALLBACK

  const paletteHex = swatches.slice(0, 3).map((s) => s.hex)

  return {
    dominantHex,
    paletteHex: paletteHex.length > 0 ? paletteHex : [PRUSSIAN_FALLBACK],
  }
}
