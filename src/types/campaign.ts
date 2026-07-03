import type { CampaignTurnType } from "@/lib/campaign-turns";

export interface Turn {
  id: string;
  sessionId: string;
  userId: string;
  characterId: string | null;
  type: CampaignTurnType;
  content: string;
  metadata: string | null;
  sortOrder: number;
  createdAt: string;
  user: {
    id: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  characterName: string | null;
  characterPortrait: string | null;
}

export interface CampaignSession {
  id: string;
  storyId: string;
  title: string;
  summary: string;
  opening: string | null;
  epilogue: string | null;
  cliffhanger: string | null;
  closingMood: string | null;
  activePlayerId: string | null;
  // Session-scoped continuity (D2). actingGmId = the substitute currently
  // running the session (null = owner). takeoverProposerId = a player who has
  // offered to run while the GM is away, awaiting one other player's confirm.
  actingGmId: string | null;
  takeoverProposerId: string | null;
  status: string;
}

export interface RollRequest {
  targetUserId: string;
  attribute: string;
  reason: string;
  onSuccess: string;
  onFailure: string;
  fatal: boolean;
  status: "open" | "closed" | "cancelled";
  requiredUserIds: string[];
  turnId: string;
  sortOrder: number;
}

export interface PlayerCharacter {
  id: string;
  userId: string;
  name: string;
  portrait: string | null;
  description: string | null;
  traits: string | null;
  stats: string | null;
  status: string;
  user?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  marks?: CharacterMark[];
}

export type CharacterMarkKind = "scar" | "vow" | "debt" | "memory";

export interface CharacterMark {
  id: string;
  characterId: string;
  storyId: string;
  sessionId: string | null;
  sourceTurnId: string | null;
  kind: CharacterMarkKind;
  text: string;
  createdAt: string;
}

export interface SessionRosterEntry {
  id: string;
  sessionId: string;
  characterId: string;
  userId: string;
  status: "present" | "absent" | "introduced" | "spectating";
}

// One Crossroads shape since 2026-07-01: players submit, the table votes,
// the GM canonizes. (Legacy rows may carry "gm_pick"/"house_fork" modes.)
export type FloorRoundMode = "vote";
export type FloorRoundStatus = "open" | "voting" | "closed" | "resolved" | "cancelled";

export interface FloorSubmission {
  id: string;
  roundId: string;
  userId: string | null;
  characterId: string | null;
  type: CampaignTurnType;
  content: string;
  source: "player" | "audience_spark";
  sourceLabel: string | null;
  audienceSparkId: string | null;
  status: "submitted" | "selected" | "rejected";
  createdAt: string;
  characterName: string | null;
  user: {
    id: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  voteCount: number;
  audiencePulseCount: number;
  isMine: boolean;
}

export interface FloorRound {
  id: string;
  sessionId: string;
  openedBy: string;
  prompt: string;
  mode: FloorRoundMode;
  status: FloorRoundStatus;
  audiencePulseEnabled: boolean;
  selectedSubmissionId: string | null;
  createdAt: string;
  updatedAt: string;
  submissions: FloorSubmission[];
  myVoteSubmissionId: string | null;
  voteCount: number;
  eligibleVoterCount: number;
  allEligibleVotersVoted: boolean;
  isVoteEligible: boolean;
  audiencePulseCount: number;
  myAudiencePulseSubmissionId: string | null;
}

export interface StoryData {
  id: string;
  userId: string;
  title: string;
  /** Background image for the campaign's SpatialMap. Null until the GM
   *  sets one via the map overlay's "Set map" dialog. */
  mapImageUrl?: string | null;
}

export interface CharacterStats {
  aspect: string;
}

export function parseStats(statsJson: string | null): CharacterStats | null {
  if (!statsJson) return null;
  try {
    const raw = JSON.parse(statsJson);
    // The aspect is the only stat a character carries. Rolls are flat 2d6
    // (audit D1); older rows may also hold an "approaches" spread or legacy
    // D&D attributes — both are dead weight and ignored.
    if (typeof raw.aspect === "string") return { aspect: raw.aspect };
    if (raw.approaches || raw.attributes) return { aspect: "" };
    return null;
  } catch {
    return null;
  }
}

// Stable color assignment for players based on index
const PLAYER_COLORS = [
  "text-rose",
  "text-indigo-400",
  "text-emerald-400",
  "text-violet-400",
  "text-cyan-400",
  "text-orange-400",
  "text-pink-400",
  "text-lime-400",
];

export function getPlayerColor(userId: string, allUserIds: string[]): string {
  const idx = allUserIds.indexOf(userId);
  return idx >= 0 ? PLAYER_COLORS[idx % PLAYER_COLORS.length] : "text-white/80";
}

// The manuscript surface writes each player in their own ink. The CSS vars
// --ink-1..8 (+ --ink-gm, --ink-faded) are defined on .manuscript-room in
// globals.css with per-theme values; this returns the var() for inline style.
const INK_COUNT = 8;

export function getPlayerInk(userId: string, allUserIds: string[]): string {
  const idx = allUserIds.indexOf(userId);
  return idx >= 0 ? `var(--ink-${(idx % INK_COUNT) + 1})` : "var(--ink-faded)";
}
