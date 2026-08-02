import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { suggestions, users, stories } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createSuggestionSchema } from "@/lib/validations";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { createNotification } from "@/server/services/notifications";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/suggestions
 * List suggestions for a story. Available to collaborators.
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
        id: suggestions.id,
        storyId: suggestions.storyId,
        chapterId: suggestions.chapterId,
        userId: suggestions.userId,
        content: suggestions.content,
        note: suggestions.note,
        status: suggestions.status,
        reviewedBy: suggestions.reviewedBy,
        reviewNote: suggestions.reviewNote,
        createdAt: suggestions.createdAt,
        updatedAt: suggestions.updatedAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(suggestions)
      .leftJoin(users, eq(suggestions.userId, users.id))
      .where(eq(suggestions.storyId, storyId))
      .orderBy(desc(suggestions.createdAt))
      .limit(100);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/suggestions",
      "Failed to fetch suggestions",
    );
  }
}

/**
 * POST /api/stories/[storyId]/suggestions
 * Create a suggestion. Requires being a collaborator or story owner.
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

    const story = check.story!;

    const body = await request.json();
    const parsed = createSuggestionSchema.safeParse(body);

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
      .insert(suggestions)
      .values({
        storyId,
        chapterId: parsed.data.chapterId,
        userId: session.user.id,
        content: parsed.data.content,
        note: parsed.data.note ?? null,
      })
      .returning();

    // Notify the story owner about the suggestion
    if (story.userId !== session.user.id) {
      const name = session.user.name || "A collaborator";
      createNotification(
        story.userId,
        "suggestion",
        `${name} submitted a suggestion for "${story.title}"`,
        `/story/${story.slug || storyId}`
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/suggestions",
      "Failed to create suggestion",
    );
  }
}
