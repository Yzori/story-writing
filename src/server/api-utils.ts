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
  if (!process.env.TRUST_PROXY_HEADERS && !process.env.VERCEL) {
    return "anonymous";
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first IP
    return forwarded.split(",")[0].trim();
  }
  return "anonymous";
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

  const current = await db.query.authRateLimits.findFirst({
    where: eq(authRateLimits.key, key),
    columns: { count: true, windowStart: true },
  });

  if (!current || current.windowStart.getTime() <= windowStartCutoff) {
    await db
      .insert(authRateLimits)
      .values({ key, count: 1, windowStart: nowDate, updatedAt: nowDate })
      .onConflictDoUpdate({
        target: authRateLimits.key,
        set: { count: 1, windowStart: nowDate, updatedAt: nowDate },
      });
    return null;
  }

  const nextCount = current.count + 1;
  if (nextCount > opts.max) {
    const reset = Math.ceil((current.windowStart.getTime() + opts.windowSeconds * 1000) / 1000);
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
          reset,
          max: opts.max,
        }),
      }
    );
  }

  await db
    .update(authRateLimits)
    .set({ count: nextCount, updatedAt: nowDate })
    .where(eq(authRateLimits.key, key));

  return null;
}
