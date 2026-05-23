import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  campaignFloorAudienceSparks,
  campaignFloorRounds,
  campaignFloorSubmissions,
  campaignSessions,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { updateFloorAudienceSparkSchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { getVisibleFloorRound } from "@/server/services/floor-rounds";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string; roundId: string; sparkId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, sessionId, roundId, sparkId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Story not found" } }, { status: 404 });
    }
    if (check.error === "FORBIDDEN" || check.story?.userId !== session.user.id) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the Director can manage Audience Sparks" } }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateFloorAudienceSparkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    const [campaignSession, round, spark] = await Promise.all([
      db.query.campaignSessions.findFirst({ where: eq(campaignSessions.id, sessionId) }),
      db.query.campaignFloorRounds.findFirst({ where: eq(campaignFloorRounds.id, roundId) }),
      db.query.campaignFloorAudienceSparks.findFirst({ where: eq(campaignFloorAudienceSparks.id, sparkId) }),
    ]);

    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }
    if (!round || round.sessionId !== sessionId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Floor round not found" } }, { status: 404 });
    }
    if (round.status !== "open" || round.mode !== "vote") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Audience Sparks can only be promoted while collecting vote options" } }, { status: 403 });
    }
    if (!spark || spark.roundId !== roundId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Audience Spark not found" } }, { status: 404 });
    }
    if (spark.status !== "pending") {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Audience Spark was already handled" } }, { status: 400 });
    }

    if (parsed.data.action === "reject") {
      await db
        .update(campaignFloorAudienceSparks)
        .set({ status: "rejected" })
        .where(eq(campaignFloorAudienceSparks.id, sparkId));
    } else {
      await db.transaction(async (tx) => {
        const [submission] = await tx
          .insert(campaignFloorSubmissions)
          .values({
            roundId,
            userId: null,
            characterId: null,
            type: "narration",
            content: spark.content,
            source: "audience_spark",
            sourceLabel: "Audience Spark",
            audienceSparkId: spark.id,
          })
          .returning({ id: campaignFloorSubmissions.id });

        await tx
          .update(campaignFloorAudienceSparks)
          .set({ status: "promoted", promotedSubmissionId: submission.id })
          .where(eq(campaignFloorAudienceSparks.id, sparkId));

        await tx
          .update(campaignFloorRounds)
          .set({ updatedAt: new Date() })
          .where(and(eq(campaignFloorRounds.id, roundId), eq(campaignFloorRounds.status, "open")));
      });
    }

    return NextResponse.json({
      data: await getVisibleFloorRound(sessionId, session.user.id, true),
    });
  } catch (error) {
    console.error("PATCH /api/.../floor-rounds/[roundId]/sparks/[sparkId] error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update Audience Spark" } }, { status: 500 });
  }
}
