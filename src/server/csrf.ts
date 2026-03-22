import "server-only";
import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

/**
 * Generate a random CSRF token.
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates CSRF protection using a layered approach:
 * 1. Origin header validation (primary)
 * 2. Double-submit cookie pattern (secondary, for API clients)
 *
 * Returns a 403 response if validation fails, or null if OK.
 * On safe methods (GET/HEAD/OPTIONS), sets the CSRF cookie if missing.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  const method = request.method;

  // Safe methods: ensure CSRF cookie exists for future mutations
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    if (!request.cookies.get(CSRF_COOKIE)) {
      const response = NextResponse.next();
      response.cookies.set(CSRF_COOKIE, generateToken(), {
        httpOnly: false, // Client JS needs to read this to send in header
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
      return response;
    }
    return null;
  }

  // Mutating methods: validate origin + double-submit cookie

  // Layer 1: Origin header check
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Invalid request origin" } },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Invalid request origin" } },
        { status: 403 }
      );
    }
  }

  // Layer 2: Double-submit cookie validation
  // Both cookie AND header must be present and match for mutating requests
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing CSRF protection" } },
      { status: 403 }
    );
  }

  if (cookieToken !== headerToken) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "CSRF token mismatch" } },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Name of the CSRF cookie — export for client-side use.
 */
export { CSRF_COOKIE, CSRF_HEADER };
