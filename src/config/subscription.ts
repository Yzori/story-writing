/**
 * Subscription plan configuration
 * This file is shared between client and server
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
      price: 999, // $9.99 in cents
    },
    yearly: {
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
      price: 2999, // $29.99 in cents
    },
    yearly: {
      price: 29900, // $299 in cents (2 months free)
    },
    aiRequestLimit: null, // unlimited
  },
} as const;

export type SubscriptionTier = "free" | "pro" | "premium";
export type BillingInterval = "monthly" | "yearly";
