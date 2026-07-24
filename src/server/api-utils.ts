import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { authRateLimits } from "@/server/db/schema";
import { rateLimit, RATE_LIMITS } from "@/server/rate-limit";

type RateLimitOptions = {
  max: number;
  windowSeconds: number;
};

/**
 * Build standard rate-limit response headers.
 */
export function getRateLimitHeaders(result: {
  remaining: number;
  reset: number;
  max: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.max),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}

/**
 * Extract a client identifier from the request.
 * Uses authenticated user ID when provided, otherwise falls back to
 * the x-forwarded-for header or a generic key.
 */
function getClientKey(request: NextRequest, userId?: string | null): string {
  if (userId) return userId;
  // Use the LAST x-forwarded-for entry: it's appended by the proxy in front
  // of us, so it can't be forged by the client (unlike the first entry),
  // and it keeps anonymous traffic per-IP instead of one shared bucket.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return request.headers.get("x-real-ip")?.trim() || "anonymous";
}

/**
 * Rate-limit guard for API route handlers.
 *
 * Call at the top of your handler (after auth check so you can pass userId).
 * Returns `null` if the request is allowed, or a 429 NextResponse if rate-limited.
 *
 * @example
 * ```ts
 * const limited = applyRateLimit(request, session?.user?.id, "write");
 * if (limited) return limited;
 * ```
 */
export function applyRateLimit(
  request: NextRequest,
  userId: string | null | undefined,
  kind: "read" | "write",
  customOpts?: RateLimitOptions
): NextResponse | null {
  const opts = customOpts ?? RATE_LIMITS[kind];
  const clientKey = getClientKey(request, userId);
  const key = `${kind}:${clientKey}`;

  const result = rateLimit(key, opts);

  if (!result.success) {
    const headers = getRateLimitHeaders({ ...result, max: opts.max });
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      },
      { status: 429, headers }
    );
  }

  return null;
}

/**
 * Persistent rate-limit guard for authentication and account-safety flows.
 * Use this where process-local memory would weaken abuse protection.
 */
export async function applyPersistentRateLimit(
  request: NextRequest,
  userId: string | null | undefined,
  kind: "read" | "write",
  customOpts?: RateLimitOptions
): Promise<NextResponse | null> {
  const opts = customOpts ?? RATE_LIMITS[kind];
  const clientKey = getClientKey(request, userId);
  const key = `${kind}:${clientKey}:${request.nextUrl.pathname}`;
  const now = Date.now();
  const nowDate = new Date(now);
  const windowStartCutoff = now - opts.windowSeconds * 1000;

  const result = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(authRateLimits)
      .values({ key, count: 1, windowStart: nowDate, updatedAt: nowDate })
      .onConflictDoNothing({ target: authRateLimits.key })
      .returning({ key: authRateLimits.key });

    if (created) {
      return { success: true as const };
    }

    const [current] = await tx
      .select({ count: authRateLimits.count, windowStart: authRateLimits.windowStart })
      .from(authRateLimits)
      .where(eq(authRateLimits.key, key))
      .for("update");

    if (!current) {
      return {
        success: false as const,
        reset: Math.ceil((now + opts.windowSeconds * 1000) / 1000),
      };
    }

    if (current.windowStart.getTime() <= windowStartCutoff) {
      await tx
        .update(authRateLimits)
        .set({ count: 1, windowStart: nowDate, updatedAt: nowDate })
        .where(eq(authRateLimits.key, key));
      return { success: true as const };
    }

    const reset = Math.ceil(
      (current.windowStart.getTime() + opts.windowSeconds * 1000) / 1000
    );
    if (current.count >= opts.max) {
      return { success: false as const, reset };
    }

    await tx
      .update(authRateLimits)
      .set({ count: current.count + 1, updatedAt: nowDate })
      .where(eq(authRateLimits.key, key));

    return { success: true as const };
  });

  if (!result.success) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      },
      {
        status: 429,
        headers: getRateLimitHeaders({
          remaining: 0,
          reset: result.reset,
          max: opts.max,
        }),
      }
    );
  }

  return null;
}
