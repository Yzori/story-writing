import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chapters, stories, follows } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { updateChapterSchema } from "@/lib/validations";
import { countWords } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { auth } from "@/lib/auth";
import { createBulkNotifications } from "@/lib/notifications";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

/** Verify the story exists and return it + ownership check */
async function verifyStoryOwnership(storyId: string, userId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });
  if (!story) return { story: null, isOwner: false };
  return { story, isOwner: story.userId === userId };
}

/**
 * GET /api/stories/[storyId]/chapters/[chapterId]
 * Get a single chapter with content.
 * Published chapters are public; draft chapters require ownership.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, chapterId } = await params;
    const session = await auth();

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

    // Draft chapters require ownership
    if (chapter.status !== "published") {
      const story = await db.query.stories.findFirst({
        where: eq(stories.id, storyId),
      });
      if (!story || story.userId !== session?.user?.id) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Chapter not found" } },
          { status: 404 }
        );
      }
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
 * Update chapter fields. Requires ownership.
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

    const { storyId, chapterId } = await params;
    const { isOwner } = await verifyStoryOwnership(storyId, session.user.id);

    if (!isOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
      );
    }

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

    // Optimistic locking: reject if version doesn't match
    const { baseVersion, ...updateFields } = parsed.data;
    if (baseVersion !== undefined && baseVersion !== existing.version) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "This chapter was modified by another user. Reload to see their changes.",
          },
          data: {
            serverVersion: existing.version,
            clientVersion: baseVersion,
          },
        },
        { status: 409 }
      );
    }

    const updateData: Record<string, unknown> = {
      ...updateFields,
      updatedAt: new Date(),
      version: existing.version + 1,
    };

    if (updateData.content) {
      updateData.content = sanitizeHtml(updateData.content as string);
    }

    if (updateFields.content !== undefined) {
      updateData.wordCount = countWords(updateFields.content);
    }

    const [updated] = await db
      .update(chapters)
      .set(updateData)
      .where(and(eq(chapters.id, chapterId), eq(chapters.version, existing.version)))
      .returning();

    // If update returned nothing, another concurrent write won the race
    if (!updated) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "This chapter was modified by another user. Reload to see their changes.",
          },
        },
        { status: 409 }
      );
    }

    // Notify followers when a chapter is newly published
    if (
      parsed.data.status === "published" &&
      existing.status !== "published"
    ) {
      const story = await db.query.stories.findFirst({
        where: eq(stories.id, storyId),
      });
      if (story) {
        const followerRows = await db
          .select({ userId: follows.userId })
          .from(follows)
          .where(eq(follows.storyId, storyId));
        const followerIds = followerRows
          .map((f) => f.userId)
          .filter((id) => id !== session.user.id);
        if (followerIds.length > 0) {
          createBulkNotifications(
            followerIds,
            "chapter",
            `New chapter "${updated.title}" in "${story.title}"`,
            `/story/${story.slug || storyId}/read/${chapterId}`
          );
        }
      }
    }

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

    const { storyId, chapterId } = await params;
    const { isOwner } = await verifyStoryOwnership(storyId, session.user.id);

    if (!isOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
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
