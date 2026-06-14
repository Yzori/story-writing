"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FloorRound, Turn, PlayerCharacter, RollRequest, SessionRosterEntry } from "@/types/campaign";
// getPlayerColor is used by TurnRenderer
import AdventureDraftComposer from "./AdventureDraftComposer";
import FloorRoundPanel from "./FloorRoundPanel";
import IllustrationTurn from "./IllustrationTurn";
import InitiativeBar from "./InitiativeBar";
import DiceRoller from "./DiceRoller";
import SessionLobby from "./SessionLobby";
import MapOverlay from "./MapOverlay";
import SceneBreakRenderer from "./SceneBreakRenderer";
import StoryMomentRenderer from "./StoryMomentRenderer";
import SessionEndedBlock from "./SessionEndedBlock";
import TurnRenderer from "./TurnRenderer";
import MarkPromptRail from "./MarkPromptRail";
import PreviouslyOn from "./PreviouslyOn";
import { isLegacyCinematicSceneBreak, parseSceneBreakMetadata } from "@/lib/campaign-turns";
import { getSessionInteractionState } from "@/lib/campaign-interaction-state";
import { useTurnEditing } from "@/hooks/use-turn-editing";
import {
  groupIntoParagraphs,
  MOOD_TINT_COLORS,
  MOOD_VIGNETTE_COLORS,
} from "./ProseAssembler";

interface StoryCanvasProps {
  sessionId: string;
  storyId?: string;
  storyTurns: Turn[];
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  currentUserId: string | null;
  isGM: boolean;
  myCharacter?: PlayerCharacter | null;
  sessionTitle: string;
  sessionStatus: string;
  sessionOpening: string | null;
  /** Story title + closing thoughts — for the end-of-session Episode Card. */
  storyTitle?: string;
  sessionEpilogue?: string | null;
  sessionCliffhanger?: string | null;
  showDiceRoller: boolean;
  onCloseDiceRoller: () => void;
  onCommitDraft: (content: string, type: string, metadata?: string) => void | Promise<void>;
  onResolveBargain?: (turnId: string, response: "accepted" | "refused") => void | Promise<void>;
  onPassTurn: (userId: string) => void;
  onEndSession: () => void;
  onTurnExpired: () => void;
  onExtendTimer?: () => void;
  /** OOC turns carrying {timerExtension} metadata — lets the GM's countdown
   *  honor a player's "Extend +3min" instead of expiring independently. */
  extensionTurns?: Turn[];
  onRollSubmit: (intent: { attribute: string; aspectInvoked: boolean }) => Promise<{
    dice: [number, number];
    modifier: number;
    total: number;
    tier: "success" | "partial" | "failure";
  }>;
  pendingRollRequest: RollRequest | null;
  myCharacterStatus: string | null;
  onLastWords: (content: string) => void;
  onReaction?: (reactionKey: string) => void;
  /** Reactions from OTHER people at the table (the current user's own clicks
   *  float locally), to animate into the stage as they arrive. */
  incomingReactions?: Array<{ id: string; type: string }>;
  /** A waiting player can bid for the spotlight; the Director sees the queue. */
  myHandRaised?: boolean;
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  onEditTurn?: (turnId: string, newContent: string) => void;
  lobbyTheme?: string;
  previousEpilogue?: string | null;
  previousMood?: string | null;
  onBeginSession?: () => void;
  /** Campaign map background URL (story.mapImageUrl). The MapOverlay renders
   *  it as the SpatialMap canvas. Null until the GM sets one. */
  mapImageUrl?: string | null;
  /** PATCHes story.mapImageUrl. GM-only on the server; null clears the
   *  background. The overlay only invokes this when isGM is true. */
  onUpdateMapImage?: (url: string | null) => Promise<void> | void;
  logTurns?: Turn[];
  roster?: SessionRosterEntry[];
  rosterCharacters?: PlayerCharacter[];
  allCharacters?: PlayerCharacter[];
  onUpdateRoster?: (characterIds: string[]) => void;
  spectatorMode?: boolean;
  floorRound?: FloorRound | null;
  onSubmitFloorResponse?: (
    roundId: string,
    body: { characterId: string; type: string; content: string },
  ) => Promise<void>;
  onVoteFloorSubmission?: (roundId: string, submissionId: string) => Promise<void>;
  onUpdateAudienceSpark?: (roundId: string, sparkId: string, action: "promote" | "reject") => Promise<void>;
  onUpdateFloorRound?: (
    roundId: string,
    body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string },
  ) => Promise<void>;
  onCreateMark?: (
    characterId: string,
    input: { kind: import("@/types/campaign").CharacterMarkKind; text: string; sourceTurnId?: string },
  ) => Promise<unknown>;
  storyMomentAmplificationCounts?: Record<string, number>;
  amplifiedStoryMomentIds?: Set<string>;
  onAmplifyStoryMoment?: (turnId: string) => void;
  showSessionChrome?: boolean;
  /** Opens the Table-talk (OOC chat) drawer — wired through to the bottom bar. */
  onViewChat?: () => void;
}

// ── Reaction System ──────────────────────────────────────────

const REACTIONS = [
  { emoji: "\u2694\uFE0F", label: "Tension", key: "tension" },
  { emoji: "\uD83D\uDE2E", label: "Gasp", key: "gasp" },
  { emoji: "\uD83D\uDC4F", label: "Bravo", key: "bravo" },
  { emoji: "\uD83D\uDE02", label: "Haha", key: "laugh" },
  { emoji: "\uD83D\uDC80", label: "Oh no", key: "dread" },
];

const REACTION_EMOJI_MAP: Record<string, string> = Object.fromEntries(
  REACTIONS.map((r) => [r.key, r.emoji])
);

// Session activation inserts the opening narration as a turn with
// metadata {"opening": true} (sessions/[sessionId]/route.ts) while the
// session row keeps its `opening` column. The dedicated opening block
// below renders sessionOpening, so that turn must be dropped from the
// stream or the opening appears twice. Mirrors the compile-side filter
// in src/server/services/compile-session.ts.
function isOpeningTurn(turn: Turn): boolean {
  if (turn.type !== "narration" || !turn.metadata) return false;
  try {
    const parsed = JSON.parse(turn.metadata) as { opening?: unknown } | null;
    return parsed?.opening === true;
  } catch {
    return false;
  }
}

interface CurrentSceneState {
  currentMood: string | null;
  currentSceneAspects: string[];
}

function getCurrentSceneState(storyTurns: Turn[]): CurrentSceneState {
  for (let i = storyTurns.length - 1; i >= 0; i--) {
    const turn = storyTurns[i];
    if (turn?.type === "scene-break" && turn.metadata) {
      const meta = parseSceneBreakMetadata(turn.metadata);
      if (!meta) continue;
      if (meta.cinematic) continue;
      return {
        currentMood: meta.mood ?? null,
        currentSceneAspects: meta.aspects ?? [],
      };
    }
  }

  return { currentMood: null, currentSceneAspects: [] };
}

function FloatingReaction({
  emoji,
  x,
  onComplete,
}: {
  emoji: string;
  x: number;
  onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -80, scale: 1.2 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="absolute top-2 pointer-events-none z-50 text-3xl select-none"
      style={{ left: `${x}%` }}
    >
      {emoji}
    </motion.div>
  );
}

export default function StoryCanvas({
  sessionId,
  storyId,
  storyTurns: allStoryTurns,
  characters,
  activePlayerId,
  currentUserId,
  isGM,
  myCharacter,
  sessionTitle,
  sessionStatus,
  sessionOpening,
  storyTitle,
  sessionEpilogue = null,
  sessionCliffhanger = null,
  showDiceRoller,
  onCloseDiceRoller,
  onCommitDraft,
  onResolveBargain,
  onPassTurn,
  onEndSession,
  onTurnExpired,
  onExtendTimer,
  extensionTurns,
  onRollSubmit,
  pendingRollRequest,
  myCharacterStatus,
  onLastWords,
  onReaction,
  incomingReactions,
  myHandRaised = false,
  onRaiseHand,
  onLowerHand,
  onEditTurn,
  lobbyTheme,
  previousEpilogue,
  previousMood,
  onBeginSession,
  mapImageUrl,
  onUpdateMapImage,
  logTurns = [],
  roster,
  rosterCharacters,
  allCharacters,
  onUpdateRoster,
  spectatorMode = false,
  floorRound = null,
  onSubmitFloorResponse,
  onVoteFloorSubmission,
  onUpdateAudienceSpark,
  onUpdateFloorRound,
  onCreateMark,
  storyMomentAmplificationCounts = {},
  amplifiedStoryMomentIds,
  onAmplifyStoryMoment,
  showSessionChrome = true,
  onViewChat,
}: StoryCanvasProps) {
  // Drop the activation-inserted opening turn whenever the dedicated
  // opening block renders sessionOpening, so the text appears once. If
  // the session's opening column was cleared after activation, keep the
  // turn so the text still shows.
  const storyTurns = useMemo(
    () => (sessionOpening ? allStoryTurns.filter((turn) => !isOpeningTurn(turn)) : allStoryTurns),
    [allStoryTurns, sessionOpening],
  );

  const TURNS_PER_BATCH = 50;
  const [visibleStartIndex, setVisibleStartIndex] = useState(() =>
    Math.max(0, storyTurns.length - TURNS_PER_BATCH)
  );
  const [showMap, setShowMap] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMyTurn = activePlayerId === currentUserId;
  const isActive = sessionStatus === "active";
  // Turn-as-environment: the Director holds the pen when no active player is on
  // the spotlight. Used to wash the page head in candlelight while they narrate.
  const directorNarrating =
    isActive && (!activePlayerId || !characters.some((c) => c.userId === activePlayerId && c.status === "active"));
  const myTurnFocus = isActive && isMyTurn && !isGM;
  const [lastWordsContent, setLastWordsContent] = useState("");
  const [lastWordsSent, setLastWordsSent] = useState(false);
  // Lobby is a one-time threshold ritual. Suppress it if the session already
  // has turns — applies to sessions that started before the lobby existed,
  // or any future case where status drifts back to "draft" with play history.
  const isDraft = sessionStatus === "draft" && storyTurns.length === 0;
  const isCharDead = myCharacterStatus === "dead";
  const isCharRetired = myCharacterStatus === "retired";
  const isCharGone = isCharDead || isCharRetired;

  // Reset lastWordsSent when character is revived (status changes from dead/retired to active)
  useEffect(() => {
    if (!isCharGone) {
      const timeoutId = setTimeout(() => setLastWordsSent(false), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isCharGone]);

  // ── Reaction state ──────────────────────────────────────
  const [floatingReactions, setFloatingReactions] = useState<Array<{
    id: string;
    emoji: string;
    x: number;
    timestamp: number;
  }>>([]);
  const [reactionCooldown, setReactionCooldown] = useState(false);

  const handleReactionClick = useCallback((reactionKey: string) => {
    if (reactionCooldown) return;

    // Fire the callback
    onReaction?.(reactionKey);

    // Add floating reaction at a semi-random horizontal position (30-70%)
    const x = 30 + Math.random() * 40;
    const id = `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const emoji = REACTION_EMOJI_MAP[reactionKey] ?? reactionKey;
    setFloatingReactions((prev) => [...prev, { id, emoji, x, timestamp: Date.now() }]);

    // Cooldown
    setReactionCooldown(true);
    setTimeout(() => setReactionCooldown(false), 2000);
  }, [reactionCooldown, onReaction]);

  const removeFloatingReaction = useCallback((id: string) => {
    setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Float reactions arriving from other people at the table. Each id floats
  // once — the ref guards against re-animating on every poll merge.
  const floatedReactionIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!incomingReactions?.length) return;
    const fresh = incomingReactions.filter((r) => !floatedReactionIdsRef.current.has(r.id));
    if (fresh.length === 0) return;
    setFloatingReactions((prev) => [
      ...prev,
      ...fresh.map((r) => {
        floatedReactionIdsRef.current.add(r.id);
        return {
          id: `incoming-${r.id}`,
          emoji: REACTION_EMOJI_MAP[r.type] ?? "✨",
          x: 30 + Math.random() * 40,
          timestamp: Date.now(),
        };
      }),
    ]);
  }, [incomingReactions]);

  const {
    editableTurn,
    editingTurnId,
    editContent,
    setEditContent,
    handleEditClick,
    handleEditSave,
    handleEditCancel,
  } = useTurnEditing({
    storyTurns,
    currentUserId,
    activePlayerId,
    onEditTurn,
  });

  const interactionState = getSessionInteractionState({
    sessionStatus,
    activePlayerId,
    currentUserId,
    isGM,
    myCharacterStatus,
    floorRound,
  });
  const canWrite = interactionState.canWriteDirect;
  // Gate the composer on the interaction state machine: locked-out players
  // (another player's assigned turn, Crossroads, etc.) get the waiting
  // panel / FloorRoundPanel instead of a Submit button the server rejects.
  const canShowComposer = !spectatorMode && canWrite;

  // Find who's currently writing for the lock screen
  const activeChar = characters.find((c) => c.userId === activePlayerId);
  const activePlayerName = activeChar
    ? `${activeChar.user?.displayName ?? "Someone"} (${activeChar.name})`
    : "another player";

  // Auto-scroll on new turns — but only if the reader is already near the
  // bottom. If they scrolled up to re-read earlier prose, leave them there.
  const [showNewTurnHint, setShowNewTurnHint] = useState(false);
  const STICK_THRESHOLD_PX = 120;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    let timeoutId: ReturnType<typeof setTimeout>;
    if (distanceFromBottom <= STICK_THRESHOLD_PX) {
      el.scrollTop = el.scrollHeight;
      timeoutId = setTimeout(() => setShowNewTurnHint(false), 0);
    } else {
      timeoutId = setTimeout(() => setShowNewTurnHint(true), 0);
    }
    return () => clearTimeout(timeoutId);
  }, [storyTurns.length]);

  // Clear the hint when the user manually scrolls back to the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom <= STICK_THRESHOLD_PX) setShowNewTurnHint(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowNewTurnHint(false);
  }, []);

  // Reset visible window when turns are cleared (e.g. new session)
  const prevTotalTurnsRef = useRef(storyTurns.length);
  useEffect(() => {
    if (storyTurns.length < prevTotalTurnsRef.current) {
      const timeoutId = setTimeout(() => {
        setVisibleStartIndex(Math.max(0, storyTurns.length - TURNS_PER_BATCH));
      }, 0);
      prevTotalTurnsRef.current = storyTurns.length;
      return () => clearTimeout(timeoutId);
    }
    prevTotalTurnsRef.current = storyTurns.length;
  }, [storyTurns.length]);

  const hasEarlierTurns = visibleStartIndex > 0;

  const handleLoadEarlier = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const prevScrollHeight = scrollEl.scrollHeight;
    const prevScrollTop = scrollEl.scrollTop;

    setVisibleStartIndex((prev) => Math.max(0, prev - TURNS_PER_BATCH));

    // Preserve scroll position after new content renders above
    requestAnimationFrame(() => {
      const newScrollHeight = scrollEl.scrollHeight;
      scrollEl.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
    });
  }, []);

  // Find the current player's character name for the preview
  const myCharName = characters.find((c) => c.userId === currentUserId)?.name ?? null;

  // ── Prose Assembly (imported from ProseAssembler.tsx) ──────

  // Slice to only the visible turns (paginated from the end)
  const visibleTurns = useMemo(() => storyTurns.slice(visibleStartIndex), [storyTurns, visibleStartIndex]);

  // Group turns into paragraphs
  const paragraphs = useMemo(() => groupIntoParagraphs(visibleTurns), [visibleTurns]);

  const markPromptTurns = useMemo(
    () => [...storyTurns, ...logTurns].sort((a, b) => a.sortOrder - b.sortOrder),
    [storyTurns, logTurns],
  );

  // Stable player color map
  const playerUserIds = useMemo(() => characters.filter((c) => c.status === "active").map((c) => c.userId), [characters]);

  // ── Mood & Aspects — derive from latest scene-break ──────────
  const { currentMood, currentSceneAspects } = getCurrentSceneState(storyTurns);

  const moodTint = currentMood ? MOOD_TINT_COLORS[currentMood] ?? null : null;
  const moodVignette = currentMood ? MOOD_VIGNETTE_COLORS[currentMood] ?? null : null;

  // Count scene-break turns. The MapOverlay refreshes its places list
  // whenever this changes, so server-auto-created places (those upserted
  // behind a freshly-posted scene-break) appear without manual refresh.
  const sceneBreakCount = useMemo(
    () => storyTurns.filter((t) => t.type === "scene-break").length,
    [storyTurns],
  );

  return (
    <div className="flex-1 h-full flex flex-col relative bg-void">
      {/* Places / Map toggle */}
      {showSessionChrome && !showMap && (
        <div className="absolute right-3 top-3 z-50 flex max-w-[calc(100%-2rem)] flex-col items-end gap-2 sm:right-4 sm:top-28">
          <button
            onClick={() => setShowMap(true)}
            className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-black/45 px-3 py-2 text-xs text-text-secondary backdrop-blur-md transition-colors hover:bg-subtle/50 hover:text-paper sm:min-h-10 sm:bg-subtle/30 sm:px-4"
            aria-label="Places and map"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            <span className="hidden sm:inline">Places</span>
          </button>
        </div>
      )}

      {/* Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="adventure-cinematic-glow absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber/[0.02] blur-[100px] rounded-full mix-blend-screen" />
        <div className="adventure-cinematic-shadow absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />

        {/* Mood tint overlay — shifts color based on current scene mood */}
        {moodTint && (
          <div
            className="adventure-mood-tint absolute inset-0 transition-all duration-[3000ms] ease-in-out"
            style={{ backgroundColor: moodTint }}
          />
        )}

        {/* Mood vignette — darker, more dramatic moods get an edge vignette */}
        {moodVignette && (
          <div
            className="adventure-mood-vignette absolute inset-0 transition-all duration-[3000ms] ease-in-out"
            style={{
              boxShadow: `inset 0 0 150px 40px ${moodVignette}`,
            }}
          />
        )}
      </div>

      {/* Initiative Bar */}
      {showSessionChrome && (
        <InitiativeBar
          characters={characters}
          rosterCharacters={rosterCharacters}
          activePlayerId={activePlayerId}
          currentUserId={currentUserId}
          isGM={isGM}
          sessionTitle={sessionTitle}
          sessionStatus={sessionStatus}
          onPassTurn={onPassTurn}
          onEndSession={onEndSession}
          onTurnExpired={onTurnExpired}
          onExtendTimer={onExtendTimer}
          extensionTurns={extensionTurns}
          floorRound={floorRound}
        />
      )}

      {/* Scene Aspect Tags — floating pills below initiative bar */}
      <AnimatePresence>
        {showSessionChrome && currentSceneAspects.length > 0 && sessionStatus === "active" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full flex items-center justify-center gap-2 px-8 py-2 z-20 shrink-0"
          >
            {currentSceneAspects.map((aspect, i) => {
              const moodBorderColors: Record<string, string> = {
                tense: "border-rose/30 text-rose/50",
                calm: "border-sage/30 text-sage/50",
                ominous: "border-violet/30 text-violet/50",
                triumphant: "border-amber/30 text-amber/50",
                melancholy: "border-indigo-400/30 text-indigo-400/50",
                chaotic: "border-orange-400/30 text-orange-400/50",
                mysterious: "border-cyan-400/30 text-cyan-400/50",
                romantic: "border-pink-400/30 text-pink-400/50",
              };
              const colors = moodBorderColors[currentMood ?? ""] ?? "border-border-active text-text-tertiary";
              return (
                <motion.span
                  key={aspect}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className={`px-3 py-1 rounded-full border bg-black/30 backdrop-blur-sm text-[10px] font-serif italic ${colors}`}
                >
                  {aspect}
                </motion.span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Canvas */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-10 pb-72 px-4 sm:px-8 lg:px-12 flex flex-col items-center z-10 relative scroll-smooth sm:pt-16 sm:pb-80 [scrollbar-width:thin] [scrollbar-color:rgba(224,169,62,0.22)_transparent]">

        {/* Floating reaction bubbles — positioned above story content */}
        <AnimatePresence>
          {floatingReactions.map((r) => (
            <FloatingReaction
              key={r.id}
              emoji={r.emoji}
              x={r.x}
              onComplete={() => removeFloatingReaction(r.id)}
            />
          ))}
        </AnimatePresence>

        {/* Pre-session lobby */}
        {isDraft && (
          <SessionLobby
            lobbyTheme={lobbyTheme ?? "campfire"}
            sessionTitle={sessionTitle}
            sessionOpening={sessionOpening}
            previousEpilogue={previousEpilogue}
            previousMood={previousMood}
            characters={rosterCharacters ?? characters}
            isGM={isGM}
            onBeginSession={onBeginSession ?? (() => {})}
            roster={roster}
            allCharacters={allCharacters ?? characters}
            onUpdateRoster={onUpdateRoster}
          />
        )}

        {/* "Previously, on…" — anchors the player in last week's beats. */}
        {storyId && (
          <PreviouslyOn storyId={storyId} sessionId={sessionId} />
        )}

        {/* Story Content */}
        {/* The page sheet — the same lit leaf as the editor, floating on the dark table.
            Turn-as-environment: a gold veil washes its head while the Director narrates;
            the page eases back a touch when it's your turn, throwing the light to the composer. */}
        <div
          className={`relative w-full max-w-[860px] mb-10 overflow-hidden rounded-2xl border border-border bg-ink/95 px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-700 sm:px-14 sm:py-14 ${
            myTurnFocus ? "opacity-80 scale-[0.995]" : "opacity-100"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-32 rounded-t-2xl bg-gradient-to-b from-amber/[0.10] to-transparent transition-opacity duration-700 ${
              directorNarrating ? "opacity-100" : "opacity-0"
            }`}
          />
          <div className="mb-8 text-center sm:mb-12">
            <h1 className="font-display text-2xl text-paper sm:text-4xl">{sessionTitle}</h1>
            <div className="mx-auto mt-4 mb-8 h-[1px] w-20 bg-gradient-to-r from-transparent via-amber/40 to-transparent sm:mt-6 sm:mb-12 sm:w-24" />
          </div>

          {/* Opening narration */}
          {sessionOpening && (
            <div className="mb-8 border-l-2 border-amber/20 pl-4 font-reading text-[16px] leading-[1.8] text-paper/60 italic sm:mb-10 sm:pl-6 sm:text-[19px] sm:leading-[2.1]">
              {sessionOpening}
            </div>
          )}

          {storyTurns.length === 0 && !sessionOpening ? (
            <div className="text-center py-20">
              <p className="text-text-ghost text-sm font-reading italic">
                {isGM ? "Set the scene with your opening narration." : "Waiting for the GM to begin..."}
              </p>
            </div>
          ) : (
            <div
              className="novel-reader space-y-5 break-words sm:space-y-6"
              aria-live="polite"
              aria-relevant="additions text"
              aria-atomic="false"
              aria-label="Story stream"
            >
              {/* Load earlier turns */}
              {hasEarlierTurns && (
                <div className="flex justify-center !mb-8">
                  <button
                    onClick={handleLoadEarlier}
                    className="bg-subtle/20 hover:bg-subtle/40 border border-border hover:border-border-active text-text-tertiary hover:text-text-secondary rounded-full px-5 py-2.5 text-[11px] uppercase tracking-widest font-display transition-all cursor-pointer group"
                  >
                    Load earlier turns
                    <span className="ml-2 text-text-ghost group-hover:text-text-tertiary transition-colors">
                      ({visibleStartIndex} more)
                    </span>
                  </button>
                </div>
              )}
              {(() => {
                let runningIdx = visibleStartIndex;
                return paragraphs.map((group, pi) => {
                const globalIdx = runningIdx;
                runningIdx += group.length;

                // Scene-break turns render as ornamental dividers
                if (group[0].type === "scene-break") {
                  if (isLegacyCinematicSceneBreak(group[0].type, group[0].metadata)) {
                    return (
                      <StoryMomentRenderer
                        key={group[0].id}
                        turn={group[0]}
                        amplificationCount={storyMomentAmplificationCounts[group[0].id] ?? 0}
                        amplifiedByMe={amplifiedStoryMomentIds?.has(group[0].id) ?? false}
                        onAmplify={onAmplifyStoryMoment}
                      />
                    );
                  }
                  return <SceneBreakRenderer key={group[0].id} turn={group[0]} />;
                }

                if (group[0].type === "story-moment") {
                  return (
                    <StoryMomentRenderer
                      key={group[0].id}
                      turn={group[0]}
                      amplificationCount={storyMomentAmplificationCounts[group[0].id] ?? 0}
                      amplifiedByMe={amplifiedStoryMomentIds?.has(group[0].id) ?? false}
                      onAmplify={onAmplifyStoryMoment}
                    />
                  );
                }

                // Illustration turns render as visual breaks in the prose
                if (group[0].type === "illustration") {
                  return <IllustrationTurn key={group[0].id} turn={group[0]} />;
                }

                const groupHasEditable = editableTurn && group.some((t) => t.id === editableTurn.id);

                return (
                  <div key={group[0].id}>
                    {/* role="paragraph" — keeps the screen-reader semantic
                        of a paragraph while allowing nested <button>s
                        (bargain interactions + inline edit). */}
                    <div role="paragraph" className="relative group/para">
                      {group.map((turn, ti) => (
                        <TurnRenderer
                          key={turn.id}
                          turn={turn}
                          idx={ti}
                          group={group}
                          globalIdx={globalIdx + ti}
                          playerUserIds={playerUserIds}
                          currentUserId={currentUserId}
                          isGM={isGM}
                          onResolveBargain={onResolveBargain}
                        />
                      ))}
                      {pi === paragraphs.length - 1 && !groupHasEditable && (
                        <span aria-hidden="true" className="inline-block w-1.5 h-5 bg-amber/40 ml-1 animate-pulse align-middle" />
                      )}
                      {groupHasEditable && editingTurnId !== editableTurn.id && (
                        <button
                          onClick={() => handleEditClick(editableTurn)}
                          className="inline-flex items-center gap-1 ml-2 align-middle opacity-70 group-hover/para:opacity-100 transition-opacity cursor-pointer"
                          title="Edit (30s window)"
                          aria-label="Edit this turn (30 second window)"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50" aria-hidden="true">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                          <span className="text-[11px] text-amber/70 uppercase tracking-wider">edit</span>
                        </button>
                      )}
                    </div>
                    {/* Inline edit box */}
                    <AnimatePresence>
                      {editingTurnId && editableTurn && group.some((t) => t.id === editingTurnId) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-amber/5 border border-amber/20 rounded-xl p-4 mt-2 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] uppercase tracking-widest text-amber/50 font-display">Quick Edit</span>
                              <span className="text-[9px] text-text-ghost">Changes apply instantly</span>
                            </div>
                            <textarea
                              className="w-full bg-transparent text-[17px] leading-[1.9] text-paper/90 outline-none font-serif resize-none min-h-[60px] placeholder:text-text-ghost"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-amber/10">
                              <button
                                onClick={handleEditCancel}
                                className="text-[10px] text-text-tertiary hover:text-text-secondary px-3 py-1 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleEditSave}
                                disabled={!editContent.trim()}
                                className="bg-amber/10 hover:bg-amber/20 border border-amber/20 text-amber text-[10px] uppercase tracking-wider font-bold rounded-full px-4 py-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              });
              })()}
            </div>
          )}
        </div>

        {!spectatorMode && floorRound && (
          <FloorRoundPanel
            floorRound={floorRound}
            isGM={isGM}
            myCharacter={myCharacter ?? null}
            isActive={isActive}
            onSubmitResponse={onSubmitFloorResponse ?? (async () => {})}
            onVoteSubmission={onVoteFloorSubmission ?? (async () => {})}
            onUpdateAudienceSpark={onUpdateAudienceSpark ?? (async () => {})}
            onUpdateRound={onUpdateFloorRound ?? (async () => {})}
          />
        )}

        {/* Mark-the-moment prompts — quietly surfaces eligible roll +
            accepted-bargain turns for the player to mark. Hidden in
            spectator mode. */}
        {!spectatorMode && onCreateMark && (
          <MarkPromptRail
            turns={markPromptTurns}
            myCharacter={myCharacter ?? null}
            currentUserId={currentUserId}
            onCreateMark={onCreateMark}
          />
        )}

        {/* Draft Box */}
        {canShowComposer && (
          <AdventureDraftComposer
            sessionId={sessionId}
            isGM={isGM}
            myCharName={myCharName}
            onCommitDraft={onCommitDraft}
            onViewChat={onViewChat}
          />
        )}

        {/* The table's bottom bar for everyone NOT holding the pen — the GM
            watching a player, and players between turns. Presence + react +
            view chat, so no one is ever left without actions. */}
        {!spectatorMode && !canShowComposer && isActive && !isCharGone && (() => {
          const isGMTurn =
            !activePlayerId || !characters.some((c) => c.userId === activePlayerId && c.status === "active");
          return (
            <div className="w-full max-w-[650px] mt-auto">
              <div className="relative rounded-2xl border border-border bg-ink/85 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="flex min-w-0 flex-1 items-center gap-2 font-serif text-[13px] italic text-text-tertiary">
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber/70 [animation:pulse_1.4s_ease-in-out_infinite]" />
                    <span className="truncate">
                      {isGMTurn ? "The Director is narrating…" : `${activePlayerName} is writing…`}
                    </span>
                  </p>

                  <div className="flex items-center gap-1.5">
                    {REACTIONS.map((r) => (
                      <motion.button
                        key={r.key}
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReactionClick(r.key)}
                        disabled={reactionCooldown}
                        title={r.label}
                        className={`flex items-center gap-1 rounded-full border border-border bg-subtle/30 px-2.5 py-1.5 transition-all cursor-pointer ${
                          reactionCooldown ? "opacity-30 cursor-not-allowed" : "hover:bg-subtle/50 hover:border-border-active"
                        }`}
                      >
                        <span className="text-sm leading-none">{r.emoji}</span>
                      </motion.button>
                    ))}
                  </div>

                  {!isGM && onRaiseHand && (
                    <button
                      type="button"
                      onClick={() => (myHandRaised ? onLowerHand?.() : onRaiseHand())}
                      title={myHandRaised ? "Lower your hand" : "Ask the Director for the spotlight"}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        myHandRaised
                          ? "border-amber/45 bg-amber/15 text-amber"
                          : "border-border bg-subtle/20 text-text-secondary hover:border-amber/30 hover:text-amber"
                      }`}
                    >
                      <span className="text-sm leading-none">✋</span>
                      {myHandRaised ? "Hand raised" : "Raise hand"}
                    </button>
                  )}

                  {onViewChat && (
                    <button
                      type="button"
                      onClick={onViewChat}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-subtle/20 px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
                      title="Table talk — out-of-character chat"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />
                      </svg>
                      View chat
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Last Words — when character has died */}
        {!isGM && isCharDead && !lastWordsSent && isActive && (
          <div className="w-full max-w-[650px] mt-auto">
            <div className="bg-ink border border-rose/20 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
              <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-2 text-[10px] uppercase font-display tracking-[0.2em] text-rose">
                Your character has fallen
              </div>

              <p className="text-xs text-text-tertiary font-serif italic mb-4">
                Write your final moment — a last breath, a whispered name, a defiant gaze. This is your character&apos;s goodbye.
              </p>

              <textarea
                className="w-full bg-transparent text-[17px] leading-[1.9] text-paper/90 outline-none font-serif resize-none min-h-[80px] placeholder:text-text-ghost"
                placeholder="Their final words, their last thought..."
                value={lastWordsContent}
                onChange={(e) => setLastWordsContent(e.target.value)}
              />

              <div className="flex items-center justify-end mt-4 pt-4 border-t border-rose/10">
                <button
                  onClick={() => {
                    if (lastWordsContent.trim()) {
                      onLastWords(lastWordsContent.trim());
                      setLastWordsSent(true);
                    }
                  }}
                  disabled={!lastWordsContent.trim()}
                  className="bg-rose/10 hover:bg-rose border border-rose/20 text-rose hover:text-paper transition-all rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Final Words
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spectator mode — after death/retirement */}
        {!isGM && isCharGone && (lastWordsSent || isCharRetired) && isActive && (
          <div className="w-full max-w-[650px] mt-8">
            <div className="text-center py-8 border border-border-subtle rounded-2xl bg-subtle/20">
              <p className="text-text-tertiary text-sm font-serif italic">
                {isCharDead
                  ? "Your character has passed. You are now a spectator."
                  : "Your character has retired from this adventure."}
              </p>
              <p className="text-text-ghost text-xs mt-2">You can still chat in the session log.</p>
            </div>
          </div>
        )}

        {/* Session ended — with compile-to-chapter option */}
        {sessionStatus === "completed" && (
          <SessionEndedBlock
            sessionId={sessionId}
            storyId={storyId}
            isGM={isGM}
            storyTurns={storyTurns}
            logTurns={logTurns}
            characters={characters}
            sessionTitle={sessionTitle}
            storyTitle={storyTitle}
            epilogue={sessionEpilogue}
            cliffhanger={sessionCliffhanger}
          />
        )}
      </div>

      {/* "↓ New turn" affordance — appears when the reader is scrolled up
          and new content arrives. Click to scroll back to the live edge. */}
      {showNewTurnHint && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to newest turn"
          className="absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-amber/35 bg-black/80 px-4 py-2 text-[11px] font-display uppercase tracking-[0.18em] text-amber shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:bg-amber/15 sm:bottom-32"
        >
          ↓ New turn
        </button>
      )}

      {/* Dice Roller — appears when GM requests a roll from this player */}
      <DiceRoller
        visible={showDiceRoller}
        onClose={onCloseDiceRoller}
        onRollSubmit={onRollSubmit}
        characters={characters}
        currentUserId={currentUserId}
        preSelectedAttribute={pendingRollRequest?.attribute ?? null}
        rollReason={pendingRollRequest?.reason ?? null}
        rollOnSuccess={pendingRollRequest?.onSuccess ?? null}
        rollOnFailure={pendingRollRequest?.onFailure ?? null}
        rollFatal={pendingRollRequest?.fatal ?? false}
      />

      {/* Places + Map overlay */}
      <AnimatePresence>
        {showMap && storyId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 z-40 flex flex-col overflow-hidden border border-amber/20 bg-ink shadow-[0_20px_60px_rgba(0,0,0,0.8)] sm:inset-x-8 sm:inset-y-8 sm:rounded-3xl"
          >
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] pointer-events-none" />
            <MapOverlay
              storyId={storyId}
              storyTurns={storyTurns}
              mapImageUrl={mapImageUrl ?? null}
              isGM={isGM}
              onClose={() => setShowMap(false)}
              onUpdateMapImage={async (url) => {
                if (onUpdateMapImage) await onUpdateMapImage(url);
              }}
              sceneBreakCount={sceneBreakCount}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
