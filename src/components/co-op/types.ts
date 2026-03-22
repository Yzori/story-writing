export interface PresenceEntry {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  chapterId: string | null;
  status: "viewing" | "editing";
  lastHeartbeat: string;
}

export interface CoopChapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  status: "draft" | "published";
  sortOrder: number;
  version: number;
  authorNoteBefore: string;
  authorNoteAfter: string;
  outline: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  type: "chat" | "edit" | "join" | "leave" | "suggestion" | "publish";
  content: string;
  metadata: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface CoopCollaborator {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
}

export type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";
