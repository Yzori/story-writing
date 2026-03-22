import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chapters, stories, collaborators } from "@/server/db/schema";
import { eq, and, isNull, asc, sql } from "drizzle-orm";
import { createChapterSchema } from "@/lib/validations";
import { countWords } from "@/lib/utils";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

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

    // Check if user is an accepted collaborator (for co-op/campaign stories)
    let isCollaborator = false;
    if (!isOwner && session?.user?.id && story.writingMode !== "solo") {
      const collab = await db.query.collaborators.findFirst({
        where: and(
          eq(collaborators.storyId, storyId),
          eq(collaborators.userId, session.user.id),
          eq(collaborators.status, "accepted")
        ),
      });
      isCollaborator = !!collab;
    }

    // Owners and accepted collaborators can fetch with content (used by editor)
    if (withContent && !isOwner && !isCollaborator) {
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

    // Non-owners/non-collaborators only see published chapters
    if (!isOwner && !isCollaborator) {
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

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

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

    // Owner can always create; collaborators can create on co-op/campaign stories
    if (story.userId !== session.user.id) {
      let allowed = false;
      if (story.writingMode !== "solo") {
        const collab = await db.query.collaborators.findFirst({
          where: and(
            eq(collaborators.storyId, storyId),
            eq(collaborators.userId, session.user.id),
            eq(collaborators.status, "accepted")
          ),
        });
        allowed = !!collab;
      }
      if (!allowed) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Not authorized to create chapters" } },
          { status: 403 }
        );
      }
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
