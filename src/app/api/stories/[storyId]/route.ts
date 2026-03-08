import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories, chapters, bibleEntries } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { updateStorySchema } from "@/lib/validations";

// TODO: Add auth checks — the auth agent handles that

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]
 * Get a single story with chapters (without content) and bible entries.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const storyChapters = await db
      .select({
        id: chapters.id,
        storyId: chapters.storyId,
        title: chapters.title,
        wordCount: chapters.wordCount,
        sortOrder: chapters.sortOrder,
        status: chapters.status,
        authorNoteBefore: chapters.authorNoteBefore,
        authorNoteAfter: chapters.authorNoteAfter,
        outline: chapters.outline,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
      })
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)))
      .orderBy(asc(chapters.sortOrder));

    const storyBibleEntries = await db
      .select()
      .from(bibleEntries)
      .where(eq(bibleEntries.storyId, storyId))
      .orderBy(asc(bibleEntries.sortOrder));

    return NextResponse.json({
      data: {
        ...story,
        chapters: storyChapters,
        bibleEntries: storyBibleEntries,
      },
    });
  } catch (error) {
    console.error("GET /api/stories/[storyId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch story" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/stories/[storyId]
 * Update story fields.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;
    const body = await request.json();
    const parsed = updateStorySchema.safeParse(body);

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

    const existing = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(stories)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, storyId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/stories/[storyId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update story" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId]
 * Soft delete — sets deleted_at timestamp.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;

    const existing = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const [deleted] = await db
      .update(stories)
      .set({ deletedAt: new Date() })
      .where(eq(stories.id, storyId))
      .returning();

    return NextResponse.json({ data: { id: deleted.id, deletedAt: deleted.deletedAt } });
  } catch (error) {
    console.error("DELETE /api/stories/[storyId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete story" } },
      { status: 500 }
    );
  }
}
