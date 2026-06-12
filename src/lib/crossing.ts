// The crossing — diving THROUGH a portal door. The door-side overlay rushes
// the ring and its world past the camera and breaks into light; the route
// swaps behind that light; the destination mounts under the SAME light and
// lets it fade off the world. sessionStorage hands the light's color across
// the navigation boundary so both halves paint one continuous pass-through.

export interface CrossingBloom {
  /** door accent as "r,g,b" — the color of the light you break into */
  rgb: string;
  t: number;
}

const KEY = "quiloria-crossing-v1";
// just long enough to survive the route swap — never a stale veil later
const TTL_MS = 8000;

export function markCrossing(bloom: Omit<CrossingBloom, "t">) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...bloom, t: Date.now() }));
  } catch {}
}

export function consumeCrossing(): CrossingBloom | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const bloom = JSON.parse(raw) as CrossingBloom;
    if (typeof bloom.t !== "number" || Date.now() - bloom.t > TTL_MS) return null;
    if (!bloom.rgb) return null;
    return bloom;
  } catch {
    return null;
  }
}

/** The light on the other side — door and destination paint the same one. */
export function bloomGradient(rgb: string): string {
  return `radial-gradient(circle at 50% 45%, rgba(${rgb},0.92) 0%, rgba(${rgb},0.4) 34%, rgb(13,10,20) 80%)`;
}
