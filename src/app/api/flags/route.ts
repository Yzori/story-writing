import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { flags } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createFlagSchema } from "@/lib/validations";
import { applyRateLimit } from "@/server/api-utils";

/**
 * POST /api/flags
 * Create a content flag (report). Requires authentication.
 * Prevents duplicate flags (same user + same target + same reason).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const body = await request.json();
    const parsed = createFlagSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { reason, details, storyId, commentId } = parsed.data;
    const userId = session.user.id;

    // Must flag either a story or a comment
    if (!storyId && !commentId) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Either storyId or commentId is required",
          },
        },
        { status: 400 }
      );
    }

    // Check for duplicate flag
    const conditions = [eq(flags.userId, userId), eq(flags.reason, reason)];

    if (storyId) {
      conditions.push(eq(flags.storyId, storyId));
    }
    if (commentId) {
      conditions.push(eq(flags.commentId, commentId));
    }

    const existing = await db
      .select({ id: flags.id })
      .from(flags)
      .where(and(...conditions))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE",
            message: "You have already reported this content for this reason",
          },
        },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(flags)
      .values({
        userId,
        storyId: storyId || null,
        commentId: commentId || null,
        reason,
        details: details || null,
      })
      .returning({ id: flags.id, createdAt: flags.createdAt });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/flags error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create flag" } },
      { status: 500 }
    );
  }
}
