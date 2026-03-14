import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaignTurns, campaignSessions, playerCharacters, users } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createCampaignTurnSchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/lib/collaboration";
import { applyRateLimit } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/turns
 * List turns for a session. Supports ?after=<turnId> for polling.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId, sessionId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    // Verify session belongs to this story
    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    const afterSort = request.nextUrl.searchParams.get("afterSort");

    const turns = await db
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
      .where(
        afterSort
          ? sql`${campaignTurns.sessionId} = ${sessionId} AND ${campaignTurns.sortOrder} > ${parseInt(afterSort, 10)}`
          : eq(campaignTurns.sessionId, sessionId)
      )
      .orderBy(asc(campaignTurns.sortOrder));

    return NextResponse.json({ data: turns, session: campaignSession });
  } catch (error) {
    console.error("GET /api/.../turns error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch turns" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/sessions/[sessionId]/turns
 * Create a new turn in a session.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    // Verify session
    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    if (campaignSession.status !== "active") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Session is not active" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createCampaignTurnSchema.safeParse(body);

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

    // Only GM (story owner) can post narration and consequence
    const isStoryOwner = check.story?.userId === session.user.id;
    const gmOnlyTypes = ["narration", "consequence", "roll-request"];
    if (gmOnlyTypes.includes(parsed.data.type) && !isStoryOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can narrate" } },
        { status: 403 }
      );
    }

    // Enforce turn order: when activePlayerId is set, only that player can post
    // story turns. GM narration/consequence bypass turn order (GM can always interject).
    // OOC and rolls are always allowed regardless of turn.
    const playerStoryTypes = ["action", "dialogue", "reaction", "description"];
    const isPlayerStoryTurn = playerStoryTypes.includes(parsed.data.type);
    if (
      campaignSession.activePlayerId &&
      isPlayerStoryTurn &&
      campaignSession.activePlayerId !== session.user.id
    ) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "It is not your turn" } },
        { status: 403 }
      );
    }

    // Use a subquery insert to atomically compute the next sortOrder,
    // preventing race conditions with concurrent inserts
    const [created] = await db
      .insert(campaignTurns)
      .values({
        sessionId,
        userId: session.user.id,
        characterId: parsed.data.characterId ?? null,
        type: parsed.data.type,
        content: parsed.data.content,
        metadata: parsed.data.metadata ?? null,
        sortOrder: sql<number>`coalesce((select max(${campaignTurns.sortOrder}) from ${campaignTurns} where ${campaignTurns.sessionId} = ${sessionId}), -1) + 1`,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/.../turns error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create turn" } },
      { status: 500 }
    );
  }
}
