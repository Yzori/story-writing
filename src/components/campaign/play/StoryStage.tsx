"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FloorRound, Turn, PlayerCharacter, RollRequest, SessionRosterEntry } from "@/types/campaign";
import FloorRoundPanel from "@/components/campaign/FloorRoundPanel";
import IllustrationTurn from "@/components/campaign/IllustrationTurn";
import DiceRoller from "@/components/campaign/DiceRoller";
import SessionLobby from "@/components/campaign/SessionLobby";
import MapOverlay from "@/components/campaign/MapOverlay";
import SceneBreakRenderer from "@/components/campaign/SceneBreakRenderer";
import StoryMomentRenderer from "@/components/campaign/StoryMomentRenderer";
import SessionEndedBlock from "@/components/campaign/SessionEndedBlock";
import TurnRenderer from "@/components/campaign/TurnRenderer";
import MarkPromptRail from "@/components/campaign/MarkPromptRail";
import PreviouslyOn from "@/components/campaign/PreviouslyOn";
import { isLegacyCinematicSceneBreak, parseSceneBreakMetadata } from "@/lib/campaign-turns";
import { useTurnEditing } from "@/hooks/use-turn-editing";
import {
  groupIntoParagraphs,
  MOOD_TINT_COLORS,
  MOOD_VIGNETTE_COLORS,
} from "@/components/campaign/ProseAssembler";

/**
 * The story stage — StoryCanvas reborn as PURE STAGE. It renders the page
 * (prose, lobby, ended block, floor round, map, dice) and nothing else: no
 * composer, no waiting bar, no turn rail — those live in the shell's ActionDock
 * and Table rail now. z-scale: backdrop 0 · content 10 · floaters 20.
 */

export const REACTION_EMOJI_MAP: Record<string, string> = {
  tension: "⚔️",
  gasp: "😮",
  bravo: "👏",
  laugh: "😂",
  dread: "💀",
};

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

function getCurrentMood(storyTurns: Turn[]): string | null {
  for (let i = storyTurns.length - 1; i >= 0; i--) {
    const turn = storyTurns[i];
    if (turn?.type === "scene-break" && turn.metadata) {
      const meta = parseSceneBreakMetadata(turn.metadata);
      if (!meta) continue;
      if (meta.cinematic) continue;
      return meta.mood ?? null;
    }
  }
  return null;
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
      className="absolute top-2 pointer-events-none z-20 text-3xl select-none"
      style={{ left: `${x}%` }}
    >
      {emoji}
    </motion.div>
  );
}

interface StoryStageProps {
  sessionId: string;
  storyId?: string;
  storyTurns: Turn[];
  /** Log turns (rolls/ooc) — merged into MarkPromptRail's stream so roll
   *  moments can be marked. */
  logTurns?: Turn[];
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
  /** Whether the current player may still spend their aspect this scene. */
  aspectAvailable?: boolean;
  onResolveBargain?: (turnId: string, response: "accepted" | "refused") => void | Promise<void>;
  onRollSubmit: (intent: { attribute: string; aspectInvoked: boolean }) => Promise<{
    dice: [number, number];
    modifier: number;
    total: number;
    tier: "success" | "partial" | "failure";
  }>;
  pendingRollRequest: RollRequest | null;
  /** Every reaction to float over the stage — the table's incoming ones plus
   *  the current user's own clicks (the dock pipes them here). Each id floats
   *  exactly once. */
  reactionFloats?: Array<{ id: string; type: string }>;
  onEditTurn?: (turnId: string, newContent: string) => void;
  lobbyTheme?: string;
  previousEpilogue?: string | null;
  previousMood?: string | null;
  onBeginSession?: () => void;
  /** Campaign map background URL (story.mapImageUrl). */
  mapImageUrl?: string | null;
  onUpdateMapImage?: (url: string | null) => Promise<void> | void;
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
  onUpdateFloorRound?: (
    roundId: string,
    body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string },
  ) => Promise<void>;
  onCreateMark?: (
    characterId: string,
    input: { kind: import("@/types/campaign").CharacterMarkKind; text: string; sourceTurnId?: string },
  ) => Promise<unknown>;
}

export default function StoryStage({
  sessionId,
  storyId,
  storyTurns: allStoryTurns,
  logTurns = [],
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
  aspectAvailable = true,
  onResolveBargain,
  onRollSubmit,
  pendingRollRequest,
  reactionFloats,
  onEditTurn,
  lobbyTheme,
  previousEpilogue,
  previousMood,
  onBeginSession,
  mapImageUrl,
  onUpdateMapImage,
  roster,
  rosterCharacters,
  allCharacters,
  onUpdateRoster,
  spectatorMode = false,
  floorRound = null,
  onSubmitFloorResponse,
  onVoteFloorSubmission,
  onUpdateFloorRound,
  onCreateMark,
}: StoryStageProps) {
  // Drop the activation-inserted opening turn whenever the dedicated
  // opening block renders sessionOpening, so the text appears once.
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
  // Lobby is a one-time threshold ritual. Suppress it if the session already
  // has turns — applies to sessions that started before the lobby existed,
  // or any future case where status drifts back to "draft" with play history.
  const isDraft = sessionStatus === "draft" && storyTurns.length === 0;

  // ── Reaction floats — every id floats exactly once ────────
  const [floatingReactions, setFloatingReactions] = useState<Array<{
    id: string;
    emoji: string;
    x: number;
  }>>([]);
  const floatedReactionIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!reactionFloats?.length) return;
    const fresh = reactionFloats.filter((r) => !floatedReactionIdsRef.current.has(r.id));
    if (fresh.length === 0) return;
    setFloatingReactions((prev) => [
      ...prev,
      ...fresh.map((r) => {
        floatedReactionIdsRef.current.add(r.id);
        return {
          id: `float-${r.id}`,
          emoji: REACTION_EMOJI_MAP[r.type] ?? "✨",
          x: 30 + Math.random() * 40,
        };
      }),
    ]);
  }, [reactionFloats]);

  const removeFloatingReaction = useCallback((id: string) => {
    setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

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

  // ── Mood — derive from latest scene-break ──────────────────
  const currentMood = getCurrentMood(storyTurns);
  const moodTint = currentMood ? MOOD_TINT_COLORS[currentMood] ?? null : null;
  const moodVignette = currentMood ? MOOD_VIGNETTE_COLORS[currentMood] ?? null : null;

  // Count scene-break turns. The MapOverlay refreshes its places list
  // whenever this changes, so server-auto-created places appear without
  // manual refresh.
  const sceneBreakCount = useMemo(
    () => storyTurns.filter((t) => t.type === "scene-break").length,
    [storyTurns],
  );

  return (
    <div className="relative flex h-full flex-1 flex-col bg-void">
      {/* Places / Map toggle — always reachable (the old chrome gate kept it
          off the play page entirely; the stage owns it now). */}
      {!showMap && storyId && (
        <div className="absolute right-3 top-3 z-20">
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

      {/* Story Canvas */}
      <div ref={scrollRef} className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto scroll-smooth px-4 pb-10 pt-8 [scrollbar-color:rgba(224,169,62,0.22)_transparent] [scrollbar-width:thin] sm:px-8 sm:pt-12 lg:px-12">

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
              {paragraphs.map((group, pi) => {
                // Scene-break turns render as ornamental dividers
                if (group[0].type === "scene-break") {
                  if (isLegacyCinematicSceneBreak(group[0].type, group[0].metadata)) {
                    return (
                      <StoryMomentRenderer
                        key={group[0].id}
                        turn={group[0]}
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
              })}
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
          className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-amber/35 bg-black/80 px-4 py-2 text-[11px] font-display uppercase tracking-[0.18em] text-amber shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:bg-amber/15"
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
        aspectAvailable={aspectAvailable}
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
