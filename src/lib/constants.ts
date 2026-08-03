/**
 * Shared constants used across API routes, pages, and components.
 */

// ── Ink Drops → USD conversion ──────────────────────────────
// Anchored to the mid-tier purchase (1200 drops for $9.99 = $0.0083/drop).
// Single source of truth — keep all USD-equivalent displays consistent.

export const DROPS_TO_USD = 0.0083;

export function dropsToUsd(drops: number): string {
  return (drops * DROPS_TO_USD).toFixed(2);
}

// ── Creator revenue share ───────────────────────────────────
// The platform keeps 1 - CREATOR_SHARE; the maker(s) keep this fraction of
// every gross payment (unlocks, donations, gold, subscriptions, …). Single
// source of truth — every payout site and the earnings report must use it.

export const CREATOR_SHARE = 0.7;

// ── Chapter gating tier prices (in Ink Drops) ───────────────

export const TIER_PRICES: Record<string, number> = {
  free: 0,
  standard: 15,
  extended: 30,
  premium: 50,
};

// ── First chapter title by format ───────────────────────────
// Every new story is seeded with one empty chapter so the editor always has
// something to write into. Each format calls its first unit something else.

const FIRST_UNIT_BY_FORMAT: Record<string, string> = {
  novel: "Chapter 1",
  poetry: "Poem 1",
  webtoon: "Episode 1",
  illustrated: "Chapter 1",
  screenplay: "Scene 1",
};

export function firstChapterTitleFor(format?: string | null): string {
  return FIRST_UNIT_BY_FORMAT[format || "novel"] || "Chapter 1";
}

// ── Commission craft types ─────────────────────────────────

export const VALID_CRAFTS = [
  "custom-chapter",
  "cover-art",
  "character-art",
  "editing",
  "poetry",
  "worldbuilding",
  "gm-for-hire",
  "webtoon-panels",
  "screenplay-coverage",
  "scene-illustration",
  "ghostwriting",
  "story-bible",
] as const;

export const CRAFT_LABELS: Record<string, string> = {
  "custom-chapter": "Custom Chapter",
  "cover-art": "Cover Art",
  "character-art": "Character Art",
  editing: "Editing",
  poetry: "Poetry",
  worldbuilding: "Worldbuilding",
  "gm-for-hire": "GM for Hire",
  "webtoon-panels": "Webtoon Panels",
  "screenplay-coverage": "Screenplay Coverage",
  "scene-illustration": "Scene Illustration",
  ghostwriting: "Ghostwriting",
  "story-bible": "Story Bible",
};

export type CraftColorGroup = "writing" | "visual" | "services";

const WRITING_CRAFTS = new Set([
  "custom-chapter",
  "ghostwriting",
  "poetry",
  "screenplay-coverage",
  "editing",
]);
const VISUAL_CRAFTS = new Set([
  "cover-art",
  "character-art",
  "webtoon-panels",
  "scene-illustration",
]);

export function getCraftColorGroup(craft: string): CraftColorGroup {
  if (WRITING_CRAFTS.has(craft)) return "writing";
  if (VISUAL_CRAFTS.has(craft)) return "visual";
  return "services";
}

export function getCraftAccent(craft: string): string {
  const group = getCraftColorGroup(craft);
  if (group === "writing") return "text-gold";
  if (group === "visual") return "text-amethyst";
  return "text-teal";
}

// ── Earnings source labels ──────────────────────────────────

export const SOURCE_LABELS: Record<string, { label: string; accent: string }> = {
  tip: { label: "Live Tips", accent: "bg-rose" },
  donation: { label: "Gifts", accent: "bg-gold" },
  unlock: { label: "Chapter Unlocks", accent: "bg-teal" },
  circle: { label: "Subscriptions", accent: "bg-amber" },
  commission: { label: "Commissions", accent: "bg-amethyst" },
  crossroads: { label: "Crossroads", accent: "bg-sage" },
  gold: { label: "Gold from the audience", accent: "bg-copper" },
};
