import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  campaignCastPresence,
  campaignSessions,
  playerCharacters,
  stories,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

const HEARTBEAT_WINDOW = sql`now() - interval '45 seconds'`;

async function loadPublicSession(storyId: string, sessionId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });
  if (!story) return null;
  const campaignSession = await db.query.campaignSessions.findFirst({
    where: eq(campaignSessions.id, sessionId),
  });
  if (!campaignSession || campaignSession.storyId !== storyId) return null;
  return { story, campaignSession };
}

async function listPresentCast(sessionId: string) {
  const rows = await db
    .select({
      userId: campaignCastPresence.userId,
      lastSeen: campaignCastPresence.lastHeartbeat,
    })
    .from(campaignCastPresence)
    .where(
      and(
        eq(campaignCastPresence.sessionId, sessionId),
        gt(campaignCastPresence.lastHeartbeat, HEARTBEAT_WINDOW),
      ),
    );
  return rows.map((r) => ({ userId: r.userId, lastSeen: r.lastSeen.toISOString() }));
}

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/presence
 * Who of the cast (Director included) has a fresh heartbeat (<45s). Public
 * on public stories — watchers see names ink into the signature as the
 * table gathers. The private-story read is allowed for signed-in users who
 * belong to the table (GM or a character owner).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", { max: 120, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const loaded = await loadPublicSession(storyId, sessionId);
    if (!loaded) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    if (!loaded.story.isPublic) {
      const session = await auth();
      const userId = session?.user?.id;
      const atTheTable =
        !!userId &&
        (loaded.story.userId === userId ||
          !!(await db.query.playerCharacters.findFirst({
            where: and(
              eq(playerCharacters.storyId, storyId),
              eq(playerCharacters.userId, userId),
            ),
          })));
      if (!atTheTable) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Session not found" } },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({ cast: await listPresentCast(sessionId) });
  } catch (error) {
    console.error("GET /api/.../sessions/[sessionId]/presence error:", error);
    return NextResponse.json({ cast: [] });
  }
}

/**
 * PUT /api/stories/[storyId]/campaign/sessions/[sessionId]/presence
 * Cast heartbeat — the table's twin of the spectator heartbeat. GM or any
 * character owner on the story; upserts (sessionId, userId). No session
 * status gate: the lobby needs arrivals on draft, and active-session
 * presence keeps the door open for the in-session signature later.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write", {
      max: 120,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const loaded = await loadPublicSession(storyId, sessionId);
    if (!loaded) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    const isGm = loaded.story.userId === session.user.id;
    if (!isGm) {
      const character = await db.query.playerCharacters.findFirst({
        where: and(
          eq(playerCharacters.storyId, storyId),
          eq(playerCharacters.userId, session.user.id),
        ),
      });
      if (!character) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Only the table can sign in here" } },
          { status: 403 },
        );
      }
    }

    await db
      .insert(campaignCastPresence)
      .values({
        sessionId,
        userId: session.user.id,
        lastHeartbeat: new Date(),
      })
      .onConflictDoUpdate({
        target: [campaignCastPresence.sessionId, campaignCastPresence.userId],
        set: { lastHeartbeat: new Date() },
      });

    return NextResponse.json({ cast: await listPresentCast(sessionId) });
  } catch (error) {
    return handleRouteError(
      error,
      "PUT /api/stories/[storyId]/campaign/sessions/[sessionId]/presence",
      "Failed to update presence",
    );
  }
}
