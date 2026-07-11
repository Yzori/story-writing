"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AdventurePassageView,
  AdventureTableState,
} from "@/types/adventure";

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
 * The table's data plumbing: adventure state (seats, scenes, hands,
 * spotlight) refreshed whole, passages accumulated with an afterSort
 * cursor — the same 5s polling rhythm the campaign surface proved out.
 * Mutations refresh state immediately so your own action never waits
 * for the next tick.
 */
export function useAdventureTable(adventureId: string) {
  const [state, setState] = useState<AdventureTableState | null>(null);
  const [passages, setPassages] = useState<AdventurePassageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const maxSortRef = useRef<number>(-1);

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
    if (res.data && res.data.length > 0) {
      maxSortRef.current = Math.max(
        maxSortRef.current,
        ...res.data.map((p) => p.sortOrder)
      );
      setPassages((prev) => mergePassages(prev, res.data!));
    }
  }, [adventureId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([refreshState(), refreshPassages()]);
      if (!cancelled) setLoading(false);
    })();
    const interval = setInterval(() => {
      refreshState();
      refreshPassages();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshState, refreshPassages]);

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
      sign: (content: string) =>
        act("/passages", {
          method: "POST",
          body: JSON.stringify({ content }),
        }),
      passSpotlight: (toSeatId: string) =>
        act("/spotlight", {
          method: "POST",
          body: JSON.stringify({ toSeatId }),
        }),
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
    error,
    actionError,
    clearActionError: () => setActionError(null),
    ...actions,
  };
}
