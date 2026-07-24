import "server-only";
import { NextRequest, NextResponse } from "next/server";

// Streams are capped in lifetime and count: clients are expected to
// reconnect (EventSource does this automatically), so a 5-minute cap bounds
// leaked connections without breaking the UX, and the concurrency ceiling
// keeps a socket-hoarding client from exhausting DB-pool/timer capacity.
const MAX_CONNECTION_MS = 5 * 60 * 1000;
const MAX_CONCURRENT_STREAMS = 200;
let activeStreams = 0;

/**
 * Server-Sent Events scaffolding: run `tick` immediately and then on
 * an interval, with a 25s comment ping so proxies don't idle the
 * connection out. `tick` gets `send` (one JSON message event) and
 * `close` (end the stream). Cleanup runs on client disconnect, and the
 * stream is force-closed after MAX_CONNECTION_MS.
 *
 * Long-lived response — callers must export `dynamic = "force-dynamic"`.
 */
export function sseStream(
  request: NextRequest,
  tickMs: number,
  tick: (send: (payload: unknown) => void, close: () => void) => Promise<void>
): NextResponse {
  if (activeStreams >= MAX_CONCURRENT_STREAMS) {
    return NextResponse.json(
      { error: { code: "TOO_MANY_STREAMS", message: "Too many open streams. Try again shortly." } },
      { status: 503, headers: { "Retry-After": "10" } }
    );
  }

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let ticking = false;

  activeStreams += 1;

  // Runs exactly once regardless of which path ends the stream
  // (client abort, cancel, lifetime cap, or tick-driven close).
  const cleanup = () => {
    if (closed) return;
    closed = true;
    activeStreams -= 1;
    if (timer) clearInterval(timer);
    if (heartbeat) clearInterval(heartbeat);
    clearTimeout(maxLifetime);
  };

  // Scheduled at call time, not stream start, so the slot is reclaimed even
  // if the response body is never consumed.
  let maxLifetime = setTimeout(cleanup, MAX_CONNECTION_MS);

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

      const close = () => {
        if (closed) return;
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      request.signal.addEventListener("abort", close, { once: true });
      // Re-point the lifetime cap at the controller-aware close so the
      // client gets a clean end-of-stream instead of a dangling socket.
      if (!closed) {
        clearTimeout(maxLifetime);
        maxLifetime = setTimeout(close, MAX_CONNECTION_MS);
      }

      const runTick = async () => {
        // A slow DB tick must not stack behind the next interval fire.
        if (closed || ticking) return;
        ticking = true;
        try {
          await tick(send, close);
        } catch {
          // Transient hiccup; the next tick retries.
        } finally {
          ticking = false;
        }
      };

      await runTick();
      if (closed) return;
      timer = setInterval(runTick, tickMs);
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
      cleanup();
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
