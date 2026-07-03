"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePolledFetch } from "./use-polled-fetch";

const POLL_INTERVAL = 5_000;

/**
 * The House's light, shared by every surface of the room: which lines are
 * set in gold, a counter that ticks whenever gold arrives (the flare), and
 * the watcher's own hand — sendGold. Amounts and names never reach the
 * clients; the room only ever shows light.
 */
export function useHouseGold(
  storyId: string,
  sessionId: string,
  enabled: boolean,
) {
  const [gildedTurnIds, setGildedTurnIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [flareCount, setFlareCount] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const lastTimestampRef = useRef<string>(new Date().toISOString());
  const seenIdsRef = useRef<Set<string>>(new Set());

  // The watcher's well. Signed out → balance stays null, the hands stay hidden.
  useEffect(() => {
    let cancelled = false;
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/user/ink-drops");
        if (res.ok) {
          const { balance: b } = await res.json();
          if (!cancelled) setBalance(b);
        }
      } catch {
        // signed out or offline — no hands, still a seat
      }
    };
    void fetchBalance();
    return () => {
      cancelled = true;
    };
  }, []);

  usePolledFetch(
    () =>
      `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/gold?after=${encodeURIComponent(lastTimestampRef.current)}`,
    {
      intervalMs: POLL_INTERVAL,
      enabled: Boolean(storyId && sessionId) && enabled,
      onData: (json) => {
        const data = (
          json as {
            data?: {
              gildedTurnIds?: string[];
              recent?: { id: string; createdAt: string }[];
            };
          } | null
        )?.data;
        if (!data) return;

        const ids = data.gildedTurnIds ?? [];
        setGildedTurnIds((prev) => {
          if (prev.size === ids.length && ids.every((id) => prev.has(id)))
            return prev;
          return new Set(ids);
        });

        const recent = data.recent ?? [];
        if (recent.length > 0) {
          lastTimestampRef.current = recent[recent.length - 1].createdAt;
          const fresh = recent.filter((g) => !seenIdsRef.current.has(g.id));
          for (const g of fresh) seenIdsRef.current.add(g.id);
          if (fresh.length > 0) setFlareCount((c) => c + fresh.length);
        }
      },
    },
  );

  const sendGold = useCallback(
    async (amount: number, turnId?: string) => {
      const res = await fetch(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/gold`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, turnId }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to leave gold");
      }
      const { newBalance, goldId } = await res.json();
      setBalance(newBalance);
      // Your own gesture lights the room at once; marking it seen keeps the
      // poll from flaring it a second time.
      if (typeof goldId === "string") seenIdsRef.current.add(goldId);
      if (turnId) setGildedTurnIds((prev) => new Set(prev).add(turnId));
      setFlareCount((c) => c + 1);
      return newBalance as number;
    },
    [storyId, sessionId],
  );

  return { gildedTurnIds, flareCount, balance, sendGold };
}
