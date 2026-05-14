"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FloorRound, FloorRoundMode, Turn, PlayerCharacter, RollRequest, SessionRosterEntry } from "@/types/campaign";
// getPlayerColor is used by TurnRenderer
import AdventureDraftComposer from "./AdventureDraftComposer";
import FloorRoundPanel from "./FloorRoundPanel";
import IllustrationTurn from "./IllustrationTurn";
import InitiativeBar from "./InitiativeBar";
import DiceRoller from "./DiceRoller";
import SessionLobby from "./SessionLobby";
import LoreMap from "./LoreMap";
import type { MapPin } from "./LoreMap";
import SceneBreakRenderer from "./SceneBreakRenderer";
import SessionEndedBlock from "./SessionEndedBlock";
import TurnRenderer from "./TurnRenderer";
import { parseSceneBreakMetadata } from "@/lib/campaign-turns";
import { getSessionInteractionState } from "@/lib/campaign-interaction-state";
import { useTurnEditing } from "@/hooks/use-turn-editing";
import {
  groupIntoParagraphs,
  MOOD_TINT_COLORS,
  MOOD_VIGNETTE_COLORS,
} from "./ProseAssembler";

export type { MapPin };

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
  showDiceRoller: boolean;
  onCloseDiceRoller: () => void;
  onCommitDraft: (content: string, type: string) => void;
  onPassTurn: (userId: string) => void;
  onEndSession: () => void;
  onTurnExpired: () => void;
  onExtendTimer?: () => void;
  onRollComplete: (total: number, modifier: number, attribute: string) => void;
  pendingRollRequest: RollRequest | null;
  myCharacterStatus: string | null;
  onLastWords: (content: string) => void;
  onReaction?: (reactionKey: string) => void;
  onEditTurn?: (turnId: string, newContent: string) => void;
  lobbyTheme?: string;
  previousEpilogue?: string | null;
  previousMood?: string | null;
  onBeginSession?: () => void;
  mapImage?: string | null;
  mapPins?: MapPin[];
  onAddMapPin?: (pin: Omit<MapPin, "id">) => void;
  onRemoveMapPin?: (pinId: string) => void;
  logTurns?: Turn[];
  roster?: SessionRosterEntry[];
  rosterCharacters?: PlayerCharacter[];
  allCharacters?: PlayerCharacter[];
  onUpdateRoster?: (characterIds: string[]) => void;
  spectatorMode?: boolean;
  floorRound?: FloorRound | null;
  onCreateFloorRound?: (prompt: string, mode: FloorRoundMode) => Promise<void>;
  onSubmitFloorResponse?: (
    roundId: string,
    body: { characterId: string; type: string; content: string },
  ) => Promise<void>;
  onVoteFloorSubmission?: (roundId: string, submissionId: string) => Promise<void>;
  onUpdateFloorRound?: (
    roundId: string,
    body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string },
  ) => Promise<void>;
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
  storyTurns,
  characters,
  activePlayerId,
  currentUserId,
  isGM,
  myCharacter,
  sessionTitle,
  sessionStatus,
  sessionOpening,
  showDiceRoller,
  onCloseDiceRoller,
  onCommitDraft,
  onPassTurn,
  onEndSession,
  onTurnExpired,
  onExtendTimer,
  onRollComplete,
  pendingRollRequest,
  myCharacterStatus,
  onLastWords,
  onReaction,
  onEditTurn,
  lobbyTheme,
  previousEpilogue,
  previousMood,
  onBeginSession,
  mapImage,
  mapPins,
  onAddMapPin,
  onRemoveMapPin,
  logTurns = [],
  roster,
  rosterCharacters,
  allCharacters,
  onUpdateRoster,
  floorRound = null,
  onCreateFloorRound,
  onSubmitFloorResponse,
  onVoteFloorSubmission,
  onUpdateFloorRound,
}: StoryCanvasProps) {
  const TURNS_PER_BATCH = 50;
  const [visibleStartIndex, setVisibleStartIndex] = useState(() =>
    Math.max(0, storyTurns.length - TURNS_PER_BATCH)
  );
  const [showMap, setShowMap] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMyTurn = activePlayerId === currentUserId;
  const isActive = sessionStatus === "active";
  const [lastWordsContent, setLastWordsContent] = useState("");
  const [lastWordsSent, setLastWordsSent] = useState(false);
  const isDraft = sessionStatus === "draft";
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

  // Find who's currently writing for the lock screen
  const activeChar = characters.find((c) => c.userId === activePlayerId);
  const activePlayerName = activeChar
    ? `${activeChar.user?.displayName ?? "Someone"} (${activeChar.name})`
    : "another player";

  // Auto-scroll on new turns
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [storyTurns.length]);

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

  // Stable player color map
  const playerUserIds = useMemo(() => characters.filter((c) => c.status === "active").map((c) => c.userId), [characters]);

  // ── Mood & Aspects — derive from latest scene-break ──────────
  const { currentMood, currentSceneAspects } = getCurrentSceneState(storyTurns);

  const moodTint = currentMood ? MOOD_TINT_COLORS[currentMood] ?? null : null;
  const moodVignette = currentMood ? MOOD_VIGNETTE_COLORS[currentMood] ?? null : null;

  return (
    <div className="flex-1 h-full flex flex-col relative bg-void">
      {/* Map Toggle */}
      <div className="absolute top-24 right-4 z-50 flex gap-2">
        <button
          onClick={() => setShowMap(!showMap)}
          className={`border rounded-full px-4 py-1.5 text-xs transition-colors flex items-center gap-2 backdrop-blur-md cursor-pointer ${
            showMap ? "bg-amber text-black border-amber" : "bg-subtle/30 text-text-secondary border-border hover:text-paper hover:bg-subtle/50"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          {showMap ? "Close Map" : "World Map"}
        </button>
      </div>

      {/* Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber/[0.02] blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />

        {/* Mood tint overlay — shifts color based on current scene mood */}
        {moodTint && (
          <div
            className="absolute inset-0 transition-all duration-[3000ms] ease-in-out"
            style={{ backgroundColor: moodTint }}
          />
        )}

        {/* Mood vignette — darker, more dramatic moods get an edge vignette */}
        {moodVignette && (
          <div
            className="absolute inset-0 transition-all duration-[3000ms] ease-in-out"
            style={{
              boxShadow: `inset 0 0 150px 40px ${moodVignette}`,
            }}
          />
        )}
      </div>

      {/* Initiative Bar */}
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
        floorRound={floorRound}
      />

      {/* Scene Aspect Tags — floating pills below initiative bar */}
      <AnimatePresence>
        {currentSceneAspects.length > 0 && sessionStatus === "active" && (
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-16 pb-64 px-12 flex flex-col items-center z-10 relative scroll-smooth" style={{ scrollbarWidth: "none" }}>

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

        {/* Story Content */}
        <div className="w-full max-w-[650px] mb-8">
          <div className="mb-12">
            <h1 className="text-4xl font-display text-paper">{sessionTitle}</h1>
            <div className="w-24 h-[1px] bg-gradient-to-r from-amber/40 to-transparent mt-6 mb-12" />
          </div>

          {/* Opening narration */}
          {sessionOpening && (
            <div className="mb-10 text-[19px] leading-[2.1] font-serif text-paper/60 italic border-l-2 border-amber/20 pl-6">
              {sessionOpening}
            </div>
          )}

          {storyTurns.length === 0 && !sessionOpening ? (
            <div className="text-center py-20">
              <p className="text-text-ghost text-sm font-serif italic">
                {isGM ? "Set the scene with your opening narration." : "Waiting for the GM to begin..."}
              </p>
            </div>
          ) : (
            <div className="text-[19px] leading-[2.1] font-serif space-y-6 break-words">
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
                  return <SceneBreakRenderer key={group[0].id} turn={group[0]} />;
                }

                // Illustration turns render as visual breaks in the prose
                if (group[0].type === "illustration") {
                  return <IllustrationTurn key={group[0].id} turn={group[0]} />;
                }

                const groupHasEditable = editableTurn && group.some((t) => t.id === editableTurn.id);

                return (
                  <div key={group[0].id}>
                    <p className="relative group/para">
                      {group.map((turn, ti) => (
                        <TurnRenderer key={turn.id} turn={turn} idx={ti} group={group} globalIdx={globalIdx + ti} playerUserIds={playerUserIds} />
                      ))}
                      {pi === paragraphs.length - 1 && !groupHasEditable && (
                        <span className="inline-block w-1.5 h-5 bg-amber/40 ml-1 animate-pulse align-middle" />
                      )}
                      {groupHasEditable && editingTurnId !== editableTurn.id && (
                        <button
                          onClick={() => handleEditClick(editableTurn)}
                          className="inline-flex items-center gap-1 ml-2 align-middle opacity-0 group-hover/para:opacity-100 transition-opacity cursor-pointer"
                          title="Edit (30s window)"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                          <span className="text-[9px] text-amber/30 uppercase tracking-wider">edit</span>
                        </button>
                      )}
                    </p>
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

        <FloorRoundPanel
          floorRound={floorRound}
          isGM={isGM}
          myCharacter={myCharacter ?? null}
          isActive={isActive}
          onCreateRound={onCreateFloorRound ?? (async () => {})}
          onSubmitResponse={onSubmitFloorResponse ?? (async () => {})}
          onVoteSubmission={onVoteFloorSubmission ?? (async () => {})}
          onUpdateRound={onUpdateFloorRound ?? (async () => {})}
        />

        {/* Draft Box */}
        {canWrite && (
          <AdventureDraftComposer
            sessionId={sessionId}
            isGM={isGM}
            myCharName={myCharName}
            onCommitDraft={onCommitDraft}
          />
        )}

        {/* Waiting state — replaces draft box when player is locked out */}
        {!isGM && activePlayerId && !isMyTurn && isActive && !isCharGone && (() => {
          const isGMTurn = !characters.some((c) => c.userId === activePlayerId && c.status === "active");
          return (
            <div className="w-full max-w-[650px] mt-auto">
              <div className="bg-ink border border-border rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
                <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-2 text-[10px] uppercase font-display tracking-[0.2em] text-text-tertiary">
                  {isGMTurn ? "GM Narrating" : "Waiting"}
                </div>

                <div className="flex items-center justify-center gap-3 py-4">
                  {isGMTurn ? (
                    <div className="flex items-center gap-3 text-amber/50">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                      <p className="font-serif italic text-sm">The GM is setting the scene...</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-text-tertiary">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                      <p className="font-serif italic text-sm">Waiting for {activePlayerName} to write...</p>
                    </div>
                  )}
                </div>

                {/* Reaction buttons */}
                <div className="flex items-center justify-center gap-2 pt-3 border-t border-border-subtle">
                  {REACTIONS.map((r) => (
                    <motion.button
                      key={r.key}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReactionClick(r.key)}
                      disabled={reactionCooldown}
                      className={`flex items-center gap-1.5 bg-subtle/30 border border-border rounded-full px-3 py-1.5 transition-all cursor-pointer ${
                        reactionCooldown
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-subtle/50 hover:border-border-active"
                      }`}
                    >
                      <span className="text-sm leading-none">{r.emoji}</span>
                      <span className="text-[10px] uppercase tracking-wider text-text-tertiary leading-none">{r.label}</span>
                    </motion.button>
                  ))}
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
          />
        )}
      </div>

      {/* Dice Roller — appears when GM requests a roll from this player */}
      <DiceRoller
        visible={showDiceRoller}
        onClose={onCloseDiceRoller}
        onRollComplete={(total, modifier, attribute) => {
          onRollComplete(total, modifier, attribute);
          onCloseDiceRoller();
        }}
        characters={characters}
        currentUserId={currentUserId}
        preSelectedAttribute={pendingRollRequest?.attribute ?? null}
        rollReason={pendingRollRequest?.reason ?? null}
        rollOnSuccess={pendingRollRequest?.onSuccess ?? null}
        rollOnFailure={pendingRollRequest?.onFailure ?? null}
        rollFatal={pendingRollRequest?.fatal ?? false}
      />

      {/* Map Overlay */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-x-8 inset-y-8 z-40 bg-ink rounded-3xl border border-amber/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] pointer-events-none" />
            <LoreMap
              mapImage={mapImage ?? null}
              pins={mapPins ?? []}
              isGM={isGM}
              onAddPin={onAddMapPin ?? (() => {})}
              onRemovePin={onRemoveMapPin}
              onClose={() => setShowMap(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
