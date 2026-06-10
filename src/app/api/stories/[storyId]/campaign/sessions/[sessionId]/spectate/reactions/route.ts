import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  campaignSessions,
  spectatorReactions,
  users,
} from "@/server/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";
import { spectatorReactionSchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { cleanupStaleReactionsIfDue } from "@/server/services/cleanup";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * POST /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/reactions
 * Submit a spectator reaction. No auth required (token-based).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "write", {
      max: 10,
      windowSeconds: 30,
    });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const body = await request.json();
    const { token, type } = spectatorReactionSchema.parse(body);

    // Verify story is public and session exists
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story || !story.isPublic) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const session = await db.query.campaignSessions.findFirst({
      where: and(
        eq(campaignSessions.id, sessionId),
        eq(campaignSessions.storyId, storyId)
      ),
    });
    if (!session) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    // Optionally attach userId if logged in
    const authSession = await auth();
    const userId = authSession?.user?.id ?? null;

    await db.insert(spectatorReactions).values({
      sessionId,
      token,
      userId,
      type,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST spectator reaction error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to submit reaction" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/reactions
 * Poll for recent spectator reactions. Supports ?after=<ISO timestamp>.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", {
      max: 60,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { storyId, sessionId } = await params;

    // Verify story is public and session belongs to it — mirrors the POST
    // handler and the other spectate GET endpoints.
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story || !story.isPublic) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const session = await db.query.campaignSessions.findFirst({
      where: and(
        eq(campaignSessions.id, sessionId),
        eq(campaignSessions.storyId, storyId)
      ),
    });
    if (!session) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const afterParam = url.searchParams.get("after");

    // Default to last 10 seconds if no after param
    const after = afterParam
      ? new Date(afterParam)
      : new Date(Date.now() - 10_000);

    const rows = await db
      .select({
        id: spectatorReactions.id,
        type: spectatorReactions.type,
        createdAt: spectatorReactions.createdAt,
        displayName: users.displayName,
      })
      .from(spectatorReactions)
      .leftJoin(users, eq(spectatorReactions.userId, users.id))
      .where(
        and(
          eq(spectatorReactions.sessionId, sessionId),
          gt(spectatorReactions.createdAt, after)
        )
      )
      .orderBy(spectatorReactions.createdAt)
      .limit(100);

    // Sweep stale reactions at most once per 30s per session — deterministic
    // gate replaces the old 5%-of-requests probabilistic trigger.
    cleanupStaleReactionsIfDue(sessionId);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("GET spectator reactions error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch reactions" } },
      { status: 500 }
    );
  }
}
