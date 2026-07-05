import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignFloorRounds, campaignFloorSubmissions, campaignFloorVotes, campaignSessions } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createFloorVoteSchema } from "@/lib/validations";
import { isSessionGm, verifyCollaboratorAccess } from "@/server/services/collaboration";
import { getEligibleFloorVoterIds, getVisibleFloorRound } from "@/server/services/floor-rounds";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string; roundId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
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
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } }, { status: 403 });
    }

    const [campaignSession, round] = await Promise.all([
      db.query.campaignSessions.findFirst({ where: eq(campaignSessions.id, sessionId) }),
      db.query.campaignFloorRounds.findFirst({ where: eq(campaignFloorRounds.id, roundId) }),
    ]);
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }
    if (!round || round.sessionId !== sessionId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Floor round not found" } }, { status: 404 });
    }
    // Vote rounds live on the active table; temperature leans on the unlit
    // (draft) one. A cast lean IS a vote row — same slot, no weight: the
    // temperature never resolves into anything.
    const requiredStatus = round.mode === "temperature" ? "draft" : "active";
    if (campaignSession.status !== requiredStatus) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message:
              round.mode === "temperature"
                ? "The temperature was taken — the session has begun"
                : "Session is not active",
          },
        },
        { status: 403 },
      );
    }
    // v2 single-block vote: the table writes and votes in one open phase, so
    // votes are accepted while the round is "open" as well as the legacy
    // reveal-then-vote "voting" phase.
    if (
      (round.mode !== "vote" && round.mode !== "temperature") ||
      (round.status !== "open" && round.status !== "voting")
    ) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Voting is not open" } }, { status: 403 });
    }
    if (check.story && isSessionGm(check.story, campaignSession, session.user.id)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message:
              round.mode === "temperature"
                ? "The temperature is for the room — the Director reads it"
                : "The GM closes voting and canonizes instead of voting",
          },
        },
        { status: 403 },
      );
    }
    const eligibleVoterIds = await getEligibleFloorVoterIds(sessionId);
    if (!eligibleVoterIds.has(session.user.id)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only active session players can vote" } }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createFloorVoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    const submission = await db.query.campaignFloorSubmissions.findFirst({
      where: and(
        eq(campaignFloorSubmissions.id, parsed.data.submissionId),
        eq(campaignFloorSubmissions.roundId, roundId),
      ),
    });
    if (!submission) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Submission not found" } }, { status: 404 });
    }
    if (submission.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You cannot vote for your own submission" } },
        { status: 403 },
      );
    }

    await db
      .insert(campaignFloorVotes)
      .values({
        roundId,
        submissionId: parsed.data.submissionId,
        userId: session.user.id,
      })
      .onConflictDoUpdate({
        target: [campaignFloorVotes.roundId, campaignFloorVotes.userId],
        set: { submissionId: parsed.data.submissionId },
      });

    return NextResponse.json({
      data: await getVisibleFloorRound(sessionId, session.user.id),
    });
  } catch (error) {
    console.error("POST /api/.../floor-rounds/[roundId]/votes error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to cast vote" } }, { status: 500 });
  }
}
