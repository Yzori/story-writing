import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { db } from "@/server/db";
import { campaignSessions, campaignTurns, playerCharacters, users } from "@/server/db/schema";
import { parseBargainMetadata } from "@/lib/campaign-turns";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string; turnId: string }> };

const updateBargainSchema = z.object({
  response: z.enum(["accepted", "refused"]),
});

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

    const body = await request.json();
    const parsed = updateBargainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid response" } },
        { status: 400 },
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

    const turn = await db.query.campaignTurns.findFirst({
      where: eq(campaignTurns.id, turnId),
    });
    if (!turn || turn.sessionId !== sessionId || turn.type !== "consequence") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Bargain not found" } },
        { status: 404 },
      );
    }

    const metadata = parseBargainMetadata(turn.metadata);
    if (!metadata) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Bargain metadata is invalid" } },
        { status: 400 },
      );
    }

    if ((metadata.status ?? "open") !== "open") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "This bargain has already been answered" } },
        { status: 409 },
      );
    }

    if (metadata.targetUserId !== "everyone" && metadata.targetUserId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "This bargain is not for you" } },
        { status: 403 },
      );
    }

    const actorCharacter = await db.query.playerCharacters.findFirst({
      where: and(
        eq(playerCharacters.storyId, storyId),
        eq(playerCharacters.userId, session.user.id),
      ),
    });
    const responseLabel = actorCharacter?.name ?? session.user.name ?? "A player";
    const nextMetadata = {
      ...metadata,
      status: parsed.data.response,
      responseUserId: session.user.id,
      responseLabel,
      resolvedAt: new Date().toISOString(),
      // Accepted bargains are mark-worthy — a debt was taken on.
      markEligible: parsed.data.response === "accepted",
    };

    const [updated] = await db
      .update(campaignTurns)
      .set({ metadata: JSON.stringify(nextMetadata) })
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
    console.error("PATCH /api/.../bargain error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to answer bargain" } },
      { status: 500 },
    );
  }
}
