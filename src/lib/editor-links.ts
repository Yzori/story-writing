// ─────────────────────────────────────────────────────────────────────────────
// Canonical editor route for a story. Single source of truth for every surface
// that links into an editor (dashboard tiles, hero CTA, create flow, write
// redirects). Add new format/mode routes here, nowhere else.
// ─────────────────────────────────────────────────────────────────────────────

export interface EditorRouteStory {
  id: string;
  format?: string | null;
  writingMode?: string | null;
  slug?: string | null;
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
  // Adventure books are written at the table; the compiled story is only read.
  if (story.writingMode === "adventure") {
    return story.slug ? `/story/${story.slug}` : "/adventures";
  }
  if (story.writingMode === "co-op") return `/write/${story.id}/co-op`;
  if (story.format === "webtoon") return `/write/${story.id}/webtoon`;
  return `/write/${story.id}`;
}
