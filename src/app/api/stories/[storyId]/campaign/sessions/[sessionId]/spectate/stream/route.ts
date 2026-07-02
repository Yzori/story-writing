import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  campaignSessions,
  campaignTurns,
  users,
  playerCharacters,
  spectatorPresence,
} from "@/server/db/schema";
import { eq, and, asc, gt, isNull, like, ne, or, sql } from "drizzle-orm";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

// SSE is a long-lived response; keep it on the Node.js runtime and never cache.
export const dynamic = "force-dynamic";

const TICK_MS = 3_000;

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/stream
 *
 * Server-Sent Events feed for spectators. Pushes new (non-OOC) turns plus
 * session + spectator-count updates as they appear, so the spectator view gets
 * live turns without hammering the poll endpoint. Gated on the story being
 * public exactly like the spectate poll route — never streams private sessions.
 *
 * Event payload (one per "message" event) mirrors the poll response keys the
 * client already consumes:
 *   { data: Turn[], session: {...}, spectatorCount: number }
 * `data` carries only turns newer than the client's cursor (or this connection's
 * cursor after the first tick).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { storyId, sessionId } = await params;

  // Verify story exists, is public, and not deleted (same gate as spectate poll)
  const story = await db.query.stories.findFirst({
    where: and(
      eq(stories.id, storyId),
      eq(stories.isPublic, true),
      isNull(stories.deletedAt)
    ),
  });

  if (!story) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Story not found" } },
      { status: 404 }
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

  // Seed the cursor from the client so it doesn't re-receive turns it already has.
  const afterSortParam = request.nextUrl.searchParams.get("afterSort");
  const parsedAfter = afterSortParam ? parseInt(afterSortParam, 10) : NaN;
  let cursor = Number.isFinite(parsedAfter) ? parsedAfter : -1;

  const encoder = new TextEncoder();

  const fetchNewTurns = async (afterSort: number) => {
    return db
      .select({
        id: campaignTurns.id,
        sessionId: campaignTurns.sessionId,
        userId: campaignTurns.userId,
        characterId: campaignTurns.characterId,
        type: campaignTurns.type,
        content: campaignTurns.content,
        metadata: campaignTurns.metadata,
        sortOrder: campaignTurns.sortOrder,
        createdAt: campaignTurns.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        characterName: playerCharacters.name,
        characterPortrait: playerCharacters.portrait,
      })
      .from(campaignTurns)
      .leftJoin(users, eq(campaignTurns.userId, users.id))
      .leftJoin(playerCharacters, eq(campaignTurns.characterId, playerCharacters.id))
      .where(
        and(
          eq(campaignTurns.sessionId, sessionId),
          // ooc table talk stays private; vote records print on the page.
          or(
            ne(campaignTurns.type, "ooc"),
            like(campaignTurns.metadata, '%"kind":"vote-record"%'),
          ),
          gt(campaignTurns.sortOrder, afterSort)
        )
      )
      .orderBy(asc(campaignTurns.sortOrder));
  };

  const fetchSessionState = async () => {
    const s = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!s) return null;
    return {
      id: s.id,
      title: s.title,
      status: s.status,
      activePlayerId: s.activePlayerId,
      opening: s.opening,
      epilogue: s.epilogue,
    };
  };

  const fetchSpectatorCount = async () => {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(spectatorPresence)
      .where(
        and(
          eq(spectatorPresence.sessionId, sessionId),
          gt(spectatorPresence.lastHeartbeat, sql`now() - interval '45 seconds'`)
        )
      );
    return Number(row?.count ?? 0);
  };

  let timer: ReturnType<typeof setInterval> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // Controller already closed; stop pushing.
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      // Abort when the client disconnects.
      request.signal.addEventListener("abort", cleanup);

      const tick = async () => {
        if (closed) return;
        try {
          const newTurns = await fetchNewTurns(cursor);
          if (newTurns.length > 0) {
            cursor = Math.max(cursor, ...newTurns.map((t) => t.sortOrder));
          }
          const [session, spectatorCount] = await Promise.all([
            fetchSessionState(),
            fetchSpectatorCount(),
          ]);
          send({ data: newTurns, session, spectatorCount });
        } catch {
          // Transient DB hiccup; the next tick will retry.
        }
      };

      // Open the stream with a comment so EventSource fires onopen promptly.
      send({ data: [], session: await fetchSessionState(), spectatorCount: await fetchSpectatorCount() });

      timer = setInterval(tick, TICK_MS);
      // Comment lines keep proxies from idling the connection out.
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // Already closed.
        }
      }, 25_000);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
