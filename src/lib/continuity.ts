import { z } from 'zod'
import type { AestheticDna } from '@/lib/aesthetic-dna'

/**
 * A continuity check scores a single image against an established Aesthetic
 * DNA profile. This schema is the contract between GPT-4o, the
 * `continuity_checks` table, and the check page UI.
 */
const Dimension = z.object({
  score: z.number().int().min(0).max(100),
  note: z.string().min(1),
})

export const ContinuityResultSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  dimensions: z.object({
    colour: Dimension,
    tone: Dimension,
    mood: Dimension,
    composition: Dimension,
  }),
  verdict: z.object({
    summary: z.string().min(1),
    post_it: z.boolean(),
    fix_note: z.string().min(1),
  }),
})

export type ContinuityResult = z.infer<typeof ContinuityResultSchema>

export const CONTINUITY_SYSTEM_PROMPT = `You are a senior creative director reviewing a single piece of content against an established Aesthetic DNA profile. Your job is to score how well this content fits the creator's visual identity and give them specific, actionable feedback.

Be honest and precise. A score of 91 means something specific — not just 'good'. A score of 54 means something is genuinely off. Never give scores above 95 or below 15 unless truly exceptional.

Respond with ONLY valid JSON matching the schema provided. No markdown, no code fences.`

/**
 * Build the user prompt from a stored DNA profile.
 *
 * NB: the real DNA schema (see `aesthetic-dna.ts`) does not carry separate
 * temperature/saturation/contrast or exposure-bias fields, so we surface the
 * fields that actually exist — palette, colour description, tone (exposure /
 * shadows / grain), mood, and composition — which give the model everything it
 * needs to score the four dimensions.
 */
export function buildContinuityUserPrompt(dna: AestheticDna): string {
  const palette = dna.color.palette.map((s) => `${s.name} (${s.hex})`).join(', ')

  return `Here is a creator's Aesthetic DNA profile:

Archetype: ${dna.identity.archetype}
Summary: ${dna.identity.summary}
Keywords: ${dna.identity.keywords.join(', ')}

Colour palette: ${palette}
Colour character: ${dna.color.description}

Tone — Exposure: ${dna.tone.exposure}
Tone — Shadows: ${dna.tone.shadows}
Tone — Grain: ${dna.tone.grain}

Mood descriptors: ${dna.mood.descriptors.join(', ')}
Mood character: ${dna.mood.description}

Composition tendencies: ${dna.composition.tendencies.join(', ')}
Composition character: ${dna.composition.description}

Processing directive: ${dna.processing_directives.reference_note}

Now score this single image against this DNA profile.

Return this exact JSON structure:
{
  "overall_score": number 0-100,
  "dimensions": {
    "colour": {
      "score": number 0-100,
      "note": "one sentence on how the colour matches or deviates"
    },
    "tone": {
      "score": number 0-100,
      "note": "one sentence on exposure, shadows, highlights match"
    },
    "mood": {
      "score": number 0-100,
      "note": "one sentence on energy and formality match"
    },
    "composition": {
      "score": number 0-100,
      "note": "one sentence on framing and negative space match"
    }
  },
  "verdict": {
    "summary": "2-3 sentence creative director verdict — what works, what is off, the overall read",
    "post_it": boolean — true if overall_score >= 75,
    "fix_note": "if post_it is false: one specific actionable fix. if post_it is true: one thing to watch going forward"
  }
}`
}

/** Strip a ```json ... ``` (or ``` ... ```) fence if the model added one. */
function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  return (fence ? fence[1] : trimmed).trim()
}

export type ContinuityParseResult =
  | { ok: true; result: ContinuityResult }
  | { ok: false; error: string }

export function parseContinuityResult(raw: string): ContinuityParseResult {
  const cleaned = stripCodeFences(raw)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return { ok: false, error: 'Model output was not valid JSON.' }
  }

  const result = ContinuityResultSchema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    return { ok: false, error: `Schema validation failed — ${issues}` }
  }

  return { ok: true, result: result.data }
}
