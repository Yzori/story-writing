"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { dropsToUsd } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CircleData {
  confidantPrice: number;
  confidantDescription: string | null;
  earlyAccessDays: number;
  subscriberCount: number;
  isSubscribed: boolean;
}

interface ActiveCrossroad {
  id: string;
  question: string;
  closesAt: string;
}

interface SupportPanelProps {
  storyId: string;
  storyTitle: string;
  writerId: string;
  writerName: string;
  writerHandle?: string | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  /** Anchor id of the existing CrossroadsPanel on the page, for scroll-to-vote. */
  crossroadAnchorId?: string;
  /** If provided, called when the user clicks the crossroad preview. Use this to switch tabs before scrolling. */
  onCrossroadClick?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SupportPanel({
  storyId,
  storyTitle,
  writerId,
  writerName,
  writerHandle,
  isAuthenticated,
  isOwner,
  crossroadAnchorId = "crossroads",
  onCrossroadClick,
}: SupportPanelProps) {
  const [circle, setCircle] = useState<CircleData | null>(null);
  const [crossroad, setCrossroad] = useState<ActiveCrossroad | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const [tipOpen, setTipOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [circleRes, crossroadRes, balanceRes] = await Promise.all([
        fetch(`/api/circles/${writerId}`).catch(() => null),
        fetch(`/api/stories/${storyId}/crossroads`).catch(() => null),
        isAuthenticated ? fetch("/api/user/ink-drops").catch(() => null) : Promise.resolve(null),
      ]);

      if (!cancelled && circleRes?.ok) {
        const j = await circleRes.json();
        const circleData = j?.circle ?? j?.data ?? null;
        if (circleData?.confidantPrice) {
          setCircle({
            confidantPrice: circleData.confidantPrice,
            confidantDescription: circleData.confidantDescription ?? null,
            earlyAccessDays: circleData.earlyAccessDays ?? 7,
            subscriberCount: j?.subscriberCount ?? circleData.subscriberCount ?? 0,
            isSubscribed: Boolean(j?.isSubscribed ?? circleData.isSubscribed),
          });
        }
      }
      if (!cancelled && crossroadRes?.ok) {
        const j = await crossroadRes.json();
        const list: ActiveCrossroad[] = Array.isArray(j?.crossroads)
          ? j.crossroads
          : Array.isArray(j?.data)
            ? j.data
            : [];
        const live = list.find((c) => new Date(c.closesAt).getTime() > Date.now());
        if (live) setCrossroad(live);
      }
      if (!cancelled && balanceRes?.ok) {
        const j = await balanceRes.json();
        setBalance(j.balance ?? 0);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [storyId, writerId, isAuthenticated]);

  const refreshBalance = useCallback(async () => {
    const r = await fetch("/api/user/ink-drops").catch(() => null);
    if (r?.ok) {
      const j = await r.json();
      setBalance(j.balance ?? 0);
    }
  }, []);

  // ── Owner: don't show the panel for your own story ────────────────────
  if (isOwner) return null;

  // ── Decide primary action ─────────────────────────────────────────────
  const canSubscribe = circle && !circle.isSubscribed;
  let primary: "circle" | "tip" = "tip";
  if (canSubscribe) primary = "circle";

  // ── Subscribe handler ─────────────────────────────────────────────────
  async function handleSubscribe() {
    if (!circle || subscribing) return;
    setSubscribing(true);
    setSubscribeError(null);
    try {
      const res = await fetch(`/api/circles/${writerId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const j = await res.json();
      if (!res.ok) {
        setSubscribeError(j.error?.message || "Could not subscribe");
        return;
      }
      setCircle((prev) => (prev ? { ...prev, isSubscribed: true, subscriberCount: prev.subscriberCount + 1 } : prev));
      refreshBalance();
    } catch {
      setSubscribeError("Network error");
    } finally {
      setSubscribing(false);
    }
  }

  const writerFirst = writerName.split(" ")[0];

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-amber/20 bg-gradient-to-br from-surface via-surface to-ink/90 shadow-2xl shadow-void/30">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.10),transparent_55%)]" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-copper/[0.08] blur-3xl" />

        <div className="relative p-5 sm:p-6">
          {/* Header */}
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">
            A way to stand with
          </div>
          <h3 className="font-display text-[22px] font-light leading-tight text-paper">
            {writerName}
          </h3>
          <p className="mt-1 text-[12px] text-text-ghost">
            {storyTitle}
            {writerHandle && <span> · {writerHandle}</span>}
          </p>

          {/* Crossroad — surface only when live */}
          {crossroad && (
            <a
              href={`#${crossroadAnchorId}`}
              onClick={(e) => {
                if (onCrossroadClick) {
                  e.preventDefault();
                  onCrossroadClick();
                  // wait a tick so the target tab can render before scrolling
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      document
                        .getElementById(crossroadAnchorId)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  });
                }
              }}
              className="mt-5 block rounded-xl border border-violet/25 bg-violet/[0.06] p-4 transition-colors hover:border-violet/40 hover:bg-violet/[0.08]"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet/15 text-violet">
                    <CrossroadIcon />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet/90">A crossroad is live</span>
                </div>
                <span className="text-[10.5px] text-text-ghost">{relativeUntil(crossroad.closesAt)}</span>
              </div>
              <p className="font-reading text-[13px] italic leading-snug text-text">
                &ldquo;{crossroad.question}&rdquo;
              </p>
              <div className="mt-2 text-[11px] text-violet">Vote with drops</div>
            </a>
          )}

          {/* Primary action */}
          <div className="mt-5">
            {primary === "circle" && circle ? (
              <PrimaryCard
                icon={<CircleIcon />}
                title={`Join ${writerFirst}'s Circle`}
                meta={`${circle.confidantPrice} drops / mo`}
                body={
                  circle.confidantDescription ||
                  `Subscribe for early access ${circle.earlyAccessDays} days ahead, behind-the-scenes notes, and the Circle chat.`
                }
                onClick={() => {
                  if (!isAuthenticated) return;
                  handleSubscribe();
                }}
                disabled={!isAuthenticated || subscribing}
                hint={!isAuthenticated ? "Sign in to subscribe" : undefined}
              />
            ) : circle?.isSubscribed ? (
              <div className="rounded-xl border border-sage/25 bg-sage/[0.08] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sage/30 bg-sage/[0.08] text-sage">
                    <CheckIcon />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-[15px] text-paper">You&apos;re in the Circle</div>
                    <div className="text-[11.5px] text-text-secondary">Early access · behind-the-scenes</div>
                  </div>
                </div>
              </div>
            ) : (
              <PrimaryCard
                icon={<TipIcon />}
                title="Leave a gift"
                meta="any amount"
                body="One-off, no commitment — just because the writing landed."
                onClick={() => {
                  if (!isAuthenticated) return;
                  setTipOpen(true);
                }}
                hint={!isAuthenticated ? "Sign in to tip" : undefined}
              />
            )}
            {subscribeError && (
              <p className="mt-2 text-center text-[11.5px] text-rose">{subscribeError}</p>
            )}
          </div>

          {/* Secondary actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {primary !== "tip" && (
              <SecondaryChip
                icon={<TipIcon />}
                label="Leave a gift"
                meta="one-time support"
                onClick={() => {
                  if (!isAuthenticated) return;
                  setTipOpen(true);
                }}
                disabled={!isAuthenticated}
              />
            )}
            {primary !== "circle" && circle && !circle.isSubscribed && (
              <SecondaryChip
                icon={<CircleIcon />}
                label={`Join the Circle`}
                meta={`${circle.confidantPrice} drops / mo`}
                onClick={() => {
                  if (!isAuthenticated) return;
                  handleSubscribe();
                }}
                disabled={!isAuthenticated || subscribing}
              />
            )}
            {writerHandle && (
              <SecondaryChip
                icon={<CommissionIcon />}
                label="Commission them"
                meta="custom work"
                href="/commissions"
              />
            )}
          </div>

          {/* Currency footer */}
          {isAuthenticated && (
            <div className="mt-5 flex items-center justify-between border-t border-border-subtle pt-4 text-[11.5px]">
              <span className="text-text-ghost">
                Your balance:{" "}
                <span className="font-medium text-paper">
                  {balance === null ? "…" : `${balance} drops`}
                </span>
              </span>
              <Link href="/pricing" className="text-amber transition-colors hover:text-amber-light">
                Buy more →
              </Link>
            </div>
          )}

          {!isAuthenticated && (
            <div className="mt-5 border-t border-border-subtle pt-4 text-center text-[12px] text-text-ghost">
              <Link href="/login" className="text-amber hover:text-amber-light">
                Sign in
              </Link>{" "}
              to support {writerFirst}.
            </div>
          )}
        </div>
      </section>

      {/* Tip drawer */}
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

// ─── Primary action card ─────────────────────────────────────────────────────

function PrimaryCard({
  icon,
  title,
  meta,
  body,
  onClick,
  disabled,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  body: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <>
      <button
        onClick={onClick}
        disabled={disabled}
        className="group relative w-full overflow-hidden rounded-xl border border-amber/40 bg-gradient-to-br from-amber/15 to-amber/[0.05] p-4 text-left transition-all hover:border-amber/60 hover:shadow-lg hover:shadow-amber/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber/30 bg-amber/[0.08] text-amber">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-[16px] text-paper">{title}</span>
              <span className="shrink-0 font-mono text-[11.5px] text-amber">{meta}</span>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{body}</p>
          </div>
        </div>
      </button>
      {hint && <p className="mt-1.5 text-center text-[11px] italic text-text-ghost">{hint}</p>}
    </>
  );
}

// ─── Secondary chip ──────────────────────────────────────────────────────────

function SecondaryChip({
  icon,
  label,
  meta,
  href,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = `group flex items-center gap-2.5 rounded-xl border border-border-subtle bg-ink/40 px-3 py-2.5 text-left transition-colors hover:border-amber/25 hover:bg-amber/[0.04] ${
    disabled ? "cursor-not-allowed opacity-50" : ""
  }`;
  const inner = (
    <>
      <div className="text-text-ghost transition-colors group-hover:text-amber">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] text-paper">{label}</div>
        <div className="truncate text-[10.5px] italic text-text-ghost">{meta}</div>
      </div>
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {inner}
    </button>
  );
}

// ─── Tip drawer (calls /api/stories/[id]/donate) ────────────────────────────

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
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-sage/30 bg-sage/15 text-sage">
                <CheckIcon />
              </div>
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `ends in ${days}d`;
  if (hours > 0) return `ends in ${hours}h`;
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `ends in ${mins}m`;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function CircleIcon() {
  return (
    <Glyph>
      <circle cx="8" cy="8" r="5" />
      <path d="M8 3v10M3 8h10" />
    </Glyph>
  );
}
function TipIcon() {
  return (
    <Glyph>
      <path d="M8 3.5c-1.6-1.8-4.5-1.2-4.5 1.4 0 2.6 4.5 5.6 4.5 5.6s4.5-3 4.5-5.6c0-2.6-2.9-3.2-4.5-1.4Z" />
    </Glyph>
  );
}
function CommissionIcon() {
  return (
    <Glyph>
      <path d="M3 13l5-10 5 10M5.5 9.5h5" />
    </Glyph>
  );
}
function CrossroadIcon() {
  return (
    <Glyph>
      <path d="M8 2v12M2 8h12" />
      <circle cx="8" cy="8" r="1.2" />
    </Glyph>
  );
}
function CheckIcon() {
  return (
    <Glyph>
      <path d="M3 8.2 6.4 11.5 13 4.5" />
    </Glyph>
  );
}
