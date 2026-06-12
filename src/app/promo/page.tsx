"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { hash, arand } from "@/components/dashboard/studio-kit";
import { QuillRingLogoAnimated } from "@/components/shared/BrandLogoAnimated";

// ─────────────────────────────────────────────────────────────────────────────
// Quiloria — 55-second promo. A playable, full-screen cinematic built from the
// hero-video language (docs/VIDEO_BRIEF.md): mahogany dark, firelight gold,
// amethyst, luminous ink. Auto-advances through nine scenes with a progress
// bar. Append ?record to hide the chrome and auto-run once for screen capture
// (scripts/record-promo.mjs). Public route — no auth required.
//
//   1. 0–4s     The first sentence (caret, ink-soak)
//   2. 4–8.5s   Quiloria — the home for the whole life of a story
//   3. 8.5–16.5 FOR THE WRITER — five format-native editors
//   4. 16.5–23  Adventure Mode — stories played live, dice and all
//   5. 23–29    Together — equal credit, workshop, open calls
//   6. 29–37    FOR THE READER — reactions, sparks, steering the story
//   7. 37–43    The work pays — gifts, unlocks, the Circle
//   8. 43–49    How it's different — no feed, no algorithm, a kept library
//   9. 49–55    Two worlds, one river — quiloria.app
// ─────────────────────────────────────────────────────────────────────────────

const MAHOG = "rgb(17,14,10)";
const GOLD = "200,150,60";
const GOLDL = "224,178,96";
const AMETH = "126,94,158";
const AMETHL = "168,140,200";
const PARCH = "242,232,208";
const ROSE = "184,105,122";
const RUBY = "158,59,66";
const P = (a: number) => `rgba(${PARCH},${a})`;

const SCENES = [4, 4.5, 8, 6.5, 6, 8, 6, 6, 6]; // seconds — 55 total
const TICK = 100;

// words soak in like wet ink
function Ink({ text, className = "", delay = 0, step = 0.09, style }: { text: string; className?: string; delay?: number; step?: number; style?: React.CSSProperties }) {
  const words = text.split(" ");
  return (
    <span className={className} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: 10, filter: "blur(7px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * step, duration: 0.5, ease: "easeOut" }}
        >
          {w}{i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}

function Caret({ color = `rgb(${PARCH})`, h = "1em" }: { color?: string; h?: string }) {
  return <motion.span className="ml-1 inline-block w-[3px] translate-y-[3px]" style={{ height: h, backgroundColor: color }} animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }} />;
}

// like Ink, but the caret travels with the writing: each word carries a brief
// hand-off caret for its reveal window, and the last word keeps a blinking one
function TypedInk({ text, delay = 0, step = 0.09 }: { text: string; delay?: number; step?: number }) {
  const words = text.split(" ");
  const last = words.length - 1;
  return (
    <span>
      {words.map((w, i) => (
        <span key={i} className="whitespace-pre">
          <motion.span
            className="inline-block whitespace-pre"
            initial={{ opacity: 0, y: 6, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: delay + i * step, duration: 0.9, ease: [0.25, 0.6, 0.3, 1] }}
          >
            {w}
          </motion.span>
          {i < last ? (
            <>
              <motion.span
                className="ml-[2px] mr-[-5px] inline-block w-[3px] translate-y-[3px]"
                style={{ height: "1em", backgroundColor: P(0.92) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ delay: delay + i * step, duration: step, times: [0, 0.03, 0.97, 1], ease: "linear" }}
              />{" "}
            </>
          ) : (
            <motion.span className="inline-block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + last * step, duration: 0.1 }}>
              <Caret />
            </motion.span>
          )}
        </span>
      ))}
    </span>
  );
}

// small mono chapter label — "for the writer", "for the reader"
function ChapterMark({ text, color, delay = 0.2 }: { text: string; color: string; delay?: number }) {
  return (
    <motion.p
      className="font-mono text-[11px] uppercase tracking-[0.34em]"
      style={{ color }}
      initial={{ opacity: 0, letterSpacing: "0.5em" }}
      animate={{ opacity: 1, letterSpacing: "0.34em" }}
      transition={{ delay, duration: 0.9, ease: "easeOut" }}
    >
      {text}
    </motion.p>
  );
}

// the river of luminous ink, gold becoming amethyst
function River({ y = "50%", count = 16 }: { y?: string; count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: y, height: 2, transform: "translateY(-50%)" }}>
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, rgba(${GOLDL},0) 0%, rgba(${GOLDL},0.7) 25%, rgba(${GOLD},0.5) 50%, rgba(${AMETH},0.7) 75%, rgba(${AMETH},0) 100%)`, filter: "blur(0.5px)" }} />
      <div className="absolute inset-x-0 -top-4 h-9" style={{ background: `linear-gradient(90deg, rgba(${GOLD},0) 0%, rgba(${GOLD},0.14) 30%, rgba(${AMETH},0.14) 70%, rgba(${AMETH},0) 100%)`, filter: "blur(10px)" }} />
      {Array.from({ length: count }).map((_, i) => {
        const d = 3.5 + arand(hash(`rv-d-${i}`)) * 3;
        const drift = (arand(hash(`rv-y-${i}`)) - 0.5) * 26;
        return (
          <motion.span
            key={i}
            className="absolute top-0 h-[3px] w-[3px] rounded-full"
            style={{ backgroundColor: i % 2 ? `rgb(${GOLDL})` : `rgb(${AMETHL})`, boxShadow: `0 0 6px ${i % 2 ? `rgba(${GOLDL},0.9)` : `rgba(${AMETHL},0.9)`}` }}
            initial={{ left: "-2%", y: 0, opacity: 0 }}
            animate={{ left: "102%", y: drift, opacity: [0, 1, 1, 0] }}
            transition={{ duration: d, delay: arand(hash(`rv-t-${i}`)) * 4, repeat: Infinity, ease: "linear", times: [0, 0.1, 0.9, 1] }}
          />
        );
      })}
    </div>
  );
}

// ── Scene 1 · the first sentence ─────────────────────────────────────────────
function S1() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <p className="max-w-3xl font-reading text-[clamp(22px,3.6vw,40px)] italic leading-snug" style={{ color: P(0.92) }}>
        <TypedInk text="Every world begins as a single line of ink." delay={0.4} step={0.16} />
      </p>
    </div>
  );
}

// ── Scene 2 · the reveal ─────────────────────────────────────────────────────
function S2() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
      <River y="58%" />
      {/* the real mark: ring inks on, quill springs from the well, drop falls */}
      <div className="relative z-10" style={{ filter: `drop-shadow(0 0 50px rgba(${GOLD},0.35))` }}>
        <QuillRingLogoAnimated size={120} textClassName="text-[clamp(48px,8.5vw,112px)]" />
      </div>
      <motion.p className="relative z-10 mt-6 font-reading text-[clamp(15px,2vw,22px)] italic" style={{ color: P(0.75) }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 0.8 }}>
        The home for the whole life of a story.
      </motion.p>
    </div>
  );
}

// ── Scene 3 · for the writer — five format-native editors ───────────────────
// each card carries a tiny honest mockup of its editor
function FormatCard({ label, delay, children }: { label: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2.5"
      initial={{ opacity: 0, y: 22, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.55, ease: "easeOut" }}
    >
      <div
        className="h-[clamp(118px,16vh,168px)] w-[clamp(104px,12vw,150px)] overflow-hidden rounded-lg border p-3"
        style={{ borderColor: `rgba(${GOLDL},0.22)`, backgroundColor: "rgba(30,24,17,0.92)", boxShadow: `0 14px 36px rgba(0,0,0,0.5), 0 0 28px rgba(${GOLD},0.08)` }}
      >
        {children}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `rgb(${GOLDL})` }}>{label}</span>
    </motion.div>
  );
}

const Line = ({ w, c = P(0.5) }: { w: string; c?: string }) => <div className="h-[3px] rounded-full" style={{ width: w, backgroundColor: c }} />;

function S3() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <ChapterMark text="for the writer" color={`rgb(${GOLDL})`} />
      <motion.h2 className="mt-3 font-display text-[clamp(26px,4vw,46px)] leading-tight" style={{ color: P(0.95) }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}>
        Write it in its native form.
      </motion.h2>
      <div className="mt-8 flex flex-wrap items-start justify-center gap-4 sm:gap-5">
        <FormatCard label="Novel" delay={1.5}>
          <div className="flex h-full flex-col gap-[7px] rounded-sm px-2.5 py-3" style={{ backgroundColor: `rgba(${PARCH},0.92)` }}>
            {["92%", "100%", "96%", "88%", "100%", "64%"].map((w, i) => <Line key={i} w={w} c="rgba(58,44,30,0.55)" />)}
          </div>
        </FormatCard>
        <FormatCard label="Webtoon" delay={1.85}>
          <div className="flex h-full flex-col gap-2">
            {[38, 30, 22].map((h, i) => (
              <div key={i} className="w-full rounded-[3px] border" style={{ height: `${h}%`, borderColor: `rgba(${AMETHL},0.5)`, background: `linear-gradient(135deg, rgba(${AMETH},0.35), rgba(${AMETH},0.1))` }} />
            ))}
          </div>
        </FormatCard>
        <FormatCard label="Poetry" delay={2.2}>
          <div className="flex h-full flex-col items-center justify-center gap-[6px]">
            <Line w="62%" /><Line w="44%" /><Line w="56%" />
            <div className="h-2" />
            <Line w="50%" /><Line w="66%" /><Line w="38%" />
          </div>
        </FormatCard>
        <FormatCard label="Screenplay" delay={2.55}>
          <div className="flex h-full flex-col items-center justify-center gap-[7px]">
            <span className="font-mono text-[8px] tracking-[0.18em]" style={{ color: P(0.85) }}>INT. LIGHTHOUSE</span>
            <div className="h-1.5" />
            <span className="font-mono text-[8px] tracking-[0.18em]" style={{ color: `rgb(${GOLDL})` }}>MIRA</span>
            <Line w="58%" /><Line w="46%" />
          </div>
        </FormatCard>
        <FormatCard label="Illustrated" delay={2.9}>
          <div className="flex h-full flex-col gap-2">
            <div className="w-full flex-1 rounded-[3px]" style={{ background: `linear-gradient(135deg, rgba(${GOLD},0.45), rgba(${AMETH},0.4))`, boxShadow: `inset 0 0 18px rgba(${GOLD},0.25)` }} />
            <Line w="100%" /><Line w="78%" />
          </div>
        </FormatCard>
      </div>
      <motion.p className="mt-7 font-reading text-[clamp(14px,1.8vw,19px)] italic" style={{ color: P(0.7) }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6, duration: 0.7 }}>
        Five editors. Nothing fights the form.
      </motion.p>
    </div>
  );
}

// ── Scene 4 · adventure mode — played live ───────────────────────────────────
function Die({ n, delay }: { n: number; delay: number }) {
  const pips: Record<number, [number, number][]> = {
    3: [[25, 25], [50, 50], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  };
  return (
    <motion.div
      className="relative h-16 w-16 rounded-2xl border-2 sm:h-20 sm:w-20"
      style={{ borderColor: `rgba(${ROSE},0.9)`, backgroundColor: "rgba(184,105,122,0.12)", boxShadow: `0 0 30px rgba(${ROSE},0.4)` }}
      initial={{ opacity: 0, rotate: -160, y: -40 }}
      animate={{ opacity: 1, rotate: [-160, 12, 0], y: 0 }}
      transition={{ delay, duration: 0.9, ease: "easeOut" }}
    >
      {(pips[n] ?? []).map(([x, y], i) => (
        <span key={i} className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-2.5 sm:w-2.5" style={{ left: `${x}%`, top: `${y}%`, backgroundColor: `rgb(${ROSE})` }} />
      ))}
    </motion.div>
  );
}

function S4() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <ChapterMark text="play it live" color={`rgb(${ROSE})`} />
      <p className="mt-5 max-w-2xl font-reading text-[clamp(18px,2.6vw,30px)] italic leading-snug" style={{ color: P(0.92) }}>
        <Ink text="The door groans open. Kestrel — what do you do?" delay={0.6} step={0.1} />
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Die n={5} delay={2.6} />
        <Die n={3} delay={2.85} />
      </div>
      <motion.p className="mt-4 font-mono text-[12px] uppercase tracking-[0.24em]" style={{ color: `rgb(${ROSE})` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.8, duration: 0.5 }}>
        8 · success, at a price
      </motion.p>
      <motion.p className="mt-6 font-reading text-[clamp(14px,1.9vw,20px)] italic" style={{ color: P(0.75) }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.7, duration: 0.7 }}>
        Adventure Mode — a narrator, a table of players, and every session becomes a chapter.
      </motion.p>
    </div>
  );
}

// ── Scene 5 · together — equal credit, workshop ──────────────────────────────
const TOGETHER_CHIPS = ["Workshop", "Suggestions", "Lore Book", "Open Calls"];

function S5() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="font-display text-[clamp(22px,3.4vw,38px)] leading-tight" style={{ color: P(0.95) }}>
        <Ink text="Written by Mara Vey" delay={0.4} style={{ color: `rgb(${GOLDL})` }} />
        <span className="mx-3 opacity-40">·</span>
        <Ink text="Illustrated by Juno Park" delay={1.1} style={{ color: `rgb(${AMETHL})` }} />
      </div>
      <motion.p className="mt-2 font-mono text-[11px] uppercase tracking-[0.24em]" style={{ color: P(0.45) }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.6 }}>
        same size · always
      </motion.p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {TOGETHER_CHIPS.map((c, i) => (
          <motion.span
            key={c}
            className="rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest"
            style={{ borderColor: `rgba(${AMETHL},0.35)`, color: `rgb(${AMETHL})`, backgroundColor: `rgba(${AMETH},0.08)` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.7 + i * 0.18, duration: 0.4 }}
          >
            {c}
          </motion.span>
        ))}
      </div>
      <motion.p className="mt-6 font-reading text-[clamp(16px,2.2vw,24px)] italic" style={{ color: P(0.85) }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.8, duration: 0.8 }}>
        Made together. Credit shared, always.
      </motion.p>
    </div>
  );
}

// ── Scene 6 · for the reader — react, spark, steer ───────────────────────────
const REACTIONS = [{ e: "😮", l: "gasped" }, { e: "💔", l: "heartbroken" }, { e: "✨", l: "inspired" }, { e: "🔥", l: "needs more" }];

function SparkCount() {
  const [n, setN] = useState(1284);
  useEffect(() => {
    const id = window.setInterval(() => setN((v) => (v < 1312 ? v + 1 : v)), 130);
    return () => window.clearInterval(id);
  }, []);
  return (
    <motion.div
      className="flex items-center gap-2 rounded-full border px-5 py-2"
      style={{ borderColor: `rgba(${GOLDL},0.4)`, backgroundColor: `rgba(${GOLD},0.1)`, boxShadow: `0 0 26px rgba(${GOLD},0.2)` }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.5 }}
    >
      <span style={{ color: `rgb(${GOLDL})` }}>✦</span>
      <span className="font-mono text-[13px] tabular-nums" style={{ color: `rgb(${GOLDL})` }}>{n.toLocaleString()}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: P(0.5) }}>sparks</span>
    </motion.div>
  );
}

function PollBar({ label, pct, win, delay }: { label: string; pct: number; win: boolean; delay: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-6">
        <span className="font-reading text-[clamp(13px,1.6vw,16px)] italic" style={{ color: P(win ? 0.92 : 0.6) }}>{label}</span>
        <motion.span className="font-mono text-[11px] tabular-nums" style={{ color: win ? `rgb(${GOLDL})` : P(0.45) }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 1.2, duration: 0.4 }}>
          {pct}%
        </motion.span>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full" style={{ backgroundColor: P(0.1) }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: win ? `rgb(${GOLDL})` : `rgba(${AMETHL},0.55)`, boxShadow: win ? `0 0 12px rgba(${GOLD},0.5)` : "none" }}
          initial={{ width: "4%" }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 1.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function S6() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
      {REACTIONS.map((r, i) => (
        <motion.div
          key={i}
          className="absolute flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[13px] backdrop-blur-sm"
          style={{ left: `${14 + i * 21}%`, color: P(0.9) }}
          initial={{ top: "100%", opacity: 0 }}
          animate={{ top: "-8%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 6, delay: 0.8 + i * 1.1, ease: "easeOut", times: [0, 0.15, 0.8, 1] }}
        >
          <span className="text-base">{r.e}</span>{r.l}
        </motion.div>
      ))}
      <ChapterMark text="for the reader" color={`rgb(${AMETHL})`} />
      <div className="mt-6"><SparkCount /></div>
      <motion.div
        className="mt-7 w-[min(440px,84vw)] rounded-xl border p-5 text-left"
        style={{ borderColor: `rgba(${AMETHL},0.25)`, backgroundColor: "rgba(30,24,17,0.85)", boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.7 }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: `rgb(${AMETHL})` }}>crossroads · the readers decide</p>
        <p className="mt-2 font-display text-[clamp(16px,2vw,20px)]" style={{ color: P(0.92) }}>Where does Mira go next?</p>
        <div className="mt-4 flex flex-col gap-3">
          <PollBar label="The lighthouse" pct={64} win delay={3.4} />
          <PollBar label="The salt caves" pct={36} win={false} delay={3.6} />
        </div>
      </motion.div>
      <motion.p className="mt-6 font-reading text-[clamp(15px,2vw,22px)] italic" style={{ color: P(0.85) }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 5.6, duration: 0.8 }}>
        Readers don&apos;t just read — they steer.
      </motion.p>
    </div>
  );
}

// ── Scene 7 · the work pays ──────────────────────────────────────────────────
const PAY_CHIPS = ["Gifts", "Chapter unlocks", "The Circle", "Commissions"];

function S7() {
  // ink drops fall into the well and it fills with light — drops are the
  // currency, and a filling well reads as earnings (bare drops read as tears)
  const DROP_TIMES = [0.5, 1.05, 1.6];
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="relative h-[150px] w-[150px]">
        {DROP_TIMES.map((d, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-0 -translate-x-1/2"
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 44, opacity: [0, 1, 1, 0] }}
            transition={{ delay: d, duration: 0.55, ease: "easeIn", times: [0, 0.2, 0.85, 1] }}
          >
            <svg width="15" height="20" viewBox="0 0 30 40" fill="none">
              <path d="M15 2 C 21 12 27 19 27 27 a12 12 0 1 1 -24 0 C 3 19 9 12 15 2 Z" fill={`rgba(${GOLDL},0.95)`} style={{ filter: `drop-shadow(0 0 8px rgba(${GOLD},0.8))` }} />
            </svg>
          </motion.div>
        ))}
        {/* warm bloom behind the well, brightening with each drop */}
        <motion.div
          className="absolute left-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ top: "64%", background: `radial-gradient(circle, rgba(${GOLD},0.5), transparent 65%)`, filter: "blur(6px)" }}
          initial={{ opacity: 0.1, scale: 0.9 }}
          animate={{ opacity: [0.1, 0.3, 0.55, 0.85], scale: [0.9, 0.95, 1, 1.06] }}
          transition={{ duration: 2.2, delay: 0.5, times: [0, 0.35, 0.7, 1], ease: "easeOut" }}
        />
        {/* the inkwell */}
        <svg className="absolute left-1/2 -translate-x-1/2" style={{ top: 28 }} width="120" height="110" viewBox="0 0 120 110" fill="none">
          <path
            d="M42 22 H78 V36 L88 42 Q98 50 98 64 V86 Q98 100 84 100 H36 Q22 100 22 86 V64 Q22 50 32 42 L42 36 Z"
            fill="rgba(26,21,16,0.95)"
            stroke={P(0.4)}
            strokeWidth="2"
          />
          <rect x="38" y="12" width="44" height="10" rx="4" fill="rgba(26,21,16,0.95)" stroke={P(0.4)} strokeWidth="2" />
          <motion.ellipse
            cx="60" cy="82" rx="28" ry="11"
            fill={`rgba(${GOLDL},0.9)`}
            initial={{ opacity: 0.12 }}
            animate={{ opacity: [0.12, 0.35, 0.6, 0.95] }}
            transition={{ duration: 2.2, delay: 0.5, times: [0, 0.35, 0.7, 1] }}
            style={{ filter: `blur(3px) drop-shadow(0 0 14px rgba(${GOLD},0.9))` }}
          />
        </svg>
      </div>
      <motion.p
        className="mt-3 font-mono text-[12px] uppercase tracking-[0.24em]"
        style={{ color: `rgb(${GOLDL})` }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4, duration: 0.6 }}
      >
        +340 drops · this chapter
      </motion.p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {PAY_CHIPS.map((c, i) => (
          <motion.span
            key={c}
            className="rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest"
            style={{ borderColor: `rgba(${GOLDL},0.35)`, color: `rgb(${GOLDL})`, backgroundColor: `rgba(${GOLD},0.07)` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.0 + i * 0.16, duration: 0.4 }}
          >
            {c}
          </motion.span>
        ))}
      </div>
      <motion.p className="mt-7 font-reading text-[clamp(16px,2.2vw,24px)] italic" style={{ color: P(0.85) }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.0, duration: 0.8 }}>
        And the work pays — straight to the makers.
      </motion.p>
    </div>
  );
}

// ── Scene 8 · how it's different ─────────────────────────────────────────────
function S8() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
      <motion.p
        className="font-display text-[clamp(20px,3vw,34px)]"
        style={{ color: P(0.85) }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: [0, 1, 1, 0.28] }}
        transition={{ delay: 0.4, duration: 2.8, times: [0, 0.2, 0.75, 1] }}
      >
        No endless feed.
      </motion.p>
      <motion.p
        className="mt-3 font-display text-[clamp(20px,3vw,34px)]"
        style={{ color: P(0.85) }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: [0, 1, 1, 0.28] }}
        transition={{ delay: 1.4, duration: 2.4, times: [0, 0.25, 0.75, 1] }}
      >
        No algorithm chasing your attention.
      </motion.p>
      <motion.p
        className="mt-9 font-display text-[clamp(26px,4.2vw,48px)] leading-tight"
        style={{ color: `rgb(${GOLDL})`, textShadow: `0 0 50px rgba(${GOLD},0.4)` }}
        initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 3.4, duration: 1.1, ease: "easeOut" }}
      >
        A lamplit library, kept by people.
      </motion.p>
    </div>
  );
}

// ── Scene 9 · two worlds, one river ──────────────────────────────────────────
const DRAGON: [number, number][] = [[30, 62], [38, 50], [46, 44], [54, 38], [62, 32], [72, 24], [43, 28], [39, 40], [66, 14], [70, 28]];

// mounts the animated logo late so its ink-on sequence plays while visible
function ClosingLogo({ delayMs }: { delayMs: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);
  if (!show) return <div style={{ height: 72 }} />;
  return (
    <div style={{ filter: `drop-shadow(0 0 36px rgba(${GOLD},0.35))` }}>
      <QuillRingLogoAnimated size={72} textClassName="text-[clamp(30px,4.6vw,52px)]" />
    </div>
  );
}

function S9() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div className="absolute left-[8%] top-1/2 h-[60vmin] w-[60vmin] -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, rgba(${GOLD},0.22), transparent 65%)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} />
        <motion.div className="absolute right-[8%] top-1/2 h-[60vmin] w-[60vmin] -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, rgba(${AMETH},0.22), transparent 65%)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} />
        {/* the dragon resolves, star by star */}
        {DRAGON.map(([x, y], i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${x}%`, top: `${y}%`, width: i === 5 ? 6 : 4, height: i === 5 ? 6 : 4, backgroundColor: i === 5 ? `rgb(${RUBY})` : P(0.9), boxShadow: `0 0 8px ${i === 5 ? `rgba(${RUBY},0.9)` : P(0.7)}` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.12, duration: 0.4 }}
          />
        ))}
      </div>
      <River y="74%" count={20} />
      <motion.p className="relative z-10 max-w-2xl font-reading text-[clamp(18px,2.8vw,30px)] italic leading-snug" style={{ color: P(0.92) }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.9 }}>
        From the writer&apos;s imagination to the reader&apos;s world.
      </motion.p>
      <div className="relative z-10 mt-7 flex flex-col items-center gap-4">
        <ClosingLogo delayMs={2300} />
        <motion.span
          className="rounded-full px-6 py-2.5 text-[15px] font-semibold"
          style={{ backgroundColor: `rgb(${GOLDL})`, color: "rgb(30,20,10)", boxShadow: `0 0 36px rgba(${GOLD},0.45)` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.9, duration: 0.8 }}
        >
          Begin your first line — quiloria.app
        </motion.span>
      </div>
    </div>
  );
}

const SCENE_COMPONENTS = [S1, S2, S3, S4, S5, S6, S7, S8, S9];

// ═════════════════════════════════════════════════════════════════════════════

export default function PromoPage() {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0); // ms within current scene
  // ?record — hide the chrome, hold black briefly, run once (for screen capture)
  const [record, setRecord] = useState(false);
  const [recordStarted, setRecordStarted] = useState(false);
  const done = scene === SCENES.length - 1 && elapsed >= SCENES[scene] * 1000;
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!window.location.search.includes("record")) return;
    setRecord(true);
    setPlaying(false);
    const t = window.setTimeout(() => {
      setScene(0);
      setElapsed(0);
      setRecordStarted(true);
      setPlaying(true);
    }, 1500);
    return () => window.clearTimeout(t);
  }, []);

  // the clock — ticks while playing (manual stepping if reduced motion).
  // scene advancement lives in its own effect: calling setScene inside the
  // setElapsed updater is impure, and StrictMode's double-invocation made
  // every boundary skip a scene.
  useEffect(() => {
    if (!playing || reduce) return;
    timer.current = window.setInterval(() => {
      setElapsed((e) => Math.min(e + TICK, SCENES[scene] * 1000));
    }, TICK);
    return () => window.clearInterval(timer.current);
  }, [playing, scene, reduce]);

  useEffect(() => {
    if (elapsed < SCENES[scene] * 1000) return;
    if (scene < SCENES.length - 1) {
      setScene(scene + 1);
      setElapsed(0);
    } else {
      setPlaying(false);
    }
  }, [elapsed, scene]);

  const restart = useCallback(() => {
    setScene(0);
    setElapsed(0);
    setPlaying(true);
  }, []);
  const step = useCallback((dir: 1 | -1) => {
    setScene((s) => Math.min(SCENES.length - 1, Math.max(0, s + dir)));
    setElapsed(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => (done ? p : !p)); }
      if (e.code === "ArrowRight") step(1);
      if (e.code === "ArrowLeft") step(-1);
      if (e.code === "KeyR") restart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, restart, done]);

  const Scene = SCENE_COMPONENTS[scene];

  return (
    // theme-dark — the film is always lamplit; without this, Daybreak's espresso
    // --t-paper / burnt-amber --t-gold leak into the logo and vanish on mahogany
    <div className="theme-dark fixed inset-0 z-[200] overflow-hidden" style={{ backgroundColor: MAHOG }} data-promo-done={done ? "true" : "false"}>
      {/* warm breath behind every scene */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(110% 80% at 50% 30%, rgba(${GOLD},0.06), transparent 60%)` }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(135% 110% at 50% 50%, transparent 55%, rgba(8,5,3,0.8) 100%)` }} />

      {/* the film */}
      <AnimatePresence mode="wait">
        <motion.div
          key={recordStarted ? `r-${scene}` : scene}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.015 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <Scene />
        </motion.div>
      </AnimatePresence>

      {/* record mode — hold pure mahogany until the run begins */}
      {record && !recordStarted && <div className="absolute inset-0 z-50" style={{ backgroundColor: MAHOG }} />}

      {!record && (
        <>
          {/* progress — one segment per scene */}
          <div className="absolute inset-x-0 top-0 z-20 flex gap-1.5 px-5 pt-4 sm:px-8">
            {SCENES.map((dur, i) => (
              <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full" style={{ backgroundColor: P(0.12) }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: `rgb(${GOLDL})`,
                    width: i < scene ? "100%" : i === scene ? `${Math.min(100, (elapsed / (dur * 1000)) * 100)}%` : "0%",
                    transition: "width 120ms linear",
                  }}
                />
              </div>
            ))}
          </div>

          {/* controls — quiet, bottom corners */}
          <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2 sm:left-8">
            <button type="button" onClick={() => (done ? restart() : setPlaying((p) => !p))} aria-label={playing ? "Pause" : "Play"} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40 backdrop-blur transition-colors hover:bg-black/60" style={{ color: P(0.9) }}>
              {done ? <RotateCcw className="h-4 w-4" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>
            {(reduce || !playing) && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous scene" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40 backdrop-blur transition-colors hover:bg-black/60" style={{ color: P(0.7) }}><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => step(1)} aria-label="Next scene" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40 backdrop-blur transition-colors hover:bg-black/60" style={{ color: P(0.7) }}><ChevronRight className="h-4 w-4" /></button>
              </>
            )}
            {!playing && !done && <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: P(0.4) }}>space to play · ←→ scenes · r restarts</span>}
          </div>
          <div className="absolute bottom-5 right-5 z-20 sm:right-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: P(0.35) }}>quiloria.app · 55s</span>
          </div>
        </>
      )}
    </div>
  );
}
