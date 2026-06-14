"use client";

import { useState } from "react";
import type { PlayerCharacter, SessionRosterEntry } from "@/types/campaign";
import { parseStats } from "@/types/campaign";
import ProgressClock from "./ProgressClock";
import type { ProgressClockData } from "./ProgressClock";
import StakesTracker from "./StakesTracker";
import CharacterSheetSection from "./CharacterSheetSection";
import RollRequestForm from "./RollRequestForm";

interface ContextPanelProps {
  isGM: boolean;
  myCharacter: PlayerCharacter | null;
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  onRequestRoll: (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => void;
  onPushEvent: (content: string) => void;
  onChangeCharacterStatus: (characterId: string, status: "active" | "retired" | "dead") => void;
  onSceneBreak?: (title: string, mood: string, aspects?: string[]) => void;
  onStoryMoment?: (
    text: string,
    mood: string,
    subtext?: string,
    options?: { importance?: "normal" | "major"; leavesMark?: boolean },
  ) => void;
  onAddIllustration?: (imageUrl: string, caption?: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  roster?: SessionRosterEntry[];
  onInviteNewCharacter?: (userId: string) => void;
  /** Tension clocks — local session-scoped state */
  clocks?: ProgressClockData[];
  onClocksChange?: (clocks: ProgressClockData[]) => void;
  /** When true, panel renders without the `hidden xl:flex` constraint (use inside a mobile drawer). */
  forceVisible?: boolean;
  /** Character marks (scars/vows/debts/memories) — passed through to CharacterSheetSection. */
  currentUserId?: string | null;
  onCreateMark?: (
    characterId: string,
    input: { kind: import("@/types/campaign").CharacterMarkKind; text: string },
  ) => Promise<unknown>;
  onRemoveMark?: (characterId: string, markId: string) => Promise<void>;
  /** When set, the GM panel becomes a single focused ritual (one director move).
   *  When null, it's character/clock management only. Players ignore this. */
  focus?: "roll" | "scene" | "story" | "illustration" | "bargain" | "pressure" | null;
  /** GM offers a bargain (a price for a gain) — the bargain ritual. */
  onOfferBargain?: (body: { targetUserId: string; targetLabel: string; gain: string; price: string }) => Promise<void> | void;
  /** Close the hosting drawer/ritual (called after a focused move is committed). */
  onClose?: () => void;
}

// Titles + one-liners for each focused ritual (the Director's hand).
const RITUAL_META: Record<string, { title: string; hint: string }> = {
  roll: { title: "Call a roll", hint: "Put the moment in the hands of the dice." },
  bargain: { title: "Offer a bargain", hint: "A price for a gain — let them choose." },
  scene: { title: "Scene break", hint: "Cut, and move the story on." },
  story: { title: "Story moment", hint: "A held, full-bleed beat over the table." },
  illustration: { title: "Add an illustration", hint: "Drop an image into the page." },
  pressure: { title: "The pressure", hint: "A clock the whole table can feel rising." },
};

export default function ContextPanel({
  isGM,
  myCharacter,
  characters,
  activePlayerId,
  onRequestRoll,
  onPushEvent,
  onChangeCharacterStatus,
  onSceneBreak,
  onStoryMoment,
  onAddIllustration,
  isCollapsed = false,
  onToggleCollapse,
  roster = [],
  onInviteNewCharacter,
  clocks = [],
  onClocksChange,
  forceVisible = false,
  currentUserId = null,
  onCreateMark,
  onRemoveMark,
  focus = null,
  onOfferBargain,
  onClose,
}: ContextPanelProps) {
  const visibilityClass = forceVisible ? "flex w-full" : "hidden lg:flex w-[280px] xl:w-[300px]";

  // Bargain ritual state
  const [bargainTarget, setBargainTarget] = useState("everyone");
  const [bargainGain, setBargainGain] = useState("");
  const [bargainPrice, setBargainPrice] = useState("");
  const [bargainBusy, setBargainBusy] = useState(false);

  // Pressure ritual state
  const [pressureName, setPressureName] = useState("");
  const [pressureLine, setPressureLine] = useState("");
  const [pressureSize, setPressureSize] = useState<4 | 6 | 8>(6);

  // Scene break form state
  const [sceneBreakTitle, setSceneBreakTitle] = useState("");
  const [sceneBreakMood, setSceneBreakMood] = useState("ominous");
  const [sceneBreakAspects, setSceneBreakAspects] = useState<string[]>([]);
  const [sceneBreakAspectInput, setSceneBreakAspectInput] = useState("");

  // Story moment form state
  const [storyMomentText, setStoryMomentText] = useState("");
  const [storyMomentSubtext, setStoryMomentSubtext] = useState("");
  const [storyMomentMood, setStoryMomentMood] = useState("ominous");
  const [storyMomentMajor, setStoryMomentMajor] = useState(false);
  const [storyMomentLeavesMark, setStoryMomentLeavesMark] = useState(false);

  // Illustration form state
  const [illustrationUrl, setIllustrationUrl] = useState("");
  const [illustrationCaption, setIllustrationCaption] = useState("");

  const activeChars = characters.filter((c) => c.status === "active");

  // Helper: add aspect tag
  const addAspect = () => {
    const tag = sceneBreakAspectInput.trim();
    if (tag && !sceneBreakAspects.includes(tag)) {
      setSceneBreakAspects((prev) => [...prev, tag]);
    }
    setSceneBreakAspectInput("");
  };

  // Collapsed sidebar (shared between GM and player views)
  if (isCollapsed && !forceVisible) {
    return (
      <div className="w-12 h-full flex flex-col items-center border-l border-border-subtle bg-void shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0 hidden lg:flex py-4 gap-3">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-full bg-subtle/30 border border-border flex items-center justify-center text-text-tertiary hover:text-text hover:bg-subtle/50 transition-all cursor-pointer"
          title={isGM ? "Expand Director Console" : "Expand Character Engine"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="w-px flex-1 bg-subtle/30" />
        <div className="flex flex-col items-center gap-2">
          {isGM ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber/50">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          ) : (
            <div className="w-6 h-6 rounded-full bg-rose/20 flex items-center justify-center text-rose text-[10px] font-display border border-rose/30">
              {myCharacter?.name?.charAt(0) ?? "?"}
            </div>
          )}
          <span className="text-[9px] text-text-tertiary font-mono">{characters.filter(c => c.status === "active").length}P</span>
        </div>
      </div>
    );
  }

  if (isGM) {
    return (
      <div className={`${visibilityClass} h-full flex-col border-l border-border-subtle bg-void shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0`}>
        {/* GM Header */}
        <div className="p-6 border-b border-border-subtle bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center font-display text-amber text-lg border border-amber/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-amber/90">Director</h2>
              <p className="text-[10px] text-text-tertiary uppercase tracking-widest">Pressure & Canon</p>
            </div>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="w-7 h-7 rounded-full bg-subtle/30 border border-border flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-subtle/50 transition-all cursor-pointer"
                title="Collapse Director Console"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:rgba(224,169,62,0.22)_transparent]">
          {/* Tension Clocks — management only */}
          {!focus && (clocks.length > 0 || onClocksChange) && (
            <StakesTracker clocks={clocks} onClocksChange={onClocksChange} />
          )}

          {/* Party Status — management only */}
          {!focus && (
            <CharacterSheetSection
              characters={characters}
              activePlayerId={activePlayerId}
              onChangeCharacterStatus={onChangeCharacterStatus}
              onInviteNewCharacter={onInviteNewCharacter}
              roster={roster}
              currentUserId={currentUserId}
              isGM={isGM}
              onCreateMark={onCreateMark}
              onRemoveMark={onRemoveMark}
            />
          )}

          {/* GM Actions — a single focused ritual, summoned from the Director's hand */}
          {focus && (
          <div className="space-y-5">
            <div className="border-b border-amber/15 pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-amber/70">The Director&apos;s hand</p>
              <h3 className="mt-2 font-display text-[22px] leading-tight text-paper">{RITUAL_META[focus]?.title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-text-ghost">{RITUAL_META[focus]?.hint}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {focus === "roll" && <RollRequestForm activeChars={activeChars} onRequestRoll={onRequestRoll} />}

              {/* Pressure — one scene clock; raising it ticks the clock AND
                  drops the escalation line into canon, so it never goes stale. */}
              {focus === "pressure" && (() => {
                const clock = clocks.length > 0 ? clocks[0] : null;
                if (clock) {
                  const full = clock.filled >= clock.segments;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-xl border border-amber/20 bg-amber/[0.05] px-4 py-3">
                        <span className="text-amber">⛓</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-[15px] text-paper">{clock.name}</p>
                          <div className="mt-1.5 flex gap-1">
                            {Array.from({ length: clock.segments }).map((_, i) => (
                              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < clock.filled ? "bg-amber" : "bg-subtle"}`} />
                            ))}
                          </div>
                        </div>
                        <span className="shrink-0 font-display text-[13px] tabular-nums text-amber">{clock.filled}/{clock.segments}</span>
                      </div>

                      {!full && (
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                            What tightens? <span className="normal-case tracking-normal text-text-ghost/60">(one line for the page)</span>
                          </label>
                          <textarea
                            value={pressureLine}
                            onChange={(e) => setPressureLine(e.target.value)}
                            rows={2}
                            placeholder="The water reaches her knees…"
                            className="mt-1.5 w-full resize-none rounded-xl border border-border bg-ink/40 px-3.5 py-3 font-reading text-[15px] leading-relaxed text-paper outline-none placeholder:text-text-ghost/50 focus:border-amber/35"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        {full ? (
                          <span className="text-[12px] italic text-amber/80">The clock is full — let it break.</span>
                        ) : (
                          <button
                            onClick={() => {
                              onClocksChange?.(
                                clocks.map((c, i) => (i === 0 ? { ...c, filled: Math.min(c.filled + 1, c.segments) } : c)),
                              );
                              if (pressureLine.trim()) onPushEvent(pressureLine.trim());
                              setPressureLine("");
                              onClose?.();
                            }}
                            className="rounded-xl bg-amber px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-void shadow-[0_8px_24px_-10px_rgba(216,178,90,0.7)] transition-colors hover:bg-amber/90"
                          >
                            Raise the pressure
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onClocksChange?.(clocks.filter((_, i) => i !== 0));
                            onClose?.();
                          }}
                          className="px-3 py-2 text-[12px] text-text-ghost transition-colors hover:text-rose"
                        >
                          {full ? "Clear it" : "The danger passed"}
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.16em] text-text-ghost">Name the pressure</label>
                      <input
                        value={pressureName}
                        onChange={(e) => setPressureName(e.target.value)}
                        placeholder="The tide rises"
                        autoFocus
                        className="mt-1.5 w-full rounded-xl border border-border bg-ink/40 px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost/50 focus:border-amber/35"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.16em] text-text-ghost">How close to breaking?</label>
                      <div className="mt-1.5 grid grid-cols-3 gap-2">
                        {([4, 6, 8] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setPressureSize(s)}
                            className={`rounded-xl border px-3 py-2 text-[13px] transition-colors ${
                              pressureSize === s ? "border-amber/45 bg-amber/[0.12] text-amber" : "border-border bg-ink/30 text-text-secondary hover:border-amber/30"
                            }`}
                          >
                            {s} segments
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        disabled={!pressureName.trim()}
                        onClick={() => {
                          onClocksChange?.([
                            ...clocks,
                            { id: `clock-${Date.now()}`, name: pressureName.trim(), segments: pressureSize, filled: 0, type: "danger" },
                          ]);
                          setPressureName("");
                          setPressureSize(6);
                          onClose?.();
                        }}
                        className="rounded-xl bg-amber px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-void shadow-[0_8px_24px_-10px_rgba(216,178,90,0.7)] transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                      >
                        Start the clock
                      </button>
                      <button onClick={() => onClose?.()} className="px-3 py-2 text-[12px] text-text-ghost transition-colors hover:text-text-secondary">
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Bargain — a price for a gain */}
              {focus === "bargain" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.16em] text-text-ghost">To</label>
                    <div className="relative mt-1.5">
                      <select
                        value={bargainTarget}
                        onChange={(e) => setBargainTarget(e.target.value)}
                        className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-border bg-ink/40 pl-3 pr-10 text-[14px] text-paper outline-none transition-colors focus:border-amber/35"
                      >
                        <option value="everyone" className="bg-elevated text-paper">Whole table</option>
                        {activeChars.map((c) => (
                          <option key={c.userId} value={c.userId} className="bg-elevated text-paper">{c.name}</option>
                        ))}
                      </select>
                      <svg
                        width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-ghost"
                      >
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.16em] text-text-ghost">The gain</label>
                    <textarea
                      value={bargainGain}
                      onChange={(e) => setBargainGain(e.target.value)}
                      placeholder="What they get…"
                      rows={2}
                      className="mt-1.5 w-full resize-none rounded-xl border border-border bg-ink/40 px-3.5 py-3 font-reading text-[15px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost/50 focus:border-amber/35"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.16em] text-text-ghost">The price</label>
                    <textarea
                      value={bargainPrice}
                      onChange={(e) => setBargainPrice(e.target.value)}
                      placeholder="What it costs them…"
                      rows={2}
                      className="mt-1.5 w-full resize-none rounded-xl border border-border bg-ink/40 px-3.5 py-3 font-reading text-[15px] leading-relaxed text-paper outline-none transition-colors placeholder:text-text-ghost/50 focus:border-rose/40"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={async () => {
                        if (!onOfferBargain || !bargainGain.trim() || !bargainPrice.trim()) return;
                        setBargainBusy(true);
                        try {
                          const label =
                            bargainTarget === "everyone"
                              ? "Whole table"
                              : activeChars.find((c) => c.userId === bargainTarget)?.name ?? "Someone";
                          await onOfferBargain({ targetUserId: bargainTarget, targetLabel: label, gain: bargainGain.trim(), price: bargainPrice.trim() });
                          setBargainGain("");
                          setBargainPrice("");
                          setBargainTarget("everyone");
                          onClose?.();
                        } finally {
                          setBargainBusy(false);
                        }
                      }}
                      disabled={!bargainGain.trim() || !bargainPrice.trim() || bargainBusy}
                      className="rounded-xl bg-amber px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-void shadow-[0_8px_24px_-10px_rgba(216,178,90,0.7)] transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      {bargainBusy ? "Offering…" : "Offer the bargain"}
                    </button>
                    <button onClick={() => onClose?.()} className="px-3 py-2 text-[12px] text-text-ghost transition-colors hover:text-text-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Scene Break */}
              {focus === "scene" ? (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Title (optional)</label>
                    <input
                      type="text"
                      value={sceneBreakTitle}
                      onChange={(e) => setSceneBreakTitle(e.target.value)}
                      placeholder="The Descent Begins..."
                      className="w-full mt-1.5 rounded-xl border border-border bg-ink/40 px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30"
                      autoFocus
                    />
                  </div>

                  {/* Mood pills */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Mood</label>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {(["tense", "calm", "ominous", "triumphant", "melancholy", "chaotic", "mysterious", "romantic"] as const).map((mood) => {
                        const moodColors: Record<string, string> = {
                          tense: "bg-rose/20 border-rose/40 text-rose",
                          calm: "bg-sage/20 border-sage/40 text-sage",
                          ominous: "bg-violet/20 border-violet/40 text-violet",
                          triumphant: "bg-amber/20 border-amber/40 text-amber",
                          melancholy: "bg-indigo-400/20 border-indigo-400/40 text-indigo-400",
                          chaotic: "bg-orange-400/20 border-orange-400/40 text-orange-400",
                          mysterious: "bg-cyan-400/20 border-cyan-400/40 text-cyan-400",
                          romantic: "bg-pink-400/20 border-pink-400/40 text-pink-400",
                        };
                        return (
                          <button
                            key={mood}
                            onClick={() => setSceneBreakMood(mood)}
                            className={`px-2.5 py-1.5 text-[10px] rounded border transition-all cursor-pointer capitalize ${
                              sceneBreakMood === mood
                                ? moodColors[mood]
                                : "bg-subtle/30 border-border text-text-tertiary hover:text-text-secondary"
                            }`}
                          >
                            {mood}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Aspect tags input */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Scene Aspects (optional)</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sceneBreakAspects.map((aspect) => (
                        <span
                          key={aspect}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-subtle/30 border border-border rounded-full text-[9px] text-text-secondary font-serif italic"
                        >
                          {aspect}
                          <button
                            onClick={() => setSceneBreakAspects((prev) => prev.filter((a) => a !== aspect))}
                            className="text-text-tertiary hover:text-text-secondary cursor-pointer"
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={sceneBreakAspectInput}
                      onChange={(e) => setSceneBreakAspectInput(e.target.value)}
                      placeholder="e.g. Torrential Rain, No Escape..."
                      className="w-full mt-1.5 rounded-xl border border-border bg-ink/40 px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addAspect();
                        }
                      }}
                    />
                    <p className="text-[8px] text-text-ghost mt-0.5">Press Enter or comma to add</p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => {
                        // Add any pending aspect text
                        const finalAspects = [...sceneBreakAspects];
                        if (sceneBreakAspectInput.trim()) {
                          finalAspects.push(sceneBreakAspectInput.trim());
                        }
                        onSceneBreak?.(sceneBreakTitle.trim(), sceneBreakMood, finalAspects.length > 0 ? finalAspects : undefined);
                        setSceneBreakTitle("");
                        setSceneBreakMood("ominous");
                        setSceneBreakAspects([]);
                        setSceneBreakAspectInput("");
                        onClose?.();
                      }}
                      className="rounded-xl bg-amber px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-void shadow-[0_8px_24px_-10px_rgba(216,178,90,0.7)] transition-colors hover:bg-amber/90"
                    >
                      Cut the scene
                    </button>
                    <button onClick={() => onClose?.()} className="px-3 py-2 text-[12px] text-text-ghost transition-colors hover:text-text-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Story Moment */}
              {focus === "story" ? (
                <div className="space-y-4">
                    {/* Text */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Text</label>
                      <textarea
                        value={storyMomentText}
                        onChange={(e) => setStoryMomentText(e.target.value)}
                        placeholder="The temple crumbles around them..."
                        className="mt-1.5 w-full min-h-20 resize-none rounded-xl border border-border bg-ink/40 px-3.5 py-3 font-reading text-[15px] leading-relaxed text-paper outline-none placeholder:text-text-ghost/50 focus:border-amber/35"
                        autoFocus
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setStoryMomentMajor((value) => !value)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${
                        storyMomentMajor
                          ? "border-amber/35 bg-amber/[0.06] text-amber"
                          : "border-border bg-subtle/20 text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider font-bold">Major Moment</span>
                      <span className={`relative h-[18px] w-8 rounded-full transition-colors ${storyMomentMajor ? "bg-amber" : "bg-subtle"}`}>
                        <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-void transition-transform ${storyMomentMajor ? "translate-x-4" : "translate-x-0.5"}`} />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStoryMomentLeavesMark((value) => !value)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${
                        storyMomentLeavesMark
                          ? "border-rose/35 bg-rose/[0.06] text-rose"
                          : "border-border bg-subtle/20 text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider font-bold">Leaves a Mark</span>
                      <span className={`relative h-[18px] w-8 rounded-full transition-colors ${storyMomentLeavesMark ? "bg-rose" : "bg-subtle"}`}>
                        <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-void transition-transform ${storyMomentLeavesMark ? "translate-x-4" : "translate-x-0.5"}`} />
                      </span>
                    </button>

                    {/* Subtext */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Subtext (optional)</label>
                      <input
                        type="text"
                        value={storyMomentSubtext}
                        onChange={(e) => setStoryMomentSubtext(e.target.value)}
                        placeholder="Optional secondary line..."
                        className="w-full mt-1.5 rounded-xl border border-border bg-ink/40 px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30"
                      />
                    </div>

                    {/* Mood pills */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Mood</label>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {(["tense", "calm", "ominous", "triumphant", "melancholy", "chaotic", "mysterious", "romantic", "death", "betrayal"] as const).map((mood) => {
                          const moodColors: Record<string, string> = {
                            tense: "bg-rose/20 border-rose/40 text-rose",
                            calm: "bg-sage/20 border-sage/40 text-sage",
                            ominous: "bg-violet/20 border-violet/40 text-violet",
                            triumphant: "bg-amber/20 border-amber/40 text-amber",
                            melancholy: "bg-indigo-400/20 border-indigo-400/40 text-indigo-400",
                            chaotic: "bg-orange-400/20 border-orange-400/40 text-orange-400",
                            mysterious: "bg-cyan-400/20 border-cyan-400/40 text-cyan-400",
                            romantic: "bg-pink-400/20 border-pink-400/40 text-pink-400",
                            death: "bg-red-900/30 border-red-700/50 text-red-400",
                            betrayal: "bg-fuchsia-900/30 border-fuchsia-700/50 text-fuchsia-400",
                          };
                          return (
                            <button
                              key={mood}
                              onClick={() => setStoryMomentMood(mood)}
                              className={`px-2.5 py-1.5 text-[10px] rounded border transition-all cursor-pointer capitalize ${
                                storyMomentMood === mood
                                  ? moodColors[mood]
                                  : "bg-subtle/30 border-border text-text-tertiary hover:text-text-secondary"
                              }`}
                            >
                              {mood}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => {
                          if (storyMomentText.trim()) {
                            onStoryMoment?.(
                              storyMomentText.trim(),
                              storyMomentMood,
                              storyMomentSubtext.trim() || undefined,
                              {
                                importance: storyMomentMajor ? "major" : "normal",
                                leavesMark: storyMomentLeavesMark,
                              },
                            );
                            setStoryMomentText("");
                            setStoryMomentSubtext("");
                            setStoryMomentMood("ominous");
                            setStoryMomentMajor(false);
                            setStoryMomentLeavesMark(false);
                            onClose?.();
                          }
                        }}
                        disabled={!storyMomentText.trim()}
                        className="rounded-xl bg-amber px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-void shadow-[0_8px_24px_-10px_rgba(216,178,90,0.7)] transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                      >
                        Play the moment
                      </button>
                      <button onClick={() => onClose?.()} className="px-3 py-2 text-[12px] text-text-ghost transition-colors hover:text-text-secondary">
                        Cancel
                      </button>
                    </div>
                </div>
              ) : null}

              {/* Illustration */}
              {focus === "illustration" ? (
                <div className="space-y-4">
                    {/* Image URL */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Image URL</label>
                      <input
                        type="text"
                        value={illustrationUrl}
                        onChange={(e) => setIllustrationUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full mt-1.5 rounded-xl border border-border bg-ink/40 px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30"
                        autoFocus
                      />
                      <p className="text-[9px] text-text-ghost mt-1">
                        Paste any image URL.{" "}
                        <a href="https://unsplash.com/s/photos/fantasy-landscape" target="_blank" rel="noopener noreferrer" className="text-amber/40 hover:text-amber/60 underline underline-offset-2 transition-colors">
                          Browse Unsplash for free images
                        </a>
                      </p>
                    </div>

                    {/* Image preview */}
                    {illustrationUrl.trim() && (
                      <div className="rounded-lg overflow-hidden border border-border bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={illustrationUrl.trim()}
                          alt="Preview"
                          className="w-full max-h-32 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          onLoad={(e) => { (e.target as HTMLImageElement).style.display = "block"; }}
                        />
                      </div>
                    )}

                    {/* Caption */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Caption (optional)</label>
                      <textarea
                        value={illustrationCaption}
                        onChange={(e) => setIllustrationCaption(e.target.value)}
                        placeholder="What does the party see?"
                        className="w-full mt-1.5 rounded-xl border border-border bg-ink/40 px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30 resize-none"
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => {
                          if (illustrationUrl.trim()) {
                            onAddIllustration?.(illustrationUrl.trim(), illustrationCaption.trim() || undefined);
                            setIllustrationUrl("");
                            setIllustrationCaption("");
                            onClose?.();
                          }
                        }}
                        disabled={!illustrationUrl.trim()}
                        className="rounded-xl bg-amber px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-void shadow-[0_8px_24px_-10px_rgba(216,178,90,0.7)] transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                      >
                        Place in the story
                      </button>
                      <button onClick={() => onClose?.()} className="px-3 py-2 text-[12px] text-text-ghost transition-colors hover:text-text-secondary">
                        Cancel
                      </button>
                    </div>
                </div>
              ) : null}

            </div>
          </div>
          )}

        </div>

      </div>
    );
  }

  // ── Player View ──────────────────────────────────────────────
  const stats = myCharacter ? parseStats(myCharacter.stats) : null;

  // Check if the current player is spectating (dead/spectating, no active char)
  const myUserId = myCharacter?.userId;
  const isSpectating = myUserId && !myCharacter?.status?.match(/^active$/) && !characters.some(
    (c) => c.userId === myUserId && c.id !== myCharacter?.id && c.status === "active"
  );

  return (
    <div className={`${visibilityClass} h-full flex-col border-l border-border-subtle bg-void shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 shrink-0`}>
      <div className="p-6 border-b border-border-subtle bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-rose/20 flex items-center justify-center font-display text-rose text-lg border border-rose/30">
            {myCharacter ? myCharacter.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-paper">{myCharacter?.name ?? "No Character"}</h2>
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest">{myCharacter?.traits ?? "Create a character to play"}</p>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-7 h-7 rounded-full bg-subtle/30 border border-border flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-subtle/50 transition-all cursor-pointer"
              title="Collapse Character Engine"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Player-visible tension clocks */}
      {clocks.length > 0 && (
        <div className="px-6 py-3 border-b border-border-subtle bg-black/20">
          <div className="flex flex-wrap gap-3 justify-center">
            {clocks.map((clock) => (
              <ProgressClock
                key={clock.id}
                clock={clock}
                size={40}
                interactive={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Spectator banner */}
      {isSpectating && myCharacter && (
        <div className="px-6 py-4 bg-gradient-to-r from-violet-500/10 to-rose/10 border-b border-border-subtle">
          <p className="text-xs text-text-secondary font-serif italic leading-relaxed">
            Your character&rsquo;s story has ended. When the GM invites you, you can create a new character from the campaign hub.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:rgba(224,169,62,0.22)_transparent]">
        {!myCharacter ? (
          <div className="text-center py-12">
            <p className="text-text-tertiary text-xs font-serif italic">Join the campaign to see your character sheet here.</p>
          </div>
        ) : stats ? (
          <>
            {/* Aspect */}
            {stats.aspect && (
              <div className="mb-6">
                <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-text-tertiary border-b border-border pb-2 mb-3">Defining Belief</h3>
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-violet-300 font-serif italic leading-relaxed">&ldquo;{stats.aspect}&rdquo;</p>
                  <p className="text-[9px] text-violet-400/40 uppercase tracking-widest mt-2">Your character&rsquo;s essence</p>
                </div>
              </div>
            )}

          </>
        ) : (
          <div className="space-y-4">
            {myCharacter.description && (
              <div>
                <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-text-tertiary border-b border-border pb-2 mb-3">About</h3>
                <p className="text-xs text-text-secondary font-serif leading-relaxed">{myCharacter.description}</p>
              </div>
            )}
            {myCharacter.traits && (
              <div>
                <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-text-tertiary border-b border-border pb-2 mb-3">Traits</h3>
                <p className="text-xs text-text-secondary font-serif leading-relaxed">{myCharacter.traits}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
