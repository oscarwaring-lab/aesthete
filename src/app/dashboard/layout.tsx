import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen">
      <DashboardNav email={user?.email} />
      <main>{children}</main>
    </div>
  )
}
