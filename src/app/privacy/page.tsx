import type { Metadata } from 'next'
import Link from 'next/link'
import { EditorialNav } from '@/components/editorial/EditorialNav'
import { EditorialFooter } from '@/components/editorial/EditorialFooter'

export const metadata: Metadata = {
  title: 'Privacy Policy — Aesthete',
  description: 'How Aesthete collects, uses and protects your information.',
}

export default function PrivacyPage() {
  return (
    <div className="editorial flex min-h-screen flex-col">
      <EditorialNav showLinks={false} />

      <main className="legal-main">
        <p className="label legal-eyebrow">Aesthete</p>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated 30 June 2026</p>

        <p>
          Aesthete (&ldquo;Aesthete&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates
          getaesthete.com. This policy explains what we collect, why, and the choices you
          have. Questions: <a href="mailto:hello@getaesthete.com">hello@getaesthete.com</a>.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details</strong> — your email address and authentication data when you sign up or sign in (including via Google).</li>
          <li><strong>Content you upload</strong> — the images you submit for analysis and any handles or labels you add to them.</li>
          <li><strong>Usage data</strong> — basic, privacy-respecting information about how you use the product, used to operate and improve it.</li>
          <li><strong>Payment details</strong> — if and when paid plans are enabled, payments are handled by Stripe. We do not see or store your full card details.</li>
        </ul>

        <h2>How we use it</h2>
        <ul>
          <li>To produce your Aesthetic DNA reports and continuity scores.</li>
          <li>To create and secure your account and send essential service emails (sign-up confirmation, password resets).</li>
          <li>To maintain, debug and improve the service.</li>
        </ul>

        <h2>AI processing</h2>
        <p>
          To analyse your feed, the images you upload are sent to our AI provider (OpenAI)
          for processing. Content sent through their API is not used to train their models.
          The analysis is generated automatically and is provided as creative guidance.
        </p>

        <h2>Service providers</h2>
        <p>
          We rely on a small set of processors to run Aesthete: Supabase (authentication,
          database and image storage), OpenAI (image analysis), Resend (transactional
          email), Vercel (hosting) and Stripe (payments, when enabled). Each processes data
          only to provide their part of the service.
        </p>

        <h2>Storage, retention and deletion</h2>
        <p>
          We keep your account and reports for as long as your account is active. You can
          delete a report at any time from your dashboard, and you can request deletion of
          your account and associated data by emailing{' '}
          <a href="mailto:hello@getaesthete.com">hello@getaesthete.com</a>.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies only — to keep you signed in. We do not use advertising
          or third-party tracking cookies.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export or
          delete your personal information. To exercise any of these, contact{' '}
          <a href="mailto:hello@getaesthete.com">hello@getaesthete.com</a>. We handle
          personal information in line with the Australian Privacy Principles and, where
          applicable, the GDPR.
        </p>

        <h2>Security</h2>
        <p>
          Access to your data is restricted by per-user database policies, and traffic is
          encrypted in transit. No system is perfectly secure, but we take reasonable
          measures to protect your information.
        </p>

        <h2>Children</h2>
        <p>Aesthete is not intended for anyone under 16, and we do not knowingly collect their data.</p>

        <h2>Changes</h2>
        <p>
          We may update this policy as the product evolves. Material changes will be
          reflected by the date above.
        </p>

        <p className="legal-foot">
          See also our <Link href="/terms">Terms of Service</Link>.
        </p>
      </main>

      <EditorialFooter />
    </div>
  )
}
