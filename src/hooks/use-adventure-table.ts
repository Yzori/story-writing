"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AdventurePassageView,
  AdventureTableState,
} from "@/types/adventure";
import {
  PRESENCE_BEAT_MS,
  TYPING_BEAT_MS,
  TYPING_FRESH_MS,
} from "@/lib/adventure-presence";

const POLL_MS = 5000;

async function jsonRequest<T>(
  url: string,
  init?: RequestInit
): Promise<{ data?: T; error?: { code: string; message: string } }> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  try {
    return await res.json();
  } catch {
    return { error: { code: "BAD_RESPONSE", message: "Something went wrong." } };
  }
}

function mergePassages(
  prev: AdventurePassageView[],
  incoming: AdventurePassageView[]
): AdventurePassageView[] {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((p) => [p.id, p] as const));
  let changed = false;
  for (const passage of incoming) {
    if (!byId.has(passage.id)) {
      byId.set(passage.id, passage);
      changed = true;
    }
  }
  if (!changed) return prev;
  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * The table's data plumbing, live-first: one SSE connection pushes
 * state + passages the moment they change; the proven 5s polling
 * rhythm stays underneath as the fallback whenever the stream is
 * down (old proxies, sleepy laptops, server redeploys). Mutations
 * still refresh state immediately so your own action never waits
 * for a tick. Also carries the presence heartbeat: "I'm at the
 * table" while the page is open, a writing pulse while typing.
 */
export function useAdventureTable(adventureId: string) {
  const [state, setState] = useState<AdventureTableState | null>(null);
  const [passages, setPassages] = useState<AdventurePassageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const maxSortRef = useRef<number>(-1);
  const liveRef = useRef(false);

  const takePassages = useCallback((incoming: AdventurePassageView[]) => {
    if (incoming.length === 0) return;
    maxSortRef.current = Math.max(
      maxSortRef.current,
      ...incoming.map((p) => p.sortOrder)
    );
    setPassages((prev) => mergePassages(prev, incoming));
  }, []);

  const refreshState = useCallback(async () => {
    const res = await jsonRequest<AdventureTableState>(
      `/api/adventures/${adventureId}`
    );
    if (res.data) {
      setState(res.data);
      setError(null);
    } else if (res.error) {
      setError(res.error.message);
    }
    return res;
  }, [adventureId]);

  const refreshPassages = useCallback(async () => {
    const cursor = maxSortRef.current;
    const res = await jsonRequest<AdventurePassageView[]>(
      `/api/adventures/${adventureId}/passages${cursor >= 0 ? `?afterSort=${cursor}` : ""}`
    );
    if (res.data) takePassages(res.data);
  }, [adventureId, takePassages]);

  // The live wire. EventSource reconnects on its own; while it's not
  // open, the polling loop below covers the gap.
  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;

    (async () => {
      await Promise.all([refreshState(), refreshPassages()]);
      if (cancelled) return;
      setLoading(false);

      source = new EventSource(
        `/api/adventures/${adventureId}/stream?afterSort=${maxSortRef.current}`
      );
      source.onopen = () => {
        liveRef.current = true;
        setLive(true);
      };
      source.onerror = () => {
        // Reconnecting or dead — either way, polling takes over.
        liveRef.current = false;
        setLive(false);
      };
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            state?: AdventureTableState;
            passages?: AdventurePassageView[];
            gone?: boolean;
          };
          if (payload.gone) {
            source?.close();
            liveRef.current = false;
            setLive(false);
            refreshState();
            return;
          }
          if (payload.state) {
            setState(payload.state);
            setError(null);
          }
          if (payload.passages) takePassages(payload.passages);
        } catch {
          // Malformed frame; the next one will land.
        }
      };
    })();

    const interval = setInterval(() => {
      if (liveRef.current) return;
      refreshState();
      refreshPassages();
    }, POLL_MS);

    return () => {
      cancelled = true;
      source?.close();
      clearInterval(interval);
    };
  }, [adventureId, refreshState, refreshPassages, takePassages]);

  // Presence: a steady heartbeat while the page is open, carrying the
  // current typing truth; keystrokes beat immediately (throttled) so
  // "writing…" lights up fast.
  const lastTypedRef = useRef(0);
  const lastWritingBeatRef = useRef(0);

  const beat = useCallback(
    (writing: boolean) => {
      if (writing) lastWritingBeatRef.current = Date.now();
      fetch(`/api/adventures/${adventureId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writing }),
      }).catch(() => {});
    },
    [adventureId]
  );

  useEffect(() => {
    beat(false);
    const interval = setInterval(
      () => beat(Date.now() - lastTypedRef.current < TYPING_FRESH_MS),
      PRESENCE_BEAT_MS
    );
    return () => clearInterval(interval);
  }, [beat]);

  // The first keystroke beats immediately — "writing…" must light up
  // fast; only writing-beats throttle each other.
  const noteTyping = useCallback(() => {
    const now = Date.now();
    lastTypedRef.current = now;
    if (now - lastWritingBeatRef.current >= TYPING_BEAT_MS) beat(true);
  }, [beat]);

  const act = useCallback(
    async (path: string, init?: RequestInit) => {
      setActionError(null);
      const res = await jsonRequest<unknown>(
        `/api/adventures/${adventureId}${path}`,
        init
      );
      if (res.error) setActionError(res.error.message);
      await Promise.all([refreshState(), refreshPassages()]);
      return !res.error;
    },
    [adventureId, refreshState, refreshPassages]
  );

  const actions = useMemo(
    () => ({
      sign: (content: string, canonizeSuggestionId?: string) =>
        act("/passages", {
          method: "POST",
          body: JSON.stringify({ content, canonizeSuggestionId }),
        }),
      passSpotlight: (toSeatId: string) =>
        act("/spotlight", {
          method: "POST",
          body: JSON.stringify({ toSeatId }),
        }),
      // Director recalls the pen, or the holding writer hands it back.
      releaseSpotlight: () => act("/spotlight", { method: "DELETE" }),
      raiseHand: (whisper: string) =>
        act("/hand", {
          method: "POST",
          body: JSON.stringify({ whisper }),
        }),
      lowerHand: () => act("/hand", { method: "DELETE" }),
      stepForward: () => act("/step-forward", { method: "POST" }),
      openScene: (title: string, newAct: boolean, opening?: string) =>
        act("/scenes", {
          method: "POST",
          body: JSON.stringify({ action: "open", title, newAct, opening }),
        }),
      closeScene: () =>
        act("/scenes", {
          method: "POST",
          body: JSON.stringify({ action: "close" }),
        }),
      start: () => act("/start", { method: "POST" }),
      finish: () => act("/finish", { method: "POST" }),
      setupSeat: (characterName: string, characterBrief: string, inkColor: string) =>
        act("/seat", {
          method: "PATCH",
          body: JSON.stringify({ characterName, characterBrief, inkColor }),
        }),
      mintInvite: async (): Promise<string | null> => {
        setActionError(null);
        const res = await jsonRequest<{ joinPath: string }>(
          `/api/adventures/${adventureId}/invite`,
          { method: "POST" }
        );
        if (res.error) {
          setActionError(res.error.message);
          return null;
        }
        return res.data?.joinPath ?? null;
      },
    }),
    [act, adventureId]
  );

  return {
    state,
    passages,
    loading,
    live,
    error,
    actionError,
    clearActionError: () => setActionError(null),
    noteTyping,
    ...actions,
  };
}
