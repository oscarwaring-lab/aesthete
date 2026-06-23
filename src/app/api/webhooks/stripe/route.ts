import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, PRICE_TIERS, FREE_TIER } from '@/lib/stripe'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * The billing period lives on the subscription item in the current Stripe API
 * version (dahlia), not on the subscription object itself. Read it from the
 * first item and convert the unix seconds to JS Dates.
 */
function periodFromSubscription(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0]
  return {
    period_start: new Date(item.current_period_start * 1000),
    period_end: new Date(item.current_period_end * 1000),
  }
}

/** Resolve the price id on a subscription to its tier + analyses limit. */
function tierForSubscription(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id ?? ''
  return PRICE_TIERS[priceId] ?? FREE_TIER
}

async function handleCheckoutCompleted(
  admin: AdminClient,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id
  if (!userId || !session.subscription) return

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const { tier, limit } = tierForSubscription(subscription)
  const period = periodFromSubscription(subscription)

  const { error } = await admin.from('user_subscriptions').upsert(
    {
      user_id: userId,
      tier,
      analyses_limit: limit,
      analyses_used: 0,
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null,
      status: 'active',
      period_start: period.period_start.toISOString(),
      period_end: period.period_end.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) console.error('checkout.session.completed upsert failed:', error)
}

async function handleInvoicePaid(admin: AdminClient, invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id
  if (!customerId) return

  // Find the user behind this customer, then refresh the cycle from the live
  // subscription so the new period is accurate.
  const { data: row } = await admin
    .from('user_subscriptions')
    .select('user_id, stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!row?.stripe_subscription_id) return

  const subscription = await stripe.subscriptions.retrieve(
    row.stripe_subscription_id
  )
  const period = periodFromSubscription(subscription)

  const { error } = await admin
    .from('user_subscriptions')
    .update({
      analyses_used: 0,
      period_start: period.period_start.toISOString(),
      period_end: period.period_end.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) console.error('invoice.payment_succeeded update failed:', error)
}

async function handleSubscriptionDeleted(
  admin: AdminClient,
  subscription: Stripe.Subscription
) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  const { error } = await admin
    .from('user_subscriptions')
    .update({
      tier: FREE_TIER.tier,
      analyses_limit: FREE_TIER.limit,
      analyses_used: 0,
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) console.error('customer.subscription.deleted update failed:', error)
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  // Signature verification needs the exact raw bytes, so read the body as an
  // ArrayBuffer rather than parsing it.
  const rawBody = Buffer.from(await request.arrayBuffer())

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(admin, event.data.object)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(admin, event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(admin, event.data.object)
        break
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler error.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
