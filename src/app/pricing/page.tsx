"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { SUBSCRIPTION_PLANS } from "@/config/subscription";

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: "pro" | "premium") => {
    if (!session?.user) {
      router.push("/login?redirect=/pricing");
      return;
    }

    setIsLoading(tier);

    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error?.message || "Failed to start checkout");
        setIsLoading(null);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Something went wrong. Please try again.");
      setIsLoading(null);
    }
  };

  const freeTier = {
    name: "Free",
    price: 0,
    description: "Start writing and build your audience",
    features: [
      "Write unlimited stories (3 active)",
      "All 5 story formats",
      "Basic rich text editor",
      "Auto-save & 7-day history",
      "Story Bible (10 characters)",
      "Basic publishing & analytics",
      "Monetization via Ink Drops",
    ],
    cta: session ? "Current Plan" : "Sign Up Free",
    ctaLink: session ? "/dashboard" : "/signup",
    highlight: false,
  };

  const proTier = {
    name: SUBSCRIPTION_PLANS.pro.name,
    price: interval === "monthly" ? 9.99 : 8.25,
    originalPrice: interval === "yearly" ? 9.99 : null,
    description: SUBSCRIPTION_PLANS.pro.description,
    features: SUBSCRIPTION_PLANS.pro.features,
    cta: "Upgrade to Pro",
    highlight: true,
    savings: interval === "yearly" ? "Save $20/year" : null,
  };

  const premiumTier = {
    name: SUBSCRIPTION_PLANS.premium.name,
    price: interval === "monthly" ? 29.99 : 24.92,
    originalPrice: interval === "yearly" ? 29.99 : null,
    description: SUBSCRIPTION_PLANS.premium.description,
    features: SUBSCRIPTION_PLANS.premium.features,
    cta: "Upgrade to Premium",
    highlight: false,
    savings: interval === "yearly" ? "Save $60/year" : null,
  };

  return (
    <div className="min-h-screen bg-void">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl mb-4 bg-gradient-to-b from-paper via-gold to-copper bg-clip-text text-transparent">
              Unlock Your Full Potential
            </h1>
            <p className="text-text-secondary text-base sm:text-lg md:text-xl max-w-2xl mx-auto">
              Choose the plan that fits your writing journey. Upgrade anytime, cancel anytime.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <span className={`text-sm ${interval === "monthly" ? "text-paper" : "text-text-ghost"}`}>
              Monthly
            </span>
            <button
              onClick={() => setInterval(interval === "monthly" ? "yearly" : "monthly")}
              className="relative w-14 h-8 rounded-full bg-surface border border-border transition-colors hover:border-gold/40"
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-6 h-6 rounded-full bg-gold shadow-lg"
                style={{
                  left: interval === "yearly" ? "calc(100% - 28px)" : "4px",
                }}
              />
            </button>
            <span className={`text-sm ${interval === "yearly" ? "text-paper" : "text-text-ghost"}`}>
              Yearly
              <span className="ml-2 text-gold text-xs">(Save 17%)</span>
            </span>
          </motion.div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
          {/* Free Tier */}
          <PricingCard tier={freeTier} isLoading={false} />

          {/* Pro Tier */}
          <PricingCard
            tier={proTier}
            isLoading={isLoading === "pro"}
            onSubscribe={() => handleSubscribe("pro")}
          />

          {/* Premium Tier */}
          <PricingCard
            tier={premiumTier}
            isLoading={isLoading === "premium"}
            onSubscribe={() => handleSubscribe("premium")}
          />
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-border">
        <h2 className="font-display text-2xl sm:text-3xl text-center mb-8 sm:mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <FAQItem
            question="Can I cancel anytime?"
            answer="Yes! You can cancel your subscription at any time. You'll retain access until the end of your billing period."
          />
          <FAQItem
            question="What happens to my stories if I downgrade?"
            answer="Your stories and data are safe. You'll keep everything you've written, but some premium features will be locked until you upgrade again."
          />
          <FAQItem
            question="How does AI usage work?"
            answer="Pro users get 50 AI requests per day, which resets at midnight. Premium users have unlimited AI access. Free users don't have access to AI features."
          />
          <FAQItem
            question="Can I switch between plans?"
            answer="Absolutely! You can upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle."
          />
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  tier,
  isLoading,
  onSubscribe,
}: {
  tier: any;
  isLoading: boolean;
  onSubscribe?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`relative rounded-2xl border p-6 sm:p-8 ${
        tier.highlight
          ? "border-gold/40 bg-gradient-to-b from-gold/5 to-transparent shadow-lg shadow-gold/10"
          : "border-border bg-surface/30"
      }`}
    >
      {tier.highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-void text-xs font-bold uppercase tracking-wide rounded-full">
          Most Popular
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="font-display text-2xl text-paper mb-2">{tier.name}</h3>
        <p className="text-text-ghost text-sm mb-4">{tier.description}</p>
        <div className="flex items-baseline justify-center gap-2">
          {tier.originalPrice && (
            <span className="text-text-ghost line-through text-lg">${tier.originalPrice}</span>
          )}
          <span className="text-4xl sm:text-5xl font-bold text-paper">${tier.price}</span>
          <span className="text-text-ghost">/month</span>
        </div>
        {tier.savings && (
          <p className="text-gold text-sm mt-2">{tier.savings}</p>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {tier.features.map((feature: string, i: number) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <svg
              className="w-5 h-5 text-gold flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-text">{feature}</span>
          </li>
        ))}
      </ul>

      {tier.ctaLink ? (
        <Link
          href={tier.ctaLink}
          className={`block w-full py-3 px-6 rounded-lg text-center font-medium transition-all ${
            tier.highlight
              ? "bg-gold text-void hover:bg-gold/90 shadow-lg shadow-gold/20"
              : "bg-surface border border-border text-paper hover:border-gold/40"
          }`}
        >
          {tier.cta}
        </Link>
      ) : (
        <button
          onClick={onSubscribe}
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-all disabled:opacity-50 ${
            tier.highlight
              ? "bg-gold text-void hover:bg-gold/90 shadow-lg shadow-gold/20"
              : "bg-surface border border-border text-paper hover:border-gold/40"
          }`}
        >
          {isLoading ? "Processing..." : tier.cta}
        </button>
      )}
    </motion.div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface/50 transition-colors"
      >
        <span className="font-medium text-paper">{question}</span>
        <svg
          className={`w-5 h-5 text-text-ghost transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 text-text-secondary text-sm">
          {answer}
        </div>
      )}
    </div>
  );
}
