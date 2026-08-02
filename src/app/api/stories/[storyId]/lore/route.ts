import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { loreEntries, users } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createLoreEntrySchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/lore
 * List lore entries for a story. Available to collaborators + story owner.
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

    const result = await db
      .select({
        id: loreEntries.id,
        storyId: loreEntries.storyId,
        userId: loreEntries.userId,
        category: loreEntries.category,
        title: loreEntries.title,
        content: loreEntries.content,
        sortOrder: loreEntries.sortOrder,
        createdAt: loreEntries.createdAt,
        updatedAt: loreEntries.updatedAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(loreEntries)
      .leftJoin(users, eq(loreEntries.userId, users.id))
      .where(eq(loreEntries.storyId, storyId))
      .orderBy(asc(loreEntries.sortOrder))
      .limit(500);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/lore",
      "Failed to fetch lore entries",
    );
  }
}

/**
 * POST /api/stories/[storyId]/lore
 * Create a lore entry. Requires being collaborator or owner.
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

    const body = await request.json();
    const parsed = createLoreEntrySchema.safeParse(body);

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

    const [created] = await db
      .insert(loreEntries)
      .values({
        storyId,
        userId: session.user.id,
        category: parsed.data.category,
        title: parsed.data.title,
        content: parsed.data.content || "",
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/lore",
      "Failed to create lore entry",
    );
  }
}
