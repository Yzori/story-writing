import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chapters, stories } from "@/lib/db/schema";
import { eq, and, isNull, asc, sql } from "drizzle-orm";
import { createChapterSchema } from "@/lib/validations";
import { countWords } from "@/lib/utils";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/chapters
 * List chapters for a story (without content by default, ordered by sort_order).
 * ?withContent=true includes content (requires ownership).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;
    const session = await auth();

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const isOwner = session?.user?.id === story.userId;
    const { searchParams } = new URL(request.url);
    const withContent = searchParams.get("withContent") === "true";

    // Only owners can fetch with content (used by editor)
    if (withContent && !isOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

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

    const conditions = [eq(chapters.storyId, storyId), isNull(chapters.deletedAt)];

    // Non-owners only see published chapters
    if (!isOwner) {
      conditions.push(eq(chapters.status, "published"));
    }

    const results = await db
      .select(selectFields as any)
      .from(chapters)
      .where(and(...conditions))
      .orderBy(asc(chapters.sortOrder), asc(chapters.createdAt));

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
 * Create a chapter. Requires ownership.
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
