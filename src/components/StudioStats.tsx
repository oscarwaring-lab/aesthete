'use client'

import { CountUp, Reveal } from '@/components/studio-motion'

/**
 * The three studio stat tiles. The glass + frame is cool chrome, but each tile
 * carries a WARM radial glow blended from two of the signed-in user's dominant
 * DNA colours (spec §2/§3) — an intentional warm accent in the cool frame.
 * `Average consistency` is the only amber number: consistency is DNA data.
 * Numbers count up on scroll-in.
 */
export function StudioStats({
  specimenCount,
  avgConsistency,
  checkCount,
  glows,
}: {
  specimenCount: number
  avgConsistency: number
  checkCount: number
  /** Three [from, to] colour pairs, one per tile. */
  glows: [string, string][]
}) {
  const tiles = [
    { k: 'Specimens', to: specimenCount, amber: false, glow: glows[0] },
    { k: 'Average consistency', to: avgConsistency, amber: true, glow: glows[1] },
    { k: 'Continuity checks logged', to: checkCount, amber: false, glow: glows[2] },
  ]

  return (
    <div className="stats">
      {tiles.map((t) => (
        <Reveal key={t.k} className="stat">
          <span
            className="glow"
            style={{
              background: `radial-gradient(circle at 50% 42%, ${t.glow[0]}, ${t.glow[1]} 55%, transparent 78%)`,
            }}
          />
          <div className="k">{t.k}</div>
          <div className="v">
            {t.amber ? (
              <span className="amber">
                <CountUp to={t.to} />
              </span>
            ) : (
              <CountUp to={t.to} />
            )}
          </div>
        </Reveal>
      ))}
    </div>
  )
}
