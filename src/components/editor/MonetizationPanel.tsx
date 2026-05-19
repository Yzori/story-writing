"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatNumber } from "@/lib/format";

/**
 * MonetizationPanel — unified writer view of Circle, per-chapter gating, and
 * Commission offerings. Shows at-a-glance status for each surface and links to
 * the existing configuration flows.
 *
 * The panel deliberately does NOT duplicate configuration UI — for per-chapter
 * gating it hands off to MetadataPanel (via onOpenMetadata), which already owns
 * the monetization model + tier state.
 */

interface MonetizationPanelProps {
  storyId: string;
  storyTitle: string;
  isPublic: boolean;
  onOpenMetadata: () => void;
  onClose: () => void;
}

type MonetizationModel = "free" | "freemium" | "gated";

interface StoryMonetization {
  monetizationModel: MonetizationModel;
  freeChapterCount: number;
  chapters: { id: string; gatingTier: string | null; status: string }[];
  stats: { totalUnlocks: number; totalDrops: number; creatorRevenue: number };
}

interface CircleStatus {
  isActive: boolean;
  confidantPrice: number;
  subscriberCount: number;
  monthlyIncome: number;
}

interface OfferingSummary {
  id: string;
  title: string;
  craft: string;
}

const MODEL_LABEL: Record<MonetizationModel, string> = {
  free: "Free",
  freemium: "Freemium",
  gated: "Fully gated",
};

const MODEL_DESCRIPTION: Record<MonetizationModel, string> = {
  free: "Every chapter is free to read.",
  freemium: "First few chapters free, later chapters unlock with drops.",
  gated: "All chapters unlock with drops.",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flourish">
      <span className="font-display text-[10px] uppercase tracking-[0.18em] text-text-ghost px-3">
        {title}
      </span>
    </div>
  );
}

function StatusCard({
  accent,
  icon,
  title,
  status,
  subtitle,
  action,
}: {
  accent: "gold" | "amber" | "amethyst";
  icon: React.ReactNode;
  title: string;
  status: string;
  subtitle?: string;
  action: React.ReactNode;
}) {
  const accentClass =
    accent === "gold"
      ? "text-gold bg-gold/10 border-gold/20"
      : accent === "amber"
        ? "text-amber bg-amber/10 border-amber/20"
        : "text-amethyst bg-amethyst/10 border-amethyst/20";

  return (
    <div className="rounded-xl border border-border bg-ink/30 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-lg border ${accentClass}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-paper text-[13px] font-medium mb-0.5">{title}</p>
          <p className="text-text-secondary text-[12px] leading-snug">{status}</p>
          {subtitle && (
            <p className="text-text-ghost text-[11px] mt-1 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end">{action}</div>
    </div>
  );
}

export default function MonetizationPanel({
  storyId,
  storyTitle,
  isPublic,
  onOpenMetadata,
  onClose,
}: MonetizationPanelProps) {
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<StoryMonetization | null>(null);
  const [circle, setCircle] = useState<CircleStatus | null>(null);
  const [offerings, setOfferings] = useState<OfferingSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      try {
        const [monetizationRes, circleRes, sessionRes] = await Promise.all([
          fetch(`/api/stories/${storyId}/monetization`),
          fetch(`/api/creator/circle`),
          fetch(`/api/auth/session`),
        ]);

        if (!cancelled && monetizationRes.ok) {
          const json = await monetizationRes.json();
          setStory({
            monetizationModel: json.monetizationModel ?? "free",
            freeChapterCount: json.freeChapterCount ?? 5,
            chapters: json.chapters ?? [],
            stats: json.stats ?? {
              totalUnlocks: 0,
              totalDrops: 0,
              creatorRevenue: 0,
            },
          });
        }

        if (!cancelled && circleRes.ok) {
          const json = await circleRes.json();
          if (json.circle) {
            setCircle({
              isActive: !!json.circle.isActive,
              confidantPrice: Number(json.circle.confidantPrice ?? 0),
              subscriberCount: Number(json.subscriberCount ?? 0),
              monthlyIncome: Number(json.monthlyIncome ?? 0),
            });
          } else {
            setCircle(null);
          }
        }

        // Offerings scoped to the current user
        if (!cancelled && sessionRes.ok) {
          const sessionJson = await sessionRes.json();
          const userId = sessionJson?.user?.id;
          if (userId) {
            const offeringsRes = await fetch(
              `/api/scriptorium/offerings?artisanId=${userId}&limit=20`
            );
            if (!cancelled && offeringsRes.ok) {
              const json = await offeringsRes.json();
              setOfferings(
                (json.offerings ?? []).map((o: { id: string; title: string; craft: string }) => ({
                  id: o.id,
                  title: o.title,
                  craft: o.craft,
                }))
              );
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  // ── Derived state ──

  const model: MonetizationModel = story?.monetizationModel ?? "free";
  const gatedChapterCount =
    story?.chapters.filter(
      (c) => c.status === "published" && c.gatingTier && c.gatingTier !== "free"
    ).length ?? 0;
  const totalEarnedFromStory = story?.stats.creatorRevenue ?? 0;
  const hasCircle = !!circle;
  const hasOfferings = offerings.length > 0;

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 380, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col"
    >
      <div className="min-w-[380px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-medium text-paper">Monetization</h3>
            <p className="text-[10px] text-text-ghost mt-0.5 truncate max-w-[260px]">
              {storyTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        {/* Not public warning */}
        {!isPublic && (
          <div className="mx-5 mt-4 rounded-lg border border-amber/20 bg-amber/[0.05] px-3 py-2.5 text-[11px] text-amber/90 leading-relaxed">
            This story isn&apos;t public yet. Monetization kicks in once you
            make it visible from Story Details.
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Recurring income ── */}
              <section className="space-y-3">
                <SectionHeader title="Recurring income" />
                <StatusCard
                  accent="gold"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-3.3 2.7-4 6-4s6 .7 6 4" />
                    </svg>
                  }
                  title="The Circle"
                  status={
                    hasCircle && circle!.isActive
                      ? `${formatNumber(circle!.subscriberCount)} confidant${circle!.subscriberCount === 1 ? "" : "s"} · ~${formatNumber(circle!.monthlyIncome)} drops/month`
                      : hasCircle
                        ? "Circle paused"
                        : "Not set up yet"
                  }
                  subtitle={
                    hasCircle
                      ? `Confidant tier: ${formatNumber(circle!.confidantPrice)} drops/month`
                      : "Offer monthly subscriptions with early access and perks."
                  }
                  action={
                    <Link
                      href="/creator/circle"
                      className="text-gold hover:text-amber text-[12px] tracking-wide transition-colors"
                    >
                      {hasCircle ? "Manage Circle →" : "Set up Circle →"}
                    </Link>
                  }
                />
              </section>

              {/* ── Per-chapter gating ── */}
              <section className="space-y-3">
                <SectionHeader title="This story" />
                <StatusCard
                  accent="amber"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="7" width="10" height="7" rx="1" />
                      <path d="M5 7V5a3 3 0 016 0v2" />
                    </svg>
                  }
                  title={`Model: ${MODEL_LABEL[model]}`}
                  status={
                    model === "free"
                      ? MODEL_DESCRIPTION.free
                      : gatedChapterCount === 0
                        ? "No chapters gated yet"
                        : `${gatedChapterCount} chapter${gatedChapterCount === 1 ? "" : "s"} gated${
                            model === "freemium" && story?.freeChapterCount
                              ? ` · first ${story.freeChapterCount} free`
                              : ""
                          }`
                  }
                  subtitle={MODEL_DESCRIPTION[model]}
                  action={
                    <button
                      onClick={onOpenMetadata}
                      className="text-amber hover:text-gold text-[12px] tracking-wide transition-colors"
                    >
                      Configure gating →
                    </button>
                  }
                />
                {totalEarnedFromStory > 0 && (
                  <div className="rounded-lg border border-border/60 bg-ink/20 px-3 py-2 text-[11px] flex items-center justify-between">
                    <span className="text-text-ghost">Earned from this story</span>
                    <span className="text-amber font-medium tabular-nums">
                      {formatNumber(totalEarnedFromStory)} drops
                    </span>
                  </div>
                )}
              </section>

              {/* ── Commissions ── */}
              <section className="space-y-3">
                <SectionHeader title="Custom work" />
                <StatusCard
                  accent="amethyst"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 3h12v10H2zM5 7h6M5 10h3" />
                    </svg>
                  }
                  title="Commission offerings"
                  status={
                    hasOfferings
                      ? `${offerings.length} active offering${offerings.length === 1 ? "" : "s"}`
                      : "No offerings yet"
                  }
                  subtitle={
                    hasOfferings
                      ? offerings
                          .slice(0, 3)
                          .map((o) => o.title)
                          .join(" · ")
                      : "List commissions — cover art, editing, custom chapters, and more."
                  }
                  action={
                    <Link
                      href="/commissions/offerings"
                      className="text-amethyst hover:text-lavender text-[12px] tracking-wide transition-colors"
                    >
                      {hasOfferings ? "Manage offerings →" : "Create offering →"}
                    </Link>
                  }
                />
              </section>

              {/* ── Earnings overview link ── */}
              <section>
                <Link
                  href="/creator/earnings"
                  className="flex items-center justify-between rounded-xl border border-border bg-ink/20 px-4 py-3 group transition-colors hover:border-border/80 hover:bg-ink/40"
                >
                  <div>
                    <p className="text-[12px] text-paper font-medium">
                      View full earnings breakdown
                    </p>
                    <p className="text-[11px] text-text-ghost mt-0.5">
                      Tips, unlocks, subscriptions, commissions — across all your work.
                    </p>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-text-ghost group-hover:text-paper group-hover:translate-x-0.5 transition-all"
                  >
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </Link>
              </section>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
