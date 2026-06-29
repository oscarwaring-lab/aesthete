import Link from 'next/link'

/* ─── Stripe payments temporarily disabled — UI only ─────────────────────────
   Early-access holding state. The full pricing + Stripe checkout UI is preserved
   verbatim at the bottom of this file (commented out). To re-enable when Stripe
   goes live: delete the holding-state PricingPage below and uncomment the
   original implementation. Backend Stripe routes/webhooks are untouched. */

const serif = 'var(--font-playfair), Georgia, serif'

export default function PricingPage() {
  return (
    <div
      style={{
        background: '#faf9f5',
        minHeight: '100vh',
        color: '#111110',
        fontFamily: 'var(--font-inter), -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: 540, padding: '80px 40px', textAlign: 'center' }}>
        <p
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: '#2C4E7A',
            marginBottom: 20,
          }}
        >
          Early access
        </p>
        <h1
          style={{
            fontFamily: serif,
            fontSize: 44,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Paid plans coming soon.
        </h1>
        <p
          style={{
            fontSize: 15,
            color: '#6b6960',
            marginTop: 16,
            lineHeight: 1.5,
          }}
        >
          Aesthete is currently in early access. Sign up for free to get started.
        </p>
        <Link
          href="/signup"
          style={{
            display: 'inline-block',
            marginTop: 32,
            background: '#111110',
            color: '#faf9f5',
            padding: '12px 24px',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            textDecoration: 'none',
            fontFamily: 'inherit',
          }}
        >
          Create free account →
        </Link>
      </div>
    </div>
  )
}

/* ─── ORIGINAL PRICING IMPLEMENTATION (re-enable when Stripe goes live) ───────
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const STARTER_PRICE_ID = 'price_1Tl0ZsCpKNXCQHYMHJLp6d5f'
const CREATOR_PRICE_ID = 'price_1Tl0aRCpKNXCQHYMzaO80RYp'

const serif = 'var(--font-playfair), Georgia, serif'

export default function PricingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout(priceId: string) {
    setError(null)
    setLoadingPrice(priceId)

    // Subscribing requires an account — bounce guests to sign-up first.
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/signup?redirect=/pricing')
      return
    }

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start checkout.')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoadingPrice(null)
    }
  }

  return (
    <div
      style={{
        background: '#faf9f5',
        minHeight: '100vh',
        color: '#111110',
        fontFamily: 'var(--font-inter), -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '80px 40px' }}>
        // ─── Header ─────────────────────────────────────────────
        <header style={{ textAlign: 'center', marginBottom: 56 }}>
          <p
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: '#2C4E7A',
              marginBottom: 20,
            }}
          >
            Pricing
          </p>
          <h1
            style={{
              fontFamily: serif,
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            One price. Your visual identity.
          </h1>
          <p
            style={{
              fontSize: 15,
              color: '#6b6960',
              marginTop: 16,
            }}
          >
            Start free. Upgrade when you&apos;re ready.
          </p>
        </header>

        {error && (
          <p
            style={{
              textAlign: 'center',
              color: '#b23b3b',
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            {error}
          </p>
        )}

        // ─── Tier cards ─────────────────────────────────────────
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            alignItems: 'stretch',
          }}
        >
          // FREE
          <TierCard
            label="Free"
            price="$0"
            description="Try Aesthete once"
            features={[
              '1 Aesthetic DNA analysis',
              'Full DNA report',
              'Shareable report page',
            ]}
          >
            <Link
              href="/signup"
              style={{
                ...ctaBase,
                background: '#111110',
                color: '#faf9f5',
              }}
            >
              Get started →
            </Link>
          </TierCard>

          // STARTER — highlighted
          <TierCard
            label="Starter"
            price="$19 / month"
            description="For regular creators"
            highlighted
            features={[
              '15 analyses per month',
              'Full DNA report + source images',
              'Shareable report page',
              'Continuity score',
            ]}
          >
            <button
              type="button"
              onClick={() => startCheckout(STARTER_PRICE_ID)}
              disabled={loadingPrice !== null}
              style={{
                ...ctaBase,
                background: '#1E3A5F',
                color: '#dde5f0',
                cursor: loadingPrice ? 'default' : 'pointer',
                opacity: loadingPrice && loadingPrice !== STARTER_PRICE_ID ? 0.5 : 1,
              }}
            >
              {loadingPrice === STARTER_PRICE_ID ? 'Redirecting…' : 'Start Starter →'}
            </button>
          </TierCard>

          // CREATOR
          <TierCard
            label="Creator"
            price="$49 / month"
            description="For serious personal brands"
            features={[
              '40 analyses per month',
              'Everything in Starter',
              'Priority processing',
              'Style evolution reports',
            ]}
          >
            <button
              type="button"
              onClick={() => startCheckout(CREATOR_PRICE_ID)}
              disabled={loadingPrice !== null}
              style={{
                ...ctaBase,
                background: '#111110',
                color: '#faf9f5',
                cursor: loadingPrice ? 'default' : 'pointer',
                opacity: loadingPrice && loadingPrice !== CREATOR_PRICE_ID ? 0.5 : 1,
              }}
            >
              {loadingPrice === CREATOR_PRICE_ID ? 'Redirecting…' : 'Start Creator →'}
            </button>
          </TierCard>
        </div>
      </div>
    </div>
  )
}

const ctaBase: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'center',
  border: 'none',
  padding: '12px 16px',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.09em',
  textDecoration: 'none',
  fontFamily: 'inherit',
}

function TierCard({
  label,
  price,
  description,
  features,
  highlighted = false,
  children,
}: {
  label: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${highlighted ? '#2C4E7A' : '#dddad0'}`,
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <p
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: highlighted ? '#2C4E7A' : '#9c9a94',
          marginBottom: 16,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: serif,
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          margin: 0,
        }}
      >
        {price}
      </p>
      <p style={{ fontSize: 13, color: '#6b6960', margin: '8px 0 24px' }}>
        {description}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
        {features.map((feature) => (
          <li
            key={feature}
            style={{
              fontSize: 13,
              color: '#2a2925',
              padding: '8px 0',
              borderTop: '1px solid #ece8de',
              display: 'flex',
              gap: 10,
            }}
          >
            <span style={{ color: '#C4933A' }}>—</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {children}
    </div>
  )
}
─────────────────────────────────────────────────────────────────────────── */
