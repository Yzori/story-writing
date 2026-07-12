import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { sseStream } from "@/server/sse";
import {
  loadPassagesAfter,
  loadTableStatePayload,
} from "@/server/services/adventure-live";

type RouteParams = { params: Promise<{ adventureId: string }> };

// SSE is a long-lived response; keep it on the Node.js runtime and never cache.
export const dynamic = "force-dynamic";

const TICK_MS = 2_000;

/**
 * GET /api/adventures/[adventureId]/stream?afterSort=N
 *
 * The table, live. One SSE connection replaces the 5s polling pair:
 * each server tick pushes `{ state?, passages? }` — state only when it
 * actually changed (fingerprinted), passages only past the cursor.
 * Seated players only; if the seat disappears mid-stream, the stream
 * ends and the client falls back to explaining itself.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }
  // One connection per page-load; charged once, against the read budget.
  const limited = applyRateLimit(request, session.user.id, "read");
  if (limited) return limited;

  const { adventureId } = await params;
  const userId = session.user.id;

  // Gate before streaming so a non-seated caller gets a real 404, not
  // an empty event stream.
  const initial = await loadTableStatePayload(adventureId, userId);
  if (!initial) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Adventure not found" } },
      { status: 404 }
    );
  }

  const afterSortParam = request.nextUrl.searchParams.get("afterSort");
  const parsedAfter = afterSortParam ? parseInt(afterSortParam, 10) : NaN;
  let cursor = Number.isFinite(parsedAfter) ? parsedAfter : -1;
  let lastStateJson = "";

  return sseStream(request, TICK_MS, async (send, close) => {
    const state = await loadTableStatePayload(adventureId, userId);
    if (!state) {
      // Seat revoked or adventure gone — tell the client, then end.
      send({ gone: true });
      close();
      return;
    }

    const passages = await loadPassagesAfter(adventureId, cursor);
    if (passages.length > 0) {
      cursor = Math.max(cursor, ...passages.map((p) => p.sortOrder));
    }

    const stateJson = JSON.stringify(state);
    const payload: Record<string, unknown> = {};
    if (stateJson !== lastStateJson) {
      lastStateJson = stateJson;
      payload.state = state;
    }
    if (passages.length > 0) payload.passages = passages;
    if (Object.keys(payload).length > 0) send(payload);
  });
}
