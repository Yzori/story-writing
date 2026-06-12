// Client-side handoff between the auth pages and the studio arrival overlay.
// Login/register mark the arrival just before redirecting; the dashboard
// consumes it once and plays the ceremony. TTL covers the onboarding detour
// (/welcome, /create) a brand-new writer takes before first reaching the
// studio, without ever firing on a stale flag mid-session.

export type ArrivalKind = "new" | "return";

const KEY = "quiloria-arrival-v1";
const TTL_MS = 15 * 60 * 1000;

export function markArrival(kind: ArrivalKind) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ kind, t: Date.now() }));
  } catch {
    // storage unavailable — the studio simply opens without the ceremony
  }
}

export function consumeArrival(): ArrivalKind | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as { kind?: unknown; t?: unknown };
    if (typeof parsed.t !== "number" || Date.now() - parsed.t > TTL_MS) return null;
    return parsed.kind === "new" || parsed.kind === "return" ? parsed.kind : null;
  } catch {
    return null;
  }
}
