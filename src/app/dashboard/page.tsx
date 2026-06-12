"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  useStudioData,
  storyHref,
  readingHref,
  type DiscoverData,
  type StudioManuscript,
} from "@/components/dashboard/useStudioData";
import {
  CoverArt,
  Sparkline,
  PhaseClock,
  phaseInfo,
  PHASES,
  CLOCK_FALLBACK,
  ScenesRail,
  genrePalette,
  paletteFor,
} from "@/components/dashboard/studio-kit";
import FirstRunPanel from "@/components/dashboard/FirstRunPanel";
import { CocoaCup, SparkleFauna } from "@/components/dashboard/cozy";
import ArrivalOverlay from "@/components/dashboard/ArrivalOverlay";
import { Grain, Motes } from "@/components/shared/Atmosphere";
import { consumeArrival, type ArrivalKind } from "@/lib/arrival";
import { formatTimeAgo } from "@/lib/format";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// The Studio — the homepage film's standing act. Same narrator, same craft:
// nothing invented, everything quoted. The greeting scales to your absence,
// the hero is your own manuscript rendered as a luminous page — quoted
// exactly where the ink stopped, leaning toward your hand — and everything
// below is typography and light, never boxes. (Earlier versions in git
// history; the card-based banner dashboard died 2026-06-12.)
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 60_000;
const FIRST_RUN_DISMISSED_KEY = "quiloria-firstrun-dismissed";
const LAST_SEEN_KEY = "quiloria-last-seen";
const ROSE = "184,105,122";
const GOLD = "224,169,62";
const AMETHYST = "168,140,200";
const AMBER = "224,164,88";
const SAGE = "124,160,116";
/** iron-gall gold — the ink that reads on paper */
const INK_GOLD = "178,132,50";

// ── the narrator's greeting, scaled to how long you were gone ──
function absenceLine(away: number | "first"): string {
  if (away === "first") return "The lamps are lit. The ink is warm.";
  const hours = away / 3_600_000;
  const days = Math.floor(hours / 24);
  if (hours < 6) return "Back already — the ink hasn't dried.";
  if (days < 1) return "Back again. The lamp never went out.";
  if (days === 1) return "A day away. The desk kept your place.";
  if (days < 7) return `${days} days away. Everything is where you left it.`;
  if (days < 30) return `${days} days. Nothing here forgot you.`;
  return `${days} days. Your stories waited — every word in its place.`;
}

// ── shared film grammar ──────────────────────────────────────

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <h2 className="font-body text-[10px] uppercase tracking-[0.32em] text-gold/80">{children}</h2>
      <motion.span
        aria-hidden
        className="h-px flex-1 origin-left self-center bg-gradient-to-r from-gold/25 to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
      {right && <span className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">{right}</span>}
    </div>
  );
}

// a narrator line, inking in word by word (the film's beat treatment)
function NarratorLine({ text, reduce }: { text: string; reduce: boolean | null }) {
  return (
    <p className="font-display text-3xl font-medium italic leading-tight text-paper sm:text-4xl md:text-[2.6rem]">
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block whitespace-pre"
          initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: 0.2 + i * 0.07, ease: "easeOut" }}
        >
          {word}{" "}
        </motion.span>
      ))}
    </p>
  );
}

// words that write themselves when the reader's eye arrives
function InkWords({ text, className, reduce }: { text: string; className: string; reduce: boolean | null }) {
  if (reduce) return <p className={className}>{text}</p>;
  return (
    <motion.p
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: 0.022 } } }}
    >
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block whitespace-pre"
          variants={{
            hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
            show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: "easeOut" } },
          }}
        >
          {word}{" "}
        </motion.span>
      ))}
    </motion.p>
  );
}

// the wet-ink mote — the cursor where the writing stopped (void variant)
function InkMote({ rgb = GOLD, reduce }: { rgb?: string; reduce: boolean | null }) {
  return (
    <motion.span
      aria-hidden
      className="ml-2 inline-block h-2 w-2 translate-y-[-2px] rounded-full align-middle"
      style={{ backgroundColor: `rgb(${rgb})`, boxShadow: `0 0 12px 3px rgba(${rgb},0.55)` }}
      animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// the same mote on paper — but first, the brand's Ink Drop falls onto the
// exact spot where the writing stopped, splashes, and stays wet
function PaperMote({ reduce }: { reduce: boolean | null }) {
  if (reduce) {
    return (
      <span
        aria-hidden
        className="ml-1.5 inline-block h-2 w-2 translate-y-[-1px] rounded-full align-middle"
        style={{ backgroundColor: `rgb(${INK_GOLD})`, boxShadow: `0 0 8px 2px rgba(${INK_GOLD},0.4)` }}
      />
    );
  }
  return (
    <span aria-hidden className="relative ml-1.5 inline-block h-2.5 w-2.5 translate-y-[1px] align-baseline">
      {/* the falling drop */}
      <motion.svg
        viewBox="0 0 10 14"
        className="absolute bottom-[1px] left-1/2 w-[9px] -translate-x-1/2"
        initial={{ y: -72, opacity: 0 }}
        animate={{ y: 0, opacity: [0, 1, 1, 0] }}
        transition={{ delay: 1.7, duration: 0.38, ease: "easeIn", opacity: { delay: 1.7, duration: 0.38, times: [0, 0.2, 0.92, 1] } }}
      >
        <path d="M5 0 C5 0 0.5 6.2 0.5 9.2 a4.5 4.5 0 0 0 9 0 C9.5 6.2 5 0 5 0 Z" fill={`rgb(${INK_GOLD})`} />
      </motion.svg>
      {/* the splash where it lands */}
      <motion.span
        className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ borderColor: `rgba(${INK_GOLD},0.7)` }}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: [0, 0.85, 0], scale: [0.2, 1.6, 2.3] }}
        transition={{ delay: 2.04, duration: 0.5, ease: "easeOut" }}
      />
      {/* the wet mote it leaves behind */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: `rgb(${INK_GOLD})`, boxShadow: `0 0 10px 2px rgba(${INK_GOLD},0.5)` }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.02, duration: 0.25 }}
      >
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: `rgb(${INK_GOLD})` }}
          animate={{ opacity: [0, 0.0, 1, 0.4, 1] }}
          transition={{ delay: 2.4, duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.span>
    </span>
  );
}

// a gold rule that draws itself beneath the hero, like the film's underline
function InkRule({ rgb = GOLD, reduce }: { rgb?: string; reduce: boolean | null }) {
  return (
    <motion.div
      aria-hidden
      className="mt-6 h-px w-44 origin-left md:w-56"
      style={{ background: `linear-gradient(to right, rgba(${rgb},0.7), transparent)` }}
      initial={reduce ? false : { scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.6, ease: "easeOut" }}
    />
  );
}

function HeroMeta({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 text-[11px] uppercase tracking-[0.22em] leading-relaxed text-text-secondary">{children}</p>;
}

function HeroCta({ href, color, children }: { href: string; color: "gold" | "rose" | "amethyst"; children: React.ReactNode }) {
  const cls =
    color === "gold"
      ? "text-gold-light hover:text-gold"
      : color === "rose"
        ? "text-rose hover:text-paper"
        : "text-amethyst hover:text-paper";
  return (
    <Link href={href} className={`group mt-6 inline-block font-display text-lg italic transition-colors md:text-xl ${cls}`}>
      {children}
      <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

// ── the lamp follows your hand across the desk ──
function CursorLamp({ reduce }: { reduce: boolean | null }) {
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const sx = useSpring(x, { stiffness: 55, damping: 18 });
  const sy = useSpring(y, { stiffness: 55, damping: 18 });
  const glow = useMotionTemplate`radial-gradient(540px circle at ${sx}px ${sy}px, rgba(${GOLD},0.05), transparent 70%)`;

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [x, y]);

  if (reduce) return null;
  return <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[2]" style={{ background: glow }} />;
}

// the page leans toward your hand, like paper about to be picked up
function LeanPaper({ children, reduce }: { children: React.ReactNode; reduce: boolean | null }) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [4, -4]), { stiffness: 130, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-4.5, 4.5]), { stiffness: 130, damping: 18 });
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

// ── the Hemingway bridge — marginalia written on the page itself ──
// Local to this device for now; the editor will learn to ask on the way out.
function BridgeNote({ chapterId }: { chapterId: string }) {
  const key = `quiloria-bridge-${chapterId}`;
  const [note, setNote] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNote(localStorage.getItem(key) ?? "");
    } catch {}
  }, [key]);
  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  const save = () => {
    const text = draft.trim();
    setNote(text);
    setEditing(false);
    try {
      if (text) localStorage.setItem(key, text);
      else localStorage.removeItem(key);
    } catch {}
  };

  if (editing) {
    return (
      <div className="mt-7">
        <label className="mb-1 block text-[9px] uppercase tracking-[0.26em] text-on-gold/45">for tomorrow —</label>
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") setEditing(false);
          }}
          rows={2}
          placeholder="Where were you headed? One line is enough."
          className="w-full resize-none border-0 border-b border-on-gold/25 bg-transparent px-0 py-1 font-reading text-[14px] italic leading-relaxed text-on-gold caret-gold-dark outline-none transition-colors placeholder:not-italic placeholder:text-on-gold/30 focus:border-gold-dark"
        />
      </div>
    );
  }

  if (note) {
    return (
      <div className="mt-7">
        <p className="text-[9px] uppercase tracking-[0.26em] text-on-gold/45">for tomorrow —</p>
        <p className="mt-1 font-reading text-[14px] italic leading-relaxed text-on-gold/85">{note}</p>
        <button
          onClick={() => {
            setDraft(note);
            setEditing(true);
          }}
          className="mt-1 text-[10.5px] text-on-gold/40 transition-colors hover:text-on-gold/70"
        >
          rewrite
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft("");
        setEditing(true);
      }}
      className="mt-7 block font-reading text-[12.5px] italic text-on-gold/40 transition-colors hover:text-on-gold/75"
    >
      + a line for tomorrow-you
    </button>
  );
}

// ── ledger row (Act V grammar) — shared by asks and arrivals ──
function LedgerRow({
  href,
  accent,
  title,
  sub,
  meta,
  idx = 0,
  reduce,
}: {
  href: string;
  accent: string;
  title: string;
  sub?: string | null;
  meta?: string;
  idx?: number;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.55, delay: idx * 0.07, ease: "easeOut" }}
    >
      <Link
        href={href}
        className="group/row flex flex-col gap-1 border-b border-border px-2 py-4 transition-colors duration-300 first:border-t hover:bg-paper/[0.02] md:flex-row md:items-baseline md:gap-6 md:px-4"
      >
        <span className="flex min-w-0 items-baseline gap-3 md:w-72 md:shrink-0">
          <span
            className="h-1 w-1 shrink-0 translate-y-[-2px] rounded-full transition-shadow duration-300 group-hover/row:shadow-[0_0_8px_2px_rgba(224,169,62,0.4)]"
            style={{ backgroundColor: `rgb(${accent})` }}
            aria-hidden
          />
          <span className="truncate font-display text-[16px] text-paper transition-colors duration-300 group-hover/row:text-gold-light">{title}</span>
        </span>
        {sub && <span className="min-w-0 flex-1 truncate text-[13px] leading-relaxed text-text-secondary">{sub}</span>}
        {meta && <span className="shrink-0 font-mono text-[10px] tracking-wide text-text-ghost md:text-right">{meta}</span>}
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const { loaded, error, allStories, activeStory, activeHref, liveCampaigns, signals, discover } = useStudioData(POLL_MS);
  const userId = session?.user?.id;
  const firstName = session?.user?.name?.split(" ")[0];

  // First-run onboarding panel — shown to brand-new users until dismissed.
  // Lazy localStorage read is SSR-safe; the panel only renders after `loaded`.
  const [firstRunDismissed, setFirstRunDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(FIRST_RUN_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const dismissFirstRun = () => {
    setFirstRunDismissed(true);
    try {
      localStorage.setItem(FIRST_RUN_DISMISSED_KEY, "1");
    } catch {}
  };

  // The Arrival — the homepage film's final beat, played once per sign-in.
  const [arrival, setArrival] = useState<ArrivalKind | null>(null);
  useEffect(() => {
    const kind = consumeArrival();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (kind) setArrival(kind);
  }, []);

  // How long the desk sat untouched — measured once per landing.
  const [away, setAway] = useState<number | "first" | undefined>(undefined);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_SEEN_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAway(raw ? Math.max(0, Date.now() - Number(raw)) : "first");
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    } catch {
      setAway("first");
    }
  }, []);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const clockNow = now ?? CLOCK_FALLBACK;
  const phaseKey = phaseInfo(clockNow).key;
  const phase = PHASES[phaseKey];

  // counts arrive as strings from SQL sums — coerce or the reduce concatenates
  const totalWords = allStories.reduce((a, s) => a + Number(s.totalWords || 0), 0);
  const totalSparks = allStories.reduce((a, s) => a + Number(s.sparkCount || 0), 0);
  const hasTrend = signals.wordsTrend.length > 1 && signals.wordsTrend.some((n) => n > 0);

  // ── the hero: one protagonist, picked by heat — never a toggle ──
  const liveTable = liveCampaigns.find((c) => c.activeSession);
  const isWriter = allStories.length > 0;
  const hero: "table" | "manuscript" | "blank" | "bookmark" | null = liveTable
    ? "table"
    : signals.manuscript
      ? "manuscript"
      : isWriter
        ? "blank"
        : signals.continueReading
          ? "bookmark"
          : null;

  const manuscriptStory = signals.manuscript ? allStories.find((s) => s.id === signals.manuscript!.storyId) : undefined;
  const manuscriptHref = manuscriptStory ? storyHref(manuscriptStory) : activeHref;

  // ── while you were away: gifts, all of them real ──
  const tally: string[] = [];
  if (signals.sparksWeek > 0) tally.push(`✶ ${signals.sparksWeek} spark${signals.sparksWeek === 1 ? "" : "s"} landed on your pages`);
  if (signals.newFollowersWeek > 0) tally.push(`${signals.newFollowersWeek} reader${signals.newFollowersWeek === 1 ? " now follows" : "s now follow"} your work`);
  if (signals.dropsWeek > 0) tally.push(`${signals.dropsWeek.toLocaleString()} drops of ink fell into your well`);
  const hasGifts = signals.readerNotes.length > 0 || tally.length > 0;
  const hasAsks = signals.suggestions.count > 0 || signals.commissions.count > 0;

  function chipFor(s: ApiStory): { label: string; rgb: string } {
    if (s.writingMode === "campaign") {
      const c = liveCampaigns.find((x) => x.id === s.id);
      return c?.activeSession ? { label: "Live", rgb: ROSE } : { label: "Campaign", rgb: SAGE };
    }
    if (s.status === "draft") return { label: "Draft", rgb: AMBER };
    if (s.format === "webtoon") return { label: "Webtoon", rgb: "154,122,208" };
    return { label: "Writing", rgb: "208,136,88" };
  }

  const cr = signals.continueReading;

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      {arrival && <ArrivalOverlay kind={arrival} onDone={() => setArrival(null)} />}
      {/* the film's ambience follows you into the studio — quieter here */}
      <Motes count={12} opacityScale={0.55} zClass="z-[1]" />
      <Grain opacityClass="opacity-[0.03]" zClass="z-[40]" />
      <CursorLamp reduce={reduce} />
      {/* the standing lamp — time of day is the light, never the content */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: `radial-gradient(58% 95% at 50% 0%, rgba(${phase.rgb},0.1), transparent 70%)` }}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      />
      {/* ink-spirits drifting in the margins — the film's creatures, at home */}
      <SparkleFauna />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <span className="font-display text-lg text-paper">{firstName ? `${firstName}'s Studio` : "Your Studio"}</span>
          {now && <PhaseClock now={now} />}
        </header>

        {/* ── THE GREETING · the narrator knows how long you were gone ── */}
        {away !== undefined && (
          <section className="mt-12">
            <motion.p
              className="mb-3 font-body text-[10px] uppercase text-gold/80"
              initial={reduce ? false : { opacity: 0, letterSpacing: "0.7em" }}
              animate={{ opacity: 1, letterSpacing: "0.34em" }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            >
              {phase.label} · {phase.mood}
            </motion.p>
            <NarratorLine text={absenceLine(away)} reduce={reduce} />
          </section>
        )}

        {!loaded ? (
          <div className="mt-12 space-y-4">
            <div className="h-7 w-2/3 animate-pulse rounded bg-elevated/50" />
            <div className="h-7 w-1/2 animate-pulse rounded bg-elevated/50" />
            <div className="mt-10 h-72 max-w-2xl animate-pulse rounded-[6px] bg-elevated/40" />
          </div>
        ) : error && allStories.length === 0 ? (
          <p className="mt-12 font-reading text-2xl italic text-text-secondary">The studio is dark right now — try again in a moment.</p>
        ) : hero === null ? (
          // a truly empty studio — first night
          !firstRunDismissed ? (
            <div className="mt-10">
              <FirstRunPanel firstName={firstName} onDismiss={dismissFirstRun} />
            </div>
          ) : (
            <Link href="/create" className="group mt-12 block max-w-2xl">
              <p className="font-reading text-2xl italic leading-relaxed text-text-secondary md:text-[1.7rem]">
                The first page is still blank. It won&apos;t stay that way for long.
              </p>
              <span className="mt-5 inline-block font-display text-lg italic text-gold-light transition-colors group-hover:text-gold md:text-xl">
                write the first line<span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          )
        ) : (
          <>
            {/* ── THE HERO · re-entry in five seconds ── */}
            <section className="relative mt-12">
              {hero === "table" && liveTable && (
                <div className="relative">
                  <SectionLabel>The table · a session is live</SectionLabel>
                  <motion.p
                    className="max-w-3xl font-display text-2xl font-medium italic leading-snug text-paper sm:text-3xl md:text-[2.1rem]"
                    initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    {userId && liveTable.activeSession!.activePlayerId === userId
                      ? "The table has gone quiet. It waits on you."
                      : "The table is lit. The story is moving without you."}
                    <InkMote rgb={ROSE} reduce={reduce} />
                  </motion.p>
                  <InkRule rgb={ROSE} reduce={reduce} />
                  <HeroMeta>
                    <span className="text-paper">{liveTable.title}</span>
                    <span className="mx-2 text-text-ghost">·</span>
                    {liveTable.activeSession!.title}
                    <span className="mx-2 text-text-ghost">·</span>
                    {liveTable.playerCount} at the table
                  </HeroMeta>
                  <HeroCta href={`/campaign/${liveTable.id}/play/${liveTable.activeSession!.id}`} color="rose">
                    {userId && liveTable.activeSession!.activePlayerId === userId ? "it's your move" : "take your seat"}
                  </HeroCta>
                </div>
              )}

              {hero === "manuscript" && signals.manuscript && (
                <ManuscriptHero manuscript={signals.manuscript} href={manuscriptHref} reduce={reduce} />
              )}

              {hero === "blank" && activeStory && (
                <div className="relative">
                  <SectionLabel>The manuscript · the first page</SectionLabel>
                  <motion.p
                    className="max-w-3xl font-display text-2xl font-medium italic leading-snug text-paper sm:text-3xl md:text-[2.1rem]"
                    initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    {activeStory.title} is waiting for its first chapter.
                    <InkMote reduce={reduce} />
                  </motion.p>
                  <InkRule reduce={reduce} />
                  <HeroCta href={activeHref} color="gold">
                    write the first line
                  </HeroCta>
                </div>
              )}

              {hero === "bookmark" && cr && (
                <div className="relative">
                  <SectionLabel>Your bookmark · the ink kept your place</SectionLabel>
                  <motion.p
                    className="max-w-3xl font-display text-2xl font-medium italic leading-snug text-paper sm:text-3xl md:text-[2.1rem]"
                    initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    You left mid-chapter. The story waited.
                    <InkMote rgb={AMETHYST} reduce={reduce} />
                  </motion.p>
                  <InkRule rgb={AMETHYST} reduce={reduce} />
                  <HeroMeta>
                    <span className="text-paper">{cr.storyTitle}</span>
                    {cr.author && (
                      <>
                        <span className="mx-2 text-text-ghost">·</span>
                        {cr.author}
                      </>
                    )}
                    <span className="mx-2 text-text-ghost">·</span>
                    Chapter {cr.chapterNumber}
                    {cr.totalChapters ? ` of ${cr.totalChapters}` : ""}
                  </HeroMeta>
                  <div className="relative mt-4 h-[2px] w-full max-w-md overflow-hidden rounded-full bg-border">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: `rgb(${AMETHYST})` }}
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width: `${Math.max(2, Math.min(100, cr.scrollPercent))}%` }}
                      transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                    />
                  </div>
                  <HeroCta href={readingHref(cr)} color="amethyst">
                    step back in
                  </HeroCta>
                </div>
              )}
            </section>

            {/* ── WHILE YOU WERE AWAY · accrued gifts, everything quoted ── */}
            {hasGifts && (
              <section className="mt-20">
                <SectionLabel>While you were away</SectionLabel>
                {signals.readerNotes.map((n) => (
                  <Link
                    key={n.id}
                    href={n.slug ? `/story/${n.slug}/read/${n.chapterId}` : "/notifications"}
                    className="group block border-b border-border px-2 py-5 transition-colors duration-300 first:border-t hover:bg-paper/[0.02] md:px-4"
                  >
                    <InkWords
                      text={`“${n.content}”`}
                      className="max-w-3xl font-reading text-[16px] italic leading-relaxed text-text md:text-[17px]"
                      reduce={reduce}
                    />
                    <p className="mt-2.5 text-[11px] uppercase tracking-[0.18em] text-text-ghost">
                      <span className="text-text-secondary">{n.author ?? "A reader"}</span>
                      <span className="mx-2">·</span>on <span className="text-paper">{n.storyTitle}</span>
                      <span className="mx-2">·</span>
                      {formatTimeAgo(n.createdAt)}
                      <span className="ml-4 inline-block font-display text-[13px] normal-case italic tracking-normal text-gold-light opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        answer →
                      </span>
                    </p>
                  </Link>
                ))}
                {tally.length > 0 && (
                  <p className="mt-5 px-2 font-mono text-[11px] tracking-wide text-text-secondary md:px-4">
                    {tally.join("  ·  ")}
                    {signals.dropsWeek > 0 && (
                      <Link href="/creator/earnings" className="ml-4 text-gold/70 transition-colors hover:text-gold">
                        open the ledger →
                      </Link>
                    )}
                  </p>
                )}
              </section>
            )}

            {/* ── ON YOUR DESK · things waiting on your hand ── */}
            {hasAsks && (
              <section className="mt-20">
                <SectionLabel>On your desk</SectionLabel>
                {signals.suggestions.count > 0 && (
                  <LedgerRow
                    href={
                      signals.suggestions.latest?.storySlug
                        ? `/story/${signals.suggestions.latest.storySlug}/workshop?tab=suggestions`
                        : "/notifications"
                    }
                    accent="94,139,130"
                    title={`${signals.suggestions.count} suggestion${signals.suggestions.count === 1 ? "" : "s"} to review`}
                    sub={signals.suggestions.latest ? `latest on ${signals.suggestions.latest.storyTitle}` : "from your collaborators"}
                    meta={signals.suggestions.latest ? formatTimeAgo(signals.suggestions.latest.createdAt) : undefined}
                    idx={0}
                    reduce={reduce}
                  />
                )}
                {signals.commissions.count > 0 && (
                  <LedgerRow
                    href={signals.commissions.latest?.id ? `/scriptorium/commissions/${signals.commissions.latest.id}` : "/scriptorium"}
                    accent={ROSE}
                    title={`${signals.commissions.count} commission request${signals.commissions.count === 1 ? "" : "s"}`}
                    sub={
                      signals.commissions.latest
                        ? `${signals.commissions.latest.status === "accepted" ? "accepted — ready to start" : "awaiting your quote"}${signals.commissions.latest.patron ? ` · ${signals.commissions.latest.patron}` : ""}`
                        : "in the Scriptorium"
                    }
                    meta={signals.commissions.latest ? formatTimeAgo(signals.commissions.latest.createdAt) : undefined}
                    idx={1}
                    reduce={reduce}
                  />
                )}
              </section>
            )}

            {/* ── ARRIVALS · new pages from the worlds you follow ── */}
            {(signals.follows.length > 0 || (cr && hero !== "bookmark")) && (
              <section className="mt-20">
                <SectionLabel right="from worlds you follow">Arrivals</SectionLabel>
                {cr && hero !== "bookmark" && (
                  <LedgerRow
                    href={readingHref(cr)}
                    accent={AMETHYST}
                    title={cr.storyTitle}
                    sub={`your bookmark · chapter ${cr.chapterNumber}${cr.totalChapters ? ` of ${cr.totalChapters}` : ""} — step back in`}
                    meta="continue →"
                    idx={0}
                    reduce={reduce}
                  />
                )}
                {signals.follows.map((f, i) => (
                  <LedgerRow
                    key={`${f.storyId}-${f.createdAt}`}
                    href={f.slug ? `/story/${f.slug}` : "/read"}
                    accent={AMETHYST}
                    title={f.storyTitle}
                    sub={
                      f.kind === "chapter"
                        ? `${f.author ?? "the author"} posted “${f.title}”`
                        : `${f.author ?? "the author"} — ${f.title}`
                    }
                    meta={formatTimeAgo(f.createdAt)}
                    idx={i + (cr && hero !== "bookmark" ? 1 : 0)}
                    reduce={reduce}
                  />
                ))}
              </section>
            )}

            {/* ── THE SHELF · your works, standing where you can reach them ── */}
            {isWriter && (
              <section className="mt-20">
                <SectionLabel right={`${allStories.length} ${allStories.length === 1 ? "work" : "works"}`}>The shelf</SectionLabel>
                <ScenesRail>
                  {allStories.slice(0, 10).map((s, i) => {
                    const chip = chipFor(s);
                    return (
                      <div key={s.id} className="shrink-0 pt-2 [perspective:900px]">
                        <Link href={storyHref(s)} className="group/book block">
                          <motion.div
                            className="relative w-32 origin-bottom sm:w-36"
                            style={reduce ? undefined : { rotate: i % 3 === 0 ? -0.7 : i % 3 === 1 ? 0.5 : 0 }}
                            whileHover={reduce ? undefined : { y: -12, rotate: 0, rotateY: -10 }}
                            transition={{ type: "spring", stiffness: 260, damping: 19 }}
                          >
                            <CoverArt
                              seed={s.id}
                              title={s.title}
                              className="aspect-[3/4] rounded-[4px] shadow-book ring-1 ring-white/10"
                              titleSize="text-sm"
                              image={s.coverImageUrl}
                            />
                            {/* the book's bound edge */}
                            <div className="absolute inset-y-0 left-0 w-[7px] rounded-l-[4px] bg-gradient-to-r from-black/55 to-transparent" aria-hidden />
                            <span
                              className="absolute left-2.5 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black"
                              style={{ backgroundColor: `rgb(${chip.rgb})` }}
                            >
                              {chip.label}
                            </span>
                          </motion.div>
                          {/* where the book meets the shelf */}
                          <div className="mx-auto mt-1 h-2 w-4/5 rounded-[50%] blur-[5px]" style={{ backgroundColor: "var(--t-contact-shadow)" }} aria-hidden />
                          <div className="mt-1.5 flex w-32 items-center justify-between px-0.5 font-mono text-[10px] text-text-ghost sm:w-36">
                            <span>{s.chapterCount > 0 ? `${s.chapterCount} ch` : "draft"}</span>
                            <span>{Number(s.totalWords || 0).toLocaleString()}w</span>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                  {/* the empty slot at the end of the shelf */}
                  <div className="shrink-0 pt-2">
                    <Link
                      href="/create"
                      className="flex h-[10.7rem] w-14 items-center justify-center rounded-[4px] border border-dashed border-gold/30 transition-colors hover:border-gold/60 hover:bg-gold/[0.04] sm:h-[12rem]"
                    >
                      <span className="font-reading text-[12.5px] italic text-gold/70 [writing-mode:vertical-rl]">+ begin another</span>
                    </Link>
                  </div>
                </ScenesRail>
                {/* the shelf board */}
                <div className="mt-1 h-px w-full bg-gradient-to-r from-gold/25 via-gold/10 to-transparent" aria-hidden />
              </section>
            )}

            {/* ── THE DRAWER · momentum, engraved not boxed ── */}
            <section className="mt-20">
              <SectionLabel>The drawer</SectionLabel>
              <div className="flex flex-wrap items-end gap-x-14 gap-y-7 px-2 md:px-4">
                <div>
                  <p className="font-display text-3xl text-paper md:text-4xl">{totalWords.toLocaleString()}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">words on the shelf</p>
                  {hasTrend && (
                    <div className="mt-2 w-36">
                      <Sparkline data={signals.wordsTrend} color={GOLD} reduce={reduce} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-display text-3xl text-paper md:text-4xl">
                    {signals.readingStreak}
                    <span className="ml-2 font-reading text-lg italic text-text-secondary">{signals.readingStreak === 1 ? "day" : "days"}</span>
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                    {signals.readingStreak > 0 ? "reading streak — keep the chain" : "read today to start a streak"}
                  </p>
                </div>
                <div>
                  <p className="font-display text-3xl text-paper md:text-4xl">
                    <span className="mr-1.5 text-gold">✶</span>
                    {totalSparks.toLocaleString()}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                    {signals.sparksWeek > 0 ? `sparks · ${signals.sparksWeek} this week` : "sparks from readers"}
                  </p>
                </div>
              </div>
            </section>

            {/* ── THE STACKS · picked for you ── */}
            <StacksSection discover={discover} reduce={reduce} />
          </>
        )}
      </div>
    </div>
  );
}

// ── the manuscript hero — your own page, rendered as a luminous page ──
// The register/login manuscript-page grammar, holding your real prose:
// vellum out of the dark, iron-gall ink, the brand's drop falling onto the
// exact spot where the writing stopped. The page leans toward your hand.
function ManuscriptHero({ manuscript, href, reduce }: { manuscript: StudioManuscript; href: string; reduce: boolean | null }) {
  const hasInk = manuscript.lastLines.length > 0;
  return (
    <div className="relative">
      <SectionLabel>{hasInk ? "The manuscript · where the ink stopped" : "The manuscript · the page is open"}</SectionLabel>

      <motion.div
        className="relative max-w-2xl"
        initial={reduce ? false : { opacity: 0, y: 30, rotate: -2.2 }}
        animate={{ opacity: 1, y: 0, rotate: -0.6 }}
        transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* warm light pooling under the page */}
        <div
          aria-hidden
          className="absolute -inset-8 rounded-full"
          style={{ background: `radial-gradient(55% 60% at 50% 45%, rgba(${GOLD},0.13), transparent 70%)`, filter: "blur(6px)" }}
        />
        {/* the cocoa, still steaming on the desk beside the page */}
        <CocoaCup reduce={reduce} className="absolute -right-32 bottom-4 hidden w-[5.5rem] rotate-2 lg:block" />
        <LeanPaper reduce={reduce}>
          {/* quill-sheet: stays a light sheet in the Vellum theme, where
              bg-paper alone would resolve to ink and go near-black */}
          <div className="quill-sheet relative overflow-hidden rounded-[6px] bg-paper px-7 py-8 shadow-[0_40px_90px_rgba(0,0,0,0.65)] md:px-11 md:py-10">
            {/* lamplight falling across the sheet */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(120% 90% at 28% 0%, rgba(255,250,235,0.55), transparent 60%)" }}
            />
            <Link href={href} className="relative block">
              <p className="text-[9px] uppercase tracking-[0.3em] text-on-gold/45">Quiloria · {manuscript.storyTitle}</p>
              <p className="mt-1.5 font-display text-lg text-on-gold md:text-xl">
                Chapter {manuscript.chapterNumber}
                {manuscript.chapterTitle ? ` — ${manuscript.chapterTitle}` : ""}
              </p>
              <div className="mt-3 h-px w-24 bg-gradient-to-r from-on-gold/30 to-transparent" aria-hidden />
              {hasInk ? (
                <blockquote className="mt-6 font-reading text-[16.5px] leading-[1.85] text-on-gold md:text-[18px]">
                  {manuscript.lastLines}
                  <PaperMote reduce={reduce} />
                </blockquote>
              ) : (
                <div className="mt-6">
                  <p className="font-reading text-[16px] italic leading-relaxed text-on-gold/45">
                    Nothing here yet. The page is patient.
                    <PaperMote reduce={reduce} />
                  </p>
                  <div className="mt-7 space-y-7" aria-hidden>
                    <div className="h-px bg-on-gold/15" />
                    <div className="h-px bg-on-gold/15" />
                    <div className="h-px w-2/3 bg-on-gold/15" />
                  </div>
                </div>
              )}
            </Link>
            <BridgeNote chapterId={manuscript.chapterId} />
          </div>
        </LeanPaper>
      </motion.div>

      <HeroMeta>
        {manuscript.words.toLocaleString()} words
        <span className="mx-2 text-text-ghost">·</span>
        touched {formatTimeAgo(manuscript.updatedAt)}
      </HeroMeta>
      <HeroCta href={href} color="gold">
        {hasInk ? "write the next line" : "write the first line"}
      </HeroCta>
    </div>
  );
}

// ── the stacks — trending tales as spines, notices as ledger rows ──
function StacksSection({ discover, reduce }: { discover: DiscoverData; reduce: boolean | null }) {
  const has = discover.trending.length > 0 || discover.jam || discover.openCall;
  if (!has) return null;
  return (
    <section className="mt-20">
      <SectionLabel right="picked for you">The stacks</SectionLabel>

      {/* pinned notices */}
      {discover.jam && (
        <LedgerRow
          href={`/jams/${discover.jam.id}`}
          accent={AMBER}
          title={discover.jam.title}
          sub={discover.jam.theme}
          meta={discover.jam.liveStatus === "open" ? "jam · open now" : "jam · coming up"}
          idx={0}
          reduce={reduce}
        />
      )}
      {discover.openCall && (
        <LedgerRow
          href={discover.openCall.slug ? `/story/${discover.openCall.slug}/calls` : "/browse"}
          accent={SAGE}
          title={discover.openCall.title}
          sub={`on ${discover.openCall.storyTitle}`}
          meta={`seeking a ${discover.openCall.role}`}
          idx={1}
          reduce={reduce}
        />
      )}

      {/* the spines */}
      {discover.trending.length > 0 && (
        <div className={discover.jam || discover.openCall ? "mt-8" : ""}>
          <div className="flex items-end gap-2.5 overflow-x-auto px-2 pb-1 pt-2 [scrollbar-width:none] md:px-4 [&::-webkit-scrollbar]:hidden">
            {discover.trending.map((t, i) => {
              const p = genrePalette(t.genres[0]) ?? paletteFor(t.id);
              const lean = i % 4 === 0 ? -2 : i % 4 === 1 ? 1.4 : i % 4 === 2 ? -0.8 : 0.6;
              return (
                <Link key={t.id} href={t.slug ? `/story/${t.slug}` : "/browse"} className="group/spine block shrink-0 origin-bottom">
                  <motion.div
                    className="relative h-44 w-11 overflow-hidden rounded-[3px] shadow-book ring-1 ring-white/10 md:h-48"
                    style={{ background: `linear-gradient(170deg, ${p[0]}, ${p[1]} 55%, ${p[2]})`, rotate: reduce ? 0 : lean }}
                    whileHover={reduce ? undefined : { y: -9, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 20 }}
                  >
                    {/* the raised bands of a bound spine */}
                    <div className="absolute inset-x-0 top-2 h-px bg-white/25" aria-hidden />
                    <div className="absolute inset-x-0 top-3 h-px bg-black/25" aria-hidden />
                    <div className="absolute inset-x-0 bottom-7 h-px bg-white/15" aria-hidden />
                    <span className="absolute inset-x-0 top-5 bottom-8 mx-auto truncate font-display text-[12px] text-white/90 [writing-mode:vertical-rl]">
                      {t.title}
                    </span>
                    <span className="absolute inset-x-0 bottom-1.5 text-center font-mono text-[8px] text-white/70">✶{t.sparkCount}</span>
                  </motion.div>
                  <p className="mt-1.5 w-11 truncate text-center font-mono text-[8.5px] text-text-ghost opacity-0 transition-opacity duration-300 group-hover/spine:opacity-100">
                    {t.author ?? "Anon"}
                  </p>
                </Link>
              );
            })}
          </div>
          {/* the shelf they stand on */}
          <div className="h-px w-full max-w-md bg-gradient-to-r from-gold/20 via-gold/8 to-transparent" aria-hidden />
        </div>
      )}
    </section>
  );
}
