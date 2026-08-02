import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { annotations, chapters, stories, users } from "@/server/db/schema";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createAnnotationSchema } from "@/lib/validations";
import { createNotification } from "@/server/services/notifications";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

/**
 * GET /api/stories/[storyId]/chapters/[chapterId]/annotations
 * Returns public annotations + user's private annotations for a chapter.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read");
    if (rl) return rl;

    const { storyId, chapterId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    // Build WHERE: public OR (private AND owned by user)
    const conditions = userId
      ? and(
          eq(annotations.chapterId, chapterId),
          or(
            eq(annotations.visibility, "public"),
            and(eq(annotations.visibility, "private"), eq(annotations.userId, userId))
          )
        )
      : and(
          eq(annotations.chapterId, chapterId),
          eq(annotations.visibility, "public")
        );

    const rows = await db
      .select({
        id: annotations.id,
        startOffset: annotations.startOffset,
        endOffset: annotations.endOffset,
        content: annotations.content,
        visibility: annotations.visibility,
        createdAt: annotations.createdAt,
        userId: annotations.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(annotations)
      .leftJoin(users, eq(annotations.userId, users.id))
      .where(conditions)
      .orderBy(annotations.startOffset)
      .limit(200);

    return NextResponse.json({ data: rows });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/chapters/[chapterId]/annotations",
      "Failed to fetch annotations",
    );
  }
}

/**
 * POST /api/stories/[storyId]/chapters/[chapterId]/annotations
 * Create an annotation. Auth required.
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

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, chapterId } = await params;
    const body = await request.json();
    const validated = createAnnotationSchema.parse(body);

    // Verify chapter exists and is published
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

    const [annotation] = await db
      .insert(annotations)
      .values({
        chapterId,
        userId: session.user.id,
        startOffset: validated.startOffset,
        endOffset: validated.endOffset,
        content: validated.content,
        visibility: validated.visibility,
      })
      .returning();

    // Notify story owner if public annotation on someone else's story
    if (validated.visibility === "public") {
      const story = await db.query.stories.findFirst({
        where: eq(stories.id, storyId),
        columns: { userId: true },
      });
      if (story && story.userId !== session.user.id) {
        const senderName = session.user.name || "A reader";
        createNotification(
          story.userId,
          "annotation",
          `${senderName} left a note on your story`,
          `/story/${storyId}/read/${chapterId}`
        );
      }
    }

    return NextResponse.json({ data: annotation }, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/chapters/[chapterId]/annotations",
      "Failed to create annotation",
    );
  }
}
