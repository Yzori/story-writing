import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  chapters,
  sparks,
  follows,
  staffPicks,
  readingProgress,
  users,
} from "@/server/db/schema";
import { and, eq, isNull, inArray, sql, desc, ne } from "drizzle-orm";
import { auth } from "@/server/auth";

/**
 * GET /api/read/queue
 *
 * Returns an ordered queue of up to 20 chapters for the For You reader.
 * Ranking is a weighted-sum over user signals (spec docs/FOR_YOU_READER.md §4).
 * Simple and explainable — no ML, tune later.
 *
 * Query params:
 *   - limit (default 20, max 40)
 *   - exclude (comma-separated storyIds — client-side swipe-left dismissals this session)
 *
 * Response:
 *   { data: { queue: Array<{ storyId, chapterId, startOffset, reason }> } }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      40,
    );
    const excludeParam = searchParams.get("exclude") || "";
    const excludeIds = excludeParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const userId = session?.user?.id ?? null;

    // ── Gather user signals ──────────────────────────────────
    const [sparkRows, followRows, progressRows] = userId
      ? await Promise.all([
          db
            .select({
              storyId: sparks.storyId,
              authorId: stories.userId,
            })
            .from(sparks)
            .leftJoin(stories, eq(sparks.storyId, stories.id))
            .where(eq(sparks.userId, userId)),
          db
            .select({
              storyId: follows.storyId,
              authorId: stories.userId,
            })
            .from(follows)
            .leftJoin(stories, eq(follows.storyId, stories.id))
            .where(eq(follows.userId, userId)),
          db
            .select({
              storyId: readingProgress.storyId,
              chapterId: readingProgress.chapterId,
              scrollPercent: readingProgress.scrollPercent,
              updatedAt: readingProgress.updatedAt,
              genres: stories.genres,
              format: stories.format,
            })
            .from(readingProgress)
            .leftJoin(stories, eq(readingProgress.storyId, stories.id))
            .where(eq(readingProgress.userId, userId)),
        ])
      : [[], [], []];

    const sparkedStoryIds = new Set(sparkRows.map((r) => r.storyId));
    const sparkedAuthorIds = new Set(
      sparkRows.map((r) => r.authorId).filter((x): x is string => !!x),
    );
    const followedStoryIds = new Set(followRows.map((r) => r.storyId));
    const followedAuthorIds = new Set(
      followRows.map((r) => r.authorId).filter((x): x is string => !!x),
    );

    // Progress map for resume + completion detection
    const progressByStory = new Map<
      string,
      {
        chapterId: string;
        scrollPercent: number;
        updatedAt: Date;
      }
    >();
    const formatCounts = new Map<string, number>();
    const genreCounts = new Map<string, number>();
    for (const p of progressRows) {
      progressByStory.set(p.storyId, {
        chapterId: p.chapterId,
        scrollPercent: p.scrollPercent,
        updatedAt: p.updatedAt,
      });
      if (p.format) {
        formatCounts.set(p.format, (formatCounts.get(p.format) ?? 0) + 1);
      }
      if (p.genres) {
        for (const g of p.genres) {
          genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
        }
      }
    }
    const topGenres = new Set(
      [...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g),
    );
    const activeFormats = new Set(formatCounts.keys());

    // ── Fetch candidate stories ──────────────────────────────
    const conditions = [
      eq(stories.isPublic, true),
      eq(stories.status, "published"),
      isNull(stories.deletedAt),
    ];
    if (userId) {
      conditions.push(ne(stories.userId, userId));
    }
    if (excludeIds.length > 0) {
      conditions.push(sql`${stories.id} NOT IN (${sql.join(
        excludeIds.map((id) => sql`${id}`),
        sql`, `,
      )})`);
    }

    // Staff pick lookup subquery
    const staffPickSub = db
      .select({
        storyId: staffPicks.storyId,
        isPick: sql<number>`1`.as("is_pick"),
      })
      .from(staffPicks)
      .groupBy(staffPicks.storyId)
      .as("staff_pick_sub");

    // Latest published chapter per story (for "new chapter" detection + fallback start)
    const latestChapterSub = db
      .select({
        storyId: chapters.storyId,
        latestCreatedAt: sql<Date>`max(${chapters.createdAt})`.as(
          "latest_chapter_created_at",
        ),
      })
      .from(chapters)
      .where(
        and(eq(chapters.status, "published"), isNull(chapters.deletedAt)),
      )
      .groupBy(chapters.storyId)
      .as("latest_chapter_sub");

    const candidates = await db
      .select({
        id: stories.id,
        userId: stories.userId,
        title: stories.title,
        slug: stories.slug,
        synopsis: stories.synopsis,
        hook: stories.hook,
        coverImageUrl: stories.coverImageUrl,
        format: stories.format,
        genres: stories.genres,
        publishedAt: stories.publishedAt,
        createdAt: stories.createdAt,
        authorName: users.displayName,
        authorAvatar: users.avatarUrl,
        authorCreatedAt: users.createdAt,
        isStaffPick: sql<number>`coalesce(${staffPickSub.isPick}, 0)`,
        latestChapterAt: latestChapterSub.latestCreatedAt,
      })
      .from(stories)
      .leftJoin(users, eq(stories.userId, users.id))
      .leftJoin(staffPickSub, eq(stories.id, staffPickSub.storyId))
      .leftJoin(latestChapterSub, eq(stories.id, latestChapterSub.storyId))
      .where(and(...conditions))
      .orderBy(desc(stories.publishedAt))
      .limit(300);

    // Candidates with at least one published chapter
    const withChapter = candidates.filter((c) => !!c.latestChapterAt);

    // ── Score each candidate ─────────────────────────────────
    type Scored = {
      storyId: string;
      authorId: string;
      score: number;
      reason:
        | "resume"
        | "new-chapter"
        | "sparked-author"
        | "staff-pick"
        | "new-voice"
        | "genre-match"
        | "exploration";
      progress: { chapterId: string; scrollPercent: number } | null;
      hasNewChapter: boolean;
      meta: {
        title: string;
        slug: string | null;
        synopsis: string | null;
        coverImageUrl: string | null;
        format: string;
        authorName: string | null;
        authorAvatar: string | null;
      };
    };

    const scored: Scored[] = withChapter.map((c) => {
      let score = 0;
      const progress = progressByStory.get(c.id) ?? null;
      const hasNewChapter =
        !!progress &&
        !!c.latestChapterAt &&
        new Date(c.latestChapterAt).getTime() >
          new Date(progress.updatedAt ?? 0).getTime();

      if (sparkedStoryIds.has(c.id)) score += 5;
      if (sparkedAuthorIds.has(c.userId)) score += 8;
      if (followedStoryIds.has(c.id)) score += 10;
      if (followedAuthorIds.has(c.userId)) score += 12;
      if (Number(c.isStaffPick) > 0) score += 6;
      if (c.genres?.some((g) => topGenres.has(g))) score += 4;
      if (activeFormats.has(c.format)) score += 3;
      if (hasNewChapter) score += 15;
      // New Voice: author joined in the last 30 days
      const isNewVoice =
        c.authorCreatedAt &&
        Date.now() - new Date(c.authorCreatedAt).getTime() <
          30 * 24 * 60 * 60 * 1000;
      if (isNewVoice) score += 4;
      if (!progress && !c.genres?.some((g) => topGenres.has(g))) score -= 2;

      // Decide the reason tag (most meaningful signal wins)
      let reason: Scored["reason"] = "genre-match";
      if (progress && !hasNewChapter) reason = "resume";
      else if (hasNewChapter) reason = "new-chapter";
      else if (sparkedAuthorIds.has(c.userId)) reason = "sparked-author";
      else if (Number(c.isStaffPick) > 0) reason = "staff-pick";
      else if (isNewVoice) reason = "new-voice";
      else if (c.genres?.some((g) => topGenres.has(g))) reason = "genre-match";
      else reason = "new-voice";

      return {
        storyId: c.id,
        authorId: c.userId,
        score,
        reason,
        progress: progress
          ? { chapterId: progress.chapterId, scrollPercent: progress.scrollPercent }
          : null,
        hasNewChapter,
        meta: {
          title: c.title,
          slug: c.slug,
          synopsis: c.synopsis,
          coverImageUrl: c.coverImageUrl,
          format: c.format,
          authorName: c.authorName,
          authorAvatar: c.authorAvatar,
        },
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // ── Build the queue with exploration slots every 5th ─────
    const ranked = scored.filter((s) => s.score > 0 || !userId);
    const pool = scored.filter((s) => !ranked.includes(s));

    const queue: Scored[] = [];
    const used = new Set<string>();
    let rankedIdx = 0;
    let poolIdx = 0;
    for (let i = 0; i < limit; i++) {
      const isExplorationSlot = (i + 1) % 5 === 0;
      let pick: Scored | undefined;
      if (isExplorationSlot) {
        while (poolIdx < pool.length && used.has(pool[poolIdx].storyId))
          poolIdx++;
        pick = pool[poolIdx++];
        if (pick) pick = { ...pick, reason: "exploration" };
      }
      if (!pick) {
        while (rankedIdx < ranked.length && used.has(ranked[rankedIdx].storyId))
          rankedIdx++;
        pick = ranked[rankedIdx++];
      }
      if (!pick) {
        // Fall back to whichever pool still has items
        while (poolIdx < pool.length && used.has(pool[poolIdx].storyId))
          poolIdx++;
        pick = pool[poolIdx++];
      }
      if (!pick) break;
      used.add(pick.storyId);
      queue.push(pick);
    }

    if (queue.length === 0) {
      return NextResponse.json({ data: { queue: [] } });
    }

    // ── Resolve chapter + startOffset per queue item ─────────
    // For each story: resume chapter from progress, or earliest published chapter.
    const queueStoryIds = queue.map((q) => q.storyId);

    const firstChapterRows = await db
      .select({
        storyId: chapters.storyId,
        id: chapters.id,
        sortOrder: chapters.sortOrder,
      })
      .from(chapters)
      .where(
        and(
          inArray(chapters.storyId, queueStoryIds),
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

    const resolved = queue
      .map((q) => {
        const chapterId = q.progress?.chapterId ?? firstChapterByStory.get(q.storyId);
        if (!chapterId) return null;
        const startOffset = q.progress?.scrollPercent ?? 0;
        return {
          storyId: q.storyId,
          chapterId,
          startOffset,
          reason: q.reason,
          story: q.meta,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Fire-and-forget: track "Appeared in Feed" for writers
    if (resolved.length > 0) {
      const idsToBump = resolved.map((r) => r.storyId);
      db.execute(
        sql`UPDATE stories SET feed_impressions = feed_impressions + 1 WHERE id IN (${sql.join(
          idsToBump.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ).catch(() => {});
    }

    return NextResponse.json({ data: { queue: resolved } });
  } catch (error) {
    console.error("GET /api/read/queue error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to build reader queue",
        },
      },
      { status: 500 },
    );
  }
}
