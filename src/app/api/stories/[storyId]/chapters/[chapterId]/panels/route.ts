import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { panels, chapters, stories, collaborators, contentUnlocks } from "@/server/db/schema";
import { eq, and, isNull, asc, desc, sql } from "drizzle-orm";
import { createPanelsSchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { TIER_PRICES } from "@/lib/constants";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
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
 * GET /api/stories/[storyId]/chapters/[chapterId]/panels
 * Returns all panels for a chapter, ordered by sortOrder.
 * Published chapters are public; draft chapters require ownership.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, chapterId } = await params;
    const session = await auth();

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    const isOwner = story.userId === session?.user?.id;
    let isCollaborator = false;
    if (!isOwner && session?.user?.id && story.writingMode !== "solo") {
      const collab = await db.query.collaborators.findFirst({
        where: and(
          eq(collaborators.storyId, storyId),
          eq(collaborators.userId, session.user.id),
          eq(collaborators.status, "accepted")
        ),
      });
      isCollaborator = !!collab;
    }

    const canReadDrafts = isOwner || isCollaborator;
    const hasPublicStoryAccess =
      story.isPublic &&
      (story.status === "published" || story.writingMode === "campaign");

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

    if (chapter.status !== "published" && !canReadDrafts) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    if (chapter.status === "published" && !canReadDrafts && !hasPublicStoryAccess) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 }
      );
    }

    const price = TIER_PRICES[chapter.gatingTier] ?? 0;
    const isEarlyAccess =
      chapter.earlyAccessUntil && new Date(chapter.earlyAccessUntil) > new Date();
    const requiresUnlock = price > 0 || Boolean(isEarlyAccess);

    if (chapter.status === "published" && !canReadDrafts && requiresUnlock) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: { code: "LOCKED", message: "This chapter requires an unlock" } },
          { status: 402 }
        );
      }

      const [unlock] = await db
        .select({ id: contentUnlocks.id })
        .from(contentUnlocks)
        .where(
          and(
            eq(contentUnlocks.userId, session.user.id),
            eq(contentUnlocks.chapterId, chapterId)
          )
        )
        .limit(1);

      if (!unlock) {
        return NextResponse.json(
          { error: { code: "LOCKED", message: "This chapter requires an unlock" } },
          { status: 402 }
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
          // Migrate legacy panel data. Concurrent first readers race this
          // check-then-insert, so take the same lock POST uses and re-check
          // emptiness after acquiring it — otherwise every panel is inserted
          // once per overlapping reader.
          const migrated = await db.transaction(async (tx) => {
            await tx.execute(sql`LOCK TABLE "panels" IN SHARE ROW EXCLUSIVE MODE`);

            const alreadyMigrated = await tx.query.panels.findMany({
              where: eq(panels.chapterId, chapterId),
              orderBy: [asc(panels.sortOrder)],
            });
            if (alreadyMigrated.length > 0) return alreadyMigrated;

            const inserted = await tx.insert(panels).values(
              parsed.map((p: { id?: string; imageDataUrl: string; caption?: string; order?: number }, i: number) => ({
                chapterId,
                imageData: p.imageDataUrl,
                caption: p.caption || "",
                sortOrder: p.order ?? i,
                layout: "single",
                frames: JSON.stringify([{ id: p.id || `legacy-${i}`, imageData: p.imageDataUrl }]),
                borderStyle: "none",
                imageFit: "cover",
              }))
            ).returning();

            // Clear the chapter content now that panels are in their own table
            await tx.update(chapters)
              .set({ content: "", updatedAt: new Date() })
              .where(eq(chapters.id, chapterId));

            return inserted;
          });

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

    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`LOCK TABLE "panels" IN SHARE ROW EXCLUSIVE MODE`);

      const [lastPanel] = await tx.query.panels.findMany({
        where: eq(panels.chapterId, chapterId),
        orderBy: [desc(panels.sortOrder)],
        limit: 1,
      });
      const nextSortOrder = (lastPanel?.sortOrder ?? -1) + 1;

      return tx.insert(panels).values(
        parsed.data.panels.map((p, index) => ({
          chapterId,
          imageData: p.imageData,
          caption: p.caption || "",
          sortOrder: nextSortOrder + index,
          sizing: p.sizing || "standard",
          layout: p.layout || "single",
          frames: p.frames || JSON.stringify([{ id: "frame-1", imageData: p.imageData }]),
          borderStyle: p.borderStyle || "none",
          imageFit: p.imageFit || "cover",
          aspectRatio: p.aspectRatio || null,
          overlays: p.overlays || "[]",
          seam: p.seam || "none",
        }))
      ).returning();
    });

    // Update chapter word count from all panel captions
    const allPanels = await db.query.panels.findMany({
      where: eq(panels.chapterId, chapterId),
    });
    const wordCount = countPanelWords(allPanels);
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
