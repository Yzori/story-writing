"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FloorRound, PlayerCharacter, RollRequest } from "@/types/campaign";
import { getSessionInteractionState } from "@/lib/campaign-interaction-state";
import DockComposer from "./DockComposer";
import WaitingBar from "./WaitingBar";
import LastWordsForm from "./LastWordsForm";

interface ActionDockProps {
  sessionId: string;
  sessionStatus: string;
  activePlayerId: string | null;
  currentUserId: string | null;
  isGM: boolean;
  myCharacter: PlayerCharacter | null;
  characters: PlayerCharacter[];
  floorRound: FloorRound | null;
  pendingRollRequest: RollRequest | null;
  onCommitDraft: (content: string, type: string, metadata?: string) => void | Promise<void>;
  onViewChat?: () => void;
  onReaction?: (reactionKey: string) => void;
  myHandRaised?: boolean;
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  onLastWords: (content: string) => void;
  onOpenDiceRoller: () => void;
  /** GM Crossroads shortcuts (the panel in the canvas holds the full flow). */
  onUpdateFloorRound?: (
    roundId: string,
    body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string },
  ) => Promise<void>;
  /** GM: who holds the pen right now (for the reclaim strip). */
  penHolderName?: string | null;
  onReclaimPen?: () => void;
  /** The Director's stage-move row (DirectRow) — GM only. */
  directSlot?: ReactNode;
}

/**
 * The action dock — ONE in-flow surface that morphs with the interaction
 * state machine. Every state of play resolves to exactly one dock body, so
 * a player always knows what they can do by glancing at the bottom of the
 * table. This is the single place that encodes the state → body mapping.
 */
export default function ActionDock({
  sessionId,
  sessionStatus,
  activePlayerId,
  currentUserId,
  isGM,
  myCharacter,
  characters,
  floorRound,
  pendingRollRequest,
  onCommitDraft,
  onViewChat,
  onReaction,
  myHandRaised = false,
  onRaiseHand,
  onLowerHand,
  onLastWords,
  onOpenDiceRoller,
  onUpdateFloorRound,
  penHolderName = null,
  onReclaimPen,
  directSlot,
}: ActionDockProps) {
  const interaction = getSessionInteractionState({
    sessionStatus,
    activePlayerId,
    currentUserId,
    isGM,
    myCharacterStatus: myCharacter?.status ?? null,
    floorRound,
  });

  // Last-words is a one-shot: sent → spectator notice, reset on revive.
  const [lastWordsSent, setLastWordsSent] = useState(false);
  const isCharGone = myCharacter?.status === "dead" || myCharacter?.status === "retired";
  useEffect(() => {
    if (!isCharGone) {
      const timeoutId = setTimeout(() => setLastWordsSent(false), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isCharGone]);

  // First-run coaching for players: the turn protocol (you write when handed
  // the pen; otherwise react or raise your hand) is enforced but never taught.
  const [playerCoachSeen, setPlayerCoachSeen] = useState(true);
  useEffect(() => {
    // Deferred to dodge a first-paint flash; default true so SSR never shows it.
    const timeoutId = setTimeout(() => {
      try {
        setPlayerCoachSeen(localStorage.getItem("quiloria.player.coachSeen") === "1");
      } catch {
        /* storage blocked — skip the coach */
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);
  const dismissPlayerCoach = useCallback(() => {
    setPlayerCoachSeen(true);
    try {
      localStorage.setItem("quiloria.player.coachSeen", "1");
    } catch {
      /* ignore */
    }
  }, []);

  if (sessionStatus !== "active") return null;

  const myCharName = myCharacter?.name ?? null;
  const activeChar = characters.find((c) => c.userId === activePlayerId);
  const activePlayerName = activeChar
    ? `${activeChar.user?.displayName ?? "Someone"} (${activeChar.name})`
    : "another player";
  const isGMTurn =
    !activePlayerId || !characters.some((c) => c.userId === activePlayerId && c.status === "active");

  // ── Resolve the dock body — one state, one surface ────────
  let body: ReactNode;

  if (interaction.mode === "last_words") {
    body = lastWordsSent ? (
      <GoneNotice dead onViewChat={onViewChat} />
    ) : (
      <LastWordsForm onLastWords={onLastWords} onSent={() => setLastWordsSent(true)} />
    );
  } else if (!isGM && myCharacter?.status === "retired") {
    body = <GoneNotice dead={false} onViewChat={onViewChat} />;
  } else if (pendingRollRequest && !isGM) {
    // The dice are calling — everything else waits.
    body = (
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex min-w-0 flex-1 items-center gap-2.5 text-[13px] text-text">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber/45 bg-amber/10 text-[14px] text-amber [animation:pulse_1.6s_ease-in-out_infinite]">
            ⚀
          </span>
          <span className="min-w-0">
            <span className="block truncate">
              The Director calls for a{" "}
              <strong className="text-amber">{pendingRollRequest.attribute || "fate"}</strong> check
              {pendingRollRequest.fatal && (
                <strong className="ml-1.5 text-rose">— fatal stakes</strong>
              )}
            </span>
            {pendingRollRequest.reason && (
              <span className="block truncate font-serif text-[11.5px] italic text-text-tertiary">
                {pendingRollRequest.reason}
              </span>
            )}
          </span>
        </p>
        <button
          type="button"
          onClick={onOpenDiceRoller}
          className="shrink-0 rounded-full bg-amber px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-void shadow-[0_8px_24px_-10px_rgba(216,178,90,0.7)] transition-colors hover:bg-amber/90"
        >
          Cast the bones
        </button>
      </div>
    );
  } else if (
    interaction.mode === "crossroads_collecting" ||
    interaction.mode === "crossroads_voting" ||
    interaction.mode === "crossroads_closed"
  ) {
    const playerText =
      interaction.mode === "crossroads_collecting"
        ? "Crossroads open — add your response on the page above."
        : interaction.mode === "crossroads_voting"
          ? "Table vote — choose the response that becomes canon."
          : "The Director is choosing canon…";
    const gmText =
      interaction.mode === "crossroads_collecting"
        ? "Crossroads open — the table is writing responses."
        : interaction.mode === "crossroads_voting"
          ? "The table is voting."
          : "Close it out — canonize a response on the page.";
    body = (
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex min-w-0 flex-1 items-center gap-2 font-serif text-[13px] italic text-text-tertiary">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-lavender [animation:pulse_1.4s_ease-in-out_infinite]" />
          <span className="truncate">{isGM ? gmText : playerText}</span>
        </p>
        {isGM && floorRound && onUpdateFloorRound && (
          <div className="flex shrink-0 items-center gap-2">
            {floorRound.status === "open" && (
              <button
                type="button"
                onClick={() => void onUpdateFloorRound(floorRound.id, { status: "voting" })}
                className="rounded-full border border-lavender/40 bg-lavender/15 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-lavender transition-colors hover:bg-lavender/25"
              >
                Open voting
              </button>
            )}
            {floorRound.status === "voting" && (
              <button
                type="button"
                onClick={() => void onUpdateFloorRound(floorRound.id, { status: "closed" })}
                className="rounded-full border border-lavender/40 bg-lavender/15 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-lavender transition-colors hover:bg-lavender/25"
              >
                Close the vote
              </button>
            )}
            <button
              type="button"
              onClick={() => void onUpdateFloorRound(floorRound.id, { status: "cancelled" })}
              className="rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-text-tertiary transition-colors hover:text-rose"
            >
              Cancel
            </button>
          </div>
        )}
        {!isGM && (
          <WaitingBar statusText="" onReaction={onReaction} onViewChat={undefined} />
        )}
      </div>
    );
  } else if (isGM) {
    // The Director's dock: stage moves + the composer, always on.
    body = (
      <div className="space-y-3">
        {penHolderName && !isGMTurn && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber/20 bg-amber/[0.05] px-3.5 py-2">
            <p className="flex min-w-0 items-center gap-2 font-serif text-[12.5px] italic text-text-tertiary">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber/70 [animation:pulse_1.4s_ease-in-out_infinite]" />
              <span className="truncate">
                <strong className="not-italic text-amber">{penHolderName}</strong> holds the pen — the ring in the rail is their time.
              </span>
            </p>
            {onReclaimPen && (
              <button
                type="button"
                onClick={onReclaimPen}
                className="shrink-0 rounded-full border border-amber/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber/80 transition-colors hover:bg-amber/10 hover:text-amber"
              >
                Reclaim the pen
              </button>
            )}
          </div>
        )}
        {directSlot}
        <DockComposer
          sessionId={sessionId}
          isGM
          myCharName={myCharName}
          onCommitDraft={onCommitDraft}
          onViewChat={onViewChat}
        />
      </div>
    );
  } else if (interaction.mode === "your_turn") {
    body = (
      <DockComposer
        sessionId={sessionId}
        isGM={false}
        myCharName={myCharName}
        onCommitDraft={onCommitDraft}
        onViewChat={onViewChat}
      />
    );
  } else {
    // Waiting: another player's turn, or the Director is narrating.
    body = (
      <WaitingBar
        statusText={isGMTurn ? "The Director is narrating…" : `${activePlayerName} is writing…`}
        onReaction={onReaction}
        showHandRaise
        myHandRaised={myHandRaised}
        onRaiseHand={onRaiseHand}
        onLowerHand={onLowerHand}
        onViewChat={onViewChat}
      />
    );
  }

  const showCoach =
    !isGM &&
    !!currentUserId &&
    !!myCharacter &&
    !playerCoachSeen &&
    interaction.mode !== "last_words";

  return (
    <div className="relative border-t border-border bg-void/92 backdrop-blur-xl">
      {/* First-run player coaching — anchored to the dock it teaches */}
      <AnimatePresence>
        {showCoach && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-none absolute inset-x-0 bottom-full z-30 flex justify-center px-3 pb-3"
          >
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber/35 bg-gradient-to-b from-amber/[0.10] to-ink/95 p-4 shadow-[0_18px_50px_-28px_rgba(216,178,90,0.7)] backdrop-blur-md">
              <p className="text-[13px] font-semibold text-amber">You&rsquo;re at the table.</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
                You&rsquo;ll write when the Director hands you the pen. Until then, react to the
                story or <strong className="text-paper">raise your hand</strong> to ask for the
                spotlight. When a roll is called, your <strong className="text-paper">aspect</strong>{" "}
                can save a miss — once per scene.
              </p>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={dismissPlayerCoach}
                  className="rounded-full bg-amber px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-void transition-colors hover:bg-amber/90"
                >
                  Got it
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-3.5">{body}</div>
    </div>
  );
}

function GoneNotice({ dead, onViewChat }: { dead: boolean; onViewChat?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-subtle/20 px-4 py-3">
      <p className="font-serif text-[13px] italic text-text-tertiary">
        {dead
          ? "Your character has passed. You are now a spectator — the story remembers."
          : "Your character has retired from this adventure."}
      </p>
      {onViewChat && (
        <button
          type="button"
          onClick={onViewChat}
          className="shrink-0 rounded-full border border-border bg-subtle/20 px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
        >
          View chat
        </button>
      )}
    </div>
  );
}
