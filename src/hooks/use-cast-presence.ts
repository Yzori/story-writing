"use client";

import { useCallback, useEffect, useState } from "react";

const HEARTBEAT_INTERVAL = 30_000;
const POLL_INTERVAL = 15_000;

/**
 * Cast presence — who of the table has actually taken their seat. The
 * spectator twin (use-spectator-presence) counts the dark anonymously;
 * this names the cast. Play passes `heartbeat: true` (registers the
 * signed-in player/Director); watch reads only. Rows age out server-side
 * (<45s = here), so there is no delete-on-leave.
 */
export function useCastPresence(
  storyId: string,
  sessionId: string,
  { heartbeat = false, enabled = true }: { heartbeat?: boolean; enabled?: boolean } = {},
): { presentUserIds: Set<string> } {
  const [presentUserIds, setPresentUserIds] = useState<Set<string>>(() => new Set());

  const presenceUrl = `/api/stories/${storyId}/campaign/sessions/${sessionId}/presence`;

  const applyCast = useCallback((json: unknown) => {
    const cast = (json as { cast?: { userId: string }[] } | null)?.cast;
    if (Array.isArray(cast)) {
      setPresentUserIds(new Set(cast.map((c) => c.userId)));
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch(presenceUrl, { method: "PUT" });
      if (res.ok) applyCast(await res.json());
    } catch {
      // presence is ambience — failures are non-critical
    }
  }, [presenceUrl, applyCast]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(presenceUrl);
      if (res.ok) applyCast(await res.json());
    } catch {
      // non-critical
    }
  }, [presenceUrl, applyCast]);

  useEffect(() => {
    if (!storyId || !sessionId || !enabled) return;

    // First tick after mount (never synchronously inside the effect).
    const first = setTimeout(heartbeat ? sendHeartbeat : poll, 0);
    const beatTimer = heartbeat ? setInterval(sendHeartbeat, HEARTBEAT_INTERVAL) : null;
    const pollTimer = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearTimeout(first);
      if (beatTimer) clearInterval(beatTimer);
      clearInterval(pollTimer);
    };
  }, [storyId, sessionId, enabled, heartbeat, sendHeartbeat, poll]);

  return { presentUserIds };
}
