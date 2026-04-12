import "server-only";
import Stripe from "stripe";
import { SUBSCRIPTION_PLANS, type BillingInterval } from "@/config/subscription";

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

// Re-export for backwards compatibility
export { SUBSCRIPTION_PLANS };
export type { SubscriptionTier, BillingInterval } from "@/config/subscription";

/**
 * Get the Stripe price ID for a given tier and interval
 * NOTE: These must be created in Stripe Dashboard first
 */
export function getStripePriceId(tier: "pro" | "premium", interval: BillingInterval): string {
  if (tier === "pro") {
    if (interval === "monthly") {
      return process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly";
    }
    return process.env.STRIPE_PRO_YEARLY_PRICE_ID || "price_pro_yearly";
  }

  if (interval === "monthly") {
    return process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_premium_monthly";
  }
  return process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || "price_premium_yearly";
}

/**
 * Get the price in cents for a given tier and interval
 */
export function getSubscriptionPrice(tier: "pro" | "premium", interval: BillingInterval): number {
  return SUBSCRIPTION_PLANS[tier][interval].price;
}
