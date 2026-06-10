import "server-only";
import { db } from "./db";
import { users } from "./db/schema";
import { eq, sql } from "drizzle-orm";
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from "./stripe";

/**
 * Check if a user has a Pro or Premium subscription
 */
export function hasPaidSubscription(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "premium";
}

/**
 * Check if a user has a Pro subscription
 */
export function isPro(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "premium";
}

/**
 * Check if a user has a Premium subscription
 */
export function isPremium(tier: SubscriptionTier): boolean {
  return tier === "premium";
}

/**
 * Check if a user can use AI features and track usage
 * Returns { allowed: boolean, remaining?: number, limit?: number }
 */
export async function canUseAI(userId: string): Promise<{
  allowed: boolean;
  // null = unlimited (premium); consumers check `limit === null`
  remaining?: number | null;
  limit?: number | null;
  resetAt?: Date;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      subscriptionTier: true,
      subscriptionStatus: true,
      aiRequestsThisMonth: true,
      aiRequestsResetAt: true,
    },
  });

  if (!user) {
    return { allowed: false };
  }

  // Free users can't use AI
  if (user.subscriptionTier === "free") {
    return { allowed: false };
  }

  // Check subscription status
  if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trialing") {
    return { allowed: false };
  }

  // Premium users have unlimited AI
  if (user.subscriptionTier === "premium") {
    return { allowed: true, remaining: null, limit: null };
  }

  // Pro users have daily limit
  const limit = SUBSCRIPTION_PLANS.pro.aiRequestLimit;
  const now = new Date();
  const resetDate = user.aiRequestsResetAt;

  // Check if we need to reset the counter (new day)
  if (!resetDate || now > resetDate) {
    // Reset counter for new day
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Reset at midnight

    await db
      .update(users)
      .set({
        aiRequestsThisMonth: 0,
        aiRequestsResetAt: tomorrow,
      })
      .where(eq(users.id, userId));

    return { allowed: true, remaining: limit, limit, resetAt: tomorrow };
  }

  // Check if user has requests remaining
  const remaining = limit - user.aiRequestsThisMonth;
  if (remaining <= 0) {
    return { allowed: false, remaining: 0, limit, resetAt: resetDate };
  }

  return { allowed: true, remaining, limit, resetAt: resetDate };
}

/**
 * Increment AI request counter for a user
 */
export async function incrementAIUsage(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      aiRequestsThisMonth: sql`${users.aiRequestsThisMonth} + 1`,
    })
    .where(eq(users.id, userId));
}

/**
 * Check if a user can export stories (Pro or Premium only)
 */
export function canExport(tier: SubscriptionTier): boolean {
  return isPro(tier);
}

/**
 * Check if a user can collaborate (Pro allows 3, Premium unlimited)
 */
export function getCollaboratorLimit(tier: SubscriptionTier): number | null {
  if (tier === "free") return 0;
  if (tier === "pro") return 3;
  return null; // unlimited for premium
}

/**
 * Check if a user has access to advanced analytics
 */
export function hasAdvancedAnalytics(tier: SubscriptionTier): boolean {
  return isPro(tier);
}

/**
 * Check if a user can use track changes mode
 */
export function hasTrackChanges(tier: SubscriptionTier): boolean {
  return isPremium(tier);
}

/**
 * Check if subscription is active or in trial
 */
export function isSubscriptionActive(status: string): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Get feature availability for a subscription tier
 */
export function getFeatureAccess(tier: SubscriptionTier) {
  return {
    tier,
    aiAssistant: isPro(tier),
    aiUnlimited: isPremium(tier),
    export: canExport(tier),
    collaboratorLimit: getCollaboratorLimit(tier),
    advancedAnalytics: hasAdvancedAnalytics(tier),
    trackChanges: hasTrackChanges(tier),
    customDomain: isPremium(tier),
    prioritySupport: isPro(tier),
    marketplace: isPremium(tier),
  };
}
