import { NextRequest, NextResponse } from "next/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

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
