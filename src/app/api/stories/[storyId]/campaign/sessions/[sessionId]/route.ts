import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { campaignSessions, campaignTurns, stories, playerCharacters } from "@/server/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { updateCampaignSessionSchema } from "@/lib/validations";
import { applyRateLimit } from "@/server/api-utils";
import { createBulkNotifications } from "@/server/services/notifications";

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

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can update sessions" } },
        { status: 403 }
      );
    }

    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

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

    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
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
    try {
      updated = await db.transaction(async (tx) => {
        const [locked] = await tx
          .select({ status: campaignSessions.status })
          .from(campaignSessions)
          .where(eq(campaignSessions.id, sessionId))
          .for("update");
        const isFirstTransitionToActive =
          wantsActivation && locked?.status !== "active";

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

    // Notify players when session ends or begins
    if (parsed.data.status === "completed" || parsed.data.status === "active") {
      const players = await db.query.playerCharacters.findMany({
        where: eq(playerCharacters.storyId, storyId),
      });
      const playerUserIds = [...new Set(
        players.map((p) => p.userId).filter((id) => id !== session.user.id)
      )];
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

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/.../sessions/[sessionId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update session" } },
      { status: 500 }
    );
  }
}
