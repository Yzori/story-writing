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
    id: string;
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
  closingMood: string | null;
  activePlayerId: string | null;
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
}

export interface SessionRosterEntry {
  id: string;
  sessionId: string;
  characterId: string;
  userId: string;
  status: "present" | "absent" | "introduced" | "spectating";
}

export type FloorRoundMode = "gm_pick" | "vote";
export type FloorRoundStatus = "open" | "voting" | "closed" | "resolved" | "cancelled";

export interface FloorSubmission {
  id: string;
  roundId: string;
  userId: string;
  characterId: string;
  type: CampaignTurnType;
  content: string;
  status: "submitted" | "selected" | "rejected";
  createdAt: string;
  characterName: string | null;
  user: {
    id: string;
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
}

export interface CharacterStats {
  approaches: {
    Bold: number;
    Keen: number;
    Subtle: number;
  };
  aspect: string;
}

// Legacy shape for backward compat
interface LegacyStats {
  hp?: { current: number; max: number };
  mp?: { current: number; max: number };
  attributes?: Record<string, number>;
  items?: string[];
}

export function parseStats(statsJson: string | null): CharacterStats | null {
  if (!statsJson) return null;
  try {
    const raw = JSON.parse(statsJson);
    // New shape
    if (raw.approaches) return raw as CharacterStats;
    // Migrate legacy D&D stats to approaches
    if (raw.attributes) {
      const legacy = raw as LegacyStats;
      const attrs = legacy.attributes ?? {};
      // Map legacy attributes to approaches heuristically
      const bold = Math.max((attrs.STR ?? 10) >= 14 ? 1 : 0, (attrs.CON ?? 10) >= 14 ? 1 : 0);
      const keen = Math.max((attrs.INT ?? 10) >= 14 ? 1 : 0, (attrs.WIS ?? 10) >= 14 ? 1 : 0);
      const subtle = Math.max((attrs.DEX ?? 10) >= 14 ? 1 : 0, (attrs.CHA ?? 10) >= 14 ? 1 : 0);
      return { approaches: { Bold: bold, Keen: keen, Subtle: subtle }, aspect: "" };
    }
    return null;
  } catch {
    return null;
  }
}

export const APPROACHES = ["Bold", "Keen", "Subtle"] as const;
export type Approach = (typeof APPROACHES)[number];

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
