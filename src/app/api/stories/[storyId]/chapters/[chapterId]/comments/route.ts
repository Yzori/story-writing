import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validations";

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
        and(eq(comments.storyId, storyId), eq(comments.chapterId, chapterId))
      )
      .orderBy(asc(comments.createdAt));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(
      "GET /api/stories/[storyId]/chapters/[chapterId]/comments error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch comments" } },
      { status: 500 }
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

    const [created] = await db
      .insert(comments)
      .values({
        userId,
        chapterId,
        storyId,
        parentId: parentId ?? null,
        content,
      })
      .returning();

    // Fetch the created comment with user info
    const [result] = await db
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

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error(
      "POST /api/stories/[storyId]/chapters/[chapterId]/comments error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create comment" } },
      { status: 500 }
    );
  }
}
