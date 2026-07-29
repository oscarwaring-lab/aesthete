/**
 * The public share-link read.
 *
 * There is no authenticated user on `/share/[slug]`, so we read with the
 * service-role client (server-only) and look up purely by the unguessable
 * share slug. Shared by the page and its OG image route so the two can't
 * drift apart on which columns they select.
 *
 * Wrapped in React `cache` so the page and its `generateMetadata` share one
 * round trip per request instead of querying twice.
 */
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AestheticDna } from '@/lib/aesthetic-dna'

export type ShareProfile = {
  dna: AestheticDna
  share_slug: string
  created_at: string
  image_urls: string[] | null
  creator_handle: string | null
  deleted_at: string | null
}

export const getSharedProfile = cache(
  async (slug: string): Promise<ShareProfile | null> => {
    const admin = createAdminClient()

    const { data } = await admin
      .from('aesthetic_profiles')
      .select('dna, share_slug, created_at, image_urls, creator_handle, deleted_at')
      .eq('share_slug', slug)
      .single()

    return (data as ShareProfile | null) ?? null
  }
)
