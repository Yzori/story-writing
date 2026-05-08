"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface AIAssistantPanelProps {
  storyId: string;
  selectedText?: string;
  context: string;
  onAccept: (suggestion: string) => void;
  onClose: () => void;
}

type PromptType =
  | "continue"
  | "rephrase"
  | "expand"
  | "summarize"
  | "fix-grammar"
  | "improve-dialogue"
  | "enhance-description"
  | "plot-holes"
  | "continuity-check"
  | "pacing-analysis"
  | "character-arc";

interface PromptOption {
  id: PromptType;
  label: string;
  description: string;
  requiresPremium: boolean;
  requiresSelection: boolean;
}

const PROMPT_OPTIONS: PromptOption[] = [
  {
    id: "continue",
    label: "Continue Writing",
    description: "Generate the next paragraph",
    requiresPremium: false,
    requiresSelection: false,
  },
  {
    id: "rephrase",
    label: "Rephrase",
    description: "Rewrite for clarity and flow",
    requiresPremium: false,
    requiresSelection: true,
  },
  {
    id: "expand",
    label: "Expand",
    description: "Add more detail and depth",
    requiresPremium: false,
    requiresSelection: true,
  },
  {
    id: "summarize",
    label: "Summarize",
    description: "Create a concise summary",
    requiresPremium: false,
    requiresSelection: true,
  },
  {
    id: "fix-grammar",
    label: "Fix Grammar",
    description: "Correct errors and polish",
    requiresPremium: false,
    requiresSelection: true,
  },
  {
    id: "improve-dialogue",
    label: "Improve Dialogue",
    description: "Enhance conversations",
    requiresPremium: false,
    requiresSelection: true,
  },
  {
    id: "enhance-description",
    label: "Enhance Description",
    description: "Add vivid sensory details",
    requiresPremium: false,
    requiresSelection: true,
  },
  {
    id: "plot-holes",
    label: "Plot Hole Detection",
    description: "Find inconsistencies",
    requiresPremium: true,
    requiresSelection: false,
  },
  {
    id: "continuity-check",
    label: "Continuity Check",
    description: "Track character/timeline errors",
    requiresPremium: true,
    requiresSelection: false,
  },
  {
    id: "pacing-analysis",
    label: "Pacing Analysis",
    description: "Identify rushed/slow sections",
    requiresPremium: true,
    requiresSelection: false,
  },
  {
    id: "character-arc",
    label: "Character Arc Analysis",
    description: "Track character development",
    requiresPremium: true,
    requiresSelection: false,
  },
];

export default function AIAssistantPanel({
  storyId,
  selectedText,
  context,
  onAccept,
  onClose,
}: AIAssistantPanelProps) {
  const { data: session } = useSession();
  const [selectedPrompt, setSelectedPrompt] = useState<PromptType>("continue");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    current: number;
    limit: number | null;
    remaining: number | null;
    tier: string;
    hasAccess: boolean;
    isFreeTrial?: boolean;
  } | null>(null);

  // Fetch AI usage stats
  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const res = await fetch("/api/ai/assist");
      const data = await res.json();

      if (res.ok) {
        setUsage({
          current: data.usage.current,
          limit: data.usage.limit,
          remaining: data.usage.remaining,
          tier: data.tier,
          hasAccess: data.hasAccess,
          isFreeTrial: data.usage.isFreeTrial,
        });
      } else if (res.status !== 401) {
        // Free user with exhausted quota — still surface tier so the panel
        // can show the upgrade state instead of crashing.
        setUsage({
          current: data.usage?.current ?? 0,
          limit: data.usage?.limit ?? 0,
          remaining: 0,
          tier: data.tier ?? "free",
          hasAccess: false,
          isFreeTrial: true,
        });
      }
    } catch (err) {
      console.error("Failed to fetch AI usage stats:", err);
    }
  };

  const handleGenerate = async () => {
    if (!usage?.hasAccess) {
      setError("AI Writing Assistant requires a Pro or Premium subscription");
      return;
    }

    const option = PROMPT_OPTIONS.find((o) => o.id === selectedPrompt);
    if (option?.requiresSelection && !selectedText) {
      setError("Please select text first for this AI feature");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptType: selectedPrompt,
          context,
          selectedText,
          storyId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "SUBSCRIPTION_REQUIRED") {
          setError("Upgrade to Pro or Premium to use AI features");
        } else if (data.error?.code === "PREMIUM_REQUIRED") {
          setError("This feature requires a Premium subscription");
        } else if (data.error?.code === "RATE_LIMIT_EXCEEDED") {
          setError(data.error.message);
        } else {
          setError(data.error?.message || "Failed to generate suggestion");
        }
        return;
      }

      setSuggestion(data.suggestion);
      setUsage({
        ...usage,
        current: data.usage.current,
        remaining: data.usage.remaining,
      });
    } catch (err) {
      console.error("AI assist error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestion) {
      onAccept(suggestion);
      setSuggestion(null);
      onClose();
    }
  };

  const isFreeTrial = !!usage?.isFreeTrial;
  const availableOptions = PROMPT_OPTIONS.filter((option) => {
    // Free trial: only the "continue" prompt is available, the rest are upsells
    if (isFreeTrial && option.id !== "continue") return false;
    // Filter based on tier
    if (option.requiresPremium && usage?.tier !== "premium") {
      return false;
    }
    // Filter based on selection requirement
    if (option.requiresSelection && !selectedText) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 md:hidden"
      />
      <motion.aside
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="fixed md:relative inset-y-0 right-0 z-50 md:z-auto h-full w-[88vw] max-w-[400px] md:w-[380px] border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col shadow-2xl md:shadow-none"
        aria-label="AI Writing Assistant"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-border gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base text-paper flex items-center gap-2">
              <span className="text-base sm:text-lg">✨</span>
              <span className="truncate">AI Writing Assistant</span>
            </h2>
            {usage && usage.hasAccess && (
              <p className="text-[11px] text-text-ghost mt-0.5">
                {usage.limit === null ? (
                  <span className="text-gold">Unlimited • Premium</span>
                ) : isFreeTrial ? (
                  <span className="text-amber">
                    {usage.remaining ?? 0} free generation{(usage.remaining ?? 0) === 1 ? "" : "s"} left
                  </span>
                ) : (
                  <>
                    {usage.remaining || 0} of {usage.limit} requests left today
                  </>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-ghost hover:text-paper hover:bg-subtle/50 transition-colors shrink-0"
            aria-label="Close AI assistant"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 space-y-5">
          {!usage?.hasAccess ? (
            <div className="text-center py-10">
              <span className="text-5xl mb-4 block">{isFreeTrial ? "✨" : "🔒"}</span>
              <h3 className="font-display text-lg text-paper mb-2">
                {isFreeTrial ? "You've used your free generations" : "AI Features Locked"}
              </h3>
              <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                {isFreeTrial
                  ? "Pro unlocks 50 AI requests per day plus 6 more prompt types — Rephrase, Expand, Improve Dialogue, and more."
                  : "Upgrade to Pro or Premium to unlock AI Writing Assistant"}
              </p>
              <Link
                href="/pricing"
                className="inline-block bg-gold text-void px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
              >
                {isFreeTrial ? "See Pro" : "View Plans"}
              </Link>
            </div>
          ) : (
            <>
              {/* Free trial banner — shown to Free users with quota remaining */}
              {isFreeTrial && (
                <div className="rounded-lg border border-amber/20 bg-amber/[0.05] p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">✨</span>
                    <div className="min-w-0">
                      <p className="text-[12px] text-paper font-medium leading-snug">
                        Try it free — {usage.remaining ?? 0} of {usage.limit} generations left
                      </p>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                        Free users get a taste of <span className="text-paper">Continue Writing</span>.{" "}
                        <Link href="/pricing" className="text-amber hover:text-amber-light underline">
                          Pro unlocks the rest
                        </Link>{" "}
                        — Rephrase, Expand, dialogue polish, and 50/day.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selection preview — only when text is selected */}
              {selectedText && selectedText.trim().length > 0 && (
                <div className="rounded-lg border border-amber/15 bg-amber/[0.04] p-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-amber/70 mb-1.5">
                    Selected text
                  </p>
                  <p className="text-[12px] text-text-secondary leading-relaxed font-reading line-clamp-3">
                    {selectedText.length > 220 ? selectedText.slice(0, 220) + "…" : selectedText}
                  </p>
                </div>
              )}

              {/* Prompt Type Selection */}
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-text-ghost font-medium mb-2.5">
                  Choose what to do
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {availableOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedPrompt(option.id)}
                      className={`p-3 rounded-lg text-left transition-all border ${
                        selectedPrompt === option.id
                          ? "border-gold/40 bg-gold/[0.06] shadow-[0_0_10px_rgba(200,150,60,0.05)]"
                          : "border-border bg-surface/30 hover:border-gold/30"
                      }`}
                    >
                      <div className="font-medium text-paper text-[13px] mb-0.5">{option.label}</div>
                      <div className="text-[11px] text-text-ghost leading-snug">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium upsell */}
              {usage.tier === "pro" && (
                <div className="p-3 bg-amethyst/10 border border-amethyst/30 rounded-lg">
                  <p className="text-[12px] text-text-secondary leading-relaxed">
                    <span className="text-amethyst font-semibold">Premium:</span> Unlock plot hole detection,
                    continuity checking, and pacing analysis →{" "}
                    <Link href="/pricing" className="text-gold hover:underline">
                      compare plans
                    </Link>
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-rose/10 border border-rose/30 rounded-lg">
                  <p className="text-[12px] text-rose">{error}</p>
                </div>
              )}

              {/* Suggestion */}
              <AnimatePresence>
                {suggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="p-4 bg-elevated/60 border border-gold/20 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-gold font-medium">AI Suggestion</span>
                      <span className="text-[10px] text-text-ghost">
                        Review before accepting
                      </span>
                    </div>
                    <div className="prose prose-invert max-w-none text-[13px] leading-relaxed text-text whitespace-pre-wrap font-reading">
                      {suggestion}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Footer */}
        {usage?.hasAccess && (
          <div
            className="flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-4 border-t border-border shrink-0"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {suggestion ? (
              <>
                <button
                  onClick={() => {
                    setSuggestion(null);
                    handleGenerate();
                  }}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-full text-[12px] text-text-secondary border border-border hover:text-paper hover:border-border-active transition-all disabled:opacity-40"
                  title="Generate a new suggestion"
                >
                  Try again
                </button>
                <div className="flex-1" />
                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-full text-[12px] text-text-ghost hover:text-paper transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  className="px-4 py-2 rounded-full bg-gold text-void text-[12px] font-semibold hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
                >
                  Accept &amp; insert
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-full text-[12px] text-text-ghost hover:text-paper transition-colors"
                >
                  Cancel
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold text-void text-[12px] font-semibold hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating…
                    </>
                  ) : (
                    "Generate"
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </motion.aside>
    </>
  );
}
