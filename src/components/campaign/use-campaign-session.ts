"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Turn, CampaignSession, PlayerCharacter, StoryData } from "./types";

export function useCampaignSession(storyId: string, sessionId: string) {
  const { data: authSession } = useSession();

  const [story, setStory] = useState<StoryData | null>(null);
  const [campaignSession, setCampaignSession] = useState<CampaignSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const maxSortRef = useRef(-1);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = authSession?.user?.id;
  const isGM = story?.userId === currentUserId;
  const myCharacter = characters.find((c) => c.userId === currentUserId) ?? null;

  // ── Toast helper ───────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Initial fetch ──────────────────────────────────────────
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
        setStory(storyJson.data);

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
          setCharacters(charsJson.data ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [storyId, sessionId]);

  // ── Poll for new turns + refresh characters ────────────────
  useEffect(() => {
    if (!storyId || !sessionId || loading) return;

    let charPollCount = 0;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns?afterSort=${maxSortRef.current}`
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
        if (json.session) {
          setCampaignSession(json.session);
        }

        // Refresh character list every 6th poll (~30s)
        charPollCount++;
        if (charPollCount >= 6) {
          charPollCount = 0;
          const charsRes = await fetch(`/api/stories/${storyId}/campaign/characters`);
          if (charsRes.ok) {
            const charsJson = await charsRes.json();
            setCharacters(charsJson.data ?? []);
          }
        }
      } catch {
        // Silently ignore poll errors
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [storyId, sessionId, loading]);

  // ── Send turn ──────────────────────────────────────────────
  const sendTurn = useCallback(
    async (type: string, content: string, characterId?: string, metadata?: string) => {
      const body: Record<string, string | undefined> = {
        type,
        content: content.trim(),
        characterId,
        metadata,
      };

      const res = await fetch(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to send");
      }

      const json = await res.json();
      const newTurn = json.data as Turn;

      // Enrich with user info for optimistic update
      const enrichedTurn: Turn = {
        ...newTurn,
        user: {
          id: currentUserId ?? "",
          displayName: authSession?.user?.name ?? null,
          avatarUrl: authSession?.user?.image ?? null,
        },
        characterName: myCharacter?.name ?? null,
        characterPortrait: myCharacter?.portrait ?? null,
      };

      setTurns((prev) => {
        const exists = prev.some((t) => t.id === enrichedTurn.id);
        return exists ? prev : [...prev, enrichedTurn];
      });
      maxSortRef.current = Math.max(maxSortRef.current, newTurn.sortOrder);

      return enrichedTurn;
    },
    [storyId, sessionId, currentUserId, authSession, myCharacter]
  );

  // ── Set active player ──────────────────────────────────────
  const setActivePlayer = useCallback(
    async (playerId: string | null) => {
      const res = await fetch(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/active-player`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activePlayerId: playerId }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to update active player");
      }
      const json = await res.json();
      setCampaignSession(json.data);
    },
    [storyId, sessionId]
  );

  // ── Update session (status, title, etc.) ───────────────────
  const updateSession = useCallback(
    async (data: Record<string, unknown>) => {
      const res = await fetch(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to update session");
      }
      const json = await res.json();
      setCampaignSession(json.data);
      return json.data as CampaignSession;
    },
    [storyId, sessionId]
  );

  return {
    story,
    campaignSession,
    turns,
    characters,
    loading,
    error,
    toast,
    showToast,
    currentUserId: currentUserId ?? null,
    isGM,
    myCharacter,
    sendTurn,
    setActivePlayer,
    updateSession,
  };
}
