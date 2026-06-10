"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { FloorRound, PlayerCharacter, Turn } from "@/types/campaign";
import { getPlayerColor } from "@/types/campaign";
import { getSessionInteractionState } from "@/lib/campaign-interaction-state";

const DEFAULT_TURN_DURATION = 180; // 3 minutes

// "Extend +3min" requests travel as OOC turns with {timerExtension}
// metadata so every client (most importantly the GM, whose countdown is
// the one that auto-returns the spotlight) extends the same deadline.
function parseTimerExtensionSeconds(metadata: string | null | undefined): number {
  if (!metadata) return 0;
  try {
    const parsed = JSON.parse(metadata) as { timerExtension?: unknown } | null;
    return typeof parsed?.timerExtension === "number" && parsed.timerExtension > 0
      ? parsed.timerExtension
      : 0;
  } catch {
    return 0;
  }
}

interface InitiativeBarProps {
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  currentUserId: string | null;
  isGM: boolean;
  sessionTitle: string;
  sessionStatus: string;
  turnDuration?: number;
  onPassTurn: (userId: string) => void;
  onEndSession: () => void;
  onTurnExpired: () => void;
  onExtendTimer?: () => void;
  rosterCharacters?: PlayerCharacter[];
  floorRound?: FloorRound | null;
  /** OOC turns carrying {timerExtension} metadata — see parseTimerExtensionSeconds. */
  extensionTurns?: Turn[];
}

export default function InitiativeBar({
  characters,
  activePlayerId,
  currentUserId,
  isGM,
  sessionTitle,
  sessionStatus,
  turnDuration = DEFAULT_TURN_DURATION,
  onPassTurn,
  onEndSession,
  onTurnExpired,
  onExtendTimer,
  rosterCharacters,
  floorRound = null,
  extensionTurns = [],
}: InitiativeBarProps) {
  const activeChars = rosterCharacters ?? characters.filter((c) => c.status === "active");
  const playerUserIds = activeChars.map((c) => c.userId);
  const isActive = sessionStatus === "active";

  // Is a player currently active?
  const isPlayerTurn = activePlayerId !== null && activeChars.some((c) => c.userId === activePlayerId);

  // Is it the current user's turn?
  const isMyTurn = isPlayerTurn && activePlayerId === currentUserId;

  // ── Turn Timer ──────────────────────────────────────────
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
  // its countdown locally in handleExtendTimer; everyone else (the GM above
  // all) learns about it from the polled OOC turn carrying the metadata.
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

  // Handle timer extension
  const handleExtendTimer = () => {
    setSecondsLeft((prev) => prev + 180);
    expiredRef.current = false;
    // Restart the interval if it was cleared
    if (!timerRef.current && isPlayerTurn && isActive) {
      startCountdown();
    }
    onExtendTimer?.();
  };

  // Format MM:SS
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Timer urgency colors
  const timerColor = secondsLeft <= 30
    ? "text-red-400"
    : secondsLeft <= 60
      ? "text-amber"
      : "text-text-secondary";

  const timerBg = secondsLeft <= 30
    ? "bg-red-500/10 border-red-500/20"
    : secondsLeft <= 60
      ? "bg-amber/10 border-amber/20"
      : "bg-subtle/30 border-border";

  // Progress percentage for the ring
  const progress = isPlayerTurn ? secondsLeft / turnDuration : 1;

  const initiativeList = activeChars.map((c) => ({
    id: c.id,
    userId: c.userId,
    name: c.user?.displayName ?? "Player",
    character: c.name,
    initial: c.name.charAt(0).toUpperCase(),
    color: getPlayerColor(c.userId, playerUserIds),
  }));

  const interactionState = getSessionInteractionState({
    sessionStatus,
    activePlayerId,
    currentUserId,
    isGM,
    floorRound,
  });
  const stateLabel = interactionState.label;
  const activeCharacter = activeChars.find((c) => c.userId === activePlayerId) ?? null;
  const activeCharacterName = activeCharacter?.name ?? null;
  const phaseLabel = floorRound
    ? floorRound.status === "open"
      ? "Crossroads: collecting responses"
      : floorRound.status === "voting"
        ? "Crossroads: table voting"
        : floorRound.status === "closed"
          ? "Crossroads: GM resolving"
          : stateLabel
    : isPlayerTurn && activeCharacterName
      ? `${activeCharacterName} is writing`
      : stateLabel;
  const phaseHint = floorRound
    ? floorRound.status === "open"
      ? isGM ? "Resolve or cancel Crossroads before passing the spotlight." : "Write your proposed turn in the Crossroads card."
      : floorRound.status === "voting"
        ? isGM ? "Close the vote, then canonize a response before passing the spotlight." : "Choose the response you want to become canon."
        : isGM ? "Canonize a response or cancel before passing the spotlight." : "The table is waiting for the GM to choose canon."
    : isPlayerTurn && activeCharacterName
      ? isMyTurn ? "Your turn is live." : `Waiting on ${activeCharacterName}.`
      : isGM ? "Click a player below to pass the spotlight." : "Waiting for the GM to pass the spotlight.";
  const canAssignTurn = isGM && isActive && !floorRound;

  // Show extend button when timer < 60s and it's the current player's turn
  const showExtendButton = isMyTurn && isActive && secondsLeft > 0 && secondsLeft < 60;

  return (
    <div className="w-full border-b border-border-subtle bg-black/40 backdrop-blur-xl flex flex-col gap-2 px-3 py-2 z-30 shrink-0 sm:min-h-24 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6 md:px-8 sm:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[220px] sm:gap-3">
        {/* GM badge */}
        {isGM && (
          <div className="mr-1 flex shrink-0 items-center gap-2 rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 sm:mr-2">
            <div className="w-2 h-2 rounded-full bg-amber shadow-[0_0_8px_rgba(200,150,60,0.5)]" />
            <span className="text-[10px] uppercase font-display tracking-[0.15em] text-amber font-bold">GM</span>
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="max-w-[210px] truncate text-[9px] uppercase font-display tracking-[0.18em] text-text-secondary sm:max-w-[360px] sm:text-[10px] sm:tracking-[0.2em]">
            {sessionTitle}
          </span>
          <span className={`mt-0.5 truncate text-[11px] uppercase tracking-widest sm:mt-1 ${
            !isActive ? "text-text-secondary" : floorRound ? "text-lavender" : isPlayerTurn ? "text-amber" : "text-amber"
          }`}>
            {phaseLabel}
          </span>
          <span className="mt-0.5 hidden truncate text-[10px] text-text-secondary sm:block">
            {phaseHint}
          </span>
        </div>
      </div>

      <div className="-mx-1 flex max-w-full items-center justify-start gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:items-start sm:justify-center sm:gap-3 sm:px-0" role="group" aria-label="Turn order">
        {initiativeList.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`group relative flex min-w-[88px] shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 transition-colors sm:min-w-[70px] sm:flex-col sm:gap-1 sm:rounded-xl sm:px-2 ${
              activePlayerId === p.userId
                ? "border-amber/40 bg-amber/10"
                : currentUserId === p.userId
                  ? "border-lavender/30 bg-lavender/10"
                  : "border-transparent bg-transparent hover:border-border hover:bg-subtle/20"
            } ${canAssignTurn ? "cursor-pointer" : "cursor-default"}`}
            onClick={() => canAssignTurn ? onPassTurn(p.userId) : undefined}
            aria-label={`${p.name} — ${p.character}${activePlayerId === p.userId ? " (writing)" : ""}`}
            title={canAssignTurn ? `Pass spotlight to ${p.character}` : floorRound ? "Resolve Crossroads before passing the spotlight" : `${p.name} — ${p.character}`}
          >
            <div
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full font-display text-sm transition-all duration-500 sm:h-11 sm:w-11 sm:text-lg
                ${activePlayerId === p.userId
                  ? "bg-black ring-2 ring-amber text-amber shadow-[0_0_20px_rgba(200,150,60,0.5)]"
                  : "bg-ink border border-border text-text-tertiary hover:border-border-active"
                }`}
            >
              {p.initial}

              {activePlayerId === p.userId && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center border border-amber/30">
                  <div className="w-2 h-2 bg-amber rounded-full animate-pulse" />
                </div>
              )}
            </div>

            <span className="min-w-0 text-left sm:text-center">
              <span className={`block max-w-[58px] truncate text-[10px] font-medium sm:max-w-[82px] ${activePlayerId === p.userId ? "text-amber" : "text-text"}`}>
                {p.character}
              </span>
              <span className={`block text-[8px] uppercase tracking-widest ${
                activePlayerId === p.userId
                  ? "text-amber"
                  : currentUserId === p.userId
                    ? "text-lavender"
                    : floorRound
                      ? "text-text-secondary"
                      : "text-text-tertiary"
              }`}>
                {activePlayerId === p.userId
                  ? "Writing"
                  : currentUserId === p.userId
                    ? "You"
                    : floorRound?.status === "voting"
                      ? "Voting"
                      : floorRound?.status === "open"
                        ? "Responding"
                        : "Ready"}
              </span>
            </span>

            {/* Tooltip */}
            <div className="absolute top-20 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity bg-black border border-border rounded px-2 py-1 flex flex-col items-center whitespace-nowrap pointer-events-none z-50">
              <span className={`text-[10px] font-bold ${p.color}`}>{p.name}</span>
              <span className="text-[9px] text-text-secondary">{p.character}</span>
            </div>
          </button>
        ))}

        {initiativeList.length === 0 && (
          <span className="text-[10px] text-text-tertiary italic">No players yet</span>
        )}

        {/* Turn Timer — only visible when a player has the turn */}
        {isPlayerTurn && isActive && (
          <div className={`ml-1 flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 transition-all sm:ml-2 ${timerBg}`}>
            {/* Circular progress indicator */}
            <div className="relative w-5 h-5">
              <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-ghost" />
                <circle
                  cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
                  className={timerColor}
                  strokeDasharray={`${2 * Math.PI * 8}`}
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - progress)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
            </div>
            <span className={`text-xs font-mono font-bold tabular-nums ${timerColor}`}>
              {timeStr}
            </span>

            {/* Extend timer button — visible when < 60s and it's current player's turn */}
            {showExtendButton && (
              <button
                onClick={handleExtendTimer}
                className="min-h-8 text-[9px] uppercase tracking-wider text-amber/70 hover:text-amber border border-amber/20 hover:border-amber/40 rounded-full px-3 py-1 transition-all cursor-pointer"
                title="Add 3 more minutes"
              >
                Extend +3min
              </button>
            )}
          </div>
        )}
      </div>

      {/* GM Controls */}
      <div className="hidden items-center gap-2 sm:flex">
        {isGM && isActive && (
          <button
            onClick={onEndSession}
            className="min-h-9 text-[10px] uppercase tracking-widest text-text-secondary border border-border px-4 py-2 rounded-full hover:bg-rose/20 hover:text-rose hover:border-rose/30 transition-all cursor-pointer"
            title="End this session"
          >
            End Session
          </button>
        )}
      </div>
    </div>
  );
}
