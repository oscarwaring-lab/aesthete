// One-off: ensure the public 'aesthetic-images' storage bucket exists.
// Run with: node --env-file=.env.local scripts/ensure-bucket.mjs
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'aesthetic-images'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { error } = await admin.storage.createBucket(BUCKET, { public: true })
if (error && !/exist/i.test(error.message)) {
  console.error('createBucket failed:', error)
  process.exit(1)
}

const { data: buckets, error: listError } = await admin.storage.listBuckets()
if (listError) {
  console.error('listBuckets failed:', listError)
  process.exit(1)
}
const found = buckets.find((b) => b.name === BUCKET)
console.log(found ? `OK: bucket '${BUCKET}' exists (public=${found.public})` : `MISSING: ${BUCKET}`)
