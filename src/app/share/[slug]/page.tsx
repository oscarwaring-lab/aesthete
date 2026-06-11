import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { DnaReport } from '@/components/DnaReport'
import { Wordmark } from '@/components/Wordmark'
import type { AestheticDna } from '@/lib/aesthetic-dna'

// Public page — no authenticated user, so we read with the service-role
// client (server-only) and look up purely by the unguessable share slug.
export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('aesthetic_profiles')
    .select('dna, share_slug, created_at')
    .eq('share_slug', slug)
    .single()

  if (!profile) {
    notFound()
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto mb-8 flex w-full max-w-2xl items-center justify-between">
        <Wordmark />
        <Link
          href="/signup"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Analyse my feed
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <DnaReport dna={profile.dna as AestheticDna} createdAt={profile.created_at} />

      <div className="mx-auto mt-10 w-full max-w-2xl text-center">
        <p className="text-sm text-muted">Want your own Aesthetic DNA?</p>
        <Link
          href="/signup"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Analyse my feed
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
