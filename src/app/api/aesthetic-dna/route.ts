import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FREE_TIER } from '@/lib/stripe'
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseAestheticDna,
  PROMPT_VERSION,
} from '@/lib/aesthetic-dna'

const MODEL = 'gpt-4o'
const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB
const MIN_IMAGES = 3
const MAX_IMAGES = 12
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const STORAGE_BUCKET = 'aesthetic-images'
const MAX_STORED_IMAGES = 4

type AdminClient = ReturnType<typeof createAdminClient>

/** url-safe, nanoid-style 8-char slug. */
function generateSlug(length = 8): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let slug = ''
  for (let i = 0; i < length; i++) {
    slug += alphabet[bytes[i] % alphabet.length]
  }
  return slug
}

// Idempotent bucket check, memoised per server process so we only hit the
// storage API once rather than on every analysis request.
let bucketEnsured = false
async function ensureStorageBucket(admin: AdminClient): Promise<void> {
  if (bucketEnsured) return
  const { error } = await admin.storage.createBucket(STORAGE_BUCKET, { public: true })
  // createBucket errors if it already exists — that's the expected steady state.
  if (error && !/exist/i.test(error.message)) {
    console.error('Failed to ensure storage bucket:', error)
    return
  }
  bucketEnsured = true
}

/**
 * Upload up to MAX_STORED_IMAGES source images to public storage and return
 * their public URLs. A failure on any individual image is logged and skipped
 * so a storage hiccup never blocks the analysis itself.
 */
async function uploadSourceImages(
  admin: AdminClient,
  profileId: string,
  files: File[],
  buffers: Buffer[]
): Promise<string[]> {
  await ensureStorageBucket(admin)

  const urls: string[] = []
  const count = Math.min(files.length, MAX_STORED_IMAGES)
  for (let i = 0; i < count; i++) {
    const file = files[i]
    const safeName = (file.name || `image-${i}`).replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${profileId}/${i}-${safeName}`
    const { error } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffers[i], { contentType: file.type, upsert: true })
    if (error) {
      console.error(`Failed to upload source image ${path}:`, error)
      continue
    }
    const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    urls.push(data.publicUrl)
  }
  return urls
}

export async function POST(request: Request) {
  // 1. Require an authenticated user.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1b. Enforce the subscription usage limit before doing any expensive work.
  //     The service-role client is needed to read/create the subscription row
  //     (RLS only grants users SELECT). We reuse it for the DB writes below.
  const admin = createAdminClient()

  let { data: subscription } = await admin
    .from('user_subscriptions')
    .select('tier, analyses_used, analyses_limit')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!subscription) {
    const { data: created, error: createError } = await admin
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        tier: FREE_TIER.tier,
        analyses_limit: FREE_TIER.limit,
      })
      .select('tier, analyses_used, analyses_limit')
      .single()
    if (createError) {
      console.error('Failed to create subscription row:', createError)
      return NextResponse.json({ error: 'Could not verify your plan.' }, { status: 500 })
    }
    subscription = created
  }

  if (subscription.analyses_used >= subscription.analyses_limit) {
    return NextResponse.json(
      {
        error: 'Analysis limit reached',
        code: 'LIMIT_REACHED',
        tier: subscription.tier,
        limit: subscription.analyses_limit,
      },
      { status: 403 }
    )
  }

  // 2. Parse and validate the uploaded images.
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 })
  }

  const files = formData.getAll('images').filter((f): f is File => f instanceof File)

  if (files.length < MIN_IMAGES || files.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Upload between ${MIN_IMAGES} and ${MAX_IMAGES} images.` },
      { status: 400 }
    )
  }

  const imageParts: ChatCompletionContentPart[] = []
  const fileBuffers: Buffer[] = []
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || 'unknown'}. Use JPEG, PNG or WebP.` },
        { status: 400 }
      )
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" exceeds the 8MB limit.` },
        { status: 400 }
      )
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    fileBuffers.push(buffer)
    imageParts.push({
      type: 'image_url',
      image_url: { url: `data:${file.type};base64,${buffer.toString('base64')}`, detail: 'low' },
    })
  }

  // 3. Kick off source-image uploads concurrently with the analysis. We mint
  //    the profile id up front so storage paths and the DB row agree.
  const profileId = crypto.randomUUID()
  const uploadPromise = uploadSourceImages(admin, profileId, files, fileBuffers)

  // 4. Call GPT-4o Vision, retrying once if validation fails.
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: buildUserPrompt(files.length) },
        ...imageParts,
      ],
    },
  ]

  let rawOutput = ''
  let parseResult = { ok: false as const, error: 'No output' } as ReturnType<
    typeof parseAestheticDna
  >

  for (let attempt = 0; attempt < 2; attempt++) {
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages,
      })
    } catch (err) {
      console.error('OpenAI request failed:', err)
      return NextResponse.json(
        { error: 'The analysis service is unavailable. Please try again.' },
        { status: 502 }
      )
    }

    rawOutput = completion.choices[0]?.message?.content ?? ''
    parseResult = parseAestheticDna(rawOutput)

    if (parseResult.ok) break

    // Feed the validation error back for a single corrective retry.
    messages.push({ role: 'assistant', content: rawOutput })
    messages.push({
      role: 'user',
      content: `That response failed validation: ${parseResult.error}. Return corrected JSON only, matching the exact schema. No code fences, no commentary.`,
    })
  }

  if (!parseResult.ok) {
    console.error('DNA validation failed after retry:', parseResult.error)
    return NextResponse.json(
      { error: 'Could not read a clean aesthetic profile from these images. Try a more consistent set.' },
      { status: 422 }
    )
  }

  // 5. Resolve the (best-effort) uploads. A storage failure must never sink
  //    a successful analysis, so swallow errors down to an empty list.
  let imageUrls: string[] = []
  try {
    imageUrls = await uploadPromise
  } catch (err) {
    console.error('Source image upload failed:', err)
  }

  // 6. Persist with the service-role client (RLS-bypassing, server-only).
  const shareSlug = generateSlug()

  const { data: profile, error: dbError } = await admin
    .from('aesthetic_profiles')
    .insert({
      id: profileId,
      user_id: user.id,
      status: 'complete',
      dna: parseResult.dna,
      raw_model_output: rawOutput,
      image_count: files.length,
      image_urls: imageUrls,
      model: MODEL,
      prompt_version: PROMPT_VERSION,
      share_slug: shareSlug,
    })
    .select('id, share_slug')
    .single()

  if (dbError || !profile) {
    console.error('Failed to insert profile:', dbError)
    return NextResponse.json({ error: 'Failed to save your profile.' }, { status: 500 })
  }

  // 7. Count this analysis against the user's monthly allowance.
  const { error: usageError } = await admin
    .from('user_subscriptions')
    .update({
      analyses_used: subscription.analyses_used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
  if (usageError) {
    console.error('Failed to increment usage counter:', usageError)
  }

  return NextResponse.json({
    profile_id: profile.id,
    share_slug: profile.share_slug,
    dna: parseResult.dna,
  })
}
