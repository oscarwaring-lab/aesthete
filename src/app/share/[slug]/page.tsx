import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { DnaReport } from '@/components/DnaReport'
import { EditorialNav } from '@/components/editorial/EditorialNav'
import { EditorialFooter } from '@/components/editorial/EditorialFooter'
import { deriveSharePlate } from '@/lib/share-plate'
import type { AestheticDna } from '@/lib/aesthetic-dna'

type ShareProfile = {
  dna: AestheticDna
  share_slug: string
  created_at: string
  image_urls: string[] | null
  creator_handle: string | null
  deleted_at: string | null
}

/**
 * Public page — no authenticated user, so we read with the service-role client
 * (server-only) and look up purely by the unguessable share slug.
 *
 * Memoised with React `cache` so `generateMetadata` and the page itself share
 * one round trip instead of querying twice per request.
 */
const getSharedProfile = cache(async (slug: string): Promise<ShareProfile | null> => {
  const admin = createAdminClient()

  const { data } = await admin
    .from('aesthetic_profiles')
    .select('dna, share_slug, created_at, image_urls, creator_handle, deleted_at')
    .eq('share_slug', slug)
    .single()

  return (data as ShareProfile | null) ?? null
})

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

/**
 * Lab-strip date, e.g. "29 July 2026". UTC getters keep the server and client
 * output identical (the same reason the report card avoids toLocaleDateString).
 * Deliberately a different shape from the card's own "Jul 29, 2026" footer so
 * the strip reads as plate furniture rather than a repeat.
 */
function formatPlateDate(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// Prefer the creative-director signature as the share preview description,
// falling back to the identity summary for older (v1) profiles.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const profile = await getSharedProfile(slug)

  if (!profile) return {}

  const dna = profile.dna
  const description = dna.creative_brief?.signature ?? dna.identity.summary

  return { description }
}

/**
 * The specimen plate. The report card is framed — never rewritten — as a glass
 * specimen on a field graded from the creator's own palette, so a link opened
 * from a DM lands on something that matches the rest of the site.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const profile = await getSharedProfile(slug)

  if (!profile) {
    notFound()
  }

  // Soft-deleted profiles are withdrawn from public view: the plate stays, but
  // it drops to the neutral grade and carries a quiet notice in place of the
  // report itself.
  if (profile.deleted_at) {
    const plate = deriveSharePlate(null)

    return (
      <div className="editorial share flex min-h-screen flex-col">
        <EditorialNav showLinks={false} />

        <main className="share-main">
          <div
            className="share-plate"
            data-neutral="true"
            style={{ background: plate.background }}
          >
            <div className="share-veil" aria-hidden />

            <div className="share-plate-inner">
              <header className="share-lab">
                <div className="share-lab-side">
                  <span className="share-lab-mark">Aesthete</span>
                  <span className="share-lab-dot" aria-hidden>
                    ·
                  </span>
                  <span className="share-lab-meta">Specimen</span>
                </div>
                <div className="share-lab-side">
                  <span className="share-lab-id">Withdrawn</span>
                </div>
              </header>
              <div className="share-lab-rule" aria-hidden />

              <div className="share-frame share-frame--notice">
                <h1 className="share-notice-title">
                  This report is no longer available.
                </h1>
                <p className="share-notice-body">
                  The creator has withdrawn this specimen from public view.
                </p>
              </div>
            </div>
          </div>

          <p className="share-coda">
            Curated by{' '}
            <Link href="/" className="share-coda-link">
              getaesthete.com
            </Link>
          </p>
        </main>

        <EditorialFooter />
      </div>
    )
  }

  const dna = profile.dna
  const plate = deriveSharePlate(dna.color?.palette)
  const specimenId = profile.share_slug.slice(0, 6).toUpperCase()

  return (
    <div className="editorial share flex min-h-screen flex-col">
      <EditorialNav showLinks={false} />

      <main className="share-main">
        <div
          className="share-plate"
          data-neutral={plate.neutral ? 'true' : undefined}
          style={{ background: plate.background }}
        >
          {!plate.neutral && (
            <div
              className="share-drift"
              aria-hidden
              style={{
                background: `radial-gradient(circle, ${plate.drift}, transparent 66%)`,
              }}
            />
          )}
          <div className="share-veil" aria-hidden />

          <div className="share-plate-inner">
            {/* Lab furniture only — the card already carries archetype,
                handle and score, so none of that is repeated here. */}
            <header className="share-lab">
              <div className="share-lab-side">
                <span className="share-lab-mark">Aesthete</span>
                <span className="share-lab-dot" aria-hidden>
                  ·
                </span>
                <span className="share-lab-meta">Specimen</span>
              </div>
              <div className="share-lab-side">
                <span className="share-lab-meta">
                  {formatPlateDate(profile.created_at)}
                </span>
                <span className="share-lab-id">№ {specimenId}</span>
              </div>
            </header>
            <div className="share-lab-rule" aria-hidden />

            <div className="share-frame">
              <div className="share-report">
                <DnaReport
                  dna={dna}
                  createdAt={profile.created_at}
                  imageUrls={profile.image_urls}
                  creatorHandle={profile.creator_handle}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="share-coda">
          Curated by{' '}
          <Link href="/" className="share-coda-link">
            getaesthete.com
          </Link>
        </p>
      </main>

      <EditorialFooter />
    </div>
  )
}
