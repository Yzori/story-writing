import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { users, bibleEntries } from "@/server/db/schema";
import { and, eq, lt, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { generateAIAssistance, generateStoryIntelligence, type AIPromptType } from "@/server/services/ai";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import {
  SUBSCRIPTION_PLANS,
  FREE_AI_LIFETIME_GENERATIONS,
  FREE_AI_PROMPT_TYPE,
} from "@/config/subscription";

export const maxDuration = 60; // AI requests can take up to 60 seconds

type AIStoryMetadata = {
  storyTitle?: string;
  genre?: string;
  storyBible?: Array<{ name: string; description: string }>;
};

const AI_PROMPT_TYPES = [
  "continue",
  "rephrase",
  "expand",
  "summarize",
  "fix-grammar",
  "improve-dialogue",
  "enhance-description",
  "plot-holes",
  "continuity-check",
  "pacing-analysis",
  "character-arc",
] as const satisfies readonly AIPromptType[];

const PREMIUM_FEATURES: AIPromptType[] = [
  "plot-holes",
  "continuity-check",
  "pacing-analysis",
  "character-arc",
];

const SELECTION_REQUIRED_PROMPTS: AIPromptType[] = [
  "rephrase",
  "expand",
  "summarize",
  "fix-grammar",
  "improve-dialogue",
  "enhance-description",
];

const aiAssistSchema = z.object({
  promptType: z.enum(AI_PROMPT_TYPES),
  context: z.string().trim().min(1).max(50_000),
  selectedText: z.string().trim().max(20_000).optional(),
  storyId: z.string().uuid().optional(),
});

/**
 * POST /api/ai/assist
 * Generate AI writing assistance.
 *
 * Tier requirements:
 * - Free: limited editorial taste
 * - Pro: 50 requests/day
 * - Premium: Unlimited
 */
export async function POST(request: NextRequest) {
  let reservedUsage:
    | { kind: "free"; userId: string }
    | { kind: "paid"; userId: string }
    | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write", {
      max: 10,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const rawBody = await request.json().catch(() => null);
    const parsedBody = aiAssistSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsedBody.error.issues[0]?.message ?? "Invalid AI request",
          },
        },
        { status: 400 },
      );
    }
    const { promptType, context, selectedText, storyId } = parsedBody.data;
    if (SELECTION_REQUIRED_PROMPTS.includes(promptType) && !selectedText) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Selected text is required for this AI feature",
          },
        },
        { status: 400 },
      );
    }

    // Get user's subscription tier and AI usage
    const [user] = await db
      .select({
        id: users.id,
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionEndsAt: users.subscriptionEndsAt,
        aiRequestsThisMonth: users.aiRequestsThisMonth,
        aiRequestsResetAt: users.aiRequestsResetAt,
        aiFreeGenerationsUsed: users.aiFreeGenerationsUsed,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Free-tier handling: allow only the configured editorial prompt, capped at
    // FREE_AI_LIFETIME_GENERATIONS uses across the user's lifetime. Any other
    // prompt type, or exhausted quota, returns the upgrade prompt as before.
    const hasPaidAccess =
      user.subscriptionTier !== "free" &&
      (user.subscriptionStatus === "active" ||
        user.subscriptionStatus === "trialing" ||
        (user.subscriptionStatus === "cancelled" &&
          user.subscriptionEndsAt !== null &&
          new Date(user.subscriptionEndsAt) > new Date()));
    const isFreeTier = user.subscriptionTier === "free" || !hasPaidAccess;

    if (user.subscriptionTier !== "free" && !hasPaidAccess) {
      return NextResponse.json(
        {
          error: {
            code: "SUBSCRIPTION_REQUIRED",
            message: "Your subscription is not active. Update billing to keep using Editor’s Desk.",
            upgradeUrl: "/settings/billing",
          },
        },
        { status: 402 },
      );
    }
    if (isFreeTier) {
      if (promptType !== FREE_AI_PROMPT_TYPE) {
        return NextResponse.json(
          {
            error: {
              code: "SUBSCRIPTION_REQUIRED",
              message: "This AI feature requires a Pro or Premium subscription",
              upgradeUrl: "/pricing",
            },
          },
          { status: 402 },
        );
      }
      if (user.aiFreeGenerationsUsed >= FREE_AI_LIFETIME_GENERATIONS) {
        return NextResponse.json(
          {
            error: {
              code: "FREE_QUOTA_EXHAUSTED",
              message: "You've used all your free AI generations. Upgrade to keep going.",
              upgradeUrl: "/pricing",
              freeGenerationsLimit: FREE_AI_LIFETIME_GENERATIONS,
              freeGenerationsUsed: user.aiFreeGenerationsUsed,
            },
          },
          { status: 402 },
        );
      }
    }

    // Daily reset (Pro). Free uses lifetime quota (no reset). Premium is unlimited.
    const now = new Date();
    const resetAt = user.aiRequestsResetAt ? new Date(user.aiRequestsResetAt) : null;
    let currentUsage = user.aiRequestsThisMonth;
    let currentResetAt = user.aiRequestsResetAt;

    if (!isFreeTier && (!resetAt || resetAt < now)) {
      const nextReset = new Date();
      nextReset.setHours(24, 0, 0, 0);
      await db
        .update(users)
        .set({
          aiRequestsThisMonth: 0,
          aiRequestsResetAt: nextReset,
        })
        .where(eq(users.id, user.id));
      currentUsage = 0;
      currentResetAt = nextReset;
    }

    // Pro daily limit (Premium is unlimited; Free is gated by lifetime quota above).
    const tierLimit = isFreeTier
      ? FREE_AI_LIFETIME_GENERATIONS
      : SUBSCRIPTION_PLANS[user.subscriptionTier as "pro" | "premium"]?.aiRequestLimit;

    if (!isFreeTier && tierLimit !== null && currentUsage >= tierLimit) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Daily AI limit reached (${tierLimit} requests). Resets at midnight.`,
            upgradeUrl: user.subscriptionTier === "pro" ? "/pricing" : null,
            remainingRequests: 0,
            resetAt: currentResetAt,
          },
        },
        { status: 429 }
      );
    }

    // Premium-only features
    if (PREMIUM_FEATURES.includes(promptType) && (user.subscriptionTier !== "premium" || !hasPaidAccess)) {
      return NextResponse.json(
        {
          error: {
            code: "PREMIUM_REQUIRED",
            message: "This AI feature requires a Premium subscription",
            upgradeUrl: "/pricing",
          },
        },
        { status: 402 }
      );
    }

    // Fetch story metadata if storyId provided
    const metadata: AIStoryMetadata = {};
    if (storyId) {
      const access = await verifyCollaboratorAccess(storyId, session.user.id);
      if (access.error) {
        return NextResponse.json(
          {
            error: {
              code: access.error,
              message: access.error === "NOT_FOUND" ? "Story not found" : "Not allowed to use this story",
            },
          },
          { status: access.error === "NOT_FOUND" ? 404 : 403 },
        );
      }

      const story = access.story;

      if (story) {
        metadata.storyTitle = story.title;
        metadata.genre = story.genres?.[0];

        // Fetch Story Bible entries
        const bible = await db
          .select({
            name: bibleEntries.name,
            description: bibleEntries.description,
          })
          .from(bibleEntries)
          .where(eq(bibleEntries.storyId, storyId))
          .limit(10);

        if (bible.length > 0) {
          metadata.storyBible = bible.map((entry) => ({
            name: entry.name,
            description: entry.description ?? "",
          }));
        }
      }
    }

    // Reserve quota before calling the AI provider so concurrent requests cannot
    // overspend a user's allowance. If the provider fails, we refund below.
    if (isFreeTier) {
      const reserved = await db
        .update(users)
        .set({ aiFreeGenerationsUsed: sql`${users.aiFreeGenerationsUsed} + 1` })
        .where(
          and(
            eq(users.id, user.id),
            lt(users.aiFreeGenerationsUsed, FREE_AI_LIFETIME_GENERATIONS),
          ),
        )
        .returning({ aiFreeGenerationsUsed: users.aiFreeGenerationsUsed });

      if (reserved.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: "FREE_QUOTA_EXHAUSTED",
              message: "You've used all your free AI generations. Upgrade to keep going.",
              upgradeUrl: "/pricing",
              freeGenerationsLimit: FREE_AI_LIFETIME_GENERATIONS,
              freeGenerationsUsed: FREE_AI_LIFETIME_GENERATIONS,
            },
          },
          { status: 402 },
        );
      }
      currentUsage = reserved[0].aiFreeGenerationsUsed;
      reservedUsage = { kind: "free", userId: user.id };
    } else if (tierLimit === null) {
      const reserved = await db
        .update(users)
        .set({ aiRequestsThisMonth: sql`${users.aiRequestsThisMonth} + 1` })
        .where(eq(users.id, user.id))
        .returning({ aiRequestsThisMonth: users.aiRequestsThisMonth });

      currentUsage = reserved[0]?.aiRequestsThisMonth ?? currentUsage + 1;
      reservedUsage = { kind: "paid", userId: user.id };
    } else {
      const reserved = await db
        .update(users)
        .set({ aiRequestsThisMonth: sql`${users.aiRequestsThisMonth} + 1` })
        .where(and(eq(users.id, user.id), lt(users.aiRequestsThisMonth, tierLimit)))
        .returning({ aiRequestsThisMonth: users.aiRequestsThisMonth });

      if (reserved.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: `Daily AI limit reached (${tierLimit} requests). Resets at midnight.`,
              upgradeUrl: user.subscriptionTier === "pro" ? "/pricing" : null,
              remainingRequests: 0,
              resetAt: currentResetAt,
            },
          },
          { status: 429 },
        );
      }
      currentUsage = reserved[0].aiRequestsThisMonth;
      reservedUsage = { kind: "paid", userId: user.id };
    }

    // Generate AI assistance
    const aiRequest = {
      promptType,
      context,
      selectedText,
      metadata,
    };

    const result = PREMIUM_FEATURES.includes(promptType)
      ? await generateStoryIntelligence(aiRequest)
      : await generateAIAssistance(aiRequest);

    const newUsage = currentUsage;
    const remaining = tierLimit === null ? null : Math.max(0, (tierLimit ?? 0) - newUsage);

    return NextResponse.json({
      suggestion: result.suggestion,
      tokensUsed: result.tokensUsed,
      usage: {
        current: newUsage,
        limit: tierLimit,
        remaining,
        resetAt: isFreeTier ? null : currentResetAt,
        isFreeTrial: isFreeTier,
      },
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/assist error:", error);

    if (reservedUsage) {
      const refund =
        reservedUsage.kind === "free"
          ? db
              .update(users)
              .set({ aiFreeGenerationsUsed: sql`greatest(${users.aiFreeGenerationsUsed} - 1, 0)` })
              .where(eq(users.id, reservedUsage.userId))
          : db
              .update(users)
              .set({ aiRequestsThisMonth: sql`greatest(${users.aiRequestsThisMonth} - 1, 0)` })
              .where(eq(users.id, reservedUsage.userId));

      await refund.catch((refundError) => {
        console.error("Failed to refund AI usage reservation:", refundError);
      });
    }

    // Handle provider configuration errors
    if (error instanceof Error && error.message === "ANTHROPIC_API_KEY is not configured") {
      return NextResponse.json(
        { error: { code: "SERVICE_UNAVAILABLE", message: "AI service is not configured" } },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate AI assistance" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/assist
 * Get current AI usage stats
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const [user] = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionEndsAt: users.subscriptionEndsAt,
        aiRequestsThisMonth: users.aiRequestsThisMonth,
        aiRequestsResetAt: users.aiRequestsResetAt,
        aiFreeGenerationsUsed: users.aiFreeGenerationsUsed,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const hasPaidAccess =
      user.subscriptionTier !== "free" &&
      (user.subscriptionStatus === "active" ||
        user.subscriptionStatus === "trialing" ||
        (user.subscriptionStatus === "cancelled" &&
          user.subscriptionEndsAt !== null &&
          new Date(user.subscriptionEndsAt) > new Date()));
    const isFreeTier = user.subscriptionTier === "free" || !hasPaidAccess;
    const tierLimit = isFreeTier
      ? FREE_AI_LIFETIME_GENERATIONS
      : SUBSCRIPTION_PLANS[user.subscriptionTier as "pro" | "premium"]?.aiRequestLimit ?? 0;

    const current = isFreeTier ? user.aiFreeGenerationsUsed : user.aiRequestsThisMonth;
    const remaining = tierLimit === null ? null : Math.max(0, (tierLimit ?? 0) - current);
    const hasAccess = isFreeTier ? user.aiFreeGenerationsUsed < FREE_AI_LIFETIME_GENERATIONS : true;

    return NextResponse.json({
      tier: user.subscriptionTier,
      usage: {
        current,
        limit: tierLimit,
        remaining,
        resetAt: isFreeTier ? null : user.aiRequestsResetAt,
        isFreeTrial: isFreeTier,
      },
      hasAccess,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/ai/assist", "Failed to fetch AI usage");
  }
}
