import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chapters, stories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { reorderChaptersSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * PATCH /api/stories/[storyId]/chapters/reorder
 * Bulk update chapter sort orders. Requires ownership.
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

    const { storyId } = await params;
    const body = await request.json();
    const parsed = reorderChaptersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

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
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
      );
    }

    const updates = parsed.data.chapters.map((ch) =>
      db
        .update(chapters)
        .set({ sortOrder: ch.sortOrder, updatedAt: new Date() })
        .where(
          and(
            eq(chapters.id, ch.id),
            eq(chapters.storyId, storyId),
            isNull(chapters.deletedAt)
          )
        )
    );

    await Promise.all(updates);

    return NextResponse.json({
      data: { success: true, updated: parsed.data.chapters.length },
    });
  } catch (error) {
    console.error("PATCH /api/stories/[storyId]/chapters/reorder error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to reorder chapters",
        },
      },
      { status: 500 }
    );
  }
}
