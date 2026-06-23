'use client'

import type { ReactNode } from 'react'

/**
 * Wraps the main dashboard and tunes the room to the user's aesthetic.
 *
 * A fixed background layer carries the DNA "ambient atmosphere": a base of
 * #16161e with a large radial wash falling from the top-centre in the
 * dominant colour, plus two smaller side washes from the rest of the palette.
 * Because the layer is fixed, the wash also reads behind the transparent,
 * sticky nav — coloured light filling the studio from the ceiling.
 */
export function DashboardShell({
  dominantHex,
  paletteHex,
  children,
}: {
  dominantHex: string
  paletteHex: string[]
  children: ReactNode
}) {
  const layers: string[] = [
    // Ceiling wash — dominant DNA colour at ~8% opacity.
    `radial-gradient(ellipse 80% 50% at 50% -5%, ${dominantHex}14, transparent 70%)`,
  ]

  // Two faint side washes once a full palette is available.
  if (paletteHex.length >= 3) {
    layers.push(
      `radial-gradient(ellipse 40% 30% at 15% 60%, ${paletteHex[1]}0a, transparent 60%)`,
      `radial-gradient(ellipse 35% 25% at 85% 70%, ${paletteHex[2]}08, transparent 55%)`
    )
  }

  const background = `${layers.join(', ')}, #16161e`

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
