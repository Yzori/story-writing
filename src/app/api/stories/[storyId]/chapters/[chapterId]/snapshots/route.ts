import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chapterSnapshots, chapters, stories } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

async function verifyOwnership(storyId: string, chapterId: string, userId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });
  if (!story) return { error: "NOT_FOUND" as const };
  if (story.userId !== userId) return { error: "FORBIDDEN" as const };

  const chapter = await db.query.chapters.findFirst({
    where: and(
      eq(chapters.id, chapterId),
      eq(chapters.storyId, storyId),
      isNull(chapters.deletedAt)
    ),
  });
  if (!chapter) return { error: "NOT_FOUND" as const };
  return { story, chapter };
}

/**
 * GET /api/stories/[storyId]/chapters/[chapterId]/snapshots
 * List snapshots for a chapter. Requires ownership.
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
    const check = await verifyOwnership(storyId, chapterId, session.user.id);
    if ("error" in check) {
      const status = check.error === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json(
        { error: { code: check.error, message: check.error === "FORBIDDEN" ? "You don't own this story" : "Not found" } },
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
 * Create a snapshot of the current chapter content. Requires ownership.
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

    const { storyId, chapterId } = await params;
    const check = await verifyOwnership(storyId, chapterId, session.user.id);
    if ("error" in check) {
      const status = check.error === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json(
        { error: { code: check.error, message: check.error === "FORBIDDEN" ? "You don't own this story" : "Not found" } },
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
