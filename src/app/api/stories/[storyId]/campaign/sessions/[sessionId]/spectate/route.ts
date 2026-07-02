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
import { eq, and, asc, gt, isNull, like, ne, or, sql } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

// Cheap, stable string hash for building a weak ETag from the response body.
function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36) + "-" + input.length.toString(36);
}

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

    // Fetch turns, excluding OOC table talk — but vote records ride the ooc
    // type (log types stay out of compiled chapters) and DO print on the page.
    const turnConditions = [
      eq(campaignTurns.sessionId, sessionId),
      or(
        ne(campaignTurns.type, "ooc"),
        like(campaignTurns.metadata, '%"kind":"vote-record"%'),
      )!,
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

    const body = {
      data: turns,
      session: {
        id: campaignSession.id,
        title: campaignSession.title,
        status: campaignSession.status,
        activePlayerId: campaignSession.activePlayerId,
        opening: campaignSession.opening,
        epilogue: campaignSession.epilogue,
      },
      characters,
      spectatorCount,
      story: {
        id: story.id,
        title: story.title,
      },
    };

    // Weak ETag over the exact payload so repeat polls (typically empty
    // incremental responses where nothing changed) can short-circuit with 304.
    const serialized = JSON.stringify(body);
    const etag = `W/"${djb2(serialized)}"`;
    const cacheHeaders = {
      "Cache-Control": "private, no-cache, max-age=0, must-revalidate",
      ETag: etag,
    };

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }

    return NextResponse.json(body, { headers: cacheHeaders });
  } catch (error) {
    console.error("GET /api/.../spectate error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch spectate data" } },
      { status: 500 }
    );
  }
}
