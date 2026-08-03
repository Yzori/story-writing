import "server-only";
import { and, desc, eq, gt, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  adventureApplications,
  adventureAudiencePresence,
  adventureSeatPresence,
  adventureSeats,
  adventures,
  campaignSessions,
  chapters,
  comments,
  commissions,
  creatorUpdates,
  follows,
  offerings,
  playerCharacters,
  readingProgress,
  sparks,
  stories,
  suggestions,
  users,
  writingSessions,
  inkDropTransactions as drops,
} from "@/server/db/schema";
import { extractLastLines } from "@/lib/text-extract";
import { AT_TABLE_WINDOW_MS, WRITING_WINDOW_MS } from "@/lib/adventure-presence";
import type {
  StudioShelfItem,
  StudioSignals,
  StudioSnapshot,
  StudioTable,
  TableSeatRole,
} from "@/types/studio";

// ─────────────────────────────────────────────────────────────────────────────
// The studio's data, built server-side in one pass.
//
// This is the single source of truth for /dashboard: the page (a server
// component) awaits it to render the hero into the initial HTML, and
// GET /api/dashboard returns the same shape for the client's quiet refresh.
// Before this existed the page fanned out to five endpoints after hydration
// and painted a skeleton until the slowest one landed.
//
// Everything here is real. Nothing is invented, inferred, or rounded up — the
// studio's oldest rule.
// ─────────────────────────────────────────────────────────────────────────────

/** The house counts a lantern lit while its heartbeat is this fresh. */
const AUDIENCE_PRESENCE_WINDOW_MS = 45_000;

/** A reader is "in the story right now" while their place moved this recently. */
const READER_PRESENCE_WINDOW_MS = 5 * 60_000;

export async function getStudioSnapshot(userId: string): Promise<StudioSnapshot> {
  const [shelf, tables, signals] = await Promise.all([
    getShelf(userId),
    getTables(userId),
    getSignals(userId),
  ]);
  return { shelf, tables, signals, builtAt: Date.now() };
}

// ── the shelf ────────────────────────────────────────────────────────────────

/**
 * Works you can reach: stories you own, campaigns you play in, and adventure
 * books you helped write once they've compiled. Adventure stories that are
 * still being written stay off the shelf — they live at the table, and
 * getTables() surfaces them there.
 */
async function getShelf(userId: string): Promise<StudioShelfItem[]> {
  const chapterStats = db
    .select({
      storyId: chapters.storyId,
      chapterCount: sql<number>`count(*)`.as("chapter_count"),
      totalWords: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`.as("total_words"),
    })
    .from(chapters)
    .where(isNull(chapters.deletedAt))
    .groupBy(chapters.storyId)
    .as("chapter_stats");

  const sparkStats = db
    .select({
      storyId: sparks.storyId,
      sparkCount: sql<number>`count(*)`.as("spark_count"),
    })
    .from(sparks)
    .groupBy(sparks.storyId)
    .as("spark_stats");

  const playerStats = db
    .select({
      storyId: playerCharacters.storyId,
      playerCount: sql<number>`count(distinct ${playerCharacters.userId})`.as("player_count"),
    })
    .from(playerCharacters)
    .where(eq(playerCharacters.status, "active"))
    .groupBy(playerCharacters.storyId)
    .as("player_stats");

  const rows = await db
    .select({
      id: stories.id,
      title: stories.title,
      format: stories.format,
      writingMode: stories.writingMode,
      status: stories.status,
      slug: stories.slug,
      coverImageUrl: stories.coverImageUrl,
      updatedAt: stories.updatedAt,
      chapterCount: sql<number>`coalesce(${chapterStats.chapterCount}, 0)`,
      totalWords: sql<number>`coalesce(${chapterStats.totalWords}, 0)`,
      sparkCount: sql<number>`coalesce(${sparkStats.sparkCount}, 0)`,
      playerCount: sql<number>`coalesce(${playerStats.playerCount}, 0)`,
    })
    .from(stories)
    .leftJoin(chapterStats, eq(chapterStats.storyId, stories.id))
    .leftJoin(sparkStats, eq(sparkStats.storyId, stories.id))
    .leftJoin(playerStats, eq(playerStats.storyId, stories.id))
    .where(
      and(
        isNull(stories.deletedAt),
        or(
          // mine — but an unfinished adventure isn't a book yet
          and(
            eq(stories.userId, userId),
            or(ne(stories.writingMode, "adventure"), eq(stories.status, "complete")),
          ),
          // campaigns I play in
          sql`exists (
            select 1 from ${playerCharacters} pc
            where pc.story_id = ${stories.id} and pc.user_id = ${userId}
          )`,
          // adventure books I helped write, once they've compiled
          and(
            eq(stories.status, "complete"),
            sql`exists (
              select 1 from ${adventureSeats} s
              join ${adventures} a on a.id = s.adventure_id
              where a.story_id = ${stories.id} and s.user_id = ${userId}
            )`,
          ),
        ),
      ),
    )
    .orderBy(desc(stories.updatedAt))
    .limit(60);

  if (rows.length === 0) return [];

  // the legacy campaign sessions that are open right now
  const campaignIds = rows.filter((r) => r.writingMode === "campaign").map((r) => r.id);
  const activeSessions = campaignIds.length
    ? await db
        .select({
          storyId: campaignSessions.storyId,
          id: campaignSessions.id,
          title: campaignSessions.title,
          activePlayerId: campaignSessions.activePlayerId,
        })
        .from(campaignSessions)
        .where(and(inArray(campaignSessions.storyId, campaignIds), eq(campaignSessions.status, "active")))
    : [];
  const sessionByStory = new Map(activeSessions.map((s) => [s.storyId, s]));

  return rows.map((r) => {
    const s = sessionByStory.get(r.id);
    return {
      id: r.id,
      title: r.title,
      format: r.format,
      writingMode: r.writingMode,
      status: r.status,
      slug: r.slug,
      coverImageUrl: r.coverImageUrl,
      chapterCount: Number(r.chapterCount ?? 0),
      totalWords: Number(r.totalWords ?? 0),
      sparkCount: Number(r.sparkCount ?? 0),
      playerCount: Number(r.playerCount ?? 0),
      updatedAt: r.updatedAt.toISOString(),
      activeSession: s ? { id: s.id, title: s.title, activePlayerId: s.activePlayerId } : null,
    };
  });
}

// ── the tables ───────────────────────────────────────────────────────────────

/**
 * Every live table you sit at or host. `spotlightDueAt` is the whole point:
 * a turn with a clock on it outranks anything else the studio can say.
 */
async function getTables(userId: string): Promise<StudioTable[]> {
  const tableRows = await db
    .select({
      id: adventures.id,
      storyId: adventures.storyId,
      ownerId: adventures.ownerId,
      premise: adventures.premise,
      genre: adventures.genre,
      pace: adventures.pace,
      turnDueHours: adventures.turnDueHours,
      status: adventures.status,
      actNo: adventures.actNo,
      sceneNo: adventures.sceneNo,
      spotlightSeatId: adventures.spotlightSeatId,
      spotlightDueAt: adventures.spotlightDueAt,
      updatedAt: adventures.updatedAt,
      title: stories.title,
      slug: stories.slug,
    })
    .from(adventures)
    .innerJoin(stories, eq(adventures.storyId, stories.id))
    .where(
      and(
        inArray(adventures.status, ["casting", "running"]),
        isNull(stories.deletedAt),
        or(
          eq(adventures.ownerId, userId),
          sql`exists (
            select 1 from ${adventureSeats} s
            where s.adventure_id = ${adventures.id} and s.user_id = ${userId}
          )`,
        ),
      ),
    )
    .orderBy(desc(adventures.updatedAt))
    .limit(12);

  if (tableRows.length === 0) return [];
  const ids = tableRows.map((t) => t.id);
  const now = Date.now();
  const seatFresh = new Date(now - AT_TABLE_WINDOW_MS);
  const writingFresh = new Date(now - WRITING_WINDOW_MS);
  const houseFresh = new Date(now - AUDIENCE_PRESENCE_WINDOW_MS);

  const [seatRows, presenceRows, audienceRows, applicationRows] = await Promise.all([
    db
      .select({
        id: adventureSeats.id,
        adventureId: adventureSeats.adventureId,
        userId: adventureSeats.userId,
        role: adventureSeats.role,
        displayName: users.displayName,
        name: users.name,
      })
      .from(adventureSeats)
      .leftJoin(users, eq(adventureSeats.userId, users.id))
      .where(inArray(adventureSeats.adventureId, ids)),

    db
      .select({
        adventureId: adventureSeatPresence.adventureId,
        seatId: adventureSeatPresence.seatId,
        lastSeen: adventureSeatPresence.lastSeen,
        writingAt: adventureSeatPresence.writingAt,
      })
      .from(adventureSeatPresence)
      .where(
        and(
          inArray(adventureSeatPresence.adventureId, ids),
          gt(adventureSeatPresence.lastSeen, seatFresh),
        ),
      ),

    db
      .select({
        adventureId: adventureAudiencePresence.adventureId,
        count: sql<number>`count(*)::int`,
      })
      .from(adventureAudiencePresence)
      .where(
        and(
          inArray(adventureAudiencePresence.adventureId, ids),
          gt(adventureAudiencePresence.lastHeartbeat, houseFresh),
        ),
      )
      .groupBy(adventureAudiencePresence.adventureId),

    db
      .select({
        adventureId: adventureApplications.adventureId,
        count: sql<number>`count(*)::int`,
      })
      .from(adventureApplications)
      .where(
        and(inArray(adventureApplications.adventureId, ids), eq(adventureApplications.status, "pending")),
      )
      .groupBy(adventureApplications.adventureId),
  ]);

  const watchersBy = new Map(audienceRows.map((r) => [r.adventureId, Number(r.count)]));
  const applicationsBy = new Map(applicationRows.map((r) => [r.adventureId, Number(r.count)]));
  const presenceBySeat = new Map(presenceRows.map((r) => [r.seatId, r]));

  return tableRows.map((t) => {
    const seats = seatRows.filter((s) => s.adventureId === t.id);
    const mySeat = seats.find((s) => s.userId === userId) ?? null;
    const filled = seats.filter((s) => s.userId);
    const present = filled.filter((s) => presenceBySeat.has(s.id));
    const writer = filled.find((s) => {
      const p = presenceBySeat.get(s.id);
      return p?.writingAt && p.writingAt > writingFresh && s.userId !== userId;
    });
    const spotlightSeat = t.spotlightSeatId ? seats.find((s) => s.id === t.spotlightSeatId) : undefined;
    const nameOf = (s?: { displayName: string | null; name: string | null }) =>
      s ? (s.displayName ?? s.name ?? null) : null;

    return {
      adventureId: t.id,
      storyId: t.storyId,
      slug: t.slug,
      title: t.title,
      premise: t.premise,
      genre: t.genre,
      pace: t.pace,
      turnDueHours: t.turnDueHours,
      status: t.status as "casting" | "running",
      actNo: t.actNo,
      sceneNo: t.sceneNo,
      mySeatId: mySeat?.id ?? null,
      myRole: (mySeat?.role as TableSeatRole | undefined) ?? null,
      isHost: t.ownerId === userId,
      isMyTurn: Boolean(mySeat && t.spotlightSeatId === mySeat.id),
      spotlightName: nameOf(spotlightSeat),
      spotlightDueAt: t.spotlightDueAt ? t.spotlightDueAt.toISOString() : null,
      seatsTotal: seats.length,
      seatsFilled: filled.length,
      openSeats: seats.length - filled.length,
      castPresent: present.length,
      writingNow: nameOf(writer),
      watchers: watchersBy.get(t.id) ?? 0,
      // applications only mean something to the person who can answer them
      pendingApplications: t.ownerId === userId ? (applicationsBy.get(t.id) ?? 0) : 0,
      updatedAt: t.updatedAt.toISOString(),
    };
  });
}

// ── the signals ──────────────────────────────────────────────────────────────

/**
 * The supplementary truths: the manuscript quoted where the ink stopped, the
 * gifts that accrued while you were away, the asks on your desk, the arrivals
 * from worlds you follow. Every query scoped to the authenticated user.
 */
async function getSignals(userId: string): Promise<StudioSignals> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const readersFresh = new Date(now.getTime() - READER_PRESENCE_WINDOW_MS);

  // last 14 calendar days (UTC), oldest → newest, for the words trend
  const trendDays: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    trendDays.push(d.toISOString().slice(0, 10));
  }
  const trendStart = trendDays[0];

  // stories the user follows — a semi-join, never materialized in Node
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
    readersNowRows,
  ] = await Promise.all([
    db.select({ days: users.readingStreakDays }).from(users).where(eq(users.id, userId)).limit(1),

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

    db
      .select({
        date: writingSessions.date,
        words: sql<number>`coalesce(sum(${writingSessions.wordsWritten}), 0)`,
      })
      .from(writingSessions)
      .where(and(eq(writingSessions.userId, userId), gte(writingSessions.date, trendStart)))
      .groupBy(writingSessions.date),

    db
      .select({ c: sql<number>`count(*)` })
      .from(sparks)
      .innerJoin(stories, eq(sparks.storyId, stories.id))
      .where(and(eq(stories.userId, userId), gte(sparks.createdAt, weekAgo))),

    db
      .select({ total: sql<number>`coalesce(sum(${drops.amount}), 0)` })
      .from(drops)
      .where(and(eq(drops.toUserId, userId), gte(drops.createdAt, weekAgo))),

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

    db
      .select({ c: sql<number>`count(*)` })
      .from(commissions)
      .where(and(eq(commissions.artisanId, userId), inArray(commissions.status, ["requested", "accepted"]))),

    // the manuscript — most recently touched chapter on an owned, non-table
    // story; only the content tail crosses the wire
    db
      .select({
        storyId: chapters.storyId,
        slug: stories.slug,
        storyTitle: stories.title,
        chapterId: chapters.id,
        chapterTitle: chapters.title,
        chapterSort: chapters.sortOrder,
        chapterWords: chapters.wordCount,
        bridgeNote: chapters.bridgeNote,
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

    db
      .select({ c: sql<number>`count(*)` })
      .from(follows)
      .innerJoin(stories, eq(follows.storyId, stories.id))
      .where(and(eq(stories.userId, userId), gte(follows.createdAt, weekAgo))),

    // ── readers whose place in one of your stories moved just now ──
    // The closest thing to honest presence a published story has: a reading
    // position updated inside the window. Never rendered when it's zero.
    db
      .select({
        storyId: stories.id,
        slug: stories.slug,
        storyTitle: stories.title,
        count: sql<number>`count(distinct ${readingProgress.userId})::int`,
      })
      .from(readingProgress)
      .innerJoin(stories, eq(readingProgress.storyId, stories.id))
      .where(
        and(
          eq(stories.userId, userId),
          ne(readingProgress.userId, userId),
          isNull(stories.deletedAt),
          gt(readingProgress.updatedAt, readersFresh),
        ),
      )
      .groupBy(stories.id, stories.title, stories.slug)
      .orderBy(desc(sql`count(distinct ${readingProgress.userId})`))
      .limit(1),
  ]);

  const trendMap = new Map(trendRows.map((r) => [String(r.date), Number(r.words)]));
  const wordsTrend = trendDays.map((d) => trendMap.get(d) ?? 0);

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
        bridgeNote: m.bridgeNote?.trim() ? m.bridgeNote : null,
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

  const readers = readersNowRows[0];

  return {
    readingStreak: Number(streakRow[0]?.days ?? 0),
    continueReading,
    manuscript,
    readerNotes,
    newFollowersWeek: Number(newFollowersRow[0]?.c ?? 0),
    wordsTrend,
    sparksWeek: Number(sparksWeekRow[0]?.c ?? 0),
    dropsWeek: Number(dropsWeekRow[0]?.total ?? 0),
    readersNow:
      readers && Number(readers.count) > 0
        ? {
            count: Number(readers.count),
            storyId: readers.storyId,
            slug: readers.slug ?? null,
            storyTitle: readers.storyTitle ?? null,
          }
        : null,
    suggestions: { count: Number(suggestionRows[0]?.total ?? 0), latest: latestSuggestion },
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
  };
}

// ── the absence ──────────────────────────────────────────────────────────────

/**
 * How long the desk sat untouched, in ms — or "first" for a studio that has
 * never been opened. Read on render; the client stamps the new visit after the
 * greeting has been said (see POST /api/studio/seen), so a reload never
 * overwrites the line it's about to read.
 */
export async function getAbsence(userId: string): Promise<number | "first"> {
  const [row] = await db
    .select({ lastSeenAt: users.lastSeenAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row?.lastSeenAt) return "first";
  return Math.max(0, Date.now() - row.lastSeenAt.getTime());
}

export async function touchLastSeen(userId: string): Promise<void> {
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId));
}
