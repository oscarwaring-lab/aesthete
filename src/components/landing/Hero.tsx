import Link from 'next/link'

// Warm, golden-hour sample frames for the hero's Instagram-profile mockup that
// sits behind the specimen card (decorative — it shows the "feed" being read).
const FEED_IDS = [
  'photo-1780545311196-f8b507b08b94',
  'photo-1782229296900-2511950b8fda',
  'photo-1779804597877-63adc699f00b',
  'photo-1782582309438-fc97879e2c25',
  'photo-1784151439761-fa91c2f664fc',
  'photo-1777579173763-b7539bf1ed37',
  'photo-1783201033538-85c76cf0ba05',
  'photo-1780963542357-038555963e92',
  'photo-1783431286496-e8032a0f7997',
]
const feedSrc = (id: string, w = 220) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=faces,edges&q=70&w=${w}`

/**
 * Hero — drifting colour meshes behind a rotated glass "specimen" card, with
 * floating chips and a count-up consistency score. The cursor-tilt and the
 * `.countup` animation are wired by FancyLayer after mount.
 */
export function Hero() {
  return (
    <header className="hero">
      <div className="hero-field" aria-hidden="true">
        <div className="mesh m1" />
        <div className="mesh m2" />
        <div className="mesh m3" />
      </div>

      <div className="hero-copy">
        <div className="meta meta--amber eyebrow reveal d1">
          Aesthetic DNA · Est. 2026 · No. 001
        </div>
        <h1 className="reveal d2">
          Your visual
          <br />
          identity, <em>codified.</em>
        </h1>
        <p className="lede reveal d3">
          Aesthete reads your feed&apos;s palette, tone, mood and composition,
          then returns a creative brief precise enough to art-direct from. The
          creative director you don&apos;t have.
        </p>
        <div className="hero-actions reveal d4">
          <Link href="/signup" className="btn-primary">
            Join today
          </Link>
          <a href="#demo" className="btn-ghost">
            Try the demo
          </a>
        </div>
      </div>

      <div className="specimen-stage reveal d3">
        <div className="spec-feed" aria-hidden="true">
          <div className="sf-top">
            <span
              className="sf-avatar"
              style={{ backgroundImage: `url(${feedSrc('photo-1783431286496-e8032a0f7997', 120)})` }}
            />
            <div className="sf-info">
              <div className="sf-handle">@....</div>
              <div className="sf-stats">
                <span>
                  <b>128</b> posts
                </span>
                <span>
                  <b>8,420</b> followers
                </span>
                <span>
                  <b>326</b> following
                </span>
              </div>
            </div>
          </div>
          <div className="sf-bio">Golden hours · film · sun-chasing</div>
          <div className="sf-grid">
            {FEED_IDS.map((id) => (
              <span
                key={id}
                className="sf-cell"
                style={{ backgroundImage: `url(${feedSrc(id)})` }}
              />
            ))}
          </div>
        </div>
        <div className="chip chip-1">
          <i style={{ background: 'var(--dna-sage)' }} /> Sunset Wanderlust
        </div>
        <div className="chip chip-2">
          <i style={{ background: 'var(--dna-amber)' }} /> Consistency 91
        </div>
        <div className="glass-card spec-card">
          <div className="head">
            <div>
              <div className="meta">Archetype</div>
              <div className="archetype">
                Sunset
                <br />
                Wanderlust
              </div>
              <div className="meta curated" style={{ color: 'rgba(196,147,58,.8)' }}>
                Curated by Aesthete for @....
              </div>
            </div>
            <div className="score">
              <span className="countup" data-to="91">
                0
              </span>
              <small>Consistency</small>
            </div>
          </div>
          <div className="meta" style={{ marginBottom: '8px' }}>
            Palette · The strand
          </div>
          <div className="spec-bands">
            <span style={{ background: 'var(--dna-amber)' }} />
            <span style={{ background: 'var(--dna-clay)' }} />
            <span style={{ background: 'var(--dna-wheat)' }} />
            <span style={{ background: 'var(--dna-rose)' }} />
            <span style={{ background: 'var(--dna-slate)' }} />
          </div>
          <div className="spec-meta-row">
            <div>
              <div className="k">Exposure</div>
              <div className="v">Warm, lifted</div>
            </div>
            <div>
              <div className="k">Grain</div>
              <div className="v">Fine, filmic</div>
            </div>
            <div>
              <div className="k">Mood</div>
              <div className="v">Nostalgic</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
