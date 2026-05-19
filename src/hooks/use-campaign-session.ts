"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import type { Turn, CampaignSession, PlayerCharacter, StoryData, SessionRosterEntry, FloorRound, FloorRoundMode } from "@/types/campaign";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import { campaignJsonRequest } from "@/lib/campaign-api";

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
  const [floorRound, setFloorRound] = useState<FloorRound | null>(null);

  const maxSortRef = useRef(-1);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = authSession?.user?.id;
  const isGM = story?.userId === currentUserId;
  const floorRoundsUrl = `/api/stories/${storyId}/campaign/sessions/${sessionId}/floor-rounds`;

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

        try {
          const floorJson = await campaignJsonRequest<FloorRound | null>(floorRoundsUrl);
          setFloorRound(floorJson.data ?? null);
        } catch { /* non-critical */ }

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
  }, [storyId, sessionId, floorRoundsUrl]);

  // ── Poll for new turns + refresh characters ────────────────
  const sessionStatus = campaignSession?.status;
  const isTerminal = sessionStatus === "completed" || sessionStatus === "archived";
  useEffect(() => {
    if (!storyId || !sessionId || loading) return;
    if (isTerminal) return;

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

        try {
          const floorRes = await fetch(floorRoundsUrl, { signal: controller.signal });
          if (floorRes.ok) {
            const floorJson = await floorRes.json();
            setFloorRound(floorJson.data ?? null);
          }
        } catch { /* non-critical */ }

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
  }, [storyId, sessionId, loading, floorRoundsUrl, isTerminal]);

  // ── Send turn ──────────────────────────────────────────────
  const sendTurn = useCallback(
    async (type: string, content: string, characterId?: string, metadata?: string) => {
      const body: Record<string, string | undefined> = {
        type,
        content: content.trim(),
        characterId,
        metadata,
      };

      const json = await campaignJsonRequest<Turn, { activePlayerId?: string | null }>(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns`,
        {
          method: "POST",
          body,
          fallbackError: "Failed to send",
        },
      );
      const newTurn = json.data as Turn;

      setTurns((prev) => {
        const exists = prev.some((t) => t.id === newTurn.id);
        return exists ? prev : [...prev, newTurn];
      });
      maxSortRef.current = Math.max(maxSortRef.current, newTurn.sortOrder);

      // The server may have auto-handed control back to the GM after a
      // player's story turn. Apply that change locally so the editor lock
      // updates immediately instead of waiting for the next poll.
      const nextActivePlayerId = json?.meta?.activePlayerId;
      if (nextActivePlayerId !== undefined) {
        setCampaignSession((prev) =>
          prev && prev.activePlayerId !== nextActivePlayerId
            ? { ...prev, activePlayerId: nextActivePlayerId }
            : prev,
        );
      }

      return newTurn;
    },
    [storyId, sessionId]
  );

  // ── Set active player ──────────────────────────────────────
  const setActivePlayer = useCallback(
    async (playerId: string | null) => {
      const json = await campaignJsonRequest<CampaignSession>(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/active-player`,
        {
          method: "PATCH",
          body: { activePlayerId: playerId },
          fallbackError: "Failed to update active player",
        },
      );
      if (json.data) setCampaignSession(json.data);
    },
    [storyId, sessionId]
  );

  // ── Update roster (GM sets who's present) ────────────────────
  const updateRoster = useCallback(
    async (characterIds: string[]) => {
      let previousRoster: SessionRosterEntry[] = [];
      // Optimistic update: mark listed characters as present, others as absent
      setRoster((prev) => {
        previousRoster = prev;
        if (prev.length === 0) return prev;
        return prev.map((entry) => ({
          ...entry,
          status: characterIds.includes(entry.characterId) ? "present" as const : "absent" as const,
        }));
      });

      try {
        const json = await campaignJsonRequest<SessionRosterEntry[]>(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/roster`,
          {
            method: "PUT",
            body: { characterIds },
            fallbackError: "Failed to update roster",
          },
        );
        setRoster(json.data ?? []);
      } catch (err) {
        setRoster(previousRoster);
        showToast(err instanceof Error ? err.message : "Failed to update roster");
      }
    },
    [storyId, sessionId, showToast]
  );

  const refreshClocks = useCallback(async () => {
    const json = await campaignJsonRequest<ProgressClockData[]>(
      `/api/stories/${storyId}/campaign/sessions/${sessionId}/clocks`,
      { fallbackError: "Failed to refresh clocks" },
    );
    setClocks(json.data ?? []);
    return json.data ?? [];
  }, [storyId, sessionId]);

  // ── Update session (status, title, etc.) ───────────────────
  const updateSession = useCallback(
    async (data: Record<string, unknown>) => {
      const json = await campaignJsonRequest<CampaignSession>(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}`,
        {
          method: "PATCH",
          body: data,
          fallbackError: "Failed to update session",
        },
      );
      if (json.data) setCampaignSession(json.data);
      return json.data as CampaignSession;
    },
    [storyId, sessionId]
  );

  const editTurn = useCallback(
    async (turnId: string, newContent: string) => {
      const trimmed = newContent.trim();
      let previousTurns: Turn[] = [];

      setTurns((prev) => {
        previousTurns = prev;
        return prev.map((turn) =>
          turn.id === turnId ? { ...turn, content: trimmed } : turn,
        );
      });

      try {
        const json = await campaignJsonRequest<Turn>(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns/${turnId}`,
          {
            method: "PATCH",
            body: { content: trimmed },
            fallbackError: "Failed to edit turn",
          },
        );
        if (json.data) {
          setTurns((prev) => prev.map((turn) => (turn.id === turnId ? json.data as Turn : turn)));
        }
        return json.data as Turn;
      } catch (err) {
        setTurns(previousTurns);
        throw err;
      }
    },
    [storyId, sessionId],
  );

  const updateRollRequest = useCallback(
    async (turnId: string, status: "closed" | "cancelled") => {
      const json = await campaignJsonRequest<Turn>(
        `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns/${turnId}/roll-request`,
        {
          method: "PATCH",
          body: { status },
          fallbackError: "Failed to update roll request",
        },
      );
      if (json.data) {
        setTurns((prev) => prev.map((turn) => (turn.id === turnId ? json.data as Turn : turn)));
      }
      return json.data as Turn;
    },
    [storyId, sessionId],
  );

  const refreshFloorRound = useCallback(async () => {
    const json = await campaignJsonRequest<FloorRound | null>(floorRoundsUrl);
    setFloorRound(json.data ?? null);
    return json.data ?? null;
  }, [floorRoundsUrl]);

  const createFloorRound = useCallback(async (prompt: string, mode: FloorRoundMode, audiencePulseEnabled?: boolean) => {
    const json = await campaignJsonRequest<FloorRound>(
      floorRoundsUrl,
      {
        method: "POST",
        body: { prompt, mode, audiencePulseEnabled: !!audiencePulseEnabled },
        fallbackError: "Failed to open Crossroads",
      },
    );
    setFloorRound(json.data ?? null);
    return json.data ?? null;
  }, [floorRoundsUrl]);

  const submitFloorResponse = useCallback(
    async (roundId: string, body: { characterId: string; type: string; content: string }) => {
      const json = await campaignJsonRequest<FloorRound>(
        `${floorRoundsUrl}/${roundId}/submissions`,
        {
          method: "POST",
          body,
          fallbackError: "Failed to submit response",
        },
      );
      setFloorRound(json.data ?? null);
      return json.data ?? null;
    },
    [floorRoundsUrl],
  );

  const voteFloorSubmission = useCallback(async (roundId: string, submissionId: string) => {
    const json = await campaignJsonRequest<FloorRound>(
      `${floorRoundsUrl}/${roundId}/votes`,
      {
        method: "POST",
        body: { submissionId },
        fallbackError: "Failed to cast vote",
      },
    );
    setFloorRound(json.data ?? null);
    return json.data ?? null;
  }, [floorRoundsUrl]);

  const updateFloorRound = useCallback(
    async (roundId: string, body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string }) => {
      const json = await campaignJsonRequest<FloorRound | null>(
        `${floorRoundsUrl}/${roundId}`,
        {
          method: "PATCH",
          body,
          fallbackError: "Failed to update floor round",
        },
      );
      setFloorRound(json.data ?? null);
      const responseWithTurn = json as typeof json & { turn?: Turn };
      if (responseWithTurn.turn) {
        const newTurn = responseWithTurn.turn;
        setTurns((prev) => prev.some((turn) => turn.id === newTurn.id) ? prev : [...prev, newTurn]);
        maxSortRef.current = Math.max(maxSortRef.current, newTurn.sortOrder);
      }
      return json.data ?? null;
    },
    [floorRoundsUrl],
  );

  return {
    story,
    campaignSession,
    turns,
    characters,
    roster,
    floorRound,
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
    editTurn,
    updateRollRequest,
    refreshFloorRound,
    createFloorRound,
    submitFloorResponse,
    voteFloorSubmission,
    updateFloorRound,
    clocks,
    setClocks,
    refreshClocks,
  };
}
