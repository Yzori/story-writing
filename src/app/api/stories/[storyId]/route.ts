import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { stories, chapters, bibleEntries, users, collaborators } from "@/server/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { updateStorySchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]
 * Get a single story with chapters (without content), bible entries, and author info.
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
    const canReadDrafts = isOwner || isCollaborator;

    const hasPublicAccess =
      story.isPublic &&
      (story.status === "published" || story.writingMode === "campaign");

    if (!canReadDrafts && !hasPublicAccess) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Get author info
    const [author] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        name: users.name,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, story.userId))
      .limit(1);

    const chapterConditions = [eq(chapters.storyId, storyId), isNull(chapters.deletedAt)];
    if (!canReadDrafts) {
      chapterConditions.push(eq(chapters.status, "published"));
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
      .where(and(...chapterConditions))
      .orderBy(asc(chapters.sortOrder));

    const storyBibleEntries = canReadDrafts
      ? await db
          .select()
          .from(bibleEntries)
          .where(eq(bibleEntries.storyId, storyId))
          .orderBy(asc(bibleEntries.sortOrder))
      : [];

    // Parse contentNotes JSON string to array
    let parsedContentNotes: string[] = [];
    try { parsedContentNotes = story.contentNotes ? JSON.parse(story.contentNotes) : []; } catch { /* corrupted JSON */ }

    return NextResponse.json({
      data: {
        ...story,
        contentNotes: parsedContentNotes,
        author: author
          ? {
              id: author.id,
              displayName: author.displayName ?? author.name,
              avatarUrl: author.avatarUrl,
              bio: author.bio,
              role: author.role,
            }
          : null,
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
 * Update story fields. Requires ownership.
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

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

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

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
      );
    }

    // Serialize contentNotes array to JSON string for storage
    const { contentNotes, ...restData } = parsed.data;
    // Set publishedAt when first published
    const setData: Record<string, unknown> = {
      ...restData,
      updatedAt: new Date(),
      ...(contentNotes !== undefined && {
        contentNotes: JSON.stringify(contentNotes),
      }),
    };
    if (parsed.data.isPublic === true && !existing.publishedAt) {
      setData.publishedAt = new Date();
    }

    const [updated] = await db
      .update(stories)
      .set(setData)
      .where(eq(stories.id, storyId))
      .returning();

    return NextResponse.json({
      data: {
        ...updated,
        contentNotes: updated.contentNotes ? JSON.parse(updated.contentNotes) : [],
      },
    });
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
 * Soft delete. Requires ownership.
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

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

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

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
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
