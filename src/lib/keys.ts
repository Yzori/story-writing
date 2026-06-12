/**
 * Platform-aware shortcut labels, so the same screen never shows "⌘K"
 * in one corner and "Ctrl K" in another. SSR renders the Mac glyphs
 * (shortest), the client corrects on hydration via useModChord.
 */

import { useSyncExternalStore } from "react";

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return true;
  return /Mac|iP(hone|ad|od)/.test(navigator.platform);
}

/** "⌘K" on Mac, "Ctrl K" elsewhere. */
export function modChord(key: string): string {
  return isMacPlatform() ? `⌘${key}` : `Ctrl ${key}`;
}

const subscribeNoop = () => () => {};

/** Hydration-safe modChord — serves the Mac glyph on the server. */
export function useModChord(key: string): string {
  return useSyncExternalStore(
    subscribeNoop,
    () => modChord(key),
    () => `⌘${key}`
  );
}
