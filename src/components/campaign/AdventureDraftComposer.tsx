"use client";

import { AnimatePresence, motion } from "framer-motion";
import { commitAdventureDraft, useAdventureDraft } from "@/hooks/use-adventure-draft";
import { useSpeechDraft } from "@/hooks/use-speech-draft";

interface TurnTypeOption {
  key: string;
  label: string;
  hint: string;
}

interface AdventureDraftComposerProps {
  sessionId: string;
  isGM: boolean;
  myCharName: string | null;
  onCommitDraft: (content: string, type: string) => void | Promise<void>;
}

const GM_TYPES: TurnTypeOption[] = [
  { key: "narration", label: "Narrate", hint: "Set the scene" },
  { key: "consequence", label: "Consequence", hint: "React to player" },
];

const PLAYER_TYPES: TurnTypeOption[] = [
  { key: "action", label: "Act", hint: "What you do" },
  { key: "dialogue", label: "Speak", hint: "What you say" },
  { key: "reaction", label: "React", hint: "Your response" },
  { key: "description", label: "Describe", hint: "Color & mood" },
];

const DRAFT_PLACEHOLDERS: Record<string, string> = {
  narration: "Describe the scene, introduce stakes, set the tone...",
  consequence: "What happens as a result of the player's action?",
  action: "What does your character do?",
  dialogue: "What does your character say?",
  reaction: "Your character's immediate response - a gasp, a flinch, a smile...",
  description: "Set the mood. Describe what it looks, sounds, or feels like...",
};

const TURN_EXAMPLES: Record<string, string> = {
  action: "draws her blade and steps into the light, eyes scanning the shadows for movement.",
  dialogue: "We don't have much time. Whatever we do, we do it now.",
  reaction: "A chill runs down her spine. She'd heard stories about this place - none of them good.",
  description: "The torchlight catches the edges of something metallic embedded in the wall - ancient, ornate, and unmistakably deliberate.",
  narration: "The corridor stretches ahead, its walls slick with moisture. From somewhere below, a rhythmic drumming echoes.",
  consequence: "The ground gives way beneath their feet - not a collapse, but a design. Someone built this trap centuries ago, and it still works perfectly.",
};

const TURN_DESCRIPTIONS: Record<string, string> = {
  action: "What your character physically does - movement, combat, interaction.",
  dialogue: "What your character says aloud. Auto-wrapped in quotes.",
  reaction: "Your character's immediate emotional or instinctive response.",
  description: "Set the mood. Describe what the scene looks, sounds, or feels like.",
  narration: "Set the scene, describe the world, introduce what happens next.",
  consequence: "What happens as a direct result of a player's action or choice.",
};

function isPlayerTurnType(type: string) {
  return ["action", "dialogue", "reaction"].includes(type);
}

function getRenderPreview(myCharName: string | null): Record<string, string> {
  if (!myCharName) return {};

  return {
    action: `${myCharName} [your text]`,
    dialogue: `${myCharName} said, "[your text]"`,
    reaction: `${myCharName} [your text] (italic)`,
    description: "[your text] (italic, no name)",
    narration: "[your text]",
    consequence: "[your text]",
  };
}

export default function AdventureDraftComposer({
  sessionId,
  isGM,
  myCharName,
  onCommitDraft,
}: AdventureDraftComposerProps) {
  const {
    draftContent,
    setDraftContent,
    draftType,
    setDraftType,
    draftSaved,
    showTurnHelp,
    setShowTurnHelp,
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

  const draftTypes = isGM ? GM_TYPES : PLAYER_TYPES;
  const renderPreview = getRenderPreview(myCharName);

  const handleCommit = () => {
    void commitAdventureDraft({
      draftContent,
      draftType,
      isGM,
      myCharName,
      isListening,
      stopListening,
      onCommitDraft,
      clearDraft,
    });
  };

  return (
    <div className="w-full max-w-[650px] mt-auto">
      <div className="bg-ink border border-amber/20 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
        <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-2 text-[10px] uppercase font-display tracking-[0.2em] text-amber">
          {isGM ? "Narrator" : "Your Turn"}
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {draftTypes.map((t) => (
            <button
              key={t.key}
              onClick={() => setDraftType(t.key)}
              className={`min-h-9 px-3.5 py-2 text-[12px] uppercase tracking-[0.08em] font-semibold rounded-full border transition-all cursor-pointer ${
                draftType === t.key
                  ? "bg-amber/15 text-amber border-amber/40 shadow-[0_0_10px_rgba(200,150,60,0.15)]"
                  : "bg-subtle/30 text-text-tertiary border-border hover:text-text-secondary"
              }`}
              title={t.hint}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setShowTurnHelp((v) => !v)}
            className={`h-9 w-9 rounded-full border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
              showTurnHelp
                ? "bg-subtle/50 border-border-active text-text-secondary"
                : "bg-subtle/30 border-border text-text-tertiary hover:text-text-secondary hover:bg-subtle/50"
            }`}
            title="Show turn type help"
          >
            ?
          </button>
        </div>

        <AnimatePresence>
          {showTurnHelp && TURN_DESCRIPTIONS[draftType] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-subtle/20 border border-border-subtle rounded-xl p-4 mb-3">
                <div className="text-[10px] uppercase tracking-widest text-amber/60 font-bold mb-1">
                  {draftTypes.find((t) => t.key === draftType)?.label ?? draftType}
                </div>
                <div className="text-xs text-text-tertiary mb-2">
                  {TURN_DESCRIPTIONS[draftType]}
                </div>
                <div className="text-sm text-text-ghost font-serif italic leading-relaxed">
                  {isPlayerTurnType(draftType) && myCharName && (
                    <span className="text-text-tertiary not-italic">{myCharName} </span>
                  )}
                  {TURN_EXAMPLES[draftType]}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isGM && renderPreview[draftType] && (
          <div className="mb-2 px-1 text-[11px] text-text-ghost font-serif italic">
            Appears as: {renderPreview[draftType]}
          </div>
        )}

        <textarea
          className="w-full bg-transparent text-[17px] leading-[1.9] text-paper/90 outline-none font-serif resize-none min-h-[120px] placeholder:text-text-ghost"
          placeholder={DRAFT_PLACEHOLDERS[draftType] ?? "Write..."}
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
        />

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
          <div className="text-xs text-text-secondary font-serif italic flex items-center gap-3">
            <span>{isGM ? "The Director sets the stage." : "Take your time. The party is waiting."}</span>
            {draftSaved && draftContent && (
              <span className="text-text-ghost text-[10px] not-italic">Draft saved</span>
            )}
            {isListening && (
              <span className="text-rose/60 text-[10px] not-italic flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose animate-pulse" />
                Listening...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasSpeechSupport && (
              <button
                onClick={toggleListening}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? "bg-rose/20 border-rose/40 text-rose shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                    : "bg-subtle/30 border-border text-text-tertiary hover:text-text-secondary hover:bg-subtle/50"
                }`}
                title={isListening ? "Stop dictation" : "Voice dictation"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </button>
            )}
            <button
              onClick={handleCommit}
              disabled={!draftContent.trim()}
              className="min-h-10 bg-amber/10 hover:bg-amber border border-amber/20 text-amber hover:text-black transition-all rounded-full px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(200,150,60,0.1)] hover:shadow-[0_0_20px_rgba(200,150,60,0.5)] disabled:opacity-50 disabled:hover:bg-amber/10 disabled:hover:text-amber disabled:cursor-not-allowed cursor-pointer"
            >
              Post Turn
            </button>
          </div>
        </div>
        <AnimatePresence>
          {(interimTranscript || speechError) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-xl border border-border-subtle bg-subtle/20 px-3 py-2 text-[11px] leading-relaxed text-text-tertiary">
                {interimTranscript ? (
                  <span className="font-serif italic text-text-secondary">{interimTranscript}</span>
                ) : speechError ? (
                  <span className="text-rose/70">{speechError}</span>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
