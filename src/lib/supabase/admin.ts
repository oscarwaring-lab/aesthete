import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses Row Level Security.
 *
 * NEVER import this into a Client Component — the `server-only` import above
 * makes that a build-time error. Use only in Route Handlers / Server Actions
 * for trusted, server-controlled writes (e.g. inserting analysis results).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
