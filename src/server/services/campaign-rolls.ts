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
