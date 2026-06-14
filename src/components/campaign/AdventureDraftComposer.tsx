"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { commitAdventureDraft, useAdventureDraft } from "@/hooks/use-adventure-draft";
import { useSpeechDraft } from "@/hooks/use-speech-draft";

interface AdventureDraftComposerProps {
  sessionId: string;
  isGM: boolean;
  myCharName: string | null;
  onCommitDraft: (content: string, type: string, metadata?: string) => void | Promise<void>;
  /** Opens the Table-talk (OOC chat) drawer. */
  onViewChat?: () => void;
}

// The composer is for WORDS. Mechanics (rolls, scene cuts, bargains,
// Crossroads) live in the Director's hand / the right-hand console now, so
// this surface only ever toggles between writing a beat ("write"/"scene")
// and the player's quick-react starters ("answer").
type ComposerMode = "write" | "scene" | "answer";

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
  onViewChat,
}: AdventureDraftComposerProps) {
  const [composerMode, setComposerMode] = useState<ComposerMode>("write");
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
  const composerTitle = isGM ? "Director Move" : "Spotlight Turn";
  const composerHint = isGM
    ? "Direct the next beat. The goal is pressure, not permission."
    : myCharName
      ? `${myCharName} is in the scene. Add only what they can own.`
      : "Write from your character's point of view.";

  // GM toggle: when writing a consequence, optionally flag the turn as
  // "leaves a mark" — surfaces a Mark prompt to all active players via
  // MarkPromptRail. Resets to false after each submit.
  const [leaveAMark, setLeaveAMark] = useState(false);
  const showLeaveAMarkToggle = isGM && draftType === "consequence";

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

  const seedDraft = (text: string, type = draftType) => {
    setDraftType(type);
    // The quick-beat / quick-react chips are starters. Only drop the seed in
    // when the draft is empty — clobbering in-progress writing on a stray tap
    // is the kind of silent data loss that makes people stop trusting the box.
    setDraftContent((current) => (current.trim() ? current : text));
    setComposerMode("write");
  };

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

        {composerMode === "answer" ? (
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
