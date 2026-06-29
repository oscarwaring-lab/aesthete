'use client'

import { useEffect, useState } from 'react'

/**
 * Brief confirmation shown after a successful Stripe checkout (?upgraded=true).
 * Auto-dismisses after 5 seconds, or on click.
 */
export function UpgradeSuccessBanner({
  tier,
  available,
}: {
  tier: string
  available: number
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Stripe payments temporarily disabled (UI only) — never surface the upgrade
  // confirmation while in early access. Remove this line to re-enable.
  return null

  if (!visible) return null

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)

  return (
    <div
      onClick={() => setVisible(false)}
      role="status"
      style={{
        cursor: 'pointer',
        background: 'rgba(196,147,58,0.10)',
        border: '1px solid rgba(196,147,58,0.30)',
        padding: '12px 18px',
        marginBottom: 24,
        fontSize: 13,
        color: '#f2f2f5',
        letterSpacing: '0.01em',
      }}
    >
      Welcome to Aesthete{' '}
      <span
        style={{
          fontFamily: 'var(--font-playfair), Georgia, serif',
          fontStyle: 'italic',
          color: '#C4933A',
        }}
      >
        {tierLabel}
      </span>
      . You have {available} analyses available this month.
    </div>
  )
}
