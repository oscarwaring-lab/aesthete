import Link from 'next/link'

/** Closing CTA — "Open now · Free to start" → Join today → /signup. */
export function CtaSection() {
  return (
    <section id="access" className="cta">
      <div className="cta-field" aria-hidden="true" />
      <div className="cta-inner">
        <div className="meta meta--amber" style={{ marginBottom: '24px' }}>
          Open now · Free to start
        </div>
        <h2>
          See your feed the way
          <br />
          your audience <em>already does.</em>
        </h2>
        <p>
          Create your account and run your first Aesthetic DNA analysis free.
          Paid plans arrive later; for now the studio is open.
        </p>
        <Link href="/signup" className="btn-primary">
          Join today
        </Link>
        <div className="meta early">
          No card required · Your first analysis is free
        </div>
      </div>
    </section>
  )
}
