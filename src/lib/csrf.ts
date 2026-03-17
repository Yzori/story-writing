import { NextRequest, NextResponse } from "next/server";

/**
 * Validates that the request origin matches the host.
 * Returns a 403 response if the origin is invalid, or null if OK.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  const method = request.method;
  // Only check mutating methods
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // If no origin header (same-origin requests from some browsers), allow
  if (!origin) return null;

  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
  } catch {
    // Invalid origin URL
  }

  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "Invalid request origin" } },
    { status: 403 }
  );
}
