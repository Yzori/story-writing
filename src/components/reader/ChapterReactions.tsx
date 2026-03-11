"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

interface ChapterReactionsProps {
  storyId: string;
  chapterId: string;
}

const REACTION_TYPES = [
  { type: "gasped", emoji: "\u{1F62E}", label: "I gasped" },
  { type: "cried", emoji: "\u{1F622}", label: "I cried" },
  { type: "laughed", emoji: "\u{1F602}", label: "I laughed" },
  { type: "need-more", emoji: "\u{1F525}", label: "Need more" },
  { type: "saw-it-coming", emoji: "\u{1F914}", label: "Saw it coming" },
  { type: "heartbroken", emoji: "\u{1F494}", label: "Heartbroken" },
  { type: "inspired", emoji: "\u2728", label: "Inspired" },
  { type: "terrified", emoji: "\u{1F631}", label: "Terrified" },
] as const;

type ReactionType = (typeof REACTION_TYPES)[number]["type"];

export default function ChapterReactions({
  storyId,
  chapterId,
}: ChapterReactionsProps) {
  const { data: session } = useSession();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function fetchReactions() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stories/${storyId}/chapters/${chapterId}/reactions`
        );
        if (res.ok) {
          const json = await res.json();
          setCounts(json.data.counts || {});
          setUserReaction(json.data.userReaction || null);
        }
      } catch {
        // silently fail
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
        // Toggle off
        newCounts[type] = Math.max(0, (newCounts[type] || 0) - 1);
        setUserReaction(null);
      } else {
        // If switching from another reaction, decrement old
        if (userReaction) {
          newCounts[userReaction] = Math.max(
            0,
            (newCounts[userReaction] || 0) - 1
          );
        }
        // Increment new
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
          // Revert on error
          setCounts(prevCounts);
          setUserReaction(prevUserReaction);
        }
      } catch {
        // Revert on error
        setCounts(prevCounts);
        setUserReaction(prevUserReaction);
      } finally {
        setToggling(false);
      }
    },
    [toggling, session, counts, userReaction, storyId, chapterId]
  );

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
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
          Sign in to leave a reaction.
        </p>
      )}
    </div>
  );
}
