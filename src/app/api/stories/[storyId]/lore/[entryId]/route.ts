import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { loreEntries, stories } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { updateLoreEntrySchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";

type RouteParams = {
  params: Promise<{ storyId: string; entryId: string }>;
};

/**
 * PATCH /api/stories/[storyId]/lore/[entryId]
 * Update a lore entry. Author of entry or story owner.
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

    const { storyId, entryId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    const story = check.story!;

    const existing = await db.query.loreEntries.findFirst({
      where: and(
        eq(loreEntries.id, entryId),
        eq(loreEntries.storyId, storyId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Lore entry not found" } },
        { status: 404 }
      );
    }

    // Only entry author or story owner can edit
    const isOwner = story.userId === session.user.id;
    const isAuthor = existing.userId === session.user.id;
    if (!isOwner && !isAuthor) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the entry author or story owner can edit" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateLoreEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(loreEntries)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(loreEntries.id, entryId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/stories/[storyId]/lore/[entryId]",
      "Failed to update lore entry",
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/lore/[entryId]
 * Delete a lore entry. Author of entry or story owner.
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

    const { storyId, entryId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    const story = check.story!;

    const existing = await db.query.loreEntries.findFirst({
      where: and(
        eq(loreEntries.id, entryId),
        eq(loreEntries.storyId, storyId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Lore entry not found" } },
        { status: 404 }
      );
    }

    // Only entry author or story owner can delete
    const isOwner = story.userId === session.user.id;
    const isAuthor = existing.userId === session.user.id;
    if (!isOwner && !isAuthor) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the entry author or story owner can delete" } },
        { status: 403 }
      );
    }

    await db
      .delete(loreEntries)
      .where(eq(loreEntries.id, entryId));

    return NextResponse.json({ data: { id: entryId, deleted: true } });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/stories/[storyId]/lore/[entryId]",
      "Failed to delete lore entry",
    );
  }
}
