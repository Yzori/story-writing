import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { loadWatchStatePayload } from "@/server/services/adventure-live";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * GET /api/adventures/[adventureId]/watch
 * The public watch state: the table as the audience sees it. No
 * hands, no whispers — those belong to the cast. Includes the lantern
 * count, backings, the open house vote, and cast presence. The polling
 * fallback for /watch/stream — same payload, same builder.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    const data = await loadWatchStatePayload(
      adventureId,
      session?.user?.id ?? null
    );
    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/adventures/[adventureId]/watch",
      "Failed to open the room",
    );
  }
}
