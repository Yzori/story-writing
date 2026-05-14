import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chapters, chapterSnapshots, stories, follows, collaborators } from "@/server/db/schema";
import { eq, and, isNull, asc, count, ne, sql as dsql } from "drizzle-orm";
import { updateChapterSchema } from "@/lib/validations";
import { countWords } from "@/lib/utils";
import { sanitizeHtml } from "@/server/sanitize";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createBulkNotifications } from "@/server/services/notifications";

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

    // Draft chapters require ownership or collaborator access
    if (chapter.status !== "published") {
      const story = await db.query.stories.findFirst({
        where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
      });
      if (!story) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Chapter not found" } },
          { status: 404 }
        );
      }
      const isOwner = story.userId === session?.user?.id;
      if (!isOwner) {
        let isCollab = false;
        if (session?.user?.id && story.writingMode !== "solo") {
          const collab = await db.query.collaborators.findFirst({
            where: and(
              eq(collaborators.storyId, storyId),
              eq(collaborators.userId, session.user.id),
              eq(collaborators.status, "accepted")
            ),
          });
          isCollab = !!collab;
        }
        if (!isCollab) {
          return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "Chapter not found" } },
            { status: 404 }
          );
        }
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

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { storyId, chapterId } = await params;
    const { story, isOwner } = await verifyStoryOwnership(storyId, session.user.id);

    if (!isOwner) {
      // Check if user is an accepted collaborator on non-solo stories
      let isCollab = false;
      if (story && story.writingMode !== "solo") {
        const collab = await db.query.collaborators.findFirst({
          where: and(
            eq(collaborators.storyId, storyId),
            eq(collaborators.userId, session.user.id),
            eq(collaborators.status, "accepted")
          ),
        });
        isCollab = !!collab;
      }
      if (!isCollab) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Not authorized to edit this chapter" } },
          { status: 403 }
        );
      }
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

    // Only bump version when content changes — metadata-only patches (title,
    // status, outline, authorNote) must not desync the client's baseVersion,
    // otherwise the next content autosave conflicts and the user's edits get
    // dumped to localStorage with no recovery path.
    const updateData: Record<string, unknown> = {
      ...updateFields,
      updatedAt: new Date(),
      ...(updateFields.content !== undefined && {
        version: existing.version + 1,
      }),
    };

    // Webtoon content is JSON (panel arrays) — skip HTML sanitization and word counting
    const isWebtoon = story?.format === "webtoon";

    if (updateData.content && !isWebtoon) {
      updateData.content = sanitizeHtml(updateData.content as string);
    }

    if (updateFields.content !== undefined && !isWebtoon) {
      updateData.wordCount = countWords(updateFields.content);
    }

    // Optimistic lock guard: only update when the row's version still matches
    // what we read. If another writer bumped version between our read and
    // write, this returns zero rows and we surface a CONFLICT below.
    const contentChanging = updateFields.content !== undefined;
    const [updated] = await db
      .update(chapters)
      .set(updateData)
      .where(
        and(
          eq(chapters.id, chapterId),
          // Only enforce version match when we're bumping it — metadata-only
          // patches don't compete on version so they should always succeed.
          contentChanging ? eq(chapters.version, existing.version) : dsql`true`,
        ),
      )
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

    // Auto-snapshot on version milestones (every 10 saves) or on content change > 20%
    if (updateFields.content !== undefined && updated.version > 1) {
      const shouldSnapshot = updated.version % 10 === 0;
      // Also snapshot if this is a significant content change (word count diff > 20%)
      const oldWords = existing.wordCount || 0;
      const newWords = updated.wordCount || 0;
      const significantChange = oldWords > 50 && Math.abs(newWords - oldWords) / oldWords > 0.2;

      if (shouldSnapshot || significantChange) {
        // Save the PREVIOUS content as a snapshot (what it was before this edit)
        db.insert(chapterSnapshots)
          .values({
            chapterId,
            content: existing.content || "",
            wordCount: existing.wordCount || 0,
            label: significantChange && !shouldSnapshot
              ? `Auto-save (${oldWords > newWords ? "major cut" : "major addition"})`
              : `Auto-save v${existing.version}`,
            userId: session.user.id,
            version: existing.version,
          })
          .then(() => {
            // Prune old auto-snapshots: keep last 50, named versions are permanent
            const MAX_AUTO_SNAPSHOTS = 50;
            db.select({ total: count() })
              .from(chapterSnapshots)
              .where(and(
                eq(chapterSnapshots.chapterId, chapterId),
                dsql`(${chapterSnapshots.label} LIKE 'Auto-save%')`,
              ))
              .then(([{ total }]) => {
                if (total > MAX_AUTO_SNAPSHOTS) {
                  // Delete oldest auto-snapshots beyond the limit
                  db.execute(dsql`
                    DELETE FROM chapter_snapshots
                    WHERE id IN (
                      SELECT id FROM chapter_snapshots
                      WHERE chapter_id = ${chapterId}
                        AND label LIKE 'Auto-save%'
                      ORDER BY created_at ASC
                      LIMIT ${total - MAX_AUTO_SNAPSHOTS}
                    )
                  `).catch((err) => console.error("Snapshot prune failed:", err));
                }
              })
              .catch((err) => console.error("Snapshot count failed:", err));
          })
          .catch((err) => console.error("Auto-snapshot failed:", err));
      }
    }

    // Notify followers when a chapter is newly published
    let notifiedFollowers = 0;
    let storySlug: string | null = null;
    if (
      parsed.data.status === "published" &&
      existing.status !== "published"
    ) {
      const story = await db.query.stories.findFirst({
        where: eq(stories.id, storyId),
      });
      if (story) {
        storySlug = story.slug ?? null;
        const followerRows = await db
          .select({ userId: follows.userId })
          .from(follows)
          .where(eq(follows.storyId, storyId));
        const followerIds = followerRows
          .map((f) => f.userId)
          .filter((id) => id !== session.user.id);
        notifiedFollowers = followerIds.length;
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

    return NextResponse.json({
      data: updated,
      meta: { notifiedFollowers, storySlug },
    });
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
      .where(and(eq(chapters.id, chapterId), eq(chapters.storyId, storyId)))
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
