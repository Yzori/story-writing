import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  campaignApplications,
  campaignVotes,
  users,
  stories,
  playerCharacters,
} from "@/lib/db/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createApplicationSchema } from "@/lib/validations";
import { applyRateLimit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/campaign/applications
 * List applications for a campaign.
 * - GM (story owner): sees all applications with user info + vote counts
 * - Others: sees only applications with status "voting"
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

    // Verify story exists
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const isGM = story.userId === session.user.id;

    const yesVotes = db
      .select({
        applicationId: campaignVotes.applicationId,
        count: sql<number>`count(*)::int`.as("yes_count"),
      })
      .from(campaignVotes)
      .where(eq(campaignVotes.vote, true))
      .groupBy(campaignVotes.applicationId)
      .as("yes_votes");

    const noVotes = db
      .select({
        applicationId: campaignVotes.applicationId,
        count: sql<number>`count(*)::int`.as("no_count"),
      })
      .from(campaignVotes)
      .where(eq(campaignVotes.vote, false))
      .groupBy(campaignVotes.applicationId)
      .as("no_votes");

    let query = db
      .select({
        id: campaignApplications.id,
        storyId: campaignApplications.storyId,
        userId: campaignApplications.userId,
        pitch: campaignApplications.pitch,
        status: campaignApplications.status,
        votingDeadline: campaignApplications.votingDeadline,
        createdAt: campaignApplications.createdAt,
        updatedAt: campaignApplications.updatedAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        yesVotes: sql<number>`coalesce(${yesVotes.count}, 0)`.as("yesVotes"),
        noVotes: sql<number>`coalesce(${noVotes.count}, 0)`.as("noVotes"),
      })
      .from(campaignApplications)
      .leftJoin(users, eq(campaignApplications.userId, users.id))
      .leftJoin(yesVotes, eq(campaignApplications.id, yesVotes.applicationId))
      .leftJoin(noVotes, eq(campaignApplications.id, noVotes.applicationId))
      .where(
        isGM
          ? eq(campaignApplications.storyId, storyId)
          : and(
              eq(campaignApplications.storyId, storyId),
              eq(campaignApplications.status, "voting")
            )
      )
      .orderBy(desc(campaignApplications.createdAt));

    const result = await query;

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(
      "GET /api/stories/[storyId]/campaign/applications error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch applications" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/applications
 * Submit an application to join a campaign.
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

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId } = await params;

    // Verify story exists
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Cannot apply to your own campaign (you're the GM)
    if (story.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "You are the GM of this campaign" } },
        { status: 400 }
      );
    }

    // Cannot apply if you already have a character
    const existingCharacter = await db.query.playerCharacters.findFirst({
      where: and(
        eq(playerCharacters.storyId, storyId),
        eq(playerCharacters.userId, session.user.id)
      ),
    });

    if (existingCharacter) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "You are already in this campaign" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = createApplicationSchema.safeParse(body);

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
      .insert(campaignApplications)
      .values({
        storyId,
        userId: session.user.id,
        pitch: parsed.data.pitch,
      })
      .returning();

    // Notify the GM
    const applicantName = session.user.name || "Someone";
    createNotification(
      story.userId,
      "collaboration",
      `${applicantName} applied to join your campaign "${story.title}"`,
      `/campaign/${storyId}`
    );

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("campaign_applications_story_user_unique")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "You have already applied to this campaign",
          },
        },
        { status: 409 }
      );
    }
    console.error(
      "POST /api/stories/[storyId]/campaign/applications error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to submit application" } },
      { status: 500 }
    );
  }
}
