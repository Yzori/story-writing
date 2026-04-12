import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users, stories, bibleEntries } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { generateAIAssistance, generateStoryIntelligence, type AIPromptType } from "@/server/services/ai";
import { SUBSCRIPTION_PLANS } from "@/config/subscription";

export const maxDuration = 60; // AI requests can take up to 60 seconds

/**
 * POST /api/ai/assist
 * Generate AI writing assistance.
 *
 * Tier requirements:
 * - Free: No access (must upgrade)
 * - Pro: 50 requests/day
 * - Premium: Unlimited
 */
export async function POST(request: NextRequest) {
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

    // Get user's subscription tier and AI usage
    const [user] = await db
      .select({
        id: users.id,
        subscriptionTier: users.subscriptionTier,
        aiRequestsThisMonth: users.aiRequestsThisMonth,
        aiRequestsResetAt: users.aiRequestsResetAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Check subscription tier
    if (user.subscriptionTier === "free") {
      return NextResponse.json(
        {
          error: {
            code: "SUBSCRIPTION_REQUIRED",
            message: "AI Writing Assistant requires a Pro or Premium subscription",
            upgradeUrl: "/pricing",
          },
        },
        { status: 402 }
      );
    }

    // Check if reset is needed (daily reset at midnight)
    const now = new Date();
    const resetAt = user.aiRequestsResetAt ? new Date(user.aiRequestsResetAt) : null;
    let currentUsage = user.aiRequestsThisMonth;

    if (!resetAt || resetAt < now) {
      // Reset counter
      const nextReset = new Date();
      nextReset.setHours(24, 0, 0, 0); // Next midnight

      await db
        .update(users)
        .set({
          aiRequestsThisMonth: 0,
          aiRequestsResetAt: nextReset,
        })
        .where(eq(users.id, user.id));

      currentUsage = 0;
    }

    // Check Pro tier limit (Premium is unlimited)
    const tierLimit = SUBSCRIPTION_PLANS[user.subscriptionTier as "pro" | "premium"]?.aiRequestLimit;

    if (tierLimit !== null && currentUsage >= tierLimit) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Daily AI limit reached (${tierLimit} requests). Resets at midnight.`,
            upgradeUrl: user.subscriptionTier === "pro" ? "/pricing" : null,
            remainingRequests: 0,
            resetAt: user.aiRequestsResetAt,
          },
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      promptType,
      context,
      selectedText,
      storyId,
    } = body as {
      promptType: AIPromptType;
      context: string;
      selectedText?: string;
      storyId?: string;
    };

    // Validate input
    if (!promptType || !context) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing required fields" } },
        { status: 400 }
      );
    }

    // Premium-only features
    const premiumFeatures: AIPromptType[] = ["plot-holes", "continuity-check", "pacing-analysis", "character-arc"];
    if (premiumFeatures.includes(promptType) && user.subscriptionTier !== "premium") {
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
    let metadata: any = {};
    if (storyId) {
      const [story] = await db
        .select({
          title: stories.title,
          genres: stories.genres,
        })
        .from(stories)
        .where(eq(stories.id, storyId));

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
          metadata.storyBible = bible;
        }
      }
    }

    // Generate AI assistance
    const aiRequest = {
      promptType,
      context,
      selectedText,
      metadata,
    };

    const result = premiumFeatures.includes(promptType)
      ? await generateStoryIntelligence(aiRequest)
      : await generateAIAssistance(aiRequest);

    // Increment usage counter
    await db
      .update(users)
      .set({
        aiRequestsThisMonth: sql`${users.aiRequestsThisMonth} + 1`,
      })
      .where(eq(users.id, user.id));

    const newUsage = currentUsage + 1;
    const remaining = tierLimit === null ? null : tierLimit - newUsage;

    return NextResponse.json({
      suggestion: result.suggestion,
      tokensUsed: result.tokensUsed,
      usage: {
        current: newUsage,
        limit: tierLimit,
        remaining,
        resetAt: user.aiRequestsResetAt,
      },
    });
  } catch (error: any) {
    console.error("POST /api/ai/assist error:", error);

    // Handle OpenAI API errors
    if (error.message === "OPENAI_API_KEY is not configured") {
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
export async function GET(request: NextRequest) {
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
        aiRequestsThisMonth: users.aiRequestsThisMonth,
        aiRequestsResetAt: users.aiRequestsResetAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const tierLimit = user.subscriptionTier === "free"
      ? 0
      : SUBSCRIPTION_PLANS[user.subscriptionTier as "pro" | "premium"]?.aiRequestLimit ?? 0;

    const remaining = tierLimit === null ? null : Math.max(0, tierLimit - user.aiRequestsThisMonth);

    return NextResponse.json({
      tier: user.subscriptionTier,
      usage: {
        current: user.aiRequestsThisMonth,
        limit: tierLimit,
        remaining,
        resetAt: user.aiRequestsResetAt,
      },
      hasAccess: user.subscriptionTier !== "free",
    });
  } catch (error) {
    console.error("GET /api/ai/assist error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch AI usage" } },
      { status: 500 }
    );
  }
}
