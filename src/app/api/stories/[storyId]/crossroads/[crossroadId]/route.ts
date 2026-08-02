import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { crossroads, crossroadsVotes, stories } from "@/server/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createBulkNotifications } from "@/server/services/notifications";

// PATCH — resolve or close a crossroad (story owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; crossroadId: string }> }
) {
  try {
    const { storyId, crossroadId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    // Must own the story
    const [story] = await db
      .select({ userId: stories.userId, title: stories.title, slug: stories.slug })
      .from(stories)
      .where(eq(stories.id, storyId));

    if (!story || story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the story owner can manage crossroads" } },
        { status: 403 }
      );
    }

    const [crossroad] = await db
      .select()
      .from(crossroads)
      .where(and(eq(crossroads.id, crossroadId), eq(crossroads.storyId, storyId)));

    if (!crossroad) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Crossroad not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, resolvedOption } = body;

    switch (action) {
      case "close": {
        if (crossroad.status !== "open") {
          return NextResponse.json(
            { error: { code: "INVALID_ACTION", message: "Crossroad is not open" } },
            { status: 400 }
          );
        }
        await db
          .update(crossroads)
          .set({ status: "closed" })
          .where(eq(crossroads.id, crossroadId));
        break;
      }

      case "resolve": {
        if (crossroad.status === "resolved") {
          return NextResponse.json(
            { error: { code: "INVALID_ACTION", message: "Already resolved" } },
            { status: 400 }
          );
        }

        const options = JSON.parse(crossroad.options) as { label: string }[];
        if (typeof resolvedOption !== "number" || resolvedOption < 0 || resolvedOption >= options.length) {
          return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "Invalid option index" } },
            { status: 400 }
          );
        }

        await db
          .update(crossroads)
          .set({ status: "resolved", resolvedOption })
          .where(eq(crossroads.id, crossroadId));

        // Close the loop: everyone who voted learns which way the story
        // went. Fire-and-forget; the resolve itself is already done.
        const voters = await db
          .selectDistinct({ userId: crossroadsVotes.userId })
          .from(crossroadsVotes)
          .where(
            and(
              eq(crossroadsVotes.crossroadId, crossroadId),
              ne(crossroadsVotes.userId, session.user.id)
            )
          );
        const winner = options[resolvedOption]?.label ?? "an option";
        createBulkNotifications(
          voters.map((v) => v.userId),
          "update",
          `The crossroads in "${story.title}" resolved — "${winner}" carried the day`,
          `/story/${story.slug || storyId}`
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: { code: "INVALID_ACTION", message: `Unknown action: ${action}` } },
          { status: 400 }
        );
    }

    const [updated] = await db
      .select()
      .from(crossroads)
      .where(eq(crossroads.id, crossroadId));

    return NextResponse.json({ crossroad: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/stories/[storyId]/crossroads/[crossroadId]",
      "Failed to update crossroad",
    );
  }
}
