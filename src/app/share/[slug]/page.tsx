import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { DnaReport } from '@/components/DnaReport'
import { EditorialNav } from '@/components/editorial/EditorialNav'
import { EditorialFooter } from '@/components/editorial/EditorialFooter'
import type { AestheticDna } from '@/lib/aesthetic-dna'

// Public page — no authenticated user, so we read with the service-role
// client (server-only) and look up purely by the unguessable share slug.
// The dark DnaReport card is preserved verbatim and framed in the editorial
// cream system (nav + footer) shared with the landing page.
export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('aesthetic_profiles')
    .select('dna, share_slug, created_at, image_urls')
    .eq('share_slug', slug)
    .single()

  if (!profile) {
    notFound()
  }

  return (
    <div className="editorial flex min-h-screen flex-col">
      <EditorialNav showLinks={false} />

      <main className="share-main">
        <div className="share-intro">
          <p className="label">Aesthetic DNA · Shared specimen</p>
          <h1>A visual identity, made legible.</h1>
        </div>

        <div className="share-report">
          <DnaReport
            dna={profile.dna as AestheticDna}
            createdAt={profile.created_at}
            imageUrls={profile.image_urls as string[] | null}
          />
        </div>

        <div className="share-cta">
          <p>Want your own Aesthetic DNA report?</p>
          <Link className="btn-prussian" href="/signup">
            Analyse my feed →
          </Link>
        </div>
      </main>

      <EditorialFooter />
    </div>
  )
}
