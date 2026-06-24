import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Soft-delete a profile.
 *
 * Sets `deleted_at` so the profile disappears from every view while the row
 * (and the analysis it counts toward) is preserved — `user_subscriptions`
 * and `analyses_used` are deliberately left untouched, so a deleted profile
 * still counts against the user's monthly limit.
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 1. Require an authenticated user.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify the profile exists and belongs to this user before mutating.
  //    The service-role client bypasses RLS so we can distinguish "not found"
  //    from "not yours" and return the right status.
  const admin = createAdminClient()

  const { data: profile, error: fetchError } = await admin
    .from('aesthetic_profiles')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to load profile for delete:', fetchError)
    return NextResponse.json({ error: 'Could not delete' }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (profile.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Soft-delete. Never touch user_subscriptions / analyses_used.
  const { error: updateError } = await admin
    .from('aesthetic_profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to soft-delete profile:', updateError)
    return NextResponse.json({ error: 'Could not delete' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
