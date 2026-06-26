import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AestheticDna } from '@/lib/aesthetic-dna'
import { PillarUpload } from './PillarUpload'

/**
 * Add a content pillar to an existing (standard) profile. Fetches the parent's
 * archetype for the header, then hands off to the client upload form. RLS
 * ("Users read own profiles") restricts the parent lookup to its owner.
 */
export default async function PillarPage({
  params,
}: {
  params: Promise<{ profileId: string }>
}) {
  const { profileId } = await params
  const supabase = await createClient()

  const { data: parent } = await supabase
    .from('aesthetic_profiles')
    .select('id, dna, deleted_at')
    .eq('id', profileId)
    .single()

  if (!parent) {
    notFound()
  }

  // A soft-deleted parent is hidden everywhere — don't let pillars hang off it.
  if (parent.deleted_at) {
    redirect('/dashboard')
  }

  const archetype = (parent.dna as AestheticDna).identity.archetype

  return <PillarUpload parentProfileId={parent.id} archetype={archetype} />
}
