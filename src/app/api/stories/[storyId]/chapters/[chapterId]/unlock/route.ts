import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  chapters,
  stories,
  contentUnlocks,
  users,
} from "@/server/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { TIER_PRICES } from "@/lib/constants";
import { distributeEarnings } from "@/server/services/ink-drops";
import { hasActiveCircleSubscription } from "@/server/services/circles";

// GET — check if chapter is unlocked for current user + gating info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
    const { storyId, chapterId } = await params;

    const session = await auth();
    const userId = session?.user?.id;

    // Get chapter gating info
    const [chapter] = await db
      .select({
        id: chapters.id,
        title: chapters.title,
        wordCount: chapters.wordCount,
        gatingTier: chapters.gatingTier,
        earlyAccessDays: chapters.earlyAccessDays,
        earlyAccessUntil: chapters.earlyAccessUntil,
        storyId: chapters.storyId,
        status: chapters.status,
        deletedAt: chapters.deletedAt,
      })
      .from(chapters)
      .where(and(eq(chapters.id, chapterId), eq(chapters.storyId, storyId)));

    if (!chapter) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    const [story] = await db
      .select({
        userId: stories.userId,
        isPublic: stories.isPublic,
        deletedAt: stories.deletedAt,
      })
      .from(stories)
      .where(eq(stories.id, storyId));

    const isOwner = Boolean(userId && story?.userId === userId);
    if (
      !story ||
      (!isOwner && (!story.isPublic || story.deletedAt || chapter.status !== "published" || chapter.deletedAt))
    ) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    const price = TIER_PRICES[chapter.gatingTier] ?? 0;
    let isEarlyAccess = Boolean(
      chapter.earlyAccessUntil && new Date(chapter.earlyAccessUntil) > new Date()
    );
    // Circle subscribers to this author skip the early-access hold
    // (paid gating still applies — that's separate revenue).
    if (isEarlyAccess && userId && story) {
      if (await hasActiveCircleSubscription(userId, story.userId)) {
        isEarlyAccess = false;
      }
    }

    // Free chapter or early access expired
    if (price === 0 && !isEarlyAccess) {
      return NextResponse.json({ unlocked: true, price: 0, tier: "free" });
    }

    // Check if user has unlocked
    let unlocked = false;
    if (userId) {
      const [existing] = await db
        .select({ id: contentUnlocks.id })
        .from(contentUnlocks)
        .where(
          and(
            eq(contentUnlocks.userId, userId),
            eq(contentUnlocks.chapterId, chapterId)
          )
        );
      unlocked = !!existing;
    }

    // Check if user is story owner
    if (userId && !unlocked) {
      if (isOwner) {
        unlocked = true;
      }
    }

    return NextResponse.json({
      unlocked,
      price,
      tier: chapter.gatingTier,
      isEarlyAccess: !!isEarlyAccess,
      earlyAccessUntil: chapter.earlyAccessUntil,
    });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/chapters/[chapterId]/unlock",
      "Failed to check unlock status",
    );
  }
}

// POST — unlock a chapter
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
    const { storyId, chapterId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const userId = session.user.id;

    // Get chapter + story info
    const [chapter] = await db
      .select({
        id: chapters.id,
        gatingTier: chapters.gatingTier,
        storyId: chapters.storyId,
        status: chapters.status,
        deletedAt: chapters.deletedAt,
      })
      .from(chapters)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.storyId, storyId),
          eq(chapters.status, "published"),
          isNull(chapters.deletedAt)
        )
      );

    if (!chapter) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    const price = TIER_PRICES[chapter.gatingTier] ?? 0;
    if (price === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "This chapter is free" } },
        { status: 400 }
      );
    }

    // Check not already unlocked
    const [existing] = await db
      .select({ id: contentUnlocks.id })
      .from(contentUnlocks)
      .where(
        and(
          eq(contentUnlocks.userId, userId),
          eq(contentUnlocks.chapterId, chapterId)
        )
      );

    if (existing) {
      return NextResponse.json({ unlocked: true, alreadyOwned: true });
    }

    // Get story owner for revenue split
    const [story] = await db
      .select({ userId: stories.userId, isPublic: stories.isPublic, deletedAt: stories.deletedAt })
      .from(stories)
      .where(eq(stories.id, storyId));

    if (!story || !story.isPublic || story.deletedAt) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Can't buy your own content
    if (story.userId === userId) {
      return NextResponse.json({ unlocked: true, alreadyOwned: true });
    }

    // Atomic: debit reader, credit creator (70/30), log, create unlock
    const result = await db.transaction(async (tx) => {
      const [reader] = await tx
        .select({ inkDropBalance: users.inkDropBalance })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      const balance = reader?.inkDropBalance ?? 0;

      if (balance < price) {
        return { error: "INSUFFICIENT_BALANCE" as const, balance, price };
      }

      // Debit reader
      await tx
        .update(users)
        .set({ inkDropBalance: sql`${users.inkDropBalance} - ${price}` })
        .where(eq(users.id, userId));

      // Pay out — honors the story's signed agreement splits if one is active,
      // else all to the owner. Credits balances and logs the ledger rows.
      await distributeEarnings(tx, {
        storyId,
        ownerId: story.userId,
        fromUserId: userId,
        gross: price,
        type: "unlock",
        message: `Chapter unlock (${chapter.gatingTier})`,
      });

      // Create unlock record
      const [unlock] = await tx
        .insert(contentUnlocks)
        .values({
          userId,
          chapterId,
          storyId,
          dropsSpent: price,
        })
        .returning();

      return { unlocked: true, newBalance: balance - price, unlock };
    });

    if ("error" in result && result.error === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        {
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `Not enough Ink Drops. You need ${result.price} but have ${result.balance}.`,
          },
        },
        { status: 402 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/chapters/[chapterId]/unlock",
      "Failed to unlock chapter",
    );
  }
}
