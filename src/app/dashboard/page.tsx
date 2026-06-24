import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UpgradeSuccessBanner } from '@/components/UpgradeSuccessBanner'
import { DashboardShell } from '@/components/DashboardShell'
import { ProfileGrid, type ProfileRow } from '@/components/ProfileGrid'
import { extractDnaAmbient } from '@/lib/dna-ambient'

type Subscription = {
  tier: string
  analyses_used: number
  analyses_limit: number
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>
}) {
  const supabase = await createClient()

  // RLS scopes both queries to the signed-in user.
  const [{ data: profiles }, { data: subscriptionRow }] = await Promise.all([
    supabase
      .from('aesthetic_profiles')
      .select('id, dna, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_subscriptions')
      .select('tier, analyses_used, analyses_limit')
      .maybeSingle(),
  ])

  const rows = (profiles ?? []) as ProfileRow[]

  // Tune the room to the user's most recent DNA. Falls back to Prussian blue
  // when no profile exists yet — the space is ready, but not yet personalised.
  const { dominantHex, paletteHex } = extractDnaAmbient(
    rows[0]?.dna?.color?.palette
  )

  // Fall back to free-tier defaults if no subscription row exists yet.
  const subscription: Subscription =
    (subscriptionRow as Subscription | null) ?? {
      tier: 'free',
      analyses_used: 0,
      analyses_limit: 1,
    }

  const showUpgradePrompt =
    subscription.tier === 'free' &&
    subscription.analyses_used >= 1

  const { upgraded } = await searchParams
  const available = Math.max(
    subscription.analyses_limit - subscription.analyses_used,
    0
  )

  return (
    <DashboardShell dominantHex={dominantHex} paletteHex={paletteHex}>
      <div style={{ minHeight: '100%', padding: 28 }}>
      {upgraded === 'true' && (
        <UpgradeSuccessBanner tier={subscription.tier} available={available} />
      )}

      {/* ─── Header row ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: 24,
              fontWeight: 500,
              color: '#f2f2f5',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Your profiles
          </h1>
          <p
            style={{
              fontSize: 11.5,
              color: 'rgba(255,255,255,0.55)',
              marginTop: 5,
            }}
          >
            Aesthetic DNA reports from your analysed feeds
          </p>

          {showUpgradePrompt ? (
            <Link
              href="/pricing"
              style={{
                display: 'inline-block',
                fontSize: 11,
                color: '#C4933A',
                marginTop: 8,
              }}
            >
              Upgrade to run more analyses →
            </Link>
          ) : (
            <p
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.55)',
                marginTop: 8,
              }}
            >
              {subscription.analyses_used} / {subscription.analyses_limit} analyses this month
            </p>
          )}
        </div>

        <Link
          href="/dashboard/upload"
          style={{
            background: '#1E3A5F',
            color: '#a0b8d4',
            border: 'none',
            padding: '9px 16px',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            whiteSpace: 'nowrap',
          }}
        >
          + Begin new work
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ProfileGrid profiles={rows} />
      )}

      {/* ─── Footer strip ───────────────────────────────────────── */}
      <div
        style={{
          marginTop: 20,
          borderTop: '1px solid rgba(196,147,58,0.09)',
          paddingTop: 8,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: 'rgba(196,147,58,0.28)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Studio · Aesthete
        </span>
      </div>
      </div>
    </DashboardShell>
  )
}

function BlankCanvasCard() {
  return (
    <Link href="/dashboard/upload" className="blank-canvas">
      <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.14)', lineHeight: 1 }}>+</span>
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.18)',
          marginTop: 8,
        }}
      >
        Begin new work
      </span>
    </Link>
  )
}

function EmptyState() {
  return (
    <div style={{ maxWidth: 240, margin: '0 auto', textAlign: 'center' }}>
      <BlankCanvasCard />
      <p
        style={{
          fontFamily: 'var(--font-playfair), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'rgba(255,255,255,0.35)',
          marginTop: 14,
        }}
      >
        Your first analysis awaits.
      </p>
    </div>
  )
}
