import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  chapters,
  users,
  sparks,
  follows,
  creatorUpdates,
  suggestions,
  writingSessions,
  inkDropTransactions,
  readingProgress,
  commissions,
  offerings,
  comments,
} from "@/server/db/schema";
import { and, desc, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { extractLastLines } from "@/lib/text-extract";

/**
 * GET /api/dashboard
 *
 * Supplementary real signals for the Studio dashboard — the things the page
 * can't already derive from /api/stories, /api/campaigns/mine, and
 * /api/notifications. Everything here is sourced from existing tables (no
 * fabricated data):
 *
 *   readingStreak    users.readingStreakDays
 *   continueReading  reading_progress (latest) + story/chapter
 *   wordsTrend       writing_sessions, summed per day over the last 14 days
 *   sparksWeek       sparks on owned stories in the last 7 days
 *   dropsWeek        ink_drop_transactions received in the last 7 days
 *   suggestions      pending suggestions on owned stories (count + latest)
 *   follows          recent published chapters + creator updates from
 *                    stories the user follows
 *   manuscript       the user's most recently touched chapter (non-campaign)
 *                    with its closing lines — the studio quotes the page
 *                    exactly where the ink stopped
 *   readerNotes      real comments left on owned stories this week, quoted
 *   newFollowersWeek follows gained on owned stories in the last 7 days
 *
 * Every query is scoped by the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const limited = applyRateLimit(request, userId, "read");
    if (limited) return limited;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

    // last 14 calendar days (UTC), oldest → newest, for the words trend
    const trendDays: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      trendDays.push(d.toISOString().slice(0, 10));
    }
    const trendStart = trendDays[0];

    // stories the user follows — used as a semi-join, never materialized in Node
    const followedStoryIds = db
      .select({ id: follows.storyId })
      .from(follows)
      .where(eq(follows.userId, userId));

    const [
      streakRow,
      continueRows,
      trendRows,
      sparksWeekRow,
      dropsWeekRow,
      suggestionRows,
      newChapters,
      newUpdates,
      commissionRows,
      commissionCountRow,
      manuscriptRows,
      readerNoteRows,
      newFollowersRow,
    ] = await Promise.all([
      // ── reading streak ──
      db.select({ days: users.readingStreakDays }).from(users).where(eq(users.id, userId)).limit(1),

      // ── continue reading (most recently progressed story) ──
      db
        .select({
          storyId: readingProgress.storyId,
          slug: stories.slug,
          storyTitle: stories.title,
          coverImageUrl: stories.coverImageUrl,
          genres: stories.genres,
          authorName: users.displayName,
          chapterId: readingProgress.chapterId,
          chapterTitle: chapters.title,
          chapterSort: chapters.sortOrder,
          scrollPercent: readingProgress.scrollPercent,
          updatedAt: readingProgress.updatedAt,
          totalChapters: sql<number>`(
            select count(*) from ${chapters} c
            where c.story_id = ${readingProgress.storyId}
              and c.status = 'published' and c.deleted_at is null
          )`,
        })
        .from(readingProgress)
        .leftJoin(stories, eq(readingProgress.storyId, stories.id))
        .leftJoin(chapters, eq(readingProgress.chapterId, chapters.id))
        .leftJoin(users, eq(stories.userId, users.id))
        .where(and(eq(readingProgress.userId, userId), isNull(stories.deletedAt)))
        .orderBy(desc(readingProgress.updatedAt))
        .limit(1),

      // ── words written per day, last 14 days ──
      db
        .select({
          date: writingSessions.date,
          words: sql<number>`coalesce(sum(${writingSessions.wordsWritten}), 0)`,
        })
        .from(writingSessions)
        .where(and(eq(writingSessions.userId, userId), gte(writingSessions.date, trendStart)))
        .groupBy(writingSessions.date),

      // ── sparks on owned stories, last 7 days ──
      db
        .select({ c: sql<number>`count(*)` })
        .from(sparks)
        .innerJoin(stories, eq(sparks.storyId, stories.id))
        .where(and(eq(stories.userId, userId), gte(sparks.createdAt, weekAgo))),

      // ── drops received, last 7 days ──
      db
        .select({ total: sql<number>`coalesce(sum(${inkDropTransactions.amount}), 0)` })
        .from(inkDropTransactions)
        .where(and(eq(inkDropTransactions.toUserId, userId), gte(inkDropTransactions.createdAt, weekAgo))),

      // ── pending suggestions on owned stories — latest + total in one pass ──
      db
        .select({
          id: suggestions.id,
          storyId: suggestions.storyId,
          storyTitle: stories.title,
          storySlug: stories.slug,
          note: suggestions.note,
          content: suggestions.content,
          createdAt: suggestions.createdAt,
          total: sql<number>`count(*) over()`,
        })
        .from(suggestions)
        .innerJoin(stories, eq(suggestions.storyId, stories.id))
        .where(and(eq(stories.userId, userId), eq(suggestions.status, "pending")))
        .orderBy(desc(suggestions.createdAt))
        .limit(1),

      // ── recent published chapters on followed stories ──
      db
        .select({
          storyId: chapters.storyId,
          slug: stories.slug,
          storyTitle: stories.title,
          author: users.displayName,
          title: chapters.title,
          createdAt: chapters.createdAt,
        })
        .from(chapters)
        .innerJoin(stories, eq(chapters.storyId, stories.id))
        .leftJoin(users, eq(stories.userId, users.id))
        .where(
          and(
            inArray(chapters.storyId, followedStoryIds),
            eq(chapters.status, "published"),
            isNull(chapters.deletedAt),
          ),
        )
        .orderBy(desc(chapters.createdAt))
        .limit(8),

      // ── recent creator updates on followed stories ──
      db
        .select({
          storyId: creatorUpdates.storyId,
          slug: stories.slug,
          storyTitle: stories.title,
          author: users.displayName,
          content: creatorUpdates.content,
          createdAt: creatorUpdates.createdAt,
        })
        .from(creatorUpdates)
        .innerJoin(stories, eq(creatorUpdates.storyId, stories.id))
        .leftJoin(users, eq(creatorUpdates.userId, users.id))
        .where(inArray(creatorUpdates.storyId, followedStoryIds))
        .orderBy(desc(creatorUpdates.createdAt))
        .limit(8),

      // ── commission requests awaiting the user as artisan — latest few ──
      db
        .select({
          id: commissions.id,
          status: commissions.status,
          craft: offerings.craft,
          offeringTitle: offerings.title,
          patron: users.displayName,
          createdAt: commissions.createdAt,
        })
        .from(commissions)
        .leftJoin(offerings, eq(commissions.offeringId, offerings.id))
        .leftJoin(users, eq(commissions.patronId, users.id))
        .where(and(eq(commissions.artisanId, userId), inArray(commissions.status, ["requested", "accepted"])))
        .orderBy(desc(commissions.createdAt))
        .limit(5),

      // ── commission requests count (uncapped) ──
      db
        .select({ c: sql<number>`count(*)` })
        .from(commissions)
        .where(and(eq(commissions.artisanId, userId), inArray(commissions.status, ["requested", "accepted"]))),

      // ── the manuscript — most recently touched chapter on an owned,
      //    non-campaign story; only the content tail crosses the wire ──
      db
        .select({
          storyId: chapters.storyId,
          slug: stories.slug,
          storyTitle: stories.title,
          chapterId: chapters.id,
          chapterTitle: chapters.title,
          chapterSort: chapters.sortOrder,
          chapterWords: chapters.wordCount,
          // inline illustrations carry base64 data-URIs that can swallow the
          // whole tail window — drop them first so the tail reaches real prose
          contentTail: sql<string>`right(regexp_replace(${chapters.content}, 'data:[^"'' <>]*', ' ', 'g'), 4000)`,
          updatedAt: chapters.updatedAt,
        })
        .from(chapters)
        .innerJoin(stories, eq(chapters.storyId, stories.id))
        .where(
          and(
            eq(stories.userId, userId),
            ne(stories.writingMode, "campaign"),
            // adventure books are written at the table, never from the desk
            ne(stories.writingMode, "adventure"),
            isNull(stories.deletedAt),
            isNull(chapters.deletedAt),
          ),
        )
        .orderBy(desc(chapters.updatedAt))
        .limit(1),

      // ── reader notes — real comments on owned stories this week ──
      db
        .select({
          id: comments.id,
          content: comments.content,
          author: users.displayName,
          storyTitle: stories.title,
          slug: stories.slug,
          chapterId: comments.chapterId,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .innerJoin(stories, eq(comments.storyId, stories.id))
        .leftJoin(users, eq(comments.userId, users.id))
        .where(
          and(
            eq(stories.userId, userId),
            ne(comments.userId, userId),
            isNull(comments.deletedAt),
            gte(comments.createdAt, weekAgo),
          ),
        )
        .orderBy(desc(comments.createdAt))
        .limit(3),

      // ── follows gained on owned stories, last 7 days ──
      db
        .select({ c: sql<number>`count(*)` })
        .from(follows)
        .innerJoin(stories, eq(follows.storyId, stories.id))
        .where(and(eq(stories.userId, userId), gte(follows.createdAt, weekAgo))),
    ]);

    // ── build the 14-day trend, filling gaps with 0 ──
    const trendMap = new Map(trendRows.map((r) => [String(r.date), Number(r.words)]));
    const wordsTrend = trendDays.map((d) => trendMap.get(d) ?? 0);

    // ── follows feed: recent chapters + creator updates from followed stories ──
    const followFeed = [
      ...newChapters.map((c) => ({
        kind: "chapter" as const,
        storyId: c.storyId,
        slug: c.slug,
        storyTitle: c.storyTitle,
        author: c.author,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
      })),
      ...newUpdates.map((u) => ({
        kind: "update" as const,
        storyId: u.storyId,
        slug: u.slug,
        storyTitle: u.storyTitle,
        author: u.author,
        title: u.content.slice(0, 80),
        createdAt: u.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);

    // ── continue reading ──
    const cr = continueRows[0];
    const continueReading = cr
      ? {
          storyId: cr.storyId,
          slug: cr.slug,
          storyTitle: cr.storyTitle ?? "Untitled",
          coverImageUrl: cr.coverImageUrl,
          genres: cr.genres ?? [],
          author: cr.authorName,
          chapterId: cr.chapterId,
          chapterTitle: cr.chapterTitle ?? "Chapter 1",
          chapterNumber: (cr.chapterSort ?? 0) + 1,
          totalChapters: Number(cr.totalChapters ?? 0),
          scrollPercent: cr.scrollPercent ?? 0,
        }
      : null;

    // ── the manuscript, quoted where the ink stopped ──
    const m = manuscriptRows[0];
    const manuscript = m
      ? {
          storyId: m.storyId,
          slug: m.slug,
          storyTitle: m.storyTitle ?? "Untitled",
          chapterId: m.chapterId,
          chapterTitle: m.chapterTitle,
          chapterNumber: (m.chapterSort ?? 0) + 1,
          words: Number(m.chapterWords ?? 0),
          lastLines: extractLastLines(m.contentTail ?? ""),
          updatedAt: m.updatedAt.toISOString(),
        }
      : null;

    const readerNotes = readerNoteRows.map((n) => ({
      id: n.id,
      content: n.content.length > 220 ? `${n.content.slice(0, 217).trimEnd()}…` : n.content,
      author: n.author,
      storyTitle: n.storyTitle ?? "your story",
      slug: n.slug,
      chapterId: n.chapterId,
      createdAt: n.createdAt.toISOString(),
    }));

    const latestSuggestion = suggestionRows[0]
      ? {
          storyId: suggestionRows[0].storyId,
          storyTitle: suggestionRows[0].storyTitle ?? "your story",
          storySlug: suggestionRows[0].storySlug,
          note: suggestionRows[0].note || suggestionRows[0].content.slice(0, 80),
          createdAt: suggestionRows[0].createdAt.toISOString(),
        }
      : null;

    return NextResponse.json({
      data: {
        readingStreak: Number(streakRow[0]?.days ?? 0),
        continueReading,
        manuscript,
        readerNotes,
        newFollowersWeek: Number(newFollowersRow[0]?.c ?? 0),
        wordsTrend,
        sparksWeek: Number(sparksWeekRow[0]?.c ?? 0),
        dropsWeek: Number(dropsWeekRow[0]?.total ?? 0),
        suggestions: {
          count: Number(suggestionRows[0]?.total ?? 0),
          latest: latestSuggestion,
        },
        follows: followFeed,
        commissions: {
          count: Number(commissionCountRow[0]?.c ?? 0),
          latest: commissionRows[0]
            ? {
                id: commissionRows[0].id,
                craft: commissionRows[0].craft,
                title: commissionRows[0].offeringTitle ?? "a commission",
                patron: commissionRows[0].patron,
                status: commissionRows[0].status,
                createdAt: commissionRows[0].createdAt.toISOString(),
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load dashboard" } },
      { status: 500 },
    );
  }
}
