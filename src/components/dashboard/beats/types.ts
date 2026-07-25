import type { StudioShelfItem, StudioSnapshot, StudioTable } from "@/types/studio";
import { editorHrefFor } from "@/lib/editor-links";
import type { StudioContinueReading } from "@/types/studio";

// ─────────────────────────────────────────────────────────────────────────────
// A beat is one thing the studio has to say.
//
// The studio used to be a single 1099-line component whose sections were
// hardcoded in source order and whose hero was a ternary chain. That made
// every new signal a surgery, and "which hero does a pure reader with one live
// table get?" un-answerable without rendering the whole page.
//
// Now each beat declares its own heat. The composer picks the hottest hero,
// sorts the body by heat, and renders nothing that scores zero. Adding a
// signal is a new file in this folder; tuning the studio's priorities is
// editing numbers in one place.
// ─────────────────────────────────────────────────────────────────────────────

export interface StudioViewModel {
  snapshot: StudioSnapshot;
  userId?: string;
  /** ticks slowly (30s) — turn clocks and staleness read from this, not Date.now() */
  now: number;
  reduce: boolean | null;
  /** which beat won the hero, so body beats can avoid saying it twice */
  heroId: string | null;
}

export type BeatSlot = "hero" | "body" | "margin";

export interface Beat {
  id: string;
  slot: BeatSlot;
  /** 0 means "I have nothing true to say" — the beat does not render at all. */
  heat: (vm: StudioViewModel) => number;
  render: (vm: StudioViewModel) => React.ReactNode;
}

// ── shared reading of the snapshot ───────────────────────────────────────────

export const HOUR_MS = 3_600_000;

export function storyHref(story: StudioShelfItem): string {
  return editorHrefFor(story, story.activeSession);
}

export function readingHref(s: StudioContinueReading | null): string {
  if (!s) return "/read";
  return s.slug ? `/story/${s.slug}/read/${s.chapterId}` : "/read";
}

export function tableHref(t: StudioTable): string {
  // A seated writer plays; everyone else watches from the house.
  return t.mySeatId ? `/adventures/${t.adventureId}` : `/adventures/${t.adventureId}/watch`;
}

/** The table where the spotlight is on me, soonest deadline first. */
export function myTurnTable(vm: StudioViewModel): StudioTable | null {
  const mine = vm.snapshot.tables.filter((t) => t.isMyTurn && t.status === "running");
  if (mine.length === 0) return null;
  return mine.sort((a, b) => dueMs(a, vm.now) - dueMs(b, vm.now))[0];
}

/** Milliseconds until this table's turn expires; Infinity when it has no clock. */
export function dueMs(t: StudioTable, now: number): number {
  if (!t.spotlightDueAt) return Infinity;
  return new Date(t.spotlightDueAt).getTime() - now;
}

/**
 * "Four hours left", "23 minutes left", "overdue".
 * Deliberately coarse: a second-by-second countdown would be a pressure
 * device, and this is a note about a real deadline, not a game timer.
 */
export function dueLabel(ms: number): string {
  if (!Number.isFinite(ms)) return "no clock on this turn";
  if (ms <= 0) return "the turn is overdue";
  const hours = ms / HOUR_MS;
  if (hours < 1) {
    const mins = Math.max(1, Math.round(ms / 60_000));
    return `${mins} minute${mins === 1 ? "" : "s"} left`;
  }
  if (hours < 24) {
    const h = Math.round(hours);
    return `${h} hour${h === 1 ? "" : "s"} left`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} left`;
}

/** A running table someone else holds the spotlight at. */
export function liveTables(vm: StudioViewModel): StudioTable[] {
  return vm.snapshot.tables.filter((t) => t.status === "running" && !t.isMyTurn);
}

/** The legacy campaign session that's open right now, if any. */
export function liveCampaign(vm: StudioViewModel): StudioShelfItem | null {
  return vm.snapshot.shelf.find((s) => s.writingMode === "campaign" && s.activeSession) ?? null;
}

/** Owned works — the shelf proper. */
export function works(vm: StudioViewModel): StudioShelfItem[] {
  return vm.snapshot.shelf;
}

/**
 * Freshness on a 0..1 curve: 1 when it happened just now, ~0.5 after a day,
 * trailing off over a week. Used to keep stale things from winning the hero.
 */
export function freshness(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  const age = Math.max(0, now - new Date(iso).getTime());
  return 1 / (1 + age / (24 * HOUR_MS));
}
