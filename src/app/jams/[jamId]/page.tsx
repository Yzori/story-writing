"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";

interface JamEntry {
  id: string;
  storyId: string;
  storyTitle: string;
  storySlug: string | null;
  storyCover: string | null;
  storyGenres: string[];
  authorName: string | null;
  avgRating: number;
  voteCount: number;
  userVote: number | null;
}

interface JamDetail {
  id: string;
  title: string;
  description: string;
  theme: string;
  submissionStartsAt: string;
  submissionEndsAt: string;
  votingStartsAt: string;
  votingEndsAt: string;
  wordCountMin: number | null;
  wordCountMax: number | null;
  liveStatus: string;
  entries: JamEntry[];
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function JamDetailPage() {
  const { jamId } = useParams() as { jamId: string };
  const { data: session } = useSession();
  const [jam, setJam] = useState<JamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStoryId, setSubmitStoryId] = useState("");
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [votingEntry, setVotingEntry] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/jams/${jamId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.data && setJam(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jamId]);

  const handleSubmitEntry = async () => {
    if (!submitStoryId.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jams/${jamId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: submitStoryId }),
      });
      if (res.ok) {
        setShowSubmitForm(false);
        setSubmitStoryId("");
        // Refresh
        const refreshRes = await fetch(`/api/jams/${jamId}`);
        if (refreshRes.ok) {
          const d = await refreshRes.json();
          setJam(d.data);
        }
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to submit");
      }
    } catch {
      alert("Failed to submit entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (entryId: string, rating: number) => {
    setVotingEntry(entryId);
    try {
      const res = await fetch(`/api/jams/${jamId}/entries/${entryId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (res.ok && jam) {
        setJam({
          ...jam,
          entries: jam.entries.map((e) =>
            e.id === entryId ? { ...e, userVote: rating } : e
          ),
        });
      }
    } catch {
      // ignore
    } finally {
      setVotingEntry(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-amber/20 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (!jam) {
    return (
      <div className="text-center py-20 text-text-ghost">Jam not found</div>
    );
  }

  const isOpen = jam.liveStatus === "open";
  const isVoting = jam.liveStatus === "voting";
  const isEnded = jam.liveStatus === "ended";

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <Link href="/jams" className="text-xs text-text-ghost hover:text-paper transition-colors mb-3 inline-block">
            &larr; All Jams
          </Link>
          <h1 className="font-display text-3xl text-paper font-bold">{jam.title}</h1>
          <p className="text-text-secondary mt-2 italic">Theme: {jam.theme}</p>
          <p className="text-sm text-text mt-3 leading-relaxed">{jam.description}</p>
        </div>

        {/* Timeline */}
        <div className="flex flex-wrap gap-6 mb-8 text-xs text-text-ghost">
          <div>
            <span className="text-[10px] uppercase tracking-wider block mb-0.5">Submissions</span>
            <span className="text-text">{formatDate(jam.submissionStartsAt)} — {formatDate(jam.submissionEndsAt)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider block mb-0.5">Voting</span>
            <span className="text-text">{formatDate(jam.votingStartsAt)} — {formatDate(jam.votingEndsAt)}</span>
          </div>
          {(jam.wordCountMin || jam.wordCountMax) && (
            <div>
              <span className="text-[10px] uppercase tracking-wider block mb-0.5">Word Count</span>
              <span className="text-text">{jam.wordCountMin || 0} — {jam.wordCountMax || "∞"}</span>
            </div>
          )}
        </div>

        {/* Submit button (open phase) */}
        {isOpen && session?.user && (
          <div className="mb-8">
            {showSubmitForm ? (
              <div className="card-page p-4">
                <label className="text-[10px] uppercase tracking-wider text-text-ghost block mb-2">
                  Story ID to submit
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={submitStoryId}
                    onChange={(e) => setSubmitStoryId(e.target.value)}
                    placeholder="Paste your story ID"
                    className="flex-1 bg-elevated/50 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-ghost focus:outline-none focus:border-amber/30"
                  />
                  <button
                    onClick={handleSubmitEntry}
                    disabled={submitting || !submitStoryId.trim()}
                    className="px-4 py-2 bg-amber/15 border border-amber/25 text-amber rounded-lg text-sm font-medium disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {submitting ? "..." : "Submit"}
                  </button>
                  <button
                    onClick={() => setShowSubmitForm(false)}
                    className="px-3 py-2 text-text-ghost text-sm hover:text-text"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="px-5 py-2.5 bg-amber/10 border border-amber/20 text-amber font-semibold text-sm rounded-full hover:bg-amber/15 transition-all cursor-pointer"
              >
                Submit Your Story
              </button>
            )}
          </div>
        )}

        {/* Entries */}
        <div>
          <h2 className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold mb-4">
            {isEnded ? "Results" : "Entries"} ({jam.entries.length})
          </h2>

          {jam.entries.length === 0 ? (
            <p className="text-text-ghost text-center py-12">
              {isOpen ? "No entries yet. Be the first!" : "No entries were submitted."}
            </p>
          ) : (
            <div className="space-y-3">
              {jam.entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card-page p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {isEnded && (
                      <span className="text-lg font-display font-bold text-gold tabular-nums w-8 text-center">
                        #{i + 1}
                      </span>
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/story/${entry.storySlug || entry.storyId}`}
                        className="font-semibold text-sm text-paper hover:text-amber transition-colors truncate block"
                      >
                        {entry.storyTitle}
                      </Link>
                      <span className="text-xs text-text-ghost">
                        by {entry.authorName || "Anonymous"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {(isVoting || isEnded) && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => isVoting && handleVote(entry.id, star)}
                            disabled={!isVoting || votingEntry === entry.id}
                            className={`text-lg transition-colors ${
                              star <= (entry.userVote ?? 0)
                                ? "text-amber"
                                : "text-text-ghost/30 hover:text-amber/50"
                            } ${isVoting ? "cursor-pointer" : "cursor-default"}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    )}

                    {(isVoting || isEnded) && entry.voteCount > 0 && (
                      <span className="text-xs text-text-ghost tabular-nums">
                        {entry.avgRating.toFixed(1)} ({entry.voteCount})
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
