"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  tier: "pro" | "premium";
  benefits?: string[];
}

/**
 * Modal for blocking premium feature access
 */
export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  tier,
  benefits,
}: UpgradeModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const tierName = tier === "pro" ? "Pro" : "Premium";
  const price = tier === "pro" ? "$9.99" : "$29.99";

  const defaultBenefits = tier === "pro"
    ? [
        "AI Writing Assistant (50 requests/day)",
        "Advanced analytics",
        "Export to PDF/EPUB/DOCX",
        "Collaboration (up to 3 co-authors)",
        "Priority support",
      ]
    : [
        "Unlimited AI Story Intelligence",
        "Plot hole detection",
        "Unlimited collaboration",
        "Track changes mode",
        "Custom author website",
        "Professional marketplace",
      ];

  const handleUpgrade = async () => {
    setIsLoading(true);
    router.push("/pricing");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 bg-gradient-to-b from-gold/5 to-transparent border-b border-border">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-text-ghost hover:text-paper rounded-lg hover:bg-elevated transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-paper mb-1">
                      Upgrade to {tierName}
                    </h2>
                    <p className="text-text-secondary text-sm">
                      Unlock {feature} and more
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6">
                <p className="text-text mb-6">
                  <span className="font-medium">{feature}</span> is available on the {tierName} plan starting at{" "}
                  <span className="text-gold font-bold">{price}/month</span>.
                </p>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-text-secondary">What you'll get:</p>
                  {(benefits || defaultBenefits).map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-gold flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-text text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-elevated/50 border-t border-border flex items-center justify-between gap-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-text-ghost hover:text-paper text-sm transition-colors"
                >
                  Maybe later
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="px-6 py-2 bg-gold text-void font-medium rounded-full hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20 disabled:opacity-50"
                >
                  {isLoading ? "Loading..." : `Upgrade to ${tierName}`}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
