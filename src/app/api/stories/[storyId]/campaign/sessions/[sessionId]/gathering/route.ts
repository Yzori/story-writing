import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignSessions, follows, playerCharacters } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createBulkNotifications } from "@/server/services/notifications";
import { verifySessionGmAccess } from "@/server/services/collaboration";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

/**
 * POST /api/.../gathering — the Director's one-shot "let your followers
 * know". Fires the "the table is gathering" notice to the story's followers
 * (watch-page link) and, via gathering_called_at, lists the draft session on
 * Browse's Live-now row as "about to begin" (2h freshness window). Atomic
 * WHERE gathering_called_at IS NULL — a second press 409s, the fan-out can
 * never double-fire. Reuses the "live" NotifType (in-app only, same as the
 * begin notice) so a follower gets at most two per session, both actionable.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const check = await verifySessionGmAccess(storyId, sessionId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }
    if (check.error) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the Director can send the word" } },
        { status: 403 },
      );
    }
    const { story, session: campaignSession } = check;

    if (campaignSession.status !== "draft") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "The word goes out before the session begins" } },
        { status: 403 },
      );
    }
    if (!story.isPublic) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only public stories can call an audience" } },
        { status: 403 },
      );
    }

    const [called] = await db
      .update(campaignSessions)
      .set({ gatheringCalledAt: sql`now()`, updatedAt: new Date() })
      .where(
        and(
          eq(campaignSessions.id, sessionId),
          eq(campaignSessions.status, "draft"),
          isNull(campaignSessions.gatheringCalledAt),
        ),
      )
      .returning({ id: campaignSessions.id, gatheringCalledAt: campaignSessions.gatheringCalledAt });
    if (!called) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Your followers already know" } },
        { status: 409 },
      );
    }

    // Same fan-out shape as the begin notice: followers minus the Director
    // and the cast (they have seats, not the dark).
    const players = await db.query.playerCharacters.findMany({
      where: eq(playerCharacters.storyId, storyId),
    });
    const castUserIds = new Set(players.map((p) => p.userId));
    const followerRows = await db
      .select({ userId: follows.userId })
      .from(follows)
      .where(eq(follows.storyId, storyId));
    const followerIds = [...new Set(followerRows.map((r) => r.userId))].filter(
      (id) => id !== session.user.id && !castUserIds.has(id),
    );
    if (followerIds.length > 0) {
      await createBulkNotifications(
        followerIds,
        "live",
        `The table is gathering for "${story.title}" — a session begins soon`,
        `/campaign/${storyId}/watch/${sessionId}`,
      );
    }

    return NextResponse.json({
      data: { gatheringCalledAt: called.gatheringCalledAt?.toISOString() ?? null },
    });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/campaign/sessions/[sessionId]/gathering",
      "Failed to send the word",
    );
  }
}
