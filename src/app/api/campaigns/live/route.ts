import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { stories, users, campaignSessions, spectatorPresence } from "@/server/db/schema";
import { eq, and, isNull, isNotNull, gt, desc, inArray, or, sql } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";

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

    if (rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fresh spectator counts for all live sessions in one query
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
    const countBySession = new Map(counts.map((c) => [c.sessionId, Number(c.count)]));

    return NextResponse.json({
      data: rows.map((r) => ({
        ...r,
        spectatorCount: countBySession.get(r.sessionId) ?? 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/campaigns/live error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch live sessions" } },
      { status: 500 }
    );
  }
}
