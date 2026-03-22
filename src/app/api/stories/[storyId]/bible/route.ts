import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { bibleEntries, stories } from "@/server/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { createBibleEntrySchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/bible
 * List bible entries for a story.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId } = await params;

    // Verify story exists and user has access (owner or accepted collaborator)
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

    const results = await db
      .select()
      .from(bibleEntries)
      .where(eq(bibleEntries.storyId, storyId))
      .orderBy(asc(bibleEntries.sortOrder))
      .limit(500);

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/bible error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch bible entries",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/bible
 * Create a bible entry.
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

    const { storyId } = await params;
    const body = await request.json();
    const parsed = createBibleEntrySchema.safeParse(body);

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

    // Verify story exists and user has access
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

    const [entry] = await db
      .insert(bibleEntries)
      .values({
        storyId,
        type: parsed.data.type,
        name: parsed.data.name,
        description: parsed.data.description || "",
        details: parsed.data.details || "",
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/bible error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create bible entry",
        },
      },
      { status: 500 }
    );
  }
}
