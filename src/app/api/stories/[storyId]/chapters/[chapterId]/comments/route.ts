import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { comments, users, stories, chapters } from "@/server/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createCommentSchema } from "@/lib/validations";
import { createNotification } from "@/server/services/notifications";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

/**
 * GET /api/stories/[storyId]/chapters/[chapterId]/comments
 * List comments for a chapter, sorted by createdAt ascending.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, chapterId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const offset = (page - 1) * limit;

    const result = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        chapterId: comments.chapterId,
        storyId: comments.storyId,
        parentId: comments.parentId,
        content: comments.content,
        deletedAt: comments.deletedAt,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(
        and(eq(comments.storyId, storyId), eq(comments.chapterId, chapterId), isNull(comments.deletedAt))
      )
      .orderBy(asc(comments.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = result.length > limit;
    const data = hasMore ? result.slice(0, limit) : result;

    return NextResponse.json({ data, hasMore });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/chapters/[chapterId]/comments",
      "Failed to fetch comments",
    );
  }
}

/**
 * POST /api/stories/[storyId]/chapters/[chapterId]/comments
 * Create a comment on a chapter. Requires authentication.
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
    const body = await request.json();

    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
          },
        },
        { status: 400 }
      );
    }

    const { content, parentId } = parsed.data;
    const userId = session.user.id;

    // Verify story exists and chapter is published
    const storyRecord = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!storyRecord) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const chapterRecord = await db.query.chapters.findFirst({
      where: and(
        eq(chapters.id, chapterId),
        eq(chapters.storyId, storyId),
        eq(chapters.status, "published"),
        isNull(chapters.deletedAt)
      ),
    });
    if (!chapterRecord) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found or not published" } },
        { status: 404 }
      );
    }

    // Insert comment and fetch with user info in a single transaction
    const result = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(comments)
        .values({
          userId,
          chapterId,
          storyId,
          parentId: parentId ?? null,
          content,
        })
        .returning();

      const [withUser] = await tx
        .select({
          id: comments.id,
          userId: comments.userId,
          chapterId: comments.chapterId,
          storyId: comments.storyId,
          parentId: comments.parentId,
          content: comments.content,
          deletedAt: comments.deletedAt,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          user: {
            id: users.id,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, created.id))
        .limit(1);

      return withUser;
    });

    // Notify story owner (fire-and-forget, outside transaction)
    if (storyRecord.userId !== userId) {
      const name = session.user.name || "Someone";
      const chapterLabel = chapterRecord.title || "a chapter";
      createNotification(
        storyRecord.userId,
        "comment",
        `${name} commented on "${chapterLabel}" in "${storyRecord.title}"`,
        `/story/${storyRecord.slug || storyId}/read/${chapterId}`
      );
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/chapters/[chapterId]/comments",
      "Failed to create comment",
    );
  }
}
