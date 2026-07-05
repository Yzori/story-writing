"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SessionWager {
  id: string;
  content: string;
  status: "open" | "true" | "false";
  holdCount: number;
  isMine: boolean;
  myHold: boolean;
  createdAt: string;
}

/**
 * The audience's wagers, shared by play (read + Director pull) and watch
 * (write + hold). Poll cadence follows the session's life: lively while the
 * table gathers (draft), a slow glance while it plays (slips are sealed and
 * only the Director's pull can change them), one final fetch when the
 * session completes (the gold stamps land).
 */
export function useSessionWagers(
  storyId: string,
  sessionId: string,
  {
    token,
    sessionStatus,
  }: {
    /** The watcher's anonymous token — carries `myHold`. */
    token?: string;
    sessionStatus: string;
  },
): {
  wagers: SessionWager[];
  createWager: (content: string) => Promise<void>;
  holdWager: (wagerId: string) => Promise<void>;
  pullWager: (wagerId: string) => Promise<void>;
} {
  const [wagers, setWagers] = useState<SessionWager[]>([]);

  const baseUrl = `/api/stories/${storyId}/campaign/sessions/${sessionId}/wagers`;
  const listUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(listUrl);
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json?.data)) setWagers(json.data);
    } catch {
      // slips are ambience — a missed poll is fine
    }
  }, [listUrl]);

  const finalFetchDone = useRef(false);
  useEffect(() => {
    if (!storyId || !sessionId) return;
    if (sessionStatus === "completed" || sessionStatus === "archived") {
      // One last look — the settle stamps arrived with the ending.
      if (!finalFetchDone.current) {
        finalFetchDone.current = true;
        const t = setTimeout(refresh, 0);
        return () => clearTimeout(t);
      }
      return;
    }
    finalFetchDone.current = false;
    const first = setTimeout(refresh, 0);
    const interval = setInterval(refresh, sessionStatus === "draft" ? 10_000 : 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [storyId, sessionId, sessionStatus, refresh]);

  const createWager = useCallback(
    async (content: string) => {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Failed to pin the wager");
      }
      if (Array.isArray(json?.data)) setWagers(json.data);
      else void refresh();
    },
    [baseUrl, refresh],
  );

  const holdWager = useCallback(
    async (wagerId: string) => {
      if (!token) return;
      const res = await fetch(`${baseUrl}/${wagerId}/holds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? "Failed to hold the wager");
      }
      void refresh();
    },
    [baseUrl, token, refresh],
  );

  const pullWager = useCallback(
    async (wagerId: string) => {
      const res = await fetch(`${baseUrl}/${wagerId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? "Failed to pull the slip");
      }
      void refresh();
    },
    [baseUrl, refresh],
  );

  return { wagers, createWager, holdWager, pullWager };
}
