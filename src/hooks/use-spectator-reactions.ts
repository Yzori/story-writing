"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface SpectatorReaction {
  id: string; // client-generated for animation keys
  type: string;
  displayName: string | null;
  createdAt: string;
  receivedAt: number;
}

const POLL_INTERVAL = 3_000;
const MAX_REACTIONS = 50;

export function useSpectatorReactions(
  storyId: string,
  sessionId: string,
  token: string
) {
  const [reactions, setReactions] = useState<SpectatorReaction[]>([]);
  const lastTimestampRef = useRef<string>(new Date().toISOString());
  const counterRef = useRef(0);

  // Poll for new reactions
  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/reactions?after=${encodeURIComponent(lastTimestampRef.current)}`
        );
        if (!res.ok || !active) return;

        const { data } = await res.json();
        if (data && data.length > 0) {
          const newReactions: SpectatorReaction[] = data.map(
            (r: { type: string; displayName: string | null; createdAt: string }) => ({
              id: `sr-${++counterRef.current}`,
              type: r.type,
              displayName: r.displayName,
              createdAt: r.createdAt,
              receivedAt: Date.now(),
            })
          );

          // Update last timestamp to most recent
          lastTimestampRef.current =
            data[data.length - 1].createdAt;

          setReactions((prev) => {
            const combined = [...prev, ...newReactions];
            // Keep rolling window
            return combined.slice(-MAX_REACTIONS);
          });
        }
      } catch {
        // Silently ignore poll failures
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [storyId, sessionId]);

  // Remove expired reactions (older than 4s)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const cutoff = Date.now() - 4_000;
      setReactions((prev) => prev.filter((r) => r.receivedAt > cutoff));
    }, 1_000);
    return () => clearInterval(cleanup);
  }, []);

  const sendReaction = useCallback(
    async (type: string) => {
      try {
        await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/reactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, type }),
          }
        );
      } catch {
        // Silently ignore send failures
      }
    },
    [storyId, sessionId, token]
  );

  return { reactions, sendReaction };
}
