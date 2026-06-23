import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, PRICE_TIERS } from '@/lib/stripe'

/**
 * Creates a Stripe Checkout session for a subscription.
 *
 * Resolves (or lazily creates) the user's Stripe customer, persists the
 * customer id on `user_subscriptions`, then opens a hosted checkout session
 * and returns its URL for the client to redirect to.
 */
export async function POST(request: Request) {
  // 1. Require an authenticated user.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate the requested price.
  let priceId: unknown
  try {
    ;({ priceId } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  if (typeof priceId !== 'string' || !(priceId in PRICE_TIERS)) {
    return NextResponse.json({ error: 'Unknown price.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 3. Get or create the Stripe customer for this user.
  const { data: existing } = await admin
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId = existing?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id

    // Persist the customer id so we reuse it on future checkouts.
    const { error: upsertError } = await admin
      .from('user_subscriptions')
      .upsert(
        { user_id: user.id, stripe_customer_id: customerId },
        { onConflict: 'user_id' }
      )
    if (upsertError) {
      console.error('Failed to persist Stripe customer id:', upsertError)
      return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 })
    }
  }

  // 4. Create the checkout session.
  const origin = new URL(request.url).origin

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=true`,
    cancel_url: `${origin}/pricing`,
    metadata: { user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
