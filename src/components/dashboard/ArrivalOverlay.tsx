"use client";

/*
 * The Arrival — the homepage film's final cut, played at the studio door.
 *
 * The anon film ends with the Ink Drop falling in as the dot of the "i";
 * /register signs your name with it ("VII · Your name"); /login keeps your
 * place. This overlay is the beat that was missing: you sign in, the room
 * goes dark, the narrator speaks one line, the same drop falls — and its
 * splash ring opens onto your studio (the through-the-hole crossing from
 * the portal experiments, aimed at the place you actually live).
 *
 * Plays once per sign-in: login/register mark it, the dashboard consumes it.
 * Click or Esc fast-forwards. Reduced motion gets a quiet fade instead.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Motes } from "@/components/shared/Atmosphere";
import type { ArrivalKind } from "@/lib/arrival";

const COPY: Record<ArrivalKind, { act: string; line: string }> = {
  // a brand-new writer continues the film's act numbering — register was VII
  new: { act: "VIII · Your studio", line: "Every story begins as a drop of ink. Yours lands here." },
  // a returning writer's story is already running — no numeral, just the room
  return: { act: "Quiloria · Your studio", line: "The lamps are lit. The ink is warm." },
};

// where the drop lands — the point the studio opens from
const LAND_X = "50%";
const LAND_Y = "56%";
const HOLE_MASK = `radial-gradient(circle at ${LAND_X} ${LAND_Y}, transparent calc(var(--hole) - 2vmax), black var(--hole))`;

type Phase = "veil" | "drop" | "open";

export default function ArrivalOverlay({ kind, onDone }: { kind: ArrivalKind; onDone: () => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("veil");
  const doneRef = useRef(false);
  const copy = COPY[kind];

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  // the timeline: veil (narration) → drop (it falls, splashes) → open (the
  // splash ring becomes the window the studio arrives through)
  useEffect(() => {
    if (reduce) {
      const t = setTimeout(finish, 2000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => (phase === "veil" ? setPhase("drop") : phase === "drop" ? setPhase("open") : finish()),
      phase === "veil" ? 2450 : phase === "drop" ? 1000 : 1250
    );
    return () => clearTimeout(t);
  }, [phase, reduce, finish]);

  // click or Esc: first hit jumps to the reveal, second hit ends it
  const advance = useCallback(() => {
    if (reduce || phase === "open") finish();
    else setPhase("open");
  }, [reduce, phase, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  if (reduce) {
    return (
      <motion.div
        className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-void px-6 text-center"
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2, times: [0, 0.15, 0.78, 1] }}
        onClick={advance}
        role="button"
        aria-label="Enter your studio"
      >
        <p className="text-[10px] md:text-[11px] uppercase tracking-[0.34em] text-gold/80">{copy.act}</p>
        <p className="mt-4 font-display italic text-paper text-2xl md:text-4xl max-w-2xl leading-tight">{copy.line}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[10000] cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      onClick={advance}
      role="button"
      aria-label="Enter your studio"
    >
      {/* the veil — masked so the splash ring opens a real hole onto the studio */}
      <motion.div
        className="absolute inset-0 bg-void"
        style={{ "--hole": "0vmax", maskImage: HOLE_MASK, WebkitMaskImage: HOLE_MASK } as React.CSSProperties}
        animate={phase === "open" ? { "--hole": "168vmax", opacity: 0 } : undefined}
        transition={{
          "--hole": { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
          opacity: { delay: 0.8, duration: 0.4 },
        }}
      >
        <Motes count={14} zClass="z-[1]" />

        {/* the narration */}
        <motion.div
          className="absolute inset-x-0 top-[34%] z-10 flex flex-col items-center px-6 text-center"
          animate={{ opacity: phase === "open" ? 0 : 1, y: phase === "open" ? -10 : 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.p
            className="text-[10px] md:text-[11px] uppercase text-gold/80"
            initial={{ opacity: 0, letterSpacing: "0.7em" }}
            animate={{ opacity: 1, letterSpacing: "0.34em" }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          >
            {copy.act}
          </motion.p>
          <p className="mt-4 font-display italic font-medium text-paper text-2xl md:text-4xl max-w-2xl leading-tight [text-shadow:0_2px_10px_rgba(0,0,0,0.9)]">
            {copy.line.split(" ").map((word, i) => (
              <motion.span
                key={i}
                className="inline-block whitespace-pre"
                initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.55, delay: 0.45 + i * 0.1, ease: "easeOut" }}
              >
                {word}{" "}
              </motion.span>
            ))}
          </p>
          <motion.div
            className="mt-5 h-px w-44 md:w-56 bg-gradient-to-r from-transparent via-gold/80 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: 1.3, ease: "easeOut" }}
          />
        </motion.div>

        {/* quiet skip affordance */}
        <motion.span
          className="absolute bottom-7 inset-x-0 z-10 text-center text-[11px] tracking-wide text-text-ghost"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "veil" ? 1 : 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          enter the studio →
        </motion.span>
      </motion.div>

      {/* the Ink Drop + splash — outside the mask so they ride above the opening */}
      {phase !== "veil" && (
        <>
          {phase === "drop" && (
            <motion.svg
              viewBox="0 0 10 14"
              className="absolute left-1/2 w-[14px] -translate-x-1/2"
              initial={{ top: "-6%", opacity: 0 }}
              animate={{ top: LAND_Y, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.55, ease: "easeIn", opacity: { duration: 0.55, times: [0, 0.2, 0.9, 1] } }}
              aria-hidden
            >
              <path d="M5 0 C5 0 0.5 6.2 0.5 9.2 a4.5 4.5 0 0 0 9 0 C9.5 6.2 5 0 5 0 Z" fill="var(--t-gold)" />
            </motion.svg>
          )}
          {/* splash ring where it lands */}
          <motion.span
            className="absolute left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/70"
            style={{ top: LAND_Y }}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={
              phase === "drop"
                ? { opacity: [0, 0.9, 0], scale: [0.2, 1.6, 2.3] }
                : { opacity: 0 }
            }
            transition={{ delay: phase === "drop" ? 0.5 : 0, duration: 0.7, ease: "easeOut" }}
            aria-hidden
          />
          {/* the rim of the opening — the splash that keeps going */}
          {phase === "open" && (
            <motion.span
              className="absolute left-1/2 h-[6vmax] w-[6vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/40"
              style={{ top: LAND_Y }}
              initial={{ opacity: 0.8, scale: 0.3 }}
              animate={{ opacity: 0, scale: 56 }}
              transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden
            />
          )}
        </>
      )}
    </motion.div>
  );
}
