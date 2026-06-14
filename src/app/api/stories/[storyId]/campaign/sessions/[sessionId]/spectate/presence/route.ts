import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { spectatorPresence } from "@/server/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/presence
 * Read-only live spectator count (last 45s). Used by the table (GM + players)
 * to feel the audience without registering themselves as spectators.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", { max: 120, windowSeconds: 60 });
    if (rl) return rl;

    const { sessionId } = await params;
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(spectatorPresence)
      .where(
        and(
          eq(spectatorPresence.sessionId, sessionId),
          gt(spectatorPresence.lastHeartbeat, sql`now() - interval '45 seconds'`),
        ),
      );
    return NextResponse.json({ spectatorCount: Number(result?.count ?? 0) });
  } catch (error) {
    console.error("GET /api/.../spectate/presence error:", error);
    return NextResponse.json({ spectatorCount: 0 });
  }
}

/**
 * PUT /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/presence
 * Heartbeat endpoint for spectator presence. Public — no auth required.
 * Upserts a spectator record keyed by (sessionId, token).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", {
      max: 120,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { sessionId } = await params;

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Token is required" } },
        { status: 400 }
      );
    }

    // Optionally attach userId if logged in
    const session = await auth();
    const userId = session?.user?.id ?? null;

    await db
      .insert(spectatorPresence)
      .values({
        sessionId,
        token: token.trim(),
        userId,
        lastHeartbeat: new Date(),
      })
      .onConflictDoUpdate({
        target: [spectatorPresence.sessionId, spectatorPresence.token],
        set: {
          lastHeartbeat: new Date(),
          userId, // update userId in case they logged in after starting to spectate
        },
      });

    // Count active spectators
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(spectatorPresence)
      .where(
        and(
          eq(spectatorPresence.sessionId, sessionId),
          gt(spectatorPresence.lastHeartbeat, sql`now() - interval '45 seconds'`)
        )
      );
    const spectatorCount = Number(result?.count ?? 0);

    return NextResponse.json({ spectatorCount });
  } catch (error) {
    console.error("PUT /api/.../spectate/presence error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update presence" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/presence
 * Remove a spectator presence record when leaving.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Token is required" } },
        { status: 400 }
      );
    }

    await db
      .delete(spectatorPresence)
      .where(
        and(
          eq(spectatorPresence.sessionId, sessionId),
          eq(spectatorPresence.token, token.trim())
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/.../spectate/presence error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to remove presence" } },
      { status: 500 }
    );
  }
}
