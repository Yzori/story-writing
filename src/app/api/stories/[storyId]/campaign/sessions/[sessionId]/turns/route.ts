import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { campaignRollResponses, campaignTurns, campaignSessions, characterMarks, playerCharacters, users } from "@/server/db/schema";
import { eq, and, asc, desc, gt, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createCampaignTurnSchema } from "@/lib/validations";
import { verifyCollaboratorAccess, resolveSessionGmId, isSessionGm } from "@/server/services/collaboration";
import { applyRateLimit } from "@/server/api-utils";
import { isGmOnlyTurnType, isPlayerStoryTurnType, parseRollIntent, parseRollMetadata, parseRollRequestMetadata, parseStoryMomentMetadata } from "@/lib/campaign-turns";
import { canPostDirectStoryTurn } from "@/lib/campaign-interaction-state";
import { getActiveSessionPlayerIds, resolveRoll, rollTierFor } from "@/server/services/campaign-rolls";
import {
  applyRollRequestResolution,
  normalizeStoryMomentMetadata,
  resolveRollRequestTargets,
  resolveSceneBreakMetadata,
} from "@/server/services/campaign-turn-write";
import { parseStats } from "@/types/campaign";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };
const DUPLICATE_ROLL_RESPONSE = "DUPLICATE_ROLL_RESPONSE";
const TURN_ORDER_CONFLICT = "TURN_ORDER_CONFLICT";

/**
 * Whether the character may still spend a save this scene (turn a miss into a
 * foothold). A scene starts at session open and resets at each scene-break.
 * Base allowance is one save (the aspect); each active **vow** the character
 * carries grants one more — promises give grit (D1 / audit P1 #10).
 */
async function aspectSaveAvailable(
  sessionId: string,
  userId: string,
  characterId: string | null,
): Promise<boolean> {
  const [lastSceneBreak] = await db
    .select({ sortOrder: campaignTurns.sortOrder })
    .from(campaignTurns)
    .where(and(eq(campaignTurns.sessionId, sessionId), eq(campaignTurns.type, "scene-break")))
    .orderBy(desc(campaignTurns.sortOrder))
    .limit(1);
  const sceneStart = lastSceneBreak?.sortOrder ?? -1;

  const priorRolls = await db
    .select({ metadata: campaignTurns.metadata })
    .from(campaignTurns)
    .where(
      and(
        eq(campaignTurns.sessionId, sessionId),
        eq(campaignTurns.type, "roll"),
        eq(campaignTurns.userId, userId),
        gt(campaignTurns.sortOrder, sceneStart),
      ),
    );
  const used = priorRolls.filter((t) => parseRollMetadata(t.metadata)?.aspectSaved === true).length;

  let allowed = 1;
  if (characterId) {
    const vows = await db
      .select({ id: characterMarks.id })
      .from(characterMarks)
      .where(and(eq(characterMarks.characterId, characterId), eq(characterMarks.kind, "vow")));
    allowed += vows.length;
  }

  return used < allowed;
}

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
  // Hoisted above the try so the TURN_ORDER_CONFLICT catch can read the
  // message captured inside the transaction.
  let turnOrderConflictMessage = "It is not your turn";
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

    // Auto-reclaim (D2): if the true owner returns and acts while a substitute
    // is running, they take the chair back. Mutate the in-memory row so the
    // running-GM checks below see the owner as the GM again.
    if (
      session.user.id === check.story!.userId &&
      (campaignSession.actingGmId || campaignSession.takeoverProposerId)
    ) {
      await db
        .update(campaignSessions)
        .set({ actingGmId: null, takeoverProposerId: null, updatedAt: new Date() })
        .where(eq(campaignSessions.id, sessionId));
      campaignSession.actingGmId = null;
      campaignSession.takeoverProposerId = null;
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
    // The "GM" for this session is the acting GM if one is set, else the owner.
    // Session-running powers (narration, spotlight, handover) follow this.
    const isRunningGm = isSessionGm(check.story!, campaignSession, session.user.id);
    if (isGmOnlyTurnType(parsed.data.type) && !isRunningGm) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can narrate" } },
        { status: 403 }
      );
    }

    // Validate character ownership if characterId provided. This runs before
    // the turn-order check because isLastWords below must be derived from the
    // character's *actual* status, not from client-supplied metadata alone.
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

    // Last words only count when the resolved character is genuinely dead or
    // retired. The lastWords flag itself is client-controlled metadata, so an
    // active character must never be able to use it to skip the spotlight check.
    const turnMetadata = parseJsonObject(parsed.data.metadata);
    const isLastWords =
      parsed.data.type === "description" &&
      turnMetadata?.lastWords === true &&
      turnCharacter !== null &&
      (turnCharacter.status === "dead" || turnCharacter.status === "retired");

    // Enforce turn order: players can only post direct-to-canon story turns
    // when assigned the spotlight. Multi-player proposals go through Crossroads
    // floor rounds instead of writing directly while activePlayerId is null.
    // GM narration/consequence bypass turn order (GM can always interject).
    // OOC and rolls are always allowed regardless of turn.
    const isPlayerStoryTurn = isPlayerStoryTurnType(parsed.data.type);
    if (isPlayerStoryTurn) {
      const permission = canPostDirectStoryTurn({
        isGM: isRunningGm,
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

    if (isPlayerStoryTurn) {
      if (!turnCharacter) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Player story turns require one of your characters" } },
          { status: 403 }
        );
      }

      const characterCanSpeak = turnCharacter.status === "active" || isLastWords;

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
      const requiredUserIds = resolveRollRequestTargets(rollRequestMeta, activePlayerIds);

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

      metadataToStore = normalizeStoryMomentMetadata(storyMomentMeta);
    }

    // Auto-link scene-breaks to a place. If the GM supplies a locationId we
    // trust it (after verifying it belongs to this story); otherwise we
    // upsert a place keyed off the scene-break's title so the Places list
    // populates without any GM busywork. The unique index on (storyId,
    // nameKey) makes "different scenes with the same title" idempotent.
    if (parsed.data.type === "scene-break") {
      metadataToStore = await resolveSceneBreakMetadata(storyId, metadataToStore);
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
    // Client posts intent (whether the aspect is invoked). Server rolls a
    // flat 2d6 with crypto — the odds are a shared dramatic device, identical
    // for every character (no numeric modifiers; see audit D1). The one lever
    // is the aspect: a once-per-scene trump that turns a miss into a foothold.
    // Rebuilding content/tier here is the only way to stop a player forging a
    // favorable tier or dodging a fatal failure.
    let contentToStore: string = parsed.data.type === "story-moment"
      ? parsed.data.content.trim()
      : parsed.data.content;
    let serverRollTier: "success" | "partial" | "failure" | null = null;

    if (parsed.data.type === "roll" && rollIntent) {
      const stats = turnCharacter ? parseStats(turnCharacter.stats) : null;
      const aspect = stats?.aspect ?? "";

      const r1 = randomInt(1, 7);
      const r2 = randomInt(1, 7);
      // Only hit the DB for scene-availability when an aspect save could even
      // apply (invoked + has an aspect + the raw roll actually missed).
      const couldSave =
        !!rollIntent.aspectInvoked && !!aspect && rollTierFor(r1 + r2) === "failure";
      const aspectAvailable = couldSave
        ? await aspectSaveAvailable(sessionId, session.user.id, turnCharacter?.id ?? null)
        : false;

      const roll = resolveRoll({
        d1: r1,
        d2: r2,
        aspect,
        aspectInvoked: !!rollIntent.aspectInvoked,
        aspectAvailable,
        fatalRequested: rollRequestMeta?.fatal === true,
        characterName: turnCharacter?.name ?? null,
      });
      serverRollTier = roll.tier;
      contentToStore = roll.content;

      metadataToStore = JSON.stringify({
        dice: roll.dice,
        total: roll.total,
        modifier: 0,
        tier: roll.tier,
        die: "2d6",
        fatal: roll.fatal,
        markEligible: roll.markEligible,
        ...(roll.aspectSaved ? { aspectSaved: true } : {}),
        ...(rollRequestTurnId ? { rollRequestTurnId } : {}),
      });
    }

    // Hand the spotlight back to the running GM after an assigned player posts a
    // story turn. Without this, assigned-player turns get stuck on the player
    // because the client cannot reassign (the active-player endpoint is
    // GM-only). The running GM may be an acting GM, not the owner — return the
    // spotlight to whoever is actually running tonight. Skip when the GM posted.
    const runningGmId = resolveSessionGmId(check.story!, campaignSession);
    const posterIsPlayer = !isRunningGm;
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

      // Re-validate turn order against the activePlayerId read under the
      // lock. The pre-transaction check used a stale snapshot, so a
      // double-submit (or a GM reassignment mid-request) could otherwise
      // land a second canon turn on a spotlight grant that has already moved.
      if (isPlayerStoryTurn) {
        const lockedPermission = canPostDirectStoryTurn({
          isGM: isRunningGm,
          activePlayerId: currentActivePlayerId,
          currentUserId: session.user.id,
          isLastWords,
        });
        if (!lockedPermission.allowed) {
          turnOrderConflictMessage = lockedPermission.message;
          throw new Error(TURN_ORDER_CONFLICT);
        }
      }

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
        nextActivePlayerId = runningGmId;
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
        await applyRollRequestResolution(tx, {
          sessionId,
          runningGmId,
          serverRollTier,
          rollRequestMeta,
          rollRequestTurnId: rollRequestTurn.id,
          rollTurnId: newTurn.id,
          characterId: parsed.data.characterId ?? null,
        });
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
    if (error instanceof Error && error.message === TURN_ORDER_CONFLICT) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: turnOrderConflictMessage } },
        { status: 403 },
      );
    }
    console.error("POST /api/.../turns error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create turn" } },
      { status: 500 }
    );
  }
}
