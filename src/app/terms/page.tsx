import type { Metadata } from 'next'
import Link from 'next/link'
import { EditorialNav } from '@/components/editorial/EditorialNav'
import { EditorialFooter } from '@/components/editorial/EditorialFooter'

export const metadata: Metadata = {
  title: 'Terms of Service — Aesthete',
  description: 'The terms governing your use of Aesthete.',
}

export default function TermsPage() {
  return (
    <div className="editorial flex min-h-screen flex-col">
      <EditorialNav showLinks={false} />

      <main className="legal-main">
        <p className="label legal-eyebrow">Aesthete</p>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated 30 June 2026</p>

        <p>
          These terms govern your use of Aesthete at getaesthete.com. By creating an account
          or using the service, you agree to them. Questions:{' '}
          <a href="mailto:hello@getaesthete.com">hello@getaesthete.com</a>.
        </p>

        <h2>The service</h2>
        <p>
          Aesthete analyses images you upload and returns an Aesthetic DNA report, continuity
          scores and related creative guidance. The product is in active development and
          features may change.
        </p>

        <h2>Your account</h2>
        <p>
          You must provide accurate information and are responsible for activity under your
          account. You must be at least 16 years old to use Aesthete.
        </p>

        <h2>Your content</h2>
        <p>
          You keep ownership of the images you upload. By uploading them, you confirm you have
          the right to do so, and you grant us a limited licence to process and store them
          solely to provide the service to you. We do not sell your content or use it to train
          third-party models.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Do not upload content you do not have the rights to.</li>
          <li>Do not upload unlawful, infringing or harmful material.</li>
          <li>Do not attempt to disrupt, reverse-engineer or abuse the service.</li>
        </ul>

        <h2>AI output</h2>
        <p>
          Reports and scores are generated automatically and offered as creative direction,
          not professional, legal or commercial advice. We do not guarantee any particular
          result, ranking or outcome from using them.
        </p>

        <h2>Payment</h2>
        <p>
          Aesthete is currently free in early access. If paid plans are introduced, pricing
          and billing terms will be presented before you subscribe, and payments will be
          processed by Stripe.
        </p>

        <h2>Availability</h2>
        <p>
          The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We may
          modify, suspend or discontinue any part of it, and we do not warrant that it will be
          uninterrupted or error-free.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Aesthete is not liable for any indirect,
          incidental or consequential loss arising from your use of the service. Nothing in
          these terms excludes rights that cannot lawfully be excluded.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using Aesthete and request account deletion at any time. We may suspend
          or end access if these terms are breached.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of Australia. We may update them as the product
          evolves; material changes are reflected by the date above.
        </p>

        <p className="legal-foot">
          See also our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </main>

      <EditorialFooter />
    </div>
  )
}
