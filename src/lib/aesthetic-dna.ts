import { z } from 'zod'

export const PROMPT_VERSION = 'v2'

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
  // Added in PROMPT_VERSION v2. Optional so profiles generated under v1
  // (which never contained this field) still validate and render.
  creative_brief: z
    .object({
      signature: z
        .string()
        .describe(
          "One powerful sentence that captures the complete essence of this visual identity — written like a creative director's logline, not a description. Something the creator could use as their creative north star."
        ),
      colour_story: z
        .string()
        .describe(
          '2-3 sentences explaining WHY this palette works together — the tension, harmony, or emotional logic between the colours. Not what the colours are, but what they do together and why that creates the identity\'s feeling.'
        ),
      shoot_next: z
        .array(z.string())
        .min(3)
        .max(6)
        .describe(
          "3-6 specific content directions that would strengthen this identity. Each one is a concrete shooting direction, not a generic suggestion. E.g. 'Street scenes at blue hour where artificial light reflects on wet surfaces' not 'shoot more urban content'."
        ),
      avoid: z
        .array(z.string())
        .min(2)
        .max(5)
        .describe(
          "2-5 specific things that would break this identity. Concrete and visual, not generic. E.g. 'Warm golden-hour portraits — the warmth conflicts with your cool-anchored palette' not 'avoid bad lighting'."
        ),
      evolution: z
        .string()
        .describe(
          "One paragraph on where this identity could develop next — a natural evolution that extends rather than breaks the existing DNA. Specific to what's already in the feed, not generic creative advice."
        ),
    })
    .optional(),
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
  "processing_directives": { "reference_note": string, "recommended_adjustments": string[] },
  "creative_brief": {
    "signature": string,
    "colour_story": string,
    "shoot_next": string[],
    "avoid": string[],
    "evolution": string
  }
}

Rules:
- "keywords": 3-10 single words or short phrases.
- "palette": 3-8 swatches, each with a valid 6-digit hex (e.g. "#1a1a2e") and a descriptive name.
- "consistency_score": an integer 0-100 reflecting how visually unified the set is (higher = more consistent). DERIVE this from evidence — do not guess a plausible-looking number, and never default to a round figure. Before you settle on a value, work through these steps internally:
    1. Identify the specific deviations — name the images or recurring patterns that break the dominant aesthetic (an off-palette shot, a composition that defies the pattern, a tonal or mood outlier).
    2. Count and weight them. Colour-grade and palette breaks are the heaviest; tonal/mood breaks are moderate; composition breaks are the lightest. Two palette breaks hurt the score more than two framing quirks.
    3. Select the band below whose description the weighted evidence actually matches — then choose the precise integer within that band that the evidence supports.
  The score MUST follow from the deviation list above. If you cannot name the deviations that justify a number, the number is wrong. Do NOT round to a multiple of 5 unless the evidence precisely lands there — a score like 87 or 73 is expected far more often than 85 or 75.
  Scoring bands:
    95-100: Virtually no deviations. Every image shares colour grade, tone, composition language, and mood. A professional creative director could mistake it for a single shoot.
    85-94:  Strong identity with 1-3 minor deviations — a slightly off-palette image, one composition that breaks the pattern. Core identity intact.
    70-84:  Clear aesthetic direction but inconsistent execution. 4-6 noticeable deviations across colour, tone, or mood. Identity readable but unreliable.
    50-69:  Partial identity. Some images cohere, others actively contradict the established palette or mood. Brand deals would notice.
    Below 50: No reliable visual identity. Major inconsistencies across colour, tone, composition, and mood throughout.
- "reference_note": one to three sentences an editor could use as a north-star description of the look.
- "recommended_adjustments": concrete editing moves (e.g. "Lift shadows +12, add a cool teal tint").
- "creative_brief.signature": a SINGLE sentence, written like a creative director's logline — a north star, not a description.
- "creative_brief.colour_story": 2-3 sentences on WHY this palette works together — the tension, harmony, or emotional logic between the colours; what they do together, not what they are.
- "creative_brief.shoot_next": 3-6 SPECIFIC, visual shooting directions tied to this identity (e.g. "Street scenes at blue hour where artificial light reflects on wet surfaces"), never generic advice like "shoot more urban content".
- "creative_brief.avoid": 2-5 concrete, visual things that would break THIS identity, each referencing an actual element of it (e.g. "Warm golden-hour portraits — the warmth conflicts with your cool-anchored palette"), never generic notes like "avoid bad lighting".
- "creative_brief.evolution": one paragraph on a natural next step that extends rather than breaks the DNA, referencing what is already in this feed.`

export function buildUserPrompt(imageCount: number): string {
  return `Here are ${imageCount} images from this creator's feed, provided as a single set. Analyse them together and return the Aesthetic DNA JSON described in your instructions. Sample actual colours from the images for the palette.

Also fill the "creative_brief" object — this is a working creative brief, so be sharp and specific to THIS feed:
- "signature": ONE sentence only, a creative-director logline the creator could use as their north star — not a description.
- "colour_story": 2-3 sentences on why these colours work TOGETHER (the tension/harmony/emotional logic), not a list of what they are.
- "shoot_next": 3-6 concrete, visual shooting directions tied to this identity — name the subject, light, and setting. No generic advice.
- "avoid": 2-5 concrete, visual things that would break this exact identity, each naming the actual element of the DNA it conflicts with.
- "evolution": one paragraph on a natural next step that extends this DNA, referencing what is already present in these images.

Return JSON only.`
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
