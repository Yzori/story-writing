"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useToast } from "@/components/shared/Toast";

interface ChapterReactionsProps {
  storyId: string;
  chapterId: string;
}

const REACTION_TYPES = [
  { type: "gasped", emoji: "\ud83d\ude2e", label: "I gasped" },
  { type: "cried", emoji: "\ud83d\ude22", label: "I cried" },
  { type: "laughed", emoji: "\ud83d\ude02", label: "I laughed" },
  { type: "need-more", emoji: "\ud83d\udd25", label: "Need more" },
  { type: "saw-it-coming", emoji: "\ud83e\udd14", label: "Saw it coming" },
  { type: "heartbroken", emoji: "\ud83d\udc94", label: "Heartbroken" },
  { type: "inspired", emoji: "\u2728", label: "Inspired" },
  { type: "terrified", emoji: "\ud83d\ude31", label: "Terrified" },
] as const;

type ReactionType = (typeof REACTION_TYPES)[number]["type"];

export default function ChapterReactions({
  storyId,
  chapterId,
}: ChapterReactionsProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function fetchReactions() {
      setLoading(true);
      setFetchError(false);
      try {
        const res = await fetch(
          `/api/stories/${storyId}/chapters/${chapterId}/reactions`
        );
        if (res.ok) {
          const json = await res.json();
          setCounts(json.data.counts || {});
          setUserReaction(json.data.userReaction || null);
        } else {
          setFetchError(true);
        }
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchReactions();
  }, [storyId, chapterId]);

  const handleReaction = useCallback(
    async (type: ReactionType) => {
      if (toggling || !session?.user) return;
      setToggling(true);

      // Optimistic update
      const prevCounts = { ...counts };
      const prevUserReaction = userReaction;

      const newCounts = { ...counts };

      if (userReaction === type) {
        newCounts[type] = Math.max(0, (newCounts[type] || 0) - 1);
        setUserReaction(null);
      } else {
        if (userReaction) {
          newCounts[userReaction] = Math.max(
            0,
            (newCounts[userReaction] || 0) - 1
          );
        }
        newCounts[type] = (newCounts[type] || 0) + 1;
        setUserReaction(type);
      }
      setCounts(newCounts);

      try {
        const res = await fetch(
          `/api/stories/${storyId}/chapters/${chapterId}/reactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type }),
          }
        );
        if (res.ok) {
          const json = await res.json();
          setCounts(json.data.counts || {});
          setUserReaction(json.data.userReaction || null);
        } else {
          setCounts(prevCounts);
          setUserReaction(prevUserReaction);
          toast("Couldn\u2019t save reaction. Try again.", "error");
        }
      } catch {
        setCounts(prevCounts);
        setUserReaction(prevUserReaction);
        toast("Network error. Check your connection.", "error");
      } finally {
        setToggling(false);
      }
    },
    [toggling, session, counts, userReaction, storyId, chapterId, toast]
  );

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-4 block">
          How did this chapter make you feel?
        </span>
        <div className="flex flex-wrap gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 w-24 bg-surface/60 border border-border rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-center">
        <p className="text-text-ghost text-[13px]">Couldn&apos;t load reactions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-4 block">
        How did this chapter make you feel?
      </span>

      <div className="flex flex-wrap gap-2">
        {REACTION_TYPES.map(({ type, emoji, label }) => {
          const isSelected = userReaction === type;
          const count = counts[type] || 0;
          const showCount = count > 0;

          return (
            <motion.button
              key={type}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => handleReaction(type)}
              disabled={!session?.user}
              title={session?.user ? label : "Sign in to react"}
              aria-label={`${label}${showCount ? ` (${count})` : ""}`}
              className={`
                inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                text-[12px] transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isSelected
                    ? "bg-amber/10 border border-amber/25 text-amber"
                    : "bg-surface/80 border border-border text-text-secondary hover:border-amber/20 hover:text-text"
                }
              `}
            >
              <span className="text-[14px] leading-none">{emoji}</span>
              <span>{label}</span>
              {showCount && (
                <span
                  className={`text-[11px] ${
                    isSelected ? "text-amber/70" : "text-text-ghost"
                  }`}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {!session?.user && (
        <p className="text-text-ghost text-[11px] mt-3">
          <a href="/login" className="text-amber hover:underline">Sign in</a> to leave a reaction.
        </p>
      )}
    </div>
  );
}
