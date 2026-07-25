"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sunrise, Sun, Sunset, Moon, ChevronLeft, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Production primitives for the Studio dashboard: auto-generated cover art,
// genre palettes, time-of-day phases, the phase clock, momentum cards,
// sparkline, and the scenes rail.
// ─────────────────────────────────────────────────────────────────────────────

export const PALETTES: [string, string, string][] = [
  ["#1e3a8a", "#7c3aed", "#db2777"],
  ["#0f766e", "#0ea5e9", "#22d3ee"],
  ["#b45309", "#dc2626", "#f59e0b"],
  ["#4c1d95", "#6d28d9", "#c026d3"],
  ["#065f46", "#16a34a", "#a3e635"],
  ["#9d174d", "#e11d48", "#fb7185"],
  ["#0c4a6e", "#0891b2", "#2dd4bf"],
  ["#7c2d12", "#ea580c", "#fbbf24"],
];

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
export const arand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
export function paletteFor(seed: string): [string, string, string] {
  return PALETTES[hash(seed) % PALETTES.length];
}

// bound-book inks, not screen greens — deep pine/teal/amethyst families that
// sit beside the studio's gold instead of shouting over it
export const GENRE_PALETTES: Record<string, [string, string, string]> = {
  fantasy: ["#143829", "#3d7354", "#9cb877"],
  romance: ["#701537", "#b82b50", "#e88ba0"],
  horror: ["#1c1917", "#7f1d1d", "#c22f2f"],
  "sci-fi": ["#0e3d43", "#1a7f82", "#6fd0bd"],
  scifi: ["#0e3d43", "#1a7f82", "#6fd0bd"],
  "science fiction": ["#0e3d43", "#1a7f82", "#6fd0bd"],
  mystery: ["#251c47", "#4d3b8e", "#9a7ac8"],
  literary: ["#78350f", "#b45309", "#f59e0b"],
  "literary fiction": ["#78350f", "#b45309", "#f59e0b"],
  poetry: ["#4c1d95", "#7c3aed", "#c084fc"],
};
export function genrePalette(genre?: string): [string, string, string] | undefined {
  if (!genre) return undefined;
  return GENRE_PALETTES[genre.toLowerCase()];
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).split(",").map((n) => Number(n) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

// every book gets its own mix of its genre's ink — same family, never the
// same bottle (a row of identical spines reads as a rendering bug)
export function spinePalette(genre: string | undefined, seed: string): [string, string, string] {
  const base = genrePalette(genre) ?? paletteFor(seed);
  const n = hash(seed + "::spine");
  const dh = (n % 25) - 12; // ±12° around the genre hue
  const dl = (((n >> 6) % 11) - 5) / 100; // ±5% lightness
  return base.map((hex) => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h + dh, s, Math.min(0.92, Math.max(0.08, l + dl)));
  }) as [string, string, string];
}

// reader amber — hexToRgb(genrePalette("literary")[2]) === hexToRgb("#f59e0b")
export const READER_ACCENT = "245,158,11";

export const PHASES = {
  morning: { label: "Morning glow", mood: "the lamps are soft, the day is new", Icon: Sunrise, rgb: "224,164,88" },
  day: { label: "Midday", mood: "sunlit and wide awake", Icon: Sun, rgb: "138,176,158" },
  dusk: { label: "Golden hour", mood: "the lamps are being lit", Icon: Sunset, rgb: "224,138,108" },
  night: { label: "Lamplight", mood: "the quiet, deep hours are yours", Icon: Moon, rgb: "154,122,208" },
} as const;
export type PhaseKey = keyof typeof PHASES;
export const CLOCK_FALLBACK = new Date(2026, 0, 1, 18, 30);

export function phaseInfo(now: Date): { key: PhaseKey; progress: number } {
  const h = now.getHours() + now.getMinutes() / 60;
  const starts: [PhaseKey, number][] = [["morning", 5], ["day", 11], ["dusk", 17], ["night", 21]];
  let key: PhaseKey = "night";
  for (const [k, s] of starts) if (h >= s) key = k;
  const idx = starts.findIndex((s) => s[0] === key);
  const start = starts[idx][1];
  const nextStart = starts[(idx + 1) % 4][1];
  let dur = (nextStart - start + 24) % 24;
  if (dur === 0) dur = 24;
  const elapsed = (h - start + 24) % 24;
  return { key, progress: Math.min(1, elapsed / dur) };
}
export const formatTime = (d: Date) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);

export function CoverArt({ seed, title, className = "", titleSize = "text-base", palette, image }: { seed: string; title: string; className?: string; titleSize?: string; palette?: [string, string, string]; image?: string | null }) {
  const p = palette ?? paletteFor(seed);
  const variant = hash(seed + "v") % 4;

  // 1. an uploaded cover always wins
  if (image) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {title && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-3"><p className={`font-display leading-tight text-white drop-shadow ${titleSize}`}>{title}</p></div>
          </>
        )}
      </div>
    );
  }

  // 2. otherwise the generated default (a curated theme library would slot in here)
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]} 52%, ${p[2]})` }}>
      <svg className="absolute inset-0 h-full w-full opacity-60" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 140">
        {variant === 0 && Array.from({ length: 7 }).map((_, i) => (
          <circle key={i} cx={20 + (hash(seed + i) % 60)} cy={20 + (hash(seed + "y" + i) % 100)} r={6 + (hash(seed + "r" + i) % 22)} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={0.8} />
        ))}
        {variant === 1 && Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={-10} y1={i * 18} x2={110} y2={i * 18 - 40} stroke="#fff" strokeOpacity={0.14} strokeWidth={1.4} />
        ))}
        {variant === 2 && Array.from({ length: 5 }).map((_, i) => (
          <path key={i} d={`M ${i * 24} 140 Q 50 ${40 + i * 12} 100 ${i * 20}`} fill="none" stroke="#fff" strokeOpacity={0.16} strokeWidth={1} />
        ))}
        {variant === 3 && (
          <g fill="#fff" fillOpacity={0.12}>
            {Array.from({ length: 14 }).map((_, i) => (
              <circle key={i} cx={hash(seed + i) % 100} cy={hash(seed + "b" + i) % 140} r={1 + (hash(seed + "s" + i) % 3)} />
            ))}
          </g>
        )}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
      {title && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className={`font-display leading-tight text-white drop-shadow ${titleSize}`}>{title}</p>
        </div>
      )}
    </div>
  );
}

export function Sparkline({ data, color, reduce }: { data: number[]; color: string; reduce: boolean | null }) {
  const w = 100;
  const h = 30;
  // Normalize internally so any scale renders correctly — callers can pass raw
  // word counts or pre-normalized 0–1 series alike.
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  // `color` may now be a CSS var reference — strip everything that can't live
  // in a gradient id, or url(#…) silently fails to resolve.
  const gradId = `sl-${color.replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: `rgb(${color})` }} stopOpacity={0.35} />
          <stop offset="100%" style={{ stopColor: `rgb(${color})` }} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <motion.path d={line} fill="none" style={{ stroke: `rgb(${color})` }} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeOut" }} />
    </svg>
  );
}

export function MomentumCard({ accent, icon, label, big, sub, children }: { accent: string; icon: React.ReactNode; label: string; big: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/60 p-4" style={{ boxShadow: `inset 0 1px 0 rgba(${accent},0.08)` }}>
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: `rgb(${accent})` }}>
        {icon}
        {label}
      </div>
      <div className="mt-1.5 font-display text-2xl text-paper">{big}</div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-text-ghost">{sub}</div>
      {children}
    </div>
  );
}

export function PhaseClock({ now }: { now: Date }) {
  const { key, progress } = phaseInfo(now);
  const p = PHASES[key];
  const C = 2 * Math.PI * 9;
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur">
      <span className="relative flex h-7 w-7 items-center justify-center">
        <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
          <circle cx="12" cy="12" r="9" fill="none" stroke={`rgb(${p.rgb})`} strokeWidth="2" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
        </svg>
        <p.Icon className="h-3.5 w-3.5" style={{ color: `rgb(${p.rgb})` }} />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[13px] text-paper">{p.label}</span>
        <span className="block font-mono text-[10px] text-text-ghost">{formatTime(now)}</span>
      </span>
    </div>
  );
}

// ── horizontal rail: native trackpad/touch scroll + click-drag + arrow buttons ─
export function ScenesRail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };
  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current.down) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const end = () => { drag.current.down = false; };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; }
  };

  return (
    <div className="group/rail relative">
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerLeave={end}
        onClickCapture={onClickCapture}
        onScroll={sync}
        className="-mx-1 flex cursor-grab select-none gap-3 overflow-x-auto px-1 pb-2 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-void to-transparent transition-opacity duration-300 ${atStart ? "opacity-0" : "opacity-100"}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-void to-transparent transition-opacity duration-300 ${atEnd ? "opacity-0" : "opacity-100"}`} />
      <button type="button" aria-label="Scroll left" onClick={() => nudge(-1)} className={`absolute left-1 top-[40%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-paper backdrop-blur transition-all hover:bg-black/80 sm:flex ${atStart ? "pointer-events-none opacity-0" : "opacity-0 group-hover/rail:opacity-100"}`}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label="Scroll right" onClick={() => nudge(1)} className={`absolute right-1 top-[40%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-paper backdrop-blur transition-all hover:bg-black/80 sm:flex ${atEnd ? "pointer-events-none opacity-0" : "opacity-0 group-hover/rail:opacity-100"}`}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
