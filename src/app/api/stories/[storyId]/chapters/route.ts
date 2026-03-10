import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chapters, stories } from "@/lib/db/schema";
import { eq, and, isNull, asc, sql } from "drizzle-orm";
import { createChapterSchema } from "@/lib/validations";
import { countWords } from "@/lib/utils";

// TODO: Add auth checks — the auth agent handles that

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/chapters
 * List chapters for a story (without content, ordered by sort_order).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;

    // Verify story exists
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const withContent = searchParams.get("withContent") === "true";

    const selectFields: Record<string, unknown> = {
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
    };

    if (withContent) {
      selectFields.content = chapters.content;
    }

    const results = await db
      .select(selectFields as any)
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)))
      .orderBy(asc(chapters.sortOrder));

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/chapters error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch chapters" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/chapters
 * Create a chapter. Auto-sets sort_order to max+1.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;
    const body = await request.json();
    const parsed = createChapterSchema.safeParse(body);

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

    // Verify story exists
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Get max sort_order for this story
    const [maxResult] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${chapters.sortOrder}), -1)` })
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)));

    const nextOrder = (maxResult?.maxOrder ?? -1) + 1;
    const content = parsed.data.content || "";
    const wordCount = countWords(content);

    const [chapter] = await db
      .insert(chapters)
      .values({
        storyId,
        title: parsed.data.title,
        content,
        wordCount,
        sortOrder: nextOrder,
        status: parsed.data.status || "draft",
        authorNoteBefore: parsed.data.authorNoteBefore || "",
        authorNoteAfter: parsed.data.authorNoteAfter || "",
        outline: parsed.data.outline || "",
      })
      .returning();

    return NextResponse.json({ data: chapter }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/chapters error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create chapter" } },
      { status: 500 }
    );
  }
}
