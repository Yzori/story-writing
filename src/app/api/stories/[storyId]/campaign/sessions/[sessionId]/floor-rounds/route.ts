import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignFloorRounds, campaignSessions } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createFloorRoundSchema } from "@/lib/validations";
import { isSessionGm, verifyCollaboratorAccess } from "@/server/services/collaboration";
import { getVisibleFloorRound } from "@/server/services/floor-rounds";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const { storyId, sessionId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Story not found" } }, { status: 404 });
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } }, { status: 403 });
    }

    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }

    const isGM = !!check.story && isSessionGm(check.story, campaignSession, session.user.id);
    return NextResponse.json({
      data: await getVisibleFloorRound(sessionId, session.user.id, isGM),
    });
  } catch (error) {
    console.error("GET /api/.../floor-rounds error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch floor round" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Story not found" } }, { status: 404 });
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the GM can open the floor" } }, { status: 403 });
    }

    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }
    if (!check.story || !isSessionGm(check.story, campaignSession, session.user.id)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the GM can open the floor" } }, { status: 403 });
    }
    if (campaignSession.status !== "active") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Session is not active" } }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createFloorRoundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    const existing = await db.query.campaignFloorRounds.findFirst({
      where: and(
        eq(campaignFloorRounds.sessionId, sessionId),
        inArray(campaignFloorRounds.status, ["open", "voting", "closed"]),
      ),
    });
    if (existing) {
      return NextResponse.json({ error: { code: "CONFLICT", message: "A floor round is already active" } }, { status: 409 });
    }

    // One Crossroads shape: players write competing responses ("open"), the
    // table votes, the GM canonizes. Opens in the collection phase.
    await db.insert(campaignFloorRounds).values({
      sessionId,
      openedBy: session.user.id,
      prompt: parsed.data.prompt.trim(),
      mode: "vote",
      audiencePulseEnabled: parsed.data.audiencePulseEnabled,
    });

    return NextResponse.json({
      data: await getVisibleFloorRound(sessionId, session.user.id, true),
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/.../floor-rounds error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to open Crossroads" } }, { status: 500 });
  }
}
