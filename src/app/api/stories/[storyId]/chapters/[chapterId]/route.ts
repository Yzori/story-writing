import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chapters, stories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { updateChapterSchema } from "@/lib/validations";
import { countWords } from "@/lib/utils";

// TODO: Add auth checks — the auth agent handles that

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

/**
 * GET /api/stories/[storyId]/chapters/[chapterId]
 * Get a single chapter with content.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, chapterId } = await params;

    const chapter = await db.query.chapters.findFirst({
      where: and(
        eq(chapters.id, chapterId),
        eq(chapters.storyId, storyId),
        isNull(chapters.deletedAt)
      ),
    });

    if (!chapter) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: chapter });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/chapters/[chapterId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch chapter" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/stories/[storyId]/chapters/[chapterId]
 * Update chapter fields. Recalculates word_count if content changes.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, chapterId } = await params;
    const body = await request.json();
    const parsed = updateChapterSchema.safeParse(body);

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

    const existing = await db.query.chapters.findFirst({
      where: and(
        eq(chapters.id, chapterId),
        eq(chapters.storyId, storyId),
        isNull(chapters.deletedAt)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    // Recalculate word count if content is being updated
    if (parsed.data.content !== undefined) {
      updateData.wordCount = countWords(parsed.data.content);
    }

    const [updated] = await db
      .update(chapters)
      .set(updateData)
      .where(eq(chapters.id, chapterId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/stories/[storyId]/chapters/[chapterId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update chapter" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/chapters/[chapterId]
 * Soft delete — sets deleted_at timestamp.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, chapterId } = await params;

    const existing = await db.query.chapters.findFirst({
      where: and(
        eq(chapters.id, chapterId),
        eq(chapters.storyId, storyId),
        isNull(chapters.deletedAt)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    const [deleted] = await db
      .update(chapters)
      .set({ deletedAt: new Date() })
      .where(eq(chapters.id, chapterId))
      .returning();

    return NextResponse.json({
      data: { id: deleted.id, deletedAt: deleted.deletedAt },
    });
  } catch (error) {
    console.error("DELETE /api/stories/[storyId]/chapters/[chapterId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete chapter" } },
      { status: 500 }
    );
  }
}
