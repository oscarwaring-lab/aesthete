import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/DashboardNav'
import { extractDnaAmbient } from '@/lib/dna-ambient'
import type { AestheticDna } from '@/lib/aesthetic-dna'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // The nav accent follows the user's most recent DNA across every dashboard
  // page, so resolve the dominant colour once here.
  const [{ data: userData }, { data: latest }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('aesthetic_profiles')
      .select('dna')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const dna = (latest as { dna: AestheticDna } | null)?.dna
  const { dominantHex } = extractDnaAmbient(dna?.color?.palette)

  return (
    <div className="min-h-screen" style={{ background: '#16161e' }}>
      <DashboardNav email={userData.user?.email} dominantHex={dominantHex} />
      <main>{children}</main>
    </div>
  )
}
