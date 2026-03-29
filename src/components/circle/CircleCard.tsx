"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────────

interface CircleData {
  confidantPrice: number;
  confidantDescription: string | null;
  earlyAccessDays: number;
  subscriberCount: number;
  isSubscribed: boolean;
}

interface CircleCardProps {
  creatorId: string;
  creatorName: string;
  /** If not provided, component fetches from API */
  circleData?: CircleData | null;
}

interface Subscription {
  renewalDate: string;
  priceAtSubscription: number;
}

type CardState =
  | "loading"
  | "inactive"
  | "not-subscribed"
  | "subscribed"
  | "cancelled";

// ── Helpers ─────────────────────────────────────────────────

/** Approximate USD value: 100 drops ~ $1 */
function dropsToUsd(drops: number): string {
  return (drops / 100).toFixed(2);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Quill Icon ──────────────────────────────────────────────

function QuillIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
  );
}

// ── Confirm Modal ───────────────────────────────────────────

function ConfirmModal({
  creatorName,
  price,
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  creatorName: string;
  price: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="mx-4 w-full max-w-sm rounded-xl border border-border bg-ink p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg text-paper">
          Join {creatorName}&apos;s Circle?
        </h3>
        <p className="mt-3 text-sm text-text-secondary">
          You&apos;ll become a <span className="text-gold">Confidant</span> and
          be charged{" "}
          <span className="font-medium text-paper">
            {price} drops/month
          </span>{" "}
          (~${dropsToUsd(price)} USD). This renews automatically every 30 days.
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-rose">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-void transition-colors hover:bg-amber disabled:opacity-50"
          >
            {loading ? "Joining..." : "Confirm"}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-paper disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Cancel Confirm Modal ────────────────────────────────────

function CancelModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="mx-4 w-full max-w-sm rounded-xl border border-border bg-ink p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg text-paper">Leave this Circle?</h3>
        <p className="mt-3 text-sm text-text-secondary">
          You&apos;ll keep your Confidant access until your current billing
          period ends. No further charges will be made.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg border border-rose/40 bg-rose/10 px-4 py-2.5 text-sm font-medium text-rose transition-colors hover:bg-rose/20 disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Leave Circle"}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-paper disabled:opacity-50"
          >
            Keep Membership
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function CircleCard({
  creatorId,
  creatorName,
  circleData: initialData,
}: CircleCardProps) {
  const [state, setState] = useState<CardState>(
    initialData === undefined ? "loading" : initialData === null ? "inactive" : initialData.isSubscribed ? "subscribed" : "not-subscribed"
  );
  const [circle, setCircle] = useState<CircleData | null>(initialData ?? null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(
    initialData?.subscriberCount ?? 0
  );

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Transient messages
  const [welcomeMessage, setWelcomeMessage] = useState(false);
  const [accessUntil, setAccessUntil] = useState<string | null>(null);

  // ── Fetch circle data on mount if not provided ──
  const fetchCircle = useCallback(async () => {
    try {
      const res = await fetch(`/api/circles/${creatorId}`);
      if (!res.ok) {
        setState("inactive");
        return;
      }
      const data = await res.json();

      if (!data.circle || !data.circle.isActive) {
        setState("inactive");
        return;
      }

      const fetched: CircleData = {
        confidantPrice: data.circle.confidantPrice,
        confidantDescription: data.circle.confidantDescription,
        earlyAccessDays: data.circle.earlyAccessDays,
        subscriberCount: data.subscriberCount,
        isSubscribed: data.isSubscribed,
      };

      setCircle(fetched);
      setSubscriberCount(data.subscriberCount);

      if (data.subscription) {
        setSubscription({
          renewalDate: data.subscription.renewalDate,
          priceAtSubscription: data.subscription.priceAtSubscription,
        });
      }

      setState(data.isSubscribed ? "subscribed" : "not-subscribed");
    } catch {
      setState("inactive");
    }
  }, [creatorId]);

  useEffect(() => {
    if (initialData === undefined) {
      fetchCircle();
    }
  }, [initialData, fetchCircle]);

  // ── Subscribe ──
  const handleSubscribe = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/circles/${creatorId}/subscribe`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "INSUFFICIENT_BALANCE") {
          setActionError("insufficient_balance");
          return;
        }
        if (data.error?.code === "UNAUTHORIZED") {
          setActionError("Please sign in to join this Circle.");
          return;
        }
        setActionError(data.error?.message ?? "Something went wrong.");
        return;
      }

      // Success
      setShowConfirmModal(false);
      setSubscription({
        renewalDate: data.subscription.renewalDate,
        priceAtSubscription: data.subscription.priceAtSubscription,
      });
      setSubscriberCount((c) => c + 1);
      setState("subscribed");
      setWelcomeMessage(true);
      setTimeout(() => setWelcomeMessage(false), 4000);
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Cancel ──
  const handleCancel = async () => {
    setActionLoading(true);

    try {
      const res = await fetch(`/api/circles/${creatorId}/subscribe`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        return;
      }

      setShowCancelModal(false);
      setAccessUntil(data.accessUntil);
      setState("cancelled");
    } catch {
      // silently handle
    } finally {
      setActionLoading(false);
    }
  };

  // ── Don't render anything for inactive/non-existent circles ──
  if (state === "inactive") return null;

  // ── Loading ──
  if (state === "loading") {
    return (
      <div className="rounded-xl border border-border bg-ink/50 p-6">
        <div className="flex animate-pulse flex-col gap-3">
          <div className="h-5 w-2/3 rounded bg-elevated" />
          <div className="h-4 w-1/2 rounded bg-elevated" />
          <div className="mt-2 h-10 w-full rounded-lg bg-elevated" />
        </div>
      </div>
    );
  }

  const price = circle?.confidantPrice ?? 0;

  // ── Subscribed state ──
  if (state === "subscribed") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative rounded-xl border border-gold/20 bg-ink/50 p-6"
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-b from-gold/5 to-transparent" />

        <AnimatePresence>
          {welcomeMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-center text-sm text-gold"
            >
              Welcome to the Circle
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
            <QuillIcon className="h-4 w-4 text-gold" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base text-paper">
              You&apos;re a Confidant
            </p>
            <p className="mt-0.5 text-xs text-text-ghost">
              {creatorName}&apos;s Circle
            </p>
          </div>
        </div>

        {subscription?.renewalDate && (
          <p className="relative mt-4 text-xs text-text-ghost">
            Renews {formatDate(subscription.renewalDate)} at{" "}
            {subscription.priceAtSubscription ?? price} drops/month
          </p>
        )}

        <button
          onClick={() => setShowCancelModal(true)}
          className="relative mt-3 text-xs text-text-ghost transition-colors hover:text-rose"
        >
          Leave Circle
        </button>

        <AnimatePresence>
          {showCancelModal && (
            <CancelModal
              onConfirm={handleCancel}
              onCancel={() => setShowCancelModal(false)}
              loading={actionLoading}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── Cancelled state ──
  if (state === "cancelled") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-border bg-ink/50 p-6"
      >
        <p className="font-display text-base text-paper">
          Membership cancelled
        </p>
        {accessUntil && (
          <p className="mt-2 text-sm text-text-secondary">
            You still have Confidant access until{" "}
            <span className="text-paper">{formatDate(accessUntil)}</span>.
          </p>
        )}
      </motion.div>
    );
  }

  // ── Not subscribed state ──
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative rounded-xl border border-border bg-ink/50 p-6"
      >
        {/* Header */}
        <h3 className="font-display text-lg text-paper">
          Join {creatorName}&apos;s Circle
        </h3>

        {/* Tier row */}
        <div className="mt-4 flex items-center gap-2">
          <QuillIcon className="h-4 w-4 text-gold" />
          <span className="font-display text-sm text-gold">Confidant</span>
        </div>

        {/* Description */}
        {circle?.confidantDescription && (
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {circle.confidantDescription}
          </p>
        )}

        {/* Price */}
        <div className="mt-4">
          <span className="text-2xl font-semibold text-paper">{price}</span>
          <span className="ml-1.5 text-sm text-text-ghost">drops/month</span>
          <span className="ml-2 text-xs text-text-ghost">
            (~${dropsToUsd(price)} USD)
          </span>
        </div>

        {/* Perks */}
        <ul className="mt-4 space-y-2.5">
          {[
            `Early chapter access (${circle?.earlyAccessDays ?? 3} days early)`,
            "Confidant badge on comments",
            "Private discussions with the creator",
          ].map((perk) => (
            <li
              key={perk}
              className="flex items-start gap-2 text-sm text-text-secondary"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="mt-0.5 h-4 w-4 shrink-0 text-gold"
              >
                <path
                  d="M3 8.5L6.5 12L13 4"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        {/* Subscriber count */}
        {subscriberCount > 0 && (
          <p className="mt-4 text-xs text-text-ghost">
            {subscriberCount} {subscriberCount === 1 ? "reader" : "readers"} in
            this Circle
          </p>
        )}

        {/* CTA */}
        <button
          onClick={() => {
            setActionError(null);
            setShowConfirmModal(true);
          }}
          className="mt-5 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-void transition-colors hover:bg-amber"
        >
          Join the Circle
        </button>
      </motion.div>

      {/* Confirm modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <ConfirmModal
            creatorName={creatorName}
            price={price}
            onConfirm={handleSubscribe}
            onCancel={() => {
              setShowConfirmModal(false);
              setActionError(null);
            }}
            loading={actionLoading}
            error={
              actionError === "insufficient_balance"
                ? null
                : actionError
            }
          />
        )}
      </AnimatePresence>

      {/* Insufficient balance overlay — shown inside confirm modal area */}
      <AnimatePresence>
        {showConfirmModal && actionError === "insufficient_balance" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-void/60 backdrop-blur-sm"
            onClick={() => {
              setShowConfirmModal(false);
              setActionError(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="mx-4 w-full max-w-sm rounded-xl border border-border bg-ink p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg text-paper">
                Not enough Ink Drops
              </h3>
              <p className="mt-3 text-sm text-text-secondary">
                You need{" "}
                <span className="font-medium text-paper">
                  {price} drops
                </span>{" "}
                to join this Circle. Top up your balance to continue.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <Link
                  href="/settings/ink-drops"
                  className="flex-1 rounded-lg bg-gold px-4 py-2.5 text-center text-sm font-medium text-void transition-colors hover:bg-amber"
                >
                  Get Ink Drops
                </Link>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setActionError(null);
                  }}
                  className="flex-1 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-paper"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
