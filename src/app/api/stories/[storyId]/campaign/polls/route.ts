import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  sessionPolls,
  sessionPollVotes,
  stories,
  playerCharacters,
  collaborators,
} from "@/server/db/schema";
import { eq, and, isNull, desc, inArray, sql } from "drizzle-orm";
import { safeParseJson } from "@/lib/safe-json";
import { auth } from "@/server/auth";
import { createSessionPollSchema } from "@/lib/validations";
import { applyRateLimit } from "@/server/api-utils";
import { createBulkNotifications } from "@/server/services/notifications";

type RouteParams = { params: Promise<{ storyId: string }> };

// Scheduling polls are restricted to the campaign's "table": the GM (story
// owner), accepted collaborators, and anyone with a player character on this
// story — mirrors isAuditionVoter on the audition-votes route.
async function isCampaignMember(
  storyId: string,
  storyOwnerId: string,
  userId: string
): Promise<boolean> {
  if (storyOwnerId === userId) return true;

  const member = await db
    .select({ src: sql<string>`'x'` })
    .from(collaborators)
    .where(
      and(
        eq(collaborators.storyId, storyId),
        eq(collaborators.userId, userId),
        eq(collaborators.status, "accepted")
      )
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
 * GET /api/stories/[storyId]/campaign/polls
 * List all polls for this story (most recent first), with vote tallies.
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

    if (!(await isCampaignMember(storyId, story.userId, session.user.id))) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the table can see scheduling polls" } },
        { status: 403 }
      );
    }

    // Fetch all polls for this story
    const polls = await db.query.sessionPolls.findMany({
      where: eq(sessionPolls.storyId, storyId),
      orderBy: [desc(sessionPolls.createdAt)],
    });

    // Fetch all votes for these polls
    const pollIds = polls.map((p) => p.id);
    const allVotes = pollIds.length > 0
      ? await db.query.sessionPollVotes.findMany({
          where: inArray(sessionPollVotes.pollId, pollIds),
        })
      : [];

    // Build response with vote counts
    const data = polls.map((poll) => {
      const options: string[] = safeParseJson(poll.options, []);
      const pollVotes = allVotes.filter((v) => v.pollId === poll.id);
      const voteCounts = new Array(options.length).fill(0);
      const voterSet = new Set<string>();

      for (const vote of pollVotes) {
        const selected: number[] = safeParseJson(vote.selectedOptions, []);
        voterSet.add(vote.userId);
        // Dedupe defensively — stored votes predating schema dedupe may
        // contain duplicate indices.
        for (const idx of new Set(selected)) {
          if (idx >= 0 && idx < options.length) {
            voteCounts[idx]++;
          }
        }
      }

      // Current user's votes
      const myVoteRecord = pollVotes.find(
        (v) => v.userId === session.user!.id
      );
      const myVotes: number[] = myVoteRecord
        ? safeParseJson(myVoteRecord.selectedOptions, [])
        : [];

      return {
        id: poll.id,
        storyId: poll.storyId,
        title: poll.title ?? "When should we play next?",
        options,
        status: poll.status,
        confirmedOption: poll.confirmedOption,
        voteCounts,
        totalVoters: voterSet.size,
        myVotes,
        createdAt: poll.createdAt,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error(
      "GET /api/stories/[storyId]/campaign/polls error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch polls" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/campaign/polls
 * GM creates a new scheduling poll.
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

    // Verify story exists and user is GM
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
        { error: { code: "FORBIDDEN", message: "Only the GM can create polls" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createSessionPollSchema.safeParse(body);

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

    // Auto-close any existing open poll for this story
    const openPolls = await db.query.sessionPolls.findMany({
      where: and(
        eq(sessionPolls.storyId, storyId),
        eq(sessionPolls.status, "open")
      ),
    });

    for (const openPoll of openPolls) {
      await db
        .update(sessionPolls)
        .set({ status: "closed", updatedAt: new Date() })
        .where(eq(sessionPolls.id, openPoll.id));
    }

    // Create new poll
    const [created] = await db
      .insert(sessionPolls)
      .values({
        storyId,
        createdBy: session.user.id,
        title: parsed.data.title ?? "When should we play next?",
        options: JSON.stringify(parsed.data.options),
        status: "open",
      })
      .returning();

    // Notify all players in this campaign
    const campaignCharacters = await db.query.playerCharacters.findMany({
      where: eq(playerCharacters.storyId, storyId),
    });

    const playerUserIds = [
      ...new Set(
        campaignCharacters
          .map((c) => c.userId)
          .filter((uid) => uid !== session.user!.id)
      ),
    ];

    if (playerUserIds.length > 0) {
      createBulkNotifications(
        playerUserIds,
        "collaboration",
        `The GM is asking: ${created.title ?? "When should we play next?"}`,
        `/campaign/${storyId}`
      );
    }

    // Return in the same shape as GET
    const options: string[] = JSON.parse(created.options);
    return NextResponse.json(
      {
        data: {
          id: created.id,
          storyId: created.storyId,
          title: created.title ?? "When should we play next?",
          options,
          status: created.status,
          confirmedOption: created.confirmedOption,
          voteCounts: new Array(options.length).fill(0),
          totalVoters: 0,
          myVotes: [],
          createdAt: created.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/stories/[storyId]/campaign/polls error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create poll" } },
      { status: 500 }
    );
  }
}
