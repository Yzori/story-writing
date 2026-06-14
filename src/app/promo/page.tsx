"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { hash, arand } from "@/components/dashboard/studio-kit";
import { QuillRingLogoAnimated } from "@/components/shared/BrandLogoAnimated";

// ─────────────────────────────────────────────────────────────────────────────
// Quiloria — "A world made of ink". A playable, full-screen cinematic in the
// hero-video language (mahogany dark, firelight gold, amethyst, luminous ink).
// Spine: create (3 ways) → don't build it alone (the guild/marketplace) →
// readers answer back → readers help carry it → the loop → come make something.
// Append ?record to hide chrome and auto-run once for capture
// (scripts/record-promo.mjs). Public route — no auth required.
//
//   1. 0–4s     A drop of ink becomes a world
//   2. 4–12s    Three thresholds — Study / Workshop / Tavern (the 3 modes)
//   3. 12–20s   The guild — summon illustrators & artisans (commissions)
//   4. 20–27s   The reader answers — reactions, sparks, marginalia
//   5. 27–35s   They help carry it — steer (Crossroads), gift, the Circle
//   6. 35–40s   One current — makers · artisans · readers
//   7. 40–46s   Come make something that doesn't exist yet — quiloria.app
// ─────────────────────────────────────────────────────────────────────────────

const MAHOG = "rgb(17,14,10)";
const GOLD = "200,150,60";
const GOLDL = "224,178,96";
const AMETH = "126,94,158";
const AMETHL = "168,140,200";
const PARCH = "242,232,208";
const ROSE = "184,105,122";
const ROSEL = "212,150,166";
const RUBY = "158,59,66";
const TEAL = "104,168,158";
const TEALL = "150,205,195";
const P = (a: number) => `rgba(${PARCH},${a})`;

const SCENES = [4, 8, 8, 7, 8, 5, 6]; // seconds — 46 total
const TICK = 100;

// ── reusable ink primitives ──────────────────────────────────────────────────

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

// the caret travels with the writing as each word reveals
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

// small mono chapter label
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

const Line = ({ w, c = P(0.5) }: { w: string; c?: string }) => <div className="h-[3px] rounded-full" style={{ width: w, backgroundColor: c }} />;

// ambient ink-motes — a persistent, slowly drifting dust of light behind every
// scene. Lives outside the scene swap so it never resets: the room is alive.
function Motes({ count = 30 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const x = arand(hash(`mo-x-${i}`)) * 100;
        const y = arand(hash(`mo-y-${i}`)) * 100;
        const s = 1.4 + arand(hash(`mo-s-${i}`)) * 2.6;
        const dur = 8 + arand(hash(`mo-d-${i}`)) * 9;
        const dx = (arand(hash(`mo-dx-${i}`)) - 0.5) * 70;
        const dy = -40 - arand(hash(`mo-dy-${i}`)) * 70;
        const gold = i % 3 !== 0;
        const col = gold ? GOLDL : AMETHL;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, backgroundColor: `rgb(${col})`, boxShadow: `0 0 ${Math.round(s * 2.4)}px rgba(${col},0.8)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.65, 0.65, 0], x: [0, dx], y: [0, dy] }}
            transition={{ duration: dur, delay: arand(hash(`mo-t-${i}`)) * dur, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.8, 1] }}
          />
        );
      })}
    </div>
  );
}

// ── Scene 1 · a drop of ink becomes a world ──────────────────────────────────
function S1() {
  const IMPACT = 1.15; // when the drop lands
  const splash = Array.from({ length: 10 });
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
      {/* the drop falls, stretching as it accelerates, with a faint ink trail */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: "14%", transformOrigin: "center bottom" }}
        initial={{ y: -150, opacity: 0, scaleY: 1.5, scaleX: 0.85 }}
        animate={{ y: 150, opacity: [0, 1, 1, 0], scaleY: [1.7, 1.25, 1, 0.7], scaleX: [0.8, 0.95, 1, 1.25] }}
        transition={{ delay: 0.3, duration: 0.85, ease: "easeIn", times: [0, 0.2, 0.85, 1] }}
      >
        <svg width="16" height="22" viewBox="0 0 30 40" fill="none">
          <path d="M15 2 C 21 12 27 19 27 27 a12 12 0 1 1 -24 0 C 3 19 9 12 15 2 Z" fill={`rgba(${GOLDL},0.96)`} style={{ filter: `drop-shadow(0 0 12px rgba(${GOLD},0.95))` }} />
        </svg>
      </motion.div>

      {/* impact splash — droplets arc out under gravity */}
      <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
        {splash.map((_, i) => {
          const a = (i / splash.length) * Math.PI * 2 + arand(hash(`sa-${i}`)) * 0.4;
          const dist = 56 + arand(hash(`sd-${i}`)) * 54;
          const sz = 2 + arand(hash(`ss-${i}`)) * 2;
          return (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{ width: sz, height: sz, backgroundColor: `rgb(${GOLDL})`, boxShadow: `0 0 6px rgba(${GOLD},0.9)` }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
              animate={{ x: Math.cos(a) * dist, y: [0, Math.sin(a) * dist - 18, Math.sin(a) * dist + 26], opacity: [0, 1, 0], scale: [1, 0.5] }}
              transition={{ delay: IMPACT, duration: 0.95, ease: "easeOut", times: [0, 0.4, 1] }}
            />
          );
        })}
      </div>

      {/* the churning ink-world — keeps rotating, alive */}
      <motion.div
        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: "30vmin", height: "30vmin", background: `conic-gradient(from 0deg, rgba(${GOLD},0.5), rgba(${AMETH},0.3), rgba(${GOLDL},0.46), rgba(${AMETH},0.3), rgba(${GOLD},0.5))`, filter: "blur(3px)", mixBlendMode: "screen" }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 0.85, 0.62], scale: [0, 1.12, 1], rotate: 360 }}
        transition={{ opacity: { delay: IMPACT, duration: 1.4, times: [0, 0.5, 1] }, scale: { delay: IMPACT, duration: 1.4, ease: "easeOut", times: [0, 0.5, 1] }, rotate: { delay: IMPACT, duration: 24, ease: "linear", repeat: Infinity } }}
      />
      {/* warm core, breathing */}
      <motion.div
        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: "16vmin", height: "16vmin", background: `radial-gradient(circle, rgba(${GOLDL},0.62), transparent 70%)` }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.9, 0.72, 0.82, 0.72], scale: [0.4, 1.02, 0.96, 1.0, 0.96] }}
        transition={{ delay: IMPACT, duration: 6, ease: "easeOut", times: [0, 0.25, 0.5, 0.75, 1] }}
      />
      {/* two shockwave rings off the impact */}
      {[0, 0.18].map((d, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ width: "16vmin", height: "16vmin", borderColor: `rgba(${GOLDL},0.5)` }}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 0.7, 0], scale: [0.2, 2.4, 3] }}
          transition={{ delay: IMPACT + d, duration: 1.5, ease: "easeOut" }}
        />
      ))}

      <p className="relative z-10 mt-[30vmin] max-w-2xl font-reading text-[clamp(20px,3.2vw,38px)] italic leading-snug" style={{ color: P(0.92) }}>
        <TypedInk text="Every world begins as a drop of ink." delay={2.05} step={0.14} />
      </p>
    </div>
  );
}

// ── Scene 2 · three thresholds (the three modes) ─────────────────────────────
function QuillIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20c6-1 9.5-4 12.5-9C18 8.5 18.5 5.5 18.5 3 15.5 3 12.5 3.6 10 5 5 8 2 13 2 19" />
      <path d="M6.5 17.5 13 11" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </svg>
  );
}
function DieIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      {[[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.4" fill="currentColor" stroke="none" />
      ))}
    </svg>
  );
}

function Threshold({ name, mode, accent, accentL, delay, children }: { name: string; mode: string; accent: string; accentL: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: 34, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.75, ease: [0.34, 1.45, 0.5, 1] }}
    >
      {/* the door floats, as if lit from within */}
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}>
        <div
          className="relative h-[clamp(140px,21vh,196px)] w-[clamp(100px,12vw,140px)] overflow-hidden rounded-t-[999px] rounded-b-lg border"
          style={{
            borderColor: `rgba(${accentL},0.42)`,
            background: `linear-gradient(180deg, rgba(${accent},0.03), rgba(${accent},0.2))`,
            boxShadow: `0 0 42px rgba(${accent},0.22), inset 0 -34px 54px rgba(${accent},0.2)`,
          }}
        >
          {/* hearth-light pooled at the threshold, flickering */}
          <motion.div
            className="absolute inset-x-0 bottom-0 h-2/3"
            style={{ background: `linear-gradient(180deg, transparent, rgba(${accentL},0.32))` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.82, 1, 0.9, 1] }}
            transition={{ delay: delay + 0.4, duration: 4.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[-12%] left-1/2 h-[56%] w-[130%] -translate-x-1/2 rounded-full"
            style={{ background: `radial-gradient(ellipse at center, rgba(${accentL},0.3), transparent 70%)`, filter: "blur(7px)" }}
            animate={{ opacity: [0.5, 0.85, 0.55] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay }}
          />
          {/* the motif, breathing with light */}
          <motion.div
            className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2"
            style={{ color: `rgb(${accentL})` }}
            animate={{
              scale: [1, 1.09, 1],
              filter: [`drop-shadow(0 0 8px rgba(${accent},0.55))`, `drop-shadow(0 0 17px rgba(${accent},0.95))`, `drop-shadow(0 0 8px rgba(${accent},0.55))`],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 }}
          >
            {children}
          </motion.div>
        </div>
      </motion.div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-display text-[clamp(14px,1.8vw,20px)]" style={{ color: P(0.95) }}>{name}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: `rgb(${accentL})` }}>{mode}</span>
      </div>
    </motion.div>
  );
}

function S2() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <ChapterMark text="three ways in" color={`rgb(${GOLDL})`} />
      <motion.h2 className="mt-3 font-display text-[clamp(24px,3.6vw,42px)] leading-tight" style={{ color: P(0.95) }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
        Every story starts at a threshold.
      </motion.h2>
      <div className="mt-8 flex flex-wrap items-start justify-center gap-5 sm:gap-8">
        <Threshold name="The Study" mode="write alone" accent={GOLD} accentL={GOLDL} delay={1.3}><QuillIcon /></Threshold>
        <Threshold name="The Workshop" mode="build together" accent={AMETH} accentL={AMETHL} delay={1.7}><LinkIcon /></Threshold>
        <Threshold name="The Tavern" mode="play it live" accent={ROSE} accentL={ROSEL} delay={2.1}><DieIcon /></Threshold>
      </div>
      <p className="mt-8 font-reading text-[clamp(15px,2vw,22px)] italic" style={{ color: P(0.8) }}>
        <Ink text="Write it alone, build it with others, or roll the dice and play it live." delay={3.0} step={0.05} />
      </p>
    </div>
  );
}

// ── Scene 3 · the guild — summon illustrators & artisans ─────────────────────
const CRAFTS_RING = [
  { label: "Cover Art", group: "visual" },
  { label: "Character Art", group: "visual" },
  { label: "Worldbuilding", group: "services" },
  { label: "GM for Hire", group: "services" },
  { label: "Editing", group: "writing" },
  { label: "Scene Illustration", group: "visual" },
] as const;

const GROUP_COL: Record<string, [string, string]> = {
  visual: [AMETH, AMETHL],
  writing: [GOLD, GOLDL],
  services: [TEAL, TEALL],
};

function S3() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <ChapterMark text="the guild" color={`rgb(${AMETHL})`} />
      <motion.h2 className="mt-3 font-display text-[clamp(24px,3.6vw,42px)] leading-tight" style={{ color: P(0.95) }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
        Summon the hands you need.
      </motion.h2>

      <div className="relative mt-4 h-[clamp(230px,36vh,300px)] w-[min(560px,92vw)]">
        {/* the guild ring */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ width: "70%", height: "82%", borderColor: `rgba(${AMETHL},0.16)` }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.9, ease: "easeOut" }}
        />
        {/* your story at the centre */}
        <motion.div
          className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="h-11 w-11 rounded-lg" style={{ background: `linear-gradient(135deg, rgba(${GOLDL},0.9), rgba(${GOLD},0.5))`, boxShadow: `0 0 26px rgba(${GOLD},0.55)` }} />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: P(0.6) }}>your story</span>
        </motion.div>
        {/* artisans around the ring */}
        {CRAFTS_RING.map((c, i) => {
          const angle = (-90 + i * 60) * (Math.PI / 180);
          const left = 50 + 35 * Math.cos(angle);
          const top = 50 + 40 * Math.sin(angle);
          const [base, light] = GROUP_COL[c.group];
          return (
            <motion.span
              key={c.label}
              className="absolute whitespace-nowrap rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: "translate(-50%,-50%)",
                borderColor: `rgba(${light},0.4)`,
                color: `rgb(${light})`,
                backgroundColor: `rgba(${base},0.12)`,
                boxShadow: c.group === "visual" ? `0 0 18px rgba(${base},0.32)` : "none",
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + i * 0.16, duration: 0.5, ease: "backOut" }}
            >
              {c.label}
            </motion.span>
          );
        })}
      </div>

      <motion.p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: `rgb(${AMETHL})` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8, duration: 0.6 }}>
        open calls · find your illustrator
      </motion.p>
      <motion.p className="mt-4 font-reading text-[clamp(15px,2vw,22px)] italic" style={{ color: P(0.82) }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.4, duration: 0.8 }}>
        You don&apos;t have to build the world alone.
      </motion.p>
    </div>
  );
}

// ── Scene 4 · the reader answers ─────────────────────────────────────────────
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

function S4() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
      {REACTIONS.map((r, i) => (
        <motion.div
          key={i}
          className="absolute flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[13px] backdrop-blur-sm"
          style={{ left: `${14 + i * 21}%`, color: P(0.9) }}
          initial={{ top: "100%", opacity: 0 }}
          animate={{ top: "-8%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 6, delay: 0.8 + i * 1.0, ease: "easeOut", times: [0, 0.15, 0.8, 1] }}
        >
          <span className="text-base">{r.e}</span>{r.l}
        </motion.div>
      ))}
      <ChapterMark text="the reader answers" color={`rgb(${AMETHL})`} />
      <div className="mt-6"><SparkCount /></div>
      {/* a note in the margin */}
      <motion.div
        className="relative mt-7 w-[min(440px,84vw)] rounded-xl border p-5 text-left"
        style={{ borderColor: `rgba(${GOLDL},0.22)`, backgroundColor: "rgba(30,24,17,0.88)", boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.0, duration: 0.7 }}
      >
        <div className="flex flex-col gap-[7px] pr-12">
          {["94%", "100%", "86%", "70%"].map((w, i) => <Line key={i} w={w} c={P(0.42)} />)}
        </div>
        <motion.span
          className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: `rgb(${GOLDL})`, boxShadow: `0 0 11px rgba(${GOLD},0.95)` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2.9, type: "spring", stiffness: 460, damping: 16 }}
        />
        <motion.span
          className="absolute right-6 top-9 font-reading text-[12px] italic"
          style={{ color: P(0.7) }}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 3.2, duration: 0.5 }}
        >
          this line undid me.
        </motion.span>
      </motion.div>
      <motion.p className="mt-6 font-reading text-[clamp(15px,2vw,22px)] italic" style={{ color: P(0.85) }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.3, duration: 0.8 }}>
        They don&apos;t just read — they gasp, spark, and write in the margins.
      </motion.p>
    </div>
  );
}

// ── Scene 5 · they help carry it (steer / gift / the Circle) ─────────────────
const SUPPORT_CHIPS = ["Gifts", "Chapter Unlocks", "The Circle"];

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

function S5() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <ChapterMark text="they help carry it" color={`rgb(${GOLDL})`} />
      {/* steer — a Crossroads vote tips the path */}
      <motion.div
        className="mt-5 w-[min(440px,84vw)] rounded-xl border p-5 text-left"
        style={{ borderColor: `rgba(${AMETHL},0.25)`, backgroundColor: "rgba(30,24,17,0.85)", boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: `rgb(${AMETHL})` }}>crossroads · the readers steer</p>
        <p className="mt-2 font-display text-[clamp(16px,2vw,20px)]" style={{ color: P(0.92) }}>Which path does she take?</p>
        <div className="mt-4 flex flex-col gap-3">
          <PollBar label="Into the storm" pct={68} win delay={1.4} />
          <PollBar label="Back to the harbor" pct={32} win={false} delay={1.6} />
        </div>
      </motion.div>
      {/* support — gift it, join the Circle */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {SUPPORT_CHIPS.map((c, i) => (
          <motion.span
            key={c}
            className="rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest"
            style={{ borderColor: `rgba(${GOLDL},0.35)`, color: `rgb(${GOLDL})`, backgroundColor: `rgba(${GOLD},0.07)` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.4 + i * 0.16, duration: 0.4 }}
          >
            {c}
          </motion.span>
        ))}
      </div>
      <motion.p className="mt-6 font-reading text-[clamp(15px,2.1vw,23px)] italic" style={{ color: P(0.85) }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.4, duration: 0.8 }}>
        Steer it, gift it, join the Circle — the well refills.
      </motion.p>
    </div>
  );
}

// ── Scene 6 · one current ────────────────────────────────────────────────────
const LOOP_NODES: { l: string; c: string }[] = [
  { l: "Makers", c: GOLDL },
  { l: "Artisans", c: AMETHL },
  { l: "Readers", c: ROSEL },
];

function S6() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
      <River y="50%" count={24} />
      <div className="relative z-10 flex items-center gap-[clamp(28px,8vw,90px)]">
        {LOOP_NODES.map((n, i) => (
          <motion.div
            key={n.l}
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.35, duration: 0.6, ease: "backOut" }}
          >
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: `rgb(${n.c})`, boxShadow: `0 0 18px rgba(${n.c},0.9)` }} />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: `rgb(${n.c})` }}>{n.l}</span>
          </motion.div>
        ))}
      </div>
      <motion.p className="relative z-10 mt-10 max-w-2xl font-reading text-[clamp(16px,2.4vw,26px)] italic leading-snug" style={{ color: P(0.9) }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9, duration: 0.9 }}>
        Makers, artisans, readers — one current, always moving.
      </motion.p>
    </div>
  );
}

// ── Scene 7 · come make something ────────────────────────────────────────────
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

function S7() {
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
      <motion.p className="relative z-10 max-w-2xl font-reading text-[clamp(19px,2.9vw,32px)] italic leading-snug" style={{ color: P(0.92) }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.9 }}>
        Come make something that doesn&apos;t exist yet.
      </motion.p>
      <div className="relative z-10 mt-7 flex flex-col items-center gap-4">
        <ClosingLogo delayMs={2200} />
        <motion.span
          className="rounded-full px-6 py-2.5 text-[15px] font-semibold"
          style={{ backgroundColor: `rgb(${GOLDL})`, color: "rgb(30,20,10)", boxShadow: `0 0 36px rgba(${GOLD},0.45)` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.8, duration: 0.8 }}
        >
          Start free — quiloria.app
        </motion.span>
      </div>
    </div>
  );
}

const SCENE_COMPONENTS = [S1, S2, S3, S4, S5, S6, S7];

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

      {/* ambient ink-dust, alive behind every scene (persists across the swap) */}
      <Motes count={30} />

      {/* the film — outer crossfades, inner holds a slow camera push */}
      <AnimatePresence mode="wait">
        <motion.div
          key={recordStarted ? `r-${scene}` : scene}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.07 }}
            animate={{ scale: 1 }}
            transition={{ duration: 9, ease: [0.16, 0.5, 0.2, 1] }}
          >
            <Scene />
          </motion.div>
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
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: P(0.35) }}>quiloria.app · 46s</span>
          </div>
        </>
      )}
    </div>
  );
}
