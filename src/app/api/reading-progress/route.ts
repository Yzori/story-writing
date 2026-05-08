import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { readingProgress, stories, chapters, users } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { upsertReadingProgressSchema } from "@/lib/validations";
import { applyRateLimit } from "@/server/api-utils";

/** UTC date in YYYY-MM-DD form for streak bucketing. */
function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Best-effort streak bump after a successful reading-progress upsert.
 * - If the last streak day is today (UTC) → no-op
 * - If the last streak day is yesterday → days += 1
 * - Otherwise → reset to 1
 * Always updates `readingStreakBest` to max(current, new).
 * Errors are swallowed — streak is a delight, not a contract.
 */
async function bumpReadingStreak(userId: string): Promise<void> {
  try {
    const [user] = await db
      .select({
        days: users.readingStreakDays,
        lastDay: users.readingStreakLastDay,
        best: users.readingStreakBest,
      })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) return;

    const today = utcDay();
    if (user.lastDay === today) return; // already counted today

    let nextDays = 1;
    if (user.lastDay) {
      const yesterday = utcDay(new Date(Date.now() - 86_400_000));
      if (user.lastDay === yesterday) {
        nextDays = (user.days ?? 0) + 1;
      }
    }
    const nextBest = Math.max(user.best ?? 0, nextDays);

    await db
      .update(users)
      .set({
        readingStreakDays: nextDays,
        readingStreakLastDay: today,
        readingStreakBest: nextBest,
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("bumpReadingStreak failed:", error);
  }
}

/**
 * GET /api/reading-progress?storyId=...
 * Returns the user's reading progress for a specific story, or all stories if no storyId.
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

    const limited = applyRateLimit(request, session.user.id, "read");
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get("storyId");

    if (storyId) {
      // Return progress for a single story
      const [progress] = await db
        .select({
          storyId: readingProgress.storyId,
          chapterId: readingProgress.chapterId,
          scrollPercent: readingProgress.scrollPercent,
          pageNumber: readingProgress.pageNumber,
          updatedAt: readingProgress.updatedAt,
        })
        .from(readingProgress)
        .where(
          and(
            eq(readingProgress.userId, session.user.id),
            eq(readingProgress.storyId, storyId)
          )
        )
        .limit(1);

      return NextResponse.json({ data: progress || null });
    }

    // Return all reading progress for the user, joined with story/chapter info
    const progressList = await db
      .select({
        storyId: readingProgress.storyId,
        chapterId: readingProgress.chapterId,
        scrollPercent: readingProgress.scrollPercent,
        pageNumber: readingProgress.pageNumber,
        updatedAt: readingProgress.updatedAt,
        storyTitle: stories.title,
        storySlug: stories.slug,
        storyCoverUrl: stories.coverImageUrl,
        storyGenres: stories.genres,
        chapterTitle: chapters.title,
        chapterSortOrder: chapters.sortOrder,
        authorName: users.displayName,
        authorId: stories.userId,
      })
      .from(readingProgress)
      .innerJoin(stories, eq(readingProgress.storyId, stories.id))
      .innerJoin(chapters, eq(readingProgress.chapterId, chapters.id))
      .innerJoin(users, eq(stories.userId, users.id))
      .where(eq(readingProgress.userId, session.user.id))
      .orderBy(readingProgress.updatedAt);

    // Reverse so most recent is first
    progressList.reverse();

    return NextResponse.json({ data: progressList });
  } catch (error) {
    console.error("GET /api/reading-progress error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch reading progress" } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reading-progress
 * Upsert reading progress for a story.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const body = await request.json();
    const parsed = upsertReadingProgressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { storyId, chapterId, scrollPercent, pageNumber } = parsed.data;
    const userId = session.user.id;

    // Verify story is accessible (public or owned by user)
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story || (!story.isPublic && story.userId !== userId)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Atomic upsert — avoids race condition between concurrent reads
    const [result] = await db
      .insert(readingProgress)
      .values({
        userId,
        storyId,
        chapterId,
        scrollPercent: scrollPercent ?? 0,
        pageNumber: pageNumber ?? 1,
      })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.storyId],
        set: {
          chapterId,
          scrollPercent: scrollPercent ?? 0,
          pageNumber: pageNumber ?? 1,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Fire-and-forget streak bump. Reading is a daily habit loop, so we
    // count the act of saving any progress on a chapter as "read today".
    bumpReadingStreak(userId).catch(() => {});

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("PUT /api/reading-progress error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save reading progress" } },
      { status: 500 }
    );
  }
}
