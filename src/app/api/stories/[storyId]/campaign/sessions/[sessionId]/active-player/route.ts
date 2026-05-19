import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { campaignSessions, stories, playerCharacters, sessionRoster } from "@/server/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

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

    // Verify story exists and caller is GM (story owner)
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can change the active player" } },
        { status: 403 }
      );
    }

    // Verify session belongs to this story
    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const activePlayerId = body.activePlayerId ?? null; // null = free-form mode

    // Validate that the target user has an active character in this campaign
    // AND is actually engaged in *this* session's roster (not just a campaign
    // member who hasn't joined the session, and not someone whose character
    // has been retired/killed since the session started).
    if (activePlayerId !== null && activePlayerId !== story.userId) {
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

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/.../active-player error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update active player" } },
      { status: 500 }
    );
  }
}
