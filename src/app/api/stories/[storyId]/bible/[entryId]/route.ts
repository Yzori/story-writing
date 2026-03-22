import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { bibleEntries } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { updateBibleEntrySchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";

type RouteParams = {
  params: Promise<{ storyId: string; entryId: string }>;
};

/**
 * PATCH /api/stories/[storyId]/bible/[entryId]
 * Update a bible entry. Requires ownership.
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
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }
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
      .where(and(eq(bibleEntries.id, entryId), eq(bibleEntries.storyId, storyId)))
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
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
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

    await db
      .delete(bibleEntries)
      .where(and(eq(bibleEntries.id, entryId), eq(bibleEntries.storyId, storyId)));

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
