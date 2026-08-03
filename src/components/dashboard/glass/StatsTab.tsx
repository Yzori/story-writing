"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { formatNumber, formatTimeAgo } from "@/lib/format";
import type { StudioSnapshot } from "@/types/studio";
import { Sparkline } from "@/components/dashboard/studio-kit";
import { Eyebrow, Panel, Tile, rise } from "@/components/dashboard/glass/kit";

// ─────────────────────────────────────────────────────────────────────────────
// Stats — the ledger, honestly kept. Earnings come from /api/user/earnings
// (every Ink Drop transaction by source), the Circle from /api/creator/circle.
// Reads-over-time aren't tracked yet, so this page shows live truths (reading
// now, followers this week) and says so, instead of inventing a history.
// ─────────────────────────────────────────────────────────────────────────────

interface EarningsData {
  totalEarned: number;
  totalGross: number;
  tipCount: number;
  tipsThisMonth: number;
  breakdown: Record<string, { total: number; grossTotal: number; count: number }>;
  topSupporter: { name: string | null; totalSent: number } | null;
  recentTips: { id: string; from: string | null; amount: number; type: string; createdAt: string }[];
}

interface CircleData {
  circle: { name?: string | null } | null;
  subscriberCount: number;
  monthlyIncome: number;
}

const SOURCE_LABELS: Record<string, string> = {
  tip: "Tips",
  unlock: "Chapter unlocks",
  circle: "The Circle",
  commission: "Commissions",
  donation: "Donations",
  crossroads: "Crossroads",
  gold: "Gold ink",
};

export default function StatsTab({ snapshot }: { snapshot: StudioSnapshot }) {
  const reduce = useReducedMotion();
  const s = snapshot.signals;

  const [earnings, setEarnings] = useState<EarningsData | null | "error">(null);
  const [circle, setCircle] = useState<CircleData | null | "error">(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/user/earnings")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        if (alive) setEarnings((j.data ?? j) as EarningsData);
      })
      .catch(() => {
        if (alive) setEarnings("error");
      });
    fetch("/api/creator/circle")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        if (alive) setCircle((j.data ?? j) as CircleData);
      })
      .catch(() => {
        if (alive) setCircle("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const wordsTotal = s.wordsTrend.reduce((a, b) => a + b, 0);

  const sources =
    earnings && earnings !== "error"
      ? Object.entries(earnings.breakdown)
          .filter(([, v]) => v.total > 0)
          .sort(([, a], [, b]) => b.total - a.total)
      : [];
  const sourceMax = Math.max(...sources.map(([, v]) => v.total), 1);

  const loadedEarnings = earnings !== null && earnings !== "error" ? earnings : null;
  const loadedCircle = circle !== null && circle !== "error" ? circle : null;

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
      {/* ── headline tiles ── */}
      <motion.div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:col-span-2" {...rise(reduce, 0.05)}>
        <Tile
          gold
          label="Ink earned · all time"
          value={loadedEarnings ? `✦ ${formatNumber(loadedEarnings.totalEarned)}` : earnings === "error" ? "—" : "…"}
          sub="your share, in Ink Drops"
        />
        <Tile
          label="The Circle"
          value={loadedCircle ? String(loadedCircle.subscriberCount) : circle === "error" ? "—" : "…"}
          sub={loadedCircle && loadedCircle.circle ? `✦ ${formatNumber(loadedCircle.monthlyIncome)} a month` : "members"}
        />
        <Tile label="Ink · this week" value={`✦ ${formatNumber(s.dropsWeek)}`} sub="into your well" />
        <Tile label="Sparks · this week" value={formatNumber(s.sparksWeek)} sub={`+${s.newFollowersWeek} new followers`} />
      </motion.div>

      {/* ── earnings by source ── */}
      <motion.div {...rise(reduce, 0.12)}>
        <Panel title="Where the ink comes from" moreHref="/creator/earnings" moreLabel="The full ledger">
          {earnings === null ? (
            <div className="space-y-2 py-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-elevated/45" />
              ))}
            </div>
          ) : earnings === "error" ? (
            <p className="py-4 text-[13px] text-text-secondary">The ledger didn&rsquo;t open. It&rsquo;s still safe — try again in a moment.</p>
          ) : sources.length === 0 ? (
            <div className="py-4 text-[13px] text-text-secondary">
              <p>Nothing in the well yet. Readers refill it through tips, the Circle, and unlocked chapters.</p>
              <Link href="/creator/monetization" className="mt-2 inline-block text-amber hover:text-amber/80">
                Open your studio&rsquo;s offerings →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map(([type, v]) => (
                <div key={type}>
                  <div className="mb-1 flex items-baseline justify-between text-[12px]">
                    <span className="text-text">{SOURCE_LABELS[type] ?? type}</span>
                    <span className="font-mono text-[11.5px] text-amber">
                      ✦ {formatNumber(v.total)}
                      <span className="ml-1.5 text-text-ghost">· {v.count}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-subtle/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber/50 to-amber"
                      style={{ width: `${Math.max(4, (v.total / sourceMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {loadedEarnings?.topSupporter && (
                <p className="pt-1 text-[12px] text-text-secondary">
                  Warmest patron: <span className="text-paper">{loadedEarnings.topSupporter.name ?? "Anonymous"}</span>
                  <span className="ml-1.5 font-mono text-[11.5px] text-amber">✦ {formatNumber(loadedEarnings.topSupporter.totalSent)}</span>
                </p>
              )}
            </div>
          )}
        </Panel>
      </motion.div>

      {/* ── readers, honestly ── */}
      <motion.div {...rise(reduce, 0.18)}>
        <Panel title="Your readers">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[13px] text-text">
                {s.readersNow && s.readersNow.count > 0 && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber shadow-[0_0_8px_rgba(226,172,74,0.8)]" />
                )}
                Reading right now
                {s.readersNow?.storyTitle && (
                  <span className="text-text-ghost">· {s.readersNow.storyTitle}</span>
                )}
              </div>
              <span className="font-mono text-lg text-paper">{s.readersNow?.count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-text">New followers this week</span>
              <span className="font-mono text-lg text-paper">{s.newFollowersWeek > 0 ? `+${s.newFollowersWeek}` : "0"}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-text">Sparks this week</span>
              <span className="font-mono text-lg text-amber">✦ {formatNumber(s.sparksWeek)}</span>
            </div>
            <p className="border-t border-border-subtle pt-3 text-[11.5px] leading-relaxed text-text-ghost">
              These numbers are live, not history — Quiloria doesn&rsquo;t keep a reads-over-time ledger yet.
            </p>
          </div>
        </Panel>
      </motion.div>

      {/* ── the fortnight's ink ── */}
      <motion.div {...rise(reduce, 0.24)}>
        <Panel title="Words, last fourteen nights">
          {wordsTotal === 0 ? (
            <p className="py-4 text-[13px] text-text-secondary">No ink on the trend yet — the chart starts with your next writing session.</p>
          ) : (
            <>
              <Sparkline data={s.wordsTrend} color="226,172,74" reduce={reduce} />
              <div className="mt-2 flex items-baseline justify-between">
                <Eyebrow>Fourteen nights</Eyebrow>
                <span className="font-mono text-[13px] text-paper">{formatNumber(wordsTotal)} words</span>
              </div>
            </>
          )}
        </Panel>
      </motion.div>

      {/* ── recent ink ── */}
      <motion.div {...rise(reduce, 0.3)}>
        <Panel title="Recent ink" moreHref="/creator/earnings" moreLabel="Everything">
          {loadedEarnings === null ? (
            <div className="space-y-2 py-1" aria-hidden>
              {[0, 1].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-elevated/45" />
              ))}
            </div>
          ) : loadedEarnings.recentTips.length === 0 ? (
            <p className="py-4 text-[13px] text-text-secondary">The well is quiet. Recent refills will show here.</p>
          ) : (
            <ul className="space-y-2.5">
              {loadedEarnings.recentTips.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-baseline justify-between text-[13px]">
                  <span className="truncate text-text">
                    <span className="text-paper">{t.from ?? "Someone"}</span>
                    <span className="text-text-ghost"> · {SOURCE_LABELS[t.type] ?? t.type}</span>
                  </span>
                  <span className="ml-3 shrink-0 font-mono text-[12px] text-amber">
                    ✦ {formatNumber(t.amount)}
                    <span className="ml-1.5 text-text-ghost">{formatTimeAgo(t.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </motion.div>
    </div>
  );
}
