"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PlayerCharacter, SessionRosterEntry, Turn } from "@/types/campaign";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import SessionLobby from "@/components/campaign/SessionLobby";
import SessionEndedBlock from "@/components/campaign/SessionEndedBlock";
import PreviouslyOn from "@/components/campaign/PreviouslyOn";
import MapOverlay from "@/components/campaign/MapOverlay";
import PageProse from "./PageProse";
import MarginRail from "./MarginRail";
import InlineNoteFold from "./InlineNoteFold";
import type { MarginActions } from "./annotations/AnnotationBody";
import { deriveAnnotations, groupAnnotationsByAnchor } from "@/lib/manuscript-annotations";
import { parseSceneBreakMetadata } from "@/lib/campaign-turns";
import { useTurnEditing } from "@/hooks/use-turn-editing";
import {
  groupIntoParagraphs,
  MOOD_TINT_COLORS,
  MOOD_VIGNETTE_COLORS,
} from "@/components/campaign/ProseAssembler";

/**
 * The page — one scrolling manuscript sheet centered on the table. Ports
 * StoryStage's stream machinery (pagination, scroll stickiness, mood washes,
 * opening-turn dedupe) onto the manuscript's geometry: a parchment leaf whose
 * text column is flanked by a right margin gutter (part of the sheet — the
 * margin rail writes its notes there on lg+).
 *
 * The end of the page belongs to the caller: `endOfPage` receives the
 * InlineQuill / WaitingLine / PageFork switch. Structural leaves (lobby,
 * PreviouslyOn, ended block) render in the page flow.
 */

// Session activation inserts the opening narration as a turn with
// metadata {"opening": true}; the dedicated opening block below renders
// sessionOpening, so that turn must be dropped or the text appears twice.
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

const TURNS_PER_BATCH = 50;
const STICK_THRESHOLD_PX = 120;

export interface ManuscriptPageProps {
  sessionId: string;
  storyId?: string;
  storyTurns: Turn[];
  logTurns?: Turn[];
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  currentUserId: string | null;
  isGM: boolean;
  sessionTitle: string;
  sessionStatus: string;
  sessionOpening: string | null;
  storyTitle?: string;
  sessionEpilogue?: string | null;
  sessionCliffhanger?: string | null;
  onResolveBargain?: (turnId: string, response: "accepted" | "refused") => void | Promise<void>;
  onEditTurn?: (turnId: string, newContent: string) => void;
  lobbyTheme?: string;
  previousEpilogue?: string | null;
  previousMood?: string | null;
  onBeginSession?: () => void;
  mapImageUrl?: string | null;
  onUpdateMapImage?: (url: string | null) => Promise<void> | void;
  roster?: SessionRosterEntry[];
  rosterCharacters?: PlayerCharacter[];
  allCharacters?: PlayerCharacter[];
  onUpdateRoster?: (characterIds: string[]) => void;
  spectatorMode?: boolean;
  /** The living end of the page: InlineQuill / WaitingLine / PageFork. */
  endOfPage?: ReactNode;
  /**
   * The margin: one annotation stream (roll questions, stamps, clocks, marks,
   * bargains, the edit pencil) rendered as a gutter rail on desktop and as
   * folded slips under their anchor paragraphs on mobile.
   */
  margin?: {
    /** JS-gated at page level; picks rail vs folds (never both mounted). */
    isDesktop: boolean;
    clocks: ProgressClockData[];
    myCharacter: PlayerCharacter | null;
    actions: Omit<MarginActions, "isGM" | "onEditClick" | "onDismissMarkPrompt">;
  };
}

export default function ManuscriptPage({
  sessionId,
  storyId,
  storyTurns: allStoryTurns,
  logTurns = [],
  characters,
  activePlayerId,
  currentUserId,
  isGM,
  sessionTitle,
  sessionStatus,
  sessionOpening,
  storyTitle,
  sessionEpilogue = null,
  sessionCliffhanger = null,
  onResolveBargain,
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
  endOfPage,
  margin,
}: ManuscriptPageProps) {
  const storyTurns = useMemo(
    () => (sessionOpening ? allStoryTurns.filter((turn) => !isOpeningTurn(turn)) : allStoryTurns),
    [allStoryTurns, sessionOpening],
  );

  const [visibleStartIndex, setVisibleStartIndex] = useState(() =>
    Math.max(0, storyTurns.length - TURNS_PER_BATCH),
  );
  const [showMap, setShowMap] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isActive = sessionStatus === "active";
  const isMyTurn = activePlayerId === currentUserId;
  // Turn-as-environment: candlelight washes the page head while the Director
  // narrates; the page eases back a touch when the pen is in your hand.
  const directorNarrating =
    isActive &&
    (!activePlayerId || !characters.some((c) => c.userId === activePlayerId && c.status === "active"));
  const myTurnFocus = isActive && isMyTurn && !isGM;
  const isDraft = sessionStatus === "draft" && storyTurns.length === 0;

  const editingState = useTurnEditing({
    storyTurns,
    currentUserId,
    activePlayerId,
    onEditTurn,
  });

  // ── Scroll stickiness: follow the live edge only when already there ──
  const [showNewInkHint, setShowNewInkHint] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    let timeoutId: ReturnType<typeof setTimeout>;
    if (distanceFromBottom <= STICK_THRESHOLD_PX) {
      el.scrollTop = el.scrollHeight;
      timeoutId = setTimeout(() => setShowNewInkHint(false), 0);
    } else {
      timeoutId = setTimeout(() => setShowNewInkHint(true), 0);
    }
    return () => clearTimeout(timeoutId);
  }, [storyTurns.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom <= STICK_THRESHOLD_PX) setShowNewInkHint(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowNewInkHint(false);
  }, []);

  // Reset the window when turns are cleared (e.g. a fresh session).
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
    requestAnimationFrame(() => {
      const newScrollHeight = scrollEl.scrollHeight;
      scrollEl.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
    });
  }, []);

  const visibleTurns = useMemo(
    () => storyTurns.slice(visibleStartIndex),
    [storyTurns, visibleStartIndex],
  );
  const paragraphs = useMemo(() => groupIntoParagraphs(visibleTurns), [visibleTurns]);
  const playerUserIds = useMemo(
    () => characters.filter((c) => c.status === "active").map((c) => c.userId),
    [characters],
  );

  const currentMood = getCurrentMood(storyTurns);
  const moodTint = currentMood ? MOOD_TINT_COLORS[currentMood] ?? null : null;
  const moodVignette = currentMood ? MOOD_VIGNETTE_COLORS[currentMood] ?? null : null;

  const sceneBreakCount = useMemo(
    () => storyTurns.filter((t) => t.type === "scene-break").length,
    [storyTurns],
  );

  // ── The margin: one derived annotation stream ──────────────
  const [dismissedMarkTurnIds, setDismissedMarkTurnIds] = useState<Set<string>>(new Set());
  const dismissMarkPrompt = useCallback((turnId: string) => {
    setDismissedMarkTurnIds((prev) => new Set(prev).add(turnId));
  }, []);

  const annotations = useMemo(
    () =>
      margin
        ? deriveAnnotations({
            storyTurns: visibleTurns,
            logTurns,
            clocks: margin.clocks,
            characters,
            myCharacter: margin.myCharacter,
            currentUserId,
            dismissedMarkTurnIds,
            editableTurn: editingState.editableTurn,
          })
        : [],
    [margin, visibleTurns, logTurns, characters, currentUserId, dismissedMarkTurnIds, editingState.editableTurn],
  );

  const marginActions = useMemo<MarginActions | null>(
    () =>
      margin
        ? {
            ...margin.actions,
            isGM,
            onEditClick: editingState.handleEditClick,
            onDismissMarkPrompt: dismissMarkPrompt,
          }
        : null,
    [margin, isGM, editingState.handleEditClick, dismissMarkPrompt],
  );

  const foldGroups = useMemo(
    () => (margin && !margin.isDesktop ? groupAnnotationsByAnchor(annotations) : null),
    [margin, annotations],
  );

  const renderAfterParagraph = useMemo(() => {
    if (!foldGroups || !marginActions) return undefined;
    const render = (anchorTurnId: string) => {
      const group = foldGroups.get(anchorTurnId);
      if (!group?.length) return null;
      return <InlineNoteFold annotations={group} actions={marginActions} />;
    };
    return render;
  }, [foldGroups, marginActions]);

  return (
    <div className="relative h-full">
      {/* Places — a hand-note tucked at the page's top corner. */}
      {!showMap && storyId && (
        <button
          onClick={() => setShowMap(true)}
          className="table-action absolute right-4 top-2 z-20 flex min-h-9 cursor-pointer items-center gap-1.5 text-amber/70 transition-colors hover:text-amber lg:right-[220px] xl:right-[280px]"
          aria-label="Places and map"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          Places
        </button>
      )}

      {/* The scroll stage — the page slides under the table's fixed furniture. */}
      <div
        ref={scrollRef}
        className="relative z-10 flex h-full flex-col items-center overflow-y-auto scroll-smooth px-0 pb-10 pt-8 [scrollbar-color:rgba(224,169,62,0.22)_transparent] [scrollbar-width:thin] sm:px-6 sm:pt-10"
      >
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

        {storyId && <PreviouslyOn storyId={storyId} sessionId={sessionId} />}

        {/* The sheet — text column + margin gutter on one parchment leaf. */}
        {!isDraft && (
          <motion.div
            initial={{ opacity: 0, scale: 0.985, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className={`manuscript-sheet relative mb-10 w-full max-w-[920px] rounded-sm px-5 py-10 transition-opacity duration-700 sm:px-10 sm:py-14 lg:pr-[200px] xl:pr-[260px] ${
              myTurnFocus ? "opacity-90" : "opacity-100"
            }`}
          >
            {/* Mood washes the page, not the room. */}
            {moodTint && (
              <div
                className="adventure-mood-tint pointer-events-none absolute inset-0 rounded-sm transition-all duration-[3000ms] ease-in-out"
                style={{ backgroundColor: moodTint }}
              />
            )}
            {moodVignette && (
              <div
                className="adventure-mood-vignette pointer-events-none absolute inset-0 rounded-sm transition-all duration-[3000ms] ease-in-out"
                style={{ boxShadow: `inset 0 0 150px 40px ${moodVignette}` }}
              />
            )}
            {/* Candlelight pools at the head while the Director writes. */}
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-32 rounded-t-sm bg-gradient-to-b from-amber/[0.10] to-transparent transition-opacity duration-700 ${
                directorNarrating ? "opacity-100" : "opacity-0"
              }`}
            />

            <div className="mb-8 text-center sm:mb-12">
              <h1 className="font-display text-2xl text-paper sm:text-4xl">{sessionTitle}</h1>
              <div className="mx-auto mt-4 mb-8 h-[1px] w-20 bg-gradient-to-r from-transparent via-amber/40 to-transparent sm:mt-6 sm:mb-12 sm:w-24" />
            </div>

            {sessionOpening && (
              <div className="mb-8 border-l-2 border-amber/20 pl-4 font-reading text-[16px] italic leading-[1.8] text-paper/60 sm:mb-10 sm:pl-6 sm:text-[19px] sm:leading-[2.1]">
                {sessionOpening}
              </div>
            )}

            {storyTurns.length === 0 && !sessionOpening ? (
              <div className="py-20 text-center">
                <p className="table-murmur">
                  {isGM ? "The page is blank. Set the scene." : "The Director is dipping the quill…"}
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
                {hasEarlierTurns && (
                  <div className="!mb-8 flex justify-center">
                    <button
                      onClick={handleLoadEarlier}
                      className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-amber"
                    >
                      ↑ Turn back the pages <span className="normal-case tracking-normal text-text-ghost">({visibleStartIndex} more)</span>
                    </button>
                  </div>
                )}
                {/* Head-pinned notes (no scene yet) fold above the prose on mobile. */}
                {foldGroups && marginActions && foldGroups.get(null)?.length ? (
                  <InlineNoteFold annotations={foldGroups.get(null)!} actions={marginActions} />
                ) : null}
                <PageProse
                  paragraphs={paragraphs}
                  playerUserIds={playerUserIds}
                  currentUserId={currentUserId}
                  isGM={isGM}
                  onResolveBargain={onResolveBargain}
                  marginActive={!!margin}
                  editing={spectatorMode ? undefined : editingState}
                  showInkCaret={isActive}
                  renderAfterParagraph={renderAfterParagraph}
                />
              </div>
            )}

            {/* The living end of the page — quill, waiting line, or fork. */}
            {endOfPage && <div className="relative mt-6">{endOfPage}</div>}

            {/* The margin — notes written beside the passages (lg+). */}
            {margin?.isDesktop && marginActions && (
              <div className="pointer-events-none absolute bottom-0 right-0 top-0 hidden w-[200px] lg:block xl:w-[260px]">
                <MarginRail annotations={annotations} actions={marginActions} />
              </div>
            )}
          </motion.div>
        )}

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

      {/* New ink arrived below the fold. */}
      {showNewInkHint && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to the newest ink"
          className="table-action absolute bottom-6 left-1/2 z-20 -translate-x-1/2 cursor-pointer rounded-full border border-amber/35 bg-black/80 px-4 py-2 text-amber shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:bg-amber/15"
        >
          ↓ New ink
        </button>
      )}

      {/* Places + Map overlay. */}
      <AnimatePresence>
        {showMap && storyId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 z-40 flex flex-col overflow-hidden border border-amber/20 bg-ink shadow-[0_20px_60px_rgba(0,0,0,0.8)] sm:inset-x-8 sm:inset-y-8 sm:rounded-3xl"
          >
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]" />
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
