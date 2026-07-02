/**
 * Illustrative archetype data for the marketing landing page — the gallery and
 * the interactive "try-it" demo. These are NOT real creators: no real photos or
 * handles are ever published here (all handles render as the literal `@....`).
 * The shapes mirror the real product schema (creative_brief.shoot_next / avoid),
 * so a future version can swap this sample data for a live call.
 *
 * Ported verbatim from design/landing-prototype.html (`ARCH` and `SAMPLES`).
 */

export type Archetype = {
  name: string
  score: number
  tone: string
  mood: string[]
  sig: string
  palette: string[]
  grade: string
  shoot: string[]
  avoid: string[]
}

export const ARCHETYPES: Archetype[] = [
  {
    name: 'Sunset Wanderlust',
    score: 91,
    tone: 'Warm, lifted',
    mood: ['Nostalgic', 'Golden', 'Roaming'],
    sig: 'Chase the last hour of light.',
    shoot: [
      'Backlit portraits in the last hour of light',
      'Wide horizons with the sun low and flaring',
      'Warm interiors lit by a single window',
    ],
    avoid: [
      'Cool blue midday light',
      'Hard flash and sharp shadows',
      'Busy, high-saturation backgrounds',
    ],
    palette: ['#C4933A', '#C4834A', '#E8D4B4', '#C4886A', '#8A9898'],
    grade:
      'radial-gradient(120% 100% at 15% 20%,#E8B26A,transparent 55%),radial-gradient(120% 100% at 85% 80%,#C4886A,transparent 55%),linear-gradient(140deg,#C4933A,#7a5a3a)',
  },
  {
    name: 'Epic Naturalist',
    score: 92,
    tone: 'Deep, controlled',
    mood: ['Vast', 'Grounded', 'Elemental'],
    sig: 'Let scale dwarf the subject.',
    shoot: [
      'A lone figure against vast landscape',
      'Aerial or elevated wide vantage points',
      'Texture studies of rock, water and sky',
    ],
    avoid: [
      'Tight crops that lose the scale',
      'Neon or artificial colour',
      'Cluttered urban frames',
    ],
    palette: ['#7A9870', '#8A9898', '#5c6b57', '#C4933A', '#E8D4B4'],
    grade:
      'radial-gradient(120% 100% at 20% 15%,#9fb38f,transparent 55%),radial-gradient(120% 100% at 80% 85%,#3f4d43,transparent 55%),linear-gradient(160deg,#5c6b57,#26302a)',
  },
  {
    name: 'Effortless Retro Chic',
    score: 88,
    tone: 'Faded film',
    mood: ['Undone', 'Analog', 'Timeless'],
    sig: 'Let the grain do the talking.',
    shoot: [
      'Grainy film portraits, soft focus',
      'Candid moments over posed shots',
      'Muted daylight interiors',
    ],
    avoid: [
      'Over-sharpened digital clarity',
      'Cool white balance',
      'Heavy retouching',
    ],
    palette: ['#C4834A', '#E8D4B4', '#C4933A', '#B8AEC8', '#8A9898'],
    grade:
      'radial-gradient(120% 100% at 25% 25%,#e6cfa8,transparent 55%),radial-gradient(120% 100% at 80% 80%,#b98f66,transparent 55%),linear-gradient(150deg,#cbb18a,#8a6f57)',
  },
  {
    name: 'Urban Explorer',
    score: 91,
    tone: 'Moody contrast',
    mood: ['Kinetic', 'Nocturnal', 'Graphic'],
    sig: 'Find the light in the concrete.',
    shoot: [
      'Neon reflections on wet streets',
      'Single figures dwarfed by architecture',
      'Pools of light in deep shadow',
    ],
    avoid: [
      'Flat daytime overcast light',
      'Pastel or washed palettes',
      'Symmetrical, centred compositions',
    ],
    palette: ['#8A9898', '#1E3A5F', '#C4933A', '#3a3a44', '#E8D4B4'],
    grade:
      'radial-gradient(120% 100% at 80% 22%,#C4933A,transparent 45%),radial-gradient(120% 100% at 15% 85%,#1E3A5F,transparent 55%),linear-gradient(160deg,#2b2b34,#131319)',
  },
  {
    name: 'Coastal Minimalist',
    score: 89,
    tone: 'Airy, sun-bleached',
    mood: ['Breezy', 'Quiet', 'Tidal'],
    sig: 'Leave room for the sky.',
    shoot: [
      'Wide skies with a low horizon line',
      'Negative space around a single subject',
      'Soft overcast or early-morning light',
    ],
    avoid: [
      'Dense, busy foregrounds',
      'Heavy contrast and deep blacks',
      'Warm golden-hour tones',
    ],
    palette: ['#8A9898', '#E8D4B4', '#7A9870', '#f3f1ea', '#B8AEC8'],
    grade:
      'radial-gradient(120% 100% at 20% 20%,#eef2f0,transparent 55%),radial-gradient(120% 100% at 85% 80%,#a9bcbf,transparent 55%),linear-gradient(150deg,#d7e0dd,#9fb0b0)',
  },
  {
    name: 'Warm Editorial',
    score: 93,
    tone: 'Printed, matte',
    mood: ['Composed', 'Inked', 'Considered'],
    sig: 'Compose it like a page.',
    shoot: [
      'Composed still lifes with room to breathe',
      'Ink-dark accents against cream',
      'Symmetry and clean typographic space',
    ],
    avoid: [
      'Snapshot spontaneity',
      'Clashing saturated colour',
      'Cramped, edge-to-edge framing',
    ],
    palette: ['#faf9f5', '#1E3A5F', '#C4933A', '#C4834A', '#dddad0'],
    grade:
      'radial-gradient(120% 100% at 25% 20%,#f3ede1,transparent 55%),radial-gradient(120% 100% at 85% 85%,#d8c39a,transparent 50%),linear-gradient(150deg,#efe9dd,#cdbfa4)',
  },
]

export type DemoSample = {
  label: string
  /** Index into ARCHETYPES — the reading this sample resolves to. */
  dnaIndex: number
  tiles: string[]
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    label: 'Golden hour',
    dnaIndex: 0,
    tiles: [
      'linear-gradient(135deg,#E8B26A,#C4834A)',
      'linear-gradient(135deg,#C4886A,#7a5a4a)',
      'linear-gradient(135deg,#E8D4B4,#C4933A)',
      'linear-gradient(135deg,#C4933A,#7a5a3a)',
      'linear-gradient(135deg,#8A9898,#C4886A)',
      'linear-gradient(135deg,#C4834A,#E8D4B4)',
      'linear-gradient(135deg,#b98f66,#C4933A)',
      'linear-gradient(135deg,#C4886A,#E8D4B4)',
    ],
  },
  {
    label: 'Coastal',
    dnaIndex: 4,
    tiles: [
      'linear-gradient(135deg,#d7e0dd,#9fb0b0)',
      'linear-gradient(135deg,#E8D4B4,#f3f1ea)',
      'linear-gradient(135deg,#8A9898,#b9c6c6)',
      'linear-gradient(135deg,#7A9870,#a9bcbf)',
      'linear-gradient(135deg,#eef2f0,#c4d0cd)',
      'linear-gradient(135deg,#B8AEC8,#d7e0dd)',
      'linear-gradient(135deg,#9fb0b0,#E8D4B4)',
      'linear-gradient(135deg,#f3f1ea,#8A9898)',
    ],
  },
  {
    label: 'Urban night',
    dnaIndex: 3,
    tiles: [
      'linear-gradient(135deg,#2b2b34,#131319)',
      'linear-gradient(135deg,#1E3A5F,#2b2b34)',
      'linear-gradient(135deg,#C4933A,#5a4526)',
      'linear-gradient(135deg,#3a3a44,#8A9898)',
      'linear-gradient(135deg,#131319,#1E3A5F)',
      'linear-gradient(135deg,#8A9898,#2b2b34)',
      'linear-gradient(135deg,#2b2b34,#C4933A)',
      'linear-gradient(135deg,#1E3A5F,#131319)',
    ],
  },
]
