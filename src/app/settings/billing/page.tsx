"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, CreditCard, Gauge, Sparkles, WandSparkles } from "lucide-react";

type BillingUser = {
  subscriptionTier?: "free" | "pro" | "premium" | string | null;
  subscriptionStatus?: string | null;
  aiRequestsThisMonth?: number | null;
  subscriptionEndsAt?: string | Date | null;
};

export default function BillingSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const user = session?.user as BillingUser | undefined;
  const tier = user?.subscriptionTier || "free";
  const status = user?.subscriptionStatus || "active";
  const aiRequests = user?.aiRequestsThisMonth || 0;
  const subscriptionEndsAt = user?.subscriptionEndsAt;

  // Show success message if redirected from checkout
  useEffect(() => {
    if (searchParams?.get("success") === "true") {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  const handlePortal = async () => {
    setIsLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Failed to open billing portal");
      setIsLoading("");
    }
  };

  const handleCancelConfirmed = async () => {
    setIsLoading("cancel");
    setShowCancelConfirm(false);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setCancelMessage(data.message || "Your subscription will end at the close of this billing period.");
        router.refresh();
      } else {
        setCancelMessage(data.error?.message || "Failed to cancel.");
      }
    } catch {
      setCancelMessage("Something went wrong.");
    } finally {
      setIsLoading("");
    }
  };

  const getPlanName = () => {
    if (tier === "premium") return "Premium";
    if (tier === "pro") return "Pro";
    return "Free";
  };

  const getAILimit = (): number | null => {
    if (tier === "premium") return null;
    if (tier === "pro") return 50;
    return 0;
  };

  const aiLimit = getAILimit();
  const aiRemaining = tier === "pro" ? Math.max(0, 50 - aiRequests) : aiLimit;
  const usagePercent = tier === "pro" ? ((aiRemaining ?? 0) / (aiLimit ?? 1)) * 100 : 100;
  const planFeatures =
    tier === "free"
      ? ["Core writing tools", "Public reading profile", "Community discovery"]
      : tier === "pro"
        ? ["AI writing assistance", "Advanced analytics", "Creator tools"]
        : ["Unlimited AI access", "Priority creator tools", "Premium analytics"];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 rounded-2xl border border-border bg-ink/45 p-5">
        <p className="section-label mb-2 max-w-[180px] text-[10px]">Billing</p>
        <h2 className="font-display text-2xl font-semibold text-paper sm:text-3xl">Plan and usage</h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-text-secondary">
          A quiet view of your current plan, billing actions, renewal status, and AI usage.
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center gap-3 rounded-xl border border-sage/25 bg-sage/[0.08] p-4"
        >
          <CheckCircle2 size={18} className="text-sage" />
          <p className="text-sm text-sage">Subscription updated successfully.</p>
        </motion.div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-5">
          {/* Current Plan */}
          <section className="rounded-2xl border border-border bg-surface/70 p-5 shadow-[var(--t-shadow-card)] sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/25 bg-gold/[0.08] text-gold">
                    <CreditCard size={18} />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Current plan</p>
                    <h3 className="mt-1 font-display text-3xl leading-none text-paper">{getPlanName()}</h3>
                  </div>
                </div>
                <p className="max-w-xl text-[13px] leading-relaxed text-text-secondary">
                  {tier === "free"
                    ? "You are on the free plan. Your drafts, reading preferences, and public profile stay available."
                    : "Your subscription is active for the account signed in on this device."}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-ink/45 px-4 py-3 md:min-w-40">
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">Status</p>
                <p className={`mt-1 text-[13px] font-semibold capitalize ${status === "cancelled" ? "text-rose" : "text-sage"}`}>
                  {tier === "free" ? "Free" : status}
                </p>
                {subscriptionEndsAt && (
                  <p className="mt-1 text-[11px] text-text-ghost">
                    {status === "cancelled" ? "Access until " : "Renews "}
                    {new Date(subscriptionEndsAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {planFeatures.map((feature) => (
                <div key={feature} className="rounded-xl border border-border bg-ink/35 p-3">
                  <CheckCircle2 size={14} className="mb-2 text-sage" />
                  <p className="text-[12px] font-medium text-text-secondary">{feature}</p>
                </div>
              ))}
            </div>
          </section>

          {/* AI Usage */}
          <section className="rounded-2xl border border-border bg-surface/70 p-5 shadow-[var(--t-shadow-card)] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-lavender/25 bg-lavender/[0.08] text-lavender">
                  <WandSparkles size={18} />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">AI usage</p>
                  <h3 className="mt-1 font-display text-xl text-paper">Monthly assistant access</h3>
                </div>
              </div>
              <span className="rounded-full border border-border bg-ink/45 px-3 py-1 text-[12px] font-medium text-text-secondary">
                {tier === "premium" ? "Unlimited" : `${aiRemaining ?? 0} left`}
              </span>
            </div>

            {tier === "free" ? (
              <div className="rounded-xl border border-border bg-ink/35 p-4">
                <p className="text-[13px] leading-relaxed text-text-secondary">
                  AI requests are not included on the free plan. Upgrade when you want drafting, editing, and planning assistance built into the writing flow.
                </p>
              </div>
            ) : tier === "premium" ? (
              <div className="rounded-xl border border-lavender/20 bg-lavender/[0.06] p-4">
                <p className="text-[13px] font-medium text-lavender">Unlimited AI access is active.</p>
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between text-[12px] text-text-ghost">
                  <span>{aiRequests} used this month</span>
                  <span>{aiLimit ?? 0} total</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-gold transition-all"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                {(aiRemaining ?? 0) < 10 && (
                  <p className="mt-3 text-[12px] text-gold">Running low. Premium removes the monthly request limit.</p>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-surface/70 p-5 shadow-[var(--t-shadow-card)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-ink/45 text-gold">
                <Gauge size={18} />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Actions</p>
                <h3 className="font-display text-lg text-paper">Billing controls</h3>
              </div>
            </div>

            {tier === "free" ? (
              <Link
                href="/pricing"
                className="inline-flex w-full items-center justify-center rounded-lg bg-gold px-4 py-2.5 text-[13px] font-semibold text-void transition-colors hover:bg-gold/90"
              >
                View plans
              </Link>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handlePortal}
                  disabled={!!isLoading}
                  className="w-full rounded-lg border border-border bg-elevated/60 px-4 py-2.5 text-[13px] font-medium text-text transition-colors hover:border-gold/40 hover:text-paper disabled:opacity-50"
                >
                  {isLoading === "portal" ? "Loading..." : "Manage payment"}
                </button>
                {status !== "cancelled" && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={!!isLoading}
                    className="w-full rounded-lg border border-rose/20 px-4 py-2.5 text-[13px] font-medium text-rose transition-colors hover:border-rose/40 disabled:opacity-50"
                  >
                    {isLoading === "cancel" ? "Cancelling..." : "Cancel subscription"}
                  </button>
                )}
              </div>
            )}
          </section>

          {tier !== "premium" && (
            <section className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-5">
              <Sparkles size={18} className="mb-3 text-gold" />
              <h3 className="font-display text-xl text-paper">
                {tier === "free" ? "Upgrade when you need more" : "Move to Premium"}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                {tier === "free"
                  ? "Unlock AI-powered writing assistance, advanced analytics, and creator tools."
                  : "Get unlimited AI access and the full professional toolkit."}
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-gold/30 bg-gold/15 px-4 py-2.5 text-[13px] font-semibold text-gold transition-colors hover:bg-gold/25"
              >
                Compare plans
              </Link>
            </section>
          )}
        </aside>
      </div>

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-void/80 backdrop-blur-sm"
              onClick={() => setShowCancelConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
            >
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-7">
                <h3 className="mb-2 font-display text-xl text-paper">Cancel your subscription?</h3>
                <p className="mb-5 text-sm leading-relaxed text-text-secondary">
                  You&apos;ll keep access to {getPlanName()} features until
                  {subscriptionEndsAt ? (
                    <> <span className="font-medium text-paper">{new Date(subscriptionEndsAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span></>
                  ) : (
                    <> the end of this billing period</>
                  )}
                  . After that, your account stays active on the Free plan and your stories are never deleted.
                </p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    onClick={handleCancelConfirmed}
                    disabled={!!isLoading}
                    className="rounded-full border border-rose/20 px-4 py-2.5 text-sm text-rose transition-colors hover:border-rose/40 hover:text-rose/80 disabled:opacity-50"
                  >
                    {isLoading === "cancel" ? "Cancelling..." : "Cancel subscription"}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-void transition-colors hover:bg-gold/90"
                  >
                    Keep my plan
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cancel result toast */}
      <AnimatePresence>
        {cancelMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl border border-border bg-elevated px-5 py-3 text-center text-sm text-text shadow-2xl"
            onAnimationComplete={() => setTimeout(() => setCancelMessage(null), 5000)}
          >
            {cancelMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
