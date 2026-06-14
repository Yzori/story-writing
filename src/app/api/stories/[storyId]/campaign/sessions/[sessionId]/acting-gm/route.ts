import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { campaignSessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { verifyCollaboratorAccess, resolveSessionGmId } from "@/server/services/collaboration";
import { getActiveSessionPlayerIds } from "@/server/services/campaign-rolls";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

const ACTIONS = ["handoff", "reclaim", "propose", "confirm", "cancel"] as const;
type Action = (typeof ACTIONS)[number];

const forbidden = (message: string) =>
  NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
const badRequest = (message: string) =>
  NextResponse.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 });

/**
 * POST /api/stories/[storyId]/campaign/sessions/[sessionId]/acting-gm
 *
 * Manage the session-scoped Acting GM (live-play continuity, D2). Body:
 *   { action: "handoff", targetUserId }  — running GM hands the session to a player (planned)
 *   { action: "reclaim" }                — owner/running GM takes the chair back
 *   { action: "propose" }                — a present player offers to run while the GM is away
 *   { action: "confirm" }                — a DIFFERENT present player confirms → promotes the proposer
 *   { action: "cancel" }                 — proposer or running GM clears a pending offer
 *
 * Acting GM grants session-running powers only; campaign ownership never changes.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, sessionId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Story not found" } }, { status: 404 });
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } }, { status: 403 });
    }

    const sess = await db.query.campaignSessions.findFirst({ where: eq(campaignSessions.id, sessionId) });
    if (!sess || sess.storyId !== storyId) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action as Action | undefined;
    if (!action || !ACTIONS.includes(action)) {
      return badRequest("Unknown acting-GM action");
    }

    const me = session.user.id;
    const ownerId = check.story!.userId;
    const isOwner = me === ownerId;
    const isRunningGm = me === resolveSessionGmId(check.story!, sess);

    const apply = async (set: { actingGmId?: string | null; takeoverProposerId?: string | null }) => {
      const [updated] = await db
        .update(campaignSessions)
        .set({ ...set, updatedAt: new Date() })
        .where(eq(campaignSessions.id, sessionId))
        .returning({ actingGmId: campaignSessions.actingGmId, takeoverProposerId: campaignSessions.takeoverProposerId });
      return NextResponse.json({ data: updated });
    };

    if (action === "reclaim") {
      // The true owner always can reclaim; an acting GM may step down too.
      if (!isOwner && !isRunningGm) return forbidden("Only the GM can reclaim the session");
      return apply({ actingGmId: null, takeoverProposerId: null });
    }

    if (action === "handoff") {
      if (!isRunningGm) return forbidden("Only the GM can hand off the session");
      const target = typeof body?.targetUserId === "string" ? body.targetUserId : null;
      if (!target) return badRequest("Choose a player to hand off to");
      if (target === ownerId) return badRequest("The owner runs by default — use reclaim instead");
      const players = await getActiveSessionPlayerIds(sessionId, storyId);
      if (!players.includes(target)) return badRequest("Hand off to an active player at the table");
      return apply({ actingGmId: target, takeoverProposerId: null });
    }

    // The remaining actions are the table-consent takeover dance.
    const players = await getActiveSessionPlayerIds(sessionId, storyId);

    if (action === "propose") {
      if (isRunningGm) return badRequest("You're already running the session");
      if (!players.includes(me)) return forbidden("Only an active player at the table can offer to run");
      return apply({ takeoverProposerId: me });
    }

    if (action === "confirm") {
      const proposer = sess.takeoverProposerId;
      if (!proposer) return badRequest("No one has offered to run");
      if (proposer === me) return forbidden("Another player must confirm your offer");
      if (!players.includes(me)) return forbidden("Only an active player at the table can confirm");
      if (!players.includes(proposer)) return apply({ takeoverProposerId: null }); // stale offer
      return apply({ actingGmId: proposer, takeoverProposerId: null });
    }

    // action === "cancel"
    const proposer = sess.takeoverProposerId;
    if (proposer && me !== proposer && !isRunningGm && !isOwner) {
      return forbidden("Only the player who offered, or the GM, can withdraw the offer");
    }
    return apply({ takeoverProposerId: null });
  } catch (error) {
    console.error("POST /api/.../acting-gm error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update acting GM" } }, { status: 500 });
  }
}
