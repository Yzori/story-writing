import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  campaignFloorRounds,
  campaignFloorAudienceVotes,
} from "@/server/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { houseVoteSchema } from "@/lib/validations";
import { transferDrops } from "@/server/services/ink-drops";
import { getPublicStorySession } from "@/server/services/audience-input";

type RouteParams = { params: Promise<{ storyId: string; sessionId: string }> };

const DROPS_PER_WEIGHT = 25;
const MAX_BONUS_WEIGHT = 5; // capped so votes stay spice, not pay-to-win

type HouseOption = { label: string };

function parseOptions(raw: string | null): HouseOption[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((o) => o && typeof o.label === "string") : [];
  } catch {
    return [];
  }
}

async function liveHouseFork(sessionId: string) {
  return db.query.campaignFloorRounds.findFirst({
    where: and(
      eq(campaignFloorRounds.sessionId, sessionId),
      eq(campaignFloorRounds.mode, "house_fork"),
      eq(campaignFloorRounds.status, "voting"),
    ),
  });
}

async function tallyFor(roundId: string, optionCount: number, token: string | null) {
  const rows = await db
    .select({ optionIndex: campaignFloorAudienceVotes.optionIndex, total: sql<number>`sum(${campaignFloorAudienceVotes.weight})::int` })
    .from(campaignFloorAudienceVotes)
    .where(eq(campaignFloorAudienceVotes.roundId, roundId))
    .groupBy(campaignFloorAudienceVotes.optionIndex);
  const tally = Array.from({ length: optionCount }, () => 0);
  for (const r of rows) if (r.optionIndex < optionCount) tally[r.optionIndex] = r.total ?? 0;

  const [{ voters }] = await db
    .select({ voters: sql<number>`count(*)::int` })
    .from(campaignFloorAudienceVotes)
    .where(eq(campaignFloorAudienceVotes.roundId, roundId));

  let myVote: number | null = null;
  if (token) {
    const mine = await db.query.campaignFloorAudienceVotes.findFirst({
      where: and(eq(campaignFloorAudienceVotes.roundId, roundId), eq(campaignFloorAudienceVotes.token, token)),
    });
    myVote = mine ? mine.optionIndex : null;
  }
  return { tally, voters: voters ?? 0, myVote };
}

/** GET — the live house_fork vote for spectators. ?token= reveals the caller's ballot. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { storyId, sessionId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!(await getPublicStorySession(storyId, sessionId))) {
    return NextResponse.json({ data: null });
  }
  const round = await liveHouseFork(sessionId);
  if (!round) return NextResponse.json({ data: null });

  const options = parseOptions(round.options);
  const { tally, voters, myVote } = await tallyFor(round.id, options.length, token);
  return NextResponse.json({
    data: {
      id: round.id,
      prompt: round.prompt,
      options,
      constituency: round.constituency,
      binding: round.binding,
      closesAt: round.closesAt,
      tally,
      voters,
      myVote,
    },
  });
}

/** POST — cast/replace a house ballot. Token-based; logged-in patrons may weight with drops. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "write", { max: 20, windowSeconds: 30 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const { token, optionIndex, dropsSpent } = houseVoteSchema.parse(await request.json());

    const verified = await getPublicStorySession(storyId, sessionId);
    if (!verified) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }
    const { story } = verified;
    const round = await liveHouseFork(sessionId);
    if (!round) {
      return NextResponse.json({ error: { code: "CONFLICT", message: "The floor is not open" } }, { status: 409 });
    }
    if (round.closesAt && round.closesAt.getTime() < Date.now()) {
      return NextResponse.json({ error: { code: "CONFLICT", message: "Voting has closed" } }, { status: 409 });
    }
    const options = parseOptions(round.options);
    if (optionIndex >= options.length) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "No such option" } }, { status: 400 });
    }

    const authSession = await auth();
    const userId = authSession?.user?.id ?? null;
    const wantsDrops = (dropsSpent ?? 0) > 0 && Boolean(userId);
    const weight = 1 + (wantsDrops ? Math.min(Math.floor((dropsSpent ?? 0) / DROPS_PER_WEIGHT), MAX_BONUS_WEIGHT) : 0);

    const settled = wantsDrops ? dropsSpent ?? 0 : 0;
    const voteValues = { roundId: round.id, token, userId, optionIndex, dropsSpent: settled, weight };
    const conflictSet = { optionIndex, weight, dropsSpent: settled, userId };

    if (wantsDrops && userId) {
      const result = await db.transaction(async (tx) => {
        const transfer = await transferDrops(tx, {
          fromUserId: userId,
          toUserId: story.userId,
          amount: dropsSpent ?? 0,
          type: "vote-weight",
          message: `Weighted the floor on "${round.prompt.slice(0, 60)}"`,
          sessionId,
        });
        if ("error" in transfer) return transfer;
        await tx
          .insert(campaignFloorAudienceVotes)
          .values(voteValues)
          .onConflictDoUpdate({
            target: [campaignFloorAudienceVotes.roundId, campaignFloorAudienceVotes.token],
            set: conflictSet,
          });
        return transfer;
      });
      if ("error" in result) {
        return NextResponse.json({ error: { code: "INSUFFICIENT_BALANCE", message: "Not enough drops" } }, { status: 400 });
      }
    } else {
      await db
        .insert(campaignFloorAudienceVotes)
        .values(voteValues)
        .onConflictDoUpdate({
          target: [campaignFloorAudienceVotes.roundId, campaignFloorAudienceVotes.token],
          set: conflictSet,
        });
    }

    const { tally, voters, myVote } = await tallyFor(round.id, options.length, token);
    return NextResponse.json({ data: { tally, voters, myVote } });
  } catch (error) {
    console.error("POST house vote error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to record vote" } }, { status: 500 });
  }
}
