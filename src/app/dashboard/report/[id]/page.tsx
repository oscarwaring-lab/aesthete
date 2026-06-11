import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DnaReport } from '@/components/DnaReport'
import type { AestheticDna } from '@/lib/aesthetic-dna'

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // RLS ("Users read own profiles") restricts this to the owner.
  const { data: profile } = await supabase
    .from('aesthetic_profiles')
    .select('id, dna, share_slug, created_at')
    .eq('id', id)
    .single()

  if (!profile) {
    notFound()
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto mb-6 w-full max-w-2xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
      <DnaReport
        dna={profile.dna as AestheticDna}
        shareSlug={profile.share_slug}
        createdAt={profile.created_at}
      />
    </div>
  )
}
