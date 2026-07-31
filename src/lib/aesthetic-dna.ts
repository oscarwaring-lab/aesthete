import { z } from 'zod'

// v3.1 is a voice change only — the schema is byte-identical to v3. It earns its
// own version so a row's `reasoning` register can be read off `prompt_version`
// without opening the JSON: v3 rows caption the frame, v3.1 rows read the eye.
export const PROMPT_VERSION = 'v3.1'

/** A single palette entry: a hex value plus a human-readable name. */
const ColorSwatch = z.object({
  hex: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour like #6d5cff'),
  name: z.string().min(1),
})

/**
 * Binds one dimension of the report to the single source image that justifies
 * it. Added in PROMPT_VERSION v3.
 *
 * `image_index` is **1-based** and counts the images in the order the model was
 * shown them — which is the order they are persisted, so the frame it names is
 * `image_urls[image_index - 1]`. That correspondence is the whole value of the
 * field; the ordering invariant that guarantees it is documented on
 * `uploadSourceImages` in src/app/api/aesthetic-dna/route.ts.
 *
 * Deliberately loose here (a bare number, a bare string) because the range and
 * blank-reasoning checks belong to the route, which knows how many images were
 * actually sent. `sanitiseEvidence` there drops any binding that fails them, so
 * one bad exemplar degrades to no exemplar instead of sinking the analysis.
 */
const Evidence = z.object({
  /** 1-based index into the images as presented — see the note above. */
  image_index: z.number(),
  reasoning: z.string(),
})

export type Evidence = z.infer<typeof Evidence>

/**
 * `evidence` is optional on every dimension, and never a reason to reject a
 * report:
 *  - v2 and v1 profiles already in storage have no evidence at all;
 *  - a v3 model may legitimately omit it rather than fabricate an attribution;
 *  - `.catch(undefined)` absorbs a structurally malformed binding (wrong types,
 *    missing keys) so it lands as "no evidence" rather than a schema failure.
 * Same optionality mechanics as `creative_brief` below.
 */
const OptionalEvidence = Evidence.optional().catch(undefined)

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
    evidence: OptionalEvidence,
  }),
  tone: z.object({
    exposure: z.string().min(1),
    shadows: z.string().min(1),
    grain: z.string().min(1),
  }),
  composition: z.object({
    tendencies: z.array(z.string().min(1)).min(2).max(8),
    description: z.string().min(1),
    evidence: OptionalEvidence,
  }),
  mood: z.object({
    descriptors: z.array(z.string().min(1)).min(2).max(8),
    description: z.string().min(1),
    evidence: OptionalEvidence,
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

The images arrive in a fixed order and are numbered from 1: the first image you are shown is Image 1, the second is Image 2, and so on through Image N. Every "image_index" you return refers to that numbering. You will be asked to ground three of the dimensions in a specific image, so keep track of which frame is which as you read the set.

Output ONLY valid JSON matching exactly this shape, with no markdown, no code fences, and no commentary:

{
  "identity": { "archetype": string, "keywords": string[], "summary": string },
  "color": { "palette": [{ "hex": "#rrggbb", "name": string }], "description": string, "evidence": { "image_index": number, "reasoning": string } },
  "tone": { "exposure": string, "shadows": string, "grain": string },
  "composition": { "tendencies": string[], "description": string, "evidence": { "image_index": number, "reasoning": string } },
  "mood": { "descriptors": string[], "description": string, "evidence": { "image_index": number, "reasoning": string } },
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
- "evidence": required on "color", "composition" and "mood". Having written the dimension, point at the ONE image from the set that most strongly demonstrates it, then use that frame to tell the creator something true about how they see.
    - "image_index": an integer from 1 to N, naming that exemplar. It must be an image you were actually shown — never cite a frame outside 1 to N, and never invent one.
    - Choose each exemplar on its own terms. Composition: the frame where the creator's compositional instinct is clearest. Mood: the frame that most fully embodies the mood you described. Colour: the frame where the palette is most concentrated and legible, where a viewer could read the swatches straight off the image. One image may serve two dimensions if it genuinely is the strongest for both.
    - "reasoning": two sentences, second person, about the creator's eye rather than their photograph. The first names something concrete you can genuinely see in THAT frame — the actual wall, the hour of day, the doorway, how far back they stood, which two colours meet — with the creator as its grammatical subject ("You stand back and let…"), never the scene ("The sunlit view…"). The second says what that choice reveals about how they see, as a full sentence with its own verb.
      This field is rewritten by a second, dedicated pass (see EVIDENCE_REASONING_SYSTEM_PROMPT), so keep it short and true rather than polished. What matters here is that the anchor is real.
    - If you genuinely cannot tie a dimension to one particular image, omit "evidence" for that dimension entirely. An honest gap is better than a false attribution — never reach for a detail you cannot actually see, and never stretch a read further than the frame supports.
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

The ${imageCount} images follow in order: the first is Image 1, the last is Image ${imageCount}. Ground three dimensions in a specific frame from that set, using this numbering (1-based) for every "image_index":
- "composition.evidence": the image where this compositional instinct is clearest, and what that instinct says about the way they see.
- "mood.evidence": the image that most embodies the mood, and the choice underneath it — the hour they shoot, the light they wait for, the distance they keep.
- "color.evidence": the image where the palette reads most clearly, and what their eye is doing with those colours.
Each "reasoning" is two sentences, second person, about the creator's eye. The first names a concrete particular you could only have got from looking at that exact frame, with the creator as its subject rather than the scene. The second says what that choice reveals about how they see. Keep it short and true — a later pass does the polishing. Omit a dimension's "evidence" rather than invent one.

Also fill the "creative_brief" object — this is a working creative brief, so be sharp and specific to THIS feed:
- "signature": ONE sentence only, a creative-director logline the creator could use as their north star — not a description.
- "colour_story": 2-3 sentences on why these colours work TOGETHER (the tension/harmony/emotional logic), not a list of what they are.
- "shoot_next": 3-6 concrete, visual shooting directions tied to this identity — name the subject, light, and setting. No generic advice.
- "avoid": 2-5 concrete, visual things that would break this exact identity, each naming the actual element of the DNA it conflicts with.
- "evolution": one paragraph on a natural next step that extends this DNA, referencing what is already present in these images.

Return JSON only.`
}

/** The dimensions the prompt asks to ground in a specific image. */
export const EVIDENCE_DIMENSIONS = ['color', 'composition', 'mood'] as const

export type EvidenceDimension = (typeof EVIDENCE_DIMENSIONS)[number]

/**
 * Temperature for the evidence-reasoning pass, deliberately far below the 0.4
 * the analysis itself runs at.
 *
 * The two calls want opposite things. The analysis wants range — archetype
 * names, palette reads and creative-brief directions all get worse when the
 * model plays it safe. The evidence reasoning wants obedience: it has a fixed
 * two-sentence shape and a list of words it must not use, and at 0.4 gpt-4o
 * reliably ignored both, reverting to the caption idiom it has seen a million
 * times. Since temperature is per-request, buying precision here without
 * flattening the rest of the report means giving this field its own call.
 *
 * 0.2 measured better than both 0.4 and 0 on the same set. Do not take this to
 * zero: greedy decoding fell back HARDER into the caption idiom, reverting the
 * sentence subject to the photograph and reaching for "timeless atmosphere" and
 * "evokes a warm nostalgia" — the very phrases the prompt forbids. The idiom is
 * the highest-probability continuation, so removing sampling noise removes the
 * escape from it.
 */
export const EVIDENCE_REASONING_TEMPERATURE = 0.2

/**
 * Voice spec for the evidence reasoning, split out of SYSTEM_PROMPT so it is
 * the only thing the model is doing when it writes these three sentences.
 * Competing with fifty lines of unrelated schema rules measurably cost it.
 */
export const EVIDENCE_REASONING_SYSTEM_PROMPT = `You are a creative director writing the single line that sits under a frame in a creator's visual-identity report, next to the claim it justifies.

The creator took these photographs. They can see them. Describing a frame back to them tells them nothing they do not already know — your job is to use the frame as evidence for a read on HOW they see, and to tell them something true about their own eye that they may never have put into words.

Three examples at the required standard, from other creators' feeds. Match their shape and their nerve, never their content:
· "Skin stays warm while everything behind it goes grey-green. You protect that separation in every frame, and it is why the people read first and the room second."
· "You stand further back than most people would and let the empty floor take the bottom third. The distance is the point — you photograph rooms that happen to have someone in them."
· "You wait until the strip light is the only source. That flat, unromantic light does the emotional work here, and you trust it to."

Each names something genuinely in its frame — a colour separation, an empty foreground, a single hard light source — and extends it into a read on the creator. The anchor keeps you honest; the read is what makes it worth reading.

STRUCTURE — exactly two sentences, in this order:
  Sentence 1, the anchor. What they did in this frame, named concretely: the actual wall, the hour of day, the doorway, how far back they stood, which two colours meet. Something a reader could point at. The creator must be its grammatical subject — "You stand back and let…", "Your eye goes to…", "Shooting at dusk, you…". Never "The sunlit scene…", "The twilight cityscape…". The moment the photograph becomes the subject, the sentence turns back into a caption.
  Sentence 2, the read. What that choice says about how they see. A full sentence with its own subject and its own finite verb. It must NOT begin with a participle ("highlighting…", "creating…", "capturing…") or trail off sentence 1 as a comma clause — that shape is the machine-caption template, and filler always hides in it.
Sentence 1 alone is a caption. Sentence 2 alone is a horoscope. Neither is worth sending.

RULES:
- Reach for verbs of method: you shoot, wait for, stand back from, crop to, let dominate, protect, refuse, keep returning to. Vary how the two sentences open — do not begin both with "You".
- Liking a subject is not an instinct. "Your interest in old architecture", "your attraction to coastal colour", "your focus on urban life" only name what they point the camera at, which they already know. Read the method instead: where they stand, what they wait for, what they leave out, what they let dominate, which two things they keep putting beside each other, what they are willing to lose to shadow.
- Naming the feeling a picture produces — tranquility, nostalgia, serenity, calm, wanderlust — is filler, not a read. The read is about their method, not the viewer's mood.
- These words are forbidden. Scan each sentence before returning it and rewrite any that contains one: capture, captures, capturing, evokes, embodies, exemplifies, showcases, demonstrates, highlights, emphasizes, reflects, essence, atmosphere, "a sense of", "the viewer's gaze". Photographers do not capture things here — they stand somewhere, wait for something, and leave something out.
- Do not name the dimension back. The colour line must not recite the palette (those swatches already sit on screen beside it), the composition line must not use the word "composition", the mood line must not say "the mood of X".
- Anchor every read to something actually visible in the cited frame. Never invent a detail to make a better sentence, and never stretch a read further than the frame supports. If the frame will not carry the read, write a smaller, truer one.
- The read may draw on the whole set — a habit is only a habit if it recurs — but the anchor must come from the cited frame.
- Last test: could this line be said about a different creator's feed? If yes it has failed, either as description or as flattery. It must be sayable only about this body of work.

Precise, declarative, opinionated without arrogance. One earned observation, not a pile of adjectives.

Return ONLY a JSON object keyed by the dimensions you were asked for, each value the two-sentence string. No markdown, no code fences, no commentary.`

export type EvidenceReasoningTarget = {
  dimension: EvidenceDimension
  imageIndex: number
  description: string
}

/**
 * User prompt for the reasoning pass. The full set is re-sent so a read can
 * reference a recurring habit, but each line stays anchored to its cited frame.
 */
export function buildEvidenceReasoningPrompt(
  imageCount: number,
  archetype: string,
  targets: EvidenceReasoningTarget[]
): string {
  const lines = targets.map(
    (t) =>
      `- "${t.dimension}" — cited frame: Image ${t.imageIndex}. The claim this line has to justify: ${t.description}`
  )

  return `Here are the same ${imageCount} images from this creator's feed, in order: the first is Image 1, the last is Image ${imageCount}.

This feed has already been analysed. Its archetype is "${archetype}". Write the evidence line for each dimension below, anchored to the frame named for it:

${lines.join('\n')}

Return JSON only, exactly this shape, with two sentences per value:
{${targets.map((t) => `\n  "${t.dimension}": string`).join(',')}\n}`
}

const EvidenceReasoningSchema = z.object({
  color: z.string().min(1).optional(),
  composition: z.string().min(1).optional(),
  mood: z.string().min(1).optional(),
})

export type EvidenceReasoningResult =
  | { ok: true; reasoning: Partial<Record<EvidenceDimension, string>> }
  | { ok: false; error: string }

/**
 * Parse the reasoning pass. Returns only non-blank strings for the dimensions
 * that were asked for; anything else is the caller's cue to keep what it had.
 */
export function parseEvidenceReasoning(
  raw: string,
  requested: EvidenceDimension[]
): EvidenceReasoningResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripCodeFences(raw))
  } catch {
    return { ok: false, error: 'Reasoning pass did not return valid JSON.' }
  }

  const result = EvidenceReasoningSchema.safeParse(parsed)
  if (!result.success) {
    return { ok: false, error: 'Reasoning pass did not match the expected shape.' }
  }

  const reasoning: Partial<Record<EvidenceDimension, string>> = {}
  for (const dimension of requested) {
    const value = result.data[dimension]?.trim()
    if (value) reasoning[dimension] = value
  }

  return { ok: true, reasoning }
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
