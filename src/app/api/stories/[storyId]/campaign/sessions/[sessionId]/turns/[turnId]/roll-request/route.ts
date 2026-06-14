import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { campaignSessions, campaignTurns, playerCharacters, users } from "@/server/db/schema";
import { applyRateLimit } from "@/server/api-utils";
import { isSessionGm, verifyCollaboratorAccess } from "@/server/services/collaboration";
import { parseRollRequestMetadata } from "@/lib/campaign-turns";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string; turnId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, sessionId, turnId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 },
      );
    }

    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    if (!check.story || !isSessionGm(check.story, campaignSession, session.user.id)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can update roll requests" } },
        { status: 403 },
      );
    }

    const turn = await db.query.campaignTurns.findFirst({
      where: eq(campaignTurns.id, turnId),
    });
    if (!turn || turn.sessionId !== sessionId || turn.type !== "roll-request") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Roll request not found" } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const status = body?.status;
    if (status !== "closed" && status !== "cancelled") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Status must be closed or cancelled" } },
        { status: 400 },
      );
    }

    const meta = parseRollRequestMetadata(turn.metadata);
    if (!meta) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Roll request metadata is invalid" } },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(campaignTurns)
      .set({
        metadata: JSON.stringify({
          ...meta,
          status,
        }),
      })
      .where(eq(campaignTurns.id, turnId))
      .returning();

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
      .where(eq(campaignTurns.id, updated.id));

    return NextResponse.json({ data: enriched ?? updated });
  } catch (error) {
    console.error("PATCH /api/.../roll-request error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update roll request" } },
      { status: 500 },
    );
  }
}
