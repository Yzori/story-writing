"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { absenceLine } from "@/components/dashboard/Hub";
import ArrivalOverlay from "@/components/dashboard/ArrivalOverlay";
import { Grain, Motes } from "@/components/shared/Atmosphere";
import { consumeArrival, type ArrivalKind } from "@/lib/arrival";
import type { StudioSnapshot } from "@/types/studio";
import StudioTab from "@/components/dashboard/glass/StudioTab";
import ReadTab from "@/components/dashboard/glass/ReadTab";
import StatsTab from "@/components/dashboard/glass/StatsTab";

// ─────────────────────────────────────────────────────────────────────────────
// The Glass Stage — the dashboard as a lit vitrine. One deep-midnight panel
// under the navbar, three surfaces inside it: Studio (your writing), Read
// (your reading), Stats (the ledger). Same narrator, same craft rule as the
// Hub it replaces: nothing invented, everything quoted.
// ─────────────────────────────────────────────────────────────────────────────

type StageTab = "studio" | "read" | "stats";

const TABS: { id: StageTab; label: string }[] = [
  { id: "studio", label: "Studio" },
  { id: "read", label: "Read" },
  { id: "stats", label: "Stats" },
];

export default function GlassStage({
  initial,
  away,
  firstName,
  initialTab = "studio",
}: {
  initial: StudioSnapshot;
  away: number | "first";
  firstName?: string;
  initialTab?: StageTab;
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<StageTab>(initialTab);
  const [arrival, setArrival] = useState<ArrivalKind | null>(null);
  const stageRef = useRef<HTMLElement>(null);

  // ── the tab lives in the URL ──
  // /dashboard?tab=stats is linkable, refresh keeps your place, and
  // back/forward walk the surfaces. Native pushState on purpose: a router
  // navigation would re-run the server page and rebuild the whole snapshot
  // just to swap a client tab.
  const selectTab = (t: StageTab) => {
    if (t === tab) return;
    setTab(t);
    window.history.pushState(null, "", t === "studio" ? "/dashboard" : `/dashboard?tab=${t}`);
  };
  useEffect(() => {
    const onPop = () => {
      const t = new URLSearchParams(window.location.search).get("tab");
      setTab(t === "read" || t === "stats" ? t : "studio");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── the live signals stay live ──
  // The server-built snapshot is the first paint; after that, /api/dashboard
  // (the same shape, same service) refreshes it every minute — so a pulsing
  // "Live" badge is never quoting an hour-old page load. The clock ticks
  // between polls so a turn deadline counts down instead of freezing.
  const [snapshot, setSnapshot] = useState<StudioSnapshot>(initial);
  const [now, setNow] = useState(initial.builtAt);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const r = await fetch("/api/dashboard");
        if (!r.ok) return; // keep the last honest snapshot; try again next tick
        const j = await r.json();
        const next = j.data as StudioSnapshot | undefined;
        if (alive && next?.builtAt) {
          setSnapshot(next);
          setNow(next.builtAt);
        }
      } catch {
        // offline or flaky — the stale-but-labeled snapshot is still truthful
      }
    };
    const pollId = setInterval(poll, 60_000);
    const tickId = setInterval(() => setNow((n) => n + 30_000), 30_000);
    // coming back to the tab refreshes immediately — that's when staleness shows
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(pollId);
      clearInterval(tickId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // the arrival ceremony still owns the first breath after sign-in
  useEffect(() => setArrival(consumeArrival()), []);

  // the candle follows the reader across the glass — CSS vars, no re-renders
  const onStageMove = (e: React.PointerEvent) => {
    const el = stageRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--lx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(2)}%`);
    el.style.setProperty("--ly", `${(((e.clientY - r.top) / r.height) * 100).toFixed(2)}%`);
    el.classList.add("is-lit");
  };
  const onStageLeave = () => stageRef.current?.classList.remove("is-lit");

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      {arrival && <ArrivalOverlay kind={arrival} onDone={() => setArrival(null)} />}
      <Motes count={10} opacityScale={0.5} zClass="z-[1]" />
      <Grain opacityClass="opacity-[0.03]" zClass="z-[40]" />

      <div className="relative z-[2] mx-auto w-full max-w-6xl px-3 pb-20 pt-16 sm:px-6 sm:pt-20">
        {/* ── the desk's nameplate lives above the stage, so the jacket can
               break the frame without covering anyone's name ── */}
        <motion.div
          className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1 sm:mb-5"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 0.8, 0.3, 1] }}
        >
          <div className="min-w-0">
            <p className="font-display text-[13px] italic text-text-ghost">{absenceLine(away)}</p>
            {firstName && (
              <h1 className="mt-0.5 truncate font-display text-xl text-paper sm:text-2xl">{firstName}&rsquo;s desk</h1>
            )}
          </div>
          <nav className="glass-panel flex shrink-0 gap-1 rounded-full p-1" aria-label="Dashboard surfaces">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTab(t.id)}
                className={`relative rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  tab === t.id ? "text-amber" : "text-text-secondary hover:text-paper"
                }`}
                aria-current={tab === t.id ? "page" : undefined}
              >
                {tab === t.id && (
                  <motion.span
                    layoutId="stage-tab"
                    className="absolute inset-0 rounded-full bg-amber/[0.14]"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </nav>
        </motion.div>

        <motion.section
          ref={stageRef}
          onPointerMove={onStageMove}
          onPointerLeave={onStageLeave}
          className="glass-stage px-4 pb-6 pt-6 sm:px-7 sm:pb-8 sm:pt-7"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 0.8, 0.3, 1], delay: 0.08 }}
        >
          {/* light lives under the content: the pointer's candle, and the
              lamplighter's single pass when a surface takes the stage */}
          <div className="glass-sweep-clip" aria-hidden>
            <div className="glass-stage-light" />
            {!reduce && (
              <motion.div
                key={`sweep-${tab}`}
                className="glass-sweep"
                initial={{ x: "-80%", opacity: 0 }}
                animate={{ x: "320%", opacity: [0, 0.55, 0] }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
              />
            )}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              className="relative"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {tab === "studio" && <StudioTab snapshot={snapshot} now={now} />}
              {tab === "read" && <ReadTab snapshot={snapshot} />}
              {tab === "stats" && <StatsTab snapshot={snapshot} />}
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  );
}
