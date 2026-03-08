import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bibleEntries, stories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { updateBibleEntrySchema } from "@/lib/validations";

// TODO: Add auth checks — the auth agent handles that

type RouteParams = {
  params: Promise<{ storyId: string; entryId: string }>;
};

/**
 * PATCH /api/stories/[storyId]/bible/[entryId]
 * Update a bible entry.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, entryId } = await params;
    const body = await request.json();
    const parsed = updateBibleEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const existing = await db.query.bibleEntries.findFirst({
      where: and(
        eq(bibleEntries.id, entryId),
        eq(bibleEntries.storyId, storyId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Bible entry not found" } },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(bibleEntries)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(bibleEntries.id, entryId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/stories/[storyId]/bible/[entryId] error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update bible entry",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/bible/[entryId]
 * Hard delete a bible entry.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, entryId } = await params;

    const existing = await db.query.bibleEntries.findFirst({
      where: and(
        eq(bibleEntries.id, entryId),
        eq(bibleEntries.storyId, storyId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Bible entry not found" } },
        { status: 404 }
      );
    }

    await db
      .delete(bibleEntries)
      .where(eq(bibleEntries.id, entryId));

    return NextResponse.json({ data: { id: entryId, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/stories/[storyId]/bible/[entryId] error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete bible entry",
        },
      },
      { status: 500 }
    );
  }
}
