"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * The cast on the page — the dice ritual in the manuscript's language.
 * The room dims, a casting slip of parchment lies over the table, the
 * Director's question sits at its head in the written hand, and two bone
 * dice tumble onto the paper. The result doesn't glow — it STAMPS.
 *
 * The state machine (phases, timings, hold-the-result, reset-on-new-request,
 * focus trap) is inherited unchanged from the retired DiceRollerRitual —
 * only the presentation was rebuilt. Server-authoritative: the client sends
 * intent, the dice animate to the returned values.
 */

const APPROACHES = ["Bold", "Keen", "Subtle"] as const;
type Approach = (typeof APPROACHES)[number];

export interface RollResult {
  dice: [number, number];
  modifier: number;
  total: number;
  tier: "success" | "partial" | "failure";
}

interface DiceCastProps {
  visible: boolean;
  onClose: () => void;
  onRollSubmit: (intent: { attribute: string; aspectInvoked: boolean }) => Promise<RollResult>;
  aspect?: string | null;
  /** Whether the character may still spend their aspect this scene. */
  aspectAvailable?: boolean;
  preSelectedAttribute?: string | null;
  rollReason?: string | null;
  rollOnSuccess?: string | null;
  rollOnFailure?: string | null;
  rollFatal?: boolean;
}

type Phase = "idle" | "casting" | "settling" | "revealed";
type RollContext = {
  reason: string | null;
  onSuccess: string | null;
  onFailure: string | null;
  fatal: boolean;
};

const PIP_LAYOUTS: Record<number, Array<{ x: number; y: number }>> = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 28, y: 28 }, { x: 72, y: 72 }],
  3: [{ x: 24, y: 24 }, { x: 50, y: 50 }, { x: 76, y: 76 }],
  4: [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 28, y: 72 }, { x: 72, y: 72 }],
  5: [{ x: 24, y: 24 }, { x: 76, y: 24 }, { x: 50, y: 50 }, { x: 24, y: 76 }, { x: 76, y: 76 }],
  6: [{ x: 28, y: 26 }, { x: 72, y: 26 }, { x: 28, y: 50 }, { x: 72, y: 50 }, { x: 28, y: 74 }, { x: 72, y: 74 }],
};

const MIN_CAST_MS = 1900;
const SETTLE_BEAT_MS = 550;
const RESULT_VIEW_MS = 4200;

// ── The stamped verdicts ───────────────────────────────────

function getProclamation(total: number, fatal: boolean) {
  if (total >= 10) {
    return {
      stamp: "it holds.",
      title: "The world bends to your will.",
      sub: "What you reached for, you take. Whole.",
      tone: "success" as const,
    };
  }
  if (total >= 7) {
    return {
      stamp: "it holds — at a price.",
      title: "The thread frays — but it holds.",
      sub: "You have it. Something has been spent.",
      tone: "partial" as const,
    };
  }
  if (fatal) {
    return {
      stamp: "the toll is paid.",
      title: "The dark accepts what you have given.",
      sub: "This was the toll. It is paid.",
      tone: "fatal" as const,
    };
  }
  return {
    stamp: "the world refuses.",
    title: "The mountain refuses you.",
    sub: "The world moves on without your hand.",
    tone: "failure" as const,
  };
}

const TONE_INK: Record<string, string> = {
  success: "text-sage",
  partial: "text-amber",
  failure: "text-rose",
  fatal: "text-rose",
};

const TONE_BORDER: Record<string, string> = {
  success: "border-sage/50",
  partial: "border-amber/50",
  failure: "border-rose/50",
  fatal: "border-rose/70",
};

// ── A bone die tumbling onto the paper ─────────────────────

function BoneDie({ value, phase, index }: { value: number | null; phase: Phase; index: number }) {
  const [display, setDisplay] = useState<number>(value ?? 1);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (phase === "casting") {
      const id = setInterval(() => setDisplay(Math.floor(Math.random() * 6) + 1), 90);
      return () => clearInterval(id);
    }
  }, [phase, value]);

  const showValue = phase === "settling" || phase === "revealed";
  const displayValue = showValue ? (value ?? display) : display;
  const pips = PIP_LAYOUTS[displayValue] ?? [];
  const restRotate = index === 0 ? -7 : 5;

  return (
    <motion.div
      animate={
        phase === "casting" && !reduceMotion
          ? {
              rotateZ: [0, index === 0 ? -400 : 380, restRotate],
              y: [-110, 40, -10, 0],
              x: [index === 0 ? -30 : 30, index === 0 ? -8 : 8, 0],
              scale: [0.6, 1.1, 0.96, 1],
            }
          : phase === "casting"
            ? { rotateZ: restRotate, y: 0, scale: 1 }
            : { rotateZ: showValue ? restRotate : 0, y: 0, scale: 1 }
      }
      transition={
        phase === "casting" && !reduceMotion
          ? { duration: 1.7, ease: [0.2, 0.9, 0.3, 1], times: [0, 0.55, 0.8, 1] }
          : { duration: 0.25 }
      }
      className="relative h-14 w-14 rounded-[10px] sm:h-16 sm:w-16"
      style={{
        background: "linear-gradient(145deg, #f4ecd8 0%, #e3d7ba 55%, #cfc19d 100%)",
        boxShadow:
          "0 6px 14px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(120,100,60,0.3)",
      }}
      aria-hidden="true"
    >
      {pips.map((pip, i) => (
        <span
          key={i}
          className="absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[10px] sm:w-[10px]"
          style={{
            left: `${pip.x}%`,
            top: `${pip.y}%`,
            background: "radial-gradient(circle at 35% 30%, #3a3630, #17140f)",
            boxShadow: "inset 0 1px 1px rgba(0,0,0,0.6)",
          }}
        />
      ))}
    </motion.div>
  );
}

// ── The cast ───────────────────────────────────────────────

export default function DiceCast({
  visible,
  onClose,
  onRollSubmit,
  aspect = null,
  aspectAvailable = true,
  preSelectedAttribute = null,
  rollReason = null,
  rollOnSuccess = null,
  rollOnFailure = null,
  rollFatal = false,
}: DiceCastProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [die1, setDie1] = useState<number | null>(null);
  const [die2, setDie2] = useState<number | null>(null);
  const [serverResult, setServerResult] = useState<RollResult | null>(null);
  const [selectedApproach, setSelectedApproach] = useState<Approach | null>(null);
  const [aspectInvoked, setAspectInvoked] = useState(false);
  const [holdingResult, setHoldingResult] = useState(false);
  const [rollContext, setRollContext] = useState<RollContext | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror `visible` for timer callbacks: when a new roll request arrives
  // while the result is on screen, `visible` stays true through the close,
  // so the visibility-driven reset effect below never fires.
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // First-roll primer: explain 2d6 tiers + the aspect trump once, at the
  // point of use. Client-only portal → lazy storage read is hydration-safe.
  const [primerSeen, setPrimerSeen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem("quiloria.dice.primerSeen") === "1";
    } catch {
      return true;
    }
  });
  const dismissPrimer = () => {
    setPrimerSeen(true);
    try {
      localStorage.setItem("quiloria.dice.primerSeen", "1");
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (preSelectedAttribute) {
      const mapped = APPROACHES.find((a) => a.toLowerCase() === preSelectedAttribute.toLowerCase());
      if (mapped) {
        const timeoutId = setTimeout(() => setSelectedApproach(mapped), 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [preSelectedAttribute]);

  const total = serverResult?.total ?? null;
  const displayedReason = rollContext?.reason ?? rollReason;
  const displayedOnSuccess = rollContext?.onSuccess ?? rollOnSuccess;
  const displayedOnFailure = rollContext?.onFailure ?? rollOnFailure;
  const displayedFatal = rollContext?.fatal ?? rollFatal;

  const proclamation = total !== null ? getProclamation(total, displayedFatal && total < 7) : null;
  const effectiveVisible = visible || holdingResult;

  const cleanupTimers = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  };

  const resetCast = useCallback(() => {
    setDie1(null);
    setDie2(null);
    setServerResult(null);
    setPhase("idle");
    // Re-prime from the (possibly new) pending request — the
    // preSelectedAttribute effect above won't re-fire on its own.
    const mapped = preSelectedAttribute
      ? APPROACHES.find((a) => a.toLowerCase() === preSelectedAttribute.toLowerCase()) ?? null
      : null;
    setSelectedApproach(mapped);
    setAspectInvoked(false);
  }, [preSelectedAttribute]);

  const handleClose = useCallback(() => {
    cleanupTimers();
    setHoldingResult(false);
    setRollContext(null);
    // A pending roll request keeps the dialog forced open, so the
    // visibility-driven reset never fires — reset here so the next
    // request starts from "idle" instead of a stuck result screen.
    if (visibleRef.current) resetCast();
    onClose();
  }, [onClose, resetCast]);

  const executeRoll = async () => {
    if (phase !== "idle") return;
    setRollContext({
      reason: rollReason,
      onSuccess: rollOnSuccess,
      onFailure: rollOnFailure,
      fatal: rollFatal,
    });
    setHoldingResult(true);
    setPhase("casting");
    setDie1(null);
    setDie2(null);
    setServerResult(null);

    const startedAt = Date.now();
    try {
      const result = await onRollSubmit({
        attribute: selectedApproach ?? "none",
        aspectInvoked,
      });
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_CAST_MS - elapsed);
      await new Promise((r) => setTimeout(r, wait));

      setDie1(result.dice[0]);
      setDie2(result.dice[1]);
      setServerResult(result);
      setPhase("settling");

      revealTimerRef.current = setTimeout(() => setPhase("revealed"), SETTLE_BEAT_MS);
    } catch {
      setRollContext(null);
      setHoldingResult(visible);
      setPhase("idle");
    }
  };

  useEffect(() => {
    if (phase !== "revealed") return;
    autoCloseTimerRef.current = setTimeout(() => {
      setHoldingResult(false);
      setRollContext(null);
      // If another roll request arrived during the result view, `visible`
      // is still true and the dialog stays open — reset so the player can
      // cast for the new request instead of being stuck on the old result.
      if (visibleRef.current) resetCast();
      onClose();
    }, RESULT_VIEW_MS);
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [phase, onClose, resetCast]);

  useEffect(() => {
    if (!effectiveVisible) {
      const t = setTimeout(() => {
        setDie1(null);
        setDie2(null);
        setServerResult(null);
        setPhase("idle");
        setSelectedApproach(null);
        setAspectInvoked(false);
        setRollContext(null);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [effectiveVisible]);

  useEffect(() => () => cleanupTimers(), []);

  // ── A11y: focus management + Escape + Tab trap ───────────
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedBeforeOpenRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (!effectiveVisible) return;
    lastFocusedBeforeOpenRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      dialogRef.current?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      lastFocusedBeforeOpenRef.current?.focus?.();
    };
  }, [effectiveVisible]);

  const onDialogKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [handleClose],
  );

  if (!mounted) return null;

  const node = (
    <AnimatePresence>
      {effectiveVisible && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Cast the dice"
          tabIndex={-1}
          onKeyDown={onDialogKeyDown}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.4 }}
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-4 py-8 outline-none sm:items-center"
        >
          {/* The room dims — candlelight pulls onto the slip. */}
          <div
            className="absolute inset-0 backdrop-blur-[2px]"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(24,18,8,0.82) 0%, rgba(8,6,3,0.92) 60%, rgba(3,2,1,0.97) 100%)",
            }}
            onClick={phase === "idle" ? handleClose : undefined}
          />

          {/* The casting slip. */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16, rotate: -0.5 }}
            animate={{ opacity: 1, y: 0, rotate: -0.5 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="manuscript-sheet relative w-full max-w-md rounded-sm px-6 py-7 sm:px-8"
          >
            {/* The question, in the Director's hand. */}
            <p className="hand-note text-amber/85">
              {displayedReason ? "the dice are called —" : "cast the bones —"}
            </p>
            {displayedReason && (
              <p className="mt-1 font-reading text-[17px] italic leading-snug text-paper/90">
                {displayedReason}
              </p>
            )}
            {displayedFatal && (
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-rose">
                ⚠ Fatal stakes — a failure here is the end
              </p>
            )}

            {/* The stakes, both faces up. */}
            {(displayedOnSuccess || displayedOnFailure) && (
              <div className="mt-3 space-y-0.5">
                {displayedOnSuccess && (
                  <p
                    className={`font-reading text-[13px] italic leading-snug transition-opacity ${
                      phase === "revealed" && total !== null && total < 7 ? "opacity-30" : ""
                    }`}
                  >
                    <span className="not-italic text-[10px] font-bold uppercase tracking-[0.14em] text-sage">holds </span>
                    <span className="text-text-secondary">{displayedOnSuccess}</span>
                  </p>
                )}
                {displayedOnFailure && (
                  <p
                    className={`font-reading text-[13px] italic leading-snug transition-opacity ${
                      phase === "revealed" && total !== null && total >= 7 ? "opacity-30" : ""
                    }`}
                  >
                    <span className="not-italic text-[10px] font-bold uppercase tracking-[0.14em] text-rose">breaks </span>
                    <span className="text-text-secondary">{displayedOnFailure}</span>
                  </p>
                )}
              </div>
            )}

            {/* First-cast primer — a note from the binder. */}
            {phase === "idle" && !primerSeen && (
              <div className="mt-4 rounded-md border border-amber/25 bg-amber/[0.06] p-3">
                <p className="text-[12.5px] leading-relaxed text-text-secondary">
                  Two dice, added. <strong className="text-sage">10+</strong> and it holds ·{" "}
                  <strong className="text-amber">7–9</strong> and it holds at a price ·{" "}
                  <strong className="text-rose">6−</strong> and the world refuses. Your{" "}
                  <em>aspect</em> can turn one miss a scene into a foothold.
                </p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={dismissPrimer}
                    className="wax-seal cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}

            {/* How do they meet it? Approaches are fiction, not maths. */}
            {phase === "idle" && (
              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">How do they meet it?</p>
                <div className="mt-1 flex items-center gap-5">
                  {APPROACHES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setSelectedApproach(a)}
                      className={`cursor-pointer font-display text-[15px] tracking-wide transition-all ${
                        selectedApproach === a
                          ? "text-amber underline decoration-2 underline-offset-[6px]"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* The truth they carry — once a scene it can save a miss. */}
            {aspect && phase === "idle" && (
              <div className="mt-4">
                <p className="font-reading text-[14px] italic text-paper/60">&ldquo;{aspect}&rdquo;</p>
                {aspectAvailable ? (
                  <button
                    type="button"
                    onClick={() => setAspectInvoked((v) => !v)}
                    className={`table-action mt-1 cursor-pointer transition-colors ${
                      aspectInvoked ? "text-lavender" : "text-text-tertiary hover:text-lavender"
                    }`}
                  >
                    {aspectInvoked ? "✓ Leaning on their truth — a miss becomes a foothold" : "Lean on their truth"}
                  </button>
                ) : (
                  <p className="table-murmur mt-1 !text-[11.5px] line-through opacity-70">
                    their truth is spent this scene
                  </p>
                )}
              </div>
            )}

            {/* The casting ground — dice land here. */}
            <div className="relative mt-6 flex h-28 items-center justify-center gap-6 rounded-md border border-dashed border-border/60 sm:h-32">
              {(phase === "casting" || phase === "settling" || phase === "revealed") && (
                <>
                  <BoneDie value={die1} phase={phase} index={0} />
                  <BoneDie value={die2} phase={phase} index={1} />
                </>
              )}
              {phase === "idle" && (
                <p className="table-murmur opacity-60">the paper waits for the bones</p>
              )}
            </div>

            {/* Cast. */}
            {phase === "idle" && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={executeRoll}
                  className="wax-seal cursor-pointer px-6 py-2 text-[12px] font-bold uppercase tracking-[0.2em]"
                >
                  Cast the bones
                </button>
              </div>
            )}

            {phase === "casting" && (
              <motion.p
                animate={reduceMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="table-murmur mt-4 text-center"
              >
                the world holds its breath…
              </motion.p>
            )}

            {/* The stamp. */}
            <AnimatePresence>
              {phase === "revealed" && proclamation && total !== null && (
                <motion.div
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.35, rotate: -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: -2.5 }}
                  transition={{ duration: reduceMotion ? 0.2 : 0.35, ease: [0.2, 1.4, 0.4, 1] }}
                  className={`mx-auto mt-5 w-fit rounded-sm border-2 px-5 py-3 text-center ${TONE_BORDER[proclamation.tone]}`}
                  style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}
                >
                  <p className={`hand-note text-2xl leading-none ${TONE_INK[proclamation.tone]}`}>
                    {proclamation.stamp}
                  </p>
                  {serverResult && (
                    <p className="mt-1.5 font-mono text-[11px] text-text-tertiary">
                      {serverResult.dice[0]} + {serverResult.dice[1]}
                      {serverResult.modifier !== 0
                        ? ` ${serverResult.modifier > 0 ? "+" : "−"} ${Math.abs(serverResult.modifier)}`
                        : ""}{" "}
                      = {total}
                    </p>
                  )}
                  <p className={`mt-2 font-reading text-[14px] italic ${TONE_INK[proclamation.tone]}`}>
                    {proclamation.title}
                  </p>
                  <p className="mt-0.5 font-reading text-[12px] italic text-text-tertiary">
                    {proclamation.sub}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Withdraw / fade. */}
            {(phase === "idle" || phase === "revealed") && (
              <button
                type="button"
                onClick={handleClose}
                className="table-action mx-auto mt-5 block cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
              >
                {phase === "revealed" ? "Let it fade" : "Withdraw"}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}
