import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  campaignApplications,
  campaignVotes,
  collaborators,
  playerCharacters,
  stories,
} from "@/server/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createVoteSchema } from "@/lib/validations";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; applicationId: string }>;
};

// Audition votes are restricted to the existing "table": the GM (story owner),
// accepted collaborators, and anyone who already has a player character on
// this story. Any other authenticated user can see the application page but
// cannot influence casting.
async function isAuditionVoter(storyId: string, userId: string): Promise<boolean> {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    columns: { id: true, userId: true },
  });
  if (!story) return false;
  if (story.userId === userId) return true;

  const member = await db
    .select({ src: sql<string>`'x'` })
    .from(collaborators)
    .where(
      and(
        eq(collaborators.storyId, storyId),
        eq(collaborators.userId, userId),
        eq(collaborators.status, "accepted"),
      ),
    )
    .limit(1);
  if (member.length > 0) return true;

  const character = await db
    .select({ id: playerCharacters.id })
    .from(playerCharacters)
    .where(and(eq(playerCharacters.storyId, storyId), eq(playerCharacters.userId, userId)))
    .limit(1);
  return character.length > 0;
}

/**
 * GET /api/stories/[storyId]/campaign/applications/[applicationId]/votes
 * Get vote tally for an application.
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

    const { storyId, applicationId } = await params;

    if (!(await isAuditionVoter(storyId, session.user.id))) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the table can see audition votes" } },
        { status: 403 },
      );
    }

    // Get vote counts
    const [counts] = await db
      .select({
        yesCount: sql<number>`count(*) filter (where ${campaignVotes.vote} = true)::int`,
        noCount: sql<number>`count(*) filter (where ${campaignVotes.vote} = false)::int`,
      })
      .from(campaignVotes)
      .where(eq(campaignVotes.applicationId, applicationId));

    // Get user's own vote
    const userVoteRow = await db.query.campaignVotes.findFirst({
      where: and(
        eq(campaignVotes.applicationId, applicationId),
        eq(campaignVotes.voterId, session.user.id)
      ),
    });

    return NextResponse.json({
      data: {
        yesCount: counts?.yesCount ?? 0,
        noCount: counts?.noCount ?? 0,
        userVote: userVoteRow ? userVoteRow.vote : null,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/stories/[storyId]/campaign/applications/[applicationId]/votes error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch votes" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/applications/[applicationId]/votes
 * Cast or update a vote on an application in "voting" status.
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

    const { storyId, applicationId } = await params;

    if (!(await isAuditionVoter(storyId, session.user.id))) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the table can vote on auditions" } },
        { status: 403 },
      );
    }

    // Find the application
    const application = await db.query.campaignApplications.findFirst({
      where: eq(campaignApplications.id, applicationId),
    });

    if (!application) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Application not found" } },
        { status: 404 }
      );
    }

    // Must be in voting status
    if (application.status !== "voting") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "This application is not open for voting" } },
        { status: 400 }
      );
    }

    // Cannot vote on your own application
    if (application.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "You cannot vote on your own application" } },
        { status: 400 }
      );
    }

    // Check voting deadline
    if (application.votingDeadline && new Date() > application.votingDeadline) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "The voting deadline has passed" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = createVoteSchema.safeParse(body);

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

    // Atomic upsert — avoids race condition between concurrent votes
    const [result] = await db
      .insert(campaignVotes)
      .values({
        applicationId,
        voterId: session.user.id,
        vote: parsed.data.vote,
      })
      .onConflictDoUpdate({
        target: [campaignVotes.applicationId, campaignVotes.voterId],
        set: { vote: parsed.data.vote },
      })
      .returning();

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(
      "POST /api/stories/[storyId]/campaign/applications/[applicationId]/votes error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to cast vote" } },
      { status: 500 }
    );
  }
}
