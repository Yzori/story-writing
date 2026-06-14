"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePolledFetch } from "./use-polled-fetch";

export interface SpectatorTip {
  id: string;
  fromDisplayName: string | null;
  amount: number;
  message: string | null;
  createdAt: string;
}

const POLL_INTERVAL = 5_000;

export function useSpectatorTips(storyId: string, sessionId: string) {
  const [tips, setTips] = useState<SpectatorTip[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const lastTimestampRef = useRef<string>(new Date().toISOString());
  const seenTipIdsRef = useRef<Set<string>>(new Set());

  // Fetch initial balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/user/ink-drops");
        if (res.ok) {
          const { balance: b } = await res.json();
          setBalance(b);
        }
      } catch {
        // Not logged in or failed — balance stays null
      }
    };
    fetchBalance();
  }, []);

  // Poll for new tips in session. Cursor advances each poll, so use a function
  // url (kept out of the dependency array) to avoid restarting the loop.
  usePolledFetch(
    () =>
      `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/tips?after=${encodeURIComponent(lastTimestampRef.current)}`,
    {
      intervalMs: POLL_INTERVAL,
      enabled: Boolean(storyId && sessionId),
      onData: (json) => {
        const { data } = (json ?? {}) as { data?: SpectatorTip[] };
        if (data && data.length > 0) {
          lastTimestampRef.current = data[data.length - 1].createdAt;
          // Overlapping polls share the same `after` cursor — filter out
          // tips we've already appended (mirrors useSpectatorReactions).
          const newTips = data.filter((tip) => !seenTipIdsRef.current.has(tip.id));
          for (const tip of newTips) {
            seenTipIdsRef.current.add(tip.id);
          }
          if (newTips.length > 0) {
            setTips((prev) => [...prev, ...newTips]);
          }
        }
      },
    }
  );

  const sendTip = useCallback(
    async (recipientUserId: string, amount: number, message?: string) => {
      const res = await fetch(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/tips`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientUserId, amount, message }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to send tip");
      }

      const { newBalance } = await res.json();
      setBalance(newBalance);
      return newBalance;
    },
    [storyId, sessionId]
  );

  const refreshBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/user/ink-drops");
      if (res.ok) {
        const { balance: b } = await res.json();
        setBalance(b);
      }
    } catch {
      // ignore
    }
  }, []);

  return { tips, balance, sendTip, refreshBalance };
}
