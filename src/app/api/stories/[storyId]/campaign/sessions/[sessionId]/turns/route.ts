import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { campaignRollResponses, campaignTurns, campaignSessions, places, playerCharacters, sessionRoster, users } from "@/server/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createCampaignTurnSchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { applyRateLimit } from "@/server/api-utils";
import { isGmOnlyTurnType, isPlayerStoryTurnType, parseRollIntent, parseRollRequestMetadata, parseSceneBreakMetadata, parseStoryMomentMetadata } from "@/lib/campaign-turns";
import { canPostDirectStoryTurn } from "@/lib/campaign-interaction-state";
import { getActiveSessionPlayerIds } from "@/server/services/campaign-rolls";
import { APPROACHES, parseStats } from "@/types/campaign";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };
const DUPLICATE_ROLL_RESPONSE = "DUPLICATE_ROLL_RESPONSE";

function parseJsonObject(metadata: string | null | undefined): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/turns
 * List turns for a session. Supports ?after=<turnId> for polling.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId, sessionId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    // Verify session belongs to this story
    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    const afterSort = request.nextUrl.searchParams.get("afterSort");
    const afterSortNum = afterSort ? parseInt(afterSort, 10) : null;

    if (afterSort !== null && (afterSortNum === null || isNaN(afterSortNum))) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid afterSort parameter" } },
        { status: 400 }
      );
    }

    const turns = await db
      .select({
        id: campaignTurns.id,
        sessionId: campaignTurns.sessionId,
        userId: campaignTurns.userId,
        characterId: campaignTurns.characterId,
        type: campaignTurns.type,
        content: campaignTurns.content,
        metadata: campaignTurns.metadata,
        sortOrder: campaignTurns.sortOrder,
        createdAt: campaignTurns.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        characterName: playerCharacters.name,
        characterPortrait: playerCharacters.portrait,
      })
      .from(campaignTurns)
      .leftJoin(users, eq(campaignTurns.userId, users.id))
      .leftJoin(playerCharacters, eq(campaignTurns.characterId, playerCharacters.id))
      .where(
        afterSortNum !== null
          ? sql`${campaignTurns.sessionId} = ${sessionId} AND ${campaignTurns.sortOrder} > ${afterSortNum}`
          : eq(campaignTurns.sessionId, sessionId)
      )
      .orderBy(asc(campaignTurns.sortOrder));

    return NextResponse.json({ data: turns, session: campaignSession });
  } catch (error) {
    console.error("GET /api/.../turns error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch turns" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/sessions/[sessionId]/turns
 * Create a new turn in a session.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, sessionId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    // Verify session
    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    if (campaignSession.status !== "active") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Session is not active" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createCampaignTurnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    // Only GM (story owner) can post narration and consequence
    const isStoryOwner = check.story?.userId === session.user.id;
    if (isGmOnlyTurnType(parsed.data.type) && !isStoryOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can narrate" } },
        { status: 403 }
      );
    }

    const turnMetadata = parseJsonObject(parsed.data.metadata);
    const isLastWords = parsed.data.type === "description" && turnMetadata?.lastWords === true;

    // Enforce turn order: players can only post direct-to-canon story turns
    // when assigned the spotlight. Multi-player proposals go through Crossroads
    // floor rounds instead of writing directly while activePlayerId is null.
    // GM narration/consequence bypass turn order (GM can always interject).
    // OOC and rolls are always allowed regardless of turn.
    const isPlayerStoryTurn = isPlayerStoryTurnType(parsed.data.type);
    if (isPlayerStoryTurn) {
      const permission = canPostDirectStoryTurn({
        isGM: isStoryOwner,
        activePlayerId: campaignSession.activePlayerId,
        currentUserId: session.user.id,
        isLastWords,
      });
      if (!permission.allowed) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: permission.message } },
          { status: 403 }
        );
      }
    }

    // Validate character ownership if characterId provided
    let turnCharacter: typeof playerCharacters.$inferSelect | null = null;
    if (parsed.data.characterId) {
      const char = await db.query.playerCharacters.findFirst({
        where: and(
          eq(playerCharacters.id, parsed.data.characterId),
          eq(playerCharacters.storyId, storyId),
          eq(playerCharacters.userId, session.user.id),
        ),
      });
      if (!char) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Character not found or not yours" } },
          { status: 403 }
        );
      }
      turnCharacter = char;
    }

    if (isPlayerStoryTurn) {
      if (!turnCharacter) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Player story turns require one of your characters" } },
          { status: 403 }
        );
      }

      const characterCanSpeak = turnCharacter.status === "active" || (
        isLastWords && (turnCharacter.status === "dead" || turnCharacter.status === "retired")
      );

      if (!characterCanSpeak) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "This character is not active" } },
          { status: 403 }
        );
      }
    }

    let metadataToStore = parsed.data.metadata ?? null;

    if (parsed.data.type === "roll-request") {
      const rollRequestMeta = parseRollRequestMetadata(metadataToStore);
      if (!rollRequestMeta) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Roll request metadata is invalid" } },
          { status: 400 },
        );
      }

      const activePlayerIds = await getActiveSessionPlayerIds(sessionId, storyId);
      const requiredUserIds = rollRequestMeta.targetUserId === "everyone"
        ? activePlayerIds
        : activePlayerIds.includes(rollRequestMeta.targetUserId)
          ? [rollRequestMeta.targetUserId]
          : [];

      if (requiredUserIds.length === 0) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Roll target must be an active session player" } },
          { status: 400 },
        );
      }

      metadataToStore = JSON.stringify({
        ...rollRequestMeta,
        status: "open",
        requiredUserIds,
      });
    }

    if (parsed.data.type === "story-moment") {
      const storyMomentMeta = parseStoryMomentMetadata(metadataToStore ?? "{}");
      if (!storyMomentMeta) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Story moment metadata is invalid" } },
          { status: 400 },
        );
      }

      const content = parsed.data.content.trim();
      if (!content) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Story moment text is required" } },
          { status: 400 },
        );
      }

      metadataToStore = JSON.stringify({
        mood: storyMomentMeta.mood ?? "ominous",
        ...(storyMomentMeta.subtext ? { subtext: storyMomentMeta.subtext } : {}),
        importance: storyMomentMeta.importance ?? "normal",
        ...(storyMomentMeta.startsScene ? { startsScene: true } : {}),
      });
    }

    // Auto-link scene-breaks to a place. If the GM supplies a locationId we
    // trust it (after verifying it belongs to this story); otherwise we
    // upsert a place keyed off the scene-break's title so the Places list
    // populates without any GM busywork. The unique index on (storyId,
    // nameKey) makes "different scenes with the same title" idempotent.
    if (parsed.data.type === "scene-break") {
      const sceneMeta = parseSceneBreakMetadata(metadataToStore) ?? {};
      let resolvedLocationId: string | null = sceneMeta.locationId ?? null;

      if (sceneMeta.cinematic) {
        metadataToStore = JSON.stringify(sceneMeta);
      } else {
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
          metadataToStore = JSON.stringify({
            ...sceneMeta,
            locationId: resolvedLocationId,
          });
        }
      }
    }

    // For a roll turn, we trust only the client's *intent* (which attribute
    // they picked, whether they invoked their aspect, which roll-request they
    // are responding to). Dice, total, tier, and content are recomputed below
    // server-side with crypto-grade RNG; anything the client put in metadata
    // for those fields is overwritten before persistence.
    const rollIntent = parsed.data.type === "roll"
      ? parseRollIntent(parsed.data.metadata)
      : null;
    const rollRequestTurnId = rollIntent?.rollRequestTurnId ?? null;
    let rollRequestMeta: ReturnType<typeof parseRollRequestMetadata> = null;
    let rollRequestTurn: typeof campaignTurns.$inferSelect | null = null;

    if (parsed.data.type === "roll" && rollRequestTurnId) {
      rollRequestTurn = await db.query.campaignTurns.findFirst({
        where: and(
          eq(campaignTurns.id, rollRequestTurnId),
          eq(campaignTurns.sessionId, sessionId),
          eq(campaignTurns.type, "roll-request"),
        ),
      }) ?? null;

      if (!rollRequestTurn) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Roll request not found" } },
          { status: 400 }
        );
      }

      rollRequestMeta = parseRollRequestMetadata(rollRequestTurn.metadata);
      if (!rollRequestMeta) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Roll request metadata is invalid" } },
          { status: 400 }
        );
      }

      if ((rollRequestMeta.status ?? "open") !== "open") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "This roll request is closed" } },
          { status: 403 }
        );
      }

      const activePlayerIds = await getActiveSessionPlayerIds(sessionId, storyId);
      const requiredUserIds = rollRequestMeta.requiredUserIds?.length
        ? rollRequestMeta.requiredUserIds
        : rollRequestMeta.targetUserId === "everyone"
          ? activePlayerIds
          : activePlayerIds.includes(rollRequestMeta.targetUserId) ? [rollRequestMeta.targetUserId] : [];

      if (!requiredUserIds.includes(session.user.id)) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "This roll request is not for you" } },
          { status: 403 }
        );
      }

      const existingResponse = await db.query.campaignRollResponses.findFirst({
        where: and(
          eq(campaignRollResponses.rollRequestTurnId, rollRequestTurn.id),
          eq(campaignRollResponses.userId, session.user.id),
        ),
      });

      if (existingResponse) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "You already answered this roll request" } },
          { status: 409 }
        );
      }

      // A roll response must name the character that's actually rolling.
      // Without this, a player could omit characterId, pocket the
      // server-generated consequence, and skip the fatal-death status flip
      // (which is gated on parsed.data.characterId further down).
      if (!turnCharacter) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Choose the character making this roll" } },
          { status: 400 }
        );
      }
      if (turnCharacter.status !== "active") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "This character is not active" } },
          { status: 403 }
        );
      }
    }

    // ── Server-authoritative roll resolution ─────────────────────────────
    // Client posts intent (attribute + aspect-invoked flag). Server rolls
    // 2d6 with crypto, computes modifier from the character's actual stats,
    // and rebuilds content/metadata. This is the only way to prevent a
    // player from forging a favorable tier or dodging a fatal failure.
    let contentToStore: string = parsed.data.type === "story-moment"
      ? parsed.data.content.trim()
      : parsed.data.content;
    let serverRollTier: "success" | "partial" | "failure" | null = null;

    if (parsed.data.type === "roll" && rollIntent) {
      const rawAttribute = rollIntent.attribute ?? "";
      const matchedApproach = APPROACHES.find(
        (a) => a.toLowerCase() === rawAttribute.toLowerCase(),
      );
      const stats = turnCharacter ? parseStats(turnCharacter.stats) : null;
      const approaches = stats?.approaches ?? { Bold: 0, Keen: 0, Subtle: 0 };
      const aspect = stats?.aspect ?? "";
      const approachMod = matchedApproach ? approaches[matchedApproach] ?? 0 : 0;
      const aspectMod = rollIntent.aspectInvoked && aspect ? 1 : 0;
      const modifier = approachMod + aspectMod;

      const r1 = randomInt(1, 7);
      const r2 = randomInt(1, 7);
      const total = r1 + r2 + modifier;
      const tier: "success" | "partial" | "failure" =
        total >= 10 ? "success" : total >= 7 ? "partial" : "failure";
      serverRollTier = tier;

      const tierLabel =
        tier === "success" ? "Full Success" : tier === "partial" ? "Partial Success" : "Failure";
      const attrLabel = matchedApproach ?? "";
      contentToStore = modifier !== 0
        ? `Rolled 2d6${modifier >= 0 ? "+" : ""}${modifier}${attrLabel ? ` (${attrLabel.toUpperCase()})` : ""} = ${total} — ${tierLabel}`
        : `Rolled 2d6 = ${total} — ${tierLabel}`;

      // markEligible: the resolved roll is worth marking if it cost the
      // character something — partial or worse, OR a fatal-flagged roll
      // (even on success, "I survived this" is worth marking).
      const fatal = rollRequestMeta?.fatal === true && tier === "failure";
      const markEligible = fatal || tier !== "success" || rollRequestMeta?.fatal === true;

      metadataToStore = JSON.stringify({
        dice: [r1, r2],
        total,
        modifier,
        attribute: matchedApproach ?? rawAttribute,
        tier,
        die: "2d6",
        fatal,
        markEligible,
        ...(rollRequestTurnId ? { rollRequestTurnId } : {}),
      });
    }

    // Hand the spotlight back to the GM after an assigned player posts a
    // story turn. Without this, assigned-player turns get stuck on the player
    // because the client cannot reassign (the active-player endpoint is
    // GM-only). Skip when the GM themselves posted.
    const posterIsPlayer = session.user.id !== check.story!.userId;
    let nextActivePlayerId: string | null = campaignSession.activePlayerId ?? null;
    const created = await db.transaction(async (tx) => {
      // Lock the session row for the duration of the insert. Two purposes:
      //   1. Serializes the `max(sortOrder) + 1` calculation so concurrent
      //      turn POSTs for the same session can't pick the same sortOrder.
      //   2. Lets us read the *current* activePlayerId under the lock, so
      //      we don't yank the spotlight away from a player the GM just
      //      assigned while we were processing this request.
      const [locked] = await tx
        .select({ activePlayerId: campaignSessions.activePlayerId })
        .from(campaignSessions)
        .where(eq(campaignSessions.id, sessionId))
        .for("update");
      const currentActivePlayerId = locked?.activePlayerId ?? null;
      const playerCedesAssignedTurn = currentActivePlayerId === session.user.id;

      const [newTurn] = await tx
        .insert(campaignTurns)
        .values({
          sessionId,
          userId: session.user.id,
          characterId: parsed.data.characterId ?? null,
          type: parsed.data.type,
          content: contentToStore,
          metadata: metadataToStore,
          sortOrder: sql<number>`coalesce((select max(${campaignTurns.sortOrder}) from ${campaignTurns} where ${campaignTurns.sessionId} = ${sessionId}), -1) + 1`,
        })
        .returning();

      if (posterIsPlayer && playerCedesAssignedTurn && isPlayerStoryTurnType(parsed.data.type)) {
        nextActivePlayerId = check.story!.userId;
        await tx
          .update(campaignSessions)
          .set({ activePlayerId: nextActivePlayerId })
          .where(eq(campaignSessions.id, sessionId));
      } else {
        nextActivePlayerId = currentActivePlayerId;
      }

      if (parsed.data.type === "roll" && rollRequestMeta && rollRequestTurn) {
        const [rollResponse] = await tx
          .insert(campaignRollResponses)
          .values({
            sessionId,
            rollRequestTurnId: rollRequestTurn.id,
            rollTurnId: newTurn.id,
            userId: session.user.id,
          })
          .onConflictDoNothing()
          .returning({ id: campaignRollResponses.id });

        if (!rollResponse) {
          throw new Error(DUPLICATE_ROLL_RESPONSE);
        }
      }

      if (parsed.data.type === "roll" && rollRequestMeta && rollRequestTurn) {
        const tier = serverRollTier ?? "";
        const fatalFailure = rollRequestMeta.fatal === true && tier === "failure";

        if (rollRequestMeta.targetUserId !== "everyone") {
          const genericOutcomes: Record<string, string> = {
            success: rollRequestMeta.fatal ? "Against all odds, fate is kind. They survive." : "The attempt succeeds.",
            partial: rollRequestMeta.fatal ? "They cling to life - but barely. The cost is terrible." : "A partial success - but not without cost.",
            failure: rollRequestMeta.fatal ? "The dice have spoken. There is no escape from this fate." : "The attempt fails.",
          };
          const outcomeText = tier === "failure"
            ? (rollRequestMeta.onFailure || genericOutcomes.failure)
            : tier === "success"
              ? (rollRequestMeta.onSuccess || genericOutcomes.success)
              : rollRequestMeta.onSuccess && rollRequestMeta.onFailure
                ? `${rollRequestMeta.onSuccess} - but ${rollRequestMeta.onFailure.charAt(0).toLowerCase()}${rollRequestMeta.onFailure.slice(1)}`
                : genericOutcomes.partial;

          if (outcomeText) {
            await tx
              .insert(campaignTurns)
              .values({
                sessionId,
                userId: check.story!.userId,
                characterId: null,
                type: "consequence",
                content: outcomeText,
                metadata: JSON.stringify({ rollRequestTurnId: rollRequestTurn.id, rollTurnId: newTurn.id, generated: true }),
                sortOrder: sql<number>`coalesce((select max(${campaignTurns.sortOrder}) from ${campaignTurns} where ${campaignTurns.sessionId} = ${sessionId}), -1) + 1`,
              });
          }
        }

        if (fatalFailure && parsed.data.characterId) {
          await tx
            .update(playerCharacters)
            .set({ status: "dead", updatedAt: new Date() })
            .where(eq(playerCharacters.id, parsed.data.characterId));
          await tx
            .update(sessionRoster)
            .set({ status: "spectating" })
            .where(
              and(
                eq(sessionRoster.sessionId, sessionId),
                eq(sessionRoster.characterId, parsed.data.characterId),
              ),
            );
        }
      }

      return newTurn;
    });

    // Re-fetch with user/character joins so the client gets a complete Turn object
    const [enriched] = await db
      .select({
        id: campaignTurns.id,
        sessionId: campaignTurns.sessionId,
        userId: campaignTurns.userId,
        characterId: campaignTurns.characterId,
        type: campaignTurns.type,
        content: campaignTurns.content,
        metadata: campaignTurns.metadata,
        sortOrder: campaignTurns.sortOrder,
        createdAt: campaignTurns.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        characterName: playerCharacters.name,
        characterPortrait: playerCharacters.portrait,
      })
      .from(campaignTurns)
      .leftJoin(users, eq(campaignTurns.userId, users.id))
      .leftJoin(playerCharacters, eq(campaignTurns.characterId, playerCharacters.id))
      .where(eq(campaignTurns.id, created.id));

    // Surface the (possibly updated) activePlayerId so the client can reflect
    // the auto-handover immediately, without waiting for the next poll.
    return NextResponse.json(
      { data: enriched ?? created, meta: { activePlayerId: nextActivePlayerId } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === DUPLICATE_ROLL_RESPONSE) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "You already answered this roll request" } },
        { status: 409 },
      );
    }
    console.error("POST /api/.../turns error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create turn" } },
      { status: 500 }
    );
  }
}
