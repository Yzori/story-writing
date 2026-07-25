import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { getDiscover } from "@/server/services/studio";

/**
 * GET /api/discover
 *
 * Personalized discovery — all real:
 *   trending  public published stories ranked by the shared 7-day trending
 *             score (sparks ×3, follows ×5, donation drops ×0.5 — see
 *             src/server/services/trending.ts, same scorer as /api/home),
 *             biased to the genres the user reads/writes. Excludes their own.
 *   jam       the nearest open/upcoming story jam.
 *   openCall  a current open collaborator call on someone else's story.
 *
 * The query itself lives in the studio service, which builds this in the same
 * pass as the rest of the dashboard; this route serves other callers.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const limited = applyRateLimit(request, userId, "read");
    if (limited) return limited;

    const data = await getDiscover(userId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/discover error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load discovery" } },
      { status: 500 },
    );
  }
}
