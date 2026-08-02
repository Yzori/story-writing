import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { loadTableStatePayload } from "@/server/services/adventure-live";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * GET /api/adventures/[adventureId]
 * Full table state for a seated player: adventure, seats, scenes,
 * spotlight, hands, and presence. Whispers are only included for the
 * Director; other writers see that a hand is up, never what it holds.
 * The polling fallback for /stream — both serve the same payload
 * built by adventure-live.
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
    const limited = applyRateLimit(request, session.user.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    const data = await loadTableStatePayload(adventureId, session.user.id);
    // The table is for the seated. The audience has the watch surface.
    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, "GET /api/adventures/[adventureId]", "Failed to load adventure");
  }
}
