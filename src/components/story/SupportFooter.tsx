"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { dropsToUsd } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CircleData {
  confidantPrice: number;
  isSubscribed: boolean;
}

interface SupportFooterProps {
  storyId: string;
  writerId: string;
  writerName: string;
  chapterTitle?: string;
  hasNextChapter?: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SupportFooter({
  storyId,
  writerId,
  writerName,
  chapterTitle,
  hasNextChapter,
  isAuthenticated,
  isOwner,
}: SupportFooterProps) {
  const [circle, setCircle] = useState<CircleData | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (isOwner) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/circles/${writerId}`).catch(() => null),
      isAuthenticated ? fetch("/api/user/ink-drops").catch(() => null) : Promise.resolve(null),
    ]).then(async ([cRes, bRes]) => {
      if (!cancelled && cRes?.ok) {
        const j = await cRes.json();
        const circleData = j?.circle ?? j?.data ?? null;
        if (circleData?.confidantPrice) {
          setCircle({
            confidantPrice: circleData.confidantPrice,
            isSubscribed: Boolean(j?.isSubscribed ?? circleData.isSubscribed),
          });
        }
      }
      if (!cancelled && bRes?.ok) {
        const j = await bRes.json();
        setBalance(j.balance ?? 0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [writerId, isAuthenticated, isOwner]);

  const refreshBalance = useCallback(async () => {
    const r = await fetch("/api/user/ink-drops").catch(() => null);
    if (r?.ok) {
      const j = await r.json();
      setBalance(j.balance ?? 0);
    }
  }, []);

  async function handleSubscribe() {
    if (!circle || subscribing) return;
    setSubscribing(true);
    try {
      const res = await fetch(`/api/circles/${writerId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setCircle((c) => (c ? { ...c, isSubscribed: true } : c));
        refreshBalance();
      }
    } finally {
      setSubscribing(false);
    }
  }

  if (isOwner) return null;

  const writerFirst = writerName.split(" ")[0];
  const canSubscribe = circle && !circle.isSubscribed;

  // Contextual headline + primary
  let headline: React.ReactNode;
  let primary: { label: string; onClick?: () => void; href?: string } | null = null;

  if (canSubscribe) {
    headline = (
      <>
        <span className="text-paper">
          {chapterTitle ? `You finished “${chapterTitle}”.` : "You reached the end."}
        </span>{" "}
        <span className="text-text-ghost">
          {hasNextChapter
            ? `${writerFirst} is writing the next.`
            : `Something land?`}
        </span>
      </>
    );
    primary = {
      label: `Subscribe · ${circle?.confidantPrice} drops/mo`,
      onClick: () => isAuthenticated && handleSubscribe(),
    };
  } else if (circle?.isSubscribed) {
    headline = (
      <>
        <span className="text-sage">You&apos;re in the Circle.</span>{" "}
        <span className="text-text-ghost">Liked this chapter?</span>
      </>
    );
    primary = {
      label: "Leave a gift",
      onClick: () => isAuthenticated && setTipOpen(true),
    };
  } else {
    headline = (
      <>
        <span className="text-paper">
          {chapterTitle ? `You finished “${chapterTitle}”.` : "You reached the end."}
        </span>{" "}
        <span className="text-text-ghost">Something land?</span>
      </>
    );
    primary = {
      label: "Leave a gift",
      onClick: () => isAuthenticated && setTipOpen(true),
    };
  }

  return (
    <>
      <div className="relative my-10 overflow-hidden rounded-2xl border border-amber/15 bg-gradient-to-br from-surface to-ink/80 shadow-xl shadow-void/30">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.06),transparent_55%)]" />
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber/25 bg-amber/[0.06] text-amber sm:flex">
            <FlourishIcon />
          </div>

          <p className="min-w-0 flex-1 font-reading text-[14px] leading-relaxed">{headline}</p>

          <div className="flex flex-wrap items-center gap-2">
            {primary && (
              <button
                onClick={primary.onClick}
                disabled={!isAuthenticated || subscribing}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber px-4 py-2 text-[12.5px] font-semibold text-void shadow shadow-amber/15 transition-colors hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {subscribing ? "Sending…" : primary.label}
              </button>
            )}
            {primary?.label !== "Leave a gift" && (
              <button
                onClick={() => isAuthenticated && setTipOpen(true)}
                disabled={!isAuthenticated}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-ink/40 px-3.5 py-2 text-[12px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tip
              </button>
            )}
          </div>
        </div>
        {!isAuthenticated && (
          <div className="relative border-t border-border-subtle px-5 py-2 text-center text-[11.5px] text-text-ghost">
            <Link href="/login" className="text-amber hover:text-amber-light">
              Sign in
            </Link>{" "}
            to support {writerFirst}.
          </div>
        )}
      </div>

      <AnimatePresence>
        {tipOpen && (
          <TipDrawer
            storyId={storyId}
            writerName={writerName}
            balance={balance ?? 0}
            onClose={() => setTipOpen(false)}
            onSent={() => {
              setTipOpen(false);
              refreshBalance();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Tip drawer (same as SupportPanel) ──────────────────────────────────────

function TipDrawer({
  storyId,
  writerName,
  balance,
  onClose,
  onSent,
}: {
  storyId: string;
  writerName: string;
  balance: number;
  onClose: () => void;
  onSent: () => void;
}) {
  const presets = [10, 25, 50, 100, 250];
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const effective = useMemo(() => {
    if (customAmount) {
      const n = parseInt(customAmount, 10);
      return Number.isFinite(n) ? n : 0;
    }
    return amount;
  }, [amount, customAmount]);

  const tooMuch = effective > balance;
  const invalid = effective < 5 || effective > 500;

  async function send() {
    if (sending || tooMuch || invalid) return;
    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effective, message: message.trim() || undefined }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErrorMsg(j.error?.message || "Could not send tip");
        return;
      }
      setSuccess(true);
      setTimeout(onSent, 1500);
    } catch {
      setErrorMsg("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-amber/20 bg-surface shadow-2xl shadow-void/50 sm:rounded-2xl"
      >
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />
        <div className="p-6">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.28em] text-amber/80">A gift to</div>
          <h3 className="font-display text-[22px] font-light text-paper">{writerName}</h3>

          {success ? (
            <div className="mt-5 rounded-xl border border-sage/25 bg-sage/[0.08] p-4 text-center">
              <div className="font-display text-[15px] text-paper">Gift sent.</div>
              <div className="text-[12px] text-text-secondary">{effective} drops · thank you.</div>
            </div>
          ) : (
            <>
              <div className="mt-5">
                <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-text-ghost">How much</div>
                <div className="flex flex-wrap gap-2">
                  {presets.map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setAmount(n);
                        setCustomAmount("");
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                        !customAmount && amount === n
                          ? "border-amber/40 bg-amber/15 text-amber"
                          : "border-border-subtle bg-ink/40 text-text-secondary hover:border-amber/25"
                      }`}
                    >
                      {n} drops
                    </button>
                  ))}
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                    placeholder="custom"
                    className="w-24 rounded-full border border-border-subtle bg-ink/40 px-3 py-1.5 text-[12.5px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30"
                  />
                </div>
                <p className="mt-2 text-[10.5px] text-text-ghost">
                  ≈ ${dropsToUsd(effective)} · between 5 and 500 drops
                </p>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-text-ghost">A note (optional)</div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                  rows={2}
                  placeholder="A word the writer will see…"
                  className="w-full resize-none rounded-xl border border-border-subtle bg-ink/40 px-3 py-2 text-[13px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30"
                />
              </div>

              <div className="mt-4 flex items-baseline justify-between text-[11.5px]">
                <span className="text-text-ghost">Your balance:</span>
                <span className={tooMuch ? "text-rose" : "text-text"}>{balance} drops</span>
              </div>

              {tooMuch && (
                <p className="mt-2 text-[11.5px] text-rose">
                  Not enough drops. <Link href="/pricing" className="underline">Buy more →</Link>
                </p>
              )}
              {errorMsg && <p className="mt-2 text-[11.5px] text-rose">{errorMsg}</p>}

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={send}
                  disabled={sending || tooMuch || invalid}
                  className="flex-1 rounded-full bg-amber px-5 py-3 text-[13px] font-semibold text-void shadow-lg shadow-amber/15 transition-all hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? "Sending…" : `Send ${effective} drops`}
                </button>
                <button onClick={onClose} className="text-[12.5px] text-text-secondary transition-colors hover:text-paper">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function FlourishIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8 Q5 4 8 8 T14 8" />
      <circle cx="8" cy="8" r="1.2" />
    </svg>
  );
}
