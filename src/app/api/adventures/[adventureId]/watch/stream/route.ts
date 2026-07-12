import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { sseStream } from "@/server/sse";
import {
  adventureExists,
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
 * the watch poll routes. Pushes `{ state?, passages? }` when either
 * actually changed; passages arrive as the full sparked page because
 * spark counts move on old passages too.
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
  let lastPassagesJson = "";

  return sseStream(request, TICK_MS, async (send, close) => {
    const state = await loadWatchStatePayload(adventureId, userId);
    if (!state) {
      send({ gone: true });
      close();
      return;
    }
    const passages = await loadWatchPassagesPayload(adventureId, userId, null);

    const stateJson = JSON.stringify(state);
    const passagesJson = JSON.stringify(passages);
    const payload: Record<string, unknown> = {};
    if (stateJson !== lastStateJson) {
      lastStateJson = stateJson;
      payload.state = state;
    }
    if (passagesJson !== lastPassagesJson) {
      lastPassagesJson = passagesJson;
      payload.passages = passages;
    }
    if (Object.keys(payload).length > 0) send(payload);
  });
}
