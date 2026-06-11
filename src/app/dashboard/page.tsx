import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { AestheticDna } from '@/lib/aesthetic-dna'

type ProfileRow = {
  id: string
  dna: AestheticDna
  consistency_score?: number
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // RLS scopes this to the signed-in user; index covers (user_id, created_at desc).
  const { data: profiles } = await supabase
    .from('aesthetic_profiles')
    .select('id, dna, created_at')
    .order('created_at', { ascending: false })

  const rows = (profiles ?? []) as ProfileRow[]

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your profiles</h1>
          <p className="mt-1 text-sm text-muted">
            Aesthetic DNA reports from your analysed feeds.
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Plus className="h-4 w-4" />
          New analysis
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileCard({ profile }: { profile: ProfileRow }) {
  const dna = profile.dna
  const date = new Date(profile.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Link
      href={`/dashboard/report/${profile.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-panel p-5 transition-colors hover:border-white/20"
    >
      {/* palette strip */}
      <div className="mb-4 flex h-10 overflow-hidden rounded-lg">
        {dna.color.palette.slice(0, 6).map((s, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: s.hex }} />
        ))}
      </div>

      <h2 className="text-lg font-semibold leading-snug tracking-tight">
        {dna.identity.archetype}
      </h2>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted">{date}</span>
        <span className="flex items-center gap-1.5">
          <span
            className="font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            {dna.consistency_score}
          </span>
          <span className="text-xs text-muted">/100</span>
        </span>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-panel px-6 py-16 text-center">
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--violet))' }}
      >
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">No profiles yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Upload a set of images from your feed and we&apos;ll codify your visual identity into an
        Aesthetic DNA report.
      </p>
      <Link
        href="/dashboard/upload"
        className="mt-6 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        <Plus className="h-4 w-4" />
        Analyse your first feed
      </Link>
    </div>
  )
}
