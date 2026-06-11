import Link from 'next/link'

/**
 * The Aesthete wordmark. A subtle gradient sweep on the dot keeps it premium
 * without leaning on an image asset.
 */
export function Wordmark({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--violet))',
        }}
      />
      Aesthete
    </Link>
  )
}
