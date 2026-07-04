"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Turn } from "@/types/campaign";
import { usePolledFetch } from "./use-polled-fetch";

export interface SpectatorCharacter {
  id: string;
  userId: string | null;
  name: string;
  portrait: string | null;
  displayName: string | null;
}

interface SpectatorSession {
  id: string;
  title: string;
  status: string;
  activePlayerId: string | null;
  opening: string | null;
  epilogue: string | null;
}

export interface UseSpectatorSessionReturn {
  loading: boolean;
  error: string | null;
  campaignSession: SpectatorSession | null;
  turns: Turn[];
  characters: SpectatorCharacter[];
  spectatorCount: number;
  storyTitle: string | null;
  /** The chair left for the dark, if this story keeps one. */
  strangerName: string | null;
}

export function useSpectatorSession(storyId: string, sessionId: string): UseSpectatorSessionReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignSession, setCampaignSession] = useState<SpectatorSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [characters, setCharacters] = useState<SpectatorCharacter[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [strangerName, setStrangerName] = useState<string | null>(null);

  const maxSortRef = useRef(-1);
  // When the SSE stream is live we pause polling; if it errors or EventSource is
  // unavailable we fall back to the poll path. Starts paused until bootstrap done.
  const [sseConnected, setSseConnected] = useState(false);

  // Merge an incremental update (from either the SSE stream or a poll). Both
  // sources deliver the same shape: { data: Turn[], session, spectatorCount }.
  const applyUpdate = useCallback(
    (json: { data?: Turn[]; session?: SpectatorSession | null; spectatorCount?: unknown }) => {
      const newTurns: Turn[] = json.data ?? [];

      if (newTurns.length > 0) {
        setTurns((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const unique = newTurns.filter((t) => !existingIds.has(t.id));
          if (unique.length === 0) return prev;
          return [...prev, ...unique];
        });
        maxSortRef.current = Math.max(
          maxSortRef.current,
          ...newTurns.map((t) => t.sortOrder)
        );
      }

      if (json.session) {
        const incoming = json.session;
        setCampaignSession((prev) => {
          if (!prev) return incoming;
          if (
            prev.status === incoming.status &&
            prev.activePlayerId === incoming.activePlayerId &&
            prev.title === incoming.title &&
            prev.epilogue === incoming.epilogue
          ) return prev;
          return incoming;
        });
      }

      if (typeof json.spectatorCount === "number") {
        setSpectatorCount(json.spectatorCount);
      }
    },
    []
  );

  // Initial fetch — load everything needed to render the spectator view
  useEffect(() => {
    if (!storyId || !sessionId) return;

    const fetchInitial = async () => {
      try {
        setLoading(true);

        // The /spectate endpoint is the public bootstrap: it returns turns,
        // session info, characters (public projection only), spectator count,
        // and the story title — all in one call, no auth required.
        const res = await fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("This session isn't open to spectators yet.");
          }
          throw new Error("Failed to load session");
        }

        const json = await res.json();
        const fetchedTurns: Turn[] = json.data ?? [];
        setTurns(fetchedTurns);
        setCampaignSession(json.session ?? null);
        if (fetchedTurns.length > 0) {
          maxSortRef.current = Math.max(...fetchedTurns.map((t) => t.sortOrder));
        }
        setStoryTitle(json.story?.title ?? null);
        setStrangerName(json.story?.strangerName ?? null);
        setSpectatorCount(Number(json.spectatorCount ?? 0));

        const allChars = json.characters ?? [];
        setCharacters(
          allChars.map((c: { id: string; userId: string | null; name: string; portrait: string | null; userDisplayName: string | null }) => ({
            id: c.id,
            userId: c.userId,
            name: c.name,
            portrait: c.portrait,
            displayName: c.userDisplayName,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [storyId, sessionId]);

  // Live turns via Server-Sent Events. Pushes new turns as they happen; on any
  // error (or when EventSource isn't available) we silently fall back to the
  // poll path below. maxSortRef is read fresh so the stream resumes from the
  // turns we already loaded during bootstrap.
  useEffect(() => {
    if (!storyId || !sessionId || loading) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return; // No SSE support → polling fallback stays active.
    }

    let source: EventSource | null = null;
    let cancelled = false;

    try {
      source = new EventSource(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/stream?afterSort=${maxSortRef.current}`
      );
    } catch {
      return; // Construction failed → keep polling.
    }

    source.onopen = () => {
      if (!cancelled) setSseConnected(true);
    };

    source.onmessage = (event) => {
      if (cancelled) return;
      try {
        applyUpdate(JSON.parse(event.data));
      } catch {
        // Ignore malformed frames (e.g. heartbeat comments never reach here).
      }
    };

    source.onerror = () => {
      // Stream dropped — stop trusting it and resume polling as fallback.
      if (!cancelled) setSseConnected(false);
      source?.close();
    };

    return () => {
      cancelled = true;
      setSseConnected(false);
      source?.close();
    };
  }, [storyId, sessionId, loading, applyUpdate]);

  // Poll for new turns every 5 seconds — the fallback whenever SSE isn't live.
  // The cursor advances each poll, so the url is a function (kept out of deps).
  usePolledFetch(
    () =>
      `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate?afterSort=${maxSortRef.current}`,
    {
      intervalMs: 5000,
      enabled: Boolean(storyId && sessionId) && !loading && !sseConnected,
      immediate: false,
      onData: (json) => applyUpdate(json as Parameters<typeof applyUpdate>[0]),
    }
  );

  return {
    loading,
    error,
    campaignSession,
    turns,
    characters,
    spectatorCount,
    storyTitle,
    strangerName,
  };
}
