/**
 * Shared API response types used across multiple pages.
 * These mirror the shapes returned by API route handlers.
 */

// ── Story Types ─────────────────────────────────────────────

/** Story summary returned by list endpoints (browse, dashboard, profile). */
export interface ApiStory {
  id: string;
  title: string;
  format: string;
  synopsis: string | null;
  hook?: string | null;
  coverImageUrl: string | null;
  genres: string[];
  contentRating: string;
  contentNotes?: string[];
  status: string;
  writingMode?: string;
  isPublic?: boolean;
  campaignCadence?: string;
  campaignAuditionPrompt?: string;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  chapterCount: number;
  totalWords: number;
  sparkCount: number;
  playerCount?: number;
  sessionCount?: number;
}

/** Full story detail returned by /api/stories/by-slug/[slug]. */
export interface ApiStoryData {
  id: string;
  userId: string;
  title: string;
  format: string;
  synopsis: string | null;
  hook?: string | null;
  dedication: string | null;
  coverImageUrl: string | null;
  genres: string[];
  contentRating: string;
  contentNotes?: string[];
  status: string;
  slug: string | null;
  writingMode: string | null;
  isPublic?: boolean;
  campaignSeats?: number;
  campaignToneMood?: number;
  campaignToneScale?: number;
  campaignToneInfluence?: number;
  campaignCadence?: string;
  campaignAuditionPrompt?: string;
  dropCaps?: boolean;
  sceneBreakStyle?: "asterism" | "fleuron" | "dots" | "line" | "text-line" | "space";
  paragraphIndent?: boolean;
  lineSpacing?: "compact" | "comfortable" | "relaxed";
  textAlignment?: "left" | "center" | "justified";
  paragraphSpacing?: "tight" | "normal" | "loose";
  createdAt: string;
  updatedAt: string;
  author: ApiAuthor | null;
  chapters: ApiChapter[];
}

// ── Author ──────────────────────────────────────────────────

export interface ApiAuthor {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  role?: string;
}

// ── Chapter ─────────────────────────────────────────────────

export interface ApiChapter {
  id: string;
  title: string;
  wordCount: number;
  sortOrder: number;
  status: string;
  createdAt: string;
  content?: string;
}

// ── Collaborator ────────────────────────────────────────────

export interface ApiCollaborator {
  id: string;
  storyId: string;
  userId: string;
  role: string;
  status: string;
  invitedBy?: string;
  createdAt: string;
  updatedAt?: string;
  user: { id: string; displayName: string | null; avatarUrl: string | null } | null;
}

// ── Update ──────────────────────────────────────────────────

export interface ApiUpdate {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

// ── Notification ────────────────────────────────────────────

export type NotifType =
  | "chapter"
  | "spark"
  | "follow"
  | "comment"
  | "update"
  | "collaboration"
  | "suggestion"
  | "open-call"
  | "tip"
  | "jam"
  | "annotation"
  | "circle"
  | "letter"
  | "candle";

export interface ApiNotification {
  id: string;
  type: NotifType;
  message: string;
  href: string;
  read: boolean;
  createdAt: string;
}

// ── Reading Progress ────────────────────────────────────────

export interface ApiReadingProgress {
  storyId: string;
  chapterId: string;
  scrollPercent: number;
  pageNumber: number;
  updatedAt: string;
  storyTitle: string;
  storySlug: string | null;
  storyCoverUrl: string | null;
  storyGenres: string[];
  chapterTitle: string;
  chapterSortOrder: number;
  authorName: string | null;
  authorId: string;
}

// ── Campaign Application ────────────────────────────────────

export interface ApiCampaignApplication {
  id: string;
  storyId: string;
  userId: string;
  pitch: string;
  characterName?: string | null;
  characterArchetype?: string | null;
  characterKnownFor?: string | null;
  firstGlimpse?: string | null;
  playerCadence?: string | null;
  playerSpotlight?: "driver" | "reactor" | "fades" | string | null;
  writingSampleUrl?: string | null;
  voiceCadence?: string | null;
  voiceMood?: string | null;
  voiceRestraint?: string | null;
  status: string;
  votingDeadline: string | null;
  createdAt: string;
  user: {
    displayName: string | null;
    avatarUrl: string | null;
  };
}
