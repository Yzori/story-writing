import "server-only";
import { db } from "@/server/db";
import { campaignTurns, playerCharacters } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { countWords } from "@/lib/utils";
import { isStoryTurnType, isLogTurnType } from "@/lib/campaign-turns";

/**
 * Post-session readout — the playtest instrument.
 *
 * The niche bet (see ~/.claude/plans/coauthorship-flagship-plan.md) is that the
 * make-or-break variable for co-writing-that-doesn't-die is *stall*: silence
 * between turns, the pen sitting idle, a player going quiet. This reads that
 * signal off `campaign_turns` timestamps so a real playtest produces numbers,
 * not vibes. It measures the loop; it does not touch the story.
 */

// A silence longer than this counts as a stall. Deliberately generous — a
// live table's turns run in minutes, and we'd rather under-count stalls than
// cry wolf on a thoughtful pause. Env-tunable (server-only) so a playtest can
// resolve stalls at its own tempo; the default is the production value.
export const STALL_THRESHOLD_MS = (() => {
  const n = Number(process.env.READOUT_STALL_MS);
  return Number.isFinite(n) && n > 0 ? n : 3 * 60 * 1000;
})();

/** How many of the worst silences the readout lists in detail. */
const TOP_STALLS = 5;

export type ReadoutTurn = {
  userId: string;
  characterName: string | null;
  type: string;
  content: string;
  createdAt: Date;
};

export type ReadoutAuthor = {
  userId: string;
  label: string;
  isDirector: boolean;
  turns: number;
  storyTurns: number;
  words: number;
  firstAt: string | null;
  lastAt: string | null;
  // How long before the session closed this author last touched the page.
  // The "who went quiet and when" signal.
  quietBeforeEndMs: number;
};

export type ReadoutStall = {
  gapMs: number;
  // Who wrote the line the silence opened after, and when.
  afterLabel: string;
  afterType: string;
  afterAt: string;
  // Who eventually broke the silence, and when.
  brokenByLabel: string;
  brokenAt: string;
};

export type SessionReadout = {
  sessionId: string;
  title: string;
  status: string;
  openedAt: string;
  firstTurnAt: string | null;
  lastTurnAt: string | null;
  endedAt: string;
  // Span of actual writing (first turn → last turn).
  activeSpanMs: number;
  // Wall clock from session creation to close.
  wallClockMs: number;
  totalTurns: number;
  storyTurns: number;
  logTurns: number;
  // Words that reach the book — story turns only.
  totalWords: number;
  medianGapMs: number | null;
  longestGapMs: number | null;
  // The pen sat idle this long at the end before someone closed the session.
  trailingSilenceMs: number;
  stallThresholdMs: number;
  stallCount: number;
  stalls: ReadoutStall[];
  authors: ReadoutAuthor[];
};

type SessionShape = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function labelFor(turn: ReadoutTurn, gmId: string): string {
  if (turn.characterName) return turn.characterName;
  if (turn.userId === gmId) return "Director";
  return `${turn.userId.slice(0, 8)}…`;
}

/**
 * Pure summary — turns must be pre-sorted by play order (sortOrder). Split out
 * from the DB read so the arithmetic (the numbers the gate rests on) is unit
 * testable without a database.
 */
export function summarizeSession(
  session: SessionShape,
  gmId: string,
  turns: ReadoutTurn[]
): SessionReadout {
  const openedAt = session.createdAt;
  const firstTurnAt = turns.length ? turns[0].createdAt : null;
  const lastTurnAt = turns.length ? turns[turns.length - 1].createdAt : null;
  // Completed sessions close at updatedAt; a still-open session's clock runs
  // to its last sign of life (last turn, else its own creation).
  const endedAt =
    session.status === "completed"
      ? session.updatedAt
      : (lastTurnAt ?? openedAt);

  // Inter-turn silences — the stall signal.
  const gaps: number[] = [];
  const stalls: ReadoutStall[] = [];
  for (let i = 1; i < turns.length; i++) {
    const gapMs = turns[i].createdAt.getTime() - turns[i - 1].createdAt.getTime();
    // Clamp negatives to 0 — same-instant inserts (a resolution that appends a
    // record line plus a passage) can land out of monotonic order by clock.
    const gap = Math.max(0, gapMs);
    gaps.push(gap);
    if (gap >= STALL_THRESHOLD_MS) {
      stalls.push({
        gapMs: gap,
        afterLabel: labelFor(turns[i - 1], gmId),
        afterType: turns[i - 1].type,
        afterAt: turns[i - 1].createdAt.toISOString(),
        brokenByLabel: labelFor(turns[i], gmId),
        brokenAt: turns[i].createdAt.toISOString(),
      });
    }
  }
  stalls.sort((a, b) => b.gapMs - a.gapMs);

  // Per-author participation.
  const byUser = new Map<
    string,
    {
      label: string;
      isDirector: boolean;
      turns: number;
      storyTurns: number;
      words: number;
      firstAt: Date;
      lastAt: Date;
    }
  >();
  for (const turn of turns) {
    const existing = byUser.get(turn.userId);
    const isStory = isStoryTurnType(turn.type);
    const words = isStory ? countWords(turn.content) : 0;
    if (existing) {
      existing.turns += 1;
      existing.storyTurns += isStory ? 1 : 0;
      existing.words += words;
      if (turn.createdAt < existing.firstAt) existing.firstAt = turn.createdAt;
      if (turn.createdAt > existing.lastAt) existing.lastAt = turn.createdAt;
    } else {
      byUser.set(turn.userId, {
        label: labelFor(turn, gmId),
        isDirector: turn.userId === gmId,
        turns: 1,
        storyTurns: isStory ? 1 : 0,
        words,
        firstAt: turn.createdAt,
        lastAt: turn.createdAt,
      });
    }
  }

  const endedMs = endedAt.getTime();
  const authors: ReadoutAuthor[] = [...byUser.entries()]
    .map(([userId, a]) => ({
      userId,
      label: a.label,
      isDirector: a.isDirector,
      turns: a.turns,
      storyTurns: a.storyTurns,
      words: a.words,
      firstAt: a.firstAt.toISOString(),
      lastAt: a.lastAt.toISOString(),
      quietBeforeEndMs: Math.max(0, endedMs - a.lastAt.getTime()),
    }))
    .sort((a, b) => b.words - a.words);

  const storyTurns = turns.filter((t) => isStoryTurnType(t.type)).length;
  const logTurns = turns.filter((t) => isLogTurnType(t.type)).length;
  const totalWords = authors.reduce((sum, a) => sum + a.words, 0);

  return {
    sessionId: session.id,
    title: session.title,
    status: session.status,
    openedAt: openedAt.toISOString(),
    firstTurnAt: firstTurnAt ? firstTurnAt.toISOString() : null,
    lastTurnAt: lastTurnAt ? lastTurnAt.toISOString() : null,
    endedAt: endedAt.toISOString(),
    activeSpanMs:
      firstTurnAt && lastTurnAt
        ? lastTurnAt.getTime() - firstTurnAt.getTime()
        : 0,
    wallClockMs: Math.max(0, endedMs - openedAt.getTime()),
    totalTurns: turns.length,
    storyTurns,
    logTurns,
    totalWords,
    medianGapMs: median(gaps),
    longestGapMs: gaps.length ? Math.max(...gaps) : null,
    trailingSilenceMs: lastTurnAt
      ? Math.max(0, endedMs - lastTurnAt.getTime())
      : 0,
    stallThresholdMs: STALL_THRESHOLD_MS,
    stallCount: stalls.length,
    stalls: stalls.slice(0, TOP_STALLS),
    authors,
  };
}

/**
 * Load a session's turns and compute its readout. Caller is responsible for
 * authorization (GM-only) — this just reads and summarizes.
 */
export async function loadSessionReadout(
  session: SessionShape & { actingGmId: string | null },
  ownerId: string
): Promise<SessionReadout> {
  const gmId = session.actingGmId ?? ownerId;

  const turns = await db
    .select({
      userId: campaignTurns.userId,
      characterName: playerCharacters.name,
      type: campaignTurns.type,
      content: campaignTurns.content,
      createdAt: campaignTurns.createdAt,
    })
    .from(campaignTurns)
    .leftJoin(
      playerCharacters,
      eq(campaignTurns.characterId, playerCharacters.id)
    )
    .where(eq(campaignTurns.sessionId, session.id))
    .orderBy(asc(campaignTurns.sortOrder));

  return summarizeSession(session, gmId, turns);
}
