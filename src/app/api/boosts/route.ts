import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyBoosts, stories, users } from "@/server/db/schema";
import { eq, and, gt, isNull, sql, desc } from "drizzle-orm";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { reconcileBoosts } from "@/server/services/boosts";

/**
 * GET /api/boosts
 * Returns all stories with active boosts for the browse page Spotlight section.
 * `?availability=1` returns just the hero-slot occupancy for /creator/boost —
 * that page was downloading the entire /api/home aggregate for two numbers.
 */
export async function GET(request: NextRequest) {
  try {
    const rl = applyRateLimit(request, null, "read");
    if (rl) return rl;

    await reconcileBoosts();
    const now = new Date();

    if (request.nextUrl.searchParams.get("availability")) {
      const heroRows = await db
        .select({ expiresAt: storyBoosts.expiresAt })
        .from(storyBoosts)
        .where(
          and(
            eq(storyBoosts.tier, "hero"),
            eq(storyBoosts.status, "active"),
            gt(storyBoosts.expiresAt, now)
          )
        )
        .orderBy(storyBoosts.expiresAt)
        .limit(5);
      return NextResponse.json({
        data: {
          heroActiveCount: heroRows.length,
          nextOpeningAt:
            heroRows.length >= 5 ? heroRows[0].expiresAt.toISOString() : null,
        },
      });
    }

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
        status: stories.status,
        hook: stories.hook,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
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
    return handleRouteError(error, "GET /api/boosts", "Failed to fetch boosts");
  }
}
