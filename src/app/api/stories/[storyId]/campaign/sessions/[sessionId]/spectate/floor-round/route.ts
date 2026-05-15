import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  campaignFloorAudiencePulses,
  campaignFloorRounds,
  campaignFloorSubmissions,
  campaignSessions,
  stories,
} from "@/server/db/schema";
import { applyRateLimit } from "@/server/api-utils";
import { createFloorAudiencePulseSchema } from "@/lib/validations";
import { getAudiencePulseFloorRound } from "@/server/services/floor-rounds";
import { auth } from "@/server/auth";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

async function verifyPublicSession(storyId: string, sessionId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), eq(stories.isPublic, true), isNull(stories.deletedAt)),
  });
  if (!story) return false;

  const campaignSession = await db.query.campaignSessions.findFirst({
    where: and(eq(campaignSessions.id, sessionId), eq(campaignSessions.storyId, storyId)),
  });
  return Boolean(campaignSession);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", { max: 60, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    if (!(await verifyPublicSession(storyId, sessionId))) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }

    const token = request.nextUrl.searchParams.get("token") ?? "";
    return NextResponse.json({
      data: token.trim() ? await getAudiencePulseFloorRound(sessionId, token) : null,
    });
  } catch (error) {
    console.error("GET /api/.../spectate/floor-round error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch audience pulse" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "write", { max: 20, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    if (!(await verifyPublicSession(storyId, sessionId))) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createFloorAudiencePulseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    const round = await db.query.campaignFloorRounds.findFirst({
      where: and(
        eq(campaignFloorRounds.sessionId, sessionId),
        eq(campaignFloorRounds.audiencePulseEnabled, true),
        eq(campaignFloorRounds.status, "voting"),
      ),
    });
    if (!round) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Audience Pulse is not open" } }, { status: 403 });
    }

    const submission = await db.query.campaignFloorSubmissions.findFirst({
      where: and(
        eq(campaignFloorSubmissions.id, parsed.data.submissionId),
        eq(campaignFloorSubmissions.roundId, round.id),
      ),
    });
    if (!submission) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Submission not found" } }, { status: 404 });
    }

    const session = await auth();
    await db
      .insert(campaignFloorAudiencePulses)
      .values({
        roundId: round.id,
        submissionId: parsed.data.submissionId,
        token: parsed.data.token.trim(),
        userId: session?.user?.id ?? null,
      })
      .onConflictDoUpdate({
        target: [campaignFloorAudiencePulses.roundId, campaignFloorAudiencePulses.token],
        set: { submissionId: parsed.data.submissionId },
      });

    return NextResponse.json({
      data: await getAudiencePulseFloorRound(sessionId, parsed.data.token),
    });
  } catch (error) {
    console.error("POST /api/.../spectate/floor-round error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to send audience pulse" } }, { status: 500 });
  }
}
