"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import type {
  Turn,
  CampaignSession,
  PlayerCharacter,
  StoryData,
  SessionRosterEntry,
  FloorRound,
} from "@/types/campaign";
import { campaignJsonRequest } from "@/lib/campaign-api";

/**
 * The v2 play surface's data plumbing: session + turns + characters +
 * roster + the floor round, polled; and the few mutations the "Set in Ink"
 * page actually performs — write a turn, pass the pen, begin/end the
 * session, cancel a roll call, run a vote or a Stranger ballot. The old
 * surface's inventory (clocks, marks, bargains, reactions, acting-GM, turn
 * edits) was removed with the manuscript cutover; its API routes were
 * pruned 2026-07-04 (the tables keep their data — see schema.ts).
 */

// How far behind the newest known sortOrder each poll reaches. Re-fetching a
// short tail of already-seen turns lets in-place mutations (roll-request
// close/cancel) made by other clients reach us — a strict greater-than
// cursor would never deliver them.
const TURN_POLL_OVERLAP = 20;

// Merge freshly fetched turns into the existing list: append unseen turns,
// replace rows whose content/metadata changed server-side, keep everything
// ordered by sortOrder, and return `prev` untouched when nothing changed so
// polls don't cause re-renders.
function mergeTurns(prev: Turn[], incoming: Turn[]): Turn[] {
  const byId = new Map(prev.map((t) => [t.id, t] as const));
  let changed = false;
  for (const turn of incoming) {
    const existing = byId.get(turn.id);
    if (!existing) {
      byId.set(turn.id, turn);
      changed = true;
    } else if (
      existing.content !== turn.content ||
      existing.metadata !== turn.metadata
    ) {
      byId.set(turn.id, turn);
      changed = true;
    }
  }
  if (!changed) return prev;
  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function useCampaignSession(storyId: string, sessionId: string) {
  const { data: authSession } = useSession();

  const [story, setStory] = useState<StoryData | null>(null);
  const [campaignSession, setCampaignSession] = useState<CampaignSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [roster, setRoster] = useState<SessionRosterEntry[]>([]);
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
        const [storyRes, turnsRes, charsRes, rosterRes] = await Promise.all([
          fetch(`/api/stories/${storyId}`),
          fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/turns`),
          fetch(`/api/stories/${storyId}/campaign/characters`),
          fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/roster`),
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

        if (rosterRes.ok) {
          try {
            const rosterJson = await rosterRes.json();
            setRoster(rosterJson.data ?? []);
          } catch { /* roster API may not return expected shape yet */ }
        }

        try {
          const floorJson = await campaignJsonRequest<FloorRound | null>(floorRoundsUrl);
          setFloorRound(floorJson.data ?? null);
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
        // Poll with a trailing overlap so in-place mutations to recent turns
        // (roll-request status flips) from other clients are picked up, not
        // just strictly-newer rows.
        const afterSort = Math.max(-1, maxSortRef.current - TURN_POLL_OVERLAP);
        const res = await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/turns?afterSort=${afterSort}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const json = await res.json();
        const newTurns: Turn[] = json.data ?? [];
        if (newTurns.length > 0) {
          setTurns((prev) => mergeTurns(prev, newTurns));
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
          const [charsRes, rosterPollRes] = await Promise.all([
            fetch(`/api/stories/${storyId}/campaign/characters`, { signal: controller.signal }),
            fetch(`/api/stories/${storyId}/campaign/sessions/${sessionId}/roster`, { signal: controller.signal }),
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

      setTurns((prev) => mergeTurns(prev, [newTurn]));
      // Deliberately do NOT advance maxSortRef here: another participant's
      // turn may have landed with a lower sortOrder than ours since the last
      // poll, and bumping the cursor past it would drop it forever. The next
      // poll re-delivers our own turn and mergeTurns dedupes it.

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

  const createFloorRound = useCallback(async (
    prompt: string,
    opts?: {
      audiencePulseEnabled?: boolean;
      /** "stranger" opens the house's ballot: Director-framed deeds, audience votes.
       *  Lobby modes (draft only): "warmup" (answered in a line) and
       *  "temperature" (2–4 options, the room leans; non-binding). */
      mode?: "vote" | "stranger" | "warmup" | "temperature";
      deeds?: string[];
      options?: string[];
    },
  ) => {
    const json = await campaignJsonRequest<FloorRound>(
      floorRoundsUrl,
      {
        method: "POST",
        body: {
          prompt,
          audiencePulseEnabled: !!opts?.audiencePulseEnabled,
          ...(opts?.mode ? { mode: opts.mode } : {}),
          ...(opts?.deeds ? { deeds: opts.deeds } : {}),
          ...(opts?.options ? { options: opts.options } : {}),
        },
        fallbackError: "Failed to open the vote",
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
    async (
      roundId: string,
      body: {
        status?: "voting" | "closed" | "resolved" | "cancelled";
        selectedSubmissionId?: string;
        /** Warm-up lift: the marked answer opens the story at begin. Null un-lifts. */
        liftSubmissionId?: string | null;
      },
    ) => {
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
        // Same as sendTurn: merge sorted, and leave maxSortRef to the poll so
        // concurrent lower-sortOrder turns aren't skipped.
        setTurns((prev) => mergeTurns(prev, [newTurn]));
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
    sendTurn,
    setActivePlayer,
    updateSession,
    updateRollRequest,
    refreshFloorRound,
    createFloorRound,
    submitFloorResponse,
    voteFloorSubmission,
    updateFloorRound,
  };
}
