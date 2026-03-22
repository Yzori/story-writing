import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { panels, chapters, stories } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { updatePanelSchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string; panelId: string }>;
};

/**
 * PATCH /api/stories/[storyId]/chapters/[chapterId]/panels/[panelId]
 * Update a single panel's fields. Requires story ownership.
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

    const { storyId, chapterId, panelId } = await params;

    // Verify ownership
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story || story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updatePanelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    // Verify panel belongs to this chapter
    const existing = await db.query.panels.findFirst({
      where: and(eq(panels.id, panelId), eq(panels.chapterId, chapterId)),
    });
    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Panel not found" } },
        { status: 404 }
      );
    }

    const [updated] = await db.update(panels)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(panels.id, panelId))
      .returning();

    // Update chapter word count if caption changed
    if (parsed.data.caption !== undefined) {
      const allPanels = await db.query.panels.findMany({
        where: eq(panels.chapterId, chapterId),
      });
      const wordCount = allPanels.reduce((sum, p) => {
        const text = (p.caption || "").trim();
        return sum + (text ? text.split(/\s+/).length : 0);
      }, 0);
      await db.update(chapters)
        .set({ wordCount, updatedAt: new Date() })
        .where(eq(chapters.id, chapterId));
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH panel error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update panel" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/chapters/[chapterId]/panels/[panelId]
 * Remove a single panel. Requires story ownership.
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

    const { storyId, chapterId, panelId } = await params;

    // Verify ownership
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story || story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
      );
    }

    // Verify panel belongs to this chapter
    const existing = await db.query.panels.findFirst({
      where: and(eq(panels.id, panelId), eq(panels.chapterId, chapterId)),
    });
    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Panel not found" } },
        { status: 404 }
      );
    }

    await db.delete(panels).where(eq(panels.id, panelId));

    // Update chapter word count
    const allPanels = await db.query.panels.findMany({
      where: eq(panels.chapterId, chapterId),
    });
    const wordCount = allPanels.reduce((sum, p) => {
      const text = (p.caption || "").trim();
      return sum + (text ? text.split(/\s+/).length : 0);
    }, 0);
    await db.update(chapters)
      .set({ wordCount, updatedAt: new Date() })
      .where(eq(chapters.id, chapterId));

    return NextResponse.json({ data: { id: panelId, deleted: true } });
  } catch (error) {
    console.error("DELETE panel error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete panel" } },
      { status: 500 }
    );
  }
}
