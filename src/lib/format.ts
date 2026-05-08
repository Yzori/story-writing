/**
 * Shared formatting utilities used across pages and components.
 */

export function formatTimeAgo(dateOrTimestamp: string | number): string {
  const date =
    typeof dateOrTimestamp === "number"
      ? new Date(dateOrTimestamp)
      : new Date(dateOrTimestamp);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/**
 * Reading-time at the conventional 250 wpm pace.
 * Returns short, scan-friendly strings:
 *  - "<1 min" for tiny excerpts
 *  - "5 min" / "23 min" / "1 hr" / "1 hr 20 min"
 *  - Full hours collapse minutes when minutes < 5 ("2 hr" not "2 hr 3 min")
 */
export function formatReadTime(words: number, wpm = 250): string {
  if (!words || words <= 0) return "";
  const minutes = Math.max(1, Math.round(words / wpm));
  if (words < 100) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem < 5) return `${hours} hr`;
  return `${hours} hr ${rem} min`;
}

/**
 * Reading-length category — useful for "if you have X minutes" filters.
 */
export function readLengthBucket(words: number): "quick" | "short" | "medium" | "long" | "epic" {
  if (words < 1000) return "quick";    // < 4 min
  if (words < 5000) return "short";    // < 20 min
  if (words < 20000) return "medium";  // < 1.5 hr
  if (words < 80000) return "long";    // < 5 hr
  return "epic";
}
