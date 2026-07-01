"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Turn } from "@/types/campaign";
import { parseTimerExtensionSeconds } from "@/lib/campaign-play-derive";

export const DEFAULT_TURN_DURATION = 180; // 3 minutes

export type TurnTimerUrgency = "calm" | "warn" | "critical";

export interface TurnTimerState {
  secondsLeft: number;
  /** 0..1 — fraction of the turn remaining (1 when no player holds the pen). */
  progress: number;
  /** "M:SS" */
  timeStr: string;
  urgency: TurnTimerUrgency;
  /**
   * Local +3min bump for the seat owner's own client. The caller must ALSO
   * broadcast the extension (onExtendTimer → OOC turn with {timerExtension})
   * so every other client — crucially the GM's, whose countdown auto-returns
   * the pen — extends the same deadline.
   */
  extendLocally: () => void;
  /** Show "Extend +3min" — it's my turn, active, and under a minute left. */
  showExtendButton: boolean;
}

interface UseTurnTimerOptions {
  activePlayerId: string | null;
  /** A rostered/active player holds the pen (not the Director). */
  isPlayerTurn: boolean;
  /** sessionStatus === "active" */
  isActive: boolean;
  /** Only the GM's client fires onTurnExpired (single-fire). */
  isGM: boolean;
  currentUserId: string | null;
  turnDuration?: number;
  /** OOC turns carrying {timerExtension} metadata — see deriveExtensionTurns. */
  extensionTurns?: Turn[];
  onTurnExpired: () => void;
}

/**
 * The shared turn countdown, extracted verbatim-in-spirit from InitiativeBar.
 * Invariants preserved:
 * - resets to turnDuration whenever the active player changes;
 * - extension turns already present at reset are pre-marked applied (history
 *   shouldn't stretch a fresh countdown);
 * - extensions are skipped when they're not from the pen-holder, or when they
 *   ARE from this client's own user (their client already bumped locally);
 * - expiry fires exactly once, on the GM client only, deferred via setTimeout.
 *
 * MOUNT EXACTLY ONCE PER CLIENT — a second instance means a second
 * onTurnExpired on the GM client.
 */
export function useTurnTimer({
  activePlayerId,
  isPlayerTurn,
  isActive,
  isGM,
  currentUserId,
  turnDuration = DEFAULT_TURN_DURATION,
  extensionTurns = [],
  onTurnExpired,
}: UseTurnTimerOptions): TurnTimerState {
  const [secondsLeft, setSecondsLeft] = useState(turnDuration);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);
  const appliedExtensionIdsRef = useRef<Set<string>>(new Set());
  const extensionTurnsRef = useRef(extensionTurns);
  useEffect(() => {
    extensionTurnsRef.current = extensionTurns;
  }, [extensionTurns]);

  const startCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (!expiredRef.current && isGM) {
            expiredRef.current = true;
            // Defer the callback to avoid state update during render
            setTimeout(() => onTurnExpired(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isGM, onTurnExpired]);

  // Reset timer whenever active player changes
  useEffect(() => {
    expiredRef.current = false;
    // Extension requests from earlier turns (or session history at mount)
    // shouldn't stretch this fresh countdown — mark them all as applied.
    appliedExtensionIdsRef.current = new Set(extensionTurnsRef.current.map((t) => t.id));
    const resetTimeout = setTimeout(() => setSecondsLeft(turnDuration), 0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isPlayerTurn && isActive) {
      startCountdown();
    }

    return () => {
      clearTimeout(resetTimeout);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activePlayerId, isPlayerTurn, isActive, turnDuration, startCountdown]);

  // Apply extensions requested by the active player. Their own client bumps
  // its countdown locally in extendLocally; everyone else (the GM above all)
  // learns about it from the polled OOC turn carrying the metadata.
  useEffect(() => {
    if (!isPlayerTurn || !isActive || !activePlayerId) return;
    // Defer to avoid state updates during render (matches the reset effect).
    const applyTimeout = setTimeout(() => {
      let addedSeconds = 0;
      for (const turn of extensionTurns) {
        if (appliedExtensionIdsRef.current.has(turn.id)) continue;
        appliedExtensionIdsRef.current.add(turn.id);
        if (turn.userId !== activePlayerId || turn.userId === currentUserId) continue;
        addedSeconds += parseTimerExtensionSeconds(turn.metadata);
      }
      if (addedSeconds > 0) {
        setSecondsLeft((prev) => prev + addedSeconds);
        expiredRef.current = false;
        if (!timerRef.current) startCountdown();
      }
    }, 0);
    return () => clearTimeout(applyTimeout);
  }, [extensionTurns, activePlayerId, currentUserId, isPlayerTurn, isActive, startCountdown]);

  const extendLocally = useCallback(() => {
    setSecondsLeft((prev) => prev + 180);
    expiredRef.current = false;
    // Restart the interval if it was cleared
    if (!timerRef.current && isPlayerTurn && isActive) {
      startCountdown();
    }
  }, [isPlayerTurn, isActive, startCountdown]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const urgency: TurnTimerUrgency =
    secondsLeft <= 30 ? "critical" : secondsLeft <= 60 ? "warn" : "calm";
  const progress = isPlayerTurn ? secondsLeft / turnDuration : 1;
  const isMyTurn = isPlayerTurn && activePlayerId === currentUserId;
  const showExtendButton = isMyTurn && isActive && secondsLeft > 0 && secondsLeft < 60;

  return { secondsLeft, progress, timeStr, urgency, extendLocally, showExtendButton };
}
