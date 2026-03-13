import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readingProgress, stories, chapters, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { upsertReadingProgressSchema } from "@/lib/validations";
import { applyRateLimit } from "@/lib/api-utils";

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

    // Check if progress already exists for this user+story
    const [existing] = await db
      .select({ id: readingProgress.id })
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.storyId, storyId)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing progress
      const [updated] = await db
        .update(readingProgress)
        .set({
          chapterId,
          scrollPercent: scrollPercent ?? 0,
          pageNumber: pageNumber ?? 1,
          updatedAt: new Date(),
        })
        .where(eq(readingProgress.id, existing.id))
        .returning();

      return NextResponse.json({ data: updated });
    } else {
      // Insert new progress
      const [created] = await db
        .insert(readingProgress)
        .values({
          userId,
          storyId,
          chapterId,
          scrollPercent: scrollPercent ?? 0,
          pageNumber: pageNumber ?? 1,
        })
        .returning();

      return NextResponse.json({ data: created }, { status: 201 });
    }
  } catch (error) {
    console.error("PUT /api/reading-progress error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save reading progress" } },
      { status: 500 }
    );
  }
}
