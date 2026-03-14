export interface Turn {
  id: string;
  sessionId: string;
  userId: string;
  characterId: string | null;
  type: string;
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
  activePlayerId: string | null;
  status: string;
}

export interface RollRequest {
  targetUserId: string;
  attribute: string;
  reason: string;
  onSuccess: string;
  onFailure: string;
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

export interface StoryData {
  id: string;
  userId: string;
  title: string;
}

export interface CharacterStats {
  hp: { current: number; max: number };
  mp: { current: number; max: number };
  attributes: Record<string, number>;
  items: string[];
}

export function parseStats(statsJson: string | null): CharacterStats | null {
  if (!statsJson) return null;
  try {
    return JSON.parse(statsJson) as CharacterStats;
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
