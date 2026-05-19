import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  chapters,
  stories,
  contentUnlocks,
  inkDropTransactions,
  users,
} from "@/server/db/schema";
import { eq, and, sql, ne, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { TIER_PRICES } from "@/lib/constants";

// GET — calculate bundle price for a story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const [story] = await db
      .select({ userId: stories.userId, isPublic: stories.isPublic, deletedAt: stories.deletedAt })
      .from(stories)
      .where(eq(stories.id, storyId));

    const isOwner = Boolean(userId && story?.userId === userId);
    if (!story || (!isOwner && (!story.isPublic || story.deletedAt))) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Get all gated chapters
    const gatedChapters = await db
      .select({
        id: chapters.id,
        title: chapters.title,
        gatingTier: chapters.gatingTier,
        sortOrder: chapters.sortOrder,
      })
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, storyId),
          ne(chapters.gatingTier, "free"),
          isNull(chapters.deletedAt),
          eq(chapters.status, "published")
        )
      )
      .orderBy(chapters.sortOrder);

    if (gatedChapters.length === 0) {
      return NextResponse.json({ bundleAvailable: false, chapters: [] });
    }

    // Check which ones user already owns
    let ownedIds: string[] = [];
    if (userId) {
      const owned = await db
        .select({ chapterId: contentUnlocks.chapterId })
        .from(contentUnlocks)
        .where(
          and(
            eq(contentUnlocks.userId, userId),
            eq(contentUnlocks.storyId, storyId)
          )
        );
      ownedIds = owned.map((o) => o.chapterId);
    }

    const lockedChapters = gatedChapters.filter((c) => !ownedIds.includes(c.id));
    const fullPrice = lockedChapters.reduce(
      (sum, c) => sum + (TIER_PRICES[c.gatingTier] ?? 0),
      0
    );
    const bundlePrice = Math.floor(fullPrice * 0.7); // 30% discount

    return NextResponse.json({
      bundleAvailable: lockedChapters.length > 0,
      totalGated: gatedChapters.length,
      alreadyOwned: ownedIds.length,
      remaining: lockedChapters.length,
      fullPrice,
      bundlePrice,
      savings: fullPrice - bundlePrice,
      chapters: lockedChapters.map((c) => ({
        id: c.id,
        title: c.title,
        tier: c.gatingTier,
        price: TIER_PRICES[c.gatingTier] ?? 0,
      })),
    });
  } catch (error) {
    console.error("GET bundle error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to calculate bundle" } },
      { status: 500 }
    );
  }
}

// POST — purchase the bundle (unlock all remaining gated chapters)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

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

    // Get story owner
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

    if (story.userId === userId) {
      return NextResponse.json({ unlocked: true, alreadyOwned: true });
    }

    // Get locked chapters for this user
    const gatedChapters = await db
      .select({
        id: chapters.id,
        gatingTier: chapters.gatingTier,
      })
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, storyId),
          ne(chapters.gatingTier, "free"),
          isNull(chapters.deletedAt),
          eq(chapters.status, "published")
        )
      );

    const owned = await db
      .select({ chapterId: contentUnlocks.chapterId })
      .from(contentUnlocks)
      .where(
        and(eq(contentUnlocks.userId, userId), eq(contentUnlocks.storyId, storyId))
      );
    const ownedIds = new Set(owned.map((o) => o.chapterId));
    const toUnlock = gatedChapters.filter((c) => !ownedIds.has(c.id));

    if (toUnlock.length === 0) {
      return NextResponse.json({ unlocked: true, alreadyOwned: true });
    }

    const fullPrice = toUnlock.reduce(
      (sum, c) => sum + (TIER_PRICES[c.gatingTier] ?? 0),
      0
    );
    const bundlePrice = Math.floor(fullPrice * 0.7);

    // Atomic transaction
    const result = await db.transaction(async (tx) => {
      const [reader] = await tx
        .select({ inkDropBalance: users.inkDropBalance })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      const balance = reader?.inkDropBalance ?? 0;

      if (balance < bundlePrice) {
        return { error: "INSUFFICIENT_BALANCE" as const, balance, price: bundlePrice };
      }

      // Debit reader
      await tx
        .update(users)
        .set({ inkDropBalance: sql`${users.inkDropBalance} - ${bundlePrice}` })
        .where(eq(users.id, userId));

      // Credit creator (70%)
      const creatorShare = Math.floor(bundlePrice * 0.7);
      await tx
        .update(users)
        .set({ inkDropBalance: sql`${users.inkDropBalance} + ${creatorShare}` })
        .where(eq(users.id, story.userId));

      // Log transaction
      await tx.insert(inkDropTransactions).values({
        fromUserId: userId,
        toUserId: story.userId,
        amount: bundlePrice,
        type: "unlock",
        message: `Bundle unlock (${toUnlock.length} chapters, 30% discount)`,
      });

      // Create unlock records
      for (const chapter of toUnlock) {
        await tx.insert(contentUnlocks).values({
          userId,
          chapterId: chapter.id,
          storyId,
          dropsSpent: TIER_PRICES[chapter.gatingTier] ?? 0,
        });
      }

      return {
        unlocked: true,
        chaptersUnlocked: toUnlock.length,
        bundlePrice,
        savings: fullPrice - bundlePrice,
        newBalance: balance - bundlePrice,
      };
    });

    if ("error" in result && result.error === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        {
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `Not enough Ink Drops. Bundle costs ${result.price} but you have ${result.balance}.`,
          },
        },
        { status: 402 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST bundle unlock error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to purchase bundle" } },
      { status: 500 }
    );
  }
}
