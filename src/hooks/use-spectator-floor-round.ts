"use client";

import { useCallback, useState } from "react";
import type { FloorRound } from "@/types/campaign";
import { usePolledFetch } from "./use-polled-fetch";

const POLL_INTERVAL = 5_000;

export function useSpectatorFloorRound(storyId: string, sessionId: string, token: string) {
  const [floorRound, setFloorRound] = useState<FloorRound | null>(null);

  const floorRoundUrl = `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/floor-round`;

  const refreshFloorRound = useCallback(async () => {
    if (!token) return null;
    const res = await fetch(`${floorRoundUrl}?token=${encodeURIComponent(token)}`);
    const json = res.ok ? await res.json() : { data: null };
    const next = json.data ?? null;
    setFloorRound(next);
    return next;
  }, [floorRoundUrl, token]);

  usePolledFetch(`${floorRoundUrl}?token=${encodeURIComponent(token)}`, {
    intervalMs: POLL_INTERVAL,
    enabled: Boolean(storyId && sessionId && token),
    onData: (json) => {
      setFloorRound((json as { data?: FloorRound | null })?.data ?? null);
    },
  });

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
