"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { commitAdventureDraft, useAdventureDraft } from "@/hooks/use-adventure-draft";
import { useSpeechDraft } from "@/hooks/use-speech-draft";

/**
 * The inline quill — you write INTO the story, not into a dock. Renders as
 * the manuscript's next paragraph: a lead-in in your character's ink, then an
 * auto-growing textarea styled as the page itself. The controls beneath are
 * inked marks, not chrome. One instance exists in the tree at any time.
 *
 * Last-words variant: a dead character sets one final description down in
 * faded ink; commits `description` + {lastWords:true}, then falls silent.
 */

const PLAYER_TYPES = [
  { key: "action", label: "Write" },
  { key: "dialogue", label: "Speak" },
] as const;

const GM_TYPES = [
  { key: "narration", label: "Narrate" },
  { key: "consequence", label: "Answer" },
] as const;

const PLACEHOLDERS: Record<string, string> = {
  narration: "Cut the scene, raise the cost, or reveal what the dark wants…",
  consequence: "Answer the action with a cost, a turn, or a reveal…",
  action: "…what do they do?",
  dialogue: "…what do they say?",
  "last-words": "…the last thing they say or do.",
};

export default function InlineQuill({
  sessionId,
  isGM,
  myCharName,
  inkColor,
  lastWords = false,
  onCommitDraft,
  onLastWordsSent,
}: {
  sessionId: string;
  isGM: boolean;
  myCharName: string | null;
  /** CSS color (usually `var(--ink-n)`) — the hand this paragraph is written in. */
  inkColor: string;
  lastWords?: boolean;
  onCommitDraft: (content: string, type: string, metadata?: string) => void | Promise<void>;
  onLastWordsSent?: () => void;
}) {
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

  // GM "Answer" may be flagged as leaving a mark; resets after each commit.
  const [leaveAMark, setLeaveAMark] = useState(false);
  const showLeaveAMark = isGM && draftType === "consequence" && !lastWords;

  const effectiveType = lastWords ? "description" : draftType;

  // Auto-grow: the quill paragraph stretches as the ink flows.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draftContent]);

  const handleCommit = useCallback(async () => {
    const metadata = lastWords
      ? JSON.stringify({ lastWords: true })
      : leaveAMark && showLeaveAMark
        ? JSON.stringify({ markEligible: true })
        : undefined;
    const sent = await commitAdventureDraft({
      draftContent,
      draftType: effectiveType,
      isGM,
      myCharName,
      isListening,
      stopListening,
      onCommitDraft,
      clearDraft,
      metadata,
    });
    setLeaveAMark(false);
    if (sent && lastWords) onLastWordsSent?.();
  }, [
    lastWords,
    leaveAMark,
    showLeaveAMark,
    draftContent,
    effectiveType,
    isGM,
    myCharName,
    isListening,
    stopListening,
    onCommitDraft,
    clearDraft,
    onLastWordsSent,
  ]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void handleCommit();
    }
  };

  // The lead-in previews exactly how the paragraph will read on the page.
  const leadIn = lastWords
    ? myCharName
      ? `${myCharName}, at the end —`
      : "At the end —"
    : isGM
      ? draftType === "consequence"
        ? "The Director answers —"
        : "The Director writes —"
      : myCharName
        ? draftType === "dialogue"
          ? `${myCharName} said, “`
          : `${myCharName} `
        : "";
  const trailingQuote = !isGM && !lastWords && draftType === "dialogue";

  const typeOptions = isGM ? GM_TYPES : PLAYER_TYPES;
  const inkStyle = lastWords ? { color: "var(--ink-faded)" } : { color: inkColor };

  return (
    <div className="relative" data-turn-id="the-quill">
      {/* The growing paragraph. */}
      <div className={`font-reading text-[16px] leading-[1.85] sm:text-[17px] ${lastWords ? "italic" : ""}`}>
        {leadIn && (
          <span
            className={isGM || lastWords ? "hand-note text-lg" : "font-semibold"}
            style={inkStyle}
          >
            {leadIn}
          </span>
        )}
        <textarea
          ref={textareaRef}
          value={draftContent}
          onChange={(event) => setDraftContent(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[lastWords ? "last-words" : draftType] ?? "Write…"}
          rows={1}
          className={`ink-caret block w-full resize-none overflow-hidden bg-transparent font-reading text-[16px] leading-[1.85] text-paper/95 outline-none placeholder:italic placeholder:text-text-ghost sm:text-[17px] ${
            lastWords ? "italic text-paper/75" : ""
          }`}
          style={{ ["--ink-self" as string]: lastWords ? "var(--ink-faded)" : inkColor }}
          aria-label={lastWords ? "Your character's last words" : "Write the next paragraph"}
        />
        {trailingQuote && <span className="text-text-ghost">”</span>}
      </div>

      {/* Interim dictation — faint ink still forming. */}
      <AnimatePresence>
        {(interimTranscript || speechError) && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`mt-1 font-reading text-[15px] italic ${speechError ? "text-rose/70" : "text-text-ghost"}`}
          >
            {speechError ?? interimTranscript}
          </motion.p>
        )}
      </AnimatePresence>

      {/* The inked control line — marks under the paragraph, not chrome. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {!lastWords && (
          <div className="flex items-center gap-3.5">
            {typeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setDraftType(option.key)}
                className={`table-action cursor-pointer transition-colors ${
                  draftType === option.key
                    ? "underline decoration-2 underline-offset-4"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
                style={draftType === option.key ? { color: inkColor } : undefined}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {showLeaveAMark && (
          <label className="table-action flex cursor-pointer select-none items-center gap-1.5 text-text-tertiary transition-colors hover:text-amber">
            <input
              type="checkbox"
              checked={leaveAMark}
              onChange={(e) => setLeaveAMark(e.target.checked)}
              className="h-3 w-3 accent-amber"
            />
            Leaves a mark
          </label>
        )}

        {hasSpeechSupport && !lastWords && (
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Stop dictation" : "Dictate with your voice"}
            className={`table-action flex cursor-pointer items-center gap-1 transition-colors ${
              isListening ? "text-rose" : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
            </svg>
            {isListening ? "Listening…" : "Voice"}
          </button>
        )}

        {draftContent.trim() && !lastWords && (
          <button
            type="button"
            onClick={clearDraft}
            className="table-action cursor-pointer text-text-tertiary line-through transition-colors hover:text-text-secondary"
            title="Scratch out this draft"
          >
            Scratch it out
          </button>
        )}

        <AnimatePresence>
          {draftSaved && draftContent && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="text-[10px] uppercase tracking-[0.14em] text-text-ghost"
            >
              ✓ kept
            </motion.span>
          )}
        </AnimatePresence>

        <div className="ml-auto">
          <button
            type="button"
            onClick={() => void handleCommit()}
            disabled={!draftContent.trim()}
            className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
            title="Commit these words to the page (Ctrl+Enter)"
          >
            {lastWords ? "Set the last words" : "Set the words"}
          </button>
        </div>
      </div>
    </div>
  );
}
