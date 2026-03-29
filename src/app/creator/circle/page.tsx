"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface Circle {
  id: string;
  creatorId: string;
  isActive: boolean;
  confidantPrice: number;
  confidantDescription: string;
  earlyAccessDays: number;
  createdAt: string;
  updatedAt: string;
}

interface Subscriber {
  id: string;
  tier: string;
  status: string;
  startedAt: string;
  renewalDate: string;
  priceAtSubscription: number;
  reader: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

type PageState = "loading" | "error" | "ready";

const DROPS_TO_USD = 0.83 / 100;

function dropsToUsd(drops: number): string {
  return (drops * DROPS_TO_USD).toFixed(2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export default function CreatorCirclePage() {
  const { data: session, status: sessionStatus } = useSession();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [circle, setCircle] = useState<Circle | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  const [isActive, setIsActive] = useState(false);
  const [price, setPrice] = useState(300);
  const [earlyAccessDays, setEarlyAccessDays] = useState(3);
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchCircleData = useCallback(async () => {
    try {
      const [circleRes, subsRes] = await Promise.all([
        fetch("/api/creator/circle"),
        fetch("/api/creator/circle/subscribers"),
      ]);

      if (!circleRes.ok) throw new Error("Failed to load circle data");

      const circleData = await circleRes.json();
      setCircle(circleData.circle);
      setSubscriberCount(circleData.subscriberCount);
      setMonthlyIncome(circleData.monthlyIncome);

      if (circleData.circle) {
        setIsActive(circleData.circle.isActive);
        setPrice(circleData.circle.confidantPrice);
        setEarlyAccessDays(circleData.circle.earlyAccessDays);
        setDescription(circleData.circle.confidantDescription || "");
      }

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubscribers(subsData.subscribers || []);
      }

      setPageState("ready");
    } catch {
      setPageState("error");
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) return;
    fetchCircleData();
  }, [session, sessionStatus, fetchCircleData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/creator/circle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive,
          confidantPrice: price,
          confidantDescription: description,
          earlyAccessDays,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save changes");
      }

      const data = await res.json();
      setCircle(data.circle);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/creator/circle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: true,
          confidantPrice: 300,
          confidantDescription: "",
          earlyAccessDays: 3,
        }),
      });

      if (!res.ok) throw new Error("Failed to activate");

      const data = await res.json();
      setCircle(data.circle);
      setIsActive(true);
      setPrice(300);
      setEarlyAccessDays(3);
      setDescription("");
    } catch {
      setSaveError("Failed to activate your Circle. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (sessionStatus === "loading" || pageState === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
          <p className="font-body text-sm text-text-ghost">Loading your Circle...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl text-paper">Sign in to manage your Circle</p>
          <p className="mt-2 font-body text-sm text-text-secondary">
            You need to be logged in to access creator tools.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl text-paper">Something went wrong</p>
          <p className="mt-2 font-body text-sm text-text-secondary">
            We could not load your Circle data.
          </p>
          <button
            onClick={() => {
              setPageState("loading");
              fetchCircleData();
            }}
            className="mt-4 rounded-lg bg-gold/10 px-4 py-2 font-body text-sm text-gold transition-colors hover:bg-gold/20"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const creatorShare = Math.round(monthlyIncome * 0.7);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl font-bold text-paper sm:text-4xl">
          The <span className="text-gold">Circle</span>
        </h1>
        <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-text-secondary">
          Your inner circle of devoted readers. Offer them early access to new chapters,
          behind-the-scenes glimpses, and a deeper connection to your stories.
        </p>
      </motion.div>

      {/* Setup Card — shown when no circle exists */}
      {!circle && (
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8 rounded-xl border border-border bg-ink/50 p-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-gold"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
              <path d="M16 4l2 2-2 2" />
              <path d="M18 6h-3" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold text-paper">
            Activate Your Circle
          </h2>
          <p className="mx-auto mt-3 max-w-md font-body text-sm leading-relaxed text-text-secondary">
            Invite your most dedicated readers into a space where they can support your
            work directly. Set your own price, offer early access to chapters, and share
            a personal note about what membership means.
          </p>
          <button
            onClick={handleActivate}
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-2.5 font-body text-sm font-medium text-void transition-all hover:bg-gold/90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void" />
                Activating...
              </>
            ) : (
              "Open the Circle"
            )}
          </button>
          {saveError && (
            <p className="mt-3 font-body text-sm text-rose-400">{saveError}</p>
          )}
        </motion.div>
      )}

      {/* Configuration + Stats — shown when circle exists */}
      {circle && (
        <>
          {/* Configuration Panel */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-8 rounded-xl border border-border bg-ink/50 p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                Circle Settings
              </span>
              <AnimatePresence>
                {saveSuccess && (
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="font-body text-sm text-sage"
                  >
                    Saved successfully
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-6">
              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-sm font-medium text-paper">Accept Subscribers</p>
                  <p className="mt-0.5 font-body text-xs text-text-ghost">
                    {isActive
                      ? "Your Circle is open to new members"
                      : "Your Circle is closed — existing members keep access"}
                  </p>
                </div>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    isActive ? "bg-gold" : "bg-surface"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform ${
                      isActive ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Price Slider */}
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="font-body text-sm font-medium text-paper">Monthly Price</p>
                  <span className="font-body text-sm text-gold">
                    {price} drops/month{" "}
                    <span className="text-text-ghost">(~${dropsToUsd(price)})</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={800}
                  step={50}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface accent-gold [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold"
                />
                <div className="mt-1 flex justify-between font-body text-[11px] text-text-ghost">
                  <span>300</span>
                  <span>550</span>
                  <span>800</span>
                </div>
              </div>

              {/* Early Access Days */}
              <div>
                <p className="mb-2 font-body text-sm font-medium text-paper">
                  Early Access Window
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 7].map((days) => (
                    <button
                      key={days}
                      onClick={() => setEarlyAccessDays(days)}
                      className={`rounded-lg px-3 py-1.5 font-body text-sm transition-colors ${
                        earlyAccessDays === days
                          ? "bg-gold/15 text-gold ring-1 ring-gold/30"
                          : "bg-surface text-text-secondary hover:text-paper"
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 font-body text-xs text-text-ghost">
                  Circle members read new chapters {earlyAccessDays} day
                  {earlyAccessDays > 1 ? "s" : ""} before everyone else
                </p>
              </div>

              {/* Description */}
              <div>
                <p className="mb-2 font-body text-sm font-medium text-paper">
                  A Note to Readers
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Tell potential members what joining your Circle means — what they'll get, why it matters to you..."
                  className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 font-body text-sm text-paper placeholder:text-text-ghost focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20"
                />
                <div className="mt-1 text-right font-body text-[11px] text-text-ghost">
                  {description.length}/500
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2 font-body text-sm font-medium text-void transition-all hover:bg-gold/90 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-void/30 border-t-void" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                {saveError && (
                  <span className="font-body text-sm text-rose-400">{saveError}</span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div className="rounded-xl border border-border bg-ink/50 p-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                Subscribers
              </span>
              <p className="mt-2 font-display text-2xl font-bold text-paper">
                {subscriberCount}
              </p>
              <p className="mt-0.5 font-body text-xs text-text-ghost">
                {subscriberCount === 1 ? "reader" : "readers"} in your Circle
              </p>
            </div>

            <div className="rounded-xl border border-border bg-ink/50 p-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                Monthly Income
              </span>
              <p className="mt-2 font-display text-2xl font-bold text-gold">
                {monthlyIncome.toLocaleString()}
                <span className="ml-1 text-base font-normal text-text-secondary">drops</span>
              </p>
              <p className="mt-0.5 font-body text-xs text-text-ghost">
                ~${dropsToUsd(monthlyIncome)} this month
              </p>
            </div>

            <div className="rounded-xl border border-border bg-ink/50 p-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                Your Share
              </span>
              <p className="mt-2 font-display text-2xl font-bold text-sage">
                {creatorShare.toLocaleString()}
                <span className="ml-1 text-base font-normal text-text-secondary">drops</span>
              </p>
              <p className="mt-0.5 font-body text-xs text-text-ghost">
                70% creator share (~${dropsToUsd(creatorShare)})
              </p>
            </div>
          </motion.div>

          {/* Subscribers List */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-6 rounded-xl border border-border bg-ink/50 p-6"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
              Members
            </span>

            {subscribers.length === 0 ? (
              <div className="mt-6 pb-2 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-text-ghost"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
                  </svg>
                </div>
                <p className="font-body text-sm text-text-secondary">
                  No members yet
                </p>
                <p className="mt-1 font-body text-xs text-text-ghost">
                  When readers join your Circle, they will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {subscribers.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-4 rounded-lg bg-surface/50 px-4 py-3"
                  >
                    <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-elevated">
                      {sub.reader.avatarUrl ? (
                        <Image
                          src={sub.reader.avatarUrl}
                          alt={sub.reader.displayName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-display text-sm font-semibold text-text-ghost">
                          {sub.reader.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-medium text-paper">
                        {sub.reader.displayName}
                      </p>
                      <p className="font-body text-xs text-text-ghost">
                        Joined {formatDate(sub.startedAt)}
                      </p>
                    </div>

                    <div className="hidden items-center gap-3 sm:flex">
                      <span className="rounded-full bg-gold/10 px-2.5 py-0.5 font-body text-xs font-medium text-gold">
                        {sub.tier === "confidant" ? "Confidant" : sub.tier}
                      </span>
                      <span className="font-body text-xs text-text-ghost">
                        Renews {formatDate(sub.renewalDate)}
                      </span>
                    </div>

                    <div className="flex items-center sm:hidden">
                      <span className="rounded-full bg-gold/10 px-2 py-0.5 font-body text-[11px] font-medium text-gold">
                        {sub.tier === "confidant" ? "Confidant" : sub.tier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
