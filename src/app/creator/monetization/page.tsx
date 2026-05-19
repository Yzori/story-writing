"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import { SOURCE_LABELS } from "@/lib/constants";
import { formatNumber, formatTimeAgo } from "@/lib/format";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EarningsData {
  totalEarned: number;
  totalGross?: number;
  tipCount: number;
  tipsThisMonth: number;
  breakdown: Record<string, { total: number; grossTotal?: number; count: number }>;
  topSupporter: { name: string; totalSent: number } | null;
  recentTips: {
    id: string;
    from: string;
    amount: number;
    grossAmount?: number;
    message: string | null;
    type: string;
    createdAt: string;
  }[];
}

type Tab = "offerings" | "earnings" | "settings";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "offerings", label: "Offerings", hint: "What you're selling" },
  { id: "earnings", label: "Earnings", hint: "What you've earned" },
  { id: "settings", label: "Settings", hint: "Payout and defaults" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MonetizationHubPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const [tab, setTab] = useState<Tab>("offerings");
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [circleData, setCircleData] = useState<{ confidantPrice?: number; subscriberCount?: number; isActive?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [eRes, cRes] = await Promise.all([
        fetch("/api/user/earnings").catch(() => null),
        userId ? fetch(`/api/circles/${userId}`).catch(() => null) : Promise.resolve(null),
      ]);
      if (!cancelled && eRes?.ok) {
        const j = await eRes.json();
        setEarnings(j);
      }
      if (!cancelled && cRes?.ok) {
        const j = await cRes.json();
        const circle = j?.circle ?? j?.data ?? null;
        setCircleData({
          confidantPrice: circle?.confidantPrice,
          subscriberCount: j?.subscriberCount ?? circle?.subscriberCount ?? 0,
          isActive: Boolean(circle?.confidantPrice),
        });
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-void">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">Creator</div>
          <h1 className="font-display text-[36px] font-light text-paper">Monetization</h1>
          <p className="mt-1 max-w-xl text-[14px] text-text-secondary">
            Configure reader support and track the creator share that reaches you.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="mt-8 flex items-center gap-1 border-b border-border-subtle">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-5 py-3 text-[13px] font-medium transition-colors ${
                tab === t.id ? "text-amber" : "text-text-secondary hover:text-paper"
              }`}
            >
              <span className="block">{t.label}</span>
              <span className="block text-[10.5px] font-normal italic text-text-ghost">{t.hint}</span>
              {tab === t.id && (
                <motion.div
                  layoutId="monetization-tab-indicator"
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-amber"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "offerings" && (
            <motion.section
              key="offerings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-8"
            >
              <OfferingsTab circleData={circleData} earnings={earnings} loading={loading} />
            </motion.section>
          )}
          {tab === "earnings" && (
            <motion.section
              key="earnings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-8"
            >
              <EarningsTab earnings={earnings} loading={loading} />
            </motion.section>
          )}
          {tab === "settings" && (
            <motion.section
              key="settings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-8"
            >
              <SettingsTab />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Offerings tab ───────────────────────────────────────────────────────────

function OfferingsTab({
  circleData,
  earnings,
  loading,
}: {
  circleData: { confidantPrice?: number; subscriberCount?: number; isActive?: boolean } | null;
  earnings: EarningsData | null;
  loading: boolean;
}) {
  const circleMRR = circleData?.isActive && circleData.subscriberCount && circleData.confidantPrice
    ? circleData.subscriberCount * circleData.confidantPrice
    : 0;
  const tipsTotal = (earnings?.breakdown?.tip?.total ?? 0) + (earnings?.breakdown?.donation?.total ?? 0);
  const unlockTotal = (earnings?.breakdown?.unlock?.total ?? 0) + (earnings?.breakdown?.bundle?.total ?? 0);
  const commissionTotal = earnings?.breakdown?.commission?.total ?? 0;
  const crossroadTotal = (earnings?.breakdown?.crossroad?.total ?? 0) + (earnings?.breakdown?.crossroads?.total ?? 0);

  return (
    <div>
      <p className="mb-5 text-[12.5px] text-text-ghost">
        Each card shows setup state and net creator-share earnings after the platform split.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <OfferingCard
          status={circleData?.isActive ? "active" : "needs-setup"}
          icon={<CircleGlyph />}
          title="The Circle"
          body="Monthly subscribers get early chapters and a private chat."
          setup={
            circleData?.isActive
              ? `${circleData.subscriberCount ?? 0} subscriber${(circleData.subscriberCount ?? 0) === 1 ? "" : "s"} · ${circleMRR} drops / mo`
              : "Needs a price and published chapters"
          }
          earnings={circleMRR > 0 ? `Projected monthly net: ${formatNumber(Math.floor(circleMRR * 0.7))} drops` : "No Circle revenue yet"}
          action={{ label: circleData?.isActive ? "Manage Circle" : "Set up Circle", href: "/creator/circle" }}
          loading={loading}
          accent="amber"
        />

        <OfferingCard
          status="available"
          icon={<TipGlyph />}
          title="Donations"
          body="One-off tips from readers with optional notes."
          setup="Available anywhere the support panel appears"
          earnings={tipsTotal > 0 ? `Net earned: ${formatNumber(tipsTotal)} drops · ${earnings?.tipCount ?? 0} gifts` : "No gift revenue yet"}
          action={{ label: "View tips", href: "/creator/earnings" }}
          loading={loading}
          accent="rose"
        />

        <OfferingCard
          status="available"
          icon={<UnlockGlyph />}
          title="Chapter gating"
          body="Charge drops to unlock individual chapters or bundles."
          setup="Configured per chapter in the editor"
          earnings={unlockTotal > 0 ? `Net earned: ${formatNumber(unlockTotal)} drops` : "No unlock revenue yet"}
          action={{ label: "Open dashboard", href: "/dashboard" }}
          loading={loading}
          accent="copper"
        />

        <OfferingCard
          status={commissionTotal > 0 ? "active" : "needs-setup"}
          icon={<CommissionGlyph />}
          title="Commissions"
          body="Custom work for hire listed in Commissions."
          setup={commissionTotal > 0 ? "Offering has paid activity" : "List an offering to start"}
          earnings={commissionTotal > 0 ? `Net earned: ${formatNumber(commissionTotal)} drops` : "No commission revenue yet"}
          action={{ label: "Manage offerings", href: "/commissions/offerings" }}
          loading={loading}
          accent="sage"
        />

        <OfferingCard
          status={crossroadTotal > 0 ? "active" : "available"}
          icon={<CrossroadGlyph />}
          title="Crossroads"
          body="Readers spend drops to weigh in on a story decision."
          setup="Created from a story when you want reader input"
          earnings={crossroadTotal > 0 ? `Net earned: ${formatNumber(crossroadTotal)} drops` : "No crossroad revenue yet"}
          action={{ label: "View stories", href: "/dashboard" }}
          loading={loading}
          accent="violet"
        />

        <OfferingCard
          status="coming-soon"
          icon={<BoostGlyph />}
          title="Boost"
          body="Pay to lift a story in browse for a set window."
          setup="Not available yet"
          earnings="No creator revenue impact"
          action={{ label: "Coming soon", href: "/creator/boost", disabled: true }}
          loading={loading}
          accent="lavender"
        />
      </div>
    </div>
  );
}

function OfferingCard({
  status,
  icon,
  title,
  body,
  setup,
  earnings,
  action,
  loading,
  accent,
}: {
  status: "active" | "available" | "needs-setup" | "coming-soon";
  icon: React.ReactNode;
  title: string;
  body: string;
  setup: string;
  earnings: string;
  action: { label: string; href: string; disabled?: boolean };
  loading: boolean;
  accent: "amber" | "rose" | "copper" | "sage" | "violet" | "lavender";
}) {
  const accentClass = {
    amber: "border-amber/25 text-amber bg-amber/[0.06]",
    rose: "border-rose/25 text-rose bg-rose/[0.06]",
    copper: "border-copper/25 text-copper bg-copper/[0.06]",
    sage: "border-sage/25 text-sage bg-sage/[0.06]",
    violet: "border-violet/25 text-violet bg-violet/[0.06]",
    lavender: "border-lavender/25 text-lavender bg-lavender/[0.06]",
  }[accent];
  const statusClass = {
    active: "border-sage/25 bg-sage/[0.08] text-sage",
    available: "border-lavender/25 bg-lavender/[0.08] text-lavender",
    "needs-setup": "border-amber/25 bg-amber/[0.06] text-amber",
    "coming-soon": "border-border-subtle bg-ink/40 text-text-ghost",
  }[status];
  const statusLabel = {
    active: "active",
    available: "available",
    "needs-setup": "setup",
    "coming-soon": "soon",
  }[status];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-5 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${accentClass}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-[18px] text-paper">{title}</h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{body}</p>
        </div>
      </div>

      <div className="mt-4 space-y-1 border-t border-border-subtle pt-3 text-[12px]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-text-ghost">Setup</span>
          <span className="text-right text-text-secondary">{loading ? "..." : setup}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-text-ghost">Creator share</span>
          <span className="text-right text-paper">{loading ? "..." : earnings}</span>
        </div>
      </div>

      <div className="mt-3">
        {action.disabled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-ink/40 px-3 py-1.5 text-[11.5px] italic text-text-ghost">
            {action.label}
          </span>
        ) : (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-ink/40 px-3 py-1.5 text-[11.5px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
          >
            {action.label}
            <ArrowGlyph />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Earnings tab ────────────────────────────────────────────────────────────

function EarningsTab({ earnings, loading }: { earnings: EarningsData | null; loading: boolean }) {
  const breakdownEntries = useMemo(() => {
    if (!earnings?.breakdown) return [] as { source: string; label: string; total: number; count: number }[];
    return Object.entries(earnings.breakdown)
      .map(([source, v]) => ({
        source,
        label: SOURCE_LABELS[source]?.label ?? source,
        total: v.total,
        count: v.count,
      }))
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [earnings]);

  const total = earnings?.totalEarned ?? 0;
  const month = earnings?.tipsThisMonth ?? 0;

  return (
    <div className="space-y-6">
      {/* Headline stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Net creator share" value={loading ? "..." : `${formatNumber(total)} drops`} accent="amber" />
        <StatCard label="Net this month" value={loading ? "..." : `${formatNumber(month)} drops`} accent="copper" />
        <StatCard label="Top supporter" value={loading ? "..." : earnings?.topSupporter?.name ?? "-"} sub={earnings?.topSupporter ? `${formatNumber(earnings.topSupporter.totalSent)} drops sent` : undefined} accent="rose" />
      </div>

      {/* Breakdown by source */}
      <div className="rounded-2xl border border-border bg-surface/60 p-5">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">Net by source</div>
        <p className="mb-3 text-[11.5px] text-text-ghost">These totals show the creator share credited to you.</p>
        {loading ? (
          <p className="py-6 text-center text-[13px] text-text-ghost">Loading...</p>
        ) : breakdownEntries.length === 0 ? (
          <p className="py-6 text-center text-[13px] italic text-text-ghost">No earnings yet.</p>
        ) : (
          <div className="space-y-3">
            {breakdownEntries.map((e) => {
              const pct = total > 0 ? (e.total / total) * 100 : 0;
              return (
                <div key={e.source}>
                  <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
                    <span className="text-paper">{e.label}</span>
                    <span className="text-text-secondary">
                      {formatNumber(e.total)} net drops · {e.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink">
                    <div className="h-full rounded-full bg-amber/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent tips strip */}
      {(earnings?.recentTips?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border bg-surface/60 p-5">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">Recent tips</div>
          <div className="space-y-3">
            {earnings!.recentTips.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-start gap-3 border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/[0.08] text-amber font-display text-[12px]">
                  {t.from.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-paper">{t.from}</span>
                    <span className="shrink-0 text-[11.5px] text-amber">{formatNumber(t.amount)} net drops</span>
                  </div>
                  {t.message && (
                    <p className="mt-1 line-clamp-2 font-reading text-[12.5px] italic text-text-secondary">&ldquo;{t.message}&rdquo;</p>
                  )}
                  <p className="mt-1 text-[10.5px] text-text-ghost">{formatTimeAgo(t.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/creator/earnings"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-amber transition-colors hover:text-amber-light"
          >
            See all earnings
            <ArrowGlyph />
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: "amber" | "copper" | "rose" }) {
  const cls = {
    amber: "border-amber/20 bg-amber/[0.04]",
    copper: "border-copper/20 bg-copper/[0.04]",
    rose: "border-rose/20 bg-rose/[0.04]",
  }[accent];
  return (
    <div className={`rounded-2xl border ${cls} p-4`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">{label}</div>
      <div className="mt-2 font-display text-[22px] text-paper">{value}</div>
      {sub && <div className="text-[11.5px] text-text-secondary">{sub}</div>}
    </div>
  );
}

// ─── Settings tab ────────────────────────────────────────────────────────────

function SettingsTab() {
  return (
    <div className="space-y-4">
      <SettingsRow
        title="Payout method"
        body="Stripe Connect bank account for converting drops to currency. Required before withdrawals."
        href="/settings/billing"
        cta="Manage payout"
      />
      <SettingsRow
        title="Drops & currency"
        body="See purchase tiers and how reader spend converts into platform drops."
        href="/pricing"
        cta="Open pricing"
      />
      <SettingsRow
        title="Ink Drops balance"
        body="Your spendable drops and transaction history."
        href="/settings/ink-drops"
        cta="Open drops"
      />
      <div className="rounded-2xl border border-border-subtle bg-surface/40 p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">Coming soon</div>
        <p className="mt-2 text-[13px] text-text-secondary leading-relaxed">
          Per-product enable/disable toggles · default gating tier · supporter privacy settings · tax info.
        </p>
      </div>
    </div>
  );
}

function SettingsRow({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface/60 p-5">
      <div className="min-w-0">
        <h3 className="font-display text-[16px] text-paper">{title}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{body}</p>
      </div>
      <Link
        href={href}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-ink/40 px-3.5 py-2 text-[12px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
      >
        {cta}
        <ArrowGlyph />
      </Link>
    </div>
  );
}

// ─── Glyphs ─────────────────────────────────────────────────────────────────

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function CircleGlyph() { return <Glyph><circle cx="8" cy="8" r="5" /><path d="M8 3v10M3 8h10" /></Glyph>; }
function TipGlyph() { return <Glyph><path d="M8 3.5c-1.6-1.8-4.5-1.2-4.5 1.4 0 2.6 4.5 5.6 4.5 5.6s4.5-3 4.5-5.6c0-2.6-2.9-3.2-4.5-1.4Z" /></Glyph>; }
function UnlockGlyph() { return <Glyph><rect x="3.5" y="7.5" width="9" height="6" rx="1.2" /><path d="M5.5 7.5V5a2.5 2.5 0 0 1 5 0" /></Glyph>; }
function CommissionGlyph() { return <Glyph><path d="M3 13l5-10 5 10M5.5 9.5h5" /></Glyph>; }
function CrossroadGlyph() { return <Glyph><path d="M8 2v12M2 8h12" /><circle cx="8" cy="8" r="1.2" /></Glyph>; }
function BoostGlyph() { return <Glyph><path d="M8 13V3M4 7l4-4 4 4" /></Glyph>; }
function ArrowGlyph() { return <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
