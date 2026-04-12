import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { annotations } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string; annotationId: string }>;
};

/**
 * DELETE /api/stories/[storyId]/chapters/[chapterId]/annotations/[annotationId]
 * Delete own annotation.
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

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { annotationId } = await params;

    const deleted = await db
      .delete(annotations)
      .where(
        and(
          eq(annotations.id, annotationId),
          eq(annotations.userId, session.user.id)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Annotation not found or not owned by you" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE annotation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete annotation" } },
      { status: 500 }
    );
  }
}
