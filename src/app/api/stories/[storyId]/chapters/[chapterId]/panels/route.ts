import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { panels, chapters, stories, collaborators } from "@/server/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { createPanelsSchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

/**
 * GET /api/stories/[storyId]/chapters/[chapterId]/panels
 * Returns all panels for a chapter, ordered by sortOrder.
 * Published chapters are public; draft chapters require ownership.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, chapterId } = await params;
    const session = await auth();

    // Verify chapter exists
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

    // Draft chapters require ownership
    if (chapter.status !== "published") {
      const story = await db.query.stories.findFirst({
        where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
      });
      if (!story || story.userId !== session?.user?.id) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Chapter not found" } },
          { status: 404 }
        );
      }
    }

    // Lazy migration: if no panels in DB but chapter content has JSON panel data,
    // migrate them into the panels table
    const existingPanels = await db.query.panels.findMany({
      where: eq(panels.chapterId, chapterId),
      orderBy: [asc(panels.sortOrder)],
    });

    if (existingPanels.length === 0 && chapter.content) {
      try {
        const parsed = JSON.parse(chapter.content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].imageDataUrl) {
          // Migrate legacy panel data
          const migrated = await db.insert(panels).values(
            parsed.map((p: { id?: string; imageDataUrl: string; caption?: string; order?: number }, i: number) => ({
              chapterId,
              imageData: p.imageDataUrl,
              caption: p.caption || "",
              sortOrder: p.order ?? i,
            }))
          ).returning();

          // Clear the chapter content now that panels are in their own table
          await db.update(chapters)
            .set({ content: "", updatedAt: new Date() })
            .where(eq(chapters.id, chapterId));

          return NextResponse.json({ data: migrated });
        }
      } catch {
        // Not JSON or migration failed — just return empty
      }
    }

    return NextResponse.json({ data: existingPanels });
  } catch (error) {
    console.error("GET panels error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch panels" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/chapters/[chapterId]/panels
 * Create one or more panels. Requires story ownership.
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

    // Verify chapter exists
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

    const body = await request.json();
    const parsed = createPanelsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const created = await db.insert(panels).values(
      parsed.data.panels.map((p) => ({
        chapterId,
        imageData: p.imageData,
        caption: p.caption || "",
        sortOrder: p.sortOrder,
        sizing: p.sizing || "standard",
        aspectRatio: p.aspectRatio || null,
        overlays: p.overlays || "[]",
      }))
    ).returning();

    // Update chapter word count from all panel captions
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

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST panels error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create panels" } },
      { status: 500 }
    );
  }
}
