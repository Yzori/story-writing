"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import type { Turn, CampaignSession, PlayerCharacter, StoryData, SessionRosterEntry } from "@/types/campaign";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";

export function useCampaignSession(storyId: string, sessionId: string) {
  const { data: authSession } = useSession();

  const [story, setStory] = useState<StoryData | null>(null);
  const [campaignSession, setCampaignSession] = useState<CampaignSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previousEpilogue, setPreviousEpilogue] = useState<string | null>(null);
  const [previousMood, setPreviousMood] = useState<string | null>(null);
  const [roster, setRoster] = useState<SessionRosterEntry[]>([]);
  const [clocks, setClocks] = useState<ProgressClockData[]>([]);

  const maxSortRef = useRef(-1);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = authSession?.user?.id;
  const isGM = story?.userId === currentUserId;

  // Characters present in this session's roster (present or introduced)
  const rosterCharacters = useMemo(() => {
    if (roster.length === 0) return characters.filter((c) => c.status === "active");
    const presentIds = new Set(
      roster.filter((r) => r.status === "present" || r.status === "introduced").map((r) => r.characterId)
    );
    return characters.filter((c) => presentIds.has(c.id));
  }, [characters, roster]);

  // Current user's character — prefer roster-present character, fallback to any active character
  const myCharacter = useMemo(() => {
    if (!currentUserId) return null;
    if (roster.length > 0) {
      const myRosterEntry = roster.find(
        (r) => r.userId === currentUserId && (r.status === "present" || r.status === "introduced")
      );
      if (myRosterEntry) {
        return characters.find((c) => c.id === myRosterEntry.characterId) ?? null;
      }
    }
    // Graceful degradation: fallback to first active character owned by user
    return characters.find((c) => c.userId === currentUserId && c.status === "active") ?? null;
  }, [characters, currentUserId, roster]);

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
        const [storyRes, turnsRes, charsRes, rosterRes, clocksRes] = await Promise.all([
          fetch(`/api/stories/${storyId}`),
          fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/turns`),
          fetch(`/api/stories/${storyId}/campaign/characters`),
          fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/roster`),
          fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/clocks`),
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

        // Roster may not exist yet (API being built concurrently) — graceful fallback
        if (rosterRes.ok) {
          try {
            const rosterJson = await rosterRes.json();
            setRoster(rosterJson.data ?? []);
          } catch { /* roster API may not return expected shape yet */ }
        }

        // Progress clocks
        if (clocksRes.ok) {
          try {
            const clocksJson = await clocksRes.json();
            setClocks(clocksJson.data ?? []);
          } catch { /* graceful fallback */ }
        }

        // Fetch previous session's epilogue for "Previously on..." in lobby
        try {
          const sessionsRes = await fetch(`/api/stories/${storyId}/campaign/sessions`);
          if (sessionsRes.ok) {
            const sessionsJson = await sessionsRes.json();
            const allSessions = sessionsJson.data ?? [];
            const currentIdx = allSessions.findIndex((s: { id: string }) => s.id === sessionId);
            if (currentIdx > 0) {
              const prev = allSessions[currentIdx - 1];
              if (prev.epilogue) setPreviousEpilogue(prev.epilogue);
              if (prev.closingMood) setPreviousMood(prev.closingMood);
            }
          }
        } catch { /* non-critical */ }
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
    const controller = new AbortController();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns?afterSort=${maxSortRef.current}`,
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
        if (json.session) {
          setCampaignSession((prev) => {
            if (!prev) return json.session;
            // Skip re-render if session data hasn't changed
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

        // Refresh character list + roster every 6th poll (~30s)
        charPollCount++;
        if (charPollCount >= 6) {
          charPollCount = 0;
          const [charsRes, rosterPollRes, clocksPollRes] = await Promise.all([
            fetch(`/api/stories/${storyId}/campaign/characters`, { signal: controller.signal }),
            fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/roster`, { signal: controller.signal }),
            fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/clocks`, { signal: controller.signal }),
          ]);
          if (charsRes.ok) {
            const charsJson = await charsRes.json();
            setCharacters(charsJson.data ?? []);
          }
          if (rosterPollRes.ok) {
            try {
              const rosterJson = await rosterPollRes.json();
              setRoster(rosterJson.data ?? []);
            } catch { /* ignore */ }
          }
          if (clocksPollRes.ok) {
            try {
              const clocksJson = await clocksPollRes.json();
              setClocks(clocksJson.data ?? []);
            } catch { /* ignore */ }
          }
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

      setTurns((prev) => {
        const exists = prev.some((t) => t.id === newTurn.id);
        return exists ? prev : [...prev, newTurn];
      });
      maxSortRef.current = Math.max(maxSortRef.current, newTurn.sortOrder);

      return newTurn;
    },
    [storyId, sessionId]
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

  // ── Update roster (GM sets who's present) ────────────────────
  const updateRoster = useCallback(
    async (characterIds: string[]) => {
      // Optimistic update: mark listed characters as present, others as absent
      setRoster((prev) => {
        if (prev.length === 0) return prev;
        return prev.map((entry) => ({
          ...entry,
          status: characterIds.includes(entry.characterId) ? "present" as const : "absent" as const,
        }));
      });

      try {
        const res = await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/roster`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ characterIds }),
          }
        );
        if (res.ok) {
          const json = await res.json();
          setRoster(json.data ?? []);
        }
      } catch {
        // Revert on error by re-fetching
        try {
          const res = await fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/roster`);
          if (res.ok) {
            const json = await res.json();
            setRoster(json.data ?? []);
          }
        } catch { /* ignore */ }
      }
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
    roster,
    rosterCharacters,
    loading,
    error,
    toast,
    showToast,
    currentUserId: currentUserId ?? null,
    isGM,
    myCharacter,
    previousEpilogue,
    previousMood,
    sendTurn,
    setActivePlayer,
    updateSession,
    updateRoster,
    clocks,
    setClocks,
  };
}
