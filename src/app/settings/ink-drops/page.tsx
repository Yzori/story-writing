"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

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
  const { data: session } = useSession();
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
    <div className="max-w-3xl mx-auto px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/settings"
            className="text-text-ghost hover:text-paper transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 12L6 8l4-4" />
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-2xl text-paper font-bold">Ink Drops</h1>
            <p className="text-text-secondary text-sm">
              Support creators by tipping during live sessions
            </p>
          </div>
        </div>

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
                {dropsAdded ? `${dropsAdded} Ink Drops added to your balance!` : "Purchase successful!"}
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
        <div className="mb-8 p-5 card-page">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
                <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-ghost">Your Balance</p>
              <p className="text-2xl font-bold text-gold tabular-nums">
                {balance !== null ? balance.toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative p-5 rounded-xl border transition-all ${
                tier.popular
                  ? "bg-gold/5 border-gold/25 shadow-[0_0_30px_rgba(200,150,60,0.06)]"
                  : "card-page"
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
                className={`w-full py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  tier.popular
                    ? "bg-gold/15 border border-gold/30 text-gold hover:bg-gold/25"
                    : "bg-elevated/50 border border-border text-text hover:border-gold/30 hover:text-gold"
                } ${purchasing === tier.key ? "opacity-70" : ""} disabled:cursor-not-allowed`}
              >
                {purchasing === tier.key ? "Redirecting..." : `Buy ${tier.drops}`}
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
            <div className="space-y-2">
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
