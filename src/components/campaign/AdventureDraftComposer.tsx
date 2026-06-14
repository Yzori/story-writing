"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { commitAdventureDraft, useAdventureDraft } from "@/hooks/use-adventure-draft";
import { useSpeechDraft } from "@/hooks/use-speech-draft";
import { APPROACHES, type FloorRoundMode } from "@/types/campaign";

interface AdventureDraftComposerProps {
  sessionId: string;
  isGM: boolean;
  myCharName: string | null;
  onCommitDraft: (content: string, type: string, metadata?: string) => void | Promise<void>;
  onOfferBargain?: (body: {
    targetUserId: string;
    targetLabel: string;
    gain: string;
    price: string;
  }) => Promise<void>;
  onRequestRoll?: (
    targetUserId: string,
    attribute: string,
    reason: string,
    onSuccess: string,
    onFailure: string,
    fatal?: boolean,
  ) => Promise<void> | void;
  onCreateFloorRound?: (prompt: string, mode: FloorRoundMode, audiencePulseEnabled?: boolean) => Promise<void>;
  hasActiveCrossroads?: boolean;
  bargainTargets?: Array<{ userId: string; label: string }>;
  /** Opens the Table-talk (OOC chat) drawer. */
  onViewChat?: () => void;
}

type ComposerMode = "write" | "roll" | "scene" | "bargain" | "crossroads" | "answer";

const PLAYER_TYPES = [
  { key: "action", label: "Act" },
  { key: "dialogue", label: "Speak" },
  { key: "reaction", label: "React" },
  { key: "description", label: "Describe" },
] as const;

const DRAFT_PLACEHOLDERS: Record<string, string> = {
  narration: "Cut the scene, raise the cost, or reveal what the altar wants...",
  consequence: "Answer the action with a cost, turn, bargain, or reveal...",
  action: "What does your character do?",
  dialogue: "What does your character say?",
  reaction: "Your character's immediate response - a gasp, a flinch, a smile...",
  description: "Set the mood. Describe what it looks, sounds, or feels like...",
};

function getRenderPreview(myCharName: string | null): Record<string, string> {
  if (!myCharName) return {};

  return {
    action: `${myCharName} [your text]`,
    dialogue: `${myCharName} said, "[your text]"`,
    reaction: `${myCharName} [your text] (italic)`,
    description: "[your text] (italic, no name)",
  };
}

export default function AdventureDraftComposer({
  sessionId,
  isGM,
  myCharName,
  onCommitDraft,
  onOfferBargain,
  onRequestRoll,
  onCreateFloorRound,
  hasActiveCrossroads = false,
  bargainTargets = [],
  onViewChat,
}: AdventureDraftComposerProps) {
  const [composerMode, setComposerMode] = useState<ComposerMode>("write");
  const [rollTargetUserId, setRollTargetUserId] = useState("everyone");
  const [rollApproach, setRollApproach] = useState("Bold");
  const [rollReason, setRollReason] = useState("");
  const [rollOnSuccess, setRollOnSuccess] = useState("");
  const [rollOnFailure, setRollOnFailure] = useState("");
  const [rollFatal, setRollFatal] = useState(false);
  const [rollBusy, setRollBusy] = useState(false);
  const [bargainTargetUserId, setBargainTargetUserId] = useState("everyone");
  const [bargainGain, setBargainGain] = useState("");
  const [bargainPrice, setBargainPrice] = useState("");
  const [bargainBusy, setBargainBusy] = useState(false);
  const [crossroadsPrompt, setCrossroadsPrompt] = useState("");
  const [crossroadsMode, setCrossroadsMode] = useState<FloorRoundMode>("gm_pick");
  const [audiencePulseEnabled, setAudiencePulseEnabled] = useState(false);
  const [crossroadsBusy, setCrossroadsBusy] = useState(false);
  const {
    draftContent,
    setDraftContent,
    draftType,
    setDraftType,
    draftSaved,
    clearDraft,
  } = useAdventureDraft({ sessionId, initialType: isGM ? "narration" : "action" });
  const {
    hasSpeechSupport,
    isListening,
    interimTranscript,
    speechError,
    toggleListening,
    stopListening,
  } = useSpeechDraft({ setDraftContent });

  const renderPreview = getRenderPreview(myCharName);
  const composerTitle =
    composerMode === "crossroads" ? "Crossroads" : composerMode === "bargain" ? "Set a Price" : isGM ? "Director Move" : "Spotlight Turn";
  const composerHint =
    composerMode === "crossroads"
      ? hasActiveCrossroads
        ? "Resolve the active Crossroads before opening another."
        : "Ask for proposals first. Those responses become the options."
      : composerMode === "bargain"
        ? "Offer a clear gain with a clear cost. The target can accept or refuse."
      : composerMode === "roll" && isGM
        ? "Choose who rolls, what approach matters, and what success or failure means."
      : isGM
        ? "Direct the next beat. The goal is pressure, not permission."
        : myCharName
          ? `${myCharName} is in the scene. Add only what they can own.`
          : "Write from your character's point of view.";

  // GM toggle: when writing a consequence, optionally flag the turn as
  // "leaves a mark" — surfaces a Mark prompt to all active players via
  // MarkPromptRail. Resets to false after each submit.
  const [leaveAMark, setLeaveAMark] = useState(false);
  const showLeaveAMarkToggle =
    isGM &&
    draftType === "consequence" &&
    composerMode !== "crossroads" &&
    composerMode !== "bargain" &&
    composerMode !== "roll";

  const handleCommit = () => {
    const metadata =
      leaveAMark && showLeaveAMarkToggle
        ? JSON.stringify({ markEligible: true })
        : undefined;
    void commitAdventureDraft({
      draftContent,
      draftType,
      isGM,
      myCharName,
      isListening,
      stopListening,
      onCommitDraft,
      clearDraft,
      metadata,
    });
    setLeaveAMark(false);
  };

  const handleModeChange = (mode: ComposerMode) => {
    setComposerMode(mode);
    if (mode === "crossroads" || mode === "bargain") return;
    if (isGM) {
      setDraftType(mode === "answer" ? "consequence" : "narration");
      return;
    }
    if (mode === "answer") {
      setDraftType("reaction");
    } else if (mode === "scene") {
      setDraftType("description");
    } else if (draftType === "reaction" || draftType === "description") {
      setDraftType("action");
    }
  };

  const seedDraft = (text: string, type = draftType) => {
    setDraftType(type);
    // The quick-beat / quick-react chips are starters. Only drop the seed in
    // when the draft is empty — clobbering in-progress writing on a stray tap
    // is the kind of silent data loss that makes people stop trusting the box.
    setDraftContent((current) => (current.trim() ? current : text));
    setComposerMode("write");
  };

  const handleCreateCrossroads = async () => {
    if (!crossroadsPrompt.trim() || !onCreateFloorRound || hasActiveCrossroads) return;
    setCrossroadsBusy(true);
    try {
      await onCreateFloorRound(
        crossroadsPrompt.trim(),
        crossroadsMode,
        crossroadsMode === "vote" && audiencePulseEnabled,
      );
      setCrossroadsPrompt("");
      setComposerMode("write");
    } finally {
      setCrossroadsBusy(false);
    }
  };

  const handleOfferBargain = async () => {
    const target = bargainTargetUserId === "everyone"
      ? { userId: "everyone", label: "Whole table" }
      : bargainTargets.find((option) => option.userId === bargainTargetUserId);

    if (!target || !bargainGain.trim() || !bargainPrice.trim() || !onOfferBargain) return;

    setBargainBusy(true);
    try {
      await onOfferBargain({
        targetUserId: target.userId,
        targetLabel: target.label,
        gain: bargainGain.trim(),
        price: bargainPrice.trim(),
      });
      setBargainGain("");
      setBargainPrice("");
      setComposerMode("write");
    } finally {
      setBargainBusy(false);
    }
  };

  const handleRequestRoll = async () => {
    if (!rollReason.trim() || !rollOnSuccess.trim() || !rollOnFailure.trim() || !onRequestRoll) return;
    setRollBusy(true);
    try {
      await onRequestRoll(
        rollTargetUserId,
        rollApproach,
        rollReason.trim(),
        rollOnSuccess.trim(),
        rollOnFailure.trim(),
        rollFatal,
      );
      setRollReason("");
      setRollOnSuccess("");
      setRollOnFailure("");
      setRollFatal(false);
      setComposerMode("write");
    } finally {
      setRollBusy(false);
    }
  };

  // The composer is for WORDS. Mechanics (roll, scene, bargain, crossroads)
  // live in the Director's hand now, so no mode tabs here — the GM narrates,
  // players pick a beat type from the chip row below.
  const availableModes: ComposerMode[] = isGM ? ["write"] : [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[45] border-t border-border bg-void/92 px-3 py-3 shadow-[0_-18px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-6 sm:py-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber">{composerTitle}</p>
            <p className="truncate text-[12px] text-text-tertiary">{composerHint}</p>
          </div>
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
          {availableModes.length > 1 && (
            <div className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-subtle/20 p-1 sm:flex">
              {availableModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleModeChange(mode)}
                  className={`min-h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                    composerMode === mode
                      ? "bg-amber/15 text-amber"
                      : "text-text-secondary hover:text-paper"
                  }`}
                >
                  {mode === "answer" ? (isGM ? "Answer" : "React") : mode}
                  {mode === "write" && <span className="ml-1 text-amber/60">*</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isGM && (
          <div className="mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {PLAYER_TYPES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setDraftType(option.key);
                  setComposerMode(option.key === "reaction" ? "answer" : option.key === "description" ? "scene" : "write");
                }}
                className={`min-h-9 shrink-0 rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  draftType === option.key
                    ? "border-amber/35 bg-amber/15 text-amber"
                    : "border-border bg-subtle/20 text-text-secondary hover:border-amber/30 hover:text-amber"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {!isGM && renderPreview[draftType] && (
          <div className="mb-2 px-1 text-[11px] text-text-ghost font-serif italic">
            Appears as: {renderPreview[draftType]}
          </div>
        )}

        {composerMode === "bargain" ? (
          <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
            <div className="rounded-lg border border-border bg-elevated px-4 py-3">
              <div className="grid gap-3 sm:grid-cols-[180px_1fr_1fr]">
                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-text-ghost">Target</span>
                  <select
                    value={bargainTargetUserId}
                    onChange={(event) => setBargainTargetUserId(event.target.value)}
                    className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[12px] text-paper outline-none transition-colors focus:border-amber/35"
                  >
                    <option value="everyone">Whole table</option>
                    {bargainTargets.map((target) => (
                      <option key={target.userId} value={target.userId}>
                        {target.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-sage">They Get</span>
                  <textarea
                    value={bargainGain}
                    onChange={(event) => setBargainGain(event.target.value)}
                    placeholder="Open the tomb before the patrol arrives..."
                    className="min-h-[82px] w-full resize-none rounded-lg border border-border bg-surface/60 px-3 py-2.5 font-reading text-[15px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost focus:border-sage/35"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-rose">It Costs</span>
                  <textarea
                    value={bargainPrice}
                    onChange={(event) => setBargainPrice(event.target.value)}
                    placeholder="But the Crown marks Elia's blood..."
                    className="min-h-[82px] w-full resize-none rounded-lg border border-border bg-surface/60 px-3 py-2.5 font-reading text-[15px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost focus:border-rose/35"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2 lg:flex-col">
              <button
                type="button"
                onClick={handleOfferBargain}
                disabled={!bargainGain.trim() || !bargainPrice.trim() || bargainBusy || !onOfferBargain}
                className="min-h-10 flex-1 rounded-lg border border-amber/35 bg-amber/15 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-amber transition-colors hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Offer
              </button>
              <button
                type="button"
                onClick={() => setComposerMode("write")}
                className="min-h-10 flex-1 rounded-lg border border-border bg-subtle/20 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary transition-colors hover:text-paper"
              >
                Back
              </button>
            </div>
          </div>
        ) : composerMode === "crossroads" ? (
          <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
            <div className="rounded-lg border border-border bg-elevated px-4 py-3">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-lavender">Decision Shape</p>
                  <p className="mt-1 text-[12px] text-text-tertiary">
                    {crossroadsMode === "vote"
                      ? "Collect proposed outcomes, then reveal them as vote options."
                      : "Collect proposed outcomes, then the Director chooses what becomes canon."}
                  </p>
                </div>
                <div className="flex shrink-0 rounded-full border border-border bg-subtle/20 p-0.5">
                  {(["gm_pick", "vote"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCrossroadsMode(mode)}
                      className={`rounded-full px-3 py-2 text-[10px] uppercase tracking-wider transition-colors ${
                        crossroadsMode === mode
                          ? "bg-lavender/20 text-lavender"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      {mode === "gm_pick" ? "Director Pick" : "Table Vote"}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={crossroadsPrompt}
                onChange={(event) => setCrossroadsPrompt(event.target.value)}
                placeholder="What choice should the table answer?"
                disabled={hasActiveCrossroads}
                className="min-h-[82px] w-full resize-none rounded-lg border border-border bg-surface/60 px-4 py-3 font-reading text-[16px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost focus:border-lavender/40 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {crossroadsMode === "vote" && (
                <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-lavender/15 bg-lavender/[0.04] p-3">
                  <input
                    type="checkbox"
                    checked={audiencePulseEnabled}
                    onChange={(event) => setAudiencePulseEnabled(event.target.checked)}
                    className="mt-0.5 accent-current"
                  />
                  <span>
                    <span className="block text-[10px] uppercase tracking-widest text-lavender font-display">
                      Audience Pulse + Sparks
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-text-tertiary">
                      Spectators can back favorites and submit paid ideas while options are being collected.
                    </span>
                  </span>
                </label>
              )}
            </div>
            <div className="flex gap-2 lg:flex-col">
              <button
                type="button"
                onClick={handleCreateCrossroads}
                disabled={!crossroadsPrompt.trim() || crossroadsBusy || hasActiveCrossroads || !onCreateFloorRound}
                className="min-h-10 flex-1 rounded-lg border border-lavender/35 bg-lavender/15 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-lavender transition-colors hover:bg-lavender/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {crossroadsMode === "vote" ? "Collect Options" : "Open Crossroads"}
              </button>
              <button
                type="button"
                onClick={() => setComposerMode("write")}
                className="min-h-10 flex-1 rounded-lg border border-border bg-subtle/20 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary transition-colors hover:text-paper"
              >
                Back
              </button>
            </div>
          </div>
        ) : composerMode === "roll" && isGM ? (
          <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
            <div className="rounded-lg border border-border bg-elevated px-4 py-3">
              <div className="grid gap-3 lg:grid-cols-[180px_220px_1fr]">
                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-text-ghost">Target</span>
                  <select
                    value={rollTargetUserId}
                    onChange={(event) => setRollTargetUserId(event.target.value)}
                    className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[12px] text-paper outline-none transition-colors focus:border-lavender/35"
                  >
                    <option value="everyone">Whole table</option>
                    {bargainTargets.map((target) => (
                      <option key={target.userId} value={target.userId}>
                        {target.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-text-ghost">Approach</span>
                  <div className="grid grid-cols-3 gap-2">
                    {APPROACHES.map((approach) => (
                      <button
                        key={approach}
                        type="button"
                        onClick={() => setRollApproach(approach)}
                        className={`min-h-10 rounded-lg border px-2 text-[11px] font-bold transition-colors ${
                          rollApproach === approach
                            ? "border-lavender/45 bg-lavender/15 text-lavender"
                            : "border-border bg-surface text-text-secondary hover:text-paper"
                        }`}
                      >
                        {approach}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-text-ghost">Reason</span>
                  <textarea
                    value={rollReason}
                    onChange={(event) => setRollReason(event.target.value)}
                    placeholder="Force the tomb door open before the patrol arrives..."
                    className="min-h-[82px] w-full resize-none rounded-lg border border-border bg-surface/60 px-3 py-2.5 font-reading text-[15px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost focus:border-lavender/35"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block rounded-lg border border-sage/15 bg-sage/[0.04] p-3">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-sage">On Success</span>
                  <textarea
                    value={rollOnSuccess}
                    onChange={(event) => setRollOnSuccess(event.target.value)}
                    placeholder="The door opens quietly and the party gets inside."
                    className="min-h-[70px] w-full resize-none rounded-lg border border-border bg-surface/60 px-3 py-2.5 font-reading text-[15px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost focus:border-sage/35"
                  />
                </label>
                <label className="block rounded-lg border border-rose/15 bg-rose/[0.04] p-3">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-rose">On Failure</span>
                  <textarea
                    value={rollOnFailure}
                    onChange={(event) => setRollOnFailure(event.target.value)}
                    placeholder="The door opens, but the tomb wakes and marks whoever touched it."
                    className="min-h-[70px] w-full resize-none rounded-lg border border-border bg-surface/60 px-3 py-2.5 font-reading text-[15px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost focus:border-rose/35"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2 lg:flex-col">
              <button
                type="button"
                onClick={handleRequestRoll}
                disabled={!rollReason.trim() || !rollOnSuccess.trim() || !rollOnFailure.trim() || rollBusy || !onRequestRoll}
                className="min-h-10 flex-1 rounded-lg border border-lavender/35 bg-lavender/15 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-lavender transition-colors hover:bg-lavender/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Call Roll
              </button>
              <button
                type="button"
                onClick={() => setRollFatal((value) => !value)}
                className={`min-h-10 flex-1 rounded-lg border px-4 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${
                  rollFatal
                    ? "border-rose/40 bg-rose/15 text-rose"
                    : "border-border bg-subtle/20 text-text-secondary hover:text-paper"
                }`}
              >
                Fatal
              </button>
            </div>
          </div>
        ) : composerMode === "roll" ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-3 gap-2">
              {["Bold", "Keen", "Subtle"].map((stat) => (
                <button
                  key={stat}
                  type="button"
                  className="rounded-lg border border-border bg-elevated px-3 py-3 text-left transition-colors hover:border-amber/30"
                >
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{stat}</span>
                  <span className="mt-1 block font-mono text-[18px] text-paper">0</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => seedDraft(isGM ? "The Director calls for a check: " : "I make a check: ", isGM ? "narration" : "action")}
              className="rounded-lg border border-amber/35 bg-amber/15 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-amber transition-colors hover:bg-amber/20"
            >
              {isGM ? "Call Check" : "Prepare Roll"}
            </button>
          </div>
        ) : composerMode === "answer" ? (
          <div className="grid grid-cols-4 gap-2">
            {(isGM ? ["Raise Pressure", "Reveal Cost", "Offer Turn", "Show Mercy"] : ["Dread", "Mercy", "Wonder", "Betrayal"]).map((reaction) => (
              <button
                key={reaction}
                type="button"
                onClick={() => seedDraft(`${reaction}: `, isGM ? "consequence" : "reaction")}
                className="rounded-lg border border-border bg-elevated px-3 py-3 text-[11px] font-bold uppercase tracking-[0.13em] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
              >
                {reaction}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                placeholder={composerMode === "scene" ? "Shift the scene..." : DRAFT_PLACEHOLDERS[draftType] ?? "Write..."}
                className="min-h-[82px] w-full resize-none rounded-lg border border-border bg-elevated px-4 py-3 font-reading text-[16px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost focus:border-amber/35"
              />
              {showLeaveAMarkToggle && (
                <label className="flex cursor-pointer select-none items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-tertiary transition-colors hover:text-amber">
                  <input
                    type="checkbox"
                    checked={leaveAMark}
                    onChange={(e) => setLeaveAMark(e.target.checked)}
                    className="h-3.5 w-3.5 accent-amber"
                  />
                  <span>Leave a mark</span>
                  <span className="ml-1 text-[9px] normal-case tracking-normal text-text-ghost">
                    invites players to mark their character
                  </span>
                </label>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:w-44">
              {/* Primary commit */}
              <button
                type="button"
                onClick={handleCommit}
                disabled={!draftContent.trim()}
                className="min-h-11 rounded-lg bg-amber px-4 text-[12px] font-bold uppercase tracking-[0.14em] text-void shadow-[0_8px_24px_-10px_rgba(216,178,90,0.7)] transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {isGM ? "Add to Canon" : "Submit Turn"}
              </button>
              {/* Secondary: dictate + discard */}
              <div className="flex gap-2">
                {hasSpeechSupport && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? "Stop dictation" : "Dictate with your voice"}
                    className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                      isListening
                        ? "border-rose/40 bg-rose/20 text-rose"
                        : "border-border bg-subtle/20 text-text-secondary hover:text-paper"
                    }`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
                    </svg>
                    {isListening ? "Stop" : "Voice"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearDraft}
                  disabled={!draftContent.trim()}
                  className="min-h-9 flex-1 rounded-lg border border-border bg-subtle/20 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary transition-colors hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
                  title="Discard this draft (your work auto-saves until you post)"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {(draftSaved && draftContent) || interimTranscript || speechError ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-2 text-[11px] leading-relaxed text-text-tertiary">
                {interimTranscript ? (
                  <span className="font-serif italic text-text-secondary">{interimTranscript}</span>
                ) : speechError ? (
                  <span className="text-rose/70">{speechError}</span>
                ) : (
                  <span>Draft saved</span>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
