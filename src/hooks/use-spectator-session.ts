"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Turn } from "@/types/campaign";

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
}

export function useSpectatorSession(storyId: string, sessionId: string): UseSpectatorSessionReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignSession, setCampaignSession] = useState<SpectatorSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [characters, setCharacters] = useState<SpectatorCharacter[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [storyTitle, setStoryTitle] = useState<string | null>(null);

  const maxSortRef = useRef(-1);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch — load everything needed to render the spectator view
  useEffect(() => {
    if (!storyId || !sessionId) return;

    const fetchInitial = async () => {
      try {
        setLoading(true);

        const [storyRes, turnsRes, charsRes] = await Promise.all([
          fetch(`/api/stories/${storyId}`),
          fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/turns`),
          fetch(`/api/stories/${storyId}/campaign/characters`),
        ]);

        if (!storyRes.ok) throw new Error("Failed to load story");

        const storyJson = await storyRes.json();
        setStoryTitle(storyJson.data?.title ?? null);

        if (turnsRes.ok) {
          const turnsJson = await turnsRes.json();
          const fetchedTurns: Turn[] = turnsJson.data ?? [];
          setTurns(fetchedTurns);
          setCampaignSession(turnsJson.session ?? null);
          if (fetchedTurns.length > 0) {
            maxSortRef.current = Math.max(...fetchedTurns.map((t) => t.sortOrder));
          }
        }

        if (charsRes.ok) {
          const charsJson = await charsRes.json();
          const allChars = charsJson.data ?? [];
          setCharacters(
            allChars.map((c: { id: string; userId: string | null; name: string; portrait: string | null; userDisplayName: string | null }) => ({
              id: c.id,
              userId: c.userId,
              name: c.name,
              portrait: c.portrait,
              displayName: c.userDisplayName,
            }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [storyId, sessionId]);

  // Poll for new turns every 5 seconds using the spectate endpoint
  useEffect(() => {
    if (!storyId || !sessionId || loading) return;

    const controller = new AbortController();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate?afterSort=${maxSortRef.current}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;

        const json = await res.json();
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

        // Update session state from poll response
        if (json.session) {
          setCampaignSession((prev) => {
            if (!prev) return json.session;
            const next = json.session;
            if (
              prev.status === next.status &&
              prev.activePlayerId === next.activePlayerId &&
              prev.title === next.title &&
              prev.epilogue === next.epilogue
            ) return prev;
            return next;
          });
        }

        // Update spectator count from poll response
        if (typeof json.spectatorCount === "number") {
          setSpectatorCount(json.spectatorCount);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }, 5000);

    return () => {
      controller.abort();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [storyId, sessionId, loading]);

  return {
    loading,
    error,
    campaignSession,
    turns,
    characters,
    spectatorCount,
    storyTitle,
  };
}
