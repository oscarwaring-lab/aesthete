import { z } from 'zod'

export const PROMPT_VERSION = 'v1'

/** A single palette entry: a hex value plus a human-readable name. */
const ColorSwatch = z.object({
  hex: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour like #6d5cff'),
  name: z.string().min(1),
})

/**
 * The full Aesthetic DNA object. This is the contract between the model,
 * the database (`dna` jsonb column), and <DnaReport />.
 */
export const AestheticDnaSchema = z.object({
  identity: z.object({
    archetype: z.string().min(1),
    keywords: z.array(z.string().min(1)).min(3).max(10),
    summary: z.string().min(1),
  }),
  color: z.object({
    palette: z.array(ColorSwatch).min(3).max(8),
    description: z.string().min(1),
  }),
  tone: z.object({
    exposure: z.string().min(1),
    shadows: z.string().min(1),
    grain: z.string().min(1),
  }),
  composition: z.object({
    tendencies: z.array(z.string().min(1)).min(2).max(8),
    description: z.string().min(1),
  }),
  mood: z.object({
    descriptors: z.array(z.string().min(1)).min(2).max(8),
    description: z.string().min(1),
  }),
  consistency_score: z.number().int().min(0).max(100),
  processing_directives: z.object({
    reference_note: z.string().min(1),
    recommended_adjustments: z.array(z.string().min(1)).min(1).max(8),
  }),
})

export type AestheticDna = z.infer<typeof AestheticDnaSchema>

export const SYSTEM_PROMPT = `You are a senior creative director analysing a lifestyle creator's image feed as a single, cohesive set — not as individual photos.

Your job is to extract the creator's visual identity and codify it into a precise, reusable profile. Study the set as a whole: the recurring palette, the way light and shadow behave, framing and composition habits, and the emotional mood that ties the images together.

Be specific and concrete. Use real hex values sampled from the dominant and accent colours across the set. Name a distinctive archetype (e.g. "Sun-bleached Minimalist", "Moody Urban Romantic") rather than something generic. Describe tone in terms a colourist would use. The processing_directives should read like instructions another editor could follow to replicate this look.

Output ONLY valid JSON matching exactly this shape, with no markdown, no code fences, and no commentary:

{
  "identity": { "archetype": string, "keywords": string[], "summary": string },
  "color": { "palette": [{ "hex": "#rrggbb", "name": string }], "description": string },
  "tone": { "exposure": string, "shadows": string, "grain": string },
  "composition": { "tendencies": string[], "description": string },
  "mood": { "descriptors": string[], "description": string },
  "consistency_score": number,
  "processing_directives": { "reference_note": string, "recommended_adjustments": string[] }
}

Rules:
- "keywords": 3-10 single words or short phrases.
- "palette": 3-8 swatches, each with a valid 6-digit hex (e.g. "#1a1a2e") and a descriptive name.
- "consistency_score": an integer 0-100 reflecting how visually unified the set is (higher = more consistent).
- "reference_note": one to three sentences an editor could use as a north-star description of the look.
- "recommended_adjustments": concrete editing moves (e.g. "Lift shadows +12, add a cool teal tint").`

export function buildUserPrompt(imageCount: number): string {
  return `Here are ${imageCount} images from this creator's feed, provided as a single set. Analyse them together and return the Aesthetic DNA JSON described in your instructions. Sample actual colours from the images for the palette. Return JSON only.`
}

/** Strip a ```json ... ``` (or ``` ... ```) fence if the model added one. */
function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  return (fence ? fence[1] : trimmed).trim()
}

export type ParseResult =
  | { ok: true; dna: AestheticDna }
  | { ok: false; error: string }

/**
 * Parse raw model output into a validated AestheticDna.
 * Strips code fences, JSON-parses, then Zod-validates.
 */
export function parseAestheticDna(raw: string): ParseResult {
  const cleaned = stripCodeFences(raw)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return { ok: false, error: 'Model output was not valid JSON.' }
  }

  const result = AestheticDnaSchema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    return { ok: false, error: `Schema validation failed — ${issues}` }
  }

  return { ok: true, dna: result.data }
}
