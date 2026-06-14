import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignSessions, spectatorReactions, users } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { tableReactionSchema, TABLE_REACTION_TYPES } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { cleanupStaleReactionsIfDue } from "@/server/services/cleanup";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

/**
 * Reactions from people AT the table (GM + players), as opposed to the
 * gallery's /spectate/reactions. Same ephemeral spectator_reactions table,
 * but gated on collaborator access (private campaigns react too) and carrying
 * the table's own emoji set so the gallery's types never bleed onto the stage.
 */

// POST — drop a reaction onto the stage.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const rl = applyRateLimit(request, session.user.id, "write", { max: 20, windowSeconds: 30 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Story not found" } }, { status: 404 });
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } }, { status: 403 });
    }

    const campaignSession = await db.query.campaignSessions.findFirst({ where: eq(campaignSessions.id, sessionId) });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }

    const parsed = tableReactionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid reaction" } },
        { status: 400 },
      );
    }

    await db.insert(spectatorReactions).values({
      sessionId,
      token: session.user.id, // table reactions are keyed by the participant
      userId: session.user.id,
      type: parsed.data.type,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST table reaction error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to send reaction" } }, { status: 500 });
  }
}

// GET — poll recent table reactions. Supports ?after=<ISO timestamp>.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const rl = applyRateLimit(request, session.user.id, "read", { max: 120, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Story not found" } }, { status: 404 });
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } }, { status: 403 });
    }

    const afterParam = new URL(request.url).searchParams.get("after");
    const after = afterParam ? new Date(afterParam) : new Date(Date.now() - 10_000);
    const since = Number.isNaN(after.getTime()) ? new Date(Date.now() - 10_000) : after;

    const rows = await db
      .select({
        id: spectatorReactions.id,
        type: spectatorReactions.type,
        userId: spectatorReactions.userId,
        displayName: users.displayName,
        createdAt: spectatorReactions.createdAt,
      })
      .from(spectatorReactions)
      .leftJoin(users, eq(spectatorReactions.userId, users.id))
      .where(
        and(
          eq(spectatorReactions.sessionId, sessionId),
          gt(spectatorReactions.createdAt, since),
          // Only the table's own emoji set — keep gallery reactions off the stage.
          inArray(spectatorReactions.type, [...TABLE_REACTION_TYPES]),
        ),
      )
      .orderBy(spectatorReactions.createdAt)
      .limit(80);

    cleanupStaleReactionsIfDue(sessionId);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("GET table reactions error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch reactions" } }, { status: 500 });
  }
}
