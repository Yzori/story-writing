import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { progressClocks, campaignSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { updateProgressClockSchema } from "@/lib/validations";
import { verifyStoryOwnership } from "@/lib/collaboration";
import { applyRateLimit } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string; clockId: string }> };

/**
 * PATCH /api/stories/[storyId]/campaign/sessions/[sessionId]/clocks/[clockId]
 * Update a progress clock (filled count, name). GM only.
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

    const { storyId, sessionId, clockId } = await params;

    const check = await verifyStoryOwnership(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can update clocks" } },
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

    // Verify clock exists and belongs to this session
    const clock = await db.query.progressClocks.findFirst({
      where: eq(progressClocks.id, clockId),
    });
    if (!clock || clock.sessionId !== sessionId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Clock not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateProgressClockSchema.safeParse(body);

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

    // Validate filled doesn't exceed segments
    if (parsed.data.filled !== undefined && parsed.data.filled > clock.segments) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Filled cannot exceed total segments" } },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(progressClocks)
      .set(parsed.data)
      .where(eq(progressClocks.id, clockId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/.../clocks/[clockId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update clock" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/campaign/sessions/[sessionId]/clocks/[clockId]
 * Delete a progress clock. GM only.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { storyId, sessionId, clockId } = await params;

    const check = await verifyStoryOwnership(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can delete clocks" } },
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

    // Verify clock exists and belongs to this session
    const clock = await db.query.progressClocks.findFirst({
      where: eq(progressClocks.id, clockId),
    });
    if (!clock || clock.sessionId !== sessionId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Clock not found" } },
        { status: 404 }
      );
    }

    await db.delete(progressClocks).where(eq(progressClocks.id, clockId));

    return NextResponse.json({ data: { id: clockId } });
  } catch (error) {
    console.error("DELETE /api/.../clocks/[clockId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete clock" } },
      { status: 500 }
    );
  }
}
