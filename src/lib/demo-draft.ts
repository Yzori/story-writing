// The anonymous demo editor's draft — the writing a stranger did before
// signing up. The companion of anon-reader.ts: register/login (and the
// ContinuityImporter for OAuth arrivals) import it into a real story so
// nothing is lost at the door.

export const DEMO_DRAFT_KEY = "quiloria-demo-draft-v1";

export interface DemoDraft {
  title?: string;
  content?: string;
  updatedAt?: number;
}

export function readDemoDraft(): DemoDraft | null {
  try {
    const raw = localStorage.getItem(DEMO_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoDraft;
    if (!parsed?.content) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDemoDraft() {
  try { localStorage.removeItem(DEMO_DRAFT_KEY); } catch {}
}

/**
 * Imports a localStorage demo draft into a real story for a freshly
 * authenticated user. Best-effort: on any failure we return null and keep
 * the local draft so a later sign-in can retry. Clearing the key is the
 * caller's job — only after acting on the returned story id.
 */
export async function importDemoDraft(draft: DemoDraft): Promise<string | null> {
  try {
    const storyRes = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title?.trim() || "Untitled story",
        format: "novel",
        writingMode: "solo",
      }),
    });
    const storyJson = await storyRes.json();
    const storyId: string | undefined = storyJson.data?.id;
    if (!storyRes.ok || !storyId) return null;

    // Replace the auto-created first chapter's content with the draft.
    const chaptersRes = await fetch(`/api/stories/${storyId}/chapters?withContent=true`, { cache: "no-store" });
    const chaptersJson = await chaptersRes.json();
    const firstChapter = chaptersJson?.data?.[0];
    if (firstChapter?.id) {
      await fetch(`/api/stories/${storyId}/chapters/${firstChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.content }),
      });
    } else {
      // No auto chapter — create one with the draft content.
      await fetch(`/api/stories/${storyId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Chapter 1", content: draft.content }),
      });
    }

    return storyId;
  } catch {
    return null;
  }
}
