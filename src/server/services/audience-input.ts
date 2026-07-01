import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignSessions, stories } from "@/server/db/schema";

/**
 * Shared scaffolding for the audience-input layer — the spectator pipelines
 * (audience pulses, spectator reactions, and the read-side floor-round view)
 * all gate on the same "public story + session" check and derive the same
 * anti-ballot-stuffing key. (House votes, audience sparks, and story-moment
 * amplifications were killed 2026-07-01; their orphaned tables await a
 * cleanup migration.)
 *
 * The pipelines' *business* logic (conflict targets, tallies) intentionally
 * stays in their own routes — only the duplicated scaffolding lives here.
 */

type Story = typeof stories.$inferSelect;
type CampaignSession = typeof campaignSessions.$inferSelect;

export type PublicStorySession = {
  story: Story;
  session: CampaignSession;
};

/**
 * Look up a public, non-deleted story and the campaign session that belongs to
 * it. Returns `null` when either is missing or the story is private — callers
 * map that to a 404 so a private session is indistinguishable from a missing
 * one. This replaces the per-route `verifyPublicSession` / `getPublicStorySession`
 * copies.
 */
export async function getPublicStorySession(
  storyId: string,
  sessionId: string,
): Promise<PublicStorySession | null> {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), eq(stories.isPublic, true), isNull(stories.deletedAt)),
  });
  if (!story) return null;

  const session = await db.query.campaignSessions.findFirst({
    where: and(eq(campaignSessions.id, sessionId), eq(campaignSessions.storyId, storyId)),
  });
  if (!session) return null;

  return { story, session };
}

/** Boolean convenience wrapper for callers that don't need the rows. */
export async function verifyPublicSession(storyId: string, sessionId: string): Promise<boolean> {
  return (await getPublicStorySession(storyId, sessionId)) !== null;
}

/**
 * Derive a stable per-spectator key for the (round/session, token) conflict
 * slot. Anonymous spectators are only distinguished by the localStorage token
 * they generated, so clearing localStorage was enough to pulse again. Mixing
 * the request IP + UA into the hash keeps the client-side "I voted" UX (the
 * token persists) while binding the slot to network identity, so a determined
 * re-voter has to change network or browser, not just clear storage. Behind
 * NAT this is best-effort, not bulletproof — adequate for an opinion poll.
 */
export function deriveAudienceKey(request: NextRequest, rawToken: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ua = request.headers.get("user-agent") ?? "";
  return createHash("sha256")
    .update(`${rawToken.trim()}|${ip}|${ua}`)
    .digest("hex");
}
