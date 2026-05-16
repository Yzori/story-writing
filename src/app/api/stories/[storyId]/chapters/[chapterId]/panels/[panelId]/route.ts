import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { panels, chapters, stories, collaborators } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { updatePanelSchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string; panelId: string }>;
};

function countPanelWords(panelList: Array<{ caption?: string | null; overlays?: string | null }>) {
  return panelList.reduce((sum, panel) => {
    let text = panel.caption || "";
    try {
      const overlays = JSON.parse(panel.overlays || "[]");
      if (Array.isArray(overlays)) {
        text += ` ${overlays.map((overlay) => overlay?.text || "").join(" ")}`;
      }
    } catch {
      // Ignore malformed legacy overlay payloads when calculating counts.
    }

    const trimmed = text.trim();
    return sum + (trimmed ? trimmed.split(/\s+/).length : 0);
  }, 0);
}

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

    const body = await request.json();
    const parsed = updatePanelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
        { status: 400 }
      );
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

    // Update chapter word count if visible text changed
    if (parsed.data.caption !== undefined || parsed.data.overlays !== undefined) {
      const allPanels = await db.query.panels.findMany({
        where: eq(panels.chapterId, chapterId),
      });
      const wordCount = countPanelWords(allPanels);
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
    const wordCount = countPanelWords(allPanels);
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
