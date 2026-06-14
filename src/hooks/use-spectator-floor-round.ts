"use client";

import { useCallback, useState } from "react";
import type { FloorRound } from "@/types/campaign";
import { usePolledFetch } from "./use-polled-fetch";

const POLL_INTERVAL = 5_000;

export function useSpectatorFloorRound(storyId: string, sessionId: string, token: string) {
  const [floorRound, setFloorRound] = useState<FloorRound | null>(null);

  const floorRoundUrl = `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/floor-round`;
  const sparksUrl = `${floorRoundUrl}/sparks`;

  const refreshFloorRound = useCallback(async () => {
    if (!token) return null;
    const [pulseRes, sparkRes] = await Promise.all([
      fetch(`${floorRoundUrl}?token=${encodeURIComponent(token)}`),
      fetch(sparksUrl),
    ]);
    const pulseJson = pulseRes.ok ? await pulseRes.json() : { data: null };
    const sparkJson = sparkRes.ok ? await sparkRes.json() : { data: null };
    const next = pulseJson.data ?? sparkJson.data ?? null;
    setFloorRound(next);
    return next;
  }, [floorRoundUrl, sparksUrl, token]);

  // Poll the audience pulse + sparks together (mirrors refreshFloorRound). The
  // floor-round endpoint is the polled url; sparks is fetched alongside in onData.
  usePolledFetch(`${floorRoundUrl}?token=${encodeURIComponent(token)}`, {
    intervalMs: POLL_INTERVAL,
    enabled: Boolean(storyId && sessionId && token),
    onData: async (pulseJson, signal) => {
      const sparkRes = await fetch(sparksUrl, { signal }).catch(() => null);
      const sparkJson = sparkRes && sparkRes.ok ? await sparkRes.json() : { data: null };
      const next =
        (pulseJson as { data?: FloorRound | null })?.data ??
        (sparkJson as { data?: FloorRound | null })?.data ??
        null;
      setFloorRound(next);
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

  const sendSpark = useCallback(
    async (content: string, amount = 25) => {
      if (!token) return null;
      const res = await fetch(sparksUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, content, amount }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? "Failed to send Audience Spark");
      }
      const json = await res.json();
      setFloorRound(json.data ?? null);
      return json;
    },
    [sparksUrl, token],
  );

  return { floorRound, refreshFloorRound, sendPulse, sendSpark };
}
