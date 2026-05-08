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

  const availableOptions = PROMPT_OPTIONS.filter((option) => {
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
    <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface border border-border rounded-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl text-paper flex items-center gap-2 truncate">
              <span className="text-xl sm:text-2xl">✨</span> AI Writing Assistant
            </h2>
            {usage && usage.hasAccess && (
              <p className="text-sm text-text-ghost mt-1">
                {usage.limit === null ? (
                  <span className="text-gold">Unlimited AI • Premium</span>
                ) : (
                  <>
                    {usage.remaining || 0} of {usage.limit} requests remaining today
                  </>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-ghost hover:text-paper transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {!usage?.hasAccess ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🔒</span>
              <h3 className="font-display text-xl text-paper mb-2">AI Features Locked</h3>
              <p className="text-text-secondary mb-6">
                Upgrade to Pro or Premium to unlock AI Writing Assistant
              </p>
              <Link
                href="/pricing"
                className="inline-block bg-gold text-void px-6 py-3 rounded-lg font-medium hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
              >
                View Plans
              </Link>
            </div>
          ) : (
            <>
              {/* Prompt Type Selection */}
              <div>
                <label className="block text-sm font-medium text-paper mb-3">
                  Choose AI Feature
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {availableOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedPrompt(option.id)}
                      className={`p-3 sm:p-4 rounded-lg text-left transition-all border ${
                        selectedPrompt === option.id
                          ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                          : "border-border bg-surface/30 hover:border-gold/40"
                      }`}
                    >
                      <div className="font-medium text-paper mb-1">{option.label}</div>
                      <div className="text-xs text-text-ghost">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium upsell */}
              {usage.tier === "pro" && (
                <div className="p-4 bg-amethyst/10 border border-amethyst/30 rounded-lg">
                  <p className="text-sm text-text-secondary">
                    <span className="text-amethyst font-semibold">Premium feature:</span> Unlock
                    advanced story intelligence with{" "}
                    <Link href="/pricing" className="text-gold hover:underline">
                      Premium
                    </Link>{" "}
                    — plot hole detection, continuity checking, and more.
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Suggestion */}
              <AnimatePresence>
                {suggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-6 bg-surface/50 border border-border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gold">AI Suggestion</span>
                      <span className="text-xs text-text-ghost">
                        Review before accepting
                      </span>
                    </div>
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed text-text whitespace-pre-wrap">
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
            className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-border"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-paper hover:border-gold/40 transition-all"
            >
              Cancel
            </button>

            {suggestion ? (
              <button
                onClick={handleAccept}
                className="px-4 py-2 rounded-lg bg-gold text-void font-medium hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
              >
                Accept & Insert
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-gold text-void font-medium hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  "Generate"
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
