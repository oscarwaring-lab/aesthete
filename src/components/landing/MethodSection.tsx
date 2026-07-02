/** Plate V — The Method. Three glass step cards. */
const STEPS: [bar: string, no: string, title: string, body: string][] = [
  [
    'var(--dna-amber)',
    'Step I',
    'Submit the images',
    'Drop in a representative set of images. You bring the taste; Aesthete handles the compression and framing.',
  ],
  [
    'var(--dna-sage)',
    'Step II',
    'Extract the DNA',
    'Aesthete reads palette, exposure, grain, composition and mood, then codifies them into a brief you can repeat.',
  ],
  [
    'var(--dna-rose)',
    'Step III',
    'Hold the line',
    'Score every new post against your DNA and watch continuity trend over time. Your identity holds as you scale.',
  ],
]

export function MethodSection() {
  return (
    <section id="process" className="process-sec">
      <div className="plate-tag">
        <span className="no">Plate V</span>
        <span className="rule" />
        <span className="meta">The Method</span>
      </div>
      <h2 style={{ fontSize: 'clamp(32px,4.4vw,64px)', maxWidth: '18ch' }}>
        Three steps from feed to field guide.
      </h2>
      <div className="steps">
        {STEPS.map(([bar, no, title, body]) => (
          <div className="step obs" key={no}>
            <div className="swatchbar" style={{ background: bar }} />
            <div className="st-no">{no}</div>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
