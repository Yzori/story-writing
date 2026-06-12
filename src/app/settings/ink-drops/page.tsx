"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const TIERS = [
  {
    key: "500" as const,
    drops: 500,
    price: "$4.99",
    perDrop: "~$0.01",
    label: "Starter",
    description: "Perfect for trying out tipping",
  },
  {
    key: "1200" as const,
    drops: 1200,
    price: "$9.99",
    perDrop: "~$0.008",
    label: "Popular",
    description: "Best value for regular supporters",
    popular: true,
  },
  {
    key: "3000" as const,
    drops: 3000,
    price: "$19.99",
    perDrop: "~$0.007",
    label: "Mega",
    description: "For dedicated patrons of the craft",
  },
];

interface PurchaseRecord {
  amount: number;
  createdAt: string;
}

export default function InkDropsPage() {
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuccess = searchParams.get("success") === "true";
  const dropsAdded = searchParams.get("drops");
  const isCanceled = searchParams.get("canceled") === "true";

  // Fetch balance
  useEffect(() => {
    fetch("/api/user/ink-drops")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setBalance(data.balance))
      .catch(() => {});
  }, []);

  // Fetch purchase history
  useEffect(() => {
    fetch("/api/user/ink-drops/history")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.data && setPurchases(data.data))
      .catch(() => {});
  }, []);

  const handleBuy = async (tier: string) => {
    setPurchasing(tier);
    setError(null);

    try {
      const res = await fetch("/api/user/ink-drops/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Checkout failed");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPurchasing(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-border bg-ink/45 p-5">
          <p className="section-label mb-2 max-w-[160px] text-[10px]">Ink Drops</p>
          <div>
            <h2 className="font-display text-2xl font-semibold text-paper sm:text-3xl">Your inkwell</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-text-secondary">
              Ink is Quiloria&apos;s currency. Keep your well full, then spend it on gifts, unlocks, polls, Circles, and commissions.
            </p>
          </div>
        </div>

        {/* What you can do with Ink Drops */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 rounded-2xl border border-border bg-surface/68 p-5 shadow-[var(--t-shadow-card)] sm:p-6"
        >
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-3">Where your ink goes</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-[12px]">
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
              Leave a gift
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
              Unlock chapters
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
              Join a Circle
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-amethyst shrink-0" />
              Commission work
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
              Vote on Crossroads
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-rose shrink-0" />
              Live tips
            </div>
          </div>
        </motion.div>

        {/* Success/cancel banners */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 px-4 py-3 bg-emerald/10 border border-emerald/20 rounded-lg flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald">
                <path d="M3 8.5l3 3 7-7" />
              </svg>
              <span className="text-sm text-emerald">
                {dropsAdded ? `+${dropsAdded} drops of ink in your well!` : "Purchase successful!"}
              </span>
            </motion.div>
          )}
          {isCanceled && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 px-4 py-3 bg-rose/10 border border-rose/20 rounded-lg"
            >
              <span className="text-sm text-rose">Purchase canceled. No charges were made.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current balance */}
        <div className="mb-6 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.10] to-surface/60 p-5 shadow-[var(--t-shadow-card)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
                <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-ghost">In your well</p>
              <p className="text-2xl font-bold text-gold tabular-nums">
                {balance !== null ? balance.toLocaleString() : "—"}
              </p>
            </div>
            </div>
            <p className="max-w-sm text-[12px] leading-relaxed text-text-secondary">
              Ink is prepaid balance. Purchases are handled through checkout before a single drop is added.
            </p>
          </div>
        </div>

        {/* Tier cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-2xl border p-5 transition-all ${
                tier.popular
                  ? "bg-gold/5 border-gold/25 shadow-[0_0_30px_rgba(200,150,60,0.06)]"
                  : "border-border bg-surface/68 shadow-[var(--t-shadow-card)]"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-gold/15 border border-gold/25 rounded-full text-[10px] font-semibold text-gold uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <div className="text-center mb-4 pt-1">
                <p className="text-sm font-medium text-text-secondary mb-1">{tier.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-paper tabular-nums">
                  {tier.drops.toLocaleString()}
                </p>
                <p className="text-[11px] text-text-ghost">Ink Drops</p>
              </div>

              <div className="text-center mb-4">
                <p className="text-base sm:text-lg font-semibold text-paper">{tier.price}</p>
                <p className="text-[10px] text-text-ghost">{tier.perDrop} per drop</p>
              </div>

              <p className="text-xs text-text-secondary text-center mb-4">
                {tier.description}
              </p>

              <button
                onClick={() => handleBuy(tier.key)}
                disabled={purchasing !== null}
                className={`w-full rounded-lg py-2 text-sm font-medium transition-all cursor-pointer ${
                  tier.popular
                    ? "bg-gold/15 border border-gold/30 text-gold hover:bg-gold/25"
                    : "bg-elevated/50 border border-border text-text hover:border-gold/30 hover:text-gold"
                } ${purchasing === tier.key ? "opacity-70" : ""} disabled:cursor-not-allowed`}
              >
                {purchasing === tier.key ? "Redirecting..." : `Refill +${tier.drops.toLocaleString()}`}
              </button>
            </motion.div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-rose mb-6">{error}</p>
        )}

        {/* Purchase history */}
        {purchases.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Purchase History
            </h2>
            <div className="space-y-2 rounded-2xl border border-border bg-surface/50 p-2">
              {purchases.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 bg-elevated/30 border border-border/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
                      <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
                    </svg>
                    <span className="text-sm text-text">
                      +{p.amount.toLocaleString()} Ink Drops
                    </span>
                  </div>
                  <span className="text-xs text-text-ghost">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
