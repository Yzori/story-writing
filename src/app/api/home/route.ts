import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  sparks,
  follows,
  storyBoosts,
  staffPicks,
  campaignSessions,
  sessionRoster,
  storyJams,
  users,
  storyDonations,
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
        const score =
          Number(r.sparkScore) * 3 +
          Number(r.followScore) * 5 +
          Number(r.donationScore) * 0.5;
        return { ...r, score };
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
        }));
      }
    }

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
        hero,
        sponsored,
        trending,
        adventures,
        jams,
        following,
        staffPicks: staffPickRows,
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
