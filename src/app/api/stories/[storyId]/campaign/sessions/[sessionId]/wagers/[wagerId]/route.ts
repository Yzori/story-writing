import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignWagers } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { verifySessionGmAccess } from "@/server/services/collaboration";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string; wagerId: string }>;
};

/**
 * DELETE /api/.../wagers/[wagerId] — the Director pulls a slip off the rim.
 * This is the moderation lever for audience free text: GM-only, no appeal.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { storyId, sessionId, wagerId } = await params;
    const check = await verifySessionGmAccess(storyId, sessionId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }
    if (check.error) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the Director can pull a slip" } },
        { status: 403 },
      );
    }

    await db
      .delete(campaignWagers)
      .where(and(eq(campaignWagers.id, wagerId), eq(campaignWagers.sessionId, sessionId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/stories/[storyId]/campaign/sessions/[sessionId]/wagers/[wagerId]",
      "Failed to pull the slip",
    );
  }
}
