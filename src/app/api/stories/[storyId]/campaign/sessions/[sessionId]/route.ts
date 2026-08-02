import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  campaignFloorRounds,
  campaignFloorSubmissions,
  campaignSessions,
  campaignTurns,
  campaignWagers,
  playerCharacters,
  follows,
} from "@/server/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { updateCampaignSessionSchema } from "@/lib/validations";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createBulkNotifications } from "@/server/services/notifications";
import { verifySessionGmAccess } from "@/server/services/collaboration";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

/**
 * PATCH /api/stories/[storyId]/campaign/sessions/[sessionId]
 * Update session (status, opening, title, etc.). GM only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const check = await verifySessionGmAccess(storyId, sessionId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can update sessions" } },
        { status: 403 }
      );
    }
    if (check.error) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to update session" } },
        { status: 500 }
      );
    }
    const { story, session: campaignSession } = check;

    const body = await request.json();
    const parsed = updateCampaignSessionSchema.safeParse(body);

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

    // Enforce valid state transitions
    if (parsed.data.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ["active"],
        active: ["completed"],
        completed: ["archived"],
        archived: [], // no transitions from archived
      };
      const currentStatus = campaignSession.status;
      const newStatus = parsed.data.status;
      if (currentStatus !== newStatus && !validTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: `Invalid status transition from "${currentStatus}" to "${newStatus}"` } },
          { status: 400 }
        );
      }

      // Pre-flight check for a nicer error message; the DB partial unique
      // index `campaign_sessions_one_active_per_story` is what actually
      // prevents the race — the previous read-only "transaction" did nothing
      // since both reads could happen before either write.
      if (newStatus === "active") {
        const existingActive = await db
          .select({ id: campaignSessions.id })
          .from(campaignSessions)
          .where(
            and(
              eq(campaignSessions.storyId, storyId),
              eq(campaignSessions.status, "active"),
              sql`${campaignSessions.id} != ${sessionId}`,
            ),
          )
          .limit(1);
        if (existingActive.length > 0) {
          return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "Another session is already active" } },
            { status: 400 }
          );
        }
      }
    }

    // wagerResults is a settle instruction, not a session column — it must
    // never reach the UPDATE ... SET spread below.
    const { wagerResults, ...sessionFields } = parsed.data;
    const updateData: Record<string, unknown> = { ...sessionFields, updatedAt: new Date() };
    // Clear active player when session ends
    if (parsed.data.status === "completed") {
      updateData.activePlayerId = null;
    }

    const wantsActivation = parsed.data.status === "active";
    // Use the explicitly-supplied opening if this PATCH is also editing it,
    // otherwise fall back to whatever the session already has on file.
    const finalOpening =
      typeof parsed.data.opening === "string"
        ? parsed.data.opening
        : campaignSession.opening;

    // The UPDATE may fail with a unique_violation if a concurrent request
    // raced past the pre-flight check and won. PG error code 23505.
    //
    // We insert the opening narration INSIDE the same transaction as the
    // status flip — and BEFORE the flip — so the moment a client sees
    // status === "active", the opening turn is already there. Otherwise a
    // fast player POST could land between the flip and the opening insert,
    // pushing the opening's sortOrder past the first player turn.
    //
    // Re-read the session row under FOR UPDATE so two concurrent
    // "start session" PATCHes can't both decide they're transitioning from
    // draft to active and both insert the opening. The second one will see
    // the locked status as already-active and skip the insert.
    let updated;
    let sessionJustBegan = false;
    try {
      updated = await db.transaction(async (tx) => {
        const [locked] = await tx
          .select({ status: campaignSessions.status })
          .from(campaignSessions)
          .where(eq(campaignSessions.id, sessionId))
          .for("update");
        const isFirstTransitionToActive =
          wantsActivation && locked?.status !== "active";
        sessionJustBegan = isFirstTransitionToActive;

        if (isFirstTransitionToActive && finalOpening?.trim()) {
          await tx
            .insert(campaignTurns)
            .values({
              sessionId,
              userId: session.user.id,
              characterId: null,
              type: "narration",
              content: finalOpening.trim(),
              metadata: JSON.stringify({ opening: true }),
              sortOrder: sql<number>`coalesce((select max(${campaignTurns.sortOrder}) from ${campaignTurns} where ${campaignTurns.sessionId} = ${sessionId}), -1) + 1`,
            });
        }

        // The lobby retires as the candle is lit. Lobby rounds (warm-up /
        // temperature) must end 'resolved' — never 'closed', which the
        // floor-round creation pre-check treats as still-live and would 409
        // the Director's first in-session move. A lifted warm-up answer
        // prints right after the opening, in the answerer's own ink; a
        // missing or ownerless lift skips the print but still resolves —
        // the ceremony never aborts over a lobby nicety.
        if (isFirstTransitionToActive) {
          const lobbyRounds = await tx
            .select({
              id: campaignFloorRounds.id,
              mode: campaignFloorRounds.mode,
              selectedSubmissionId: campaignFloorRounds.selectedSubmissionId,
              prompt: campaignFloorRounds.prompt,
            })
            .from(campaignFloorRounds)
            .where(
              and(
                eq(campaignFloorRounds.sessionId, sessionId),
                inArray(campaignFloorRounds.status, ["open", "voting"]),
                inArray(campaignFloorRounds.mode, ["warmup", "temperature"]),
              ),
            );
          for (const lobbyRound of lobbyRounds) {
            if (lobbyRound.mode === "warmup" && lobbyRound.selectedSubmissionId) {
              const [lifted] = await tx
                .select()
                .from(campaignFloorSubmissions)
                .where(eq(campaignFloorSubmissions.id, lobbyRound.selectedSubmissionId));
              if (lifted && lifted.userId) {
                await tx.insert(campaignTurns).values({
                  sessionId,
                  userId: lifted.userId,
                  characterId: lifted.characterId,
                  type: lifted.type,
                  content: lifted.content,
                  metadata: JSON.stringify({
                    kind: "warmup",
                    floorRoundId: lobbyRound.id,
                    floorSubmissionId: lifted.id,
                    prompt: lobbyRound.prompt,
                  }),
                  sortOrder: sql<number>`coalesce((select max(${campaignTurns.sortOrder}) from ${campaignTurns} where ${campaignTurns.sessionId} = ${sessionId}), -1) + 1`,
                });
                await tx
                  .update(campaignFloorSubmissions)
                  .set({ status: "selected" })
                  .where(eq(campaignFloorSubmissions.id, lifted.id));
              }
            }
          }
          if (lobbyRounds.length > 0) {
            await tx
              .update(campaignFloorRounds)
              .set({ status: "resolved", updatedAt: new Date() })
              .where(
                inArray(
                  campaignFloorRounds.id,
                  lobbyRounds.map((r) => r.id),
                ),
              );
          }
        }

        // Settle the audience's wagers on the active→completed transition:
        // slips the Director checked came true (stamped gold on the watch
        // page); every other still-open slip goes false. Glory, never gold —
        // nothing is paid out.
        if (parsed.data.status === "completed" && locked?.status === "active") {
          const trueIds = (wagerResults ?? [])
            .filter((w) => w.cameTrue)
            .map((w) => w.id);
          if (trueIds.length > 0) {
            await tx
              .update(campaignWagers)
              .set({ status: "true" })
              .where(
                and(
                  eq(campaignWagers.sessionId, sessionId),
                  eq(campaignWagers.status, "open"),
                  inArray(campaignWagers.id, trueIds),
                ),
              );
          }
          await tx
            .update(campaignWagers)
            .set({ status: "false" })
            .where(
              and(
                eq(campaignWagers.sessionId, sessionId),
                eq(campaignWagers.status, "open"),
              ),
            );
        }

        const [row] = await tx
          .update(campaignSessions)
          .set(updateData)
          .where(eq(campaignSessions.id, sessionId))
          .returning();
        return row;
      });
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === "23505") {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Another session is already active" } },
          { status: 400 }
        );
      }
      throw err;
    }

    // Notify players when session ends or begins. "has begun" only fires on
    // the first draft→active transition (an active→active PATCH would
    // otherwise re-notify the whole cast).
    const castUserIds = new Set<string>();
    if (parsed.data.status === "completed" || sessionJustBegan) {
      const players = await db.query.playerCharacters.findMany({
        where: eq(playerCharacters.storyId, storyId),
      });
      players.forEach((p) => castUserIds.add(p.userId));
      const playerUserIds = [...castUserIds].filter((id) => id !== session.user.id);
      if (playerUserIds.length > 0) {
        const action = parsed.data.status === "completed" ? "has ended" : "has begun";
        await createBulkNotifications(
          playerUserIds,
          "collaboration",
          `Session "${updated.title}" ${action} in ${story.title}`,
          `/campaign/${storyId}/play/${sessionId}`
        );
      }
    }

    // The table going live is the story's followers' moment to arrive — the
    // watch page is useless to them after the session ends. Cast and Director
    // are excluded (they get the player notice above). In-app only: a "was
    // live" email hours later is noise.
    if (sessionJustBegan && story.isPublic) {
      const followerRows = await db
        .select({ userId: follows.userId })
        .from(follows)
        .where(eq(follows.storyId, storyId));
      const followerIds = [...new Set(followerRows.map((r) => r.userId))].filter(
        (id) => id !== session.user.id && !castUserIds.has(id)
      );
      if (followerIds.length > 0) {
        await createBulkNotifications(
          followerIds,
          "live",
          `"${story.title}" is live — a session is being written right now`,
          `/campaign/${storyId}/watch/${sessionId}`
        );
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/stories/[storyId]/campaign/sessions/[sessionId]",
      "Failed to update session",
    );
  }
}
