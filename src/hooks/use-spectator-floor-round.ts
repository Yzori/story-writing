"use client";

import { useCallback, useEffect, useState } from "react";
import type { FloorRound } from "@/types/campaign";

const POLL_INTERVAL = 5_000;

export function useSpectatorFloorRound(storyId: string, sessionId: string, token: string) {
  const [floorRound, setFloorRound] = useState<FloorRound | null>(null);

  const floorRoundUrl = `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/floor-round`;

  const refreshFloorRound = useCallback(async () => {
    if (!token) return null;
    const res = await fetch(`${floorRoundUrl}?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const json = await res.json();
    setFloorRound(json.data ?? null);
    return json.data ?? null;
  }, [floorRoundUrl, token]);

  useEffect(() => {
    if (!storyId || !sessionId || !token) return;

    let active = true;
    const poll = async () => {
      try {
        const next = await refreshFloorRound();
        if (!active) return;
        setFloorRound(next);
      } catch {
        // Audience pulse is non-critical for watching the session.
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [storyId, sessionId, token, refreshFloorRound]);

  const sendPulse = useCallback(
    async (submissionId: string) => {
      if (!token) return null;
      const res = await fetch(floorRoundUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, submissionId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? "Failed to send audience pulse");
      }
      const json = await res.json();
      setFloorRound(json.data ?? null);
      return json.data ?? null;
    },
    [floorRoundUrl, token],
  );

  return { floorRound, refreshFloorRound, sendPulse };
}
