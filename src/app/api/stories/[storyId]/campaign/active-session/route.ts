import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { stories, campaignSessions, spectatorPresence } from "@/server/db/schema";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/campaign/active-session
 * Public endpoint. Returns the currently active campaign session (if any)
 * for a public story, along with its spectator count.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", {
      max: 60,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { storyId } = await params;

    // Verify story is public and not deleted
    const story = await db.query.stories.findFirst({
      where: and(
        eq(stories.id, storyId),
        eq(stories.isPublic, true),
        isNull(stories.deletedAt)
      ),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Find the active session
    const activeSession = await db.query.campaignSessions.findFirst({
      where: and(
        eq(campaignSessions.storyId, storyId),
        eq(campaignSessions.status, "active")
      ),
    });

    if (!activeSession) {
      return NextResponse.json({ data: null });
    }

    // Count spectators
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(spectatorPresence)
      .where(
        and(
          eq(spectatorPresence.sessionId, activeSession.id),
          gt(spectatorPresence.lastHeartbeat, sql`now() - interval '45 seconds'`)
        )
      );
    const spectatorCount = Number(result?.count ?? 0);

    return NextResponse.json({
      data: {
        id: activeSession.id,
        title: activeSession.title,
        spectatorCount,
      },
    });
  } catch (error) {
    console.error("GET /api/.../active-session error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch active session" } },
      { status: 500 }
    );
  }
}
