"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FloorRound, PlayerCharacter } from "@/types/campaign";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import DirectorMoves, { RITUAL_META, type RitualFocus } from "./DirectorMoves";

/**
 * The Director's quill station — the visible, legible home of every GM move.
 * Every move is a LABELED line (never an unlabeled glyph, never hover-only);
 * the audit's root complaint stays fixed. Desktop: a parchment card pinned
 * bottom-right, moves always listed. Mobile: a wax-seal FAB opening a bottom
 * sheet with the same list.
 *
 * The station's header doubles as the ACTIVE slot: when a crossroads round
 * or roll question is open, its live controls sit here — never buried.
 */

type StationPanel = RitualFocus | "crossroads" | "ledger" | null;

const PRIMARY_MOVES: Array<{ key: RitualFocus | "crossroads"; label: string; hint: string }> = [
  { key: "roll", label: "Call a roll", hint: "the dice decide" },
  { key: "scene", label: "Scene break", hint: "cut, and move on" },
  { key: "crossroads", label: "Open a crossroads", hint: "the table writes, then votes" },
];

const MORE_MOVES: Array<{ key: RitualFocus; label: string }> = [
  { key: "story", label: "Story moment" },
  { key: "bargain", label: "Offer a bargain" },
  { key: "pressure", label: "Pressure clock" },
  { key: "illustration", label: "Illustration" },
];

export default function QuillStation({
  isDesktop,
  activeChars,
  clocks,
  onClocksChange,
  onRequestRoll,
  onPushEvent,
  onSceneBreak,
  onStoryMoment,
  onAddIllustration,
  onOfferBargain,
  floorRound,
  onOpenCrossroads,
  onUpdateFloorRound,
  ledger,
  onEndSession,
  coachSlip,
}: {
  isDesktop: boolean;
  activeChars: PlayerCharacter[];
  clocks: ProgressClockData[];
  onClocksChange?: (clocks: ProgressClockData[]) => void;
  onRequestRoll: (
    targetUserId: string,
    attribute: string,
    reason: string,
    onSuccess: string,
    onFailure: string,
    fatal?: boolean,
  ) => void;
  onPushEvent: (content: string) => void;
  onSceneBreak?: (title: string, mood: string, aspects?: string[]) => void;
  onStoryMoment?: (
    text: string,
    mood: string,
    subtext?: string,
    options?: { importance?: "normal" | "major"; leavesMark?: boolean },
  ) => void;
  onAddIllustration?: (imageUrl: string, caption?: string) => void;
  onOfferBargain?: (body: {
    targetUserId: string;
    targetLabel: string;
    gain: string;
    price: string;
  }) => Promise<void> | void;
  floorRound: FloorRound | null;
  onOpenCrossroads?: (prompt: string, audiencePulse: boolean) => Promise<unknown> | void;
  onUpdateFloorRound?: (
    roundId: string,
    body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string },
  ) => Promise<unknown> | void;
  /** PartyLedger (party status + clocks CRUD), composed by the page. */
  ledger?: ReactNode;
  onEndSession?: () => void;
  /** First-run coach slip pinned to the station. */
  coachSlip?: ReactNode;
}) {
  const [panel, setPanel] = useState<StationPanel>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [crossroadsPrompt, setCrossroadsPrompt] = useState("");
  const [crossroadsPulse, setCrossroadsPulse] = useState(true);
  const [crossroadsBusy, setCrossroadsBusy] = useState(false);

  const roundLive =
    floorRound && ["open", "voting", "closed"].includes(floorRound.status) ? floorRound : null;

  const closePanel = () => setPanel(null);

  const activeSlot = roundLive && onUpdateFloorRound && (
    <div className="rounded-md border border-lavender/30 bg-lavender/[0.07] px-3 py-2">
      <p className="table-murmur !text-[12px] text-lavender/90">
        {roundLive.status === "open"
          ? "The ink divides — the table is writing"
          : roundLive.status === "voting"
            ? "The table is voting"
            : "Choose what becomes canon (on the page)"}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        {roundLive.status === "open" && (
          <button
            type="button"
            onClick={() => void onUpdateFloorRound(roundLive.id, { status: "voting" })}
            className="table-action cursor-pointer text-lavender transition-colors hover:text-paper"
          >
            Open the vote
          </button>
        )}
        {roundLive.status === "voting" && (
          <button
            type="button"
            onClick={() => void onUpdateFloorRound(roundLive.id, { status: "closed" })}
            className="table-action cursor-pointer text-lavender transition-colors hover:text-paper"
          >
            Close the vote
          </button>
        )}
        <button
          type="button"
          onClick={() => void onUpdateFloorRound(roundLive.id, { status: "cancelled" })}
          className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-rose"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const crossroadsForm = (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 border-b border-lavender/20 pb-3">
        <div>
          <h3 className="font-display text-[18px] leading-tight text-paper">Open a crossroads</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-text-ghost">
            Pose the question. The table writes competing answers, votes, and you set one in ink.
          </p>
        </div>
        <button
          type="button"
          onClick={closePanel}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-text-ghost transition-colors hover:text-paper"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="font-reading text-[15px] leading-[1.9] text-paper/85">
        <span className="text-text-secondary">Pose it to the table — </span>
        <textarea
          value={crossroadsPrompt}
          onChange={(e) => setCrossroadsPrompt(e.target.value)}
          rows={2}
          autoFocus
          placeholder="The altar splits open. What does the party do?"
          className="ink-caret block w-full resize-none border-b border-dashed border-lavender/40 bg-transparent px-1 font-reading text-[15px] leading-[1.7] text-paper outline-none transition-colors placeholder:italic placeholder:text-text-ghost focus:border-lavender/80"
          style={{ ["--ink-self" as string]: "var(--t-lavender, #a78bfa)" }}
        />
      </div>
      <button
        type="button"
        onClick={() => setCrossroadsPulse((v) => !v)}
        aria-pressed={crossroadsPulse}
        className={`cursor-pointer font-reading text-[14px] italic transition-all ${
          crossroadsPulse
            ? "text-lavender underline decoration-2 decoration-lavender/70 underline-offset-4"
            : "text-text-tertiary hover:text-text-secondary"
        }`}
      >
        and let the dark lean in with its pulses
      </button>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={!crossroadsPrompt.trim() || crossroadsBusy}
          onClick={async () => {
            if (!onOpenCrossroads) return;
            setCrossroadsBusy(true);
            try {
              await onOpenCrossroads(crossroadsPrompt.trim(), crossroadsPulse);
              setCrossroadsPrompt("");
              closePanel();
              setSheetOpen(false);
            } finally {
              setCrossroadsBusy(false);
            }
          }}
          className="wax-seal cursor-pointer px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] disabled:cursor-not-allowed"
        >
          {crossroadsBusy ? "Dividing the ink…" : "Divide the ink"}
        </button>
        <button
          type="button"
          onClick={closePanel}
          className="hand-note cursor-pointer text-base opacity-55 hover:opacity-90"
        >
          not now
        </button>
      </div>
    </div>
  );

  const panelBody =
    panel === "crossroads" ? (
      crossroadsForm
    ) : panel === "ledger" ? (
      <div className="max-h-[60vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-[18px] text-paper">The party ledger</h3>
          <button
            type="button"
            onClick={closePanel}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border text-text-ghost transition-colors hover:text-paper"
            aria-label="Close ledger"
          >
            ✕
          </button>
        </div>
        {ledger}
      </div>
    ) : panel ? (
      <DirectorMoves
        focus={panel}
        onClose={() => {
          closePanel();
          setSheetOpen(false);
        }}
        activeChars={activeChars}
        onRequestRoll={onRequestRoll}
        onPushEvent={onPushEvent}
        onSceneBreak={onSceneBreak}
        onStoryMoment={onStoryMoment}
        onAddIllustration={onAddIllustration}
        onOfferBargain={onOfferBargain}
        clocks={clocks}
        onClocksChange={onClocksChange}
      />
    ) : null;

  const moveList = (
    <div className="space-y-2">
      {activeSlot}
      <div className="space-y-0.5">
        {PRIMARY_MOVES.map((move) => (
          <button
            key={move.key}
            type="button"
            onClick={() => setPanel(move.key)}
            disabled={move.key === "crossroads" && !!roundLive}
            className="flex w-full cursor-pointer items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-amber/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span className="font-display text-[13px] text-paper/95">{move.label}</span>
            <span className="shrink-0 text-[10.5px] italic text-text-ghost">{move.hint}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-border/60 pt-1.5">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {MORE_MOVES.map((move) => (
            <button
              key={move.key}
              type="button"
              onClick={() => setPanel(move.key)}
              className="cursor-pointer py-0.5 font-display text-[11.5px] text-text-secondary transition-colors hover:text-paper"
              title={RITUAL_META[move.key].hint}
            >
              {move.label}
            </button>
          ))}
          {ledger && (
            <button
              type="button"
              onClick={() => setPanel("ledger")}
              className="cursor-pointer py-0.5 font-display text-[11.5px] text-text-secondary transition-colors hover:text-paper"
              title="Party status, revives, invites, clocks"
            >
              Party ledger
            </button>
          )}
          {onEndSession && (
            <button
              type="button"
              onClick={onEndSession}
              className="cursor-pointer py-0.5 font-display text-[11.5px] text-text-secondary transition-colors hover:text-rose"
            >
              Close the book
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="relative w-72">
        {coachSlip}
        <AnimatePresence>
          {panelBody && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-full right-0 z-10 mb-2 w-[26rem] max-w-[calc(100vw-2rem)] rounded-xl border border-amber/20 bg-elevated/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.6)] backdrop-blur-md"
            >
              {panelBody}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="rounded-xl border border-amber/20 bg-ink/85 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.26em] text-amber/70">The Director&rsquo;s quill</p>
          {moveList}
        </div>
      </div>
    );
  }

  // Mobile: wax-seal FAB → bottom sheet with the same labeled list.
  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="wax-seal fixed bottom-5 right-4 z-30 h-12 w-12 cursor-pointer text-lg"
        aria-label="The Director's quill — your moves"
      >
        ✦
      </button>
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSheetOpen(false);
                closePanel();
              }}
              className="fixed inset-0 z-40 bg-black/60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="fixed inset-x-0 bottom-0 z-40 max-h-[82dvh] overflow-y-auto rounded-t-2xl border-t border-amber/25 bg-ink/98 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            >
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.26em] text-amber/70">The Director&rsquo;s quill</p>
              {panelBody ?? (
                <>
                  {coachSlip}
                  {moveList}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
