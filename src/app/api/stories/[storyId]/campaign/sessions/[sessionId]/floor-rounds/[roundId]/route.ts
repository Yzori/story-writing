import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  campaignFloorRounds,
  campaignFloorSubmissions,
  campaignSessions,
  campaignTurns,
  playerCharacters,
  users,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { updateFloorRoundSchema } from "@/lib/validations";
import { isSessionGm, verifyCollaboratorAccess } from "@/server/services/collaboration";
import { getVisibleFloorRound } from "@/server/services/floor-rounds";
import { getPendingRollRequests } from "@/server/services/campaign-rolls";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string; roundId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, sessionId, roundId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Story not found" } }, { status: 404 });
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the GM can manage floor rounds" } }, { status: 403 });
    }

    const [campaignSession, round] = await Promise.all([
      db.query.campaignSessions.findFirst({ where: eq(campaignSessions.id, sessionId) }),
      db.query.campaignFloorRounds.findFirst({ where: eq(campaignFloorRounds.id, roundId) }),
    ]);
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }
    if (!check.story || !isSessionGm(check.story, campaignSession, session.user.id)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the GM can manage floor rounds" } }, { status: 403 });
    }
    if (!round || round.sessionId !== sessionId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Floor round not found" } }, { status: 404 });
    }
    if (round.status !== "open" && round.status !== "voting" && round.status !== "closed") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "This floor round is already closed" } }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateFloorRoundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    if (parsed.data.status === "voting") {
      if (round.mode !== "vote") {
        return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Only vote rounds can be revealed for voting" } }, { status: 400 });
      }
      if (round.status !== "open") {
        return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Voting can only be opened from the collection phase" } }, { status: 400 });
      }
      await db
        .update(campaignFloorRounds)
        .set({ status: "voting", updatedAt: new Date() })
        .where(eq(campaignFloorRounds.id, roundId));
    }

    if (parsed.data.status === "closed") {
      if (round.mode !== "vote") {
        return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Only vote rounds can be closed for selection" } }, { status: 400 });
      }
      if (round.status !== "voting") {
        return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Voting is not open" } }, { status: 400 });
      }
      await db
        .update(campaignFloorRounds)
        .set({ status: "closed", updatedAt: new Date() })
        .where(eq(campaignFloorRounds.id, roundId));
    }

    if (parsed.data.status === "cancelled") {
      await db
        .update(campaignFloorRounds)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(campaignFloorRounds.id, roundId));
      return NextResponse.json({ data: null });
    }

    if (parsed.data.status === "resolved") {
      if (!parsed.data.selectedSubmissionId) {
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Choose a submission to canonize" } }, { status: 400 });
      }
      // v2 single-block vote: the table writes and votes in one open phase,
      // so a vote round canonizes straight from "open" (or "voting"); the
      // legacy reveal→close→canonize pipeline is still honored via "closed".
      if (round.mode === "vote" && !["open", "voting", "closed"].includes(round.status)) {
        return NextResponse.json({ error: { code: "BAD_REQUEST", message: "This round is not ready to canonize" } }, { status: 400 });
      }
      if (round.mode !== "vote" && round.status !== "open") {
        return NextResponse.json({ error: { code: "BAD_REQUEST", message: "This round is not ready to canonize" } }, { status: 400 });
      }

      const submission = await db.query.campaignFloorSubmissions.findFirst({
        where: and(
          eq(campaignFloorSubmissions.id, parsed.data.selectedSubmissionId),
          eq(campaignFloorSubmissions.roundId, roundId),
        ),
      });
      if (!submission) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "Submission not found" } }, { status: 404 });
      }

      let pendingRollsBlocking: Awaited<ReturnType<typeof getPendingRollRequests>> = [];
      const canonizedTurn = await db.transaction(async (tx) => {
        // Lock the session row so concurrent turn inserts serialize (the
        // sortOrder calculation below uses max+1 and would collide otherwise),
        // and so we can re-check pending rolls under the lock — a roll-request
        // created between the API pre-check and this transaction would
        // otherwise slip past.
        await tx
          .select({ id: campaignSessions.id })
          .from(campaignSessions)
          .where(eq(campaignSessions.id, sessionId))
          .for("update");

        const pendingRolls = await getPendingRollRequests(sessionId, storyId);
        if (pendingRolls.length > 0) {
          pendingRollsBlocking = pendingRolls;
          return null;
        }

        const [closedRound] = await tx
          .update(campaignFloorRounds)
          .set({
            status: "resolved",
            selectedSubmissionId: submission.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(campaignFloorRounds.id, roundId),
              inArray(campaignFloorRounds.status, round.mode === "vote" ? ["open", "voting", "closed"] : ["open"]),
            ),
          )
          .returning({ id: campaignFloorRounds.id });

        if (!closedRound) return null;

        const [createdTurn] = await tx
          .insert(campaignTurns)
          .values({
            sessionId,
            userId: submission.userId ?? round.openedBy,
            characterId: submission.characterId,
            type: submission.userId ? submission.type : "narration",
            content: submission.content,
            metadata: JSON.stringify({ floorRoundId: roundId, floorSubmissionId: submission.id }),
            sortOrder: sql<number>`coalesce((select max(${campaignTurns.sortOrder}) from ${campaignTurns} where ${campaignTurns.sessionId} = ${sessionId}), -1) + 1`,
          })
          .returning();

        await tx
          .update(campaignFloorSubmissions)
          .set({ status: "rejected" })
          .where(eq(campaignFloorSubmissions.roundId, roundId));
        await tx
          .update(campaignFloorSubmissions)
          .set({ status: "selected" })
          .where(eq(campaignFloorSubmissions.id, submission.id));

        const [enrichedTurn] = await tx
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
          .where(eq(campaignTurns.id, createdTurn.id));

        return enrichedTurn ?? createdTurn;
      });

      if (!canonizedTurn) {
        if (pendingRollsBlocking.length > 0) {
          return NextResponse.json(
            {
              error: {
                code: "PENDING_ROLLS",
                message: "Resolve pending rolls before canonizing Crossroads",
                details: pendingRollsBlocking,
              },
            },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "This floor round was already closed" } },
          { status: 409 },
        );
      }

      return NextResponse.json({ data: null, turn: canonizedTurn });
    }

    return NextResponse.json({
      data: await getVisibleFloorRound(sessionId, session.user.id),
    });
  } catch (error) {
    console.error("PATCH /api/.../floor-rounds/[roundId] error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update floor round" } }, { status: 500 });
  }
}
