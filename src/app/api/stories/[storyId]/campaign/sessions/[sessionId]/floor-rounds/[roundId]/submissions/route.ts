import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignFloorRounds, campaignFloorSubmissions, campaignSessions, playerCharacters } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createFloorSubmissionSchema } from "@/lib/validations";
import { isSessionGm, verifyCollaboratorAccess } from "@/server/services/collaboration";
import { getVisibleFloorRound } from "@/server/services/floor-rounds";

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
    if (campaignSession.status !== "active") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Session is not active" } }, { status: 403 });
    }
    if (!round || round.sessionId !== sessionId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Floor round not found" } }, { status: 404 });
    }
    if (round.status !== "open") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Submissions are closed" } }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createFloorSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    const character = await db.query.playerCharacters.findFirst({
      where: and(
        eq(playerCharacters.id, parsed.data.characterId),
        eq(playerCharacters.storyId, storyId),
        eq(playerCharacters.userId, session.user.id),
        eq(playerCharacters.status, "active"),
      ),
    });
    if (!character) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Choose one of your active characters" } }, { status: 403 });
    }

    await db
      .insert(campaignFloorSubmissions)
      .values({
        roundId,
        userId: session.user.id,
        characterId: parsed.data.characterId,
        type: parsed.data.type,
        content: parsed.data.content.trim(),
      })
      .onConflictDoUpdate({
        target: [campaignFloorSubmissions.roundId, campaignFloorSubmissions.userId],
        set: {
          characterId: parsed.data.characterId,
          type: parsed.data.type,
          content: parsed.data.content.trim(),
          status: "submitted",
        },
      });

    const isGM = !!check.story && isSessionGm(check.story, campaignSession, session.user.id);
    return NextResponse.json({
      data: await getVisibleFloorRound(sessionId, session.user.id, isGM),
    });
  } catch (error) {
    console.error("POST /api/.../floor-rounds/[roundId]/submissions error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Failed to submit response",
        },
      },
      { status: 500 },
    );
  }
}
