/**
 * Colour helpers for the adaptive DNA report card.
 *
 * The report embodies the creator's aesthetic: a bright dominant palette
 * earns a cream card, a dark one keeps the dark studio card. We decide
 * with relative luminance (WCAG sRGB coefficients) rather than a naive
 * average so that, e.g., a saturated yellow reads as "light" and a deep
 * navy reads as "dark".
 */

export function getRelativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return (
    0.2126 * toLinear(r) +
    0.7152 * toLinear(g) +
    0.0722 * toLinear(b)
  )
}

export function isLightPalette(dominantHex: string): boolean {
  return getRelativeLuminance(dominantHex) > 0.18
}
