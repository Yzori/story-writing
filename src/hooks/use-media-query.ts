"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-safe media query hook. The server snapshot returns `ssrDefault`
 * (desktop-first by convention — pass `true` for `(min-width: …)` queries)
 * and the client corrects on hydration via useSyncExternalStore, so there is
 * no setState-in-effect flash and no hydration mismatch warning.
 *
 * Use this (not CSS `hidden`) when the two branches must not mount
 * simultaneously — e.g. a composer whose draft state may only live once.
 */
export function useMediaQuery(query: string, ssrDefault = true): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => ssrDefault,
  );
}
