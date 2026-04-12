import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  campaignSessions,
  campaignTurns,
  playerCharacters,
  users,
  spectatorPresence,
} from "@/server/db/schema";
import { eq, and, asc, gt, isNull, ne, sql } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate
 * Public endpoint for spectators to poll session turns.
 * Excludes OOC turns. Supports incremental polling via ?afterSort=N.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", {
      max: 60,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { storyId, sessionId } = await params;

    // Verify story exists, is public, and not deleted
    const story = await db.query.stories.findFirst({
      where: and(
        eq(stories.id, storyId),
        eq(stories.isPublic, true),
        isNull(stories.deletedAt)
      ),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
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

    // Parse afterSort for incremental polling
    const afterSort = request.nextUrl.searchParams.get("afterSort");
    const afterSortNum = afterSort ? parseInt(afterSort, 10) : null;

    if (afterSort !== null && (afterSortNum === null || isNaN(afterSortNum))) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid afterSort parameter" } },
        { status: 400 }
      );
    }

    // Fetch turns, excluding OOC
    const turnConditions = [
      eq(campaignTurns.sessionId, sessionId),
      ne(campaignTurns.type, "ooc"),
    ];
    if (afterSortNum !== null) {
      turnConditions.push(gt(campaignTurns.sortOrder, afterSortNum));
    }

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
      .where(and(...turnConditions))
      .orderBy(asc(campaignTurns.sortOrder));

    // Fetch characters for this session (public info only — no stats, no backstory)
    const characters = await db
      .select({
        id: playerCharacters.id,
        userId: playerCharacters.userId,
        name: playerCharacters.name,
        portrait: playerCharacters.portrait,
        userDisplayName: users.displayName,
      })
      .from(playerCharacters)
      .leftJoin(users, eq(playerCharacters.userId, users.id))
      .where(eq(playerCharacters.storyId, storyId));

    // Count active spectators (heartbeat within last 45 seconds)
    const [spectatorResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(spectatorPresence)
      .where(
        and(
          eq(spectatorPresence.sessionId, sessionId),
          gt(spectatorPresence.lastHeartbeat, sql`now() - interval '45 seconds'`)
        )
      );
    const spectatorCount = Number(spectatorResult?.count ?? 0);

    return NextResponse.json({
      data: turns,
      session: {
        id: campaignSession.id,
        title: campaignSession.title,
        status: campaignSession.status,
        activePlayerId: campaignSession.activePlayerId,
      },
      characters,
      spectatorCount,
    });
  } catch (error) {
    console.error("GET /api/.../spectate error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch spectate data" } },
      { status: 500 }
    );
  }
}
