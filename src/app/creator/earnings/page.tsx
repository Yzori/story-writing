"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatTimeAgo, formatNumber } from "@/lib/format";
import { SOURCE_LABELS } from "@/lib/constants";

interface EarningsData {
  totalEarned: number;
  tipCount: number;
  tipsThisMonth: number;
  breakdown: Record<string, { total: number; count: number }>;
  topSupporter: { name: string; totalSent: number } | null;
  recentTips: {
    id: string;
    from: string;
    amount: number;
    message: string | null;
    type: string;
    createdAt: string;
  }[];
}


const STAT_CARDS = [
  { key: "totalEarned" as const, label: "Total Earned", icon: "drop", accent: "text-gold" },
  { key: "tipsThisMonth" as const, label: "This Month", icon: "calendar", accent: "text-amber" },
  { key: "tipCount" as const, label: "Tips Received", icon: "heart", accent: "text-rose" },
] as const;


export default function CreatorEarningsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/earnings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl text-paper font-bold">Earnings</h1>
            <p className="text-text-secondary text-sm mt-1">
              Ink Drops received from your audience
            </p>
          </div>
          <Link
            href="/settings/ink-drops"
            className="text-xs text-gold hover:text-gold-light transition-colors"
          >
            Buy Ink Drops &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <p className="text-text-ghost text-center py-20">Failed to load earnings</p>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {STAT_CARDS.map((card, i) => (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="card-page p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center`}>
                      {card.icon === "drop" && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
                          <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
                        </svg>
                      )}
                      {card.icon === "calendar" && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                          <rect x="2" y="3" width="12" height="11" rx="1.5" />
                          <path d="M2 6.5h12M5 1.5v3M11 1.5v3" />
                        </svg>
                      )}
                      {card.icon === "heart" && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose">
                          <path d="M8 13S2 9.5 2 6a3 3 0 015.5-1.7L8 5l.5-.7A3 3 0 0114 6c0 3.5-6 7-6 7z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                        {card.label}
                      </p>
                      <p className={`text-xl font-display font-bold tabular-nums ${card.accent}`}>
                        {formatNumber(data[card.key])}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Earnings breakdown by source */}
            {data.breakdown && Object.keys(data.breakdown).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <h2 className="text-[11px] uppercase tracking-[0.12em] text-text-ghost mb-3 font-semibold">
                  Breakdown by Source
                </h2>
                <div className="card-page p-5 space-y-3">
                  {Object.entries(data.breakdown)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([type, stats]) => {
                      const source = SOURCE_LABELS[type] || { label: type, accent: "bg-text-ghost" };
                      const pct = data.totalEarned > 0 ? Math.round((stats.total / data.totalEarned) * 100) : 0;
                      return (
                        <div key={type}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${source.accent}`} />
                              <span className="text-[13px] text-paper font-medium">{source.label}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[12px]">
                              <span className="text-text-ghost">{stats.count} transactions</span>
                              <span className="text-paper font-bold tabular-nums">{formatNumber(stats.total)} drops</span>
                              <span className="text-text-ghost w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
                            <div
                              className={`h-full rounded-full ${source.accent} transition-all duration-500`}
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* Top supporter card */}
            {data.topSupporter && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-8 p-4 bg-gold/5 border border-gold/15 rounded-xl flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
                    <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                    Top Supporter
                  </p>
                  <p className="text-sm text-paper font-medium">
                    {data.topSupporter.name}
                    <span className="text-gold/60 ml-2 text-xs tabular-nums">
                      {data.topSupporter.totalSent} drops total
                    </span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Recent tips */}
            <div>
              <h2 className="text-[11px] uppercase tracking-[0.12em] text-text-ghost mb-3 font-semibold">
                Recent Transactions
              </h2>

              {data.recentTips.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold/40">
                      <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
                    </svg>
                  </div>
                  <p className="text-text-ghost text-sm">No earnings yet</p>
                  <p className="text-text-ghost/60 text-xs mt-1">
                    Income from tips, donations, unlocks, subscriptions, and commissions will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recentTips.map((tip, i) => (
                    <motion.div
                      key={tip.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.03 }}
                      className="flex items-start justify-between gap-3 px-4 py-3 bg-elevated/30 border border-border/50 rounded-lg"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold mt-0.5 flex-shrink-0">
                          <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm text-text">
                            <span className="font-medium text-paper">{tip.from}</span>
                            <span className="text-text-secondary"> sent </span>
                            <span className="font-bold text-gold tabular-nums">{tip.amount}</span>
                            <span className="text-text-secondary"> drops</span>
                            {tip.type && SOURCE_LABELS[tip.type] && (
                              <span className="ml-2 text-[10px] text-text-ghost bg-elevated px-1.5 py-0.5 rounded-full">
                                {SOURCE_LABELS[tip.type].label}
                              </span>
                            )}
                          </p>
                          {tip.message && (
                            <p className="text-xs text-text-secondary italic mt-0.5 truncate">
                              &ldquo;{tip.message}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-text-ghost whitespace-nowrap flex-shrink-0">
                        {formatTimeAgo(tip.createdAt)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
