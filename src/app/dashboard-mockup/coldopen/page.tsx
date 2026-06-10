"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  useDashboardData,
  storyHref,
  type MockNotification,
  type MockCampaign,
} from "@/components/dashboard-mockup/useDashboardData";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// ✍️ Cold Open — the words are the UI
// Anti-ambient, typography-forward dashboard. No illustration, no scenery.
// Severe editorial type on near-black: the first line of your WIP types itself
// live, stories are a numbered index, notifications are margin footnotes,
// live campaigns a single restrained dateline. Restraint is the brief.
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.round(mo / 12)}y`;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

const NOTIF_LABELS: Record<string, string> = {
  comment: "a margin note",
  spark: "a spark",
  follow: "a new reader",
  chapter: "a new chapter",
  update: "an update",
};

function notifLabel(type: string): string {
  return NOTIF_LABELS[type] ?? "a note";
}

const SUPERSCRIPTS = ["¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function liveHref(c: MockCampaign): string {
  return c.activeSession
    ? `/campaign/${c.id}/play/${c.activeSession.id}`
    : `/campaign/${c.id}`;
}

// Build the literary opening line from what we have — no real prose available,
// so the working title becomes the opening, optionally seeded by a synopsis.
function heroLine(story: ApiStory): string {
  return story.title.trim();
}

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

// ── The blinking cursor ──────────────────────────────────────────────────────

function Cursor({ className = "" }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={`inline-block text-amber ${className}`}
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1.05, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1] }}
    >
      ▋
    </motion.span>
  );
}

// ── Typewriter hero ──────────────────────────────────────────────────────────

function Hero({
  story,
  href,
  reduced,
}: {
  story: ApiStory;
  href: string;
  reduced: boolean;
}) {
  const full = heroLine(story);
  const [typed, setTyped] = useState(reduced ? full : "");
  const [done, setDone] = useState(reduced);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Static path for reduced-motion: reveal everything immediately.
    if (reduced) {
      setTyped(full);
      setDone(true);
      return;
    }
    // Start fresh whenever the active story changes.
    setTyped("");
    setDone(false);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDone(true);
      }
    }, 58);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [full, reduced]);

  const meta = `Chapter ${Math.max(1, story.chapterCount)} · ${formatCount(
    story.totalWords,
  )} words · edited ${relativeShort(story.updatedAt)}`;

  return (
    <section className="max-w-4xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-ghost">
        The opening line
      </p>

      <h1 className="mt-6 font-reading text-4xl italic leading-[1.08] text-paper sm:text-5xl md:text-6xl lg:text-7xl">
        {typed}
        <Cursor className="not-italic align-baseline" />
      </h1>

      {story.synopsis ? (
        <p className="mt-7 max-w-2xl font-reading text-base italic leading-relaxed text-text-secondary">
          {story.synopsis}
        </p>
      ) : null}

      <motion.div
        initial={false}
        animate={{ opacity: done ? 1 : 0, y: done ? 0 : 6 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-3"
        style={{ pointerEvents: done ? "auto" : "none" }}
      >
        <Link
          href={href}
          className="group font-display text-2xl text-amber transition-colors hover:text-paper"
        >
          Resume{" "}
          <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </Link>
        <span className="font-mono text-[11px] tracking-wide text-text-ghost">{meta}</span>
      </motion.div>
    </section>
  );
}

// ── Numbered story index ─────────────────────────────────────────────────────

function IndexRow({ story, n }: { story: ApiStory; n: number }) {
  const num = String(n).padStart(2, "0");
  const parts: string[] = [];
  if (story.writingMode === "campaign") {
    parts.push(`${formatCount(story.playerCount ?? 0)} at table`);
  } else {
    parts.push(`${formatCount(story.chapterCount)} ch`);
    parts.push(`${formatCount(story.totalWords)} w`);
  }
  parts.push(story.status);
  const meta = parts.join("  ·  ");

  return (
    <Link
      href={storyHref(story)}
      className="group flex items-baseline gap-5 border-t border-border-subtle py-6 transition-colors first:border-t-0 sm:gap-8"
    >
      <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-text-ghost transition-colors group-hover:text-amber">
        {num}
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-2xl leading-tight text-text transition-all duration-200 group-hover:translate-x-1.5 group-hover:text-paper group-hover:[text-decoration:underline] group-hover:[text-underline-offset:6px] group-hover:decoration-amber/50 sm:text-3xl">
        {story.title}
      </span>
      <span className="hidden shrink-0 self-baseline font-mono text-[11px] lowercase tracking-wide text-text-ghost sm:block">
        {meta}
      </span>
    </Link>
  );
}

// ── Margin footnotes (notifications) ─────────────────────────────────────────

function Footnote({ notif, n }: { notif: MockNotification; n: number }) {
  const sup = SUPERSCRIPTS[n] ?? `(${n + 1})`;
  return (
    <Link href={notif.href} className="group block py-2">
      <p className="font-reading text-[13px] leading-relaxed text-text-ghost transition-colors group-hover:text-text-secondary">
        <span className="mr-1 align-super font-mono text-[10px] text-amber">{sup}</span>
        <span className="italic">{notifLabel(notif.type)}</span>
        <span className="text-text-ghost/70"> — {notif.message}</span>
        <span className="ml-1 font-mono text-[10px] tracking-wide text-text-ghost/60">
          · {relativeShort(notif.createdAt)}
        </span>
      </p>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ColdOpenMockup() {
  const reducedPref = useReducedMotion();
  const reduced = !!reducedPref;
  const { loaded, error, allStories, activeStory, activeHref, notifs, liveCampaigns } =
    useDashboardData();

  // Loading: a single blinking cursor on a near-black field. Nothing else.
  if (!loaded) {
    return (
      <main className="grid min-h-dvh place-items-center bg-void">
        <span className="font-display text-4xl text-amber">
          <Cursor />
        </span>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-dvh place-items-center bg-void px-6">
        <p className="font-reading text-lg italic text-text-secondary">
          — the page would not load —
        </p>
      </main>
    );
  }

  // Empty manuscript.
  if (!activeStory) {
    return (
      <main className="grid min-h-dvh place-items-center bg-void px-6">
        <div className="text-center">
          <span className="font-display text-5xl text-paper">
            <Cursor />
          </span>
          <div className="mt-8">
            <Link
              href="/create"
              className="font-display text-3xl text-amber transition-colors hover:text-paper"
            >
              Begin.
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const live = liveCampaigns.filter((c) => c.activeSession);
  const indexStories = allStories;
  const footnotes = notifs.slice(0, 4);

  return (
    <main className="min-h-dvh bg-void text-text">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 lg:px-14">
        {/* Masthead */}
        <header className="flex items-baseline justify-between border-b border-border pb-5">
          <div className="flex items-baseline gap-5">
            <span className="font-display text-lg tracking-tight text-paper">The Desk</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-ghost">
              Quiloria
            </span>
          </div>
          <div className="flex items-baseline gap-6">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost sm:inline">
              {TODAY}
            </span>
            <Link
              href="/dashboard-mockup"
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost transition-colors hover:text-amber"
            >
              ← Mockups
            </Link>
          </div>
        </header>

        {/* Live dateline */}
        {live.length > 0 ? (
          <div className="mt-6">
            {live.slice(0, 1).map((c) => (
              <Link
                key={c.id}
                href={liveHref(c)}
                className="group inline-flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary transition-colors hover:text-paper"
              >
                <motion.span
                  aria-hidden
                  className="self-center text-amber"
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  ●
                </motion.span>
                <span className="text-amber">Live</span>
                <span className="text-text-ghost">—</span>
                <span className="normal-case tracking-normal text-text">{c.title}</span>
                <span className="text-text-ghost">
                  · {formatCount(c.playerCount)} at the table →
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        {/* Hero — the typewriter opening line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="pt-16 pb-24 sm:pt-24"
        >
          <Hero story={activeStory} href={activeHref} reduced={reduced} />
        </motion.div>

        {/* Body: numbered index + margin footnotes */}
        <div className="grid grid-cols-1 gap-16 border-t border-border pt-12 lg:grid-cols-[1fr_18rem] lg:gap-20">
          {/* The Index */}
          <section>
            <div className="mb-8 flex items-baseline justify-between">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-ghost">
                Index
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">
                {formatCount(indexStories.length)} works
              </span>
            </div>
            <div>
              {indexStories.map((s, i) => (
                <IndexRow key={s.id} story={s} n={i + 1} />
              ))}
            </div>
          </section>

          {/* Footnotes margin */}
          <aside className="lg:pl-6">
            <h2 className="mb-6 font-mono text-[10px] uppercase tracking-[0.28em] text-text-ghost">
              Notes in the margin
            </h2>
            {footnotes.length > 0 ? (
              <div className="space-y-1 lg:border-l lg:border-border-subtle lg:pl-6">
                {footnotes.map((nf, i) => (
                  <Footnote key={nf.id} notif={nf} n={i} />
                ))}
              </div>
            ) : (
              <p className="font-reading text-[13px] italic text-text-ghost">
                — the margins are clean —
              </p>
            )}
          </aside>
        </div>

        {/* Colophon */}
        <footer className="mt-24 border-t border-border pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-ghost">
            Cold Open · the words are the UI
          </p>
        </footer>
      </div>
    </main>
  );
}
