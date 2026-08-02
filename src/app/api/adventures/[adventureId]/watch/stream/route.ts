import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { sseStream } from "@/server/sse";
import {
  adventureExists,
  loadSparkTotals,
  loadWatchPassagesPayload,
  loadWatchStatePayload,
} from "@/server/services/adventure-live";

type RouteParams = { params: Promise<{ adventureId: string }> };

// SSE is a long-lived response; keep it on the Node.js runtime and never cache.
export const dynamic = "force-dynamic";

const TICK_MS = 3_000;

/**
 * GET /api/adventures/[adventureId]/watch/stream
 *
 * The room, live, for the audience — no account needed, same gate as
 * the watch poll routes. First frame carries the full page as
 * `passages`; after that only new passages ride as `append` (cursor on
 * sortOrder, like the seated stream) and spark movement on old
 * passages arrives as a compact `sparks` count map. Passage content is
 * immutable once signed, so it is never re-read or re-sent.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const limited = applyRateLimit(request, session?.user?.id, "read");
  if (limited) return limited;

  const { adventureId } = await params;
  const userId = session?.user?.id ?? null;

  if (!(await adventureExists(adventureId))) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Adventure not found" } },
      { status: 404 }
    );
  }

  let lastStateJson = "";
  let lastSparksJson = "";
  let cursor: number | null = null;
  let sentInitialPage = false;

  return sseStream(request, TICK_MS, async (send, close) => {
    const state = await loadWatchStatePayload(adventureId, userId);
    if (!state) {
      send({ gone: true });
      close();
      return;
    }

    const payload: Record<string, unknown> = {};

    const stateJson = JSON.stringify(state);
    if (stateJson !== lastStateJson) {
      lastStateJson = stateJson;
      payload.state = state;
    }

    const fresh = await loadWatchPassagesPayload(adventureId, userId, cursor);
    if (fresh.length > 0) {
      cursor = fresh[fresh.length - 1].sortOrder;
      if (sentInitialPage) payload.append = fresh;
      else payload.passages = fresh;
    }
    sentInitialPage = true;

    const sparks = await loadSparkTotals(adventureId);
    const sparksJson = JSON.stringify(sparks);
    if (sparksJson !== lastSparksJson) {
      lastSparksJson = sparksJson;
      // Skip the map on the very frame that already carries the full
      // page — those passages have fresh counts baked in.
      if (!payload.passages) payload.sparks = sparks;
    }

    if (Object.keys(payload).length > 0) send(payload);
  });
}
