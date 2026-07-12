// Client-side shapes for Adventures ("the table").
// Mirrors what /api/adventures/[adventureId] and /passages return.

export type AdventurePace =
  | "turn-daily"
  | "turn-2-days"
  | "turn-weekly"
  | "live";

export type AdventureInk =
  | "amber"
  | "rose"
  | "sage"
  | "lavender"
  | "teal"
  | "copper";

export interface AdventureView {
  id: string;
  storyId: string;
  ownerId: string;
  title: string;
  premise: string;
  genre: string;
  pace: AdventurePace;
  turnDueHours: number;
  status: "casting" | "running" | "finished" | "abandoned";
  actNo: number;
  sceneNo: number;
  spotlightSeatId: string | null;
  spotlightSince: string | null;
  spotlightDueAt: string | null;
  boardVisibility: "private" | "board";
  updatedAt: string;
}

export interface AdventureSeatView {
  id: string;
  userId: string | null;
  role: "director" | "writer";
  characterName: string;
  characterBrief: string;
  inkColor: AdventureInk;
  status: "open" | "seated" | "left";
  stepForwardAct: number;
  userName: string | null;
  userAvatarUrl: string | null;
}

export interface AdventureSceneView {
  id: string;
  actNo: number;
  sceneNo: number;
  title: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
}

export interface AdventureHandView {
  id: string;
  seatId: string;
  raisedAt: string;
  /** Empty unless you're the Director or it's your own hand. */
  whisper: string;
}

export interface AdventurePassageView {
  id: string;
  sceneId: string;
  seatId: string;
  kind: "scene-open" | "direction" | "character";
  content: string;
  wordCount: number;
  sortOrder: number;
  signedAt: string;
}

export type { SeatPresenceView } from "@/lib/adventure-presence";
import type { SeatPresenceView } from "@/lib/adventure-presence";

export interface AdventureTableState {
  adventure: AdventureView;
  seats: AdventureSeatView[];
  scenes: AdventureSceneView[];
  hands: AdventureHandView[];
  presence: SeatPresenceView[];
  mySeatId: string;
}

export const PACE_LABELS: Record<AdventurePace, string> = {
  "turn-daily": "One turn a day",
  "turn-2-days": "A turn every two days",
  "turn-weekly": "A turn a week",
  live: "Live at the table",
};
