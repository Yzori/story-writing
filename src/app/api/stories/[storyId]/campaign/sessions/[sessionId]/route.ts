import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaignSessions, stories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { updateCampaignSessionSchema } from "@/lib/validations";
import { applyRateLimit } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

/**
 * PATCH /api/stories/[storyId]/campaign/sessions/[sessionId]
 * Update session (status, opening, title, etc.). GM only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can update sessions" } },
        { status: 403 }
      );
    }

    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateCampaignSessionSchema.safeParse(body);

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

    const [updated] = await db
      .update(campaignSessions)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(campaignSessions.id, sessionId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/.../sessions/[sessionId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update session" } },
      { status: 500 }
    );
  }
}
