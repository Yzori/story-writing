import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { campaignTurns, campaignSessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string; turnId: string }> };

/**
 * PATCH /api/stories/[storyId]/campaign/sessions/[sessionId]/turns/[turnId]
 * Edit a recently submitted turn. Only the author can edit, within 30s window.
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

    const { storyId, sessionId, turnId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
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

    // Fetch the turn
    const turn = await db.query.campaignTurns.findFirst({
      where: eq(campaignTurns.id, turnId),
    });
    if (!turn || turn.sessionId !== sessionId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Turn not found" } },
        { status: 404 }
      );
    }

    // Only the author can edit their own turn
    if (turn.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can only edit your own turns" } },
        { status: 403 }
      );
    }

    // Prevent editing mechanical turns
    const nonEditableTypes = ["roll", "roll-request", "scene-break", "illustration", "story-moment"];
    if (nonEditableTypes.includes(turn.type)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "This turn type cannot be edited" } },
        { status: 400 }
      );
    }

    // Enforce 30-second edit window
    const elapsed = Date.now() - new Date(turn.createdAt).getTime();
    if (elapsed > 30_000) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Edit window has expired (30 seconds)" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const content = body.content;

    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Content is required" } },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Content too long (max 10000)" } },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(campaignTurns)
      .set({ content: content.trim() })
      .where(eq(campaignTurns.id, turnId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/.../turns/[turnId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to edit turn" } },
      { status: 500 }
    );
  }
}
