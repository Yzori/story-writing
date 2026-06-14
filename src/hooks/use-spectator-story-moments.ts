"use client";

import { useCallback, useState } from "react";
import { usePolledFetch } from "./use-polled-fetch";

interface AmplificationState {
  counts: Record<string, number>;
  amplifiedTurnIds: string[];
}

export function useSpectatorStoryMoments(storyId: string, sessionId: string, token: string) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [amplifiedTurnIds, setAmplifiedTurnIds] = useState<Set<string>>(new Set());

  const applyState = useCallback((state: AmplificationState | null | undefined) => {
    setCounts(state?.counts ?? {});
    setAmplifiedTurnIds(new Set(state?.amplifiedTurnIds ?? []));
  }, []);

  const refresh = useCallback(async () => {
    if (!storyId || !sessionId || !token) return;
    const res = await fetch(
      `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/story-moments?token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) return;
    const json = await res.json();
    applyState(json.data);
  }, [applyState, sessionId, storyId, token]);

  usePolledFetch(
    `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/story-moments?token=${encodeURIComponent(token)}`,
    {
      intervalMs: 10_000,
      enabled: Boolean(storyId && sessionId && token),
      onData: (json) => {
        applyState((json as { data?: AmplificationState | null })?.data);
      },
    }
  );

  const amplify = useCallback(
    async (turnId: string) => {
      setCounts((prev) => ({ ...prev, [turnId]: (prev[turnId] ?? 0) + (amplifiedTurnIds.has(turnId) ? 0 : 1) }));
      setAmplifiedTurnIds((prev) => new Set(prev).add(turnId));

      const res = await fetch(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/story-moments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, turnId }),
        },
      );
      if (!res.ok) {
        await refresh();
        return;
      }
      const json = await res.json();
      applyState(json.data);
    },
    [amplifiedTurnIds, applyState, refresh, sessionId, storyId, token],
  );

  return {
    counts,
    amplifiedTurnIds,
    amplify,
  };
}
