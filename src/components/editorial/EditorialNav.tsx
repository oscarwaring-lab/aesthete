import Link from 'next/link'

/**
 * Fixed editorial nav from the landing spec — serif wordmark, uppercase
 * centre links, prussian "Begin" CTA. Shared across the public cream pages.
 * `showLinks` hides the centre links on framed pages (share/auth).
 */
export function EditorialNav({ showLinks = true }: { showLinks?: boolean }) {
  return (
    <header className="site-header">
      <nav>
        <Link className="wordmark" href="/">
          Aesthete
        </Link>
        {showLinks && (
          <div className="nav-center">
            <a href="/#work">Work</a>
            <a href="/#process">Process</a>
            <a href="/#pricing">Pricing</a>
          </div>
        )}
        <Link className="nav-cta" href="/signup">
          Begin →
        </Link>
      </nav>
    </header>
  )
}
