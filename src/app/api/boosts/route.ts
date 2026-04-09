import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyBoosts, stories, users } from "@/server/db/schema";
import { eq, and, gt, isNull, sql, desc } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";
import { reconcileBoosts } from "@/server/services/boosts";

/**
 * GET /api/boosts
 * Returns all stories with active boosts for the browse page Spotlight section.
 */
export async function GET(request: NextRequest) {
  try {
    const rl = applyRateLimit(request, null, "read");
    if (rl) return rl;

    await reconcileBoosts();
    const now = new Date();

    const boostedStories = await db
      .select({
        boostId: storyBoosts.id,
        boostExpiresAt: storyBoosts.expiresAt,
        storyId: stories.id,
        title: stories.title,
        slug: stories.slug,
        synopsis: stories.synopsis,
        coverImageUrl: stories.coverImageUrl,
        genres: stories.genres,
        format: stories.format,
        writingMode: stories.writingMode,
        contentRating: stories.contentRating,
        authorName: users.displayName,
        authorId: users.id,
        chapterCount: sql<number>`(
          select count(*) from chapters
          where chapters.story_id = ${stories.id}
            and chapters.status = 'published'
        )`,
        sparkCount: sql<number>`(
          select count(*) from sparks
          where sparks.story_id = ${stories.id}
        )`,
        totalWords: sql<number>`coalesce((
          select sum(chapters.word_count) from chapters
          where chapters.story_id = ${stories.id}
            and chapters.status = 'published'
        ), 0)`,
      })
      .from(storyBoosts)
      .innerJoin(stories, and(
        eq(storyBoosts.storyId, stories.id),
        eq(stories.isPublic, true),
        isNull(stories.deletedAt)
      ))
      .leftJoin(users, eq(stories.userId, users.id))
      .where(
        and(
          gt(storyBoosts.expiresAt, now),
          eq(storyBoosts.status, "active"),
          eq(storyBoosts.tier, "standard"),
        ),
      )
      .orderBy(desc(storyBoosts.createdAt))
      .limit(12);

    return NextResponse.json({ data: boostedStories });
  } catch (error) {
    console.error("GET boosts error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch boosts" } },
      { status: 500 }
    );
  }
}
