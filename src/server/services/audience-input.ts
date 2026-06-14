import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignSessions, stories } from "@/server/db/schema";

/**
 * Shared scaffolding for the audience-input layer — the four near-parallel
 * spectator pipelines (table floor votes, audience house votes, audience
 * sparks, audience pulses, story-moment amplifications) all gate on the same
 * "public story + session" check and derive the same anti-ballot-stuffing key.
 *
 * The pipelines' *business* logic (drop transfers, conflict targets, weight
 * math, tallies) intentionally stays in their own routes — only the duplicated
 * scaffolding lives here.
 *
 * NOTE (deferred physical merge): there are three audience-input tables
 * (campaign_floor_audience_votes / _sparks / _pulses) plus the table-side
 * campaign_floor_votes. They could collapse into one polymorphic
 * `campaign_audience_input` table, but that would require a destructive data
 * migration over live spectator data, so it is intentionally NOT done here.
 * This service unifies the logic; the physical table merge is left for a future
 * maintenance window that can backfill safely.
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
 * they generated, so clearing localStorage was enough to vote/pulse/spark
 * again. Mixing the request IP + UA into the hash keeps the client-side "I
 * voted" UX (the token persists) while binding the slot to network identity, so
 * a determined re-voter has to change network or browser, not just clear
 * storage. Behind NAT this is best-effort, not bulletproof — adequate for an
 * opinion poll. This replaces the identical `derivePulseKey` / `deriveSparkKey`
 * copies.
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
