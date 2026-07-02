/** Plate VII — The Studio. Dark section with glass-on-dark cards, a sparkline
 * and the DNA strand, plus three stats. */
const DB_BANDS = [
  'var(--dna-slate)',
  'var(--dna-amber)',
  'var(--dna-clay)',
  'var(--dna-sage)',
  'var(--dna-wheat)',
]

export function DarkroomSection() {
  return (
    <section id="studio" className="darkroom">
      <div className="dr-wrap">
        <div className="dr-copy obs">
          <div className="plate-tag">
            <span className="no">Plate VII</span>
            <span className="rule" />
            <span className="meta">The Studio</span>
          </div>
          <h2>
            Bright reports.
            <br />
            <em>Dark studio.</em>
          </h2>
          <p>
            The public work lives on cream, like a magazine page. The tools live
            in a dark studio, where your DNA, continuity checks and pillar
            analyses sit under one quiet light.
          </p>
          <div className="dr-stat-row">
            <div className="dr-stat">
              <div className="num">5</div>
              <div className="lbl">Palette colours</div>
            </div>
            <div className="dr-stat">
              <div className="num">4</div>
              <div className="lbl">DNA dimensions</div>
            </div>
            <div className="dr-stat">
              <div className="num">∞</div>
              <div className="lbl">Continuity checks</div>
            </div>
          </div>
        </div>

        <div className="dr-visual obs">
          <div className="darkglass dg-1">
            <div className="dark-k">Continuity · @....</div>
            <div className="dark-v">Urban Explorer · 91</div>
            <svg className="sparkline" viewBox="0 0 240 52" preserveAspectRatio="none">
              <polyline
                points="0,40 40,34 80,38 120,22 160,26 200,14 240,18"
                fill="none"
                stroke="#C4933A"
                strokeWidth="2"
              />
              <circle cx="240" cy="18" r="3.5" fill="#C4933A" />
            </svg>
          </div>
          <div className="darkglass dg-2">
            <div className="dark-k">The strand</div>
            <div className="db">
              {DB_BANDS.map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
