/** Plate I — The Strand. Seven DNA palette swatches with hex + name. */
const SWATCHES: [fill: string, hex: string, name: string][] = [
  ['var(--dna-amber)', '#C4933A', 'Amber'],
  ['var(--dna-clay)', '#C4834A', 'Clay'],
  ['var(--dna-sage)', '#7A9870', 'Sage'],
  ['var(--dna-rose)', '#C4886A', 'Rose'],
  ['var(--dna-slate)', '#8A9898', 'Slate'],
  ['var(--dna-lilac)', '#B8AEC8', 'Lilac'],
  ['var(--dna-wheat)', '#E8D4B4', 'Wheat'],
]

export function StrandSection() {
  return (
    <section id="specimen" className="strand-sec">
      <div className="plate-tag">
        <span className="no">Plate I</span>
        <span className="rule" />
        <span className="meta">The Strand</span>
      </div>
      <h2 style={{ fontSize: 'clamp(32px,4.4vw,64px)', maxWidth: '16ch' }}>
        Every identity resolves to five colours.
      </h2>
      <div className="strand-grid">
        {SWATCHES.map(([fill, hex, name], i) => (
          <div className="swatch" key={hex}>
            <div className="fill" style={{ background: fill }} />
            <div className="idx meta" style={{ color: 'rgba(0,0,0,.5)' }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div className="plate">
              <div className="hex" style={{ color: 'rgba(0,0,0,.55)' }}>
                {hex}
              </div>
              <div className="nm" style={{ color: '#111110' }}>
                {name}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="strand-caption">
        Aesthete pulls these five colours from your actual feed and pins them
        like plates in a field guide. Your audience already recognises this
        signature, even if you&apos;ve never named it.
      </p>
    </section>
  )
}
