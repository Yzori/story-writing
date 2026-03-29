import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { stories, chapters, contentUnlocks } from "@/server/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

const TIER_PRICES: Record<string, number> = {
  free: 0,
  standard: 15,
  extended: 30,
  premium: 50,
};

// GET — get story monetization settings + chapter gating overview
export async function GET(
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

    const rl = applyRateLimit(request, session.user.id, "read");
    if (rl) return rl;

    // Must be story owner
    const [story] = await db
      .select({
        id: stories.id,
        userId: stories.userId,
        monetizationModel: stories.monetizationModel,
        freeChapterCount: stories.freeChapterCount,
        defaultGatingTier: stories.defaultGatingTier,
      })
      .from(stories)
      .where(eq(stories.id, storyId));

    if (!story || story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Get chapter gating overview
    const chapterGating = await db
      .select({
        id: chapters.id,
        title: chapters.title,
        sortOrder: chapters.sortOrder,
        gatingTier: chapters.gatingTier,
        earlyAccessDays: chapters.earlyAccessDays,
        status: chapters.status,
      })
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), sql`${chapters.deletedAt} IS NULL`))
      .orderBy(chapters.sortOrder);

    // Revenue stats
    const [stats] = await db
      .select({
        totalUnlocks: sql<number>`count(*)`,
        totalDrops: sql<number>`coalesce(sum(${contentUnlocks.dropsSpent}), 0)`,
      })
      .from(contentUnlocks)
      .where(eq(contentUnlocks.storyId, storyId));

    return NextResponse.json({
      monetizationModel: story.monetizationModel,
      freeChapterCount: story.freeChapterCount,
      defaultGatingTier: story.defaultGatingTier,
      chapters: chapterGating,
      stats: {
        totalUnlocks: Number(stats?.totalUnlocks ?? 0),
        totalDrops: Number(stats?.totalDrops ?? 0),
        creatorRevenue: Math.floor(Number(stats?.totalDrops ?? 0) * 0.7),
      },
    });
  } catch (error) {
    console.error("GET monetization error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch monetization settings" } },
      { status: 500 }
    );
  }
}

// PUT — update story monetization settings
export async function PUT(
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

    // Must be story owner
    const [story] = await db
      .select({ id: stories.id, userId: stories.userId })
      .from(stories)
      .where(eq(stories.id, storyId));

    if (!story || story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { monetizationModel, freeChapterCount, defaultGatingTier, chapterOverrides } = body;

    // Validate model
    if (monetizationModel && !["free", "freemium", "gated"].includes(monetizationModel)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid monetization model" } },
        { status: 400 }
      );
    }

    // Validate tier
    if (defaultGatingTier && !["standard", "extended", "premium"].includes(defaultGatingTier)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid gating tier" } },
        { status: 400 }
      );
    }

    // Validate free chapter count (min 3)
    if (freeChapterCount !== undefined && (freeChapterCount < 3 || freeChapterCount > 50)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Free chapter count must be between 3 and 50" } },
        { status: 400 }
      );
    }

    // Update story settings
    const storyUpdate: Record<string, any> = { updatedAt: new Date() };
    if (monetizationModel) storyUpdate.monetizationModel = monetizationModel;
    if (freeChapterCount !== undefined) storyUpdate.freeChapterCount = freeChapterCount;
    if (defaultGatingTier) storyUpdate.defaultGatingTier = defaultGatingTier;

    await db.update(stories).set(storyUpdate).where(eq(stories.id, storyId));

    // Apply per-chapter overrides if provided
    // chapterOverrides: [{ chapterId, gatingTier, earlyAccessDays }]
    if (Array.isArray(chapterOverrides)) {
      for (const override of chapterOverrides) {
        if (!override.chapterId) continue;
        const chapterUpdate: Record<string, any> = {};
        if (override.gatingTier && ["free", "standard", "extended", "premium"].includes(override.gatingTier)) {
          chapterUpdate.gatingTier = override.gatingTier;
        }
        if (override.earlyAccessDays !== undefined && [0, 3, 5, 7].includes(override.earlyAccessDays)) {
          chapterUpdate.earlyAccessDays = override.earlyAccessDays;
          // Set earlyAccessUntil if chapter is published and has early access
          if (override.earlyAccessDays > 0) {
            const until = new Date();
            until.setDate(until.getDate() + override.earlyAccessDays);
            chapterUpdate.earlyAccessUntil = until;
          } else {
            chapterUpdate.earlyAccessUntil = null;
          }
        }
        if (Object.keys(chapterUpdate).length > 0) {
          await db
            .update(chapters)
            .set(chapterUpdate)
            .where(and(eq(chapters.id, override.chapterId), eq(chapters.storyId, storyId)));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT monetization error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update monetization settings" } },
      { status: 500 }
    );
  }
}
