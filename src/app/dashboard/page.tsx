import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UpgradeSuccessBanner } from '@/components/UpgradeSuccessBanner'
import { DashboardShell } from '@/components/DashboardShell'
import { StudioStats } from '@/components/StudioStats'
import { ProfileGrid, type ProfileRow } from '@/components/ProfileGrid'

type Subscription = {
  tier: string
  analyses_used: number
  analyses_limit: number
}

// Static warm fallbacks when the user has no profiles yet (spec §3): the three
// stat glows fall back to the DNA warm accents, the ambient meshes to the
// prototype's neutral studio blues.
const FALLBACK_GLOWS: [string, string][] = [
  ['var(--dna-amber)', 'var(--dna-amber)'],
  ['var(--dna-sage)', 'var(--dna-sage)'],
  ['var(--dna-rose)', 'var(--dna-rose)'],
]
const FALLBACK_A1 = '#3E6B8F'
const FALLBACK_A2 = '#5C87A0'

/** Blend pairs of the user's dominant identity colours across the 3 tiles. */
function computeGlows(doms: string[]): [string, string][] {
  if (doms.length === 0) return FALLBACK_GLOWS
  const pick = (i: number) => doms[((i % doms.length) + doms.length) % doms.length]
  return [
    [pick(0), pick(1)],
    [pick(2), pick(3)],
    [pick(4), pick(0)],
  ]
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>
}) {
  const supabase = await createClient()

  // RLS scopes every query to the signed-in user.
  const [{ data: profiles }, { data: subscriptionRow }, { count: checkCountRaw }] =
    await Promise.all([
      supabase
        .from('aesthetic_profiles')
        .select(
          'id, dna, created_at, analysis_type, pillar_name, parent_profile_id, creator_handle'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_subscriptions')
        .select('tier, analyses_used, analyses_limit')
        .maybeSingle(),
      // Total continuity checks logged by this user (spec §6).
      supabase.from('continuity_checks').select('*', { count: 'exact', head: true }),
    ])

  const rows = (profiles ?? []) as ProfileRow[]
  const checkCount = checkCountRaw ?? 0

  // Continuity score history for every profile, in one query. Grouped by
  // profile_id and ordered oldest-first so each sparkline reads left-to-right.
  const checksHistory: Record<string, { score: number; date: string }[]> = {}
  if (rows.length > 0) {
    const { data: checks } = await supabase
      .from('continuity_checks')
      .select('profile_id, overall_score, created_at')
      .in(
        'profile_id',
        rows.map((p) => p.id)
      )
      .order('created_at', { ascending: true })

    for (const check of (checks ?? []) as {
      profile_id: string
      overall_score: number
      created_at: string
    }[]) {
      ;(checksHistory[check.profile_id] ??= []).push({
        score: check.overall_score,
        date: check.created_at,
      })
    }
  }

  // ─── Stats + reactive palette (spec §3) ──────────────────────────
  // Standard profiles are the "specimens on the wall"; pillars hang off them.
  const standardRows = rows.filter((p) => p.analysis_type !== 'pillar')
  const specimenCount = standardRows.length

  const scoreList = standardRows
    .map((p) => p.dna?.consistency_score)
    .filter((n): n is number => typeof n === 'number')
  const avgConsistency = scoreList.length
    ? Math.round(scoreList.reduce((a, b) => a + b, 0) / scoreList.length)
    : 0

  // dominant = palette[0] of each profile; pool = every unique palette colour.
  const doms = standardRows
    .map((p) => p.dna?.color?.palette?.[0]?.hex)
    .filter((h): h is string => Boolean(h))
  const pool = [
    ...new Set(
      standardRows
        .flatMap((p) => (p.dna?.color?.palette ?? []).map((s) => s.hex))
        .filter(Boolean)
    ),
  ]

  const glows = computeGlows(doms)
  const ambientA1 = pool[0] ?? FALLBACK_A1
  const ambientA2 = pool[Math.floor(pool.length / 2)] ?? pool[0] ?? FALLBACK_A2

  const latestArchetype = standardRows[0]?.dna?.identity?.archetype

  // Fall back to free-tier defaults if no subscription row exists yet.
  const subscription: Subscription =
    (subscriptionRow as Subscription | null) ?? {
      tier: 'free',
      analyses_used: 0,
      analyses_limit: 1,
    }

  // Stripe payments temporarily disabled (UI only) — the upgrade prompt is
  // suppressed while in early access. Restore the condition below to re-enable.
  // const showUpgradePrompt =
  //   subscription.tier === 'free' && subscription.analyses_used >= 1
  const showUpgradePrompt = false

  const { upgraded } = await searchParams
  const available = Math.max(
    subscription.analyses_limit - subscription.analyses_used,
    0
  )

  return (
    <DashboardShell ambientA1={ambientA1} ambientA2={ambientA2}>
      <div className="studio-main">
        {upgraded === 'true' && (
          <UpgradeSuccessBanner tier={subscription.tier} available={available} />
        )}

        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="plate-tag">
          <span className="no">The Studio</span>
          <span className="rule" />
          <span className="meta">Your identities</span>
        </div>

        <div className="studio-head">
          <div>
            <h1>Studio</h1>
            <div className="subtitle">
              Curator ·{' '}
              <b>
                {specimenCount} {specimenCount === 1 ? 'specimen' : 'specimens'}
              </b>{' '}
              on the wall
              {latestArchetype ? <> · {latestArchetype}</> : null}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            {showUpgradePrompt ? (
              <Link
                href="/pricing"
                style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--amber)' }}
              >
                Upgrade to run more analyses →
              </Link>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  color: 'var(--ink-35)',
                  textTransform: 'uppercase',
                }}
              >
                {subscription.analyses_used} / {subscription.analyses_limit} analyses
                this month
              </span>
            )}
          </div>
        </div>

        {/* ─── Stats (warm reactive glows) ─────────────────────── */}
        <StudioStats
          specimenCount={specimenCount}
          avgConsistency={avgConsistency}
          checkCount={checkCount}
          glows={glows}
        />

        {/* ─── Toolbar + specimen grid ─────────────────────────── */}
        <ProfileGrid profiles={rows} checksHistory={checksHistory} />

        {/* ─── Footer ──────────────────────────────────────────── */}
        <div className="studio-foot">
          <span className="meta">© 2026 Aesthete · Studio</span>
          <span className="meta">Aesthetic DNA · v2 schema</span>
        </div>
      </div>
    </DashboardShell>
  )
}
