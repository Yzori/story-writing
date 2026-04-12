import "server-only";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required for payments");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

/**
 * Ink Drop purchase tiers.
 * Prices in cents (USD).
 */
export const INK_DROP_TIERS = {
  "500": { drops: 500, priceInCents: 499, label: "Starter" },
  "1200": { drops: 1200, priceInCents: 999, label: "Popular" },
  "3000": { drops: 3000, priceInCents: 1999, label: "Mega" },
} as const;

export type InkDropTier = keyof typeof INK_DROP_TIERS;

/**
 * Subscription tiers and pricing.
 *
 * NOTE: These are placeholder price IDs. You must create these products in Stripe Dashboard:
 * 1. Go to https://dashboard.stripe.com/products
 * 2. Create "Pro" product with monthly ($9.99) and yearly ($99) prices
 * 3. Create "Premium" product with monthly ($29.99) and yearly ($299) prices
 * 4. Replace the price IDs below with your actual Stripe price IDs
 */
export const SUBSCRIPTION_PLANS = {
  pro: {
    name: "Pro",
    description: "AI Writing Assistant + Advanced Features",
    features: [
      "AI Writing Assistant (50 requests/day)",
      "Advanced analytics & retention tracking",
      "Unlimited story version history",
      "Export to PDF/EPUB/DOCX",
      "Collaboration (up to 3 co-authors)",
      "Priority email support",
    ],
    monthly: {
      priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly", // Replace with actual Stripe price ID
      price: 999, // $9.99 in cents
    },
    yearly: {
      priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "price_pro_yearly", // Replace with actual Stripe price ID
      price: 9900, // $99 in cents (2 months free)
    },
    aiRequestLimit: 50, // requests per day
  },
  premium: {
    name: "Premium",
    description: "Unlimited AI + Professional Tools",
    features: [
      "Unlimited AI Story Intelligence",
      "Plot hole detection & continuity enforcement",
      "Pacing & character arc analysis",
      "Advanced collaboration (unlimited co-authors)",
      "Track changes & revision mode",
      "Custom author website/portfolio",
      "Professional marketplace access",
      "Priority support + account manager",
    ],
    monthly: {
      priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_premium_monthly", // Replace with actual Stripe price ID
      price: 2999, // $29.99 in cents
    },
    yearly: {
      priceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || "price_premium_yearly", // Replace with actual Stripe price ID
      price: 29900, // $299 in cents (2 months free)
    },
    aiRequestLimit: null, // unlimited
  },
} as const;

export type SubscriptionTier = "free" | "pro" | "premium";
export type BillingInterval = "monthly" | "yearly";

/**
 * Get the price ID for a given tier and interval
 */
export function getStripePriceId(tier: "pro" | "premium", interval: BillingInterval): string {
  return SUBSCRIPTION_PLANS[tier][interval].priceId;
}

/**
 * Get the price in cents for a given tier and interval
 */
export function getSubscriptionPrice(tier: "pro" | "premium", interval: BillingInterval): number {
  return SUBSCRIPTION_PLANS[tier][interval].price;
}
