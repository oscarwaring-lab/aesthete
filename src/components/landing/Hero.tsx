import Link from 'next/link'

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
