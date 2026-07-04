import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  // `.studio` scopes the dark liquid-glass token set + component styles
  // (globals.css) so they never collide with the cream `.landing` system.
  return (
    <div className="studio min-h-screen" style={{ background: '#16161e' }}>
      <DashboardNav email={userData.user?.email} />
      <main>{children}</main>
    </div>
  )
}
