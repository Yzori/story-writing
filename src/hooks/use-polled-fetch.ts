"use client";

import { useEffect, useRef } from "react";

export interface UsePolledFetchOptions {
  /** How often to re-run the poll, in milliseconds. */
  intervalMs: number;
  /** When false, the poll is paused (and not run on mount). Defaults to true. */
  enabled?: boolean;
  /** Run the poll once immediately on (re)start, before the first interval tick. Defaults to true. */
  immediate?: boolean;
  /**
   * Called with the parsed JSON body for each successful (res.ok) poll.
   * Non-ok responses and thrown errors are swallowed so polling stays resilient.
   * Use the `signal` to abort in-flight work when the poll restarts/unmounts.
   */
  onData: (json: unknown, signal: AbortSignal) => void | Promise<void>;
}

/**
 * Shared polling primitive for the spectator realtime hooks.
 *
 * Fetches `url` on an interval, parses JSON, and hands it to `onData`. Each
 * restart aborts the previous in-flight request and clears the interval, so
 * callers don't have to reimplement the setInterval + AbortController + cleanup
 * dance every time. Failures (network, non-ok, JSON parse) are silently ignored
 * — these are non-critical background refreshes.
 *
 * `url` may be a string (used as the effect dependency — changing it restarts
 * the poll) or a function (read fresh on every tick and NOT a dependency —
 * use this when the request carries a cursor that mutates between polls, so the
 * loop isn't torn down each time the cursor advances). `onData` is captured in a
 * ref so an inline closure won't restart the loop on every render.
 */
export function usePolledFetch(
  url: string | (() => string),
  { intervalMs, enabled = true, immediate = true, onData }: UsePolledFetchOptions
): void {
  const onDataRef = useRef(onData);
  const urlFnRef = useRef(url);
  // Keep the latest closures without restarting the poll. Synced in an effect
  // (not during render) so we never mutate a ref mid-render.
  useEffect(() => {
    onDataRef.current = onData;
    urlFnRef.current = url;
  });

  // Only a string url participates in the dependency array; a function url is
  // intentionally stable so cursor changes don't restart the interval.
  const urlDep = typeof url === "string" ? url : "";

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const controller = new AbortController();

    const poll = async () => {
      try {
        const current = urlFnRef.current;
        const target = typeof current === "function" ? current() : current;
        if (!target) return;
        const res = await fetch(target, { signal: controller.signal });
        if (!active || !res.ok) return;
        const json = await res.json();
        if (!active) return;
        await onDataRef.current(json, controller.signal);
      } catch {
        // Polling is best-effort; swallow network / abort / parse errors.
      }
    };

    if (immediate) void poll();
    const interval = setInterval(poll, intervalMs);

    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [urlDep, intervalMs, enabled, immediate]);
}
