"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PassageAudience } from "@/components/adventures/ThePage";
import type {
  AdventurePassageView,
  AdventureSceneView,
} from "@/types/adventure";

const POLL_MS = 5000;
const HEARTBEAT_MS = 20_000;
const TOKEN_KEY = "quiloria-lantern-token";

export interface WatchSeat {
  id: string;
  role: "director" | "writer";
  characterName: string;
  characterBrief: string;
  inkColor: string;
  userName: string | null;
  backers: number;
}

export interface WatchState {
  adventure: {
    id: string;
    storyId: string;
    title: string;
    premise: string;
    genre: string;
    pace: string;
    status: string;
    actNo: number;
    sceneNo: number;
    spotlightSeatId: string | null;
    updatedAt: string;
  };
  seats: WatchSeat[];
  scenes: AdventureSceneView[];
  audience: { present: number; allTime: number };
  myBackingSeatId: string | null;
  houseVote: {
    id: string;
    storyId: string;
    question: string;
    closesAt: string | null;
    options: Array<{ label: string; drops: number; pct: number }>;
  } | null;
  signedIn: boolean;
}

type WatchPassage = AdventurePassageView & {
  sparks: number;
  sparkedByMe: boolean;
  readerCredit: string | null;
};

function lanternToken(): string {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const token = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

/**
 * The audience's plumbing: public watch state + passages on the same
 * 5s rhythm as the table, plus the anonymous lantern heartbeat.
 * Sparks and credits ride along with the passages; spark counts on
 * already-seen passages refresh with each poll.
 */
export function useAdventureWatch(adventureId: string) {
  const [state, setState] = useState<WatchState | null>(null);
  const [passages, setPassages] = useState<WatchPassage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [stateRes, passagesRes] = await Promise.all([
      fetch(`/api/adventures/${adventureId}/watch`).then((r) => r.json()).catch(() => null),
      // Sparks change on old passages too — refetch the full page.
      fetch(`/api/adventures/${adventureId}/watch/passages`).then((r) => r.json()).catch(() => null),
    ]);
    if (stateRes?.data) {
      setState(stateRes.data);
      setError(null);
    } else if (stateRes?.error) {
      setError(stateRes.error.message);
    }
    if (passagesRes?.data) setPassages(passagesRes.data);
  }, [adventureId]);

  const heartbeatRef = useRef<string | null>(null);
  const heartbeat = useCallback(async () => {
    heartbeatRef.current ??= lanternToken();
    fetch(`/api/adventures/${adventureId}/watch/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: heartbeatRef.current }),
    }).catch(() => {});
  }, [adventureId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([refresh(), heartbeat()]);
      if (!cancelled) setLoading(false);
    })();
    const poll = setInterval(refresh, POLL_MS);
    const beat = setInterval(heartbeat, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(beat);
    };
  }, [refresh, heartbeat]);

  const spark = useCallback(
    async (passageId: string, sparked: boolean) => {
      // Optimistic — the poll corrects any drift.
      setPassages((prev) =>
        prev.map((p) =>
          p.id === passageId
            ? {
                ...p,
                sparkedByMe: sparked,
                sparks: Math.max(0, p.sparks + (sparked ? 1 : -1)),
              }
            : p
        )
      );
      await fetch(`/api/adventures/${adventureId}/watch/spark`, {
        method: sparked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId }),
      });
      refresh();
    },
    [adventureId, refresh]
  );

  const back = useCallback(
    async (seatId: string) => {
      const res = await fetch(`/api/adventures/${adventureId}/watch/back`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId }),
      });
      await refresh();
      return res.ok;
    },
    [adventureId, refresh]
  );

  const suggest = useCallback(
    async (content: string): Promise<string | null> => {
      const res = await fetch(`/api/adventures/${adventureId}/watch/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await res.json().catch(() => null);
      return res.ok ? null : (body?.error?.message ?? "Something went wrong.");
    },
    [adventureId]
  );

  const vote = useCallback(
    async (
      storyId: string,
      crossroadId: string,
      optionIndex: number,
      amount: number
    ): Promise<string | null> => {
      const res = await fetch(
        `/api/stories/${storyId}/crossroads/${crossroadId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionIndex, amount }),
        }
      );
      const body = await res.json().catch(() => null);
      await refresh();
      return res.ok ? null : (body?.error?.message ?? "Something went wrong.");
    },
    [refresh]
  );

  const audienceByPassage = new Map<string, PassageAudience>(
    passages.map((p) => [
      p.id,
      {
        sparks: p.sparks,
        sparkedByMe: p.sparkedByMe,
        readerCredit: p.readerCredit,
      },
    ])
  );

  return {
    state,
    passages,
    audienceByPassage,
    loading,
    error,
    spark,
    back,
    suggest,
    vote,
  };
}
