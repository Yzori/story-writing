/**
 * Generate a URL-friendly slug from a title.
 * Lowercases, replaces spaces with hyphens, strips non-alphanumeric chars,
 * and appends a 6-character random suffix for uniqueness.
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Count words in an HTML string by stripping tags first.
 */
export function countWords(html: string): number {
  const cleaned = html.replace(/<[^>]*>/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}
