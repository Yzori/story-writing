import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chapters, collaborators, panels, stories } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { reorderPanelsSchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

/**
 * PUT /api/stories/[storyId]/chapters/[chapterId]/panels/reorder
 * Batch-update panel sort orders.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Verify access
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (story.userId !== session.user.id) {
      const collab = await db.query.collaborators.findFirst({
        where: and(
          eq(collaborators.storyId, storyId),
          eq(collaborators.userId, session.user.id),
          eq(collaborators.status, "accepted")
        ),
      });
      if (!collab) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You don't have access to this story" } },
          { status: 403 }
        );
      }
    }

    const chapter = await db.query.chapters.findFirst({
      where: and(
        eq(chapters.id, chapterId),
        eq(chapters.storyId, storyId),
        isNull(chapters.deletedAt),
      ),
    });
    if (!chapter) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = reorderPanelsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    // Update each panel's sort order
    await Promise.all(
      parsed.data.panels.map((p) =>
        db.update(panels)
          .set({ sortOrder: p.sortOrder, updatedAt: new Date() })
          .where(and(eq(panels.id, p.id), eq(panels.chapterId, chapterId)))
      )
    );

    return NextResponse.json({ data: { reordered: true } });
  } catch (error) {
    console.error("PUT panels reorder error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to reorder panels" } },
      { status: 500 }
    );
  }
}
