"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Swords,
  MessageSquareText,
  Sparkles,
  UserPlus,
  PenLine,
  Snowflake,
  Radio,
  Compass,
  Flame,
  Trophy,
} from "lucide-react";
import { useDashboardData, storyHref } from "@/components/dashboard-mockup/useDashboardData";

// ─────────────────────────────────────────────────────────────────────────────
// "The Brief" — one surface, three layers, and it's ALIVE.
//   1. The Brief writes itself in, clause by clause, like a letter penned now.
//   2. What's alive: a self-ranking stream that re-orders itself as heat shifts
//      (the page quietly re-fetches), hot rows breathing.
//   3. The quiet band: reach/ambient.
// The room breathes — the state-tinted glow pulses (faster when urgent) and
// drifts with the cursor. First-pass ranking lives in buildLiveItems().
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;

type Category =
  | "your-move"
  | "session-live"
  | "reader-notes"
  | "reactions"
  | "new-readers"
  | "resume"
  | "cold-draft";

interface LiveItem {
  key: string;
  heat: number;
  category: Category;
  accent: AccentName;
  eyebrow: string;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  clause: string;
}

type AccentName = "amber" | "rose" | "sage" | "lavender" | "teal" | "copper";

const ACCENT_RGB: Record<AccentName, string> = {
  amber: "224,164,88",
  rose: "184,105,122",
  sage: "124,160,116",
  lavender: "154,122,208",
  teal: "94,139,130",
  copper: "208,136,88",
};

const ICONS: Record<Category, React.ComponentType<{ size?: number; className?: string }>> = {
  "your-move": Swords,
  "session-live": Radio,
  "reader-notes": MessageSquareText,
  reactions: Sparkles,
  "new-readers": UserPlus,
  resume: PenLine,
  "cold-draft": Snowflake,
};

const daysSince = (iso: string) => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86_400_000);
};
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const trunc = (s: string, n = 80) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// ── THE RANKING MODEL (unchanged — the spec we're still tuning) ───────────────
function buildLiveItems(d: ReturnType<typeof useDashboardData>): LiveItem[] {
  const items: LiveItem[] = [];
  const { allStories, activeStory, activeHref, liveCampaigns, notifs } = d;

  for (const c of liveCampaigns) {
    if (!c.activeSession) continue;
    const yourMove =
      !!c.myCharacter && !!c.activeSession.activePlayerId && c.activeSession.activePlayerId === c.myCharacter.id;
    const gm = c.role === "gm" || c.role === "both";
    if (yourMove) {
      items.push({
        key: `move-${c.id}`,
        heat: 100,
        category: "your-move",
        accent: "rose",
        eyebrow: "Your move",
        title: c.title,
        detail: `${c.myCharacter!.name} is waiting on your turn`,
        actionLabel: "Take your turn",
        href: `/campaign/${c.id}/play/${c.activeSession.id}`,
        clause: `it's your move in *${c.title}* — ${c.myCharacter!.name} is waiting`,
      });
    } else {
      items.push({
        key: `live-${c.id}`,
        heat: 72,
        category: "session-live",
        accent: "sage",
        eyebrow: "Table in session",
        title: c.title,
        detail: gm ? `You're GMing · ${plural(c.playerCount, "player")} at the table` : `${plural(c.playerCount, "player")} at the table`,
        actionLabel: gm ? "Run the table" : "Join the table",
        href: `/campaign/${c.id}/play/${c.activeSession.id}`,
        clause: `*${c.title}* is live with ${plural(c.playerCount, "player")} at the table`,
      });
    }
  }

  const comments = notifs.filter((n) => n.type === "comment" && !n.read);
  if (comments.length) {
    items.push({
      key: "reader-notes",
      heat: 62 + Math.min(comments.length, 6) * 3,
      category: "reader-notes",
      accent: "amber",
      eyebrow: "Readers waiting",
      title: `${plural(comments.length, "reader note")}`,
      detail: trunc(comments[0].message),
      actionLabel: "Answer the room",
      href: comments[0].href || "/notifications",
      clause: `${plural(comments.length, "reader note")} ${comments.length === 1 ? "is" : "are"} waiting on your reply`,
    });
  }

  const sparks = notifs.filter((n) => n.type === "spark" && !n.read);
  if (sparks.length) {
    items.push({
      key: "sparks",
      heat: 46,
      category: "reactions",
      accent: "teal",
      eyebrow: "New sparks",
      title: `${plural(sparks.length, "spark")} landed`,
      detail: trunc(sparks[0].message),
      actionLabel: "See who",
      href: sparks[0].href || "/notifications",
      clause: `${plural(sparks.length, "new spark")} landed`,
    });
  }

  const follows = notifs.filter((n) => n.type === "follow" && !n.read);
  if (follows.length) {
    items.push({
      key: "follows",
      heat: 42,
      category: "new-readers",
      accent: "lavender",
      eyebrow: "New readers",
      title: `${plural(follows.length, "new reader")}`,
      detail: trunc(follows[0].message),
      actionLabel: "Say hello",
      href: follows[0].href || "/notifications",
      clause: `${plural(follows.length, "new reader")} found you`,
    });
  }

  if (activeStory && activeStory.writingMode !== "campaign") {
    const days = daysSince(activeStory.updatedAt);
    const ch = activeStory.chapterCount > 0 ? `Chapter ${activeStory.chapterCount}` : "Chapter 1";
    items.push({
      key: `resume-${activeStory.id}`,
      heat: 55 - Math.min(days, 8),
      category: "resume",
      accent: "copper",
      eyebrow: "Your desk",
      title: activeStory.title,
      detail: `${ch} · ${(activeStory.totalWords || 0).toLocaleString()} words${days > 0 ? ` · edited ${days}d ago` : " · edited today"}`,
      actionLabel: "Resume writing",
      href: activeHref,
      clause: `*${activeStory.title}* is where you left it`,
    });
  }

  for (const s of allStories.slice(0, 10)) {
    if (s.id === activeStory?.id) continue;
    if (s.writingMode === "campaign") continue;
    const days = daysSince(s.updatedAt);
    if (s.status === "draft" && days >= 4) {
      items.push({
        key: `cold-${s.id}`,
        heat: 34 - Math.min(days, 20) * 0.4,
        category: "cold-draft",
        accent: "lavender",
        eyebrow: `Cold · ${days}d`,
        title: s.title,
        detail: `${(s.totalWords || 0).toLocaleString()} words, untouched`,
        actionLabel: "Warm it up",
        href: storyHref(s),
        clause: `*${s.title}* has gone quiet for ${days} days`,
      });
    }
  }

  return items.sort((a, b) => b.heat - a.heat);
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const capFirst = (c: string) =>
  c.startsWith("*") ? "*" + c[1].toUpperCase() + c.slice(2) : c[0].toUpperCase() + c.slice(1);

// Tolerant *emphasis* renderer — handles a half-typed, still-open marker so the
// typewriter never flickers mid-word.
function renderMarked(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let emph = false;
  let buf = "";
  let k = 0;
  const flush = () => {
    if (!buf) return;
    out.push(
      emph ? (
        <span key={k++} className="text-paper">
          {buf}
        </span>
      ) : (
        <span key={k++}>{buf}</span>
      ),
    );
    buf = "";
  };
  for (const ch of text) {
    if (ch === "*") {
      flush();
      emph = !emph;
    } else buf += ch;
  }
  flush();
  return out;
}

export default function BriefDashboardMockup() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const data = useDashboardData(POLL_MS);
  const { loaded, error, allStories } = data;
  const firstName = session?.user?.name?.split(" ")[0];

  const [nowLabel, setNowLabel] = useState("");
  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date());
    setNowLabel(fmt());
    const id = setInterval(() => setNowLabel(fmt()), 30_000);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(() => (loaded && !error ? buildLiveItems(data) : []), [loaded, error, data]);
  const top = items[0] ?? null;
  // always-on substance: a glance at the whole body of work, regardless of heat
  const glance = useMemo(() => {
    const works = allStories.length;
    const words = allStories.reduce((a, s) => a + (s.totalWords || 0), 0);
    const chapters = allStories.reduce((a, s) => a + (s.chapterCount || 0), 0);
    const sparks = allStories.reduce((a, s) => a + (s.sparkCount || 0), 0);
    return [
      [works.toString(), works === 1 ? "work" : "works"],
      [words.toLocaleString(), "words"],
      [chapters.toString(), "chapters"],
      [sparks.toString(), "sparks"],
    ] as const;
  }, [allStories]);
  const isEmpty = loaded && !error && allStories.length === 0;
  const tint = top ? ACCENT_RGB[top.accent] : "224,164,88";
  const urgent = !!top && top.heat >= 70;

  // ── the brief sentence (string with *emphasis* markers) ─────────────────────
  const briefText = useMemo(() => {
    if (!loaded || error) return "";
    const g = `${greeting()}${firstName ? `, ${firstName}` : ""}.`;
    if (isEmpty) return `${g} The studio is quiet and the page is blank — and that's the best kind of beginning. *Start something.*`;
    const clauses = items.slice(0, 3).map((i) => i.clause);
    if (clauses.length === 0) return `${g} It's all quiet across the realm.`;
    const caps = clauses.map((c, i) => (i === 0 ? capFirst(c) : c));
    const body =
      caps.length === 1
        ? caps[0]
        : `${caps.slice(0, -1).join(", ")}, and ${caps[caps.length - 1]}`;
    return `${g} ${body}.`;
  }, [loaded, error, isEmpty, firstName, items]);

  // ── typewriter: the studio pens the brief in real time ──────────────────────
  const [typed, setTyped] = useState("");
  const [penDone, setPenDone] = useState(false);
  useEffect(() => {
    if (!briefText) return;
    if (reduce) {
      setTyped(briefText);
      setPenDone(true);
      return;
    }
    setTyped("");
    setPenDone(false);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(briefText.slice(0, i));
      if (i >= briefText.length) {
        window.clearInterval(id);
        setPenDone(true);
      }
    }, 17);
    return () => window.clearInterval(id);
  }, [briefText, reduce]);

  // ── cursor-drift on the room glow (no re-render; writes CSS vars) ────────────
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduce) return;
    const el = glowRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dx = (e.clientX / window.innerWidth - 0.5) * 14;
        const dy = (e.clientY / window.innerHeight - 0.5) * 8;
        el.style.setProperty("--gx", `${50 + dx}%`);
        el.style.setProperty("--gy", `${-8 + dy}%`);
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      {/* the room breathes; faster heartbeat when something urgent waits */}
      <motion.div
        aria-hidden
        ref={glowRef}
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[460px]"
        animate={reduce ? { opacity: loaded ? 1 : 0.4 } : { opacity: loaded ? [0.7, 1, 0.7] : 0.4 }}
        transition={reduce ? { duration: 1 } : { duration: urgent ? 3.2 : 6.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(120% 90% at var(--gx,50%) var(--gy,-8%), rgba(${tint},0.18), rgba(${tint},0.04) 38%, transparent 70%)`,
        }}
      />
      <AmbientField tint={tint} reduce={reduce} />

      <div className="mx-auto max-w-3xl px-6 pb-24 pt-20">
        <header className="flex items-center justify-between">
          <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest">Concepts</span>
          </Link>
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-ghost">
            {loaded && !error && (
              <motion.span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `rgb(${tint})` }}
                animate={reduce ? {} : { opacity: [0.3, 1, 0.3] }}
                transition={{ duration: urgent ? 1.6 : 3, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            {nowLabel}
          </span>
        </header>

        {/* ─────────────── LAYER 1 — THE BRIEF ─────────────── */}
        <section className="mt-12">
          {!loaded ? (
            <div className="space-y-3">
              <div className="h-8 w-2/3 animate-pulse rounded bg-elevated/60" />
              <div className="h-8 w-5/6 animate-pulse rounded bg-elevated/50" />
              <div className="h-8 w-1/2 animate-pulse rounded bg-elevated/40" />
            </div>
          ) : error ? (
            <p className="font-reading text-2xl italic text-text-secondary">The studio is dark — the brief couldn&apos;t be gathered. Try again in a moment.</p>
          ) : (
            <h1
              className="font-reading text-[28px] font-light leading-[1.45] tracking-tight text-text-secondary sm:text-[34px] sm:leading-[1.45]"
              style={{ textShadow: `0 0 60px rgba(${tint},0.08)` }}
            >
              {renderMarked(typed)}
              {!penDone && !reduce && (
                <motion.span
                  aria-hidden
                  className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em]"
                  style={{ backgroundColor: `rgb(${tint})` }}
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
              )}
            </h1>
          )}

          {/* the ONE pre-picked action — waits for the pen to finish */}
          <AnimatePresence>
            {loaded && !error && penDone && (top || isEmpty) && (
              <motion.div
                key="action"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <Link
                  href={isEmpty ? "/create" : top!.href}
                  className="group inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-[15px] font-semibold text-void transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: `rgb(${tint})` }}
                >
                  {isEmpty ? <Compass className="h-[18px] w-[18px]" /> : itemIcon(top!.category, 18)}
                  {isEmpty ? "Start your first story" : top!.actionLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {!isEmpty && top && (
                  <span className="font-mono text-[11px] uppercase tracking-widest text-text-ghost">
                    {top.eyebrow} · {top.title}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* at a glance — always present, so a quiet day still has substance */}
          {loaded && !error && penDone && !isEmpty && (
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-wide text-text-ghost"
            >
              {glance.map(([n, l], i) => (
                <span key={l} className="flex items-center gap-3">
                  {i > 0 && <span className="text-border">·</span>}
                  <span>
                    <span className="text-text-secondary">{n}</span> {l}
                  </span>
                </span>
              ))}
            </motion.div>
          )}
        </section>

        {/* ─────────────── LAYER 2 — WHAT'S ALIVE (self-reordering) ─────────────── */}
        <AnimatePresence>
          {loaded && !error && penDone && items.length > 1 && (
            <motion.section
              key="alive"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-14"
            >
              <div className="mb-4 flex items-center gap-2.5">
                <Flame className="h-3.5 w-3.5 text-amber/70" />
                <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary">What&apos;s alive</h2>
                <span className="h-px flex-1 bg-border-subtle" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">ranked by heat</span>
              </div>
              <ul className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {items.slice(1).map((it, i) => (
                    <LiveRow key={it.key} item={it} index={i} reduce={reduce} />
                  ))}
                </AnimatePresence>
              </ul>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ─────────────── LAYER 3 — THE QUIET BAND ─────────────── */}
        <AnimatePresence>
          {loaded && !error && penDone && !isEmpty && (
            <motion.section
              key="quiet"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-16"
            >
              <div className="mb-4 text-center font-reading text-sm italic text-text-ghost">— when you&apos;re ready —</div>
              {allStories.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost">Your shelf</p>
                  <div className="flex flex-wrap gap-2">
                    {allStories.slice(0, 10).map((s) => (
                      <Link
                        key={s.id}
                        href={storyHref(s)}
                        className="inline-flex items-baseline gap-1.5 rounded-full border border-border-subtle bg-surface/40 px-3 py-1 text-[12.5px] text-text-secondary transition-colors hover:border-border hover:text-paper"
                      >
                        {s.title}
                        <span className="font-mono text-[10px] text-text-ghost">{(s.totalWords || 0).toLocaleString()}w</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <QuietTile href="/read" label="Keep reading" sub="your feed" />
                <QuietTile href="/browse" label="Discover" sub="something new" />
                <QuietTile href="/jams" label="Story jams" sub="join a challenge" icon={<Trophy size={13} />} />
                <QuietTile href="/creator/earnings" label="Earnings" sub="your pulse" />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function itemIcon(cat: Category, size = 16) {
  const Icon = ICONS[cat];
  return <Icon size={size} />;
}

// deterministic [0,1) for a seed — keeps SSR/client mote layout identical
const arand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

// Ambient body life: a faint paper grain + slow dust motes drifting through the
// studio light. Tinted partly by the current state so the room stays cohesive.
function AmbientField({ tint, reduce }: { tint: string; reduce: boolean | null }) {
  const motes = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: arand(i + 1) * 100,
        top: 18 + arand(i + 7) * 78,
        size: 1 + arand(i + 3) * 2.4,
        dur: 15 + arand(i + 5) * 16,
        delay: arand(i + 11) * 12,
        sway: (arand(i + 13) - 0.5) * 44,
        warm: arand(i + 17) > 0.5,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full opacity-[0.04] mix-blend-screen">
        <filter id="brief-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#brief-grain)" />
      </svg>
      {motes.map((m) => (
        <motion.span
          key={m.id}
          className="absolute rounded-full"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            width: m.size,
            height: m.size,
            backgroundColor: m.warm ? `rgba(${tint},0.6)` : "rgba(237,232,216,0.5)",
          }}
          animate={reduce ? { opacity: 0.16 } : { y: [0, -70 - m.sway, 0], x: [0, m.sway, 0], opacity: [0, 0.5, 0] }}
          transition={reduce ? { duration: 0 } : { duration: m.dur, delay: m.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function LiveRow({ item, index, reduce }: { item: LiveItem; index: number; reduce: boolean | null }) {
  const rgb = ACCENT_RGB[item.accent];
  const hot = item.heat >= 70;
  return (
    <motion.li
      layout
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ layout: { type: "spring", stiffness: 520, damping: 40 }, delay: reduce ? 0 : 0.04 * index, duration: 0.4 }}
    >
      <motion.div
        animate={reduce ? {} : { y: [0, -2.5, 0] }}
        transition={reduce ? {} : { duration: 7 + (index % 4) * 1.4, repeat: Infinity, ease: "easeInOut", delay: (index % 5) * 0.7 }}
      >
      <Link
        href={item.href}
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border-subtle bg-surface/60 py-4 pl-5 pr-4 transition-all hover:border-transparent hover:bg-surface"
      >
        {/* heat spine — brighter the hotter; breathing while hot */}
        <motion.span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: `rgba(${rgb},${0.35 + Math.min(item.heat, 100) / 200})` }}
          animate={hot && !reduce ? { opacity: [0.55, 1, 0.55] } : { opacity: 1 }}
          transition={hot && !reduce ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
        />
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `rgba(${rgb},0.12)`, color: `rgb(${rgb})` }}
        >
          {itemIcon(item.category, 17)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: `rgb(${rgb})` }}>
            {hot && (
              <motion.span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `rgb(${rgb})` }}
                animate={reduce ? {} : { opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            {item.eyebrow}
          </span>
          <span className="mt-0.5 block truncate font-display text-[17px] text-paper">{item.title}</span>
          <span className="mt-0.5 block truncate text-[12.5px] text-text-secondary">{item.detail}</span>
        </span>
        <span
          className="shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors group-hover:text-void"
          style={{ borderColor: `rgba(${rgb},0.3)`, color: `rgb(${rgb})` }}
        >
          {item.actionLabel}
        </span>
      </Link>
      </motion.div>
    </motion.li>
  );
}

function QuietTile({ href, label, sub, icon }: { href: string; label: string; sub: string; icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border-subtle bg-surface/40 px-4 py-3 transition-colors hover:border-border hover:bg-surface/70"
    >
      <span className="flex items-center gap-1.5 text-[13px] text-text-secondary">
        {icon}
        {label}
      </span>
      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-text-ghost">{sub}</span>
    </Link>
  );
}
