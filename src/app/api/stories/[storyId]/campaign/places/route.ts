import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { places } from "@/server/db/schema";
import { applyRateLimit } from "@/server/api-utils";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { createPlaceSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ storyId: string }> };

const placeNameKey = (name: string) => name.trim().toLowerCase();

/**
 * GET /api/stories/[storyId]/campaign/places
 * List every place tied to this campaign. Returns both placed (with x/y)
 * and unplaced rows so the GM-side spatial editor can show the unplaced
 * rail. Collaborator access required.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const { storyId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 },
      );
    }

    const rows = await db
      .select()
      .from(places)
      .where(eq(places.storyId, storyId))
      .orderBy(asc(places.createdAt));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("GET /api/.../places error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load places" } },
      { status: 500 },
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/places
 * Create a place explicitly (vs. the auto-create that runs on scene-break
 * posts). GM only — players shouldn't be reshaping the world.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { storyId } = await params;
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

    const body = await request.json().catch(() => null);
    const parsed = createPlaceSchema.safeParse(body);
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

    // Names must agree on (x !== null AND y !== null) or both null — partial
    // placement (one coord set, the other not) makes no rendering sense.
    if ((parsed.data.x ?? null) === null !== ((parsed.data.y ?? null) === null)) {
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

    const nameKey = placeNameKey(parsed.data.name);

    const [created] = await db
      .insert(places)
      .values({
        storyId,
        name: parsed.data.name.trim(),
        nameKey,
        mood: parsed.data.mood ?? null,
        description: parsed.data.description ?? "",
        x: parsed.data.x ?? null,
        y: parsed.data.y ?? null,
        autoCreated: false,
      })
      .onConflictDoNothing({
        target: [places.storyId, places.nameKey],
      })
      .returning();

    if (!created) {
      // Idempotent: GM tried to create a place that already exists by name.
      const [existing] = await db
        .select()
        .from(places)
        .where(and(eq(places.storyId, storyId), eq(places.nameKey, nameKey)))
        .limit(1);
      return NextResponse.json({ data: existing }, { status: 200 });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/.../places error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create place" } },
      { status: 500 },
    );
  }
}
