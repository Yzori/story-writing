import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { places } from "@/server/db/schema";
import { applyRateLimit } from "@/server/api-utils";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { updatePlaceSchema } from "@/lib/validations";

type RouteParams = {
  params: Promise<{ storyId: string; placeId: string }>;
};

const placeNameKey = (name: string) => name.trim().toLowerCase();

/**
 * PATCH /api/stories/[storyId]/campaign/places/[placeId]
 * Update a place — rename, move on the map, change mood, edit description.
 * GM only. Partial: each field is independently optional. Passing `null`
 * to `x`/`y` un-places the pin (removes it from the spatial map but keeps
 * it in the Places list).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, placeId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }
    if (check.error === "FORBIDDEN" || check.story?.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can manage places" } },
        { status: 403 },
      );
    }

    const place = await db.query.places.findFirst({
      where: and(eq(places.id, placeId), eq(places.storyId, storyId)),
    });
    if (!place) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Place not found" } },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updatePlaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
          },
        },
        { status: 400 },
      );
    }

    // Coordinate consistency: writing one of (x, y) without the other leaves
    // the pin half-placed which the renderer can't draw. Resolve by checking
    // the *post-update* state, so callers who set just one coord against an
    // already-placed pin still pass.
    const nextX =
      parsed.data.x === undefined ? place.x : parsed.data.x;
    const nextY =
      parsed.data.y === undefined ? place.y : parsed.data.y;
    if ((nextX === null) !== (nextY === null)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Either set both x and y or neither",
          },
        },
        { status: 400 },
      );
    }

    // Build the update payload from only the fields the caller supplied.
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) {
      const trimmed = parsed.data.name.trim();
      updateData.name = trimmed;
      updateData.nameKey = placeNameKey(trimmed);
    }
    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description;
    }
    if (parsed.data.mood !== undefined) {
      updateData.mood = parsed.data.mood;
    }
    if (parsed.data.x !== undefined) {
      updateData.x = parsed.data.x;
    }
    if (parsed.data.y !== undefined) {
      updateData.y = parsed.data.y;
    }

    let updated;
    try {
      [updated] = await db
        .update(places)
        .set(updateData)
        .where(eq(places.id, placeId))
        .returning();
    } catch (err) {
      // Unique-violation on (storyId, nameKey) → tried to rename onto an
      // existing place. Surface that cleanly instead of 500'ing.
      const code = (err as { code?: string } | null)?.code;
      if (code === "23505") {
        return NextResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "Another place already has this name",
            },
          },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/.../places/[placeId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update place" } },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/campaign/places/[placeId]
 * Delete a place. Scene-breaks that referenced it keep their title text but
 * lose the locationId link — no fancy cleanup needed; the Places view falls
 * back to the title field.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const { storyId, placeId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }
    if (check.error === "FORBIDDEN" || check.story?.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can manage places" } },
        { status: 403 },
      );
    }

    const result = await db
      .delete(places)
      .where(and(eq(places.id, placeId), eq(places.storyId, storyId)))
      .returning({ id: places.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Place not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("DELETE /api/.../places/[placeId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete place" } },
      { status: 500 },
    );
  }
}
