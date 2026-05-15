import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { campaignRollResponses, campaignTurns, campaignSessions, playerCharacters, sessionRoster, users } from "@/server/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createCampaignTurnSchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { applyRateLimit } from "@/server/api-utils";
import { isGmOnlyTurnType, isPlayerStoryTurnType, parseRollMetadata, parseRollRequestMetadata } from "@/lib/campaign-turns";
import { canPostDirectStoryTurn } from "@/lib/campaign-interaction-state";
import { getActiveSessionPlayerIds } from "@/server/services/campaign-rolls";

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

    const rollMetadata = parsed.data.type === "roll"
      ? parseJsonObject(parsed.data.metadata)
      : null;
    const rollRequestTurnId = typeof rollMetadata?.rollRequestTurnId === "string"
      ? rollMetadata.rollRequestTurnId
      : null;
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
    }

    // Hand the spotlight back to the GM after an assigned player posts a
    // story turn. Without this, assigned-player turns get stuck on the player
    // because the client cannot reassign (the active-player endpoint is
    // GM-only). Skip when the GM themselves posted.
    const posterIsPlayer = session.user.id !== check.story!.userId;
    const playerCedesAssignedTurn = campaignSession.activePlayerId === session.user.id;
    let nextActivePlayerId: string | null = campaignSession.activePlayerId ?? null;
    const created = await db.transaction(async (tx) => {
      const [newTurn] = await tx
        .insert(campaignTurns)
        .values({
          sessionId,
          userId: session.user.id,
          characterId: parsed.data.characterId ?? null,
          type: parsed.data.type,
          content: parsed.data.content,
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
        const parsedRollMeta = parseRollMetadata(parsed.data.metadata);
        const tier = parsedRollMeta?.tier ?? "";
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
