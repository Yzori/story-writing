"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  tier: "pro" | "premium";
  inline?: boolean;
}

/**
 * Inline upgrade prompt for gated features
 */
export function UpgradePrompt({
  feature,
  description,
  tier,
  inline = false,
}: UpgradePromptProps) {
  const tierName = tier === "pro" ? "Pro" : "Premium";
  const price = tier === "pro" ? "$9.99" : "$29.99";

  if (inline) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-surface/30 border border-gold/20 rounded-lg">
        <svg className="w-5 h-5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text">
            <span className="font-medium">{feature}</span> requires {tierName}
          </p>
        </div>
        <Link
          href="/pricing"
          className="px-3 py-1.5 bg-gold text-void text-sm font-medium rounded hover:bg-gold/90 transition-colors flex-shrink-0"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gold/20 rounded-xl p-6 bg-gradient-to-br from-gold/5 via-surface/50 to-transparent"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg text-paper mb-1">
            Unlock {feature}
          </h3>
          <p className="text-text-secondary text-sm mb-4">
            {description || `${feature} is available on the ${tierName} plan starting at ${price}/month.`}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="px-4 py-2 bg-gold text-void text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20"
            >
              Upgrade to {tierName}
            </Link>
            <Link
              href="/pricing"
              className="text-text-ghost hover:text-paper text-sm transition-colors"
            >
              Learn more →
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Small badge-style upgrade prompt
 */
export function UpgradeBadge({ tier }: { tier: "pro" | "premium" }) {
  const tierName = tier === "pro" ? "Pro" : "Premium";

  return (
    <Link
      href="/pricing"
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-gold/10 border border-gold/30 rounded text-xs text-gold hover:bg-gold/20 transition-colors"
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
      </svg>
      {tierName} Only
    </Link>
  );
}
