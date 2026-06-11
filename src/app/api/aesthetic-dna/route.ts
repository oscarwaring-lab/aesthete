import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

export async function POST(request: Request) {
  // 1. Require an authenticated user.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    imageParts.push({
      type: 'image_url',
      image_url: { url: `data:${file.type};base64,${base64}`, detail: 'low' },
    })
  }

  // 3. Call GPT-4o Vision, retrying once if validation fails.
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

  // 4. Persist with the service-role client (RLS-bypassing, server-only).
  const admin = createAdminClient()
  const shareSlug = generateSlug()

  const { data: profile, error: dbError } = await admin
    .from('aesthetic_profiles')
    .insert({
      user_id: user.id,
      status: 'complete',
      dna: parseResult.dna,
      raw_model_output: rawOutput,
      image_count: files.length,
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

  return NextResponse.json({
    profile_id: profile.id,
    share_slug: profile.share_slug,
    dna: parseResult.dna,
  })
}
