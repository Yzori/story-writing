import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { verifySessionGmAccess } from "@/server/services/collaboration";
import { loadSessionReadout } from "@/server/services/session-readout";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/readout
 *
 * Post-session readout — the stall instrument. GM only. Computes inter-turn
 * latency, the worst silences, and per-author participation off the session's
 * turn timestamps so a playtest produces numbers about momentum, not vibes.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "read");
    if (rl) return rl;

    const { storyId, sessionId } = await params;

    const check = await verifySessionGmAccess(storyId, sessionId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the GM can read the session readout",
          },
        },
        { status: 403 }
      );
    }
    if (check.error) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to load readout" } },
        { status: 500 }
      );
    }

    const readout = await loadSessionReadout(check.session, check.story.userId);

    return NextResponse.json({ data: readout }, { status: 200 });
  } catch (error) {
    console.error(
      "GET /api/.../sessions/[sessionId]/readout error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load readout" } },
      { status: 500 }
    );
  }
}
