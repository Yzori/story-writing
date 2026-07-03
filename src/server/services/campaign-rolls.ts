import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  campaignRollResponses,
  campaignTurns,
  playerCharacters,
  sessionRoster,
} from "@/server/db/schema";
import { parseRollRequestMetadata } from "@/lib/campaign-turns";

const ACTIVE_ROSTER_STATUSES = ["present", "introduced"] as const;

export interface PendingRollRequestInfo {
  turnId: string;
  targetUserId: string;
  reason: string;
  pendingUserIds: string[];
}

export type RollTier = "success" | "partial" | "failure";

/** PbtA-style 2d6 tiers: 10+ full, 7-9 partial, 6- miss. */
export function rollTierFor(total: number): RollTier {
  return total >= 10 ? "success" : total >= 7 ? "partial" : "failure";
}

export interface RollResolutionInput {
  /** The two crypto-rolled dice (1-6 each). Injected so this stays pure/testable. */
  d1: number;
  d2: number;
  /** The character's aspect text ("" if none). */
  aspect: string;
  aspectInvoked: boolean;
  /** Whether the aspect trump is still available this scene (caller computes). */
  aspectAvailable: boolean;
  /** Whether the roll-request flagged this as fatal. */
  fatalRequested: boolean;
  /** The rolling character's first name, for the set line. */
  characterName?: string | null;
}

export interface RollResolution {
  dice: [number, number];
  total: number;
  tier: RollTier;
  /** True when the aspect trump converted a miss into a foothold. */
  aspectSaved: boolean;
  /** True only when a fatal roll actually ended in failure. */
  fatal: boolean;
  markEligible: boolean;
  content: string;
}

/**
 * Resolve a flat 2d6 roll (no numeric modifiers — the dice are a shared dramatic
 * device; see docs/adventure-audit.md D1). The one lever is the aspect trump:
 * invoking your truth turns a miss into a foothold once per scene, and only when
 * it actually saves the roll. Pure — caller supplies the dice + scene availability.
 */
export function resolveRoll(input: RollResolutionInput): RollResolution {
  const { d1, d2, aspect, aspectInvoked, aspectAvailable, fatalRequested, characterName } = input;
  const total = d1 + d2;
  let tier = rollTierFor(total);

  let aspectSaved = false;
  if (aspectInvoked && aspect && aspectAvailable && tier === "failure") {
    tier = "partial";
    aspectSaved = true;
  }

  // The turn's content IS the one line of set type the v2 page prints —
  // mechanics resolve into print, never into ink.
  const tierSentence =
    tier === "success" ? "It holds." : tier === "partial" ? "It holds — at a price." : "It breaks.";
  const who = characterName ? `${characterName.split(" ")[0]} rolled` : "The dice";
  const truthTag = aspectSaved ? " Their truth turned the miss." : "";
  const content = `— ${who}: ${d1} + ${d2} = ${total}. ${tierSentence}${truthTag}`;

  // markEligible: worth marking when it cost something — partial or worse, or
  // any fatal-flagged roll (even a survived one: "I lived through this").
  const fatal = fatalRequested && tier === "failure";
  const markEligible = fatal || tier !== "success" || fatalRequested;

  return { dice: [d1, d2], total, tier, aspectSaved, fatal, markEligible, content };
}

/**
 * The GM-narrated consequence prose for a resolved roll. Uses the GM's
 * pre-written onSuccess/onFailure when present; otherwise a fail-forward generic
 * that escalates a miss instead of dead-ending it (see audit P0 #4).
 */
export function buildRollConsequenceText(
  tier: RollTier,
  meta: { fatal?: boolean; onSuccess?: string; onFailure?: string },
): string {
  const generic: Record<RollTier, string> = {
    success: meta.fatal ? "Against all odds, fate is kind. They survive." : "The way opens — what they reached for, they take.",
    partial: meta.fatal ? "They cling to life - but barely. The cost is terrible." : "They get it — but the ground shifts. Something is owed.",
    failure: meta.fatal ? "The dice have spoken. There is no escape from this fate." : "It slips — and the moment turns against them. The table waits on what that costs.",
  };
  if (tier === "failure") return meta.onFailure || generic.failure;
  if (tier === "success") return meta.onSuccess || generic.success;
  return meta.onSuccess && meta.onFailure
    ? `${meta.onSuccess} - but ${meta.onFailure.charAt(0).toLowerCase()}${meta.onFailure.slice(1)}`
    : generic.partial;
}

export async function getActiveSessionPlayerIds(sessionId: string, storyId: string): Promise<string[]> {
  const rosterRows = await db
    .select({ userId: sessionRoster.userId })
    .from(sessionRoster)
    .innerJoin(playerCharacters, eq(sessionRoster.characterId, playerCharacters.id))
    .where(
      and(
        eq(sessionRoster.sessionId, sessionId),
        inArray(sessionRoster.status, [...ACTIVE_ROSTER_STATUSES]),
        eq(playerCharacters.status, "active"),
      ),
    );

  if (rosterRows.length > 0) {
    return [...new Set(rosterRows.map((row) => row.userId))];
  }

  const characterRows = await db
    .select({ userId: playerCharacters.userId })
    .from(playerCharacters)
    .where(
      and(
        eq(playerCharacters.storyId, storyId),
        eq(playerCharacters.status, "active"),
      ),
    );

  return [...new Set(characterRows.map((row) => row.userId))];
}

export async function getPendingRollRequests(
  sessionId: string,
  storyId: string,
): Promise<PendingRollRequestInfo[]> {
  const [rollRequests, responses, activePlayerIds] = await Promise.all([
    db.query.campaignTurns.findMany({
      where: and(
        eq(campaignTurns.sessionId, sessionId),
        eq(campaignTurns.type, "roll-request"),
      ),
      orderBy: (turns, { asc }) => [asc(turns.sortOrder)],
    }),
    db.query.campaignRollResponses.findMany({
      where: eq(campaignRollResponses.sessionId, sessionId),
    }),
    getActiveSessionPlayerIds(sessionId, storyId),
  ]);

  const responseMap = new Map<string, Set<string>>();
  for (const response of responses) {
    const users = responseMap.get(response.rollRequestTurnId) ?? new Set<string>();
    users.add(response.userId);
    responseMap.set(response.rollRequestTurnId, users);
  }

  const pending: PendingRollRequestInfo[] = [];
  for (const request of rollRequests) {
    const meta = parseRollRequestMetadata(request.metadata);
    if (!meta) continue;
    if ((meta.status ?? "open") !== "open") continue;

    const requiredUserIds = meta.requiredUserIds?.length
      ? meta.requiredUserIds
      : meta.targetUserId === "everyone"
        ? activePlayerIds
        : activePlayerIds.includes(meta.targetUserId) ? [meta.targetUserId] : [];
    const answered = responseMap.get(request.id) ?? new Set<string>();
    const pendingUserIds = requiredUserIds.filter((userId) => !answered.has(userId));

    if (pendingUserIds.length > 0) {
      pending.push({
        turnId: request.id,
        targetUserId: meta.targetUserId,
        reason: meta.reason,
        pendingUserIds,
      });
    }
  }

  return pending;
}
