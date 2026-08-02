import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { getStudioSnapshot } from "@/server/services/studio";

/**
 * GET /api/dashboard
 *
 * The whole studio in one payload — shelf, live tables, signals, discovery.
 * The page itself renders from `getStudioSnapshot` server-side; this route
 * serves the same shape to the client's quiet refresh, so the two transports
 * can never drift apart.
 *
 * (Until 2026-07-24 the studio fanned out to five endpoints after hydration
 * and painted a skeleton until the slowest one landed. It doesn't any more.)
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

    const data = await getStudioSnapshot(userId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, "GET /api/dashboard", "Failed to load dashboard");
  }
}
