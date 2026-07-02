import Link from 'next/link'

/** Five-swatch DNA strand beside the wordmark. */
const STRAND = [
  'var(--dna-amber)',
  'var(--dna-clay)',
  'var(--dna-sage)',
  'var(--dna-rose)',
  'var(--dna-lilac)',
]

/** In-page plate anchors — only rendered on the landing page. */
const LINKS: [href: string, label: string][] = [
  ['#specimen', 'The Strand'],
  ['#report', 'The Report'],
  ['#archetypes', 'Archetypes'],
  ['#process', 'Process'],
  ['#studio', 'Studio'],
]

/**
 * Fixed glass nav from the Liquid Glass prototype — Æ monogram, wordmark,
 * DNA strand, plate links, and a dark "Join today" pill. Shared across the
 * public cream pages; framed pages (share/auth/legal) pass `showLinks={false}`
 * so only the brand + CTA show.
 */
export function EditorialNav({ showLinks = true }: { showLinks?: boolean }) {
  return (
    <header className="site-header">
      <nav>
        <Link className="brand" href="/">
          <span className="mono">Æ</span>
          <span className="wm">Aesthete</span>
          <span className="strand" aria-hidden="true">
            {STRAND.map((c, i) => (
              <i key={i} style={{ background: c }} />
            ))}
          </span>
        </Link>
        {showLinks && (
          <ul className="nav-links">
            {LINKS.map(([href, label]) => (
              <li key={href}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        )}
        <Link className="nav-cta" href="/signup">
          Join today
        </Link>
      </nav>
    </header>
  )
}
