"use client";

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const APPROACHES = ["Bold", "Keen", "Subtle"] as const;
type Approach = (typeof APPROACHES)[number];

interface RollResult {
  dice: [number, number];
  modifier: number;
  total: number;
  tier: "success" | "partial" | "failure";
}

interface DiceRollerRitualProps {
  visible: boolean;
  onClose: () => void;
  onRollSubmit: (intent: { attribute: string; aspectInvoked: boolean }) => Promise<RollResult>;
  aspect?: string | null;
  /** Whether the character may still spend their aspect this scene (the trump
   *  that turns a miss into a foothold). Once spent, the invoke is disabled. */
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

// ── Poetic proclamations ───────────────────────────────────

function getProclamation(total: number, fatal: boolean) {
  if (total >= 10) {
    return {
      title: "The world bends to your will.",
      sub: "What you reached for, you take. Whole.",
      tone: "success" as const,
    };
  }
  if (total >= 7) {
    return {
      title: "The thread frays — but it holds.",
      sub: "You have it. Something has been spent.",
      tone: "partial" as const,
    };
  }
  if (fatal) {
    return {
      title: "The dark accepts what you have given.",
      sub: "This was the toll. It is paid.",
      tone: "fatal" as const,
    };
  }
  return {
    title: "The mountain refuses you.",
    sub: "The world moves on without your hand.",
    tone: "failure" as const,
  };
}

const TONE_AURA: Record<string, string> = {
  success: "rgba(243,180,97,0.22)",
  partial: "rgba(220,180,90,0.16)",
  failure: "rgba(244,63,94,0.15)",
  fatal: "rgba(190,20,40,0.34)",
};

const TONE_TEXT: Record<string, string> = {
  success: "text-amber",
  partial: "text-amber/85",
  failure: "text-rose-300",
  fatal: "text-rose-500",
};

const TONE_GLOW: Record<string, string> = {
  success: "0 0 30px rgba(243,180,97,0.7), 0 0 12px rgba(243,180,97,0.5)",
  partial: "0 0 22px rgba(243,180,97,0.45)",
  failure: "0 0 18px rgba(244,63,94,0.5)",
  fatal: "0 0 32px rgba(190,20,40,0.8), 0 0 14px rgba(244,63,94,0.5)",
};

// ── Runestone ──────────────────────────────────────────────

function Runestone({
  value,
  phase,
  index,
}: {
  value: number | null;
  phase: Phase;
  index: number;
}) {
  const [display, setDisplay] = useState<number>(value ?? 1);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (phase === "casting") {
      const id = setInterval(() => setDisplay(Math.floor(Math.random() * 6) + 1), 90);
      return () => clearInterval(id);
    }
  }, [phase, value]);

  const showValue = phase === "settling" || phase === "revealed";
  const awake = phase === "revealed";
  const displayValue = showValue ? (value ?? display) : display;
  const pips = PIP_LAYOUTS[displayValue] ?? [];

  return (
    <motion.div
      animate={
        phase === "casting"
          ? {
              rotateX: [0, 720, 1440],
              rotateY: [0, index === 0 ? 540 : -540, index === 0 ? 720 : -720],
              rotateZ: [0, index === 0 ? -25 : 25, 0],
              y: [-90, 60, -8, 0],
              x: [0, index === 0 ? -10 : 10, 0],
              scale: [0.55, 1.12, 0.95, 1],
            }
          : awake
            ? { y: [0, -10, 0], scale: [1, 1.08, 1] }
            : phase === "idle" && !reduceMotion
              ? { y: [0, -5, 0], rotateY: [0, index === 0 ? 10 : -10, 0], rotateX: [0, 4, 0] }
              : { y: 0, scale: 1 }
      }
      transition={
        phase === "casting"
          ? { duration: MIN_CAST_MS / 1000, ease: [0.65, 0.05, 0.35, 1] }
          : awake
            ? { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }
            : phase === "idle" && !reduceMotion
              ? { duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }
              : { duration: 0.3 }
      }
      style={{ transformStyle: "preserve-3d", transformOrigin: "center" }}
      className="relative h-24 w-24 sm:h-28 sm:w-28"
    >
      <div
        className="absolute inset-0 rounded-[14px] border border-amber/25"
        style={{
          background: "linear-gradient(135deg, #1c1610 0%, #110c08 45%, #080604 100%)",
          boxShadow:
            "inset 0 2px 4px rgba(243,180,97,0.08), inset 0 -3px 6px rgba(0,0,0,0.85), 0 14px 28px rgba(0,0,0,0.75)",
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0 28 L18 38 L36 28 M58 14 L72 26 L100 20" stroke="rgba(243,180,97,0.08)" strokeWidth="0.4" fill="none" />
        <path d="M5 78 L20 88 L40 72" stroke="rgba(243,180,97,0.05)" strokeWidth="0.4" fill="none" />
      </svg>
      <svg className="absolute -top-px right-0 h-3 w-3" viewBox="0 0 12 12">
        <path d="M2 0 L12 0 L12 10 L8 6 L4 8 Z" fill="#0a0805" />
      </svg>

      <div className="absolute inset-3">
        {pips.map((pip, i) => (
          <motion.div
            key={i}
            className="absolute h-3 w-3 rounded-full sm:h-3.5 sm:w-3.5"
            style={{
              left: `${pip.x}%`,
              top: `${pip.y}%`,
              transform: "translate(-50%, -50%)",
              background: awake ? "#f3b461" : "#5a3815",
              boxShadow: awake
                ? "0 0 14px rgba(243,180,97,0.95), 0 0 4px rgba(255,210,140,1), inset 0 1px 2px rgba(120,60,0,0.4)"
                : "inset 0 1px 2px rgba(0,0,0,0.7)",
              transition: "background 600ms ease, box-shadow 600ms ease",
            }}
          />
        ))}
      </div>

      {awake && (
        <motion.div
          initial={{ opacity: 0.85, scale: 0.6 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: 1.1 }}
          className="absolute inset-0 rounded-[14px] border border-amber"
          style={{ boxShadow: "0 0 36px rgba(243,180,97,0.55)" }}
        />
      )}
    </motion.div>
  );
}

// ── Embers ─────────────────────────────────────────────────

function Embers({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 22 }).map((_, i) => {
        const xStart = (i * 23 + 7) % 100;
        const xDrift = (((i * 7) % 5) - 2) * 18;
        const delay = (i * 0.13) % 2.4;
        const duration = 2.0 + ((i * 0.31) % 1.8);
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-amber"
            style={{
              left: `${xStart}%`,
              bottom: "-5%",
              width: "3px",
              height: "3px",
              boxShadow: "0 0 8px rgba(243,180,97,0.95), 0 0 2px rgba(255,210,140,1)",
            }}
            animate={
              active
                ? {
                    y: [0, -260 - ((i % 4) * 40)],
                    x: [0, xDrift],
                    opacity: [0, 1, 0.7, 0],
                    scale: [0.5, 1.2, 0.7, 0.3],
                  }
                : { opacity: 0 }
            }
            transition={
              active
                ? { duration, repeat: Infinity, delay, ease: "easeOut" }
                : { duration: 0.4 }
            }
          />
        );
      })}
    </div>
  );
}

// ── Whispers ───────────────────────────────────────────────

const WHISPER_LINES = [
  "fate watches…",
  "the bones know…",
  "what is given will be taken",
  "old names stir",
  "the wheel turns",
  "stone remembers",
];

function Whispers({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {WHISPER_LINES.map((text, i) => (
        <motion.div
          key={i}
          className="absolute font-display text-[10px] italic text-amber/45"
          style={{
            left: `${6 + ((i * 17) % 78)}%`,
            top: `${18 + (i % 3) * 26}%`,
            textShadow: "0 0 10px rgba(243,180,97,0.5)",
          }}
          animate={
            active
              ? {
                  opacity: [0, 0.75, 0],
                  x: [0, 36],
                  y: [0, -14],
                }
              : { opacity: 0 }
          }
          transition={
            active
              ? { duration: 2.8, delay: i * 0.32, repeat: Infinity }
              : { duration: 0.3 }
          }
        >
          {text}
        </motion.div>
      ))}
    </div>
  );
}

// ── Count-up total ─────────────────────────────────────────

function CountUpTotal({ value, active }: { value: number; active: boolean }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      if (!active || value === 0) {
        setDisplay(0);
        return;
      }
      const steps = 18;
      let current = 0;
      intervalId = setInterval(() => {
        current += 1;
        setDisplay(Math.min(value, Math.round((value * current) / steps)));
        if (current >= steps && intervalId) clearInterval(intervalId);
      }, 26);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, value]);
  return <>{display}</>;
}

// ── Inscribed text (letter-by-letter) ─────────────────────

function Inscribed({
  text,
  delay = 0,
  className = "",
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={className}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: delay + i * 0.022 }}
          style={{ display: "inline-block", whiteSpace: ch === " " ? "pre" : "normal" }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

// ── Approach sigils ───────────────────────────────────────

function ApproachSigil({
  approach,
  selected,
  locked,
  onSelect,
}: {
  approach: Approach;
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  const sigil: ReactNode = (() => {
    if (approach === "Bold") {
      return (
        <svg viewBox="0 0 40 40" className="h-7 w-7">
          <path
            d="M20 5 C 11 16, 11 25, 20 35 C 29 25, 29 16, 20 5 Z"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
          />
          <path d="M20 13 C 16 19, 16 24, 20 30 C 24 24, 24 19, 20 13 Z" fill="currentColor" />
        </svg>
      );
    }
    if (approach === "Keen") {
      return (
        <svg viewBox="0 0 40 40" className="h-7 w-7">
          <path d="M3 20 Q 20 5, 37 20 Q 20 35, 3 20 Z" stroke="currentColor" strokeWidth="1.4" fill="none" />
          <circle cx="20" cy="20" r="5" fill="currentColor" />
          <circle cx="22" cy="18" r="1.4" fill="#0a0805" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 40 40" className="h-7 w-7">
        <path
          d="M5 31 Q 12 14, 20 21 Q 28 28, 35 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <circle cx="35" cy="9" r="2.2" fill="currentColor" />
        <circle cx="5" cy="31" r="2.2" fill="currentColor" />
      </svg>
    );
  })();

  return (
    <button
      onClick={onSelect}
      disabled={locked}
      className={`group relative flex flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-all duration-300 disabled:cursor-default ${
        selected
          ? "border-amber/60 bg-amber/10 text-amber"
          : "border-border/60 bg-subtle/15 text-text-tertiary hover:border-amber/30 hover:text-amber/70"
      }`}
      style={
        selected
          ? { boxShadow: "0 0 22px rgba(243,180,97,0.28), inset 0 0 18px rgba(243,180,97,0.08)" }
          : undefined
      }
    >
      <div className="transition-transform duration-300 group-hover:scale-110">{sigil}</div>
      <span className="font-display text-[10px] uppercase tracking-[0.22em]">{approach}</span>
      {selected && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl"
          animate={{ boxShadow: ["0 0 0 rgba(243,180,97,0)", "0 0 28px rgba(243,180,97,0.35)", "0 0 0 rgba(243,180,97,0)"] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
      )}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────

export default function DiceRollerRitual({
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
}: DiceRollerRitualProps) {
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

  // First-roll primer: explain 2d6 tiers + the aspect trump once, at the point
  // of use. Gated per-user so veterans never see it again. (P1 #6) The ritual is
  // a client-only portal, so a lazy initializer reads storage safely (no SSR
  // hydration mismatch, no setState-in-effect).
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

  // The dice are a flat 2d6 — no numeric modifier. The aspect is a once-per-scene
  // trump that turns a miss into a foothold, not a bonus. See audit D1.
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

  const resetRitual = useCallback(() => {
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

  const handleClose = () => {
    cleanupTimers();
    setHoldingResult(false);
    setRollContext(null);
    // A pending roll request keeps the dialog forced open, so the
    // visibility-driven reset never fires — reset here so the next
    // request starts from "idle" instead of a stuck result screen.
    if (visible) resetRitual();
    onClose();
  };

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
      // is still true and the dialog stays open — reset the ritual so the
      // player can cast for the new request instead of being stuck on the
      // previous result (the !effectiveVisible reset never runs then).
      if (visibleRef.current) resetRitual();
      onClose();
    }, RESULT_VIEW_MS);
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [phase, onClose, resetRitual]);

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
    // Defer focus until the dialog is in the DOM.
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
          aria-label="Dice ritual"
          tabIndex={-1}
          onKeyDown={onDialogKeyDown}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6 }}
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-4 py-6 outline-none sm:items-center"
        >
          {/* Cosmic backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(20,12,8,0.94) 0%, rgba(8,5,3,0.98) 55%, rgba(0,0,0,1) 100%)",
            }}
          />

          {/* Star noise — gated by reduced motion (decorative only) */}
          {!reduceMotion && (
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {Array.from({ length: 48 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-px w-px rounded-full bg-amber"
                  style={{
                    left: `${(i * 53 + 17) % 100}%`,
                    top: `${(i * 37 + 11) % 100}%`,
                    boxShadow: "0 0 3px rgba(243,180,97,0.5)",
                  }}
                  animate={{ opacity: [0.15, 0.85, 0.15] }}
                  transition={{ duration: 3 + (i % 5), repeat: Infinity, delay: (i * 0.11) % 2.5 }}
                />
              ))}
            </div>
          )}

          {/* Tier-tinted aura wash on reveal */}
          {proclamation && phase === "revealed" && (
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4 }}
              style={{
                background: `radial-gradient(ellipse at center, ${TONE_AURA[proclamation.tone]} 0%, transparent 65%)`,
              }}
            />
          )}

          {/* Slow heartbeat pulse during idle */}
          {phase === "idle" && !reduceMotion && (
            <motion.div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{
                background: "radial-gradient(ellipse at center, rgba(243,180,97,0.04) 0%, transparent 50%)",
              }}
            />
          )}

          {/* The Tablet */}
          <motion.div
            initial={{ scale: 0.94, y: 12, opacity: 0, filter: "blur(8px)" }}
            animate={{ scale: 1, y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 0.96, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-[22px] border border-amber/25"
            style={{
              background:
                "linear-gradient(180deg, rgba(22,15,10,0.95) 0%, rgba(12,8,6,0.97) 60%, rgba(20,14,10,0.95) 100%)",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.95), inset 0 0 60px rgba(243,180,97,0.04), 0 0 0 1px rgba(243,180,97,0.08)",
            }}
          >
            {/* Etched corner ornaments */}
            {[
              { pos: "top-2 left-2", rot: 0 },
              { pos: "top-2 right-2", rot: 90 },
              { pos: "bottom-2 right-2", rot: 180 },
              { pos: "bottom-2 left-2", rot: 270 },
            ].map(({ pos, rot }, i) => (
              <svg
                key={i}
                className={`absolute ${pos} h-6 w-6 text-amber/45`}
                style={{ transform: `rotate(${rot}deg)` }}
                viewBox="0 0 20 20"
              >
                <path d="M0 10 L0 0 L10 0 M2 5 Q 5 5 5 2 M4 8 Q 7 8 7 5" stroke="currentColor" strokeWidth="0.7" fill="none" />
              </svg>
            ))}

            <div className="relative px-6 py-7 sm:px-8 sm:py-9">
              {/* Heading */}
              <div className="mb-5 text-center">
                <p className="font-display text-[10px] uppercase tracking-[0.4em] text-amber/55">— the casting —</p>
                {displayedReason && (
                  <p className="mt-3 font-display text-[14px] italic leading-relaxed text-text/90">
                    &ldquo;{displayedReason}&rdquo;
                  </p>
                )}
              </div>

              {/* Fatal warning */}
              {displayedFatal && (
                <motion.div
                  animate={reduceMotion ? undefined : { boxShadow: ["0 0 0 rgba(244,63,94,0)", "0 0 20px rgba(244,63,94,0.4)", "0 0 0 rgba(244,63,94,0)"] }}
                  transition={reduceMotion ? undefined : { duration: 2.6, repeat: Infinity }}
                  className="mb-5 rounded-lg border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-center"
                >
                  <p className="font-display text-[9px] uppercase tracking-[0.35em] text-rose-400">— fatal stakes —</p>
                  <p className="mt-1 text-[10px] italic text-rose-400/70">Failure unmakes you.</p>
                </motion.div>
              )}

              {/* Stakes */}
              {(displayedOnSuccess || displayedOnFailure) && (
                <div className="mb-6 grid grid-cols-2 gap-3">
                  {displayedOnSuccess && (
                    <div
                      className={`rounded-lg border px-3 py-3 transition-all duration-700 ${
                        phase === "revealed" && total !== null && total >= 7
                          ? "border-amber/45 bg-amber/10"
                          : "border-amber/15 bg-subtle/10"
                      }`}
                    >
                      <p className="font-display text-[9px] uppercase tracking-[0.3em] text-amber/70">If you take it</p>
                      <p className="mt-1.5 text-[11px] italic leading-relaxed text-text/85">{displayedOnSuccess}</p>
                    </div>
                  )}
                  {displayedOnFailure && (
                    <div
                      className={`rounded-lg border px-3 py-3 transition-all duration-700 ${
                        phase === "revealed" && total !== null && total < 7
                          ? "border-rose-400/45 bg-rose-500/10"
                          : "border-rose-400/15 bg-subtle/10"
                      }`}
                    >
                      <p className="font-display text-[9px] uppercase tracking-[0.3em] text-rose-300/70">If you do not</p>
                      <p className="mt-1.5 text-[11px] italic leading-relaxed text-text/85">{displayedOnFailure}</p>
                    </div>
                  )}
                </div>
              )}

              {/* First-roll primer (P1 #6) — explains the dice once */}
              {phase === "idle" && !primerSeen && (
                <div className="mb-5 rounded-lg border border-amber/25 bg-amber/[0.06] px-4 py-3">
                  <p className="text-[12px] leading-relaxed text-text-secondary">
                    Roll <strong className="text-paper">2d6</strong>:
                    {" "}<strong className="text-amber">10+</strong> you take it clean ·
                    {" "}<strong className="text-amber/80">7&ndash;9</strong> you get it at a cost ·
                    {" "}<strong className="text-rose-300">6 or less</strong> it turns against you.
                    {aspect && <> Invoking your <strong className="text-paper">truth</strong> saves one miss per scene.</>}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={dismissPrimer}
                      className="rounded-full border border-amber/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber/80 transition-colors hover:text-amber"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}

              {/* Aspect — a once-per-scene narrative trump, not a bonus.
                  Invoking it before the cast means a miss becomes a foothold.
                  It's only spent if it actually saves you. */}
              {aspect && (
                <button
                  onClick={() => phase === "idle" && aspectAvailable && setAspectInvoked(!aspectInvoked)}
                  disabled={phase !== "idle" || !aspectAvailable}
                  className={`group relative mb-6 block w-full rounded-lg border px-4 py-3 text-left transition-all duration-500 disabled:cursor-default ${
                    aspectInvoked
                      ? "border-amber/55 bg-amber/8"
                      : aspectAvailable
                        ? "border-border-subtle bg-subtle/10 hover:border-amber/30"
                        : "border-border-subtle bg-subtle/5 opacity-60"
                  }`}
                  style={
                    aspectInvoked
                      ? { boxShadow: "0 0 26px rgba(243,180,97,0.22), inset 0 0 20px rgba(243,180,97,0.06)" }
                      : undefined
                  }
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-display text-[9px] uppercase tracking-[0.32em] text-amber/65">
                      Your truth
                    </span>
                    <span className="font-display text-[10px] italic text-amber/55">
                      {!aspectAvailable
                        ? "spent this scene"
                        : aspectInvoked
                          ? "✦ will catch a miss"
                          : "tap to invoke"}
                    </span>
                  </div>
                  <p
                    className="font-display text-[15px] italic leading-relaxed transition-all duration-700"
                    style={
                      aspectInvoked
                        ? {
                            backgroundImage: "linear-gradient(90deg, #d4954a 0%, #fbe6c2 50%, #d4954a 100%)",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            color: "transparent",
                            textShadow: "0 0 18px rgba(243,180,97,0.4)",
                          }
                        : { color: "rgba(220,200,180,0.85)" }
                    }
                  >
                    &ldquo;{aspect}&rdquo;
                  </p>
                  {aspectAvailable && (
                    <p className="mt-1.5 text-[10px] italic text-text-ghost">
                      Spend it to turn a miss into a foothold. Vows grant more.
                    </p>
                  )}
                </button>
              )}

              {/* Approaches — fictional texture, not maths. They colour what the
                  attempt looks like and what it costs, never the odds. */}
              {phase === "idle" && (
                <div className="mb-6">
                  <p className="mb-1 text-center font-display text-[9px] uppercase tracking-[0.34em] text-amber/55">
                    How will you reach?
                  </p>
                  <p className="mb-3 text-center text-[9px] italic text-amber/35">
                    Shapes what happens — not the odds.
                  </p>
                  <div className="flex items-stretch justify-center gap-2">
                    {APPROACHES.map((a) => (
                      <ApproachSigil
                        key={a}
                        approach={a}
                        selected={selectedApproach === a}
                        locked={!!preSelectedAttribute}
                        onSelect={() => setSelectedApproach(selectedApproach === a ? null : a)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* The Well */}
              <div className="relative mb-5">
                <div
                  className="relative mx-auto h-[200px] w-full max-w-[320px] overflow-hidden rounded-2xl"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, #1a120c 0%, #0a0604 70%, #050302 100%)",
                    boxShadow:
                      "inset 0 4px 18px rgba(0,0,0,0.92), inset 0 -2px 6px rgba(243,180,97,0.05), 0 0 0 1px rgba(243,180,97,0.1)",
                  }}
                >
                  {/* concentric rings */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-amber/15"
                      style={{
                        width: `${90 + i * 60}px`,
                        height: `${90 + i * 60}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                      animate={reduceMotion ? { opacity: 0.2 } : { opacity: [0.08, 0.38, 0.08] }}
                      transition={reduceMotion ? undefined : { duration: 4 + i, repeat: Infinity, delay: i * 0.7 }}
                    />
                  ))}

                  <Embers active={phase === "casting"} />
                  <Whispers active={phase === "casting"} />

                  <div className="relative flex h-full items-center justify-center gap-5 sm:gap-7">
                    <Runestone value={die1} phase={phase} index={0} />
                    <Runestone value={die2} phase={phase} index={1} />
                  </div>

                  {/* Impact ripple */}
                  {phase === "revealed" && (
                    <>
                      <motion.div
                        initial={{ scale: 0.2, opacity: 0.7 }}
                        animate={{ scale: 4, opacity: 0 }}
                        transition={{ duration: 1.4 }}
                        className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber/40"
                      />
                      <motion.div
                        initial={{ scale: 0.1, opacity: 0.5 }}
                        animate={{ scale: 6, opacity: 0 }}
                        transition={{ duration: 1.8, delay: 0.15 }}
                        className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber/30"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Cast button */}
              {phase === "idle" && (
                <motion.button
                  onClick={executeRoll}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative mx-auto block overflow-hidden rounded-full border border-amber/45 px-12 py-3.5 transition-all hover:border-amber/75"
                  style={{
                    background: "linear-gradient(180deg, rgba(243,180,97,0.16) 0%, rgba(243,180,97,0.04) 100%)",
                    boxShadow: "0 0 30px rgba(243,180,97,0.18), inset 0 1px 0 rgba(243,180,97,0.2)",
                  }}
                >
                  <span className="relative z-10 font-display text-[12px] uppercase tracking-[0.38em] text-amber">
                    Cast the bones
                  </span>
                  <motion.span
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(243,180,97,0.25) 50%, transparent 100%)",
                    }}
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                </motion.button>
              )}

              {/* Casting status */}
              {phase === "casting" && (
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="text-center font-display text-[11px] italic uppercase tracking-[0.34em] text-amber/70"
                >
                  the world holds its breath…
                </motion.p>
              )}

              {/* Reveal */}
              <AnimatePresence>
                {phase === "revealed" && proclamation && total !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="text-center"
                  >
                    <motion.div
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.85, ease: [0.34, 1.56, 0.64, 1], delay: 0.05 }}
                      className={`mb-2 font-display text-[52px] font-semibold leading-none ${TONE_TEXT[proclamation.tone]}`}
                      style={{ textShadow: TONE_GLOW[proclamation.tone] }}
                    >
                      <CountUpTotal value={total} active={phase === "revealed"} />
                    </motion.div>
                    {serverResult && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="mb-3 font-display text-[10px] italic tracking-[0.15em] text-amber/60"
                      >
                        ({serverResult.dice[0]} + {serverResult.dice[1]})
                      </motion.p>
                    )}
                    <Inscribed
                      text={proclamation.title}
                      delay={0.55}
                      className={`block font-display text-[17px] italic ${TONE_TEXT[proclamation.tone]}`}
                    />
                    <Inscribed
                      text={proclamation.sub}
                      delay={0.55 + proclamation.title.length * 0.022 + 0.1}
                      className="mt-2 block font-display text-[11px] italic text-text-tertiary"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close */}
              <button
                onClick={handleClose}
                className="mx-auto mt-7 block font-display text-[10px] uppercase tracking-[0.34em] text-text-tertiary transition-colors hover:text-amber"
              >
                {phase === "revealed" ? "fade" : phase === "idle" ? "withdraw" : ""}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}
