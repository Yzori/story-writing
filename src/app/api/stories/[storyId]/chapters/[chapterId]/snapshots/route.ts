import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chapterSnapshots, chapters } from "@/server/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";

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

    const snapshots = await db
      .select()
      .from(chapterSnapshots)
      .where(eq(chapterSnapshots.chapterId, chapterId))
      .orderBy(desc(chapterSnapshots.createdAt));

    return NextResponse.json({ data: snapshots });
  } catch (error) {
    console.error("GET snapshots error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch snapshots" } },
      { status: 500 }
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

    const [snapshot] = await db
      .insert(chapterSnapshots)
      .values({
        chapterId,
        content: check.chapter!.content || "",
        wordCount: check.chapter!.wordCount || 0,
        label,
        userId: session.user.id,
        version: (check.chapter as { version?: number }).version ?? null,
      })
      .returning();

    return NextResponse.json({ data: snapshot }, { status: 201 });
  } catch (error) {
    console.error("POST snapshots error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create snapshot" } },
      { status: 500 }
    );
  }
}
