import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/server/api-utils";
import { db } from "@/server/db";
import { stories, chapters, staffPicks, users } from "@/server/db/schema";
import { and, eq, isNull, desc, sql, inArray } from "drizzle-orm";

/**
 * GET /api/read/demo
 *
 * Anonymous "3-story demo loop" for the marketing landing's
 * "Start reading — no account needed" entry. Picks 3 short published stories
 * heavily biased toward staff picks and short flash pieces (<1500 words).
 * No personalization, no progress.
 *
 * Response matches /api/read/queue: { data: { queue: [...] } }
 */
export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, null, "read", {
    max: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    // Chapter word-count sum per story, plus a flag for short/flash (<1500 words total)
    const storyStats = db
      .select({
        storyId: chapters.storyId,
        totalWords: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`.as(
          "total_words",
        ),
        chapterCount: sql<number>`count(*)`.as("chapter_count"),
      })
      .from(chapters)
      .where(and(eq(chapters.status, "published"), isNull(chapters.deletedAt)))
      .groupBy(chapters.storyId)
      .as("story_stats");

    const staffPickSub = db
      .select({
        storyId: staffPicks.storyId,
        isPick: sql<number>`1`.as("is_pick"),
      })
      .from(staffPicks)
      .groupBy(staffPicks.storyId)
      .as("staff_pick_sub");

    const candidates = await db
      .select({
        id: stories.id,
        userId: stories.userId,
        title: stories.title,
        slug: stories.slug,
        synopsis: stories.synopsis,
        coverImageUrl: stories.coverImageUrl,
        format: stories.format,
        genres: stories.genres,
        authorName: users.displayName,
        authorAvatar: users.avatarUrl,
        isStaffPick: sql<number>`coalesce(${staffPickSub.isPick}, 0)`,
        totalWords: sql<number>`coalesce(${storyStats.totalWords}, 0)`,
        chapterCount: sql<number>`coalesce(${storyStats.chapterCount}, 0)`,
      })
      .from(stories)
      .leftJoin(users, eq(stories.userId, users.id))
      .leftJoin(staffPickSub, eq(stories.id, staffPickSub.storyId))
      .leftJoin(storyStats, eq(stories.id, storyStats.storyId))
      .where(
        and(
          eq(stories.isPublic, true),
          eq(stories.status, "published"),
          isNull(stories.deletedAt),
        ),
      )
      .orderBy(
        // Staff picks first, then shortest totals, then newest
        desc(sql`coalesce(${staffPickSub.isPick}, 0)`),
      )
      .limit(40);

    // Prefer <1500 words; fall back to anything short-ish
    const flash = candidates
      .filter((c) => Number(c.totalWords) > 0 && Number(c.totalWords) < 1500)
      .slice(0, 3);
    const picks =
      flash.length >= 3
        ? flash
        : [...flash, ...candidates.filter((c) => !flash.includes(c))].slice(
            0,
            3,
          );

    if (picks.length === 0) {
      return NextResponse.json({ data: { queue: [] } });
    }

    // Resolve first published chapter per story
    const storyIds = picks.map((p) => p.id);
    const firstChapterRows = await db
      .select({
        storyId: chapters.storyId,
        id: chapters.id,
        sortOrder: chapters.sortOrder,
      })
      .from(chapters)
      .where(
        and(
          inArray(chapters.storyId, storyIds),
          eq(chapters.status, "published"),
          isNull(chapters.deletedAt),
        ),
      )
      .orderBy(chapters.storyId, chapters.sortOrder);

    const firstChapterByStory = new Map<string, string>();
    for (const row of firstChapterRows) {
      if (!firstChapterByStory.has(row.storyId)) {
        firstChapterByStory.set(row.storyId, row.id);
      }
    }

    const queue = picks
      .map((p) => {
        const chapterId = firstChapterByStory.get(p.id);
        if (!chapterId) return null;
        return {
          storyId: p.id,
          chapterId,
          startOffset: 0,
          reason: (Number(p.isStaffPick) > 0 ? "staff-pick" : "new-voice") as
            | "staff-pick"
            | "new-voice",
          story: {
            title: p.title,
            slug: p.slug,
            synopsis: p.synopsis,
            coverImageUrl: p.coverImageUrl,
            format: p.format,
            authorName: p.authorName,
            authorAvatar: p.authorAvatar,
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return NextResponse.json({ data: { queue } });
  } catch (error) {
    console.error("GET /api/read/demo error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to build demo queue",
        },
      },
      { status: 500 },
    );
  }
}
