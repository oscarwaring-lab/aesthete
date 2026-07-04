import type { ReactNode } from 'react'

/**
 * Ambient wrapper for the studio. Renders three drifting radial meshes behind
 * the content:
 *   • A1 / A2 are tinted reactively to the signed-in user's own DNA palette
 *     (passed in from the page after profiles load), and
 *   • A3 stays Prussian blue — a fixed cool anchor so the studio never loses
 *     its cool identity however warm the user's palette runs (spec §3).
 *
 * The film-grain overlay lives on `.studio::after` (globals.css) so it covers
 * every dashboard page; here we only paint the reactive atmosphere. Meshes are
 * `position: fixed`, so they also read behind the translucent nav.
 */
export function DashboardShell({
  ambientA1,
  ambientA2,
  children,
}: {
  ambientA1: string
  ambientA2: string
  children: ReactNode
}) {
  return (
    <>
      <div className="ambient" aria-hidden>
        <div
          className="mesh a1"
          style={{ background: `radial-gradient(circle, ${ambientA1}, transparent 66%)` }}
        />
        <div
          className="mesh a2"
          style={{ background: `radial-gradient(circle, ${ambientA2}, transparent 64%)` }}
        />
        <div className="mesh a3" />
      </div>
      <div className="studio-content">{children}</div>
    </>
  )
}
