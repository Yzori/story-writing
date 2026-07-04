import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { campaignSessions, campaignTurns, playerCharacters, sessionRoster } from "@/server/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { resolveSessionGmId, verifySessionGmAccess } from "@/server/services/collaboration";
import { createNotification } from "@/server/services/notifications";

// A player who wrote within this window is considered at the table — the pen
// arriving on their screen is signal enough. Anyone quieter gets a nudge:
// a stalled pen is the one thing this surface can't survive.
const AT_THE_TABLE_MS = 10 * 60 * 1000;

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

/**
 * PATCH /api/stories/[storyId]/campaign/sessions/[sessionId]/active-player
 * Set the active player for turn-based play. GM only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, sessionId } = await params;

    // Verify story exists and caller is the running GM (acting GM or owner)
    const check = await verifySessionGmAccess(storyId, sessionId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can change the active player" } },
        { status: 403 }
      );
    }
    if (check.error) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to update active player" } },
        { status: 500 }
      );
    }
    const { story, session: sess } = check;

    const body = await request.json();
    const activePlayerId = body.activePlayerId ?? null; // null = free-form mode

    // Validate that the target user has an active character in this campaign
    // AND is actually engaged in *this* session's roster (not just a campaign
    // member who hasn't joined the session, and not someone whose character
    // has been retired/killed since the session started).
    if (activePlayerId !== null && activePlayerId !== resolveSessionGmId(story, sess)) {
      const char = await db.query.playerCharacters.findFirst({
        where: and(
          eq(playerCharacters.storyId, storyId),
          eq(playerCharacters.userId, activePlayerId),
          eq(playerCharacters.status, "active")
        ),
      });
      if (!char) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Target user is not an active player in this campaign" } },
          { status: 400 }
        );
      }

      const rosterEntry = await db.query.sessionRoster.findFirst({
        where: and(
          eq(sessionRoster.sessionId, sessionId),
          eq(sessionRoster.userId, activePlayerId),
          inArray(sessionRoster.status, ["present", "introduced"]),
        ),
      });
      if (!rosterEntry) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Target user is not in this session's roster" } },
          { status: 400 }
        );
      }
    }

    const [updated] = await db
      .update(campaignSessions)
      .set({ activePlayerId, updatedAt: new Date() })
      .where(eq(campaignSessions.id, sessionId))
      .returning();

    // The pen finds you: nudge the new holder unless they've written recently
    // enough to clearly be at the table. In-app always; email rides the
    // user's digest preferences via createNotification.
    if (activePlayerId !== null && activePlayerId !== resolveSessionGmId(story, sess)) {
      const [lastTurn] = await db
        .select({ createdAt: campaignTurns.createdAt })
        .from(campaignTurns)
        .where(
          and(
            eq(campaignTurns.sessionId, sessionId),
            eq(campaignTurns.userId, activePlayerId),
          ),
        )
        .orderBy(desc(campaignTurns.createdAt))
        .limit(1);
      const atTheTable =
        !!lastTurn && Date.now() - lastTurn.createdAt.getTime() < AT_THE_TABLE_MS;
      if (!atTheTable) {
        await createNotification(
          activePlayerId,
          "pen",
          `The pen is yours in "${story.title}" — the table is waiting`,
          `/campaign/${storyId}/play/${sessionId}`,
        );
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/.../active-player error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update active player" } },
      { status: 500 }
    );
  }
}
