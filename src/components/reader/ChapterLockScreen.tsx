"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useToast } from "@/components/shared/Toast";

interface ChapterLockScreenProps {
  storyId: string;
  chapterId: string;
  chapterTitle: string;
  wordCount: number;
  authorName: string;
  tier: "standard" | "extended" | "premium";
  price: number;
  isEarlyAccess?: boolean;
  earlyAccessUntil?: string;
  onUnlocked: () => void;
}

interface BundleInfo {
  bundleAvailable: boolean;
  remaining: number;
  bundlePrice: number;
  savings: number;
  fullPrice: number;
  chapters: { id: string; title: string }[];
}

const TIER_LABELS: Record<ChapterLockScreenProps["tier"], string> = {
  standard: "Standard",
  extended: "Extended",
  premium: "Premium",
};

function formatReadTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 250));
}

function formatWordCount(count: number): string {
  if (count >= 1000) {
    return `~${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }
  return `~${count.toLocaleString()}`;
}

function useCountdown(targetDate: string | undefined) {
  const [remaining, setRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    expired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    function calculate() {
      const now = Date.now();
      const target = new Date(targetDate!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0, expired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setRemaining({ days, hours, minutes, expired: false });
    }

    calculate();
    const interval = setInterval(calculate, 60_000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return remaining;
}

export default function ChapterLockScreen({
  storyId,
  chapterId,
  chapterTitle,
  wordCount,
  authorName,
  tier,
  price,
  isEarlyAccess,
  earlyAccessUntil,
  onUnlocked,
}: ChapterLockScreenProps) {
  const { toast } = useToast();

  const [balance, setBalance] = useState<number | null>(null);
  const [bundle, setBundle] = useState<BundleInfo | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingBundle, setLoadingBundle] = useState(true);

  const [confirmStep, setConfirmStep] = useState<"idle" | "single" | "bundle">("idle");
  const [unlocking, setUnlocking] = useState(false);

  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdown = useCountdown(isEarlyAccess ? earlyAccessUntil : undefined);

  // Fetch balance and bundle info on mount
  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch("/api/user/ink-drops");
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance);
        }
      } catch {
        // silently fail, balance stays null
      } finally {
        setLoadingBalance(false);
      }
    }

    async function fetchBundle() {
      try {
        const res = await fetch(`/api/stories/${storyId}/unlock-bundle`);
        if (res.ok) {
          const data = await res.json();
          if (data.bundleAvailable) {
            setBundle(data);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoadingBundle(false);
      }
    }

    fetchBalance();
    fetchBundle();
  }, [storyId]);

  // Clear confirm timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  const canAffordSingle = balance !== null && balance >= price;
  const canAffordBundle = balance !== null && bundle !== null && balance >= bundle.bundlePrice;

  const handleConfirmStep = useCallback((type: "single" | "bundle") => {
    setConfirmStep(type);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    confirmTimeoutRef.current = setTimeout(() => setConfirmStep("idle"), 5000);
  }, []);

  const handleUnlockSingle = useCallback(async () => {
    if (unlocking) return;
    setUnlocking(true);

    try {
      const res = await fetch(
        `/api/stories/${storyId}/chapters/${chapterId}/unlock`,
        { method: "POST" }
      );
      const data = await res.json();

      if (res.ok && data.unlocked) {
        setBalance(data.newBalance);
        toast("Chapter unlocked", "success");
        onUnlocked();
      } else if (data.error?.code === "INSUFFICIENT_BALANCE") {
        setBalance(null);
        // Re-fetch real balance
        const balRes = await fetch("/api/user/ink-drops");
        if (balRes.ok) {
          const balData = await balRes.json();
          setBalance(balData.balance);
        }
        toast("Not enough Ink Drops", "error");
      } else {
        toast(data.error?.message || "Failed to unlock", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setUnlocking(false);
      setConfirmStep("idle");
    }
  }, [storyId, chapterId, unlocking, onUnlocked, toast]);

  const handleUnlockBundle = useCallback(async () => {
    if (unlocking || !bundle) return;
    setUnlocking(true);

    try {
      const res = await fetch(`/api/stories/${storyId}/unlock-bundle`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.unlocked) {
        setBalance(data.newBalance);
        toast(`${data.chaptersUnlocked} chapters unlocked`, "success");
        onUnlocked();
      } else if (data.error?.code === "INSUFFICIENT_BALANCE") {
        const balRes = await fetch("/api/user/ink-drops");
        if (balRes.ok) {
          const balData = await balRes.json();
          setBalance(balData.balance);
        }
        toast("Not enough Ink Drops", "error");
      } else {
        toast(data.error?.message || "Failed to unlock bundle", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setUnlocking(false);
      setConfirmStep("idle");
    }
  }, [storyId, bundle, unlocking, onUnlocked, toast]);

  const readTime = formatReadTime(wordCount);
  const formattedWords = formatWordCount(wordCount);
  const loading = loadingBalance || loadingBundle;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Chapter info */}
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl text-paper mb-2 leading-snug">
            {chapterTitle}
          </h2>
          <p className="text-text-secondary text-sm font-body">
            by {authorName}
            <span className="mx-2 text-text-ghost">·</span>
            {formattedWords} words
            <span className="mx-2 text-text-ghost">·</span>
            {readTime} min read
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center justify-center mb-8">
          <div className="h-px w-full bg-border" />
        </div>

        {/* Lock card */}
        <div className="rounded-xl border border-border bg-ink/50 p-6 backdrop-blur-sm">
          {/* Price display */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-gold">
              <LockIcon className="h-4 w-4" />
              <span className="font-display text-lg">
                {price} Ink Drops to unlock
              </span>
            </div>
            {tier !== "standard" && (
              <p className="text-text-ghost text-xs mt-1">
                {TIER_LABELS[tier]} chapter
              </p>
            )}
          </div>

          {/* Early access countdown */}
          <AnimatePresence>
            {isEarlyAccess && countdown && !countdown.expired && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="flex items-center justify-center gap-2 rounded-lg bg-surface/50 border border-border-subtle px-4 py-2.5 text-sm text-text-secondary">
                  <ClockIcon className="h-4 w-4 text-text-ghost flex-shrink-0" />
                  <span>
                    Free for everyone in{" "}
                    <span className="text-paper font-medium">
                      {countdown.days > 0 && `${countdown.days}d `}
                      {countdown.hours}h
                      {countdown.days === 0 && ` ${countdown.minutes}m`}
                    </span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action area */}
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
            </div>
          ) : canAffordSingle ? (
            <div className="space-y-3">
              {/* Single unlock */}
              <AnimatePresence mode="wait">
                {confirmStep === "single" ? (
                  <motion.button
                    key="confirm-single"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleUnlockSingle}
                    disabled={unlocking}
                    className="w-full rounded-full bg-gold px-4 py-3 font-display text-sm font-semibold text-void transition-colors hover:bg-gold-light disabled:opacity-50"
                  >
                    {unlocking ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-void/30 border-t-void animate-spin" />
                        Unlocking...
                      </span>
                    ) : (
                      `Confirm — spend ${price} ◆`
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    key="unlock-single"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => handleConfirmStep("single")}
                    className="w-full rounded-lg bg-gold px-4 py-3 font-display text-sm font-semibold text-void transition-colors hover:bg-gold-light"
                  >
                    Unlock Chapter
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Bundle option */}
              {bundle && bundle.remaining > 1 && (
                <AnimatePresence mode="wait">
                  {confirmStep === "bundle" ? (
                    <motion.button
                      key="confirm-bundle"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={handleUnlockBundle}
                      disabled={unlocking || !canAffordBundle}
                      className="w-full rounded-full border border-gold/30 bg-gold/5 px-4 py-2.5 text-sm text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
                    >
                      {unlocking ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
                          Unlocking...
                        </span>
                      ) : (
                        `Confirm — spend ${bundle.bundlePrice} ◆ for all ${bundle.remaining}`
                      )}
                    </motion.button>
                  ) : (
                    <motion.button
                      key="bundle-option"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      onClick={() => handleConfirmStep("bundle")}
                      disabled={!canAffordBundle}
                      className="w-full rounded-full border border-border bg-transparent px-4 py-2.5 text-sm text-text-secondary transition-colors hover:border-gold/30 hover:text-gold disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-secondary"
                    >
                      <span>
                        or unlock all {bundle.remaining} remaining ({bundle.bundlePrice} ◆
                        {bundle.savings > 0 && (
                          <span className="text-emerald ml-1">
                            save {bundle.savings}%
                          </span>
                        )}
                        )
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </div>
          ) : (
            /* Insufficient balance */
            <div className="space-y-3 text-center">
              <p className="text-text-secondary text-sm">
                You need {price} ◆ to unlock this chapter.
              </p>
              <Link
                href="/settings/ink-drops"
                className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 font-display text-sm font-semibold text-void transition-colors hover:bg-gold-light"
              >
                <DropletIcon className="h-4 w-4" />
                Get Ink Drops
              </Link>
            </div>
          )}

          {/* Balance display */}
          {balance !== null && !loading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5 text-center text-xs text-text-ghost"
            >
              Your balance: {balance.toLocaleString()} ◆
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Inline SVG icons ─────────────────────────────────────── */

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function DropletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}
