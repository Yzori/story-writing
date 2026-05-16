import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chapterSnapshots, chapters } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string; snapshotId: string }>;
};

async function verifyChapterAccess(storyId: string, chapterId: string, userId: string) {
  const check = await verifyCollaboratorAccess(storyId, userId);
  if (check.error) return { error: check.error };

  const chapter = await db.query.chapters.findFirst({
    where: and(
      eq(chapters.id, chapterId),
      eq(chapters.storyId, storyId),
      isNull(chapters.deletedAt),
    ),
  });

  if (!chapter) return { error: "NOT_FOUND" as const };
  return { chapter };
}

/**
 * DELETE /api/stories/[storyId]/chapters/[chapterId]/snapshots/[snapshotId]
 * Delete one saved version. Requires ownership or collaborator access.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { storyId, chapterId, snapshotId } = await params;
    const check = await verifyChapterAccess(storyId, chapterId, session.user.id);
    if ("error" in check && check.error) {
      const status = check.error === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json(
        {
          error: {
            code: check.error,
            message: check.error === "FORBIDDEN" ? "Not authorized" : "Not found",
          },
        },
        { status },
      );
    }

    const existing = await db.query.chapterSnapshots.findFirst({
      where: and(
        eq(chapterSnapshots.id, snapshotId),
        eq(chapterSnapshots.chapterId, chapterId),
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Version not found" } },
        { status: 404 },
      );
    }

    await db.delete(chapterSnapshots).where(eq(chapterSnapshots.id, snapshotId));

    return NextResponse.json({ data: { id: snapshotId, deleted: true } });
  } catch (error) {
    console.error("DELETE snapshot error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete version" } },
      { status: 500 },
    );
  }
}
