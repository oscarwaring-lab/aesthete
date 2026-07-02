/** Plate VI — The Instruments. Six-cell feature grid. */
const FEATURES: [dot: string, fig: string, title: string, body: string][] = [
  ['var(--dna-amber)', 'Fig. 01', 'Aesthetic DNA', 'Palette, tone, mood and composition codified into one legible brief.'],
  ['var(--dna-sage)', 'Fig. 02', 'Continuity scoring', 'Score any post against your DNA, dimension by dimension.'],
  ['var(--dna-rose)', 'Fig. 03', 'Score history', 'Consistency plotted over time as a quiet amber sparkline.'],
  ['var(--dna-clay)', 'Fig. 04', 'Content pillars', 'Analyse up to three shoot types under one identity.'],
  ['var(--dna-slate)', 'Fig. 05', 'Adaptive report card', 'Light or dark, chosen automatically from your palette’s luminance.'],
  ['var(--dna-lilac)', 'Fig. 06', 'Shareable report', 'A framed, public report you can hand to anyone, curated for your handle.'],
]

export function FeaturesSection() {
  return (
    <section id="features">
      <div className="plate-tag">
        <span className="no">Plate VI</span>
        <span className="rule" />
        <span className="meta">The Instruments</span>
      </div>
      <h2 style={{ fontSize: 'clamp(32px,4.4vw,64px)', maxWidth: '16ch' }}>
        Everything a visual identity needs to stay itself.
      </h2>
      <div className="feat-grid">
        {FEATURES.map(([dot, fig, title, body]) => (
          <div className="feat obs" key={fig}>
            <div className="dot" style={{ background: dot }} />
            <div className="fno">{fig}</div>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
