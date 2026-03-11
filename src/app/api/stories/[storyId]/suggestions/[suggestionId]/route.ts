import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suggestions, stories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { updateSuggestionSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

type RouteParams = {
  params: Promise<{ storyId: string; suggestionId: string }>;
};

/**
 * PATCH /api/stories/[storyId]/suggestions/[suggestionId]
 * Review a suggestion (weave/revise/pass). Story owner only.
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

    const { storyId, suggestionId } = await params;

    // Verify story ownership
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
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the story owner can review suggestions" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateSuggestionSchema.safeParse(body);

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

    const existing = await db.query.suggestions.findFirst({
      where: and(
        eq(suggestions.id, suggestionId),
        eq(suggestions.storyId, storyId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Suggestion not found" } },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(suggestions)
      .set({
        status: parsed.data.status,
        reviewedBy: session.user.id,
        reviewNote: parsed.data.reviewNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(suggestions.id, suggestionId))
      .returning();

    // Notify the suggester about the review
    if (existing.userId !== session.user.id) {
      const statusLabel =
        parsed.data.status === "woven"
          ? "woven into"
          : parsed.data.status === "revised"
            ? "marked for revision on"
            : "passed on";
      createNotification(
        existing.userId,
        "suggestion",
        `Your suggestion was ${statusLabel} "${story.title}"`,
        `/story/${story.slug || storyId}`
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(
      "PATCH /api/stories/[storyId]/suggestions/[suggestionId] error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to review suggestion" } },
      { status: 500 }
    );
  }
}
