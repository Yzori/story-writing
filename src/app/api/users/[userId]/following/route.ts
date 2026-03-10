import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  follows,
  stories,
  users,
  chapters,
  sparks as sparksTable,
} from "@/lib/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * GET /api/users/[userId]/following
 * Returns all stories the given user follows, with full story metadata.
 * Requires authentication — only the authenticated user can view their own following list.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { userId } = await params;

    // Only allow users to view their own following list
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot view another user's following list" } },
        { status: 403 }
      );
    }

    // Subqueries for chapter stats and spark counts (same pattern as /api/stories)
    const chapterStats = db
      .select({
        storyId: chapters.storyId,
        chapterCount: sql<number>`count(*)`.as("chapter_count"),
        totalWords: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`.as(
          "total_words"
        ),
      })
      .from(chapters)
      .where(isNull(chapters.deletedAt))
      .groupBy(chapters.storyId)
      .as("chapter_stats");

    const sparkStats = db
      .select({
        storyId: sparksTable.storyId,
        sparkCount: sql<number>`count(*)`.as("spark_count"),
      })
      .from(sparksTable)
      .groupBy(sparksTable.storyId)
      .as("spark_stats");

    const results = await db
      .select({
        id: stories.id,
        userId: stories.userId,
        title: stories.title,
        format: stories.format,
        synopsis: stories.synopsis,
        coverImageUrl: stories.coverImageUrl,
        genres: stories.genres,
        contentRating: stories.contentRating,
        status: stories.status,
        isPublic: stories.isPublic,
        slug: stories.slug,
        publishedAt: stories.publishedAt,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        authorName: users.displayName,
        authorImage: users.avatarUrl,
        chapterCount: sql<number>`coalesce(${chapterStats.chapterCount}, 0)`,
        totalWords: sql<number>`coalesce(${chapterStats.totalWords}, 0)`,
        sparkCount: sql<number>`coalesce(${sparkStats.sparkCount}, 0)`,
        followedAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(stories, and(eq(follows.storyId, stories.id), isNull(stories.deletedAt)))
      .leftJoin(users, eq(stories.userId, users.id))
      .leftJoin(chapterStats, eq(stories.id, chapterStats.storyId))
      .leftJoin(sparkStats, eq(stories.id, sparkStats.storyId))
      .where(eq(follows.userId, session.user.id))
      .orderBy(desc(follows.createdAt));

    return NextResponse.json({
      data: { stories: results },
    });
  } catch (error) {
    console.error("GET /api/users/[userId]/following error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch followed stories" } },
      { status: 500 }
    );
  }
}
