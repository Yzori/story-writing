import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  campaignSessions,
  campaignFloorRounds,
  campaignFloorAudiencePulses,
  campaignFloorSubmissions,
  campaignFloorVotes,
  playerCharacters,
  sessionRoster,
  stories,
  users,
} from "@/server/db/schema";
import type { FloorRound } from "@/types/campaign";

// Statuses where the round still appears in the UI. The DB partial unique
// index only locks the session slot for 'open' + 'voting' (migration 0021)
// — 'closed' is shown so the player still sees the resolved result, but
// the GM can already open the next round.
const VISIBLE_FLOOR_STATUSES = ["open", "voting", "closed"] as const;
const ACTIVE_ROSTER_STATUSES = ["present", "introduced"] as const;

export async function getEligibleFloorVoterIds(sessionId: string): Promise<Set<string>> {
  const campaignSession = await db.query.campaignSessions.findFirst({
    where: eq(campaignSessions.id, sessionId),
  });
  if (!campaignSession) return new Set();
  const story = await db.query.stories.findFirst({
    where: eq(stories.id, campaignSession.storyId),
  });
  const gmUserId = story?.userId ?? null;

  const rosterRows = await db
    .select({ userId: sessionRoster.userId })
    .from(sessionRoster)
    .innerJoin(playerCharacters, eq(sessionRoster.characterId, playerCharacters.id))
    .where(
      and(
        eq(sessionRoster.sessionId, sessionId),
        inArray(sessionRoster.status, [...ACTIVE_ROSTER_STATUSES]),
        eq(playerCharacters.status, "active"),
      ),
    );

  if (rosterRows.length > 0) {
    return new Set(rosterRows.map((row) => row.userId).filter((userId) => userId !== gmUserId));
  }

  const characterRows = await db
    .select({ userId: playerCharacters.userId })
    .from(playerCharacters)
    .where(
      and(
        eq(playerCharacters.storyId, campaignSession.storyId),
        eq(playerCharacters.status, "active"),
      ),
    );

  return new Set(characterRows.map((row) => row.userId).filter((userId) => userId !== gmUserId));
}

export async function getVisibleFloorRound(
  sessionId: string,
  currentUserId: string,
): Promise<FloorRound | null> {
  // Once a closed round can coexist with a new open round (migration 0021),
  // pick the most recently updated so the active round wins over a stale
  // closed one. Without this, findFirst's order would be undefined.
  const round = await db.query.campaignFloorRounds.findFirst({
    where: and(
      eq(campaignFloorRounds.sessionId, sessionId),
      inArray(campaignFloorRounds.status, [...VISIBLE_FLOOR_STATUSES]),
    ),
    orderBy: [desc(campaignFloorRounds.updatedAt), desc(campaignFloorRounds.createdAt)],
  });

  if (!round) return null;

  const submissions = await db
    .select({
      id: campaignFloorSubmissions.id,
      roundId: campaignFloorSubmissions.roundId,
      userId: campaignFloorSubmissions.userId,
      characterId: campaignFloorSubmissions.characterId,
      type: campaignFloorSubmissions.type,
      content: campaignFloorSubmissions.content,
      source: campaignFloorSubmissions.source,
      sourceLabel: campaignFloorSubmissions.sourceLabel,
      audienceSparkId: campaignFloorSubmissions.audienceSparkId,
      status: campaignFloorSubmissions.status,
      createdAt: campaignFloorSubmissions.createdAt,
      characterName: playerCharacters.name,
      user: {
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
      voteCount: sql<number>`coalesce(count(distinct ${campaignFloorVotes.id}), 0)`,
      audiencePulseCount: sql<number>`coalesce(count(distinct ${campaignFloorAudiencePulses.id}), 0)`,
    })
    .from(campaignFloorSubmissions)
    .leftJoin(playerCharacters, eq(campaignFloorSubmissions.characterId, playerCharacters.id))
    .leftJoin(users, eq(campaignFloorSubmissions.userId, users.id))
    .leftJoin(campaignFloorVotes, eq(campaignFloorVotes.submissionId, campaignFloorSubmissions.id))
    .leftJoin(campaignFloorAudiencePulses, eq(campaignFloorAudiencePulses.submissionId, campaignFloorSubmissions.id))
    .where(eq(campaignFloorSubmissions.roundId, round.id))
    .groupBy(
      campaignFloorSubmissions.id,
      playerCharacters.name,
      users.id,
      users.displayName,
      users.avatarUrl,
    )
    .orderBy(asc(campaignFloorSubmissions.createdAt));

  // The audience path passes currentUserId="" — an empty string is not a
  // uuid, and Postgres rejects the comparison outright, which used to crash
  // every spectator fetch of a live round. No user, no vote to look up.
  const myVote = currentUserId
    ? await db.query.campaignFloorVotes.findFirst({
        where: and(
          eq(campaignFloorVotes.roundId, round.id),
          eq(campaignFloorVotes.userId, currentUserId),
        ),
      })
    : undefined;
  const eligibleVoterIds = await getEligibleFloorVoterIds(sessionId);
  const voteRows = await db
    .select({ userId: campaignFloorVotes.userId })
    .from(campaignFloorVotes)
    .where(eq(campaignFloorVotes.roundId, round.id));
  const voteCount = new Set(
    voteRows
      .map((vote) => vote.userId)
      .filter((userId) => eligibleVoterIds.has(userId)),
  ).size;
  // The `(roundId, token)` unique constraint already guarantees one pulse
  // per spectator per round, so count(*) is the distinct-token count.
  const [pulseCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaignFloorAudiencePulses)
    .where(eq(campaignFloorAudiencePulses.roundId, round.id));
  const audiencePulseCount = pulseCountRow?.count ?? 0;

  // v2 single-block vote: the table writes AND votes in one open phase, so
  // every line is visible to everyone as it lands ("the ink divides"). The
  // old blind-collection reveal (hidden until the GM opened voting) went
  // with the two-phase pipeline — no masking happens here anymore.

  return {
    id: round.id,
    sessionId: round.sessionId,
    openedBy: round.openedBy,
    prompt: round.prompt,
    mode: round.mode as FloorRound["mode"],
    status: round.status as FloorRound["status"],
    audiencePulseEnabled: round.audiencePulseEnabled,
    selectedSubmissionId: round.selectedSubmissionId,
    createdAt: round.createdAt.toISOString(),
    updatedAt: round.updatedAt.toISOString(),
    myVoteSubmissionId: myVote?.submissionId ?? null,
    submissions: submissions
      .map((submission) => ({
        ...submission,
        type: submission.type as FloorRound["submissions"][number]["type"],
        source: (submission.source ?? "player") as FloorRound["submissions"][number]["source"],
        status: submission.status as FloorRound["submissions"][number]["status"],
        createdAt: submission.createdAt.toISOString(),
        characterName: submission.characterName,
        user: {
          id: submission.user?.id ?? submission.userId,
          displayName: submission.user?.displayName ?? null,
          avatarUrl: submission.user?.avatarUrl ?? null,
        },
        voteCount: Number(submission.voteCount ?? 0),
        audiencePulseCount: Number(submission.audiencePulseCount ?? 0),
        isMine: submission.userId === currentUserId,
      })),
    voteCount,
    eligibleVoterCount: eligibleVoterIds.size,
    allEligibleVotersVoted: eligibleVoterIds.size > 0 && voteCount >= eligibleVoterIds.size,
    // Stranger ballots belong to the house alone — the table reads, the
    // dark decides (the votes route enforces the same).
    isVoteEligible: round.mode !== "stranger" && eligibleVoterIds.has(currentUserId),
    audiencePulseCount,
    myAudiencePulseSubmissionId: null,
  };
}

export async function getAudiencePulseFloorRound(
  sessionId: string,
  token: string,
): Promise<FloorRound | null> {
  // v2 rounds live their whole life in "open" (single-block: writing and
  // voting happen together), so the audience must see them there — the old
  // ["voting","closed"] gate belonged to the two-phase reveal pipeline and
  // left watchers blind to every live v2 ballot. Warm-up rounds keep pulses
  // off (the dark reads the question but never leans on an answer), yet the
  // watch page still shows them — hence the widened filter.
  const round = await db.query.campaignFloorRounds.findFirst({
    where: and(
      eq(campaignFloorRounds.sessionId, sessionId),
      or(
        eq(campaignFloorRounds.audiencePulseEnabled, true),
        eq(campaignFloorRounds.mode, "warmup"),
      ),
      inArray(campaignFloorRounds.status, ["open", "voting", "closed"]),
    ),
    orderBy: [desc(campaignFloorRounds.updatedAt), desc(campaignFloorRounds.createdAt)],
  });
  if (!round) return null;

  // v2 reveals all submissions while open ("the ink divides"), so spectators
  // see the same prose the table does. `currentUserId=""` forces
  // `isMine: false` on every submission, which is correct for an
  // unauthenticated audience viewer.
  const floorRound = await getVisibleFloorRound(sessionId, "");
  if (!floorRound) return null;

  const myPulse = await db.query.campaignFloorAudiencePulses.findFirst({
    where: and(
      eq(campaignFloorAudiencePulses.roundId, round.id),
      eq(campaignFloorAudiencePulses.token, token.trim()),
    ),
  });

  return {
    ...floorRound,
    isVoteEligible: false,
    myAudiencePulseSubmissionId: myPulse?.submissionId ?? null,
  };
}

