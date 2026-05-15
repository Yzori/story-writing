"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Bell,
  BookOpen,
  Bookmark,
  ChevronRight,
  Feather,
  Library,
  Map,
  MessageSquareText,
  PenLine,
  ScrollText,
  Sparkles,
  Moon,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import type { ApiStory } from "@/types/api";

const letters = [
  { from: "Maren Holt", subject: "left a margin note", detail: "The lighthouse image is doing serious work here.", time: "12m" },
  { from: "Kaelen Vex", subject: "is waiting at your table", detail: "The party has voted. Canon needs your hand.", time: "26m" },
  { from: "The Scriptorium", subject: "sent a commission inquiry", detail: "Character portrait packet, 4 scenes, rush optional.", time: "1h" },
] as const;

const fallbackShelves = [
  { title: "The Salt-Keeper's Daughter", kind: "Draft", progress: "Chapter 12", accent: "bg-amber/15 text-amber", href: "/create" },
  { title: "Glass Orchard", kind: "Reading", progress: "68% read", accent: "bg-sage/15 text-sage", href: "/read" },
  { title: "The Obsidian Crown", kind: "Campaign", progress: "Live table", accent: "bg-lavender/15 text-lavender", href: "/browse" },
  { title: "Neon Grifters", kind: "Followed", progress: "New chapter", accent: "bg-teal/15 text-teal", href: "/browse" },
] as const;

const rooms = [
  { name: "Throne Room", label: "Live adventure", occupants: "6 at table", icon: Map },
  { name: "The North Alcove", label: "Writers room", occupants: "Maren drafting", icon: PenLine },
  { name: "Moonlit Machines", label: "Jam noticeboard", occupants: "42 entries", icon: Sparkles },
] as const;

type LibraryPhase = "morning" | "day" | "dusk" | "night";

const phaseConfig = {
  morning: {
    label: "Morning light",
    eyebrow: "The library is opening",
    prompt: "The reading lamps soften as the day begins.",
    image: "/dashboard/study-morning.png",
    wash: "from-amber/[0.18] via-void/88 to-void",
    beam: "bg-amber/[0.16]",
    window: "border-amber/20 bg-amber/[0.07]",
    shelf: "border-amber/10 bg-ink/[0.42]",
    desk: "border-amber/[0.12] bg-amber/[0.055]",
    icon: Sunrise,
  },
  day: {
    label: "Day desk",
    eyebrow: "The library is awake",
    prompt: "Sunlit stacks keep your open threads in reach.",
    image: "/dashboard/study-afternoon.png",
    wash: "from-sage/[0.12] via-void/90 to-void",
    beam: "bg-sage/[0.12]",
    window: "border-sage/[0.16] bg-sage/[0.055]",
    shelf: "border-sage/10 bg-ink/[0.38]",
    desk: "border-sage/10 bg-sage/[0.04]",
    icon: Sun,
  },
  dusk: {
    label: "Dusk lamps",
    eyebrow: "The lamps are being lit",
    prompt: "The shelves gather your unfinished work into the warmest light.",
    image: "/dashboard/study-night.png",
    wash: "from-rose/[0.11] via-void/88 to-void",
    beam: "bg-amber/[0.14]",
    window: "border-amber/[0.18] bg-rose/[0.055]",
    shelf: "border-amber/10 bg-ink/[0.48]",
    desk: "border-amber/[0.14] bg-amber/[0.06]",
    icon: Sunset,
  },
  night: {
    label: "Night study",
    eyebrow: "The quiet stacks are listening",
    prompt: "Ink, letters, and live tables settle into lamplight.",
    image: "/dashboard/study-night.png",
    wash: "from-lavender/[0.08] via-void/94 to-void",
    beam: "bg-lavender/[0.08]",
    window: "border-lavender/[0.12] bg-lavender/[0.04]",
    shelf: "border-lavender/10 bg-ink/[0.58]",
    desk: "border-lavender/10 bg-lavender/[0.035]",
    icon: Moon,
  },
} as const;

const phaseGuidance = {
  morning: {
    focus: "Plan the chapter",
    action: "Open outline",
    detail: "The library has pulled your draft, outline, and newest reader note together.",
  },
  day: {
    focus: "Answer the room",
    action: "Reply first",
    detail: "Collaboration is warm right now: letters and live tables move to the top.",
  },
  dusk: {
    focus: "Resolve the deadline",
    action: "Pin revision",
    detail: "The noticeboard is louder at dusk, so the jam draft is closest to hand.",
  },
  night: {
    focus: "Return to deep writing",
    action: "Enter focus",
    detail: "The quiet stack favors manuscript work and hides the noisy edges.",
  },
} as const;

const phaseSchedule = [
  { key: "morning", label: "Morning", hour: 5 },
  { key: "day", label: "Day", hour: 11 },
  { key: "dusk", label: "Dusk", hour: 17 },
  { key: "night", label: "Night", hour: 21 },
] as const;

function getLibraryPhase(date: Date): LibraryPhase {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "dusk";
  return "night";
}

function formatLocalTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getMinutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function getSecondsSinceMidnight(date: Date) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function getNextPhase(date: Date) {
  const nowMinutes = getMinutesSinceMidnight(date);
  const next = phaseSchedule.find((phase) => phase.hour * 60 > nowMinutes) ?? phaseSchedule[0];
  const nextMinutes = next.hour * 60 + (next.hour * 60 <= nowMinutes ? 24 * 60 : 0);
  const delta = nextMinutes - nowMinutes;
  const hours = Math.floor(delta / 60);
  const minutes = delta % 60;

  return {
    ...next,
    time: `${String(next.hour).padStart(2, "0")}:00`,
    until: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
  };
}

function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-amber">{eyebrow}</p>
        <h2 className="mt-1 font-display text-2xl text-paper">{title}</h2>
      </div>
      {action && (
        <button className="hidden items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:text-paper sm:flex">
          {action}
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function EnchantedThread() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 hidden h-full w-full text-amber opacity-70 xl:block" viewBox="0 0 980 520" fill="none">
      <motion.path
        d="M120 390 C250 300 382 430 500 260 C604 110 730 160 856 86"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="6 12"
        initial={{ pathLength: 0, opacity: 0.1 }}
        animate={{ pathLength: [0.15, 1, 0.15], opacity: [0.08, 0.34, 0.08] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="856"
        cy="86"
        r="4"
        fill="currentColor"
        animate={{ opacity: [0.25, 0.85, 0.25], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function AmbientLibraryBackdrop({ phase }: { phase: (typeof phaseConfig)[LibraryPhase] }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-void">
      <div
        className="absolute inset-0 opacity-[0.22] saturate-[0.75] contrast-[0.9]"
        style={{
          backgroundImage: `url('${phase.image}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-void/62" />
      <div className="absolute inset-0 bg-gradient-to-r from-void via-void/35 to-void" />
      <div className={`absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-b transition-colors duration-1000 ${phase.wash} opacity-45`} />
      <div className={`absolute -left-24 -top-28 h-80 w-80 rounded-full blur-3xl transition-colors duration-1000 ${phase.beam} opacity-20`} />
      <div className="absolute inset-x-0 top-0 h-px bg-border-subtle" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent" />
    </div>
  );
}

function EnvelopeLetter({
  letter,
  index,
}: {
  letter: (typeof letters)[number];
  index: number;
}) {
  const rotations = ["sm:rotate-[-0.7deg]", "sm:rotate-[0.6deg]", "sm:rotate-[-0.4deg]"];

  return (
    <Link
      href="/notifications"
      className={`group relative block overflow-hidden rounded-2xl border border-border bg-elevated p-3.5 shadow-[var(--t-shadow-card)] transition-all hover:-translate-y-0.5 hover:border-lavender/35 ${index > 0 ? "sm:-mt-2" : ""} ${rotations[index]}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-lavender/20" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-lavender/[0.035] to-transparent" />
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full border border-lavender/20 bg-lavender/[0.07]" />
      <div className="absolute bottom-0 left-0 h-14 w-full border-t border-lavender/10 bg-gradient-to-t from-lavender/[0.045] to-transparent [clip-path:polygon(0_100%,50%_26%,100%_100%)]" />
      <div className="relative flex gap-3">
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-lavender/25 bg-lavender/10 text-lavender">
          <MessageSquareText size={14} />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[15px] leading-snug text-paper">{letter.from}</span>
          <span className="block text-[13px] text-text-secondary">{letter.subject}</span>
          <span className="mt-1.5 line-clamp-2 block text-[11px] leading-relaxed text-text-secondary">{letter.detail}</span>
          <span className="mt-2 inline-flex rounded-full border border-border bg-subtle/30 px-2 py-0.5 text-[9px] uppercase tracking-wider text-text-ghost">
            {letter.time} ago
          </span>
        </span>
      </div>
    </Link>
  );
}

function DeskObjectPanel() {
  return (
    <aside className="relative overflow-hidden rounded-3xl border border-border bg-ink/60 p-5 shadow-[var(--t-shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] text-text-ghost">Desk objects</p>
        <p className="text-[9px] uppercase tracking-[0.16em] text-text-ghost/70">lamp · lit</p>
      </div>

      {/* ── ILLUSTRATED DESK ─────────────────────────────────────── */}
      <div className="relative">
        <svg
          viewBox="0 0 240 400"
          className="block h-auto w-full"
          aria-label="An illustrated writer's desk seen from above — wood-grained surface in lamp light, a shelf of three books, an open manuscript page with a quill resting on it, a brass pocket watch counting down a deadline, a violet sticky note tallying reader notes, a parchment scroll for the open campaign table, and a single d20."
        >
          {/* WOOD GRAIN (very subtle, mode-tolerant) */}
          <g stroke="#000" strokeOpacity="0.18" strokeWidth="0.3" fill="none">
            <path d="M 0 28 Q 60 26 120 28 T 240 30" />
            <path d="M 0 76 Q 80 74 160 78 T 240 76" />
            <path d="M 0 128 Q 100 126 200 128 T 240 130" />
            <path d="M 0 184 Q 70 182 140 184 T 240 186" />
            <path d="M 0 240 Q 110 238 180 240 T 240 242" />
            <path d="M 0 296 Q 50 294 130 296 T 240 298" />
            <path d="M 0 348 Q 90 346 170 348 T 240 350" />
          </g>
          <g stroke="#A88030" strokeOpacity="0.06" strokeWidth="0.3" fill="none">
            <line x1="0" y1="60" x2="240" y2="62" />
            <line x1="0" y1="158" x2="240" y2="156" />
            <line x1="0" y1="218" x2="240" y2="220" />
            <line x1="0" y1="324" x2="240" y2="322" />
          </g>

          {/* LAMP POOL — warm pool of candlelight (gently breathing) */}
          <motion.ellipse
            cx="120"
            cy="200"
            rx="150"
            ry="120"
            fill="#D4A843"
            fillOpacity="0.045"
            animate={{ fillOpacity: [0.03, 0.06, 0.03] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <ellipse cx="120" cy="195" rx="80" ry="60" fill="#D4A843" fillOpacity="0.04" />

          {/* ═══ SHELF ROW (top) ═══ */}
          <g>
            {/* Salt — wide, navy */}
            <rect x="86" y="28" width="30" height="80" fill="#3A3850" stroke="#1C1B28" strokeWidth="0.5" />
            <rect x="86" y="24" width="30" height="4" fill="#A88030" />
            <line x1="91" y1="24" x2="91" y2="108" stroke="#A88030" strokeOpacity="0.35" strokeWidth="0.4" />
            <line x1="111" y1="24" x2="111" y2="108" stroke="#A88030" strokeOpacity="0.35" strokeWidth="0.4" />
            <text x="101" y="70" fontFamily="serif" fontStyle="italic" fontSize="10" fill="#EDE8D8" textAnchor="middle" transform="rotate(-90 101 70)">Salt</text>

            {/* Crown — rose */}
            <rect x="118" y="34" width="18" height="74" fill="#5C2E3A" stroke="#2A0F18" strokeWidth="0.5" />
            <rect x="118" y="30" width="18" height="4" fill="#A88030" />
            <line x1="122" y1="30" x2="122" y2="108" stroke="#A88030" strokeOpacity="0.3" strokeWidth="0.3" />
            <line x1="132" y1="30" x2="132" y2="108" stroke="#A88030" strokeOpacity="0.3" strokeWidth="0.3" />
            <text x="127" y="72" fontFamily="serif" fontStyle="italic" fontSize="9" fill="#EDE8D8" textAnchor="middle" transform="rotate(-90 127 72)">Crown</text>

            {/* Notes — sage */}
            <rect x="138" y="40" width="14" height="68" fill="#3A4D40" stroke="#1F2820" strokeWidth="0.5" />
            <rect x="138" y="36" width="14" height="4" fill="#A88030" />
            <text x="145" y="74" fontFamily="serif" fontStyle="italic" fontSize="8" fill="#EDE8D8" textAnchor="middle" transform="rotate(-90 145 74)">Notes</text>

            {/* Brass bookends */}
            <path d="M 78 108 L 78 84 L 84 84 L 84 108 Z" fill="#A88030" />
            <path d="M 154 108 L 154 88 L 160 88 L 160 108 Z" fill="#A88030" />
          </g>

          {/* Shelf board */}
          <rect x="0" y="108" width="240" height="3.5" fill="#A88030" opacity="0.55" />
          <rect x="0" y="111.5" width="240" height="1.5" fill="#000" opacity="0.55" />

          {/* ═══ MANUSCRIPT PAGE (left, centerpiece) ═══ */}
          <g transform="translate(14, 134) rotate(-2.5 60 65)">
            <rect x="3" y="4" width="120" height="128" fill="#000" opacity="0.35" rx="1.5" />
            <rect width="120" height="128" fill="#EDE8D8" rx="1.5" />
            <line x1="18" y1="0" x2="18" y2="128" stroke="#B8697A" strokeOpacity="0.45" strokeWidth="0.5" />
            <g stroke="#9B8EC4" strokeOpacity="0.3" strokeWidth="0.3">
              <line x1="22" y1="44" x2="112" y2="44" />
              <line x1="22" y1="56" x2="112" y2="56" />
              <line x1="22" y1="68" x2="112" y2="68" />
              <line x1="22" y1="80" x2="112" y2="80" />
              <line x1="22" y1="92" x2="112" y2="92" />
              <line x1="22" y1="104" x2="112" y2="104" />
              <line x1="22" y1="116" x2="112" y2="116" />
            </g>
            <text x="22" y="14" fontFamily="sans-serif" fontSize="6" fill="#A66F18" letterSpacing="1.5">DRAFT</text>
            <text
              x="22"
              y="28"
              fontFamily="serif"
              fontStyle="italic"
              fontWeight="500"
              fontSize="11"
              fill="#201813"
              textLength="92"
              lengthAdjust="spacingAndGlyphs"
            >
              Salt-Keeper&apos;s Daughter
            </text>
            <text x="22" y="38" fontFamily="sans-serif" fontSize="6" fill="#75675A">Chapter 12 · 3,420 words</text>
            <g stroke="#201813" strokeOpacity="0.78" strokeWidth="0.55" strokeLinecap="round">
              <line x1="22" y1="52" x2="92" y2="52" />
              <line x1="22" y1="64" x2="104" y2="64" />
              <line x1="22" y1="76" x2="88" y2="76" />
              <line x1="22" y1="88" x2="100" y2="88" />
              <line x1="22" y1="100" x2="74" y2="100" />
              <line x1="22" y1="112" x2="96" y2="112" />
              <line x1="22" y1="124" x2="58" y2="124" />
            </g>
            <motion.line
              x1="60"
              y1="119"
              x2="60"
              y2="127"
              stroke="#A66F18"
              strokeWidth="0.9"
              strokeLinecap="round"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </g>

          {/* ═══ QUILL — resting on the manuscript ═══ */}
          <motion.g
            transform="translate(108, 218)"
            animate={{ rotate: [0, 0.8, 0, -0.6, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "108px 218px" }}
          >
            <path d="M 0 0 L -5 -1 L -3 1 L -6 2 L -2 3 L -5 5 Z" fill="#1C1B28" />
            <line x1="0" y1="0" x2="58" y2="-3" stroke="#A88030" strokeWidth="1.5" strokeLinecap="round" />
            <path
              d="M 8 -1.6 Q 22 -7 36 -8 Q 48 -8.5 58 -3"
              fill="#D4A843"
              fillOpacity="0.85"
              stroke="#A88030"
              strokeWidth="0.4"
              strokeLinecap="round"
            />
            <g stroke="#A88030" strokeOpacity="0.75" strokeWidth="0.4" strokeLinecap="round">
              <line x1="10" y1="-2.4" x2="14" y2="-7" />
              <line x1="16" y1="-3.4" x2="20" y2="-8" />
              <line x1="22" y1="-4" x2="26" y2="-8.5" />
              <line x1="28" y1="-4.3" x2="32" y2="-9" />
              <line x1="34" y1="-4.4" x2="38" y2="-9" />
              <line x1="40" y1="-4.2" x2="44" y2="-8.6" />
              <line x1="46" y1="-3.8" x2="50" y2="-7.6" />
            </g>
          </motion.g>

          {/* ═══ POCKET WATCH (deadline) ═══ */}
          <g transform="translate(190, 188)">
            <path d="M 0 -36 L -2 -32 L 2 -28 L -1 -24" stroke="#A88030" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            <circle cx="0" cy="-39" r="3" fill="none" stroke="#A88030" strokeWidth="1.3" />
            <rect x="-2.2" y="-23" width="4.4" height="4" rx="0.6" fill="#A88030" />
            <circle r="34" fill="#A88030" />
            <circle r="32" fill="#2C2418" />
            <circle r="28" fill="#EDE8D8" />
            <circle r="28" fill="none" stroke="#A88030" strokeWidth="0.6" />
            <g stroke="#3A3850" strokeWidth="0.7" strokeLinecap="round">
              <line x1="0" y1="-25" x2="0" y2="-21" strokeWidth="1.1" />
              <line transform="rotate(30)" x1="0" y1="-25" x2="0" y2="-22" />
              <line transform="rotate(60)" x1="0" y1="-25" x2="0" y2="-22" />
              <line transform="rotate(90)" x1="0" y1="-25" x2="0" y2="-21" strokeWidth="1.1" />
              <line transform="rotate(120)" x1="0" y1="-25" x2="0" y2="-22" />
              <line transform="rotate(150)" x1="0" y1="-25" x2="0" y2="-22" />
              <line transform="rotate(180)" x1="0" y1="-25" x2="0" y2="-21" strokeWidth="1.1" />
              <line transform="rotate(210)" x1="0" y1="-25" x2="0" y2="-22" />
              <line transform="rotate(240)" x1="0" y1="-25" x2="0" y2="-22" />
              <line transform="rotate(270)" x1="0" y1="-25" x2="0" y2="-21" strokeWidth="1.1" />
              <line transform="rotate(300)" x1="0" y1="-25" x2="0" y2="-22" />
              <line transform="rotate(330)" x1="0" y1="-25" x2="0" y2="-22" />
            </g>
            <text x="0" y="-15" fontFamily="serif" fontSize="6" fill="#3A3850" textAnchor="middle">XII</text>
            <text x="14" y="2" fontFamily="serif" fontSize="6" fill="#3A3850" textAnchor="middle">III</text>
            <text x="0" y="19" fontFamily="serif" fontSize="6" fill="#3A3850" textAnchor="middle">VI</text>
            <text x="-14" y="2" fontFamily="serif" fontSize="6" fill="#3A3850" textAnchor="middle">IX</text>
            <line x1="0" y1="0" x2="-13" y2="11" stroke="#B8697A" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="0" y1="0" x2="0" y2="-21" stroke="#3A3850" strokeWidth="1.3" strokeLinecap="round" />
            <motion.line
              x1="0"
              y1="3"
              x2="0"
              y2="-24"
              stroke="#A66F18"
              strokeWidth="0.5"
              strokeLinecap="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "0px 0px" }}
            />
            <circle r="2.4" fill="#B8697A" />
            <circle r="0.9" fill="#2C2418" />
            <text x="0" y="52" fontFamily="serif" fontStyle="italic" fontWeight="500" fontSize="13" fill="#B8697A" textAnchor="middle">8h left</text>
            <text x="0" y="62" fontFamily="sans-serif" fontSize="6" fill="#75675A" letterSpacing="1.6" textAnchor="middle">DEADLINE</text>
          </g>

          {/* ═══ STICKY NOTE — reader notes ═══ */}
          <g transform="translate(18, 296) rotate(-4 32 30)">
            <rect x="3" y="3" width="62" height="58" fill="#000" opacity="0.3" rx="1.5" />
            <rect width="62" height="58" fill="#9B8EC4" rx="1.5" />
            <rect width="62" height="5" fill="#7A6CA8" rx="1.5" />
            <circle cx="31" cy="2.5" r="3.5" fill="#A88030" />
            <circle cx="31.7" cy="1.8" r="1.3" fill="#EDE8D8" fillOpacity="0.6" />
            <text x="31" y="40" fontFamily="serif" fontWeight="600" fontSize="26" fill="#EDE8D8" textAnchor="middle">7</text>
            <text x="31" y="52" fontFamily="sans-serif" fontSize="6" fill="#EDE8D8" fillOpacity="0.92" letterSpacing="1.2" textAnchor="middle">READER NOTES</text>
          </g>

          {/* ═══ CAMPAIGN SCROLL — table waiting ═══ */}
          <g transform="translate(86, 308) rotate(2.5 60 26)">
            <rect x="6" y="4" width="118" height="48" fill="#000" opacity="0.28" rx="2" />
            <rect x="4" y="0" width="118" height="48" fill="#EDE8D8" rx="2" />
            <ellipse cx="4" cy="24" rx="4" ry="16" fill="#CFC4AD" />
            <ellipse cx="4" cy="24" rx="1.6" ry="14" fill="#A88030" fillOpacity="0.4" />
            <ellipse cx="122" cy="24" rx="4" ry="16" fill="#CFC4AD" />
            <ellipse cx="122" cy="24" rx="1.6" ry="14" fill="#A88030" fillOpacity="0.4" />
            <circle cx="20" cy="22" r="7.5" fill="#5C2E3A" />
            <circle cx="20" cy="22" r="7.5" fill="#B8697A" fillOpacity="0.55" />
            <circle cx="20" cy="22" r="5.5" fill="none" stroke="#2A0F18" strokeWidth="0.4" />
            <path d="M 17 19 L 23 25 M 23 19 L 17 25" stroke="#2A0F18" strokeWidth="0.7" strokeLinecap="round" />
            <text x="34" y="14" fontFamily="sans-serif" fontSize="6" fill="#75675A" letterSpacing="1.4">OBSIDIAN CROWN</text>
            <text x="34" y="28" fontFamily="serif" fontStyle="italic" fontWeight="500" fontSize="11" fill="#201813">table waiting</text>
            <text x="34" y="40" fontFamily="sans-serif" fontSize="6.5" fill="#4F7D62">● 6 at the table</text>
          </g>

          {/* ═══ D20 die — sitting beside the scroll ═══ */}
          <g transform="translate(213, 332) rotate(8 0 0)">
            <polygon points="0,-11 10,-3 7,9 -7,9 -10,-3" fill="#3A3850" stroke="#A88030" strokeWidth="0.6" />
            <polygon points="0,-11 10,-3 0,1" fill="#5A5870" fillOpacity="0.7" />
            <polygon points="0,-11 -10,-3 0,1" fill="#28263A" fillOpacity="0.6" />
            <polygon points="0,1 10,-3 7,9" fill="#28263A" fillOpacity="0.3" />
            <polygon points="0,1 -10,-3 -7,9" fill="#5A5870" fillOpacity="0.25" />
            <text x="0" y="3" fontFamily="serif" fontWeight="600" fontSize="7" fill="#D4A843" textAnchor="middle">20</text>
          </g>
        </svg>
      </div>

      {/* ── THREAD PATH ──────────────────────────────────────────── */}
      <div className="mt-4 rounded-[1.25rem] border border-border-subtle bg-subtle/25 p-3">
        <p className="text-[9px] uppercase tracking-[0.18em] text-text-ghost">Thread path</p>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-text-secondary">
          {["draft", "reply", "table"].map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-amber" : "bg-border-active"}`} />
              {step}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

const phaseTints: Record<LibraryPhase, {
  stroke: string;
  tile: string;
  dot: string;
  text: string;
  bar: string;
}> = {
  morning: { stroke: "stroke-amber",    tile: "border-amber/40 bg-amber/10",       dot: "bg-amber",    text: "text-amber",    bar: "bg-amber" },
  day:     { stroke: "stroke-sage",     tile: "border-sage/40 bg-sage/10",         dot: "bg-sage",     text: "text-sage",     bar: "bg-sage" },
  dusk:    { stroke: "stroke-rose",     tile: "border-rose/40 bg-rose/10",         dot: "bg-rose",     text: "text-rose",     bar: "bg-rose" },
  night:   { stroke: "stroke-lavender", tile: "border-lavender/40 bg-lavender/10", dot: "bg-lavender", text: "text-lavender", bar: "bg-lavender" },
};

const phaseIcons: Record<LibraryPhase, typeof Sunrise> = {
  morning: Sunrise,
  day: Sun,
  dusk: Sunset,
  night: Moon,
};

function StudyWindowClock({ phaseKey, now }: { phaseKey: LibraryPhase; now: Date | null }) {
  const clockDate = now ?? new Date(2026, 0, 1, 18, 52);
  const nextPhase = getNextPhase(clockDate);
  const secondsSinceMidnight = getSecondsSinceMidnight(clockDate);
  const hourDecimal = secondsSinceMidnight / 3600;
  const handAngle = ((hourDecimal - 12) * 15 + 360) % 360;
  const currentPhase = phaseSchedule.find((p) => p.key === phaseKey) ?? phaseSchedule[0];
  let phaseDuration = nextPhase.hour - currentPhase.hour;
  if (phaseDuration <= 0) phaseDuration += 24;
  let elapsed = hourDecimal - currentPhase.hour;
  if (elapsed < 0) elapsed += 24;
  const phaseProgress = Math.min(1, Math.max(0, elapsed / phaseDuration));
  const phaseProgressPct = Math.round(phaseProgress * 100);
  const currentTint = phaseTints[phaseKey];
  const nextTint = phaseTints[nextPhase.key];
  const PhaseIcon = phaseIcons[phaseKey];
  const NextIcon = phaseIcons[nextPhase.key];

  return (
    <aside className="rounded-2xl border border-border bg-void/74 p-4 shadow-[var(--t-shadow-card)] backdrop-blur-md">
      <div className="grid items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[156px_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-[156px]">
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-label="24-hour celestial library clock">
            <circle cx="50" cy="50" r="44" fill="none" className="stroke-paper" strokeOpacity="0.08" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="33" fill="none" className="stroke-paper" strokeOpacity="0.06" strokeWidth="0.35" />
            <circle cx="50" cy="50" r="25" fill="none" className="stroke-paper" strokeOpacity="0.05" strokeWidth="0.3" />

            <line x1="50" y1="6" x2="50" y2="11" className="stroke-paper" strokeOpacity="0.22" strokeWidth="0.35" />
            <line x1="50" y1="89" x2="50" y2="94" className="stroke-paper" strokeOpacity="0.22" strokeWidth="0.35" />
            <line x1="6" y1="50" x2="11" y2="50" className="stroke-paper" strokeOpacity="0.22" strokeWidth="0.35" />
            <line x1="89" y1="50" x2="94" y2="50" className="stroke-paper" strokeOpacity="0.22" strokeWidth="0.35" />

            <g className="fill-paper">
              <motion.circle cx="28" cy="66" r="0.45" animate={{ opacity: [0.25, 0.8, 0.25] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }} />
              <motion.circle cx="40" cy="76" r="0.5" animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} />
              <motion.circle cx="52" cy="79" r="0.55" animate={{ opacity: [0.35, 0.9, 0.35] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} />
              <motion.circle cx="68" cy="70" r="0.45" animate={{ opacity: [0.25, 0.75, 0.25] }} transition={{ duration: 3.3, repeat: Infinity, ease: "easeInOut", delay: 0.9 }} />
              <line x1="40" y1="76" x2="52" y2="79" className="stroke-paper" strokeOpacity="0.18" strokeWidth="0.15" />
              <line x1="52" y1="79" x2="68" y2="70" className="stroke-paper" strokeOpacity="0.18" strokeWidth="0.15" />
            </g>

            {Array.from({ length: 24 }).map((_, h) => {
              const isCardinal = h === 0 || h === 6 || h === 12 || h === 18;
              const rotation = ((h - 12) * 15 + 360) % 360;
              return (
                <line
                  key={h}
                  x1="50"
                  y1={isCardinal ? 4.5 : 5.5}
                  x2="50"
                  y2={isCardinal ? 9.5 : 8.5}
                  className="stroke-paper"
                  strokeOpacity={isCardinal ? 0.42 : 0.18}
                  strokeWidth={isCardinal ? 0.5 : 0.3}
                  strokeLinecap="round"
                  transform={`rotate(${rotation} 50 50)`}
                />
              );
            })}

            <path d="M 13.29 59.83 A 38 38 0 0 1 40.17 13.30" fill="none" strokeLinecap="butt" className="stroke-amber" strokeOpacity={phaseKey === "morning" ? 1 : 0.35} strokeWidth={phaseKey === "morning" ? 5 : 4} />
            <path d="M 40.17 13.30 A 38 38 0 0 1 86.70 40.17" fill="none" strokeLinecap="butt" className="stroke-sage" strokeOpacity={phaseKey === "day" ? 1 : 0.35} strokeWidth={phaseKey === "day" ? 5 : 4} />
            <path d="M 86.70 40.17 A 38 38 0 0 1 76.87 76.87" fill="none" strokeLinecap="butt" className="stroke-rose" strokeOpacity={phaseKey === "dusk" ? 1 : 0.35} strokeWidth={phaseKey === "dusk" ? 5 : 4} />
            <path d="M 76.87 76.87 A 38 38 0 0 1 13.29 59.83" fill="none" strokeLinecap="butt" className="stroke-lavender" strokeOpacity={phaseKey === "night" ? 1 : 0.35} strokeWidth={phaseKey === "night" ? 5 : 4} />

            <circle cx="13.29" cy="59.83" r="1.35" className="fill-elevated stroke-amber" strokeWidth="0.6" />
            <circle cx="40.17" cy="13.30" r="1.35" className="fill-elevated stroke-sage" strokeWidth="0.6" />
            <circle cx="86.70" cy="40.17" r="1.35" className="fill-elevated stroke-rose" strokeWidth="0.6" />
            <circle cx="76.87" cy="76.87" r="1.35" className="fill-elevated stroke-lavender" strokeWidth="0.6" />

            <g transform="translate(50, 5.5)" className="fill-sage stroke-sage">
              <circle r="1.7" />
              <circle r="0.7" className="fill-paper" />
              <line x1="0" y1="-2.5" x2="0" y2="-3.4" strokeWidth="0.4" strokeLinecap="round" />
              <line x1="0" y1="2.5" x2="0" y2="3.4" strokeWidth="0.4" strokeLinecap="round" />
              <line x1="-2.5" y1="0" x2="-3.4" y2="0" strokeWidth="0.4" strokeLinecap="round" />
              <line x1="2.5" y1="0" x2="3.4" y2="0" strokeWidth="0.4" strokeLinecap="round" />
            </g>
            <g transform="translate(50, 94.5)">
              <circle r="2.1" className="fill-lavender" />
              <circle cx="0.7" cy="-0.5" r="1.7" className="fill-elevated" />
            </g>

            <circle cx="50" cy="50" r="18" className="fill-ink" />
            <circle cx="50" cy="50" r="18" fill="none" strokeWidth="0.5" className={currentTint.stroke} strokeOpacity="0.55" />
            <circle cx="50" cy="50" r="17" fill="none" strokeWidth="0.3" className={currentTint.stroke} strokeOpacity="0.2" />
          </svg>

          <motion.div
            className="absolute left-1/2 top-1/2 h-[35%] origin-bottom -translate-x-1/2 -translate-y-full"
            style={{ width: "1.5px" }}
            animate={{ rotate: handAngle }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div className={`h-full w-full ${currentTint.bar} opacity-85`} />
            <motion.div
              className={`absolute -top-[5px] left-1/2 h-[10px] w-[10px] -translate-x-1/2 rounded-full ${currentTint.dot} border-2 border-elevated`}
              animate={{ scale: [1, 1.25, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <PhaseIcon className={currentTint.text} size={13} />
            <span className="mt-1 text-[8px] uppercase tracking-[0.14em] text-text-ghost">current light</span>
            <span className="mt-0.5 font-display text-[13px] leading-tight text-paper">{phaseConfig[phaseKey].label}</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-amber">Library clock</p>
              <p className="mt-1 font-display text-xl leading-tight text-paper">{formatLocalTime(clockDate)}</p>
            </div>
            <span className="rounded-full border border-amber/25 bg-amber/10 px-3 py-1 font-mono text-[11px] text-amber">
              {phaseProgressPct}%
            </span>
          </div>

          <div className="mt-4">
            <div className="relative h-2 overflow-hidden rounded-full bg-border-subtle">
              <div className={`absolute inset-y-0 left-0 ${currentTint.bar} opacity-90`} style={{ width: `${phaseProgressPct}%` }} />
              <div className={`absolute inset-y-0 right-0 ${nextTint.bar} opacity-25`} style={{ width: `${100 - phaseProgressPct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-text-ghost">
              <span>{currentPhase.label.toLowerCase()} · {String(currentPhase.hour).padStart(2, "0")}:00</span>
              <span>{nextPhase.time} · {nextPhase.label.toLowerCase()}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-elevated/58 px-3 py-2">
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-ghost">
              <NextIcon size={13} className={nextTint.text} />
              Next shift
              <span className="ml-auto rounded-full border border-amber/25 bg-amber/10 px-2 py-0.5 font-mono text-[10px] text-amber">in {nextPhase.until}</span>
            </span>
            <p className="mt-1 font-display text-[16px] text-paper">
              {nextPhase.label} <span className="text-text-tertiary">at</span> <span className="font-mono text-amber">{nextPhase.time}</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [now, setNow] = useState<Date | null>(null);
  const [stories, setStories] = useState<ApiStory[]>([]);
  const phaseKey = now ? getLibraryPhase(now) : "night";
  const phase = phaseConfig[phaseKey];
  const guidance = phaseGuidance[phaseKey];
  const PhaseIcon = phase.icon;
  const firstName = session?.user?.name?.split(" ")[0];

  useEffect(() => {
    let cancelled = false;

    fetch("/api/stories?mine=true")
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled && json.data?.stories) {
          setStories(json.data.stories);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const activeStory = useMemo(() => {
    if (stories.length === 0) return null;
    return [...stories].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }, [stories]);

  const activeHref = activeStory
    ? activeStory.writingMode === "campaign"
      ? `/campaign/${activeStory.id}`
      : activeStory.writingMode === "co-op"
        ? `/write/${activeStory.id}/co-op`
        : `/write/${activeStory.id}`
    : "/create";

  const activeTitle = activeStory?.title ?? "The Salt-Keeper's Daughter";
  const activeChapter = activeStory?.chapterCount
    ? `Chapter ${activeStory.chapterCount}`
    : "Chapter 12";

  const shelfItems = useMemo(() => {
    if (stories.length === 0) return fallbackShelves;

    const accents = [
      "bg-amber/15 text-amber",
      "bg-sage/15 text-sage",
      "bg-lavender/15 text-lavender",
      "bg-teal/15 text-teal",
    ];

    return stories.slice(0, 4).map((story, index) => ({
      title: story.title,
      kind: story.writingMode === "campaign" ? "Campaign" : story.status === "draft" ? "Draft" : "Writing",
      progress: story.chapterCount > 0 ? `${story.chapterCount} chapters` : `${story.totalWords.toLocaleString()} words`,
      accent: accents[index % accents.length],
      href: story.writingMode === "campaign" ? `/campaign/${story.id}` : `/write/${story.id}`,
    }));
  }, [stories]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
    }, 0);

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1_000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-void text-paper">
      <AmbientLibraryBackdrop phase={phase} />

      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-5 py-5 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface/80 px-4 py-3 shadow-[var(--t-shadow-card)] backdrop-blur-xl">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber/25 bg-amber/10 text-amber">
              <Library size={19} />
            </span>
            <span>
              <span className="block font-display text-lg text-paper">{firstName ? `${firstName}'s Study` : "Your Study"}</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-text-ghost">{phase.eyebrow}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {["Desk", "Letters", "Shelves", "Rooms"].map((item, index) => (
              <button
                key={item}
                className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                  index === 0 ? "bg-amber/15 text-amber" : "text-text-secondary hover:bg-subtle/40 hover:text-paper"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-text-secondary">
            <Bell size={16} />
          </button>
        </header>

        <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-border bg-surface/70 shadow-[var(--t-shadow-card)]">
          <div className="relative min-h-[170px] sm:min-h-[210px] lg:min-h-[230px]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${phase.image}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-void/82 via-void/28 to-void/68" />
            <div className="absolute inset-0 bg-gradient-to-t from-void/76 via-transparent to-void/20" />
            <div className="relative grid min-h-[170px] gap-5 p-5 sm:min-h-[210px] sm:p-6 lg:min-h-[230px] lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
              <div className="flex max-w-xl flex-col justify-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-void/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-text-secondary backdrop-blur-md">
                  <PhaseIcon size={13} className="text-amber" />
                  {phase.label}
                  {now && <span className="font-mono text-text-ghost">{formatLocalTime(now)}</span>}
                </div>
                <h2 className="mt-4 font-display text-2xl leading-tight text-paper sm:text-3xl">
                  Your study, set for the hour.
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary sm:text-sm">
                  The room changes quietly through the day while your desk stays focused on the work.
                </p>
              </div>

              <StudyWindowClock phaseKey={phaseKey} now={now} />
            </div>
          </div>
        </section>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[2rem] border border-border bg-surface/88 shadow-[var(--t-shadow-modal)] backdrop-blur-xl"
            >
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber/[0.08] to-transparent" />
              <EnchantedThread />
              <div className="grid gap-8 p-6 lg:grid-cols-[1fr_280px] lg:p-8">
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-amber">Open on your desk</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-text-secondary">
                      <PhaseIcon size={12} className="text-amber" />
                      {phase.label}
                      {now && <span className="text-text-ghost">{formatLocalTime(now)}</span>}
                    </span>
                  </div>
                  <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-paper md:text-6xl">
                    The manuscript remembers where you stopped.
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary md:text-base">
                    {phase.prompt} Return to <span className="text-paper">{activeTitle}</span>, {activeChapter.toLowerCase()}. A reader has marked the lighthouse scene, and your last line is still warm.
                  </p>

                  <div className="relative mt-8">
                    <div className="absolute -right-2 top-8 hidden h-40 w-40 rotate-6 rounded-2xl border border-border bg-surface/45 shadow-[var(--t-shadow-card)] sm:block" />
                    <div className="absolute -left-1 top-4 hidden h-44 w-52 rotate-[-5deg] rounded-2xl border border-border bg-amber/[0.055] shadow-[var(--t-shadow-card)] sm:block" />
                    <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-elevated/86 p-5 shadow-[var(--t-shadow-modal)]">
                      <div className="absolute right-6 top-0 h-16 w-8 rounded-b-full bg-amber/25 shadow-[var(--t-shadow-card)]" />
                      <div className="absolute inset-x-8 top-14 h-px bg-border-subtle" />
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                        <Feather size={13} className="text-amber" />
                        Manuscript page
                      </div>
                      <blockquote className="mt-4 max-w-2xl font-reading text-xl italic leading-relaxed text-paper">
                        “The lighthouse door opened inward, though no hand had touched it.”
                      </blockquote>
                      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
                        <div className="flex flex-wrap items-start gap-2">
                          <Link href={activeHref} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber px-5 text-sm font-semibold text-void shadow-[var(--t-shadow-card-hover)]">
                            <PenLine size={16} />
                            Resume writing
                          </Link>
                          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm text-text-secondary transition-colors hover:text-paper">
                            <Bookmark size={15} />
                            Open notes
                          </button>
                        </div>
                        <motion.div
                          className="rounded-2xl border border-amber/20 bg-amber/[0.08] p-3 text-sm text-text-secondary"
                          animate={{ borderColor: ["rgba(193,139,46,0.18)", "rgba(193,139,46,0.34)", "rgba(193,139,46,0.18)"] }}
                          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-amber" />
                            <span className="font-display text-base text-paper">{guidance.focus}</span>
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed">{guidance.detail}</p>
                          <button className="mt-3 inline-flex min-h-8 items-center rounded-full border border-amber/25 px-3 text-[11px] uppercase tracking-[0.12em] text-amber">
                            {guidance.action}
                          </button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>

                <DeskObjectPanel />
              </div>
            </motion.div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[1.5rem] border border-border bg-surface/82 p-5 shadow-[var(--t-shadow-card)] backdrop-blur-xl">
                <SectionTitle eyebrow="Your shelves" title="Works in reach" action="Open library" />
                <div className="grid gap-3 sm:grid-cols-2">
                {shelfItems.map((item) => (
                    <Link key={item.title} href={item.href} className="group rounded-2xl border border-border bg-elevated/65 p-4 transition-colors hover:border-amber/30">
                      <div className="flex items-start justify-between gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${item.accent}`}>{item.kind}</span>
                        <BookOpen size={15} className="text-text-ghost group-hover:text-amber" />
                      </div>
                      <h3 className="mt-4 font-display text-lg text-paper">{item.title}</h3>
                      <p className="mt-1 text-[12px] text-text-secondary">{item.progress}</p>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-border bg-surface/82 p-5 shadow-[var(--t-shadow-card)] backdrop-blur-xl">
                <SectionTitle eyebrow="Rooms down the hall" title="The library is awake" action="Explore" />
                <div className="space-y-3">
                  {rooms.map((room) => {
                    const Icon = room.icon;
                    return (
                      <Link key={room.name} href="/browse" className="flex items-center gap-4 rounded-2xl border border-border bg-elevated/65 p-4 transition-colors hover:border-sage/30">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-subtle/30 text-sage">
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] uppercase tracking-[0.18em] text-text-ghost">{room.label}</span>
                          <span className="mt-0.5 block truncate font-display text-base text-paper">{room.name}</span>
                        </span>
                        <span className="text-[11px] text-text-secondary">{room.occupants}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-5 lg:self-start">
            <section className="rounded-[1.5rem] border border-border bg-surface/88 p-5 shadow-[var(--t-shadow-card)] backdrop-blur-xl">
              <SectionTitle eyebrow="Letters" title="Needs your hand" />
              <div className="space-y-3 sm:space-y-0">
                {letters.map((letter, index) => (
                  <EnvelopeLetter key={`${letter.from}-${letter.time}`} letter={letter} index={index} />
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[1.5rem] border border-border bg-surface/88 shadow-[var(--t-shadow-card)] backdrop-blur-xl">
              <div className="relative min-h-44 p-5">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-amber/20 bg-amber/[0.07]" />
                <div className="absolute bottom-4 right-4 h-20 w-32 rotate-6 rounded-xl border border-border bg-elevated/35 shadow-[var(--t-shadow-card)]" />
                <div className="absolute left-5 top-5 h-20 w-14 rotate-[-8deg] rounded-md border border-rose/20 bg-rose/[0.07]" />
                <div className="relative">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-amber">Noticeboard</p>
                  <h2 className="mt-2 font-display text-2xl text-paper">Moonlit Machines closes tonight.</h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    Your draft is eligible. The board is busy, but there&apos;s still time to pin a final revision.
                  </p>
                  <button className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 text-sm text-amber">
                    <ScrollText size={15} />
                    View notice
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </section>

      </div>
    </main>
  );
}
