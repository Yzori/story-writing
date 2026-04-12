import "server-only";
import { db } from "@/server/db";
import { spectatorReactions } from "@/server/db/schema";
import { and, eq, lt } from "drizzle-orm";

/**
 * Delete spectator reactions older than 2 minutes for a given session.
 * Called probabilistically from the reactions GET endpoint.
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
