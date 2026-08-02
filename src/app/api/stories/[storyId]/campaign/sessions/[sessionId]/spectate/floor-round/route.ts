import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  campaignFloorAudiencePulses,
  campaignFloorRounds,
  campaignFloorSubmissions,
} from "@/server/db/schema";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createFloorAudiencePulseSchema } from "@/lib/validations";
import { getAudiencePulseFloorRound } from "@/server/services/floor-rounds";
import { deriveAudienceKey, verifyPublicSession } from "@/server/services/audience-input";
import { auth } from "@/server/auth";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

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
      data: token.trim()
        ? await getAudiencePulseFloorRound(sessionId, deriveAudienceKey(request, token))
        : null,
    });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/floor-round",
      "Failed to fetch audience pulse",
    );
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

    // v2 rounds run their whole life in "open" (single-block), so the house
    // must be able to lean/choose there; "voting" is the legacy reveal phase.
    const round = await db.query.campaignFloorRounds.findFirst({
      where: and(
        eq(campaignFloorRounds.sessionId, sessionId),
        eq(campaignFloorRounds.audiencePulseEnabled, true),
        inArray(campaignFloorRounds.status, ["open", "voting"]),
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
    const pulseKey = deriveAudienceKey(request, parsed.data.token);
    await db
      .insert(campaignFloorAudiencePulses)
      .values({
        roundId: round.id,
        submissionId: parsed.data.submissionId,
        token: pulseKey,
        userId: session?.user?.id || null,
      })
      .onConflictDoUpdate({
        target: [campaignFloorAudiencePulses.roundId, campaignFloorAudiencePulses.token],
        set: { submissionId: parsed.data.submissionId },
      });

    return NextResponse.json({
      data: await getAudiencePulseFloorRound(sessionId, pulseKey),
    });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/floor-round",
      "Failed to send audience pulse",
    );
  }
}
