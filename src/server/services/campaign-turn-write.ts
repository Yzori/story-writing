import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignTurns, places, playerCharacters, sessionRoster } from "@/server/db/schema";
import {
  parseRollRequestMetadata,
  parseSceneBreakMetadata,
  parseStoryMomentMetadata,
} from "@/lib/campaign-turns";
import { buildRollConsequenceText, type RollTier } from "@/server/services/campaign-rolls";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Resolve which active players a roll request actually targets.
 * "everyone" expands to all active session players; a single target must be an
 * active player. Returns the (possibly empty) list — the caller decides how to
 * surface an empty result (it maps to a 400 in the route).
 */
export function resolveRollRequestTargets(
  rollRequestMeta: NonNullable<ReturnType<typeof parseRollRequestMetadata>>,
  activePlayerIds: string[],
): string[] {
  return rollRequestMeta.targetUserId === "everyone"
    ? activePlayerIds
    : activePlayerIds.includes(rollRequestMeta.targetUserId)
      ? [rollRequestMeta.targetUserId]
      : [];
}

/**
 * Normalize the stored metadata for a story-moment turn into its canonical
 * JSON shape (defaults applied, optional fields only present when set).
 */
export function normalizeStoryMomentMetadata(
  storyMomentMeta: NonNullable<ReturnType<typeof parseStoryMomentMetadata>>,
): string {
  return JSON.stringify({
    mood: storyMomentMeta.mood ?? "ominous",
    ...(storyMomentMeta.subtext ? { subtext: storyMomentMeta.subtext } : {}),
    importance: storyMomentMeta.importance ?? "normal",
    ...(storyMomentMeta.startsScene ? { startsScene: true } : {}),
  });
}

/**
 * Auto-link a scene-break to a place and return the metadata to persist. If the
 * GM supplies a locationId we trust it (after verifying it belongs to this
 * story); otherwise we upsert a place keyed off the scene-break's title so the
 * Places list populates without any GM busywork. The unique index on (storyId,
 * nameKey) makes "different scenes with the same title" idempotent. Cinematic
 * scene-breaks are passed through untouched.
 */
export async function resolveSceneBreakMetadata(
  storyId: string,
  metadataToStore: string | null,
): Promise<string | null> {
  const sceneMeta = parseSceneBreakMetadata(metadataToStore) ?? {};
  let resolvedLocationId: string | null = sceneMeta.locationId ?? null;

  if (sceneMeta.cinematic) {
    return JSON.stringify(sceneMeta);
  }

  if (resolvedLocationId) {
    const existing = await db.query.places.findFirst({
      where: and(
        eq(places.id, resolvedLocationId),
        eq(places.storyId, storyId),
      ),
    });
    if (!existing) {
      // Don't 400 — just drop the bad id and fall through to the
      // title-based path so the scene still lands.
      resolvedLocationId = null;
    }
  }

  if (!resolvedLocationId && sceneMeta.title?.trim()) {
    const name = sceneMeta.title.trim();
    const nameKey = name.toLowerCase();
    const [inserted] = await db
      .insert(places)
      .values({
        storyId,
        name,
        nameKey,
        mood: sceneMeta.mood ?? null,
        autoCreated: true,
      })
      .onConflictDoNothing({
        target: [places.storyId, places.nameKey],
      })
      .returning({ id: places.id });
    if (inserted) {
      resolvedLocationId = inserted.id;
    } else {
      const [existing] = await db
        .select({ id: places.id })
        .from(places)
        .where(and(eq(places.storyId, storyId), eq(places.nameKey, nameKey)))
        .limit(1);
      resolvedLocationId = existing?.id ?? null;
    }
  }

  if (resolvedLocationId) {
    return JSON.stringify({
      ...sceneMeta,
      locationId: resolvedLocationId,
    });
  }

  return metadataToStore;
}

/**
 * Side-effects that run inside the turn transaction after a roll responds to a
 * roll-request: post the GM consequence (single-target requests only) and, on a
 * fatal failure, flip the character to dead and drop them to spectating. Runs
 * within the caller's transaction so it shares the session row lock.
 */
export async function applyRollRequestResolution(
  tx: Tx,
  args: {
    sessionId: string;
    runningGmId: string;
    serverRollTier: "success" | "partial" | "failure" | null;
    rollRequestMeta: NonNullable<ReturnType<typeof parseRollRequestMetadata>>;
    rollRequestTurnId: string;
    rollTurnId: string;
    characterId: string | null;
  },
): Promise<void> {
  const {
    sessionId,
    runningGmId,
    serverRollTier,
    rollRequestMeta,
    rollRequestTurnId,
    rollTurnId,
    characterId,
  } = args;

  const tier: RollTier = serverRollTier ?? "failure";
  const fatalFailure = rollRequestMeta.fatal === true && tier === "failure";

  if (rollRequestMeta.targetUserId !== "everyone") {
    const outcomeText = buildRollConsequenceText(tier, {
      fatal: rollRequestMeta.fatal,
      onSuccess: rollRequestMeta.onSuccess,
      onFailure: rollRequestMeta.onFailure,
    });

    if (outcomeText) {
      await tx
        .insert(campaignTurns)
        .values({
          sessionId,
          userId: runningGmId,
          characterId: null,
          type: "consequence",
          content: outcomeText,
          metadata: JSON.stringify({ rollRequestTurnId, rollTurnId, generated: true }),
          sortOrder: sql<number>`coalesce((select max(${campaignTurns.sortOrder}) from ${campaignTurns} where ${campaignTurns.sessionId} = ${sessionId}), -1) + 1`,
        });
    }
  }

  if (fatalFailure && characterId) {
    await tx
      .update(playerCharacters)
      .set({ status: "dead", updatedAt: new Date() })
      .where(eq(playerCharacters.id, characterId));
    await tx
      .update(sessionRoster)
      .set({ status: "spectating" })
      .where(
        and(
          eq(sessionRoster.sessionId, sessionId),
          eq(sessionRoster.characterId, characterId),
        ),
      );
  }
}
