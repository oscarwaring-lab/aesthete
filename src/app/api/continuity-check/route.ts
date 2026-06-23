import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AestheticDna } from '@/lib/aesthetic-dna'
import {
  CONTINUITY_SYSTEM_PROMPT,
  buildContinuityUserPrompt,
  parseContinuityResult,
} from '@/lib/continuity'

const MODEL = 'gpt-4o'
const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const STORAGE_BUCKET = 'aesthetic-images'

type AdminClient = ReturnType<typeof createAdminClient>

// Idempotent bucket check, memoised per server process. The bucket is shared
// with the DNA-analysis route; creating it here covers the case where a check
// runs before any analysis has.
let bucketEnsured = false
async function ensureStorageBucket(admin: AdminClient): Promise<void> {
  if (bucketEnsured) return
  const { error } = await admin.storage.createBucket(STORAGE_BUCKET, { public: true })
  if (error && !/exist/i.test(error.message)) {
    console.error('Failed to ensure storage bucket:', error)
    return
  }
  bucketEnsured = true
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

  // 2. Parse and validate the upload.
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 })
  }

  const profileId = formData.get('profile_id')
  if (typeof profileId !== 'string' || !profileId) {
    return NextResponse.json({ error: 'Missing profile_id.' }, { status: 400 })
  }

  const file = formData.get('image')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing image.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || 'unknown'}. Use JPEG, PNG or WebP.` },
      { status: 400 }
    )
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Image exceeds the 8MB limit.' }, { status: 400 })
  }

  // 3. Fetch the target profile and confirm ownership. The admin client lets us
  //    read user_id directly so we can return a precise 403.
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('aesthetic_profiles')
    .select('id, user_id, dna')
    .eq('id', profileId)
    .maybeSingle()

  if (profileError) {
    console.error('Failed to load profile:', profileError)
    return NextResponse.json({ error: 'Could not load that profile.' }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }
  if (profile.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your profile.' }, { status: 403 })
  }

  const dna = profile.dna as AestheticDna

  // 4. Convert the image to a base64 data URL for vision input.
  const buffer = Buffer.from(await file.arrayBuffer())
  const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`

  // 5. Call GPT-4o Vision, retrying once if validation fails.
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: CONTINUITY_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: buildContinuityUserPrompt(dna) },
        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
      ],
    },
  ]

  let rawOutput = ''
  let parseResult = { ok: false as const, error: 'No output' } as ReturnType<
    typeof parseContinuityResult
  >

  for (let attempt = 0; attempt < 2; attempt++) {
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages,
      })
    } catch (err) {
      console.error('OpenAI request failed:', err)
      return NextResponse.json(
        { error: 'The scoring service is unavailable. Please try again.' },
        { status: 502 }
      )
    }

    rawOutput = completion.choices[0]?.message?.content ?? ''
    parseResult = parseContinuityResult(rawOutput)
    if (parseResult.ok) break

    messages.push({ role: 'assistant', content: rawOutput })
    messages.push({
      role: 'user',
      content: `That response failed validation: ${parseResult.error}. Return corrected JSON only, matching the exact schema. No code fences, no commentary.`,
    })
  }

  if (!parseResult.ok) {
    console.error('Continuity validation failed after retry:', parseResult.error)
    return NextResponse.json(
      { error: 'Could not read a clean score for this image. Please try again.' },
      { status: 422 }
    )
  }

  const result = parseResult.result

  // 6. Upload the checked image to storage. A storage hiccup must not sink an
  //    otherwise-successful score, so failures degrade to a null image_url.
  const checkId = crypto.randomUUID()
  let imageUrl: string | null = null
  try {
    await ensureStorageBucket(admin)
    const path = `continuity/${profileId}/${checkId}.jpg`
    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (uploadError) {
      console.error('Failed to upload checked image:', uploadError)
    } else {
      imageUrl = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
    }
  } catch (err) {
    console.error('Checked image upload failed:', err)
  }

  // 7. Persist the check with the service-role client.
  const { data: inserted, error: dbError } = await admin
    .from('continuity_checks')
    .insert({
      id: checkId,
      user_id: user.id,
      profile_id: profileId,
      image_url: imageUrl,
      overall_score: result.overall_score,
      dimension_scores: result.dimensions,
      verdict: result.verdict,
    })
    .select('id, created_at')
    .single()

  if (dbError || !inserted) {
    console.error('Failed to insert continuity check:', dbError)
    return NextResponse.json({ error: 'Failed to save this check.' }, { status: 500 })
  }

  // 8. Return the full result.
  return NextResponse.json({
    id: inserted.id,
    created_at: inserted.created_at,
    image_url: imageUrl,
    overall_score: result.overall_score,
    dimensions: result.dimensions,
    verdict: result.verdict,
  })
}
