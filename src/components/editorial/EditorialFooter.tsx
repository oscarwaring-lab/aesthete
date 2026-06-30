/** Editorial footer from the landing spec — italic serif wordmark + tagline. */
import Link from 'next/link'

export function EditorialFooter() {
  return (
    <footer className="site-footer">
      <span className="wm">Aesthete</span>
      <div className="footer-meta">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <p>Your visual world, consistent. © 2026</p>
      </div>
    </footer>
  )
}
