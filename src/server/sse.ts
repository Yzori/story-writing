import "server-only";
import { NextRequest, NextResponse } from "next/server";

/**
 * Server-Sent Events scaffolding: run `tick` immediately and then on
 * an interval, with a 25s comment ping so proxies don't idle the
 * connection out. `tick` gets `send` (one JSON message event) and
 * `close` (end the stream). Cleanup runs on client disconnect.
 *
 * Long-lived response — callers must export `dynamic = "force-dynamic"`.
 */
export function sseStream(
  request: NextRequest,
  tickMs: number,
  tick: (send: (payload: unknown) => void, close: () => void) => Promise<void>
): NextResponse {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let ticking = false;

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
        closed = true;
        if (timer) clearInterval(timer);
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      request.signal.addEventListener("abort", close);

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
