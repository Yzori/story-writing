import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chapterSnapshots, chapters } from "@/server/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { sanitizeHtml } from "@/server/sanitize";
import { countWords } from "@/lib/utils";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

async function verifyChapterAccess(storyId: string, chapterId: string, userId: string) {
  const check = await verifyCollaboratorAccess(storyId, userId);
  if (check.error) return { error: check.error };

  const chapter = await db.query.chapters.findFirst({
    where: and(
      eq(chapters.id, chapterId),
      eq(chapters.storyId, storyId),
      isNull(chapters.deletedAt)
    ),
  });
  if (!chapter) return { error: "NOT_FOUND" as const };
  return { story: check.story, chapter };
}

/**
 * GET /api/stories/[storyId]/chapters/[chapterId]/snapshots
 * List snapshots for a chapter. Requires ownership or collaborator access.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId, chapterId } = await params;
    const check = await verifyChapterAccess(storyId, chapterId, session.user.id);
    if ("error" in check && check.error) {
      const status = check.error === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json(
        { error: { code: check.error, message: check.error === "FORBIDDEN" ? "Not authorized" : "Not found" } },
        { status }
      );
    }

    // Content-free projection: every row would otherwise carry a full
    // copy of the chapter (up to 50 are kept), just to render a list of
    // labels. The [snapshotId] GET serves the body on demand.
    const snapshots = await db
      .select({
        id: chapterSnapshots.id,
        chapterId: chapterSnapshots.chapterId,
        userId: chapterSnapshots.userId,
        label: chapterSnapshots.label,
        wordCount: chapterSnapshots.wordCount,
        version: chapterSnapshots.version,
        createdAt: chapterSnapshots.createdAt,
      })
      .from(chapterSnapshots)
      .where(eq(chapterSnapshots.chapterId, chapterId))
      .orderBy(desc(chapterSnapshots.createdAt))
      .limit(50);

    return NextResponse.json({ data: snapshots });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/chapters/[chapterId]/snapshots",
      "Failed to fetch snapshots",
    );
  }
}

/**
 * POST /api/stories/[storyId]/chapters/[chapterId]/snapshots
 * Create a snapshot of the current chapter content. Requires ownership or collaborator access.
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

    const { storyId, chapterId } = await params;
    const check = await verifyChapterAccess(storyId, chapterId, session.user.id);
    if ("error" in check && check.error) {
      const status = check.error === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json(
        { error: { code: check.error, message: check.error === "FORBIDDEN" ? "Not authorized" : "Not found" } },
        { status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === "string" ? body.label.slice(0, 200) : "";
    const content =
      typeof body.content === "string"
        ? sanitizeHtml(body.content)
        : check.chapter!.content || "";
    const wordCount =
      typeof body.wordCount === "number" && Number.isFinite(body.wordCount)
        ? Math.max(0, Math.round(body.wordCount))
        : countWords(content);
    const version =
      typeof body.version === "number" && Number.isFinite(body.version)
        ? Math.max(1, Math.round(body.version))
        : (check.chapter as { version?: number }).version ?? null;

    const [snapshot] = await db
      .insert(chapterSnapshots)
      .values({
        chapterId,
        content,
        wordCount,
        label,
        userId: session.user.id,
        version,
      })
      .returning();

    return NextResponse.json({ data: snapshot }, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/chapters/[chapterId]/snapshots",
      "Failed to create snapshot",
    );
  }
}
