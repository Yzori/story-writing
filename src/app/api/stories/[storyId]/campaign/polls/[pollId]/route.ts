import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  sessionPolls,
  sessionPollVotes,
  stories,
  playerCharacters,
  collaborators,
} from "@/server/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { voteSessionPollSchema, closeSessionPollSchema } from "@/lib/validations";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createBulkNotifications } from "@/server/services/notifications";

type RouteParams = { params: Promise<{ storyId: string; pollId: string }> };

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
 * PATCH /api/stories/[storyId]/campaign/polls/[pollId]
 * - GM can close the poll (body has `confirmedOption`)
 * - Player can vote (body has `selectedOptions`)
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

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, pollId } = await params;

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

    // Verify poll exists and belongs to this story
    const poll = await db.query.sessionPolls.findFirst({
      where: and(
        eq(sessionPolls.id, pollId),
        eq(sessionPolls.storyId, storyId)
      ),
    });

    if (!poll) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Poll not found" } },
        { status: 404 }
      );
    }

    if (!(await isCampaignMember(storyId, story.userId, session.user.id))) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the table can vote in scheduling polls" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const isGM = story.userId === session.user.id;

    // ── GM closing the poll ──────────────────────────────────
    if ("confirmedOption" in body) {
      if (!isGM) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Only the GM can close polls" } },
          { status: 403 }
        );
      }

      const parsed = closeSessionPollSchema.safeParse(body);
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

      // Validate confirmedOption is actually one of the poll's options
      const pollOptions: string[] = JSON.parse(poll.options);
      if (!pollOptions.includes(parsed.data.confirmedOption)) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Confirmed option must be one of the poll's original options" } },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(sessionPolls)
        .set({
          status: "closed",
          confirmedOption: parsed.data.confirmedOption,
          updatedAt: new Date(),
        })
        .where(eq(sessionPolls.id, pollId))
        .returning();

      // Notify all players
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
          `Next session confirmed: ${parsed.data.confirmedOption}`,
          `/campaign/${storyId}`
        );
      }

      const options: string[] = JSON.parse(updated.options);

      // Recompute vote counts for response
      const votes = await db.query.sessionPollVotes.findMany({
        where: eq(sessionPollVotes.pollId, pollId),
      });

      const voteCounts = new Array(options.length).fill(0);
      const voterSet = new Set<string>();
      for (const vote of votes) {
        const selected: number[] = JSON.parse(vote.selectedOptions);
        voterSet.add(vote.userId);
        // Dedupe defensively — stored votes predating schema dedupe may
        // contain duplicate indices.
        for (const idx of new Set(selected)) {
          if (idx >= 0 && idx < options.length) {
            voteCounts[idx]++;
          }
        }
      }

      const myVoteRecord = votes.find((v) => v.userId === session.user!.id);
      const myVotes: number[] = myVoteRecord
        ? JSON.parse(myVoteRecord.selectedOptions)
        : [];

      return NextResponse.json({
        data: {
          id: updated.id,
          storyId: updated.storyId,
          title: updated.title ?? "When should we play next?",
          options,
          status: updated.status,
          confirmedOption: updated.confirmedOption,
          voteCounts,
          totalVoters: voterSet.size,
          myVotes,
          createdAt: updated.createdAt,
        },
      });
    }

    // ── Player voting ────────────────────────────────────────
    if ("selectedOptions" in body) {
      if (poll.status !== "open") {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "This poll is closed" } },
          { status: 400 }
        );
      }

      const parsed = voteSessionPollSchema.safeParse(body);
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

      const options: string[] = JSON.parse(poll.options);

      // Validate that all selected indices are valid
      for (const idx of parsed.data.selectedOptions) {
        if (idx < 0 || idx >= options.length) {
          return NextResponse.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: `Invalid option index: ${idx}`,
              },
            },
            { status: 400 }
          );
        }
      }

      // Atomic upsert — avoids race condition between concurrent votes
      // hitting the (pollId, userId) unique constraint.
      if (parsed.data.selectedOptions.length > 0) {
        const selectedOptionsJson = JSON.stringify(parsed.data.selectedOptions);
        await db
          .insert(sessionPollVotes)
          .values({
            pollId,
            userId: session.user.id,
            selectedOptions: selectedOptionsJson,
          })
          .onConflictDoUpdate({
            target: [sessionPollVotes.pollId, sessionPollVotes.userId],
            set: { selectedOptions: selectedOptionsJson },
          });
      } else {
        // Clearing a vote — a plain delete is fine here.
        await db
          .delete(sessionPollVotes)
          .where(
            and(
              eq(sessionPollVotes.pollId, pollId),
              eq(sessionPollVotes.userId, session.user.id)
            )
          );
      }

      // Recompute vote counts for response
      const votes = await db.query.sessionPollVotes.findMany({
        where: eq(sessionPollVotes.pollId, pollId),
      });

      const voteCounts = new Array(options.length).fill(0);
      const voterSet = new Set<string>();
      for (const vote of votes) {
        const selected: number[] = JSON.parse(vote.selectedOptions);
        voterSet.add(vote.userId);
        // Dedupe defensively — stored votes predating schema dedupe may
        // contain duplicate indices.
        for (const idx of new Set(selected)) {
          if (idx >= 0 && idx < options.length) {
            voteCounts[idx]++;
          }
        }
      }

      const myVotes = parsed.data.selectedOptions;

      return NextResponse.json({
        data: {
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
        },
      });
    }

    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request must include confirmedOption or selectedOptions" } },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/stories/[storyId]/campaign/polls/[pollId]",
      "Failed to update poll",
    );
  }
}
