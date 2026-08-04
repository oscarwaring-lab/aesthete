/**
 * Illustrative archetype data for the marketing landing page — the gallery and
 * the interactive "try-it" demo. These are NOT real creators: no real photos or
 * handles are ever published here (all handles render as the literal `@....`).
 * The shapes mirror the real product schema (creative_brief.shoot_next / avoid),
 * so a future version can swap this sample data for a live call.
 *
 * Ported verbatim from design/landing-prototype.html (`ARCH` and `SAMPLES`).
 */

/** A licensed sample photograph illustrating an archetype (not a creator upload). */
export type ArchetypePhoto = {
  /** Image CDN id, e.g. 'photo-1784732350314-3aca04d860b0'. */
  id: string
  alt: string
  /** Photographer display name (credited on the panel). */
  by: string
  /** Optional object-position for the crop (e.g. '50% 22%' to keep a face). */
  pos?: string
}

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
  /** Optional illustrative photograph, graded to the house look on the panel. */
  photo?: ArchetypePhoto
}

/** Build a sized image CDN URL for a photo id (next/image resizes further). */
export function unsplashSrc(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=faces,edges&q=80`
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
    photo: {
      id: 'photo-1782229296900-2511950b8fda',
      alt: 'A figure walks a narrow, sunlit alley',
      by: 'Anastase Maragos',
    },
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
    photo: {
      id: 'photo-1784732350314-3aca04d860b0',
      alt: 'A lone figure on a sunlit forest path',
      by: 'Adrian Rudzki',
    },
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
    palette: ['#C98A5E', '#A7A29A', '#3D5E5C', '#9C5A3E', '#1E1A17'],
    grade:
      'radial-gradient(120% 100% at 30% 22%,#d29a63,transparent 52%),radial-gradient(120% 100% at 82% 82%,#2a211b,transparent 55%),linear-gradient(150deg,#7a5a3f,#201a16)',
    photo: {
      id: 'photo-1784850061466-410da2e6c3fb',
      alt: 'A stylish woman posing against a sticker-covered wall',
      by: 'Jahanzeb Ahsan',
      pos: '50% 22%',
    },
  },
  {
    name: 'Urban Explorer',
    score: 91,
    tone: 'Moody contrast',
    mood: ['Kinetic', 'Nocturnal', 'Graphic'],
    sig: 'Chase light through the dark.',
    shoot: [
      'Pools of coloured light in deep shadow',
      'Single figures caught mid-motion',
      'Hard backlight, haze and lens flare',
    ],
    avoid: [
      'Flat daytime overcast light',
      'Pastel or washed palettes',
      'Static, evenly-lit scenes',
    ],
    palette: ['#5C7E4E', '#2C3A2A', '#8FA47E', '#161A17', '#C4933A'],
    grade:
      'radial-gradient(120% 100% at 80% 22%,#6e9a52,transparent 45%),radial-gradient(120% 100% at 15% 85%,#1b2a1e,transparent 55%),linear-gradient(160deg,#243026,#0f150f)',
    photo: {
      id: 'photo-1783591955200-35732f39842b',
      alt: 'A DJ works beneath green stage light',
      by: 'Marcel Strauß',
    },
  },
  {
    name: 'Coastal Minimalist',
    score: 89,
    tone: 'Cool, clear',
    mood: ['Clear', 'Cool', 'Tidal'],
    sig: 'Let the water hold the frame.',
    shoot: [
      'Clear water as a single colour field',
      'Negative space around a lone subject',
      'Overhead or waterline vantage points',
    ],
    avoid: [
      'Dense, busy foregrounds',
      'Muddy or warm colour casts',
      'Heavy contrast and deep blacks',
    ],
    palette: ['#4FA3AC', '#93C4CB', '#E6DBC3', '#C89A76', '#2C6B75'],
    grade:
      'radial-gradient(120% 100% at 20% 20%,#bfe1e2,transparent 55%),radial-gradient(120% 100% at 85% 80%,#5aa6ae,transparent 55%),linear-gradient(150deg,#8fc2c6,#2f6f78)',
    photo: {
      id: 'photo-1782179284415-3dbc06bd4a23',
      alt: 'A swimmer floats in clear turquoise water',
      by: 'Anastase Maragos',
    },
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
    palette: ['#C98C86', '#E6CAC2', '#8C9A6C', '#F2ECE0', '#5A4942'],
    grade:
      'radial-gradient(120% 100% at 25% 20%,#f0dcd4,transparent 55%),radial-gradient(120% 100% at 85% 85%,#cfa2a0,transparent 50%),linear-gradient(150deg,#e7cfc6,#9a7a70)',
    photo: {
      id: 'photo-1780963542357-038555963e92',
      alt: 'A figure walks under a blooming rose archway',
      by: 'Chloe',
    },
  },
]

export type DemoSample = {
  label: string
  /** Index into ARCHETYPES, the reading this sample resolves to. */
  dnaIndex: number
  /** Eight colour-grade tiles; the four not covered by a photo show through. */
  tiles: string[]
  /**
   * Four image CDN ids placed at PHOTO_SLOTS in the stage (and filling the
   * 2x2 picker preview). The remaining stage tiles stay colour grades drawn
   * from these photos' own palettes. Must not reuse any ARCHETYPES photo.
   */
  photos?: string[]
  /** Photographer names for the four photos, in the same order. */
  credits?: string[]
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    label: 'Golden hour',
    dnaIndex: 0,
    photos: [
      'photo-1780545311196-f8b507b08b94', // 蔡 世宏 — silhouette in a field at sunset
      'photo-1782582309438-fc97879e2c25', // Katarzyna Korobczuk — woman in sunlit grass
      'photo-1783431286496-e8032a0f7997', // Tanya Prodaan — windblown hair, film
      'photo-1783201033538-85c76cf0ba05', // Barney Goodman — sunlit silhouettes
    ],
    credits: ['蔡 世宏', 'Katarzyna Korobczuk', 'Tanya Prodaan', 'Barney Goodman'],
    // Grades drawn from the four photos' own palettes (warm ambers, browns, cream).
    tiles: [
      'linear-gradient(135deg,#A4560F,#5D2704)',
      'linear-gradient(135deg,#E3D39B,#985B33)',
      'linear-gradient(135deg,#CBB098,#634B31)',
      'linear-gradient(135deg,#635327,#2D2618)',
      'linear-gradient(135deg,#985B33,#51351F)',
      'linear-gradient(135deg,#E1DFE0,#CBB098)',
      'linear-gradient(135deg,#A4560F,#E3D39B)',
      'linear-gradient(135deg,#4A3722,#27210F)',
    ],
  },
  {
    label: 'Coastal',
    dnaIndex: 4,
    photos: [
      'photo-1777579173763-b7539bf1ed37', // Adam Kring — boy in ocean waves at sunset
      'photo-1626701594060-8329551e05bc', // Nataliya Melnychuk — white dress on sea rocks
      'photo-1783001165619-38741be6ce27', // Nick Page — palm beach, film light leak
      'photo-1779804597877-63adc699f00b', // ONUR KURT — pier and kayak at sunset
    ],
    credits: ['Adam Kring', 'Nataliya Melnychuk', 'Nick Page', 'ONUR KURT'],
    // Grades drawn from the four photos' own palettes (sea blues, teal, cream).
    tiles: [
      'linear-gradient(135deg,#93B4CB,#5B6259)',
      'linear-gradient(135deg,#B0C8D9,#5D5D63)',
      'linear-gradient(135deg,#D5D9D6,#9297A1)',
      'linear-gradient(135deg,#A0A4A6,#586A6A)',
      'linear-gradient(135deg,#93B4CB,#202621)',
      'linear-gradient(135deg,#E1DEE4,#B0C8D9)',
      'linear-gradient(135deg,#586A6A,#252420)',
      'linear-gradient(135deg,#CEC3C5,#9297A1)',
    ],
  },
  {
    label: 'Wild',
    dnaIndex: 1,
    photos: [
      'photo-1780846324853-765233ab5f31', // Lei Hwang — flowery field, snow mountains
      'photo-1779226347538-ca1a725ae550', // LOGAN WEAVER — rooftop tent in dry hills
      'photo-1777993325982-d0e9e0f61cfb', // Long Chung — figure in a blooming field
      'photo-1780408921631-0faac2a0c8a4', // Evgeny Matveev — ancient temple entrance
    ],
    credits: ['Lei Hwang', 'LOGAN WEAVER', 'Long Chung', 'Evgeny Matveev'],
    // Grades drawn from the four photos' own palettes (greens, olive, earth, sky).
    tiles: [
      'linear-gradient(135deg,#738C49,#526E33)',
      'linear-gradient(135deg,#9D8D5E,#575633)',
      'linear-gradient(135deg,#685A4C,#29211C)',
      'linear-gradient(135deg,#5D98B2,#696651)',
      'linear-gradient(135deg,#526E33,#252D18)',
      'linear-gradient(135deg,#8E9557,#63684E)',
      'linear-gradient(135deg,#47372B,#29211C)',
      'linear-gradient(135deg,#738C49,#9D8D5E)',
    ],
  },
]
