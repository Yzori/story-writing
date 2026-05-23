"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface SpectatorReaction {
  id: string;
  type: string;
  displayName: string | null;
  createdAt: string;
  receivedAt: number;
}

const POLL_INTERVAL = 3_000;
const MAX_REACTIONS = 50;
const HISTORY_MS = 90_000;

export function useSpectatorReactions(
  storyId: string,
  sessionId: string,
  token: string
) {
  const [reactions, setReactions] = useState<SpectatorReaction[]>([]);
  const lastTimestampRef = useRef<string>(new Date().toISOString());
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

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
          const newReactions: SpectatorReaction[] = data
            .filter((r: { id: string }) => !seenReactionIdsRef.current.has(r.id))
            .map((r: { id: string; type: string; displayName: string | null; createdAt: string }) => {
              seenReactionIdsRef.current.add(r.id);
              return {
                id: r.id,
                type: r.type,
                displayName: r.displayName,
                createdAt: r.createdAt,
                receivedAt: Date.now(),
              };
            });

          // Update last timestamp to most recent
          lastTimestampRef.current =
            data[data.length - 1].createdAt;

          if (newReactions.length > 0) {
            setReactions((prev) => {
              const combined = [...prev, ...newReactions];
              // Keep rolling window
              return combined.slice(-MAX_REACTIONS);
            });
          }
        }
      } catch {
        // Silently ignore poll failures
      }
    };

    void poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [storyId, sessionId]);

  // Keep enough history to name the Chorus Pulse while still pruning old rows
  // from local state. FloatingReactions filters to its own short visual window.
  useEffect(() => {
    const cleanup = setInterval(() => {
      const cutoff = Date.now() - HISTORY_MS;
      setReactions((prev) => prev.filter((r) => r.receivedAt > cutoff));
    }, 5_000);
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
