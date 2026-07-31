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
  EVIDENCE_DIMENSIONS,
  EVIDENCE_REASONING_SYSTEM_PROMPT,
  EVIDENCE_REASONING_TEMPERATURE,
  buildEvidenceReasoningPrompt,
  parseEvidenceReasoning,
  type AestheticDna,
  type EvidenceDimension,
  type EvidenceReasoningTarget,
} from '@/lib/aesthetic-dna'

const MODEL = 'gpt-4o'
const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB
const MIN_IMAGES = 3
const MAX_IMAGES = 12
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Content pillars: a standard profile can carry at most MAX_PILLARS pillar
// analyses, each labelled with a short pillar_name.
const MAX_PILLAR_NAME = 30
const MAX_PILLARS = 3
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Trim, strip control chars, collapse whitespace and cap at MAX_PILLAR_NAME. */
function sanitisePillarName(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PILLAR_NAME)
  return cleaned.length > 0 ? cleaned : null
}

// Optional creator-handle attribution. Cosmetic only — never fed to the model
// or used in scoring (see route step 4, which is unaware of it).
const MAX_CREATOR_HANDLE = 30

/**
 * Normalise an Instagram handle: strip any @, remove all whitespace, lowercase,
 * keep only Instagram-legal characters (letters, digits, underscore, dot) and
 * cap at MAX_CREATOR_HANDLE. Returns null when nothing usable remains, so an
 * empty or junk handle is stored as null rather than "".
 */
function sanitiseCreatorHandle(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw
    .replace(/@/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, MAX_CREATOR_HANDLE)
  return cleaned.length > 0 ? cleaned : null
}

const STORAGE_BUCKET = 'aesthetic-images'

// Store every image we analysed, not just the first few. A v3 evidence binding
// can name any image in the set (see `Evidence` in src/lib/aesthetic-dna.ts), and
// it can only resolve to a frame if that frame was kept — so the storage cap has
// to match the analysis cap. The report gallery still shows only the first four.
const MAX_STORED_IMAGES = MAX_IMAGES

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
 * their public URLs. A storage failure never blocks the analysis itself.
 *
 * THE ORDERING INVARIANT — `image_urls[i]` is the (i+1)th image the model was
 * shown. The DNA's evidence bindings are 1-based indices into the images as
 * presented to the model (see `Evidence` in src/lib/aesthetic-dna.ts), and they
 * are only meaningful because this array is a positionally faithful prefix of
 * `files`, which is also the order the image parts are handed to the Vision
 * call. So this function must never sort, filter or dedupe.
 *
 * That is why a failed upload BREAKS rather than skips: skipping would compact
 * the array and shift every later URL down a slot, so a binding would resolve
 * to the wrong photograph — silently, and on a page a creator reads closely.
 * Stopping short instead yields a shorter but correctly aligned prefix; indices
 * past its end simply do not resolve, and the report falls back to no exemplar.
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
      console.error(
        `Failed to upload source image ${path} — stopping after ${urls.length} ` +
          'to keep image_urls aligned with the order the model saw:',
        error
      )
      break
    }
    const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    urls.push(data.publicUrl)
  }
  return urls
}

/**
 * Evidence bindings are mandatory in the prompt but optional in the schema, so
 * that one bad exemplar costs us that exemplar and nothing else. This is where
 * that guarantee is enforced, in place on `dna`, before it is persisted.
 *
 * A binding is dropped when `image_index` is not an integer within 1..N (N being
 * the number of images actually sent to the model) or when `reasoning` is blank.
 * Every drop is logged, because the failure mode otherwise is a slow, invisible
 * decline in report quality.
 *
 * `storedCount` is only used to warn, never to drop: an index beyond the stored
 * prefix is a correct binding whose frame we failed to keep, so it resolves to
 * nothing and the report falls back to no exemplar. Since MAX_STORED_IMAGES now
 * matches MAX_IMAGES, this can only mean an upload failed, which is worth seeing
 * in the logs rather than silently costing us an exemplar.
 */
function sanitiseEvidence(dna: AestheticDna, imageCount: number, storedCount: number): void {
  for (const dimension of EVIDENCE_DIMENSIONS) {
    const evidence = dna[dimension].evidence
    if (!evidence) continue

    const { image_index: index, reasoning } = evidence

    let dropReason: string | null = null
    if (!Number.isInteger(index)) {
      dropReason = `image_index ${JSON.stringify(index)} is not an integer`
    } else if (index < 1 || index > imageCount) {
      dropReason = `image_index ${index} is outside 1..${imageCount}`
    } else if (reasoning.trim().length === 0) {
      dropReason = 'reasoning is blank'
    }

    if (dropReason) {
      console.warn(`Dropped ${dimension} evidence — ${dropReason}.`)
      dna[dimension].evidence = undefined
      continue
    }

    if (index > storedCount) {
      console.warn(
        `Kept ${dimension} evidence citing image ${index}, but only ${storedCount} ` +
          'source image(s) were stored — the card will have no frame to show.'
      )
    }

    // Persist the trimmed reasoning so no stray whitespace reaches the report.
    dna[dimension].evidence = { image_index: index, reasoning: reasoning.trim() }
  }
}

/**
 * Rewrite the evidence reasoning in a second, low-temperature call.
 *
 * The analysis runs at 0.4 because the archetype, palette and creative brief
 * are worse when the model plays safe. These three sentences want the opposite:
 * a fixed two-sentence shape and a list of banned words, both of which 0.4
 * reliably ignored. Temperature is per-request, so precision here without
 * flattening the rest of the report costs one extra call.
 *
 * Runs after `sanitiseEvidence` so it only spends tokens on bindings that
 * survived, and only ever overwrites `reasoning` — `image_index` is the first
 * pass's choice and stays untouched.
 *
 * Best-effort by construction. A failed request, unparseable output or a
 * missing key all leave the first pass's reasoning in place, because a plainer
 * sentence is worth far more than a blank card.
 */
async function refineEvidenceReasoning(
  openai: OpenAI,
  dna: AestheticDna,
  imageParts: ChatCompletionContentPart[]
): Promise<void> {
  const targets: EvidenceReasoningTarget[] = []
  for (const dimension of EVIDENCE_DIMENSIONS) {
    const evidence = dna[dimension].evidence
    if (!evidence) continue
    targets.push({
      dimension,
      imageIndex: evidence.image_index,
      description: dna[dimension].description,
    })
  }

  if (targets.length === 0) return

  let completion
  try {
    completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: EVIDENCE_REASONING_TEMPERATURE,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EVIDENCE_REASONING_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildEvidenceReasoningPrompt(
                imageParts.length,
                dna.identity.archetype,
                targets
              ),
            },
            ...imageParts,
          ],
        },
      ],
    })
  } catch (err) {
    console.error('Evidence reasoning pass failed — keeping first-pass text:', err)
    return
  }

  const result = parseEvidenceReasoning(
    completion.choices[0]?.message?.content ?? '',
    targets.map((t) => t.dimension)
  )

  if (!result.ok) {
    console.warn(`Evidence reasoning pass discarded — ${result.error}`)
    return
  }

  for (const dimension of Object.keys(result.reasoning) as EvidenceDimension[]) {
    const refined = result.reasoning[dimension]
    const evidence = dna[dimension].evidence
    if (refined && evidence) evidence.reasoning = refined
  }
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

  // 2b. Optional content-pillar fields. A pillar analysis hangs off a parent
  //     standard profile and carries a short label. Both are validated/sanitised
  //     here; the DNA generation below is identical for standard and pillar runs.
  const pillarName = sanitisePillarName(formData.get('pillar_name'))

  // Optional, decorative attribution — applies to standard and pillar runs alike.
  const creatorHandle = sanitiseCreatorHandle(formData.get('creator_handle'))

  const parentIdRaw = formData.get('parent_profile_id')
  let parentProfileId: string | null = null
  if (typeof parentIdRaw === 'string' && parentIdRaw.length > 0) {
    if (!UUID_RE.test(parentIdRaw)) {
      return NextResponse.json({ error: 'Invalid parent profile.' }, { status: 400 })
    }
    parentProfileId = parentIdRaw
  }

  // Enforce the per-parent pillar cap server-side. Soft-deleted pillars are
  // excluded so the count matches what the dashboard shows (and a deleted
  // pillar frees a slot).
  if (parentProfileId) {
    const { count, error: countError } = await admin
      .from('aesthetic_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('parent_profile_id', parentProfileId)
      .eq('analysis_type', 'pillar')
      .is('deleted_at', null)

    if (countError) {
      console.error('Failed to count existing pillars:', countError)
      return NextResponse.json({ error: 'Could not verify your pillars.' }, { status: 500 })
    }
    if ((count ?? 0) >= MAX_PILLARS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PILLARS} pillars per profile` },
        { status: 400 }
      )
    }
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

  // 5b. Drop any evidence binding that does not point at a real image in the set
  //     the model was shown. Runs after the uploads resolve so it can also flag
  //     bindings whose frame was never stored. Never fails the analysis.
  sanitiseEvidence(parseResult.dna, files.length, imageUrls.length)

  // 5c. Rewrite the surviving reasoning at low temperature. Best-effort: on any
  //     failure the first pass's text stands, so this can never sink a report.
  await refineEvidenceReasoning(openai, parseResult.dna, imageParts)

  // 6. Persist with the service-role client (RLS-bypassing, server-only).
  //    A named pillar becomes a 'pillar' row linked to its parent; otherwise
  //    the row stays a 'standard' analysis (the column default).
  const shareSlug = generateSlug()
  const pillarFields = pillarName
    ? { analysis_type: 'pillar', pillar_name: pillarName, parent_profile_id: parentProfileId }
    : {}

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
      creator_handle: creatorHandle,
      ...pillarFields,
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
