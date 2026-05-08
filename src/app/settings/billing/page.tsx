"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function BillingSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const user = session?.user as any;
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
    } catch (error) {
      alert("Failed to open billing portal");
      setIsLoading("");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel? You'll lose access to premium features at the end of your billing period.")) {
      return;
    }

    setIsLoading("cancel");
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        router.refresh();
      } else {
        alert(data.error?.message || "Failed to cancel");
      }
    } catch (error) {
      alert("Something went wrong");
    } finally {
      setIsLoading("");
    }
  };

  const getPlanName = () => {
    if (tier === "premium") return "Premium";
    if (tier === "pro") return "Pro";
    return "Free";
  };

  const getPlanColor = () => {
    if (tier === "premium") return "from-gold via-copper to-gold";
    if (tier === "pro") return "from-gold to-amber";
    return "from-text-ghost to-text-secondary";
  };

  const getAILimit = () => {
    if (tier === "premium") return "Unlimited";
    if (tier === "pro") return 50;
    return 0;
  };

  const aiLimit = getAILimit();
  const aiRemaining = tier === "pro" ? Math.max(0, 50 - aiRequests) : aiLimit;

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-text-ghost hover:text-paper transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </Link>
          <h1 className="font-display text-4xl text-paper mb-2">Billing & Subscription</h1>
          <p className="text-text-secondary">
            Manage your subscription and view usage
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-500 text-sm">Subscription updated successfully!</p>
          </motion.div>
        )}

        {/* Current Plan Card */}
        <div className="mb-6 border border-border rounded-xl overflow-hidden">
          <div className={`p-5 sm:p-6 bg-gradient-to-r ${getPlanColor()}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-void/70 text-sm font-medium mb-1">Current Plan</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-void">{getPlanName()}</h2>
              </div>
              {tier !== "free" && (
                <div className="text-right shrink-0">
                  <p className="text-void/70 text-sm">Status</p>
                  <p className="text-void font-medium capitalize">{status}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-surface/30">
            {tier === "free" ? (
              <div>
                <p className="text-text mb-4">
                  You're currently on the free plan. Upgrade to unlock AI features, advanced analytics, and more.
                </p>
                <Link
                  href="/pricing"
                  className="inline-block px-6 py-2 bg-gold text-void font-medium rounded-lg hover:bg-gold/90 transition-colors"
                >
                  View Plans
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {subscriptionEndsAt && (
                  <div>
                    <p className="text-text-ghost text-sm">
                      {status === "cancelled" ? "Access until" : "Renews on"}
                    </p>
                    <p className="text-paper font-medium">
                      {new Date(subscriptionEndsAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handlePortal}
                    disabled={!!isLoading}
                    className="px-4 py-2 border border-border text-text hover:border-gold/40 hover:text-paper rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading === "portal" ? "Loading..." : "Manage Payment"}
                  </button>

                  {status !== "cancelled" && (
                    <button
                      onClick={handleCancel}
                      disabled={!!isLoading}
                      className="px-4 py-2 text-rose hover:text-rose/80 transition-colors disabled:opacity-50"
                    >
                      {isLoading === "cancel" ? "Cancelling..." : "Cancel Subscription"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Usage Card (Pro/Premium only) */}
        {tier !== "free" && (
          <div className="mb-6 border border-border rounded-xl p-6 bg-surface/30">
            <h3 className="font-display text-xl text-paper mb-4">AI Usage</h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm">Requests this month</span>
                  <span className="text-paper font-medium">
                    {tier === "premium" ? "Unlimited" : `${aiRemaining} / ${aiLimit} remaining`}
                  </span>
                </div>

                {tier === "pro" && (
                  <div className="w-full h-2 bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-amber transition-all"
                      style={{ width: `${(aiRemaining / aiLimit) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {tier === "pro" && aiRemaining < 10 && (
                <div className="p-3 bg-gold/10 border border-gold/30 rounded-lg">
                  <p className="text-gold text-sm">
                    Running low on AI requests. Upgrade to Premium for unlimited access.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-block mt-2 text-gold text-sm font-medium hover:underline"
                  >
                    View Premium →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upgrade Options */}
        {tier !== "premium" && (
          <div className="border border-gold/20 rounded-xl p-6 bg-gradient-to-br from-gold/5 to-transparent">
            <h3 className="font-display text-xl text-paper mb-2">
              {tier === "free" ? "Unlock Premium Features" : "Upgrade to Premium"}
            </h3>
            <p className="text-text-secondary mb-4">
              {tier === "free"
                ? "Get AI-powered writing assistance, advanced analytics, and professional tools."
                : "Get unlimited AI access and unlock all professional features."}
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-2 bg-gold text-void font-medium rounded-lg hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20"
            >
              View All Plans
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
