"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Sparkles,
  Eye,
  PenLine,
  Swords,
  Heart,
  TrendingUp,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  BookOpen,
} from "lucide-react";
import { useDashboardData, storyHref } from "@/components/dashboard-mockup/useDashboardData";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// "The Studio" — the ENERGETIC dashboard. Pride + pulse + momentum.
//   • Your work as rich, auto-generated cover art, colored by the story.
//   • Reader reactions pulsing up in real time; the room feels awake.
//   • A momentum strip (streak, words, sparks) you can feel.
//   • The whole page is themed by your active story's colour.
// Energy comes from the design system (generated art, motion, colour), so it's
// alive even on a sparse/test account. Reactions + presence are illustrative of
// the real reactions/presence features; counts use real data where available.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;

const PALETTES: [string, string, string][] = [
  ["#1e3a8a", "#7c3aed", "#db2777"], // indigo → violet → pink
  ["#0f766e", "#0ea5e9", "#22d3ee"], // teal → sky
  ["#b45309", "#dc2626", "#f59e0b"], // amber → red
  ["#4c1d95", "#6d28d9", "#c026d3"], // royal purple
  ["#065f46", "#16a34a", "#a3e635"], // forest → lime
  ["#9d174d", "#e11d48", "#fb7185"], // rose
  ["#0c4a6e", "#0891b2", "#2dd4bf"], // deep cyan
  ["#7c2d12", "#ea580c", "#fbbf24"], // ember
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
const arand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
function paletteFor(seed: string) {
  return PALETTES[hash(seed) % PALETTES.length];
}

// genre drives cover colour so the palette MEANS something (vs random hash)
const GENRE_PALETTES: Record<string, [string, string, string]> = {
  fantasy: ["#065f46", "#16a34a", "#a3e635"],
  romance: ["#9d174d", "#e11d48", "#fb7185"],
  horror: ["#1c1917", "#7f1d1d", "#dc2626"],
  "sci-fi": ["#0c4a6e", "#0891b2", "#2dd4bf"],
  scifi: ["#0c4a6e", "#0891b2", "#2dd4bf"],
  mystery: ["#1e1b4b", "#4338ca", "#818cf8"],
  literary: ["#78350f", "#b45309", "#f59e0b"],
  poetry: ["#4c1d95", "#7c3aed", "#c084fc"],
};
function genrePalette(genre?: string): [string, string, string] | undefined {
  if (!genre) return undefined;
  return GENRE_PALETTES[genre.toLowerCase()];
}

// ── ILLUSTRATIVE reading data (no published stories exist to pull real ones) ──
// Stands in for: a current read with progress, a to-read shelf, and updates
// from writers you follow. In production these come from reading-progress +
// follows tables that already exist in the schema.
const READING_DEMO = {
  current: { id: "rd-salt-year", title: "The Salt Year", author: "Iris Vale", genre: "literary", chapter: 7, of: 12 },
  streak: 12,
  shelf: [
    { id: "rd-hollow", title: "Hollow Tide", author: "M. Okonkwo", genre: "fantasy", fresh: 2 },
    { id: "rd-neon", title: "Neon Liturgy", author: "A. Reyes", genre: "sci-fi", fresh: 1 },
    { id: "rd-quiet", title: "The Quiet House", author: "L. Brandt", genre: "horror", fresh: 0 },
    { id: "rd-saints", title: "Paper Saints", author: "J. Mercer", genre: "romance", fresh: 3 },
    { id: "rd-falling", title: "Field Notes on Falling", author: "S. Ito", genre: "poetry", fresh: 0 },
    { id: "rd-cipher", title: "The Eighth Cipher", author: "D. Hale", genre: "mystery", fresh: 1 },
  ],
  follows: [
    { id: "fw1", emoji: "📖", who: "Iris Vale", text: "posted Chapter 8 of The Salt Year" },
    { id: "fw2", emoji: "✦", who: "M. Okonkwo", text: "started a new story — Hollow Tide" },
    { id: "fw3", emoji: "📖", who: "J. Mercer", text: "posted Chapter 22 of Paper Saints" },
    { id: "fw4", emoji: "📣", who: "A. Reyes", text: "shared an update on Neon Liturgy" },
  ],
};
const READER_ACCENT = hexToRgb((genrePalette(READING_DEMO.current.genre) ?? PALETTES[0])[2]);

// deterministic, gently-climbing series for a momentum sparkline (illustrative)
function genSeries(seed: string, n = 14): number[] {
  const out: number[] = [];
  let v = 0.2 + arand(hash(seed)) * 0.3;
  for (let i = 0; i < n; i++) {
    v = Math.min(1, Math.max(0.08, v + (arand(hash(`${seed}_${i}`)) - 0.4) * 0.32));
    out.push(v);
  }
  return out;
}

// ── time-of-day "light in the room" (from the live dashboard, recast) ─────────
// This colours the AMBIENT LIGHT only; the story's own palette still owns the
// content. So the room is lit warm at dusk, cool at night — but your covers
// keep their colours.
const PHASES = {
  morning: { label: "Morning glow", mood: "the lamps are soft, the day is new", Icon: Sunrise, rgb: "224,164,88" },
  day: { label: "Midday", mood: "sunlit and wide awake", Icon: Sun, rgb: "138,176,158" },
  dusk: { label: "Golden hour", mood: "the lamps are being lit", Icon: Sunset, rgb: "224,138,108" },
  night: { label: "Lamplight", mood: "the quiet, deep hours are yours", Icon: Moon, rgb: "154,122,208" },
} as const;
type PhaseKey = keyof typeof PHASES;
const CLOCK_FALLBACK = new Date(2026, 0, 1, 18, 30);

function phaseInfo(now: Date): { key: PhaseKey; progress: number } {
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
const formatTime = (d: Date) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);

function PhaseClock({ now }: { now: Date }) {
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

const REACTIONS = [
  { e: "😮", l: "gasped" },
  { e: "😢", l: "welled up" },
  { e: "🔥", l: "needs more" },
  { e: "💔", l: "heartbroken" },
  { e: "✨", l: "felt inspired" },
  { e: "😱", l: "was terrified" },
  { e: "😄", l: "laughed out loud" },
];

// ── auto-generated cover art ──────────────────────────────────────────────────
function CoverArt({ seed, title, className = "", titleSize = "text-base", palette }: { seed: string; title: string; className?: string; titleSize?: string; palette?: [string, string, string] }) {
  const p = palette ?? paletteFor(seed);
  const variant = hash(seed + "v") % 4;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]} 52%, ${p[2]})` }}>
      <svg className="absolute inset-0 h-full w-full opacity-60" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 140">
        {variant === 0 &&
          Array.from({ length: 7 }).map((_, i) => (
            <circle key={i} cx={20 + (hash(seed + i) % 60)} cy={20 + (hash(seed + "y" + i) % 100)} r={6 + (hash(seed + "r" + i) % 22)} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={0.8} />
          ))}
        {variant === 1 &&
          Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1={-10} y1={i * 18} x2={110} y2={i * 18 - 40} stroke="#fff" strokeOpacity={0.14} strokeWidth={1.4} />
          ))}
        {variant === 2 &&
          Array.from({ length: 5 }).map((_, i) => (
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
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className={`font-display leading-tight text-white drop-shadow ${titleSize}`}>{title}</p>
      </div>
    </div>
  );
}

function Sparkline({ data, color, reduce }: { data: number[]; color: string; reduce: boolean | null }) {
  const w = 100;
  const h = 30;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - v * (h - 4) - 2}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sl-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity={0.35} />
          <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sl-${color})`} />
      <motion.path
        d={line}
        fill="none"
        stroke={`rgb(${color})`}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function StudioMock() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const data = useDashboardData(POLL_MS);
  const { loaded, error, allStories, activeStory, activeHref, notifs } = data;
  const firstName = session?.user?.name?.split(" ")[0];

  const accent = activeStory ? hexToRgb(paletteFor(activeStory.id)[2]) : "224,164,88";

  // adaptive hero: default to your centre of gravity (no works → reader face),
  // but let the visitor flip to feel both faces of the same surface.
  const [override, setOverride] = useState<"writing" | "reading" | null>(null);
  const mode: "writing" | "reading" = override ?? (loaded && allStories.length === 0 ? "reading" : "writing");
  const focusAccent = mode === "reading" ? READER_ACCENT : accent;

  const totalWords = useMemo(() => allStories.reduce((a, s) => a + (s.totalWords || 0), 0), [allStories]);
  const totalSparks = useMemo(() => allStories.reduce((a, s) => a + (s.sparkCount || 0), 0), [allStories]);
  const series = useMemo(() => genSeries(activeStory?.id ?? "seed", 14), [activeStory]);

  // a live pool of room activity: real notifs + illustrative reader reactions
  const pool = useMemo(() => {
    const real = notifs.map((n) => ({ id: n.id, emoji: emojiFor(n.type), text: n.message, href: n.href || "/notifications" }));
    const story = activeStory?.title ?? allStories[0]?.title ?? "your story";
    const illus = REACTIONS.map((r, i) => ({ id: `r${i}`, emoji: r.e, text: `A reader ${r.l} at ${story}`, href: "/notifications" }));
    return [...real, ...illus];
  }, [notifs, activeStory, allStories]);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const clockNow = now ?? CLOCK_FALLBACK;
  const phaseKey = phaseInfo(clockNow).key;
  const phaseRgb = PHASES[phaseKey].rgb;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setTick((t) => t + 1), 2800);
    return () => clearInterval(id);
  }, [reduce]);
  const feed = useMemo(() => {
    if (!pool.length) return [];
    const k = Math.min(4, pool.length);
    const start = tick % pool.length;
    return Array.from({ length: k }, (_, i) => pool[(start + i) % pool.length]);
  }, [pool, tick]);

  const isCampaign = activeStory?.writingMode === "campaign";
  const actionLabel = isCampaign ? "Enter the table" : "Resume writing";

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      {/* the whole room is washed in the active story's colour */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        animate={reduce ? { opacity: 1 } : { opacity: [0.85, 1, 0.85] }}
        transition={reduce ? {} : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(130% 80% at 15% -5%, rgba(${focusAccent},0.22), transparent 55%), radial-gradient(120% 80% at 95% 10%, rgba(${focusAccent},0.10), transparent 50%)` }}
      />
      {/* time-of-day light — washes the top of the room, transitions across the day */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[440px]"
        animate={{ background: `linear-gradient(to bottom, rgba(${phaseRgb},0.12), rgba(${phaseRgb},0.03) 45%, transparent 72%)` }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />

      <div className="mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest">Concepts</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden font-display text-lg text-paper sm:block">{firstName ? `${firstName}'s Studio` : "Your Studio"}</span>
            {now && <PhaseClock now={now} />}
          </div>
        </header>

        {loaded && !error && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <ModeToggle mode={mode} onChange={setOverride} accent={focusAccent} />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">
              adaptive hero · preview{mode === "reading" ? " · reading data illustrative" : ""}
            </span>
          </div>
        )}

        {!loaded ? (
          <div className="mt-7 h-80 animate-pulse rounded-3xl bg-elevated/50" />
        ) : error ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The studio is dark right now — try again in a moment.</p>
        ) : mode === "reading" ? (
          <ReaderFace reduce={reduce} phaseKey={phaseKey} />
        ) : allStories.length === 0 ? (
          <EmptyStudio accent={focusAccent} />
        ) : (
          <>
            {/* ── HERO: the active work, big and alive ── */}
            <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/10">
              <div className="absolute inset-0">
                <CoverArt seed={activeStory!.id} title="" className="h-full w-full" />
                <div className="absolute inset-0 backdrop-blur-[2px]" style={{ background: `linear-gradient(90deg, rgba(8,8,12,0.88) 0%, rgba(8,8,12,0.55) 45%, rgba(8,8,12,0.25) 100%)` }} />
              </div>

              {/* reader reactions rising on the right — the pulse */}
              {!reduce && (
                <div className="pointer-events-none absolute inset-y-0 right-4 w-40 sm:right-10">
                  {REACTIONS.slice(0, 5).map((r, i) => (
                    <motion.div
                      key={i}
                      className="absolute right-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-sm"
                      initial={{ y: 280, opacity: 0 }}
                      animate={{ y: -40, opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 6.5, delay: i * 1.6, repeat: Infinity, ease: "easeOut", times: [0, 0.12, 0.8, 1] }}
                    >
                      <span className="text-sm">{r.e}</span>
                      <span className="capitalize">{r.l}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="relative flex min-h-[330px] flex-col justify-end p-6 sm:p-8">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white" style={{ backgroundColor: `rgba(${accent},0.35)` }}>
                    <span className="relative flex h-1.5 w-1.5">
                      <motion.span className="absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: `rgb(${accent})` }} animate={reduce ? {} : { opacity: [1, 0.2, 1], scale: [1, 1.8, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    Live · your world is awake
                  </span>
                </div>
                <h1 className="mt-3 font-display text-4xl leading-[1.05] text-white drop-shadow-lg sm:text-6xl">{activeStory!.title}</h1>
                <p className="mt-2 font-mono text-[12px] uppercase tracking-widest text-white/70">
                  {isCampaign ? "Campaign" : activeStory!.format} · {activeStory!.chapterCount > 0 ? `Chapter ${activeStory!.chapterCount}` : "Chapter 1"} · {(activeStory!.totalWords || 0).toLocaleString()} words
                </p>
                <p className="mt-1.5 font-reading text-sm italic text-white/60">
                  {PHASES[phaseKey].label} — {PHASES[phaseKey].mood}.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link href={activeHref} className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-black transition-transform hover:scale-[1.03]" style={{ backgroundColor: `rgb(${accent})` }}>
                    {isCampaign ? <Swords className="h-[18px] w-[18px]" /> : <PenLine className="h-[18px] w-[18px]" />}
                    {actionLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] text-white/80 backdrop-blur">
                    <Eye className="h-3.5 w-3.5" /> {Math.max(1, totalSparks)} drawn to your world
                  </span>
                </div>
              </div>
            </section>

            {/* ── MOMENTUM: feel the progress ── */}
            <section className="mt-4 grid gap-4 sm:grid-cols-3">
              <MomentumCard accent={accent} icon={<Flame className="h-4 w-4" />} label="On a roll" big="🔥 streak" sub="keep it lit">
                <div className="mt-2 flex items-end gap-1">
                  {[3, 5, 4, 6, 7, 5, 8].map((n, i) => (
                    <motion.span
                      key={i}
                      className="w-full rounded-sm"
                      style={{ backgroundColor: `rgba(${accent},${0.35 + i * 0.09})` }}
                      initial={reduce ? false : { height: 0 }}
                      animate={{ height: n * 4 }}
                      transition={{ delay: 0.05 * i, type: "spring", stiffness: 200, damping: 18 }}
                    />
                  ))}
                </div>
              </MomentumCard>
              <MomentumCard accent={accent} icon={<TrendingUp className="h-4 w-4" />} label="Words" big={totalWords.toLocaleString()} sub="across your shelf">
                <div className="mt-1">
                  <Sparkline data={series} color={accent} reduce={reduce} />
                </div>
              </MomentumCard>
              <MomentumCard accent={accent} icon={<Heart className="h-4 w-4" />} label="Sparks" big={totalSparks.toLocaleString()} sub="readers who lit up">
                <div className="mt-2 flex flex-wrap gap-1">
                  {REACTIONS.map((r, i) => (
                    <motion.span key={i} className="text-base" initial={reduce ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 + i * 0.06, type: "spring", stiffness: 300 }}>
                      {r.e}
                    </motion.span>
                  ))}
                </div>
              </MomentumCard>
            </section>

            {/* ── GALLERY + LIVE ROOM ── */}
            <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
              <div>
                <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Your works</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {allStories.slice(0, 6).map((s) => (
                    <GalleryCard key={s.id} story={s} reduce={reduce} />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">
                  <span className="relative flex h-1.5 w-1.5">
                    <motion.span className="absolute inline-flex h-full w-full rounded-full bg-rose" animate={reduce ? {} : { opacity: [1, 0.2, 1], scale: [1, 1.9, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose" />
                  </span>
                  In your world
                </h2>
                <div className="space-y-2">
                  <AnimatePresence initial={false} mode="popLayout">
                    {feed.map((ev) => (
                      <motion.div
                        key={ev.id}
                        layout
                        initial={reduce ? false : { opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.4 }}
                      >
                        <Link href={ev.href} className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-surface/50 px-3 py-2.5 text-[12.5px] text-text-secondary transition-colors hover:border-border hover:text-paper">
                          <span className="text-base">{ev.emoji}</span>
                          <span className="line-clamp-2 leading-snug">{ev.text}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function emojiFor(type: string): string {
  switch (type) {
    case "comment": return "💬";
    case "spark": return "✶";
    case "follow": return "👋";
    case "chapter": return "📖";
    case "update": return "📣";
    default: return "✶";
  }
}

function MomentumCard({ accent, icon, label, big, sub, children }: { accent: string; icon: React.ReactNode; label: string; big: string; sub: string; children?: React.ReactNode }) {
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

function GalleryCard({ story, reduce }: { story: ApiStory; reduce: boolean | null }) {
  const words = (story.totalWords || 0).toLocaleString();
  return (
    <motion.div whileHover={reduce ? undefined : { y: -6, rotateZ: -0.6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Link href={storyHref(story)} className="block">
        <CoverArt seed={story.id} title={story.title} className="aspect-[3/4] rounded-2xl shadow-lg ring-1 ring-white/10" titleSize="text-sm" />
        <div className="mt-1.5 flex items-center justify-between px-0.5 font-mono text-[10px] text-text-ghost">
          <span className="uppercase tracking-wider">{story.writingMode === "campaign" ? "Campaign" : story.status === "draft" ? "Draft" : story.format}</span>
          <span>{words}w</span>
        </div>
      </Link>
    </motion.div>
  );
}

function ModeToggle({ mode, onChange, accent }: { mode: "writing" | "reading"; onChange: (m: "writing" | "reading") => void; accent: string }) {
  const opts = [
    { key: "writing" as const, label: "Writing", Icon: PenLine },
    { key: "reading" as const, label: "Reading", Icon: BookOpen },
  ];
  return (
    <div
      className="relative inline-flex items-center rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md"
      style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)" }}
    >
      {opts.map((o) => {
        const active = mode === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            aria-pressed={active}
            className={`relative z-10 inline-flex items-center gap-1.5 rounded-full px-5 py-1.5 text-[12px] font-semibold transition-colors duration-200 ${active ? "" : "text-text-secondary hover:text-paper"}`}
            style={active ? { color: "#0a0a0f" } : undefined}
          >
            {active && (
              <motion.span
                layoutId="mode-thumb"
                className="absolute inset-0 -z-10 rounded-full"
                style={{ backgroundColor: `rgb(${accent})`, boxShadow: `0 2px 12px rgba(${accent},0.45)` }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <o.Icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── the reader-leaning face of the same surface ──────────────────────────────
function ReaderFace({ reduce, phaseKey }: { reduce: boolean | null; phaseKey: PhaseKey }) {
  const cur = READING_DEMO.current;
  const curPalette = genrePalette(cur.genre) ?? paletteFor(cur.id);
  const accent = hexToRgb(curPalette[2]);
  const pct = Math.round((cur.chapter / cur.of) * 100);
  const series = useMemo(() => genSeries(cur.id, 14), [cur.id]);
  const floats = [
    { e: "🔥", l: "couldn't put it down" },
    { e: "📖", l: `Chapter ${cur.chapter}` },
    { e: "✨", l: "a new favourite" },
    { e: "💔", l: "that ending…" },
  ];

  return (
    <>
      {/* HERO — the book you're inside, shown as richly as your own work */}
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/10">
        <div className="absolute inset-0">
          <CoverArt seed={cur.id} title="" className="h-full w-full" palette={curPalette} />
          <div className="absolute inset-0 backdrop-blur-[2px]" style={{ background: `linear-gradient(90deg, rgba(8,8,12,0.88) 0%, rgba(8,8,12,0.55) 45%, rgba(8,8,12,0.25) 100%)` }} />
        </div>

        {!reduce && (
          <div className="pointer-events-none absolute inset-y-0 right-4 w-44 sm:right-10">
            {floats.map((r, i) => (
              <motion.div
                key={i}
                className="absolute right-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-sm"
                initial={{ y: 280, opacity: 0 }}
                animate={{ y: -40, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 6.5, delay: i * 1.6, repeat: Infinity, ease: "easeOut", times: [0, 0.12, 0.8, 1] }}
              >
                <span className="text-sm">{r.e}</span>
                <span>{r.l}</span>
              </motion.div>
            ))}
          </div>
        )}

        <div className="relative flex min-h-[330px] flex-col justify-end p-6 sm:p-8">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white" style={{ backgroundColor: `rgba(${accent},0.35)` }}>
            <span className="relative flex h-1.5 w-1.5">
              <motion.span className="absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: `rgb(${accent})` }} animate={reduce ? {} : { opacity: [1, 0.2, 1], scale: [1, 1.8, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            Continue reading
          </span>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] text-white drop-shadow-lg sm:text-6xl">{cur.title}</h1>
          <p className="mt-2 font-mono text-[12px] uppercase tracking-widest text-white/70">
            by {cur.author} · {cur.genre} · Chapter {cur.chapter} of {cur.of}
          </p>
          <p className="mt-1.5 font-reading text-sm italic text-white/60">{PHASES[phaseKey].label} — {PHASES[phaseKey].mood}.</p>

          {/* reading progress */}
          <div className="mt-4 max-w-md">
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/60">
              <span>{pct}% through</span>
              <span>{cur.of - cur.chapter} chapters left</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: `rgb(${accent})` }} initial={reduce ? false : { width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/read" className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-black transition-transform hover:scale-[1.03]" style={{ backgroundColor: `rgb(${accent})` }}>
              Keep reading
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] text-white/80 backdrop-blur">
              <Flame className="h-3.5 w-3.5" /> {READING_DEMO.streak}-day reading streak
            </span>
          </div>
        </div>
      </section>

      {/* MOMENTUM — reader version */}
      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <MomentumCard accent={accent} icon={<Flame className="h-4 w-4" />} label="Reading streak" big={`${READING_DEMO.streak} days`} sub="don't break the chain">
          <div className="mt-2 flex items-end gap-1">
            {[4, 6, 5, 7, 6, 8, 9].map((n, i) => (
              <motion.span key={i} className="w-full rounded-sm" style={{ backgroundColor: `rgba(${accent},${0.35 + i * 0.09})` }} initial={reduce ? false : { height: 0 }} animate={{ height: n * 4 }} transition={{ delay: 0.05 * i, type: "spring", stiffness: 200, damping: 18 }} />
            ))}
          </div>
        </MomentumCard>
        <MomentumCard accent={accent} icon={<TrendingUp className="h-4 w-4" />} label="Chapters" big="18" sub="read this week">
          <div className="mt-1">
            <Sparkline data={series} color={accent} reduce={reduce} />
          </div>
        </MomentumCard>
        <MomentumCard accent={accent} icon={<Heart className="h-4 w-4" />} label="Following" big={READING_DEMO.follows.length.toString()} sub="writers you follow">
          <div className="mt-2 flex flex-wrap gap-1.5">
            {READING_DEMO.follows.map((f, i) => (
              <motion.span key={f.id} className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: `rgba(${accent},0.5)` }} initial={reduce ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 + i * 0.06, type: "spring", stiffness: 300 }}>
                {f.who.split(" ").map((w) => w[0]).join("")}
              </motion.span>
            ))}
          </div>
        </MomentumCard>
      </section>

      {/* SHELF + FOLLOWS FEED */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">On your shelf</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {READING_DEMO.shelf.map((s) => (
              <motion.div key={s.id} whileHover={reduce ? undefined : { y: -6, rotateZ: -0.6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <Link href="/read" className="block">
                  <div className="relative">
                    <CoverArt seed={s.id} title={s.title} className="aspect-[3/4] rounded-2xl shadow-lg ring-1 ring-white/10" titleSize="text-sm" palette={genrePalette(s.genre)} />
                    {s.fresh > 0 && (
                      <span className="absolute right-2 top-2 rounded-full bg-rose px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                        {s.fresh} new
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between px-0.5 font-mono text-[10px] text-text-ghost">
                    <span className="truncate">{s.author}</span>
                    <span className="uppercase tracking-wider">{s.genre}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">
            <span className="relative flex h-1.5 w-1.5">
              <motion.span className="absolute inline-flex h-full w-full rounded-full bg-rose" animate={reduce ? {} : { opacity: [1, 0.2, 1], scale: [1, 1.9, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose" />
            </span>
            From writers you follow
          </h2>
          <div className="space-y-2">
            {READING_DEMO.follows.map((f, i) => (
              <motion.div key={f.id} initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
                <Link href="/read" className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-surface/50 px-3 py-2.5 text-[12.5px] text-text-secondary transition-colors hover:border-border hover:text-paper">
                  <span className="text-base">{f.emoji}</span>
                  <span className="leading-snug"><span className="text-paper">{f.who}</span> {f.text}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function EmptyStudio({ accent }: { accent: string }) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-3xl border border-white/10 bg-surface/40 p-12 text-center">
      <Sparkles className="h-8 w-8" style={{ color: `rgb(${accent})` }} />
      <h1 className="mt-4 font-display text-3xl text-paper">Your studio is waiting</h1>
      <p className="mt-2 max-w-sm font-reading italic text-text-secondary">The lights are on, the walls are bare. Hang your first story and watch the room come alive.</p>
      <Link href="/create" className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-black" style={{ backgroundColor: `rgb(${accent})` }}>
        Start your first story <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
