"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Swords, MessageSquareText, Users, Heart, Coins, PenLine } from "lucide-react";
import { CoverArt, paletteFor, hash, arand } from "@/components/dashboard/studio-kit";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Shared engine for the "place" dashboard mockups (Hearth / Treehouse /
// Bookshop): one drawn SVG scene, HTML hotspots mapped to its 1200×640
// coordinates, one tooltip grammar, and the common cozy primitives (flames,
// steam, motes, ink greeting, desk-note rail cards). Throwaway exploration
// support — not linked from the app shell.
// ─────────────────────────────────────────────────────────────────────────────

export const VIEW_W = 1200;
export const VIEW_H = 640;

// warm room palette — Lamplight wood, cream ink, accent fabrics
export const WOOD = { light: "rgb(124,88,55)", mid: "rgb(98,68,43)", dark: "rgb(66,45,29)", deep: "rgb(45,31,21)" };
export const CREAM = (a: number) => `rgba(242,229,206,${a})`;
export const GLOW = "240,196,120";
export const ROSE = "184,105,122";
export const SAGE = "124,160,116";
export const LAV = "154,122,208";

export const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ── zones: a piece of furniture the user can touch ───────────────────────────
export interface Zone {
  key: string;
  rect: [number, number, number, number];
  href?: string;
  eyebrow: string;
  title: string;
  sub: string;
  cta?: string;
  cover?: { seed: string; title: string; image?: string | null };
}

export function ZoneLayer({ zones, setHot }: { zones: Zone[]; setHot: (k: string | null) => void }) {
  return (
    <>
      {zones.map((z) => {
        const style = {
          left: `${(z.rect[0] / VIEW_W) * 100}%`,
          top: `${(z.rect[1] / VIEW_H) * 100}%`,
          width: `${(z.rect[2] / VIEW_W) * 100}%`,
          height: `${(z.rect[3] / VIEW_H) * 100}%`,
        };
        const handlers = {
          onMouseEnter: () => setHot(z.key),
          onMouseLeave: () => setHot(null),
          onFocus: () => setHot(z.key),
          onBlur: () => setHot(null),
        };
        return z.href ? (
          <Link key={z.key} href={z.href} aria-label={`${z.title} — ${z.sub}`} className="absolute z-20 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber/60" style={style} {...handlers} />
        ) : (
          <div key={z.key} role="img" aria-label={`${z.title} — ${z.sub}`} tabIndex={0} className="absolute z-20 cursor-default rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber/40" style={style} {...handlers} />
        );
      })}
    </>
  );
}

export function ZoneTip({ zones, hot }: { zones: Zone[]; hot: string | null }) {
  const tip = hot ? zones.find((z) => z.key === hot) : null;
  if (!tip) return null;
  const above = tip.rect[1] > 150;
  const x = Math.min(Math.max(((tip.rect[0] + tip.rect[2] / 2) / VIEW_W) * 100, 13), 87);
  const y = ((above ? tip.rect[1] : tip.rect[1] + tip.rect[3]) / VIEW_H) * 100;
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, ${above ? "calc(-100% - 10px)" : "10px"})` }}
    >
      <motion.div
        key={tip.key}
        initial={{ opacity: 0, y: above ? 6 : -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className="flex w-max max-w-[280px] items-center gap-3 rounded-xl border border-white/12 bg-black/80 px-3.5 py-3 backdrop-blur-md"
      >
        {tip.cover && (
          <CoverArt seed={tip.cover.seed} title="" image={tip.cover.image} className="h-16 w-12 shrink-0 rounded-md ring-1 ring-white/15" />
        )}
        <div className="min-w-0">
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-amber">{tip.eyebrow}</span>
          <h3 className="mt-0.5 font-display text-[15px] leading-tight text-paper">{tip.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-secondary">{tip.sub}</p>
          {tip.cta && <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-amber">{tip.cta}</span>}
        </div>
      </motion.div>
    </div>
  );
}

// ── real works as spines on a drawn shelf ────────────────────────────────────
export interface ShelfBook { story: ApiStory; x: number; y: number; w: number; h: number; color: string }

export function layoutBooks(
  stories: ApiStory[],
  opts: { rows: number[]; x0: number; xMax: number; gap?: number; wBase?: number; wVar?: number; hBase?: number; hVar?: number },
): ShelfBook[] {
  const { rows, x0, xMax, gap = 6, wBase = 21, wVar = 11, hBase = 58, hVar = 28 } = opts;
  const out: ShelfBook[] = [];
  let idx = 0;
  for (const bottom of rows) {
    let x = x0;
    while (idx < stories.length) {
      const s = stories[idx];
      const w = wBase + (hash(s.id + "w") % wVar);
      const h = hBase + (hash(s.id + "h") % hVar);
      if (x + w > xMax) break;
      out.push({ story: s, x, y: bottom - h, w, h, color: paletteFor(s.id)[1] });
      x += w + gap;
      idx++;
    }
    if (idx >= stories.length) break;
  }
  return out;
}

export function BookRow({ books, hot, liveId, reduce, titleMin = 24 }: { books: ShelfBook[]; hot: string | null; liveId: string | null; reduce: boolean | null; titleMin?: number }) {
  return (
    <>
      {books.map((b) => {
        const isHot = hot === `book-${b.story.id}`;
        const isLive = b.story.id === liveId;
        return (
          <motion.g key={b.story.id} animate={{ y: isHot ? -7 : 0 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2.5" fill={b.color} stroke="rgba(0,0,0,0.35)" strokeWidth="1" style={{ filter: isHot ? "brightness(1.3)" : isLive ? `drop-shadow(0 0 6px rgba(${ROSE},0.7))` : "none", transition: "filter .25s" }} />
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2.5" fill="rgba(20,12,8,0.18)" />
            <line x1={b.x + 3} y1={b.y + 7} x2={b.x + b.w - 3} y2={b.y + 7} stroke={CREAM(0.55)} strokeWidth="1.4" />
            <line x1={b.x + 3} y1={b.y + b.h - 7} x2={b.x + b.w - 3} y2={b.y + b.h - 7} stroke={CREAM(0.3)} strokeWidth="1" />
            {b.w >= titleMin && (
              <text x={b.x + b.w / 2 + 3} y={b.y + b.h / 2} className="font-display" fontSize="9" fill={CREAM(0.9)} textAnchor="middle" writingMode="tb">{trunc(b.story.title, 12)}</text>
            )}
            {isLive && (
              <motion.circle cx={b.x + b.w / 2} cy={b.y - 6} r="2.5" fill={`rgb(${ROSE})`} animate={reduce ? {} : { opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
            )}
          </motion.g>
        );
      })}
    </>
  );
}

// ── a flame: bright core in a warm body, flickering from its base ────────────
export function Flame({ cx, base, s = 1, reduce }: { cx: number; base: number; s?: number; reduce: boolean | null }) {
  return (
    <motion.g
      style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      animate={reduce ? {} : { scaleY: [1, 1.16, 0.93, 1.1, 1], skewX: [0, 2.5, -2.5, 1.5, 0] }}
      transition={{ duration: 2 + s * 0.3, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d={`M ${cx} ${base} C ${cx - 7 * s} ${base - 9 * s} ${cx - 4 * s} ${base - 16 * s} ${cx} ${base - 22 * s} C ${cx + 4 * s} ${base - 16 * s} ${cx + 7 * s} ${base - 9 * s} ${cx} ${base} Z`} fill="rgba(238,140,52,0.9)" />
      <path d={`M ${cx} ${base} C ${cx - 3.5 * s} ${base - 6 * s} ${cx - 2 * s} ${base - 10 * s} ${cx} ${base - 13 * s} C ${cx + 2 * s} ${base - 10 * s} ${cx + 3.5 * s} ${base - 6 * s} ${cx} ${base} Z`} fill="rgb(255,224,150)" />
    </motion.g>
  );
}

// ── a wisp of steam off tea or the kettle ────────────────────────────────────
export function Steam({ x, y, reduce, delay = 0 }: { x: number; y: number; reduce: boolean | null; delay?: number }) {
  return (
    <motion.path
      d={`M${x} ${y} q-4 -8 1 -14 q4 -6 0 -12`}
      stroke={CREAM(0.32)}
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
      animate={reduce ? { opacity: 0.2 } : { opacity: [0, 0.5, 0], y: [3, -6] }}
      transition={reduce ? {} : { duration: 3.4, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── entrance choreography: each section rises into the lamplight in turn ─────
export function Rise({ children, delay, reduce }: { children: React.ReactNode; delay: number; reduce: boolean | null }) {
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.7, ease: [0.21, 0.6, 0.35, 1] }}>
      {children}
    </motion.div>
  );
}

// ── the greeting writes itself in, word by word, blur lifting like wet ink ───
export function InkHeadline({ text, reduce }: { text: string; reduce: boolean | null }) {
  const words = text.split(" ");
  return (
    <h1 className="font-display text-3xl leading-tight text-paper sm:text-[40px]">
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-pre"
          initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(7px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.2 + i * 0.09, duration: 0.55, ease: "easeOut" }}
        >
          {w}{i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </h1>
  );
}

// ── ember motes drifting up through the lamplight ────────────────────────────
export function Motes({ accent, reduce }: { accent: string; reduce: boolean | null }) {
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      {Array.from({ length: 16 }).map((_, i) => {
        const left = arand(hash(`mote-x-${i}`)) * 100;
        const top = 30 + arand(hash(`mote-y-${i}`)) * 65;
        const size = 1.5 + arand(hash(`mote-s-${i}`)) * 2.5;
        const dur = 9 + arand(hash(`mote-d-${i}`)) * 9;
        const delay = arand(hash(`mote-t-${i}`)) * 8;
        const drift = (arand(hash(`mote-w-${i}`)) - 0.5) * 50;
        const warm = i % 3 !== 0;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              backgroundColor: warm ? `rgba(${accent},0.8)` : "rgba(245,232,210,0.6)",
              boxShadow: warm ? `0 0 ${size * 3}px rgba(${accent},0.5)` : "none",
            }}
            animate={{ y: [0, -90], x: [0, drift], opacity: [0, 0.8, 0.5, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

// ── a note left on the desk: paper scrap, pushpin, slight off-square tilt ────
export type Kind = "table" | "wip" | "reading" | "notes" | "collab" | "follows" | "creator" | "cold";
export interface Life { key: string; kind: Kind; accent: string; href: string; title: string; sub: string }

export function labelFor(kind: Kind): string {
  switch (kind) {
    case "table": return "Live table";
    case "wip": return "Your desk";
    case "reading": return "Continue reading";
    case "notes": return "Readers waiting";
    case "collab": return "Collaboration";
    case "follows": return "Following";
    case "creator": return "Your earnings";
    case "cold": return "Cold draft";
  }
}

export function DeskNote({ life, i, reduce }: { life: Life; i: number; reduce: boolean | null }) {
  const a = life.accent;
  const tilt = ((i % 3) - 1) * 1.4;
  const Icon = life.kind === "notes" ? MessageSquareText : life.kind === "collab" ? Users : life.kind === "follows" ? Heart : life.kind === "creator" ? Coins : life.kind === "reading" ? BookOpen : life.kind === "table" ? Swords : PenLine;
  return (
    <motion.div
      className="relative w-52 shrink-0 pt-2"
      style={{ rotate: tilt }}
      whileHover={reduce ? undefined : { rotate: 0, y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <Link
        href={life.href}
        className="relative flex h-44 flex-col justify-between overflow-hidden rounded-lg border border-white/8 p-4"
        style={{ background: `linear-gradient(180deg, rgba(245,236,220,0.05), rgba(245,236,220,0.015)), rgba(${a},0.05)`, boxShadow: `inset 0 1px 0 rgba(${a},0.14), 0 10px 24px rgba(0,0,0,0.35)` }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `rgba(${a},0.16)`, color: `rgb(${a})` }}><Icon className="h-4 w-4" /></span>
        <div>
          <span className="font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color: `rgb(${a})` }}>{labelFor(life.kind)}</span>
          <h3 className="mt-0.5 line-clamp-1 font-display text-base leading-tight text-paper">{life.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-text-secondary">{life.sub}</p>
        </div>
      </Link>
      <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full" style={{ backgroundColor: `rgb(${a})`, boxShadow: `0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 1px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.5)` }} />
    </motion.div>
  );
}
