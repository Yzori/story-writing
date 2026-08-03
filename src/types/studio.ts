// ─────────────────────────────────────────────────────────────────────────────
// The studio's payload, shared by the server that builds it and the beats that
// render it. Client-safe (no drizzle, no server-only) — the service that fills
// these lives in src/server/services/studio.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** A work standing on the shelf: owned, played, or written at a table. */
export interface StudioShelfItem {
  id: string;
  title: string;
  format: string;
  writingMode: string;
  status: string;
  slug: string | null;
  coverImageUrl: string | null;
  chapterCount: number;
  totalWords: number;
  sparkCount: number;
  playerCount: number;
  updatedAt: string;
  /** legacy campaign only — the session that's open right now */
  activeSession: { id: string; title: string; activePlayerId: string | null } | null;
}

export type TableSeatRole = "director" | "writer";

/**
 * A table you sit at (or host). The turn clock is the point: `spotlightDueAt`
 * is a real deadline on a real person's turn — the most urgent true thing this
 * product can show anyone.
 */
export interface StudioTable {
  adventureId: string;
  storyId: string;
  slug: string | null;
  title: string;
  premise: string;
  genre: string;
  pace: string;
  /** how long a full turn gets — the denominator of the turn clock */
  turnDueHours: number;
  status: "casting" | "running";
  actNo: number;
  sceneNo: number;
  // ── my seat ──
  mySeatId: string | null;
  myRole: TableSeatRole | null;
  isHost: boolean;
  // ── the spotlight ──
  isMyTurn: boolean;
  spotlightName: string | null;
  spotlightDueAt: string | null;
  // ── the cast ──
  seatsTotal: number;
  seatsFilled: number;
  openSeats: number;
  castPresent: number;
  /** a name, only while their keystroke pulse is fresh — never a guess */
  writingNow: string | null;
  // ── the house ──
  watchers: number;
  pendingApplications: number;
  updatedAt: string;
}

export interface StudioManuscript {
  storyId: string;
  slug: string | null;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  words: number;
  /** closing lines of the chapter, plain text, "…"-prefixed when mid-stream */
  lastLines: string;
  /** the Hemingway bridge — a line you left for tomorrow-you */
  bridgeNote: string | null;
  updatedAt: string;
}

export interface StudioReaderNote {
  id: string;
  content: string;
  author: string | null;
  storyTitle: string;
  slug: string | null;
  chapterId: string;
  createdAt: string;
}

export interface StudioContinueReading {
  storyId: string;
  slug: string | null;
  storyTitle: string;
  coverImageUrl: string | null;
  genres: string[];
  author: string | null;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  totalChapters: number;
  scrollPercent: number;
}

export interface StudioSignals {
  readingStreak: number;
  manuscript: StudioManuscript | null;
  readerNotes: StudioReaderNote[];
  newFollowersWeek: number;
  continueReading: StudioContinueReading | null;
  wordsTrend: number[];
  sparksWeek: number;
  dropsWeek: number;
  /** readers with a live place in one of your stories, right now — or null */
  readersNow: { count: number; storyId: string; slug: string | null; storyTitle: string | null } | null;
  suggestions: {
    count: number;
    latest: { storyId: string; storyTitle: string; storySlug: string | null; note: string; createdAt: string } | null;
  };
  follows: {
    kind: "chapter" | "update";
    storyId: string;
    slug: string | null;
    storyTitle: string;
    author: string | null;
    title: string;
    createdAt: string;
  }[];
  commissions: {
    count: number;
    latest: { id: string; craft: string | null; title: string; patron: string | null; status: string; createdAt: string } | null;
  };
}

export interface DiscoverData {
  trending: {
    id: string;
    title: string;
    slug: string | null;
    coverImageUrl: string | null;
    genres: string[];
    author: string | null;
    sparkCount: number;
  }[];
  jam: { id: string; title: string; theme: string; liveStatus: string } | null;
  openCall: { id: string; storyId: string; slug: string | null; storyTitle: string; role: string; title: string } | null;
}

/** Everything the studio renders, in one round trip. */
export interface StudioSnapshot {
  shelf: StudioShelfItem[];
  tables: StudioTable[];
  signals: StudioSignals;
  /**
   * The instant this snapshot was built, in epoch ms. Heat and turn clocks
   * measure from here, so the hero the server picked is the hero the client
   * keeps — reading the browser's clock during the first render would let the
   * two disagree and swap the hero on hydration.
   */
  builtAt: number;
}

export const EMPTY_SIGNALS: StudioSignals = {
  readingStreak: 0,
  manuscript: null,
  readerNotes: [],
  newFollowersWeek: 0,
  continueReading: null,
  wordsTrend: [],
  sparksWeek: 0,
  dropsWeek: 0,
  readersNow: null,
  suggestions: { count: 0, latest: null },
  follows: [],
  commissions: { count: 0, latest: null },
};

export const EMPTY_SNAPSHOT: StudioSnapshot = {
  shelf: [],
  tables: [],
  signals: EMPTY_SIGNALS,
  builtAt: 0,
};
