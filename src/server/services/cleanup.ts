import "server-only";
import { db } from "@/server/db";
import { spectatorReactions } from "@/server/db/schema";
import { and, eq, lt } from "drizzle-orm";

/**
 * Delete spectator reactions older than 2 minutes for a given session.
 */
export async function cleanupStaleReactions(sessionId: string) {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);
  try {
    await db
      .delete(spectatorReactions)
      .where(
        and(
          eq(spectatorReactions.sessionId, sessionId),
          lt(spectatorReactions.createdAt, cutoff)
        )
      );
  } catch (error) {
    console.error("Failed to cleanup stale reactions:", error);
  }
}

// Per-session cleanup throttle. The reactions GET endpoint used to fire
// cleanup on 5% of requests, which fired too often under heavy load and
// never under light load. A deterministic 30s window scales naturally:
// chatty sessions get exactly one sweep every 30s, quiet sessions get one
// the next time anyone polls. Map size is bounded by active session count.
const CLEANUP_INTERVAL_MS = 30_000;
const lastCleanupBySession = new Map<string, number>();

export function cleanupStaleReactionsIfDue(sessionId: string) {
  const now = Date.now();
  const last = lastCleanupBySession.get(sessionId) ?? 0;
  if (now - last < CLEANUP_INTERVAL_MS) return;
  // Set the marker BEFORE awaiting so concurrent callers in the same tick
  // see "recently swept" and skip; otherwise a thundering-herd of polls
  // could each kick off a redundant DELETE.
  lastCleanupBySession.set(sessionId, now);
  void cleanupStaleReactions(sessionId).catch(() => {
    // Already logged inside cleanupStaleReactions. We still hold the
    // 30s window so a flapping DB error doesn't cause a retry storm.
  });
}
