"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PlayerCharacter } from "@/types/campaign";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";

/**
 * The Director's moves as SENTENCES, not forms. A move is a line of prose
 * with blanks — you complete the sentence, then press the seal. Inline
 * underlined slots replace boxed inputs; choices are words you underline,
 * not dropdowns. "The gameplay is the writing" applies to the Director too.
 *
 * Same commit contract as the retired form version — QuillStation and the
 * pages pass the identical handlers.
 */

export type RitualFocus = "roll" | "scene" | "story" | "illustration" | "bargain" | "pressure";

export const RITUAL_META: Record<RitualFocus, { title: string; hint: string }> = {
  roll: { title: "Call a roll", hint: "Put the moment in the hands of the dice." },
  bargain: { title: "Offer a bargain", hint: "A price for a gain — let them choose." },
  scene: { title: "Scene break", hint: "Cut, and move the story on." },
  story: { title: "Story moment", hint: "A held, full-bleed beat over the table." },
  illustration: { title: "Add an illustration", hint: "Drop an image into the page." },
  pressure: { title: "The pressure", hint: "A clock the whole table can feel rising." },
};

// ── The sentence kit ───────────────────────────────────────

/** An inline blank in the sentence — a dashed underline you write on. */
function Blank({
  value,
  onChange,
  placeholder,
  autoFocus,
  className = "",
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  className?: string;
  onEnter?: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onKeyDown={
        onEnter
          ? (e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                onEnter();
              }
            }
          : undefined
      }
      size={Math.max(value.length, placeholder.length) + 2}
      className={`ink-caret inline-block max-w-full border-b border-dashed border-amber/40 bg-transparent px-1 font-reading text-[15px] text-paper outline-none transition-colors placeholder:italic placeholder:text-text-ghost focus:border-amber/80 ${className}`}
      style={{ ["--ink-self" as string]: "var(--ink-gm)" }}
    />
  );
}

/** A full-width written line — for stakes and longer clauses. */
function BlankLine({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={1}
      className="ink-caret block w-full resize-none overflow-hidden border-b border-dashed border-amber/40 bg-transparent px-1 font-reading text-[15px] leading-[1.7] text-paper outline-none transition-colors placeholder:italic placeholder:text-text-ghost focus:border-amber/80"
      style={{ ["--ink-self" as string]: "var(--ink-gm)" }}
    />
  );
}

/** Choose by underlining a word, not by opening a dropdown. */
function WordChoice({
  options,
  value,
  onChange,
  colorFor,
}: {
  options: Array<{ key: string; label: string }>;
  value: string;
  onChange: (key: string) => void;
  colorFor?: (key: string) => string;
}) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1 align-baseline">
      {options.map((option) => {
        const selected = value === option.key;
        const color = colorFor?.(option.key);
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`cursor-pointer font-reading text-[15px] transition-all ${
              selected
                ? `underline decoration-2 underline-offset-4 ${color ?? "text-amber decoration-amber/70"}`
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}

/** A phrase you underline to mean it — fatal stakes, major beat, leaves a mark. */
function ToggleWord({
  on,
  onToggle,
  tone = "amber",
  children,
}: {
  on: boolean;
  onToggle: () => void;
  tone?: "amber" | "rose";
  children: ReactNode;
}) {
  const toneOn = tone === "rose" ? "text-rose decoration-rose/70" : "text-amber decoration-amber/70";
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`cursor-pointer font-reading text-[14px] italic transition-all ${
        on ? `underline decoration-2 underline-offset-4 ${toneOn}` : "text-text-tertiary hover:text-text-secondary"
      }`}
      aria-pressed={on}
    >
      {children}
    </button>
  );
}

/** The seal at the end of the sentence. */
function Seal({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="wax-seal cursor-pointer px-5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]"
    >
      {children}
    </button>
  );
}

const MOODS = [
  { key: "tense", className: "text-rose decoration-rose/70" },
  { key: "calm", className: "text-sage decoration-sage/70" },
  { key: "ominous", className: "text-violet decoration-violet/70" },
  { key: "triumphant", className: "text-amber decoration-amber/70" },
  { key: "melancholy", className: "text-indigo-400 decoration-indigo-400/70" },
  { key: "chaotic", className: "text-orange-400 decoration-orange-400/70" },
  { key: "mysterious", className: "text-cyan-400 decoration-cyan-400/70" },
  { key: "romantic", className: "text-pink-400 decoration-pink-400/70" },
] as const;

const STORY_MOODS = [
  ...MOODS,
  { key: "death", className: "text-red-400 decoration-red-700/70" },
  { key: "betrayal", className: "text-fuchsia-400 decoration-fuchsia-700/70" },
] as const;

function moodColor(moods: ReadonlyArray<{ key: string; className: string }>, key: string) {
  return moods.find((m) => m.key === key)?.className ?? "text-amber decoration-amber/70";
}

const STAKE_PRESETS = [
  {
    label: "Pressure",
    reason: "Act before the danger escalates.",
    success: "They seize the opening and keep control.",
    failure: "The situation worsens before anyone can stop it.",
  },
  {
    label: "Discovery",
    reason: "Uncover what is really happening here.",
    success: "They read the signs clearly and gain leverage.",
    failure: "They learn the truth, but too late or at a cost.",
  },
  {
    label: "Escape",
    reason: "Get clear before the trap closes.",
    success: "They slip free with seconds to spare.",
    failure: "The way out narrows and someone is exposed.",
  },
] as const;

// ── The moves ──────────────────────────────────────────────

interface DirectorMovesProps {
  focus: RitualFocus;
  onClose: () => void;
  activeChars: PlayerCharacter[];
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
  clocks?: ProgressClockData[];
  onClocksChange?: (clocks: ProgressClockData[]) => void;
}

export default function DirectorMoves({
  focus,
  onClose,
  activeChars,
  onRequestRoll,
  onPushEvent,
  onSceneBreak,
  onStoryMoment,
  onAddIllustration,
  onOfferBargain,
  clocks = [],
  onClocksChange,
}: DirectorMovesProps) {
  // Roll
  const [rollTarget, setRollTarget] = useState("everyone");
  const [rollApproach, setRollApproach] = useState("Bold");
  const [rollReason, setRollReason] = useState("");
  const [rollOnSuccess, setRollOnSuccess] = useState("");
  const [rollOnFailure, setRollOnFailure] = useState("");
  const [rollFatal, setRollFatal] = useState(false);

  // Bargain
  const [bargainTarget, setBargainTarget] = useState("everyone");
  const [bargainGain, setBargainGain] = useState("");
  const [bargainPrice, setBargainPrice] = useState("");
  const [bargainBusy, setBargainBusy] = useState(false);

  // Pressure
  const [pressureName, setPressureName] = useState("");
  const [pressureLine, setPressureLine] = useState("");
  const [pressureSize, setPressureSize] = useState<4 | 6 | 8>(6);

  // Scene break
  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneMood, setSceneMood] = useState("ominous");
  const [sceneAspects, setSceneAspects] = useState<string[]>([]);
  const [sceneAspectInput, setSceneAspectInput] = useState("");

  // Story moment
  const [momentText, setMomentText] = useState("");
  const [momentSubtext, setMomentSubtext] = useState("");
  const [momentMood, setMomentMood] = useState("ominous");
  const [momentMajor, setMomentMajor] = useState(false);
  const [momentMark, setMomentMark] = useState(false);

  // Illustration
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");

  const targetOptions = [
    { key: "everyone", label: "the whole table" },
    ...activeChars.map((c) => ({ key: c.userId, label: c.name.split(" ")[0] })),
  ];

  const addAspect = () => {
    const tag = sceneAspectInput.trim();
    if (tag && !sceneAspects.includes(tag)) setSceneAspects((prev) => [...prev, tag]);
    setSceneAspectInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-amber/15 pb-3">
        <div>
          <h3 className="font-display text-[18px] leading-tight text-paper">{RITUAL_META[focus].title}</h3>
          <p className="table-murmur mt-0.5 !text-[11.5px]">{RITUAL_META[focus].hint}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-text-ghost transition-colors hover:text-paper"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* ── Call a roll ── */}
      {focus === "roll" && (
        <div className="space-y-3.5">
          <p className="font-reading text-[15px] leading-[2] text-paper/85">
            Ask <WordChoice options={targetOptions} value={rollTarget} onChange={setRollTarget} /> to
            meet it with{" "}
            <WordChoice
              options={[
                { key: "Bold", label: "boldness" },
                { key: "Keen", label: "keenness" },
                { key: "Subtle", label: "subtlety" },
              ]}
              value={rollApproach}
              onChange={setRollApproach}
            />
            ,
          </p>
          <div className="font-reading text-[15px] leading-[2] text-paper/85">
            <span className="text-text-secondary">for </span>
            <BlankLine
              value={rollReason}
              onChange={setRollReason}
              placeholder="what hangs in the balance…"
              autoFocus
            />
          </div>
          <div className="font-reading text-[14px] leading-[1.9]">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-sage">holds </span>
            <BlankLine value={rollOnSuccess} onChange={setRollOnSuccess} placeholder="what they win… (optional)" />
          </div>
          <div className="font-reading text-[14px] leading-[1.9]">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose">breaks </span>
            <BlankLine value={rollOnFailure} onChange={setRollOnFailure} placeholder="what it costs… (optional)" />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">borrow a stake:</span>
            {STAKE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setRollReason(preset.reason);
                  setRollOnSuccess(preset.success);
                  setRollOnFailure(preset.failure);
                }}
                className="table-action cursor-pointer text-lavender/80 transition-colors hover:text-lavender"
                title={preset.reason}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
            <ToggleWord on={rollFatal} onToggle={() => setRollFatal((v) => !v)} tone="rose">
              ⚠ at fatal stakes — a failure is the end
            </ToggleWord>
            <Seal
              disabled={!rollReason.trim()}
              onClick={() => {
                onRequestRoll(
                  rollTarget,
                  rollApproach,
                  rollReason.trim(),
                  rollOnSuccess.trim(),
                  rollOnFailure.trim(),
                  rollFatal,
                );
                onClose();
              }}
            >
              Call it
            </Seal>
          </div>
        </div>
      )}

      {/* ── Offer a bargain ── */}
      {focus === "bargain" && (
        <div className="space-y-3.5">
          <p className="font-reading text-[15px] leading-[2] text-paper/85">
            Offer <WordChoice options={targetOptions} value={bargainTarget} onChange={setBargainTarget} /> a
            bargain:
          </p>
          <div className="font-reading text-[15px] leading-[1.9]">
            <span className="text-sage">they gain </span>
            <BlankLine value={bargainGain} onChange={setBargainGain} placeholder="what the world grants…" autoFocus />
          </div>
          <div className="font-reading text-[15px] leading-[1.9]">
            <span className="text-rose">for the price of </span>
            <BlankLine value={bargainPrice} onChange={setBargainPrice} placeholder="what it takes in return…" />
          </div>
          <div className="flex justify-end border-t border-border/50 pt-3">
            <Seal
              disabled={!bargainGain.trim() || !bargainPrice.trim() || bargainBusy}
              onClick={async () => {
                if (!onOfferBargain) return;
                setBargainBusy(true);
                try {
                  const label =
                    bargainTarget === "everyone"
                      ? "Whole table"
                      : activeChars.find((c) => c.userId === bargainTarget)?.name ?? "Someone";
                  await onOfferBargain({
                    targetUserId: bargainTarget,
                    targetLabel: label,
                    gain: bargainGain.trim(),
                    price: bargainPrice.trim(),
                  });
                  setBargainGain("");
                  setBargainPrice("");
                  setBargainTarget("everyone");
                  onClose();
                } finally {
                  setBargainBusy(false);
                }
              }}
            >
              {bargainBusy ? "Offering…" : "Offer it"}
            </Seal>
          </div>
        </div>
      )}

      {/* ── Scene break ── */}
      {focus === "scene" && (
        <div className="space-y-3.5">
          <p className="font-reading text-[15px] leading-[2.2] text-paper/85">
            Cut the scene — call it{" "}
            <Blank value={sceneTitle} onChange={setSceneTitle} placeholder="untitled" autoFocus />, struck
            in a{" "}
            <WordChoice
              options={MOODS.map((m) => ({ key: m.key, label: m.key }))}
              value={sceneMood}
              onChange={setSceneMood}
              colorFor={(key) => moodColor(MOODS, key)}
            />{" "}
            key.
          </p>
          <div className="font-reading text-[14px] leading-[2]">
            <span className="text-text-secondary">carrying </span>
            {sceneAspects.map((aspect) => (
              <button
                key={aspect}
                type="button"
                onClick={() => setSceneAspects((prev) => prev.filter((a) => a !== aspect))}
                className="mr-2 cursor-pointer italic text-lavender underline decoration-lavender/40 underline-offset-4 transition-colors hover:text-rose hover:line-through"
                title="Strike this aspect out"
              >
                {aspect}
              </button>
            ))}
            <Blank
              value={sceneAspectInput}
              onChange={setSceneAspectInput}
              placeholder="an aspect, if any… (enter to pin)"
              onEnter={addAspect}
            />
          </div>
          <div className="flex justify-end border-t border-border/50 pt-3">
            <Seal
              onClick={() => {
                const finalAspects = [...sceneAspects];
                if (sceneAspectInput.trim()) finalAspects.push(sceneAspectInput.trim());
                onSceneBreak?.(sceneTitle.trim(), sceneMood, finalAspects.length > 0 ? finalAspects : undefined);
                setSceneTitle("");
                setSceneMood("ominous");
                setSceneAspects([]);
                setSceneAspectInput("");
                onClose();
              }}
            >
              Cut
            </Seal>
          </div>
        </div>
      )}

      {/* ── Story moment ── */}
      {focus === "story" && (
        <div className="space-y-3.5">
          <div className="font-reading text-[15px] leading-[1.9] text-paper/85">
            <span className="text-text-secondary">Hold the table on — </span>
            <BlankLine
              value={momentText}
              onChange={setMomentText}
              placeholder="the beat everyone must feel…"
              autoFocus
            />
          </div>
          <div className="font-reading text-[14px] leading-[1.9]">
            <span className="text-text-secondary">beneath it, </span>
            <Blank value={momentSubtext} onChange={setMomentSubtext} placeholder="a quieter line… (optional)" />
          </div>
          <p className="font-reading text-[15px] leading-[2.2] text-paper/85">
            lit{" "}
            <WordChoice
              options={STORY_MOODS.map((m) => ({ key: m.key, label: m.key }))}
              value={momentMood}
              onChange={setMomentMood}
              colorFor={(key) => moodColor(STORY_MOODS, key)}
            />
            .
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <ToggleWord on={momentMajor} onToggle={() => setMomentMajor((v) => !v)}>
              a major beat — hold it longer
            </ToggleWord>
            <ToggleWord on={momentMark} onToggle={() => setMomentMark((v) => !v)} tone="rose">
              it leaves a mark on them
            </ToggleWord>
          </div>
          <div className="flex justify-end border-t border-border/50 pt-3">
            <Seal
              disabled={!momentText.trim()}
              onClick={() => {
                onStoryMoment?.(momentText.trim(), momentMood, momentSubtext.trim() || undefined, {
                  importance: momentMajor ? "major" : "normal",
                  leavesMark: momentMark,
                });
                setMomentText("");
                setMomentSubtext("");
                setMomentMood("ominous");
                setMomentMajor(false);
                setMomentMark(false);
                onClose();
              }}
            >
              Play it
            </Seal>
          </div>
        </div>
      )}

      {/* ── Illustration ── */}
      {focus === "illustration" && (
        <div className="space-y-3.5">
          <div className="font-reading text-[15px] leading-[1.9] text-paper/85">
            <span className="text-text-secondary">Place an image — </span>
            <BlankLine value={imageUrl} onChange={setImageUrl} placeholder="paste any image address…" autoFocus />
            <p className="mt-1 text-[10px] text-text-ghost">
              <a
                href="https://unsplash.com/s/photos/fantasy-landscape"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-amber/70"
              >
                Browse Unsplash for free images
              </a>
            </p>
          </div>
          {imageUrl.trim() && (
            <div className="overflow-hidden rounded-md border border-border bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl.trim()}
                alt="Preview"
                className="max-h-32 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                onLoad={(e) => {
                  (e.target as HTMLImageElement).style.display = "block";
                }}
              />
            </div>
          )}
          <div className="font-reading text-[14px] leading-[1.9]">
            <span className="text-text-secondary">captioned </span>
            <Blank value={imageCaption} onChange={setImageCaption} placeholder="what the party sees… (optional)" />
          </div>
          <div className="flex justify-end border-t border-border/50 pt-3">
            <Seal
              disabled={!imageUrl.trim()}
              onClick={() => {
                onAddIllustration?.(imageUrl.trim(), imageCaption.trim() || undefined);
                setImageUrl("");
                setImageCaption("");
                onClose();
              }}
            >
              Place it
            </Seal>
          </div>
        </div>
      )}

      {/* ── The pressure ── */}
      {focus === "pressure" &&
        (() => {
          const clock = clocks.length > 0 ? clocks[0] : null;
          if (clock) {
            const full = clock.filled >= clock.segments;
            return (
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-reading text-[15px] text-paper/90">{clock.name}</p>
                    <div className="mt-1.5 flex gap-1">
                      {Array.from({ length: clock.segments }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${i < clock.filled ? "bg-amber" : "bg-subtle"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[12px] tabular-nums text-amber">
                    {clock.filled}/{clock.segments}
                  </span>
                </div>

                {!full && (
                  <div className="font-reading text-[15px] leading-[1.9] text-paper/85">
                    <span className="text-text-secondary">What tightens? </span>
                    <BlankLine
                      value={pressureLine}
                      onChange={setPressureLine}
                      placeholder="one line for the page… (optional)"
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClocksChange?.(clocks.filter((_, i) => i !== 0));
                      onClose();
                    }}
                    className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-rose"
                  >
                    {full ? "Clear it" : "The danger passed"}
                  </button>
                  {full ? (
                    <span className="table-murmur text-amber/80">the clock is full — let it break.</span>
                  ) : (
                    <Seal
                      onClick={() => {
                        onClocksChange?.(
                          clocks.map((c, i) =>
                            i === 0 ? { ...c, filled: Math.min(c.filled + 1, c.segments) } : c,
                          ),
                        );
                        if (pressureLine.trim()) onPushEvent(pressureLine.trim());
                        setPressureLine("");
                        onClose();
                      }}
                    >
                      Raise it
                    </Seal>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div className="space-y-3.5">
              <p className="font-reading text-[15px] leading-[2.2] text-paper/85">
                Start a clock —{" "}
                <Blank value={pressureName} onChange={setPressureName} placeholder="name the danger…" autoFocus />,{" "}
                <WordChoice
                  options={[
                    { key: "4", label: "four" },
                    { key: "6", label: "six" },
                    { key: "8", label: "eight" },
                  ]}
                  value={String(pressureSize)}
                  onChange={(key) => setPressureSize(Number(key) as 4 | 6 | 8)}
                />{" "}
                turns of the screw from breaking.
              </p>
              <div className="flex justify-end border-t border-border/50 pt-3">
                <Seal
                  disabled={!pressureName.trim()}
                  onClick={() => {
                    onClocksChange?.([
                      ...clocks,
                      {
                        id: `clock-${Date.now()}`,
                        name: pressureName.trim(),
                        segments: pressureSize,
                        filled: 0,
                        type: "danger",
                      },
                    ]);
                    setPressureName("");
                    setPressureSize(6);
                    onClose();
                  }}
                >
                  Start it
                </Seal>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
