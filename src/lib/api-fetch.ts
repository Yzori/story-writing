/**
 * Client-side fetch wrapper that automatically includes CSRF protection.
 *
 * For browser requests, the Origin header provides CSRF protection.
 * This utility additionally sends the double-submit cookie token for defense-in-depth.
 */

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

function getCsrfToken(): string {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`)
  );
  return match?.[1] ?? "";
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function apiFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();

  if (MUTATING_METHODS.has(method)) {
    const headers = new Headers(init.headers);
    if (!headers.has(CSRF_HEADER)) {
      headers.set(CSRF_HEADER, getCsrfToken());
    }
    return fetch(url, { ...init, headers });
  }

  return fetch(url, init);
}
