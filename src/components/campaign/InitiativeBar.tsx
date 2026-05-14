"use client";

import { useState, useEffect, useRef } from "react";
import type { FloorRound, PlayerCharacter } from "@/types/campaign";
import { getPlayerColor } from "@/types/campaign";
import { getSessionInteractionState } from "@/lib/campaign-interaction-state";

const DEFAULT_TURN_DURATION = 180; // 3 minutes

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

  // Reset timer whenever active player changes
  useEffect(() => {
    expiredRef.current = false;
    const resetTimeout = setTimeout(() => setSecondsLeft(turnDuration), 0);

    if (timerRef.current) clearInterval(timerRef.current);

    if (isPlayerTurn && isActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
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
    }

    return () => {
      clearTimeout(resetTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activePlayerId, isPlayerTurn, isActive, isGM, turnDuration, onTurnExpired]);

  // Handle timer extension
  const handleExtendTimer = () => {
    setSecondsLeft((prev) => prev + 180);
    expiredRef.current = false;
    // Restart the interval if it was cleared
    if (!timerRef.current && isPlayerTurn && isActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (!expiredRef.current && isGM) {
              expiredRef.current = true;
              setTimeout(() => onTurnExpired(), 0);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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

  // Show extend button when timer < 60s and it's the current player's turn
  const showExtendButton = isMyTurn && isActive && secondsLeft > 0 && secondsLeft < 60;

  return (
    <div className="w-full min-h-20 border-b border-border-subtle bg-black/40 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-2 z-30 shrink-0">
      <div className="flex items-center gap-3">
        {/* GM badge */}
        {isGM && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber/10 border border-amber/20 rounded-full mr-2">
            <div className="w-2 h-2 rounded-full bg-amber shadow-[0_0_8px_rgba(200,150,60,0.5)]" />
            <span className="text-[10px] uppercase font-display tracking-[0.15em] text-amber font-bold">GM</span>
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-display tracking-[0.2em] text-text-secondary">
            {sessionTitle}
          </span>
          <span className={`text-[9px] uppercase tracking-widest ${
            !isActive ? "text-text-tertiary" : floorRound ? "text-lavender/70" : isPlayerTurn ? "text-amber/60" : "text-amber/60"
          }`}>
            {stateLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 max-w-full overflow-x-auto scrollbar-hide" role="group" aria-label="Turn order">
        {initiativeList.map((p) => (
          <button
            key={p.id}
            type="button"
            className="flex flex-col items-center gap-2 group relative bg-transparent border-none p-0 cursor-pointer"
            onClick={() => isGM && isActive ? onPassTurn(p.userId) : undefined}
            aria-label={`${p.name} — ${p.character}${activePlayerId === p.userId ? " (writing)" : ""}`}
            title={isGM && isActive ? `Give turn to ${p.character}` : `${p.name} — ${p.character}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-display text-lg relative z-10 transition-all duration-500
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

            {/* "Writing..." indicator for active player */}
            {activePlayerId === p.userId && isActive && (
              <div className="absolute -bottom-5 flex items-center gap-1 whitespace-nowrap">
                <div className="w-1 h-1 rounded-full bg-amber/60 animate-pulse" />
                <span className="text-[8px] uppercase tracking-widest text-amber/40 font-display">Writing...</span>
              </div>
            )}

            {/* Tooltip */}
            <div className="absolute top-12 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity bg-black border border-border rounded px-2 py-1 flex flex-col items-center whitespace-nowrap pointer-events-none z-50">
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
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ml-2 transition-all ${timerBg}`}>
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
                className="text-[9px] uppercase tracking-wider text-amber/60 hover:text-amber border border-amber/20 hover:border-amber/40 rounded-full px-2 py-0.5 transition-all cursor-pointer"
                title="Add 3 more minutes"
              >
                Extend +3min
              </button>
            )}
          </div>
        )}
      </div>

      {/* GM Controls */}
      <div className="flex items-center gap-2">
        {isGM && isActive && (
          <button
            onClick={onEndSession}
            className="text-[10px] uppercase tracking-widest text-text-tertiary border border-border px-3 py-1.5 rounded-full hover:bg-rose/20 hover:text-rose hover:border-rose/30 transition-all cursor-pointer"
            title="End this session"
          >
            End Session
          </button>
        )}
      </div>
    </div>
  );
}
