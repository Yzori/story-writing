import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { progressClocks, campaignSessions } from "@/server/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createProgressClockSchema } from "@/lib/validations";
import { verifyCollaboratorAccess, verifyStoryOwnership } from "@/server/services/collaboration";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/clocks
 * List all progress clocks for a session. Requires collaborator access.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId, sessionId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
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

    const clocks = await db
      .select()
      .from(progressClocks)
      .where(eq(progressClocks.sessionId, sessionId))
      .orderBy(asc(progressClocks.sortOrder));

    return NextResponse.json({ data: clocks });
  } catch (error) {
    console.error("GET /api/.../clocks error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch clocks" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/sessions/[sessionId]/clocks
 * Create a new progress clock. GM only.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const check = await verifyStoryOwnership(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can create clocks" } },
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

    const body = await request.json();
    const parsed = createProgressClockSchema.safeParse(body);

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

    // Auto-compute sortOrder
    const [maxResult] = await db
      .select({ max: sql<number>`coalesce(max(${progressClocks.sortOrder}), -1)` })
      .from(progressClocks)
      .where(eq(progressClocks.sessionId, sessionId));
    const nextSort = (maxResult?.max ?? -1) + 1;

    const [created] = await db
      .insert(progressClocks)
      .values({
        sessionId,
        name: parsed.data.name,
        segments: parsed.data.segments,
        filled: 0,
        type: parsed.data.type,
        sortOrder: nextSort,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/.../clocks error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create clock" } },
      { status: 500 }
    );
  }
}
