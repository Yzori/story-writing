import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  chapters,
  sparks,
  follows,
  storyBoosts,
  staffPicks,
  campaignSessions,
  campaignTurns,
  sessionRoster,
  spectatorPresence,
  storyJams,
  jamEntries,
  users,
  storyDonations,
  playerCharacters,
  readingProgress,
  notifications,
  comments,
} from "@/server/db/schema";
import { and, eq, gt, isNull, sql, desc, inArray } from "drizzle-orm";
import { auth } from "@/server/auth";
import { reconcileBoosts } from "@/server/services/boosts";

/**
 * GET /api/home
 *
 * Unified home-page aggregation. Returns everything the trending home needs
 * in one round-trip:
 *   - hero:      up to 5 rotating carousel slots (paid hero boosts first,
 *                remaining filled with top-trending organic picks)
 *   - sponsored: active standard-tier boosts (the Sponsored strip)
 *   - trending:  7-day decay-weighted mix of novels/adventures/jams
 *   - adventures: active campaign sessions with open roster slots
 *   - jams:      open story jams closing soonest
 *   - following: (signed-in only) recent activity from followed stories/authors
 *   - staffPicks: curated picks
 */
export async function GET() {
  try {
    await reconcileBoosts();
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const now = new Date();
    const sevenDaysAgoIso = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // ── Story base query we'll reuse ────────────────────────
    const storyBase = {
      id: stories.id,
      userId: stories.userId,
      title: stories.title,
      slug: stories.slug,
      synopsis: stories.synopsis,
      coverImageUrl: stories.coverImageUrl,
      genres: stories.genres,
      format: stories.format,
      writingMode: stories.writingMode,
      publishedAt: stories.publishedAt,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
    } as const;

    // ── 1. Hero carousel ────────────────────────────────────
    // Paid hero boosts first (ordered by startsAt asc so the oldest rotates off
    // first), then fill with top-trending organic picks up to 5.
    const heroBoosts = await db
      .select({
        ...storyBase,
        boostId: storyBoosts.id,
        boostExpiresAt: storyBoosts.expiresAt,
      })
      .from(storyBoosts)
      .innerJoin(
        stories,
        and(
          eq(storyBoosts.storyId, stories.id),
          eq(stories.isPublic, true),
          isNull(stories.deletedAt),
        ),
      )
      .leftJoin(users, eq(stories.userId, users.id))
      .where(
        and(
          eq(storyBoosts.tier, "hero"),
          eq(storyBoosts.status, "active"),
          gt(storyBoosts.expiresAt, now),
        ),
      )
      .orderBy(storyBoosts.startsAt)
      .limit(5);

    const heroBoostStoryIds = new Set(heroBoosts.map((h) => h.id));

    // ── 2. Trending (shared by hero fill + trending row) ────
    // Weighted score over last 7 days: sparks ×3, follows ×5, donations (drops) ×0.5.
    const trendingRows = await db
      .select({
        ...storyBase,
        sparkScore: sql<number>`(
          select coalesce(count(*), 0)::int from ${sparks}
          where ${sparks.storyId} = ${stories.id}
            and ${sparks.createdAt} > ${sevenDaysAgoIso}::timestamptz
        )`,
        followScore: sql<number>`(
          select coalesce(count(*), 0)::int from ${follows}
          where ${follows.storyId} = ${stories.id}
            and ${follows.createdAt} > ${sevenDaysAgoIso}::timestamptz
        )`,
        donationScore: sql<number>`(
          select coalesce(sum(${storyDonations.amount}), 0)::int from ${storyDonations}
          where ${storyDonations.storyId} = ${stories.id}
            and ${storyDonations.createdAt} > ${sevenDaysAgoIso}::timestamptz
        )`,
      })
      .from(stories)
      .leftJoin(users, eq(stories.userId, users.id))
      .where(
        and(
          eq(stories.isPublic, true),
          eq(stories.status, "published"),
          isNull(stories.deletedAt),
        ),
      )
      .limit(100);

    const trendingScored = trendingRows
      .map((r) => {
        const sparkScore = Number(r.sparkScore);
        const followScore = Number(r.followScore);
        const donationScore = Number(r.donationScore);
        const score =
          sparkScore * 3 + followScore * 5 + donationScore * 0.5;
        return {
          ...r,
          score,
          weeklyInteractions: {
            sparks: sparkScore,
            follows: followScore,
            donationDrops: donationScore,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    // Top trending excluding already-paid hero picks
    const fillersNeeded = 5 - heroBoosts.length;
    const fillers = trendingScored
      .filter((t) => !heroBoostStoryIds.has(t.id))
      .slice(0, fillersNeeded);

    const hero = [
      ...heroBoosts.map((h) => ({
        ...h,
        sponsored: true,
      })),
      ...fillers.map((f) => ({
        ...f,
        sponsored: false,
        boostId: null,
        boostExpiresAt: null,
      })),
    ];

    // Trending row: top 12 excluding whatever's already in hero
    const heroIds = new Set(hero.map((h) => h.id));
    const trending = trendingScored
      .filter((t) => !heroIds.has(t.id))
      .slice(0, 12)
      .map((t) => ({
        id: t.id,
        userId: t.userId,
        title: t.title,
        slug: t.slug,
        synopsis: t.synopsis,
        coverImageUrl: t.coverImageUrl,
        format: t.format,
        writingMode: t.writingMode,
        genres: t.genres,
        authorName: t.authorName,
        authorAvatar: t.authorAvatar,
        score: t.score,
        weeklyInteractions: t.weeklyInteractions,
      }));

    // ── 3. Sponsored strip — standard-tier active boosts ────
    const sponsored = await db
      .select(storyBase)
      .from(storyBoosts)
      .innerJoin(
        stories,
        and(
          eq(storyBoosts.storyId, stories.id),
          eq(stories.isPublic, true),
          isNull(stories.deletedAt),
        ),
      )
      .leftJoin(users, eq(stories.userId, users.id))
      .where(
        and(
          eq(storyBoosts.tier, "standard"),
          eq(storyBoosts.status, "active"),
          gt(storyBoosts.expiresAt, now),
        ),
      )
      .orderBy(desc(storyBoosts.createdAt))
      .limit(8);

    // ── 4. Adventures looking for players ───────────────────
    // Active campaign sessions whose roster has fewer than (say) 6 confirmed
    // members. Join story for metadata.
    const adventures = await db
      .select({
        sessionId: campaignSessions.id,
        sessionTitle: campaignSessions.title,
        sessionSummary: campaignSessions.summary,
        storyId: stories.id,
        storyTitle: stories.title,
        storySlug: stories.slug,
        coverImageUrl: stories.coverImageUrl,
        authorName: users.displayName,
        playerCount: sql<number>`(
          select coalesce(count(*), 0)::int from ${sessionRoster}
          where ${sessionRoster.sessionId} = ${campaignSessions.id}
        )`,
      })
      .from(campaignSessions)
      .innerJoin(
        stories,
        and(
          eq(campaignSessions.storyId, stories.id),
          eq(stories.isPublic, true),
          isNull(stories.deletedAt),
        ),
      )
      .leftJoin(users, eq(stories.userId, users.id))
      .where(eq(campaignSessions.status, "active"))
      .orderBy(desc(campaignSessions.updatedAt))
      .limit(8);

    // ── 5. Jams closing soon ────────────────────────────────
    const jams = await db
      .select({
        id: storyJams.id,
        title: storyJams.title,
        description: storyJams.description,
        theme: storyJams.theme,
        bannerUrl: storyJams.bannerUrl,
        submissionEndsAt: storyJams.submissionEndsAt,
        votingEndsAt: storyJams.votingEndsAt,
        status: storyJams.status,
      })
      .from(storyJams)
      .where(
        sql`${storyJams.status} IN ('open','voting','upcoming')`,
      )
      .orderBy(storyJams.submissionEndsAt)
      .limit(6);

    // ── 6a. Personal surfaces (Continue + Today) ────────────
    type ContinueItem =
      | {
          kind: "read";
          title: string;
          subtitle: string;
          href: string;
          coverImageUrl: string | null;
          scrollPercent: number;
          updatedAt: string;
        }
      | {
          kind: "draft";
          title: string;
          subtitle: string;
          href: string;
          coverImageUrl: string | null;
          updatedAt: string;
          wordCount: number;
        }
      | {
          kind: "play";
          title: string;
          subtitle: string;
          href: string;
          coverImageUrl: string | null;
          updatedAt: string;
          isLive: boolean;
          asGm: boolean;
        };

    const continueItems: ContinueItem[] = [];
    const today = {
      unreadNotifications: 0,
      dropsEarned24h: 0,
      newComments24h: 0,
      jamDeadlinesEntered: 0,
    };

    if (userId) {
      const dayAgoIso = new Date(
        now.getTime() - 24 * 60 * 60 * 1000,
      ).toISOString();

      const [
        lastReadRows,
        lastDraftRows,
        lastSessionRows,
        unreadRow,
        dropsRow,
        commentsRow,
        jamDeadlinesRow,
      ] = await Promise.all([
        // Last read (join story + chapter)
        db
          .select({
            storyId: readingProgress.storyId,
            chapterId: readingProgress.chapterId,
            scrollPercent: readingProgress.scrollPercent,
            updatedAt: readingProgress.updatedAt,
            storyTitle: stories.title,
            storySlug: stories.slug,
            coverImageUrl: stories.coverImageUrl,
            chapterTitle: chapters.title,
            authorName: users.displayName,
          })
          .from(readingProgress)
          .innerJoin(
            stories,
            and(eq(readingProgress.storyId, stories.id), isNull(stories.deletedAt)),
          )
          .innerJoin(chapters, eq(readingProgress.chapterId, chapters.id))
          .leftJoin(users, eq(stories.userId, users.id))
          .where(eq(readingProgress.userId, userId))
          .orderBy(desc(readingProgress.updatedAt))
          .limit(1),
        // Last draft owned by the user
        db
          .select({
            id: stories.id,
            title: stories.title,
            slug: stories.slug,
            coverImageUrl: stories.coverImageUrl,
            updatedAt: stories.updatedAt,
            format: stories.format,
          })
          .from(stories)
          .where(
            and(
              eq(stories.userId, userId),
              eq(stories.status, "draft"),
              isNull(stories.deletedAt),
            ),
          )
          .orderBy(desc(stories.updatedAt))
          .limit(1),
        // Last active session — either user is in roster OR user owns the story (GM)
        db
          .select({
            sessionId: campaignSessions.id,
            sessionTitle: campaignSessions.title,
            updatedAt: campaignSessions.updatedAt,
            storyId: stories.id,
            storyUserId: stories.userId,
            storyTitle: stories.title,
            storySlug: stories.slug,
            coverImageUrl: stories.coverImageUrl,
            latestTurnAt: sql<Date | null>`(
              select max(${campaignTurns.createdAt}) from ${campaignTurns}
              where ${campaignTurns.sessionId} = ${campaignSessions.id}
            )`,
            inRoster: sql<boolean>`exists(
              select 1 from ${sessionRoster}
              where ${sessionRoster.sessionId} = ${campaignSessions.id}
                and ${sessionRoster.userId} = ${userId}
            )`,
          })
          .from(campaignSessions)
          .innerJoin(
            stories,
            and(
              eq(campaignSessions.storyId, stories.id),
              isNull(stories.deletedAt),
            ),
          )
          .where(
            and(
              eq(campaignSessions.status, "active"),
              sql`(
                ${stories.userId} = ${userId}
                or exists(
                  select 1 from ${sessionRoster}
                  where ${sessionRoster.sessionId} = ${campaignSessions.id}
                    and ${sessionRoster.userId} = ${userId}
                )
              )`,
            ),
          )
          .orderBy(desc(campaignSessions.updatedAt))
          .limit(1),
        // Unread notifications count
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.read, false),
            ),
          ),
        // Drops earned in last 24h
        db
          .select({
            total: sql<number>`coalesce(sum(${storyDonations.amount}), 0)::int`,
          })
          .from(storyDonations)
          .where(
            and(
              eq(storyDonations.toUserId, userId),
              sql`${storyDonations.createdAt} > ${dayAgoIso}::timestamptz`,
            ),
          ),
        // New comments in last 24h on stories owned by the user (not own comments)
        db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(comments)
          .innerJoin(stories, eq(comments.storyId, stories.id))
          .where(
            and(
              eq(stories.userId, userId),
              isNull(comments.deletedAt),
              sql`${comments.userId} != ${userId}`,
              sql`${comments.createdAt} > ${dayAgoIso}::timestamptz`,
            ),
          ),
        // Jam deadlines the user has entered (jam still open)
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(jamEntries)
          .innerJoin(storyJams, eq(jamEntries.jamId, storyJams.id))
          .where(
            and(
              eq(jamEntries.userId, userId),
              sql`${storyJams.status} IN ('open','voting')`,
            ),
          ),
      ]);

      today.unreadNotifications = Number(unreadRow[0]?.count ?? 0);
      today.dropsEarned24h = Number(dropsRow[0]?.total ?? 0);
      today.newComments24h = Number(commentsRow[0]?.count ?? 0);
      today.jamDeadlinesEntered = Number(jamDeadlinesRow[0]?.count ?? 0);

      if (lastReadRows[0]) {
        const r = lastReadRows[0];
        continueItems.push({
          kind: "read",
          title: r.storyTitle,
          subtitle: `${r.chapterTitle} · ${r.scrollPercent}%`,
          href: `/story/${r.storySlug ?? r.storyId}/read/${r.chapterId}`,
          coverImageUrl: r.coverImageUrl,
          scrollPercent: r.scrollPercent,
          updatedAt: new Date(r.updatedAt).toISOString(),
        });
      }
      if (lastDraftRows[0]) {
        const d = lastDraftRows[0];
        continueItems.push({
          kind: "draft",
          title: d.title,
          subtitle: "Draft in progress",
          href: `/write/${d.id}`,
          coverImageUrl: d.coverImageUrl,
          updatedAt: new Date(d.updatedAt).toISOString(),
          wordCount: 0,
        });
      }
      if (lastSessionRows[0]) {
        const s = lastSessionRows[0];
        const isLive =
          !!s.latestTurnAt &&
          new Date(s.latestTurnAt).getTime() > now.getTime() - 10 * 60 * 1000;
        continueItems.push({
          kind: "play",
          title: s.sessionTitle,
          subtitle: s.storyUserId === userId
            ? `You're the GM · ${s.storyTitle}`
            : s.storyTitle,
          href: `/story/${s.storySlug ?? s.storyId}`,
          coverImageUrl: s.coverImageUrl,
          updatedAt: new Date(s.updatedAt).toISOString(),
          isLive,
          asGm: s.storyUserId === userId,
        });
      }
    }

    // ── 6. Following row (signed-in only) ───────────────────
    let following: typeof trending = [];
    if (userId) {
      const followedStoryIds = await db
        .select({ storyId: follows.storyId })
        .from(follows)
        .where(eq(follows.userId, userId));

      if (followedStoryIds.length > 0) {
        const ids = followedStoryIds.map((r) => r.storyId);
        const rows = await db
          .select(storyBase)
          .from(stories)
          .leftJoin(users, eq(stories.userId, users.id))
          .where(
            and(
              inArray(stories.id, ids),
              eq(stories.isPublic, true),
              isNull(stories.deletedAt),
            ),
          )
          .orderBy(desc(stories.updatedAt))
          .limit(10);

        following = rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          title: r.title,
          slug: r.slug,
          synopsis: r.synopsis,
          coverImageUrl: r.coverImageUrl,
          format: r.format,
          writingMode: r.writingMode,
          genres: r.genres,
          authorName: r.authorName,
          authorAvatar: r.authorAvatar,
          score: 0,
          weeklyInteractions: { sparks: 0, follows: 0, donationDrops: 0 },
        }));
      }
    }

    // ── 6b. Live adventures ─────────────────────────────────
    // A session is "live" if it has a turn written in the last 10 minutes.
    // Pull the sessions, then fetch roster + latest turn + spectator count.
    const tenMinAgoIso = new Date(
      now.getTime() - 10 * 60 * 1000,
    ).toISOString();
    const thirtyMinAgoIso = new Date(
      now.getTime() - 30 * 60 * 1000,
    ).toISOString();

    const activeSessions = await db
      .select({
        sessionId: campaignSessions.id,
        sessionTitle: campaignSessions.title,
        sessionSummary: campaignSessions.summary,
        storyId: stories.id,
        storySlug: stories.slug,
        storyTitle: stories.title,
        coverImageUrl: stories.coverImageUrl,
        authorName: users.displayName,
        latestTurnAt: sql<Date | null>`(
          select max(${campaignTurns.createdAt}) from ${campaignTurns}
          where ${campaignTurns.sessionId} = ${campaignSessions.id}
        )`,
      })
      .from(campaignSessions)
      .innerJoin(
        stories,
        and(
          eq(campaignSessions.storyId, stories.id),
          eq(stories.isPublic, true),
          isNull(stories.deletedAt),
        ),
      )
      .leftJoin(users, eq(stories.userId, users.id))
      .where(eq(campaignSessions.status, "active"))
      .orderBy(desc(campaignSessions.updatedAt))
      .limit(20);

    type LiveSession = {
      sessionId: string;
      sessionTitle: string;
      sessionSummary: string | null;
      storyId: string;
      storySlug: string | null;
      storyTitle: string;
      coverImageUrl: string | null;
      authorName: string | null;
      isLive: boolean;
      latestTurnAt: Date | null;
      latestTurnSnippet: string | null;
      latestTurnAuthor: string | null;
      spectatorCount: number;
      roster: {
        userId: string;
        displayName: string | null;
        avatarUrl: string | null;
        characterName: string | null;
      }[];
    };

    const liveSessionRows: LiveSession[] = [];
    const liveSessionIds = activeSessions
      .filter((s) => {
        if (!s.latestTurnAt) return false;
        return new Date(s.latestTurnAt).getTime() > now.getTime() - 10 * 60 * 1000;
      })
      .map((s) => s.sessionId);
    const recentSessionIds = activeSessions
      .filter((s) => !liveSessionIds.includes(s.sessionId))
      .slice(0, 6)
      .map((s) => s.sessionId);

    const displaySessionIds = [...liveSessionIds, ...recentSessionIds].slice(0, 6);

    if (displaySessionIds.length > 0) {
      // Roster for each displayed session
      const rosterRows = await db
        .select({
          sessionId: sessionRoster.sessionId,
          userId: sessionRoster.userId,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          characterName: playerCharacters.name,
        })
        .from(sessionRoster)
        .leftJoin(users, eq(sessionRoster.userId, users.id))
        .leftJoin(
          playerCharacters,
          eq(sessionRoster.characterId, playerCharacters.id),
        )
        .where(inArray(sessionRoster.sessionId, displaySessionIds));

      const rosterBySession = new Map<string, LiveSession["roster"]>();
      for (const r of rosterRows) {
        if (!rosterBySession.has(r.sessionId)) {
          rosterBySession.set(r.sessionId, []);
        }
        rosterBySession.get(r.sessionId)!.push({
          userId: r.userId,
          displayName: r.displayName,
          avatarUrl: r.avatarUrl,
          characterName: r.characterName,
        });
      }

      // Latest turn content for each session
      const latestTurnRows = await db
        .select({
          sessionId: campaignTurns.sessionId,
          content: campaignTurns.content,
          createdAt: campaignTurns.createdAt,
          authorName: users.displayName,
        })
        .from(campaignTurns)
        .leftJoin(users, eq(campaignTurns.userId, users.id))
        .where(
          and(
            inArray(campaignTurns.sessionId, displaySessionIds),
            sql`${campaignTurns.type} IN ('narration','action','dialogue','description')`,
          ),
        )
        .orderBy(desc(campaignTurns.createdAt))
        .limit(displaySessionIds.length * 5);

      const latestTurnBySession = new Map<
        string,
        { content: string; authorName: string | null }
      >();
      for (const t of latestTurnRows) {
        if (!latestTurnBySession.has(t.sessionId)) {
          latestTurnBySession.set(t.sessionId, {
            content: t.content,
            authorName: t.authorName,
          });
        }
      }

      // Spectator counts (heartbeat in last 30s considered online)
      const spectatorWindow = new Date(
        now.getTime() - 30 * 1000,
      ).toISOString();
      const spectatorRows = await db
        .select({
          sessionId: spectatorPresence.sessionId,
          count: sql<number>`count(*)::int`,
        })
        .from(spectatorPresence)
        .where(
          and(
            inArray(spectatorPresence.sessionId, displaySessionIds),
            sql`${spectatorPresence.lastHeartbeat} > ${spectatorWindow}::timestamptz`,
          ),
        )
        .groupBy(spectatorPresence.sessionId);

      const spectatorBySession = new Map<string, number>();
      for (const s of spectatorRows) {
        spectatorBySession.set(s.sessionId, Number(s.count));
      }

      for (const s of activeSessions) {
        if (!displaySessionIds.includes(s.sessionId)) continue;
        const rawSnippet = latestTurnBySession.get(s.sessionId)?.content ?? null;
        const snippet = rawSnippet
          ? rawSnippet
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 140)
          : null;
        liveSessionRows.push({
          sessionId: s.sessionId,
          sessionTitle: s.sessionTitle,
          sessionSummary: s.sessionSummary,
          storyId: s.storyId,
          storySlug: s.storySlug,
          storyTitle: s.storyTitle,
          coverImageUrl: s.coverImageUrl,
          authorName: s.authorName,
          isLive: liveSessionIds.includes(s.sessionId),
          latestTurnAt: s.latestTurnAt,
          latestTurnSnippet: snippet,
          latestTurnAuthor:
            latestTurnBySession.get(s.sessionId)?.authorName ?? null,
          spectatorCount: spectatorBySession.get(s.sessionId) ?? 0,
          roster: rosterBySession.get(s.sessionId) ?? [],
        });
      }
    }

    // ── 6c. Activity feed (live pulse) ──────────────────────
    // Union events across tables and limit. Each event is { kind, at, text, href }.
    const actorCol = users.displayName;
    const [chapterEvents, donationEvents, followEvents, rosterEvents, jamEvents] =
      await Promise.all([
        // Recently published chapters
        db
          .select({
            at: chapters.createdAt,
            actor: actorCol,
            storyTitle: stories.title,
            storySlug: stories.slug,
            storyId: stories.id,
            chapterTitle: chapters.title,
          })
          .from(chapters)
          .innerJoin(stories, eq(chapters.storyId, stories.id))
          .leftJoin(users, eq(stories.userId, users.id))
          .where(
            and(
              eq(chapters.status, "published"),
              isNull(chapters.deletedAt),
              eq(stories.isPublic, true),
              isNull(stories.deletedAt),
              gt(chapters.createdAt, new Date(sevenDaysAgoIso)),
            ),
          )
          .orderBy(desc(chapters.createdAt))
          .limit(15),
        // Recent gift donations
        db
          .select({
            at: storyDonations.createdAt,
            amount: storyDonations.amount,
            actor: actorCol,
            storyTitle: stories.title,
            storySlug: stories.slug,
            storyId: stories.id,
          })
          .from(storyDonations)
          .innerJoin(stories, eq(storyDonations.storyId, stories.id))
          .leftJoin(users, eq(storyDonations.fromUserId, users.id))
          .where(
            and(
              eq(stories.isPublic, true),
              gt(storyDonations.createdAt, new Date(sevenDaysAgoIso)),
            ),
          )
          .orderBy(desc(storyDonations.createdAt))
          .limit(15),
        // Recent follows
        db
          .select({
            at: follows.createdAt,
            actor: actorCol,
            storyTitle: stories.title,
            storySlug: stories.slug,
            storyId: stories.id,
          })
          .from(follows)
          .innerJoin(stories, eq(follows.storyId, stories.id))
          .leftJoin(users, eq(follows.userId, users.id))
          .where(
            and(
              eq(stories.isPublic, true),
              gt(follows.createdAt, new Date(sevenDaysAgoIso)),
            ),
          )
          .orderBy(desc(follows.createdAt))
          .limit(15),
        // Recent session joins
        db
          .select({
            at: sessionRoster.createdAt,
            actor: actorCol,
            sessionId: sessionRoster.sessionId,
            sessionTitle: campaignSessions.title,
            storyId: campaignSessions.storyId,
            storySlug: stories.slug,
          })
          .from(sessionRoster)
          .innerJoin(
            campaignSessions,
            eq(sessionRoster.sessionId, campaignSessions.id),
          )
          .innerJoin(stories, eq(campaignSessions.storyId, stories.id))
          .leftJoin(users, eq(sessionRoster.userId, users.id))
          .where(
            and(
              eq(stories.isPublic, true),
              gt(sessionRoster.createdAt, new Date(sevenDaysAgoIso)),
            ),
          )
          .orderBy(desc(sessionRoster.createdAt))
          .limit(10),
        // Recent jam entries
        db
          .select({
            at: jamEntries.createdAt,
            actor: actorCol,
            jamId: jamEntries.jamId,
            jamTitle: storyJams.title,
          })
          .from(jamEntries)
          .innerJoin(storyJams, eq(jamEntries.jamId, storyJams.id))
          .leftJoin(users, eq(jamEntries.userId, users.id))
          .where(gt(jamEntries.createdAt, new Date(sevenDaysAgoIso)))
          .orderBy(desc(jamEntries.createdAt))
          .limit(10),
      ]);

    type ActivityEvent = {
      kind: "chapter" | "gift" | "follow" | "join" | "jam";
      at: string;
      text: string;
      href: string;
      actor: string | null;
      amount?: number;
    };

    const activity: ActivityEvent[] = [];
    for (const e of chapterEvents) {
      activity.push({
        kind: "chapter",
        at: new Date(e.at).toISOString(),
        actor: e.actor,
        text: `${e.actor ?? "Someone"} published a new chapter in ${e.storyTitle}`,
        href: `/story/${e.storySlug ?? e.storyId}`,
      });
    }
    for (const e of donationEvents) {
      activity.push({
        kind: "gift",
        at: new Date(e.at).toISOString(),
        actor: e.actor,
        amount: e.amount,
        text: `${e.actor ?? "Someone"} gifted ${e.amount} drops to ${e.storyTitle}`,
        href: `/story/${e.storySlug ?? e.storyId}`,
      });
    }
    for (const e of followEvents) {
      activity.push({
        kind: "follow",
        at: new Date(e.at).toISOString(),
        actor: e.actor,
        text: `${e.actor ?? "Someone"} started reading ${e.storyTitle}`,
        href: `/story/${e.storySlug ?? e.storyId}`,
      });
    }
    for (const e of rosterEvents) {
      activity.push({
        kind: "join",
        at: new Date(e.at).toISOString(),
        actor: e.actor,
        text: `${e.actor ?? "Someone"} joined the adventure ${e.sessionTitle}`,
        href: `/story/${e.storySlug ?? e.storyId}`,
      });
    }
    for (const e of jamEvents) {
      activity.push({
        kind: "jam",
        at: new Date(e.at).toISOString(),
        actor: e.actor,
        text: `${e.actor ?? "Someone"} entered the jam ${e.jamTitle}`,
        href: `/jams/${e.jamId}`,
      });
    }
    activity.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
    const activityLimited = activity.slice(0, 30);

    // ── 6d. Pulse counts ────────────────────────────────────
    const [
      liveSessionCountRow,
      openJamsCountRow,
      weeklyStoriesCountRow,
      onlineReadersRow,
    ] = await Promise.all([
      db
        .select({
          count: sql<number>`count(distinct ${campaignTurns.sessionId})::int`,
        })
        .from(campaignTurns)
        .where(
          sql`${campaignTurns.createdAt} > ${tenMinAgoIso}::timestamptz`,
        ),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(storyJams)
        .where(sql`${storyJams.status} IN ('open','voting')`),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(stories)
        .where(
          and(
            eq(stories.isPublic, true),
            eq(stories.status, "published"),
            isNull(stories.deletedAt),
            gt(stories.publishedAt, new Date(sevenDaysAgoIso)),
          ),
        ),
      db
        .select({
          count: sql<number>`count(distinct ${spectatorPresence.token})::int`,
        })
        .from(spectatorPresence)
        .where(
          sql`${spectatorPresence.lastHeartbeat} > ${thirtyMinAgoIso}::timestamptz`,
        ),
    ]);

    const pulse = {
      liveSessions: Number(liveSessionCountRow[0]?.count ?? 0),
      openJams: Number(openJamsCountRow[0]?.count ?? 0),
      weeklyStories: Number(weeklyStoriesCountRow[0]?.count ?? 0),
      online: Number(onlineReadersRow[0]?.count ?? 0),
    };

    // ── 7. Staff picks ──────────────────────────────────────
    const staffPickRows = await db
      .select({
        ...storyBase,
        curatorNote: staffPicks.curatorNote,
      })
      .from(staffPicks)
      .innerJoin(
        stories,
        and(
          eq(staffPicks.storyId, stories.id),
          eq(stories.isPublic, true),
          isNull(stories.deletedAt),
        ),
      )
      .leftJoin(users, eq(stories.userId, users.id))
      .orderBy(desc(staffPicks.pickedAt))
      .limit(8);

    return NextResponse.json({
      data: {
        continue: continueItems,
        today,
        hero,
        sponsored,
        trending,
        liveAdventures: liveSessionRows,
        adventures,
        jams,
        following,
        staffPicks: staffPickRows,
        activity: activityLimited,
        pulse,
      },
    });
  } catch (error) {
    console.error("GET /api/home error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load home",
        },
      },
      { status: 500 },
    );
  }
}
