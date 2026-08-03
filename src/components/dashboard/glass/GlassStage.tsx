"use client";

import { useEffect, useState } from "react";
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
}: {
  initial: StudioSnapshot;
  away: number | "first";
  firstName?: string;
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<StageTab>("studio");
  const [arrival, setArrival] = useState<ArrivalKind | null>(null);

  // the arrival ceremony still owns the first breath after sign-in
  useEffect(() => setArrival(consumeArrival()), []);

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
                onClick={() => setTab(t.id)}
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
          className="glass-stage px-4 pb-6 pt-6 sm:px-7 sm:pb-8 sm:pt-7"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 0.8, 0.3, 1], delay: 0.08 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {tab === "studio" && <StudioTab snapshot={initial} now={initial.builtAt} />}
              {tab === "read" && <ReadTab snapshot={initial} />}
              {tab === "stats" && <StatsTab snapshot={initial} />}
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  );
}
