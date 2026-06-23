import 'server-only'
import Stripe from 'stripe'

/**
 * Server-side Stripe client. Uses the API version pinned by the installed SDK
 * (so the typed objects match the runtime shapes). Never import into a Client
 * Component — the `server-only` guard above makes that a build error.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * Maps a Stripe Price ID to the plan it unlocks. The webhook and pricing page
 * both read from this single source of truth, so a price change only happens
 * in one place.
 */
export const PRICE_TIERS: Record<string, { tier: string; limit: number }> = {
  price_1Tl0ZsCpKNXCQHYMHJLp6d5f: { tier: 'starter', limit: 15 },
  price_1Tl0aRCpKNXCQHYMzaO80RYp: { tier: 'creator', limit: 40 },
}

export const STARTER_PRICE_ID = 'price_1Tl0ZsCpKNXCQHYMHJLp6d5f'
export const CREATOR_PRICE_ID = 'price_1Tl0aRCpKNXCQHYMzaO80RYp'

/** Free-tier defaults for a brand-new subscription row. */
export const FREE_TIER = { tier: 'free', limit: 1 }
