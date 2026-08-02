import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  users,
  campaignSessions,
  spectatorPresence,
  adventures,
  adventureAudiencePresence,
} from "@/server/db/schema";
import { eq, and, isNull, isNotNull, gt, desc, inArray, or, sql } from "drizzle-orm";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

/**
 * GET /api/campaigns/live
 * Public endpoint. Adventures with a session being played right now — plus
 * tables that are GATHERING: draft sessions whose Director pressed "let
 * your followers know" within the last 2 hours ("about to begin" on the
 * Browse row; the window keeps abandoned drafts off it without a cron).
 * Ordered by most recent activity.
 */
export async function GET(request: NextRequest) {
  try {
    const rl = applyRateLimit(request, null, "read", {
      max: 60,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const rows = await db
      .select({
        storyId: stories.id,
        slug: stories.slug,
        title: stories.title,
        coverImageUrl: stories.coverImageUrl,
        contentRating: stories.contentRating,
        authorName: users.displayName,
        sessionId: campaignSessions.id,
        sessionTitle: campaignSessions.title,
        sessionStatus: campaignSessions.status,
        lastActivityAt: campaignSessions.updatedAt,
      })
      .from(campaignSessions)
      .innerJoin(stories, eq(campaignSessions.storyId, stories.id))
      .innerJoin(users, eq(stories.userId, users.id))
      .where(
        and(
          or(
            eq(campaignSessions.status, "active"),
            and(
              eq(campaignSessions.status, "draft"),
              isNotNull(campaignSessions.gatheringCalledAt),
              gt(campaignSessions.gatheringCalledAt, sql`now() - interval '2 hours'`)
            )
          ),
          eq(stories.isPublic, true),
          isNull(stories.deletedAt)
        )
      )
      .orderBy(desc(campaignSessions.updatedAt))
      .limit(12);

    // Running board-listed adventure tables (the current flagship) join
    // the same strip. Private tables stay off — the board flag is the
    // listing consent.
    const adventureRows = await db
      .select({
        storyId: stories.id,
        slug: stories.slug,
        title: stories.title,
        coverImageUrl: stories.coverImageUrl,
        contentRating: stories.contentRating,
        authorName: users.displayName,
        sessionId: adventures.id,
        sessionTitle: stories.title,
        sessionStatus: sql<string>`'active'`,
        lastActivityAt: adventures.updatedAt,
      })
      .from(adventures)
      .innerJoin(stories, eq(adventures.storyId, stories.id))
      .innerJoin(users, eq(stories.userId, users.id))
      .where(
        and(
          eq(adventures.status, "running"),
          eq(adventures.boardVisibility, "board"),
          isNull(stories.deletedAt)
        )
      )
      .orderBy(desc(adventures.updatedAt))
      .limit(12);

    if (rows.length === 0 && adventureRows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fresh spectator counts, one query per surface
    const countBySession = new Map<string, number>();
    if (rows.length > 0) {
      const counts = await db
        .select({
          sessionId: spectatorPresence.sessionId,
          count: sql<number>`count(*)`,
        })
        .from(spectatorPresence)
        .where(
          and(
            inArray(spectatorPresence.sessionId, rows.map((r) => r.sessionId)),
            gt(spectatorPresence.lastHeartbeat, sql`now() - interval '45 seconds'`)
          )
        )
        .groupBy(spectatorPresence.sessionId);
      counts.forEach((c) => countBySession.set(c.sessionId, Number(c.count)));
    }
    if (adventureRows.length > 0) {
      const counts = await db
        .select({
          adventureId: adventureAudiencePresence.adventureId,
          count: sql<number>`count(*)`,
        })
        .from(adventureAudiencePresence)
        .where(
          and(
            inArray(
              adventureAudiencePresence.adventureId,
              adventureRows.map((r) => r.sessionId)
            ),
            gt(
              adventureAudiencePresence.lastHeartbeat,
              sql`now() - interval '45 seconds'`
            )
          )
        )
        .groupBy(adventureAudiencePresence.adventureId);
      counts.forEach((c) => countBySession.set(c.adventureId, Number(c.count)));
    }

    const merged = [
      ...rows.map((r) => ({
        ...r,
        watchHref: `/campaign/${r.storyId}/watch/${r.sessionId}`,
      })),
      ...adventureRows.map((r) => ({
        ...r,
        watchHref: `/adventures/${r.sessionId}/watch`,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.lastActivityAt).getTime() -
          new Date(a.lastActivityAt).getTime()
      )
      .slice(0, 12);

    return NextResponse.json({
      data: merged.map((r) => ({
        ...r,
        spectatorCount: countBySession.get(r.sessionId) ?? 0,
      })),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/campaigns/live", "Failed to fetch live sessions");
  }
}
