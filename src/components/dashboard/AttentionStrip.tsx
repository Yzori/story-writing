"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface AttentionItem {
  kind: "suggestion" | "pitch" | "applicant" | "commission";
  label: string;
  detail?: string;
  href: string;
  createdAt: string;
}

interface AttentionData {
  items: AttentionItem[];
  counts: {
    suggestions: number;
    pitches: number;
    applicants: number;
    draftSessions: number;
    commissions: number;
    total: number;
  };
}

const ICONS: Record<AttentionItem["kind"], React.ReactNode> = {
  suggestion: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 2v4M8 10v4M2 8h4M10 8h4" />
    </svg>
  ),
  pitch: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3h10v7H8l-3 3V10H3V3z" />
      <path d="M6 6h4M6 8h2" />
    </svg>
  ),
  applicant: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="6" r="3" />
      <path d="M2 14c0-3 2.5-5 6-5s6 2 6 5" />
    </svg>
  ),
  commission: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M5 6h6M5 9h4" />
    </svg>
  ),
};

const ACCENTS: Record<AttentionItem["kind"], string> = {
  suggestion: "text-sage bg-sage/10 border-sage/20",
  pitch: "text-amber bg-amber/10 border-amber/20",
  applicant: "text-violet bg-violet/10 border-violet/20",
  commission: "text-amethyst bg-amethyst/10 border-amethyst/20",
};

/**
 * "Today" widget on the dashboard. Aggregates pending items across the
 * creator's stories — suggestions to review, pitches awaiting decision,
 * campaign applicants, commission requests. Hidden when the user has
 * nothing pending.
 */
export default function AttentionStrip() {
  const [data, setData] = useState<AttentionData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/attention")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.data) setData(json.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !data || data.items.length === 0) return null;

  const total = data.counts.total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="rounded-2xl border border-amber/15 bg-gradient-to-br from-amber/[0.04] to-transparent p-5 sm:p-6"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="relative">
          <span className="block w-2 h-2 rounded-full bg-amber animate-pulse" />
          <span className="absolute inset-0 w-2 h-2 rounded-full bg-amber/40 animate-ping" />
        </div>
        <h3 className="font-display text-paper text-[15px] font-semibold">
          Needs your attention
        </h3>
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">
          {total} item{total === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="space-y-2">
        <AnimatePresence>
          {data.items.map((item, i) => (
            <motion.li
              key={`${item.kind}-${item.href}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Link
                href={item.href}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-amber/15 hover:bg-amber/[0.04] transition-all group"
              >
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 ${ACCENTS[item.kind]}`}
                >
                  {ICONS[item.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-paper text-[13px] font-medium truncate">
                    {item.label}
                  </p>
                  {item.detail && (
                    <p className="text-text-ghost text-[11px] mt-0.5 truncate">
                      {item.detail}
                    </p>
                  )}
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="shrink-0 mt-2 text-text-ghost group-hover:text-amber group-hover:translate-x-0.5 transition-all"
                >
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* Summary chips when there's more than what's shown */}
      {total > data.items.length && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border-subtle/40">
          {data.counts.suggestions > 3 && (
            <Chip>{data.counts.suggestions - 3} more suggestions</Chip>
          )}
          {data.counts.pitches > 3 && (
            <Chip>{data.counts.pitches - 3} more pitches</Chip>
          )}
          {data.counts.applicants > 3 && (
            <Chip>{data.counts.applicants - 3} more applicants</Chip>
          )}
          {data.counts.commissions > 3 && (
            <Chip>{data.counts.commissions - 3} more commissions</Chip>
          )}
        </div>
      )}
    </motion.div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-text-ghost bg-elevated/50 border border-border-subtle px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}
