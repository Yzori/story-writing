import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import {
  adventureExists,
  loadWatchPassagesPayload,
} from "@/server/services/adventure-live";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * GET /api/adventures/[adventureId]/watch/passages?afterSort=N
 * The page for the audience: passages with spark counts, whether the
 * caller sparked each one, and reader-credit lines for canonized
 * suggestions. Polling fallback for /watch/stream.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    if (!(await adventureExists(adventureId))) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const afterSortParam = request.nextUrl.searchParams.get("afterSort");
    const afterSort =
      afterSortParam === null ? null : parseInt(afterSortParam, 10);

    const data = await loadWatchPassagesPayload(
      adventureId,
      session?.user?.id ?? null,
      afterSort
    );
    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/adventures/[adventureId]/watch/passages",
      "Failed to load the page",
    );
  }
}
