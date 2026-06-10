"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, Feather, MapPin, ArrowLeft, ScrollText, Sparkles } from "lucide-react";
import {
  useDashboardData,
  type MockNotification,
} from "@/components/dashboard-mockup/useDashboardData";
import {
  RealmMap,
  LoadingMap,
  TornMap,
  layoutRegions,
  layoutSettlements,
  relativeShort,
  clamp01,
} from "@/components/dashboard-mockup/realm-map";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// 🗺️ The Realm — Cartographer's Table (pure-concept version).
// Map carries everything. See /dashboard-mockup/hybrid for the clarity-first
// version that keeps the map as hero but restores explicit panels.
// ─────────────────────────────────────────────────────────────────────────────

export default function RealmDashboardMockup() {
  const reduce = useReducedMotion();
  const { loaded, error, allStories, activeStory, activeHref, notifs, liveCampaigns } =
    useDashboardData();

  const regionStories = useMemo(
    () => allStories.filter((s) => s.writingMode !== "campaign"),
    [allStories],
  );
  const regions = useMemo(() => layoutRegions(regionStories), [regionStories]);
  const settlements = useMemo(() => layoutSettlements(liveCampaigns), [liveCampaigns]);
  const dispatches = useMemo(() => notifs.slice(0, 3), [notifs]);

  const isEmpty = loaded && !error && regions.length === 0 && settlements.length === 0;

  return (
    <div className="min-h-screen bg-void text-text">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(168,128,48,0.10),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(122,92,50,0.12),transparent_60%)]" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-20 pb-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono uppercase tracking-widest text-[11px]">Concepts</span>
          </Link>
          <span className="text-border">/</span>
          <h1 className="font-display text-2xl text-paper">
            <span className="mr-2">🗺️</span>The Realm
          </h1>
          <span className="hidden font-reading italic text-text-ghost sm:inline">Cartographer&apos;s Table</span>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-amber/70 md:flex">
          <Feather className="h-3.5 w-3.5" />
          ink reveals the world
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-6 pb-16 lg:grid-cols-[1fr_300px]">
        <div className="relative overflow-hidden rounded-2xl border border-amber/20 bg-[#1a140c] shadow-2xl shadow-black/50">
          {!loaded && <LoadingMap reduce={reduce} />}
          {loaded && error && regions.length === 0 && <TornMap />}
          {loaded && !error && (
            <RealmMap
              regions={regions}
              settlements={settlements}
              activeId={activeStory && activeStory.writingMode !== "campaign" ? activeStory.id : null}
              dispatchCount={dispatches.length}
              reduce={reduce}
              isEmpty={isEmpty}
            />
          )}
          {loaded && error && regions.length > 0 && (
            <div className="absolute bottom-3 left-3 rounded-md border border-rose/30 bg-rose/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-rose/80">
              the map is torn here — some lands unrecorded
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <PrimaryCta loaded={loaded} activeStory={activeStory} activeHref={activeHref} isEmpty={isEmpty} />
          <Dispatches dispatches={dispatches} loaded={loaded} reduce={reduce} />
          <Legend />
        </aside>
      </div>
    </div>
  );
}

function PrimaryCta({
  loaded,
  activeStory,
  activeHref,
  isEmpty,
}: {
  loaded: boolean;
  activeStory: ApiStory | null;
  activeHref: string;
  isEmpty: boolean;
}) {
  if (isEmpty) {
    return (
      <Link href="/create" className="group relative overflow-hidden rounded-xl border border-amber/40 bg-gradient-to-br from-amber/20 to-copper/10 p-4 transition-all hover:border-amber/60">
        <div className="flex items-center gap-2 text-amber">
          <Compass className="h-5 w-5" />
          <span className="font-display text-lg text-paper">Chart your first land</span>
        </div>
        <p className="mt-1 font-reading text-sm italic text-text-secondary">The realm is fog. Set down a story and watch the coastlines appear.</p>
      </Link>
    );
  }

  const surveying = activeStory?.title ?? "your survey";
  return (
    <Link href={loaded ? activeHref : "#"} className="group relative overflow-hidden rounded-xl border border-amber/40 bg-gradient-to-br from-amber/20 to-copper/10 p-4 shadow-lg shadow-amber/5 transition-all hover:border-amber/60">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber/10 blur-2xl transition-opacity group-hover:opacity-80" />
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber/80">
        <MapPin className="h-3.5 w-3.5" />
        currently surveying
      </div>
      <div className="mt-1.5 font-display text-xl leading-tight text-paper">{surveying}</div>
      {activeStory && (
        <div className="mt-0.5 font-mono text-[11px] text-text-ghost">
          {(activeStory.totalWords || 0).toLocaleString()} words · {Math.round(clamp01((activeStory.totalWords || 0) / 20000) * 100)}% charted
        </div>
      )}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber/90 px-3 py-1.5 text-sm font-semibold text-void transition-colors group-hover:bg-amber">
        <Feather className="h-4 w-4" />
        Resume survey
      </div>
    </Link>
  );
}

function Dispatches({ dispatches, loaded, reduce }: { dispatches: MockNotification[]; loaded: boolean; reduce: boolean | null }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface/80 p-4">
      <div className="mb-3 flex items-center gap-2">
        <motion.span animate={reduce ? {} : { rotate: [-8, 8, -8] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} className="inline-block">
          🕊️
        </motion.span>
        <h2 className="font-display text-sm text-paper">Dispatches</h2>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-text-ghost">by raven</span>
      </div>

      {!loaded && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-elevated/60" />
          ))}
        </div>
      )}

      {loaded && dispatches.length === 0 && <p className="font-reading text-sm italic text-text-ghost">No ravens on the wind. All quiet across the realm.</p>}

      {loaded && dispatches.length > 0 && (
        <ul className="space-y-2">
          {dispatches.map((n) => (
            <li key={n.id}>
              <Link href={n.href || "#"} className="group flex gap-2.5 rounded-lg border border-border-subtle bg-elevated/40 p-2.5 transition-colors hover:border-amber/30 hover:bg-elevated/70">
                <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose/80 to-burnt/70 shadow-inner ring-1 ring-burnt/40">
                  <Sparkles className="h-3 w-3 text-rose-50/90" />
                  {!n.read && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber ring-2 ring-surface" />}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] leading-snug text-text group-hover:text-paper">{n.message}</p>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-ghost">{n.type} · {relativeShort(n.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Legend() {
  const rows = [
    { sw: <span className="block h-3 w-3 rounded-sm bg-[#C7B384] ring-1 ring-[#7A5C32]" />, label: "charted region — a story" },
    { sw: <span className="block h-3 w-3 rounded-sm bg-[#E9E1CB]/90 ring-1 ring-[#7A5C32]" />, label: "fog of war — words yet unwritten" },
    { sw: <span className="block h-3 w-3 rounded-sm bg-[#5E8B82] ring-1 ring-[#3F6B62]" />, label: "settlement — a live campaign" },
    { sw: <span className="text-xs leading-none">🕊️</span>, label: "raven — an incoming dispatch" },
  ];
  return (
    <div className="rounded-xl border border-border-subtle bg-surface/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ScrollText className="h-3.5 w-3.5 text-amber/70" />
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">Cartographer&apos;s legend</h2>
      </div>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-2.5 text-[12px] text-text-secondary">
            <span className="flex h-4 w-4 items-center justify-center">{r.sw}</span>
            <span className="font-reading italic">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
