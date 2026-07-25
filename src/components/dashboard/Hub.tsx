"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { NarratorLine, SectionLabel } from "@/components/dashboard/film";
import {
  CLOCK_FALLBACK,
  CoverArt,
  PHASES,
  PhaseClock,
  Sparkline,
  phaseInfo,
} from "@/components/dashboard/studio-kit";
import BridgeNote from "@/components/dashboard/BridgeNote";
import FirstRunPanel from "@/components/dashboard/FirstRunPanel";
import ArrivalOverlay from "@/components/dashboard/ArrivalOverlay";
import { Grain, Motes } from "@/components/shared/Atmosphere";
import { consumeArrival, type ArrivalKind } from "@/lib/arrival";
import {
  dueLabel,
  dueMs,
  liveTables,
  myTurnTable,
  readingHref,
  storyHref,
  tableHref,
  type StudioViewModel,
} from "@/components/dashboard/beats/types";
import type { StudioShelfItem, StudioSnapshot } from "@/types/studio";

// ─────────────────────────────────────────────────────────────────────────────
// The Hub — the studio's data in a hub's geometry.
//
// Same narrator, same covers, same craft rule (nothing invented, everything
// quoted) — but the skeleton follows what every successful home surface
// shares: resume lives at the top in three fixed slots that never re-sort
// (urgency is emphasis, never position), then an event feed with named
// actors, the works grid, one stat strip. The atmosphere budget is the
// greeting and the phase lamp, spent once.
// ─────────────────────────────────────────────────────────────────────────────

const FIRST_RUN_DISMISSED_KEY = "quiloria-firstrun-dismissed";
/** how often the hub looks up while something is genuinely live */
const LIVE_POLL_MS = 25_000;
/** the turn clock and the phase light only need this much resolution */
const TICK_MS = 30_000;

// ── the narrator's greeting, scaled to how long you were gone ──
export function absenceLine(away: number | "first"): string {
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

/** Is anything at all moving? Only then does the hub watch the clock. */
function hasLiveThings(s: StudioSnapshot): boolean {
  return (
    s.tables.some((t) => t.status === "running") ||
    s.shelf.some((w) => w.activeSession) ||
    Boolean(s.signals.readersNow)
  );
}

type Accent = "rose" | "gold" | "amethyst" | "teal";

const ACCENT_VAR: Record<Accent, string> = {
  rose: "var(--t-accent-rose)",
  gold: "var(--t-accent-gold)",
  amethyst: "var(--t-accent-amethyst)",
  teal: "var(--t-accent-teal)",
};

interface ChairSlot {
  label: string;
  title: string;
  quote: string;
  cta: string;
  href: string;
  accent: Accent;
  coverSeed: string;
  coverImage?: string | null;
  dim?: boolean;
  live?: boolean;
}

interface FeedEvent {
  id: string;
  who: string;
  what: string;
  when: string;
  whenMs: number;
  accent: Accent;
  href: string;
  live?: boolean;
  action?: string;
  /** set when the actor is a work/table → cover thumb instead of initials */
  coverSeed?: string;
  coverImage?: string | null;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
/** keep the END of the line — for a manuscript, the closing words are the point */
const tailOf = (s: string, n: number) => (s.length > n ? `…${s.slice(-n).trimStart()}` : s);

function ago(iso: string, now: number): { label: string; ms: number } {
  const t = new Date(iso).getTime();
  const age = Math.max(0, now - t);
  const mins = age / 60_000;
  if (mins < 60) return { label: `${Math.max(1, Math.round(mins))}m ago`, ms: t };
  const hours = mins / 60;
  if (hours < 24) return { label: `${Math.round(hours)}h ago`, ms: t };
  const days = Math.round(hours / 24);
  return { label: days === 1 ? "yesterday" : `${days}d ago`, ms: t };
}

// ── building the chair from the snapshot ─────────────────────────────────────

function buildChair(vm: StudioViewModel): ChairSlot[] {
  const { snapshot } = vm;
  const m = snapshot.signals.manuscript;
  const shelfItem = m ? snapshot.shelf.find((s) => s.id === m.storyId) : undefined;
  const write: ChairSlot = m
    ? {
        label: "Write",
        title: `${m.storyTitle} · ch ${m.chapterNumber}`,
        quote: m.bridgeNote
          ? `you left a note: “${truncate(m.bridgeNote, 90)}”`
          : m.lastLines
            ? `“${tailOf(m.lastLines, 90)}”`
            : "pick up where the ink stopped",
        cta: "write the next line",
        href: shelfItem ? storyHref(shelfItem) : `/write/${m.storyId}`,
        accent: "gold",
        coverSeed: m.storyTitle,
        coverImage: shelfItem?.coverImageUrl,
      }
    : {
        label: "Write",
        title: "the first page",
        quote: "still blank — it won’t stay that way for long",
        cta: "begin",
        href: "/create",
        accent: "gold",
        coverSeed: "first-page",
        dim: true,
      };

  const c = snapshot.signals.continueReading;
  const read: ChairSlot = c
    ? {
        label: "Read",
        title: `${c.storyTitle} · ch ${c.chapterNumber}`,
        quote: `“${c.chapterTitle}” · chapter ${c.chapterNumber} of ${c.totalChapters}`,
        cta: "keep reading",
        href: readingHref(c),
        accent: "amethyst",
        coverSeed: c.storyTitle,
        coverImage: c.coverImageUrl,
      }
    : {
        label: "Read",
        title: "nothing on the nightstand",
        quote: "the library is open all night",
        cta: "find a story",
        href: "/library",
        accent: "amethyst",
        coverSeed: "nightstand",
        dim: true,
      };

  const turn = myTurnTable(vm);
  const live = liveTables(vm)[0];
  const casting = snapshot.tables.find((t) => t.status === "casting");
  const table: ChairSlot = turn
    ? {
        label: "Your turn",
        title: turn.title,
        quote: `the scene is yours — ${dueLabel(dueMs(turn, vm.now))}`,
        cta: "take your turn",
        href: tableHref(turn),
        accent: "rose",
        coverSeed: turn.title,
        live: true,
      }
    : live
      ? {
          label: "Your table",
          title: live.title,
          quote: live.writingNow
            ? `${live.writingNow} is writing right now`
            : live.spotlightName
              ? `${live.spotlightName} has the spotlight`
              : "the table is live",
          cta: live.mySeatId ? "sit down" : "watch",
          href: tableHref(live),
          accent: "rose",
          coverSeed: live.title,
          live: true,
        }
      : casting
        ? {
            label: "Your table",
            title: casting.title,
            quote: `casting — ${casting.openSeats} of ${casting.seatsTotal} seats open`,
            cta: "see the table",
            href: tableHref(casting),
            accent: "rose",
            coverSeed: casting.title,
          }
        : {
            label: "Your turn",
            title: "no table tonight",
            quote: "tables are casting on the board",
            cta: "find a table",
            href: "/adventures",
            accent: "rose",
            coverSeed: "the-board",
            dim: true,
          };

  return [write, read, table];
}

// ── building the feed from the snapshot ──────────────────────────────────────

function buildFeed(vm: StudioViewModel): FeedEvent[] {
  const { snapshot, now } = vm;
  const s = snapshot.signals;
  const events: FeedEvent[] = [];

  if (s.readersNow && s.readersNow.count > 0) {
    const n = s.readersNow.count;
    const item = snapshot.shelf.find((w) => w.title === s.readersNow?.storyTitle);
    events.push({
      id: "readers-now",
      who: `${n} reader${n === 1 ? "" : "s"}`,
      what: `${n === 1 ? "is" : "are"} inside ${s.readersNow.storyTitle ?? "your story"} right now`,
      when: "now",
      whenMs: now,
      accent: "gold",
      live: true,
      href: item?.slug ? `/story/${item.slug}` : "#",
    });
  }

  for (const t of snapshot.tables) {
    if (t.pendingApplications > 0) {
      events.push({
        id: `apps-${t.adventureId}`,
        who: t.title,
        what: `has ${t.pendingApplications} application${t.pendingApplications === 1 ? "" : "s"} for its open seats`,
        when: "waiting",
        whenMs: new Date(t.updatedAt).getTime(),
        accent: "rose",
        action: "review",
        href: tableHref(t),
        coverSeed: t.title,
      });
    }
  }

  for (const n of s.readerNotes.slice(0, 3)) {
    const { label, ms } = ago(n.createdAt, now);
    events.push({
      id: `note-${n.id}`,
      who: n.author ?? "A reader",
      what: `left a note on ${n.storyTitle}: “${truncate(n.content, 70)}”`,
      when: label,
      whenMs: ms,
      accent: "gold",
      action: "answer",
      href: n.slug ? `/story/${n.slug}/read/${n.chapterId}` : "#",
    });
  }

  if (s.suggestions.latest) {
    const sug = s.suggestions.latest;
    const { label, ms } = ago(sug.createdAt, now);
    events.push({
      id: "suggestion",
      who: "The audience",
      what: `sent a suggestion for ${sug.storyTitle}: “${truncate(sug.note, 70)}”`,
      when: label,
      whenMs: ms,
      accent: "rose",
      action: "review",
      href: sug.storySlug ? `/story/${sug.storySlug}` : "/adventures",
    });
  }

  for (const [i, f] of s.follows.entries()) {
    const { label, ms } = ago(f.createdAt, now);
    events.push({
      id: `follow-${i}`,
      who: f.author ?? f.storyTitle,
      what:
        f.kind === "chapter"
          ? `posted “${truncate(f.title, 60)}” — ${f.storyTitle}`
          : `wrote an update — “${truncate(f.title, 60)}”`,
      when: label,
      whenMs: ms,
      accent: f.kind === "chapter" ? "amethyst" : "teal",
      action: f.kind === "chapter" ? "read" : "read note",
      href: f.slug ? `/story/${f.slug}` : "#",
    });
  }

  if (s.commissions.latest) {
    const c = s.commissions.latest;
    const { label, ms } = ago(c.createdAt, now);
    events.push({
      id: "commission",
      who: c.patron ?? "A patron",
      what: `sent a commission — “${truncate(c.title, 60)}”${c.craft ? ` (${c.craft})` : ""}`,
      when: label,
      whenMs: ms,
      accent: "teal",
      action: "open",
      href: "/creator/earnings",
    });
  }

  if (s.newFollowersWeek > 0) {
    events.push({
      id: "new-followers",
      who: `${s.newFollowersWeek} new reader${s.newFollowersWeek === 1 ? "" : "s"}`,
      what: "started following your work",
      when: "this week",
      whenMs: 0,
      accent: "teal",
      href: "#",
    });
  }

  return events
    .sort((a, b) => Number(b.live ?? false) - Number(a.live ?? false) || b.whenMs - a.whenMs)
    .slice(0, 8);
}

// ── pieces ───────────────────────────────────────────────────────────────────

function ChairCard({ slot }: { slot: ChairSlot }) {
  const a = ACCENT_VAR[slot.accent];
  return (
    <Link
      href={slot.href}
      className={`group flex gap-4 rounded-lg border border-border-subtle bg-surface/40 p-4 transition-colors hover:bg-elevated/50 ${
        slot.dim ? "opacity-55 hover:opacity-100" : ""
      }`}
      style={{ borderColor: slot.dim ? undefined : `rgba(${a}, 0.25)` }}
    >
      <div className="w-14 shrink-0 self-start">
        <CoverArt
          seed={slot.coverSeed}
          title=""
          image={slot.coverImage}
          className={`aspect-[2/3] w-full rounded-[3px] ${slot.dim ? "opacity-60" : ""}`}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span
          className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.24em]"
          style={{ color: `rgba(${a}, 0.85)` }}
        >
          {slot.label}
          {slot.live && (
            <span
              aria-hidden
              className="h-[5px] w-[5px] animate-pulse rounded-full"
              style={{ backgroundColor: `rgb(${a})`, boxShadow: `0 0 8px rgba(${a}, 0.6)` }}
            />
          )}
        </span>
        <span className="truncate font-display text-[15px] text-paper">{slot.title}</span>
        <span className="line-clamp-2 font-reading text-[12px] italic leading-relaxed text-text-secondary">
          {slot.quote}
        </span>
        <span
          className="mt-auto pt-1 font-body text-[11.5px] italic opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: `rgb(${a})` }}
        >
          {slot.cta} <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter((w) => /^[a-z0-9]/i.test(w));
  return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "•";
}

function FeedRow({ ev }: { ev: FeedEvent }) {
  const a = ACCENT_VAR[ev.accent];
  return (
    <Link
      href={ev.href}
      className="group flex items-center gap-4 border-b border-border-subtle px-3 py-3.5 transition-colors hover:bg-elevated/40"
    >
      {ev.coverSeed ? (
        <div className="w-8 shrink-0">
          <CoverArt seed={ev.coverSeed} title="" image={ev.coverImage} className="aspect-[2/3] w-full rounded-[2px]" />
        </div>
      ) : (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]"
          style={{ borderColor: `rgba(${a}, 0.4)`, backgroundColor: `rgba(${a}, 0.12)`, color: `rgb(${a})` }}
        >
          {initials(ev.who)}
        </div>
      )}
      <p className="min-w-0 flex-1 truncate font-body text-[13.5px] text-text-secondary">
        <span className="font-medium text-paper">{ev.who}</span> {ev.what}
      </p>
      {ev.live && (
        <span
          aria-hidden
          className="h-[7px] w-[7px] shrink-0 animate-pulse rounded-full"
          style={{ backgroundColor: `rgb(${a})`, boxShadow: `0 0 8px rgba(${a}, 0.6)` }}
        />
      )}
      <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-ghost">{ev.when}</span>
      {ev.action && (
        <span
          className="shrink-0 rounded-full border px-3 py-1 font-body text-[11px]"
          style={{ borderColor: `rgba(${a}, 0.35)`, color: `rgb(${a})`, backgroundColor: `rgba(${a}, 0.08)` }}
        >
          {ev.action}
        </span>
      )}
    </Link>
  );
}

function workChip(w: StudioShelfItem): string {
  if (w.writingMode === "adventure") return `a table · ${w.status}`;
  if (w.writingMode === "campaign") return w.activeSession ? "campaign · live" : `campaign · ${w.status}`;
  return `${w.status} · ${w.chapterCount} ch`;
}

// ── the page ─────────────────────────────────────────────────────────────────

export default function Hub({
  initial,
  away,
  userId,
  firstName,
}: {
  initial: StudioSnapshot;
  away: number | "first";
  userId?: string;
  firstName?: string;
}) {
  const reduce = useReducedMotion();
  const [snapshot, setSnapshot] = useState<StudioSnapshot>(initial);
  // Starts at the server's own clock so the chair the server rendered is the
  // chair the client keeps; ticks slowly for the turn clock.
  const [nowMs, setNowMs] = useState(initial.builtAt);
  const [wallClock, setWallClock] = useState(() => new Date(CLOCK_FALLBACK));
  const [clockReady, setClockReady] = useState(false);

  // First-run onboarding panel — shown to brand-new users until dismissed.
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

  // The greeting was rendered from the *previous* visit; start the new clock
  // only now that it has been said.
  const stamped = useRef(false);
  useEffect(() => {
    if (stamped.current) return;
    stamped.current = true;
    void fetch("/api/studio/seen", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setWallClock(new Date());
    setNowMs(Date.now());
    setClockReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const id = setInterval(() => {
      setWallClock(new Date());
      setNowMs(Date.now());
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data) setSnapshot(json.data);
    } catch {
      // The hub is already on screen with the server's copy; a failed
      // refresh changes nothing the reader can see.
    }
  }, []);

  // Look up when you come back to the tab; keep a slow watch only while
  // something is actually live.
  const live = hasLiveThings(snapshot);
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const id = live
      ? window.setInterval(() => {
          if (!document.hidden) void refresh();
        }, LIVE_POLL_MS)
      : undefined;
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (id !== undefined) window.clearInterval(id);
    };
  }, [live, refresh]);

  const vm: StudioViewModel = useMemo(
    () => ({ snapshot, userId, now: nowMs, reduce, heroId: null }),
    [snapshot, userId, nowMs, reduce],
  );
  const chair = useMemo(() => buildChair(vm), [vm]);
  const feed = useMemo(() => buildFeed(vm), [vm]);
  const shelf = snapshot.shelf.slice(0, 6);
  const manuscript = snapshot.signals.manuscript;
  const wordsWeek = snapshot.signals.wordsTrend.reduce((a, b) => a + b, 0);
  const phase = PHASES[phaseInfo(wallClock).key];

  const emptyStudio =
    snapshot.shelf.length === 0 &&
    snapshot.tables.length === 0 &&
    !manuscript &&
    !snapshot.signals.continueReading;

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      {arrival && <ArrivalOverlay kind={arrival} onDone={() => setArrival(null)} />}
      {/* the film's ambience follows you in — quieter here */}
      <Motes count={12} opacityScale={0.55} zClass="z-[1]" />
      <Grain opacityClass="opacity-[0.03]" zClass="z-[40]" />
      {/* the standing lamp — time of day is the light, never the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: `radial-gradient(58% 95% at 50% 0%, rgba(${phase.rgb},0.09), transparent 70%)` }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-24 pt-20 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <span className="font-display text-lg text-paper">
            {firstName ? `${firstName}'s Studio` : "Your Studio"}
          </span>
          {clockReady && <PhaseClock now={wallClock} />}
        </header>

        {/* ── THE GREETING · one narrator line, then the desk ── */}
        <section className="mt-10">
          <p className="mb-3 font-body text-[10px] uppercase tracking-[0.34em] text-gold/80">
            {phase.label} · {phase.mood}
          </p>
          <NarratorLine text={absenceLine(away)} reduce={reduce} />
        </section>

        {emptyStudio && !firstRunDismissed && (
          <div className="mt-10">
            <FirstRunPanel firstName={firstName} onDismiss={dismissFirstRun} />
          </div>
        )}

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* ── THE CHAIR · resume, on top, fixed geography ── */}
          <section className="mt-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {chair.map((slot) => (
                <ChairCard key={slot.label} slot={slot} />
              ))}
            </div>
            {/* the Hemingway bridge — offered only while tonight's note is unwritten;
                once it exists the Write card quotes it instead */}
            {manuscript && !manuscript.bridgeNote && (
              <div className="mt-2 max-w-md rounded-lg border border-gold/15 bg-gold/[0.06] px-5 pb-4 pt-1">
                <BridgeNote
                  storyId={manuscript.storyId}
                  chapterId={manuscript.chapterId}
                  note={manuscript.bridgeNote}
                />
              </div>
            )}
          </section>

          {/* ── FROM YOUR PEOPLE · the feed ── */}
          <section className="mt-14">
            <SectionLabel
              right={
                <Link href="/library" className="text-text-ghost transition-colors hover:text-paper">
                  everything you follow →
                </Link>
              }
            >
              from your people
            </SectionLabel>
            {feed.length > 0 ? (
              <div className="mt-4 border-t border-border-subtle">
                {feed.map((ev) => (
                  <FeedRow key={ev.id} ev={ev} />
                ))}
              </div>
            ) : (
              <p className="mt-5 font-reading text-[13px] italic text-text-ghost">
                Nothing new from your people tonight. The street is quiet.
              </p>
            )}
          </section>

          {/* ── YOUR WORKS · covers with status chips ── */}
          {shelf.length > 0 && (
            <section className="mt-14">
              <SectionLabel
                right={
                  <Link href="/write" className="text-text-ghost transition-colors hover:text-paper">
                    all works →
                  </Link>
                }
              >
                your works
              </SectionLabel>
              <div className="mt-5 grid grid-cols-3 gap-5 sm:grid-cols-4 md:grid-cols-6">
                {shelf.map((w) => (
                  <Link key={w.id} href={storyHref(w)} className="group flex flex-col gap-2">
                    <div className="transition-transform group-hover:-translate-y-0.5">
                      <CoverArt
                        seed={w.id}
                        title={w.title}
                        image={w.coverImageUrl}
                        className="aspect-[2/3] w-full rounded-[3px]"
                        titleSize="text-[11px]"
                      />
                    </div>
                    <span className="truncate font-display text-[13px] text-paper">{w.title}</span>
                    <span className="w-fit rounded-full border border-border-subtle px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-text-ghost">
                      {workChip(w)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── MOMENTUM · one small strip, numbers only ── */}
          <section className="mt-14 border-t border-border-subtle pt-6">
            <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[22px] text-paper">{wordsWeek.toLocaleString()}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">words this week</span>
              </div>
              {snapshot.signals.wordsTrend.length > 1 && (
                <div className="w-28">
                  <Sparkline data={snapshot.signals.wordsTrend} color="var(--t-accent-gold)" reduce={reduce} />
                </div>
              )}
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[22px] text-paper">{snapshot.signals.readingStreak}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">
                  nights reading in a row
                </span>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[22px] text-paper">{snapshot.signals.sparksWeek}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">sparks this week</span>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
