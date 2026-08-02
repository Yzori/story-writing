import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { crossroads, crossroadsVotes, stories, follows } from "@/server/db/schema";
import { eq, and, desc, sql, inArray, ne } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createBulkNotifications } from "@/server/services/notifications";

// GET — list crossroads for a story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const polls = await db
      .select()
      .from(crossroads)
      .where(eq(crossroads.storyId, storyId))
      .orderBy(desc(crossroads.createdAt))
      .limit(20);

    // Enrich with vote totals per option + user's votes — two grouped
    // queries across every poll at once, not two per poll.
    const pollIds = polls.map((p) => p.id);
    const [allTotals, allUserVotes] = pollIds.length
      ? await Promise.all([
          db
            .select({
              crossroadId: crossroadsVotes.crossroadId,
              optionIndex: crossroadsVotes.optionIndex,
              totalDrops: sql<number>`coalesce(sum(${crossroadsVotes.dropsSpent}), 0)`,
              voterCount: sql<number>`count(distinct ${crossroadsVotes.userId})`,
            })
            .from(crossroadsVotes)
            .where(inArray(crossroadsVotes.crossroadId, pollIds))
            .groupBy(crossroadsVotes.crossroadId, crossroadsVotes.optionIndex),
          userId
            ? db
                .select({
                  crossroadId: crossroadsVotes.crossroadId,
                  optionIndex: crossroadsVotes.optionIndex,
                  dropsSpent: sql<number>`coalesce(sum(${crossroadsVotes.dropsSpent}), 0)`,
                })
                .from(crossroadsVotes)
                .where(
                  and(
                    inArray(crossroadsVotes.crossroadId, pollIds),
                    eq(crossroadsVotes.userId, userId)
                  )
                )
                .groupBy(crossroadsVotes.crossroadId, crossroadsVotes.optionIndex)
            : Promise.resolve([]),
        ])
      : [[], []];

    const enriched = polls.map((poll) => {
      const options = JSON.parse(poll.options) as { label: string }[];
      const voteTotals = allTotals.filter((v) => v.crossroadId === poll.id);
      const userVotes = allUserVotes.filter((v) => v.crossroadId === poll.id);

      // Total drops across all options
      const grandTotal = voteTotals.reduce((sum, v) => sum + Number(v.totalDrops), 0);

      const enrichedOptions = options.map((opt, i) => {
        const voteData = voteTotals.find((v) => Number(v.optionIndex) === i);
        const userVote = userVotes.find((v) => Number(v.optionIndex) === i);
        const drops = Number(voteData?.totalDrops ?? 0);
        return {
          label: opt.label,
          totalDrops: drops,
          voterCount: Number(voteData?.voterCount ?? 0),
          percentage: grandTotal > 0 ? Math.round((drops / grandTotal) * 100) : 0,
          userDrops: Number(userVote?.dropsSpent ?? 0),
        };
      });

      return {
        ...poll,
        options: enrichedOptions,
        grandTotal,
        isExpired: poll.closesAt && new Date(poll.closesAt) < new Date(),
      };
    });

    return NextResponse.json({ crossroads: enriched });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/crossroads",
      "Failed to fetch crossroads",
    );
  }
}

// POST — create a crossroad poll (story owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

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
        { error: { code: "FORBIDDEN", message: "Only the story owner can create crossroads" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { question, options, closesInDays } = body;

    if (!question || question.length < 10 || question.length > 500) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Question must be 10-500 characters" } },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Must have 2-4 options" } },
        { status: 400 }
      );
    }

    for (const opt of options) {
      if (!opt.label || opt.label.length < 2 || opt.label.length > 200) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Each option must be 2-200 characters" } },
          { status: 400 }
        );
      }
    }

    // Max 3 open crossroads per story
    const [openCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(crossroads)
      .where(and(eq(crossroads.storyId, storyId), eq(crossroads.status, "open")));

    if (Number(openCount?.count ?? 0) >= 3) {
      return NextResponse.json(
        { error: { code: "LIMIT_REACHED", message: "Maximum 3 open crossroads per story" } },
        { status: 400 }
      );
    }

    const closesAt = closesInDays
      ? new Date(Date.now() + closesInDays * 24 * 60 * 60 * 1000)
      : null;

    const [crossroad] = await db
      .insert(crossroads)
      .values({
        storyId,
        creatorId: session.user.id,
        question,
        options: JSON.stringify(options),
        closesAt,
      })
      .returning();

    // A vote nobody hears about closes with no ballots — tell the
    // story's followers a crossroads opened. Fire-and-forget.
    const followerRows = await db
      .select({ userId: follows.userId })
      .from(follows)
      .where(and(eq(follows.storyId, storyId), ne(follows.userId, session.user.id)));
    createBulkNotifications(
      followerRows.map((f) => f.userId),
      "update",
      `A crossroads opened in "${story.title}" — the story needs your vote`,
      `/story/${story.slug || storyId}`
    );

    return NextResponse.json({ crossroad }, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/crossroads",
      "Failed to create crossroad",
    );
  }
}
