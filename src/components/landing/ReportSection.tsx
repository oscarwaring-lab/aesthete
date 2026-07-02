/** Plate II — The Report. Dark graded plate with a glass report card. The
 * `.countup` score is animated by FancyLayer when scrolled into view. */
const BANDS = [
  'var(--dna-sage)',
  'var(--dna-slate)',
  'var(--dna-amber)',
  'var(--dna-clay)',
  'var(--dna-wheat)',
]

export function ReportSection() {
  return (
    <section id="report" className="demo">
      <div className="demo-field obs">
        <div className="grain-frame" />
        <div className="report-glass">
          <div className="meta" style={{ marginBottom: '14px' }}>
            DNA Report · No. 004
          </div>
          <div className="rg-top">
            <h3>Epic Naturalist</h3>
            <div className="rg-score countup" data-to="92">
              0
            </div>
          </div>
          <div className="rg-bands">
            {BANDS.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
          <div className="report-row">
            <span className="rk">Exposure</span>
            <span className="rv">Deep, controlled</span>
          </div>
          <div className="report-row">
            <span className="rk">Composition</span>
            <span className="rv">Rule-of-thirds, wide</span>
          </div>
          <div className="report-row">
            <span className="rk">Signature</span>
            <span className="rv">Scale over subject</span>
          </div>
          <div className="report-row">
            <span className="rk">Curated for</span>
            <span className="rv" style={{ color: 'var(--amber)' }}>
              @....
            </span>
          </div>
        </div>
      </div>

      <div className="demo-copy obs">
        <div className="plate-tag">
          <span className="no">Plate II</span>
          <span className="rule" />
          <span className="meta">The Report</span>
        </div>
        <h2>
          A brief you could
          <br />
          hand to a stylist.
        </h2>
        <p>
          Upload a set of images. Aesthete returns your archetype, a named
          palette, a tonal grade direction, your compositional tendencies, and a
          consistency score it builds from evidence rather than guesswork.
        </p>
        <ul className="demo-list">
          <li>
            <span className="n">01</span>
            <div>
              <div className="t">Archetype &amp; signature</div>
              <div className="d">
                The one line your feed is already reaching for.
              </div>
            </div>
          </li>
          <li>
            <span className="n">02</span>
            <div>
              <div className="t">Consistency score</div>
              <div className="d">
                The rubric names every deviation before it assigns a number.
              </div>
            </div>
          </li>
          <li>
            <span className="n">03</span>
            <div>
              <div className="t">Shoot-next directions</div>
              <div className="d">
                The frames to shoot next, and the moves that break your identity.
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  )
}
