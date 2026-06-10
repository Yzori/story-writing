// ─────────────────────────────────────────────────────────────────────────────
// Canonical editor route for a story. Single source of truth for every surface
// that links into an editor (dashboard tiles, hero CTA, create flow, write
// redirects). Add new format/mode routes here, nowhere else.
// ─────────────────────────────────────────────────────────────────────────────

export interface EditorRouteStory {
  id: string;
  format?: string | null;
  writingMode?: string | null;
}

export function editorHrefFor(
  story: EditorRouteStory,
  activeSession?: { id: string } | null,
): string {
  if (story.writingMode === "campaign") {
    return activeSession
      ? `/campaign/${story.id}/play/${activeSession.id}`
      : `/campaign/${story.id}`;
  }
  if (story.writingMode === "co-op") return `/write/${story.id}/co-op`;
  if (story.format === "webtoon") return `/write/${story.id}/webtoon`;
  return `/write/${story.id}`;
}
