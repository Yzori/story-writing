"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CrossroadOption {
  label: string;
  totalDrops: number;
  voterCount: number;
  percentage: number;
  userDrops: number;
}

interface Crossroad {
  id: string;
  question: string;
  status: string;
  closesAt: string | null;
  options: CrossroadOption[];
  grandTotal: number;
  isExpired: boolean;
  resolvedOptionIndex?: number;
}

interface CrossroadsPanelProps {
  storyId: string;
  isOwner: boolean;
}

const VOTE_PRESETS = [5, 10, 25, 50];
const MAX_VOTE = 200;
const DURATION_OPTIONS = [
  { label: "3 days", value: 3 },
  { label: "5 days", value: 5 },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "No deadline", value: 0 },
];

export default function CrossroadsPanel({
  storyId,
  isOwner,
}: CrossroadsPanelProps) {
  const [crossroads, setCrossroads] = useState<Crossroad[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [votingOptionIndex, setVotingOptionIndex] = useState<number | null>(null);
  const [voteAmount, setVoteAmount] = useState<number | null>(null);
  const [customVoteAmount, setCustomVoteAmount] = useState("");
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createQuestion, setCreateQuestion] = useState("");
  const [createOptions, setCreateOptions] = useState(["", ""]);
  const [createDuration, setCreateDuration] = useState(7);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchCrossroads = useCallback(async () => {
    try {
      const res = await fetch(`/api/stories/${storyId}/crossroads`);
      if (res.ok) {
        const json = await res.json();
        setCrossroads(json.crossroads ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    fetchCrossroads();
  }, [fetchCrossroads]);

  const effectiveVoteAmount =
    voteAmount ?? (customVoteAmount ? parseInt(customVoteAmount, 10) : 0);

  const handleVoteClick = (crossroadId: string, optionIndex: number) => {
    if (votingId === crossroadId && votingOptionIndex === optionIndex) {
      // Toggle off
      setVotingId(null);
      setVotingOptionIndex(null);
      setVoteAmount(null);
      setCustomVoteAmount("");
      setVoteError(null);
      return;
    }
    setVotingId(crossroadId);
    setVotingOptionIndex(optionIndex);
    setVoteAmount(null);
    setCustomVoteAmount("");
    setVoteError(null);
  };

  const handleVoteSubmit = async () => {
    if (
      !votingId ||
      votingOptionIndex === null ||
      effectiveVoteAmount < 5 ||
      effectiveVoteAmount > MAX_VOTE ||
      voteSubmitting
    )
      return;

    setVoteSubmitting(true);
    setVoteError(null);

    try {
      const res = await fetch(
        `/api/stories/${storyId}/crossroads/${votingId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            optionIndex: votingOptionIndex,
            amount: effectiveVoteAmount,
          }),
        }
      );

      if (res.ok) {
        // Refresh crossroads data
        await fetchCrossroads();
        setVotingId(null);
        setVotingOptionIndex(null);
        setVoteAmount(null);
        setCustomVoteAmount("");
      } else {
        const json = await res.json().catch(() => ({}));
        setVoteError(
          json?.error?.code === "INSUFFICIENT_BALANCE"
            ? "Not enough Ink Drops"
            : json?.error?.message || "Failed to vote. Try again."
        );
      }
    } catch {
      setVoteError("Network error. Check your connection.");
    } finally {
      setVoteSubmitting(false);
    }
  };

  const handleCreateSubmit = async () => {
    const trimmedQuestion = createQuestion.trim();
    const trimmedOptions = createOptions
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    if (trimmedQuestion.length < 10 || trimmedQuestion.length > 500) {
      setCreateError("Question must be between 10 and 500 characters.");
      return;
    }
    if (trimmedOptions.length < 2) {
      setCreateError("At least 2 options are required.");
      return;
    }
    if (createSubmitting) return;

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch(`/api/stories/${storyId}/crossroads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmedQuestion,
          options: trimmedOptions.map((label) => ({ label })),
          closesInDays: createDuration || undefined,
        }),
      });

      if (res.ok) {
        await fetchCrossroads();
        setCreateQuestion("");
        setCreateOptions(["", ""]);
        setCreateDuration(7);
        setShowCreateForm(false);
      } else {
        const json = await res.json().catch(() => ({}));
        setCreateError(json?.error?.message || "Failed to create crossroad.");
      }
    } catch {
      setCreateError("Network error. Check your connection.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const addOption = () => {
    if (createOptions.length < 4) {
      setCreateOptions([...createOptions, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (createOptions.length > 2) {
      setCreateOptions(createOptions.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const next = [...createOptions];
    next[index] = value;
    setCreateOptions(next);
  };

  // Don't render anything while loading or if no crossroads and not the owner
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (crossroads.length === 0 && !isOwner) {
    return null;
  }

  const openCrossroads = crossroads.filter(
    (c) => c.status === "active" && !c.isExpired
  );
  const closedCrossroads = crossroads.filter(
    (c) => c.status !== "active" || c.isExpired
  );

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-amber"
          >
            <path d="M8 2v4M8 6L4 12M8 6l4 6" />
            <circle cx="8" cy="2" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
          </svg>
          <h3 className="font-display text-lg text-paper font-semibold">
            Crossroads
          </h3>
        </div>
        {isOwner && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber/10 border border-amber/20 text-amber hover:bg-amber/15 transition-all cursor-pointer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
            New Crossroad
          </button>
        )}
      </div>

      {/* Create form (owner only) */}
      <AnimatePresence>
        {isOwner && showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-amber/20 bg-ink/50 p-5 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">
                  Create a Crossroad
                </p>
                <p className="text-text-secondary text-[12px] mb-4">
                  Pose a question and let your readers shape the story with their
                  Ink Drops.
                </p>
              </div>

              {/* Question */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                  Question (10-500 characters)
                </label>
                <textarea
                  value={createQuestion}
                  onChange={(e) => {
                    if (e.target.value.length <= 500)
                      setCreateQuestion(e.target.value);
                  }}
                  placeholder="What path should the hero take?"
                  rows={2}
                  className="w-full bg-void/50 border border-border rounded-xl px-4 py-3 text-text text-[13px] placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                />
                <div className="flex justify-end">
                  <span className="text-[11px] text-text-ghost">
                    {createQuestion.length}/500
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                  Options (2-4)
                </label>
                {createOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] text-text-ghost font-mono w-5 text-right flex-shrink-0">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="flex-1 bg-void/50 border border-border rounded-lg px-3 py-2 text-text text-[13px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                    />
                    {createOptions.length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="p-1.5 text-text-ghost hover:text-rose transition-colors cursor-pointer"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {createOptions.length < 4 && (
                  <button
                    onClick={addOption}
                    className="text-[12px] text-amber hover:text-amber-light transition-colors cursor-pointer ml-7"
                  >
                    + Add option
                  </button>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                  Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setCreateDuration(d.value)}
                      className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all cursor-pointer ${
                        createDuration === d.value
                          ? "bg-amber/15 border-amber/40 text-amber"
                          : "bg-void/50 border-border text-text-secondary hover:border-amber/25"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {createError && (
                <p className="text-rose text-[12px]">{createError}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleCreateSubmit}
                  disabled={
                    createSubmitting ||
                    createQuestion.trim().length < 10 ||
                    createOptions.filter((o) => o.trim()).length < 2
                  }
                  className="px-5 py-2 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {createSubmitting ? "Posting..." : "Post Crossroad"}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError(null);
                  }}
                  disabled={createSubmitting}
                  className="px-4 py-2 text-text-secondary hover:text-paper text-[13px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {crossroads.length === 0 && isOwner && !showCreateForm && (
        <div className="rounded-xl border border-border bg-ink/50 p-8 text-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-text-ghost mx-auto mb-3"
          >
            <path d="M8 2v4M8 6L4 12M8 6l4 6" />
            <circle cx="8" cy="2" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
          </svg>
          <p className="text-paper text-[14px] font-medium mb-1">
            Engage your readers
          </p>
          <p className="text-text-secondary text-[12px] max-w-sm mx-auto">
            Create a crossroad to let readers vote on the direction of your
            story. They spend Ink Drops to weigh in.
          </p>
        </div>
      )}

      {/* Open crossroads */}
      {openCrossroads.map((cr) => (
        <CrossroadCard
          key={cr.id}
          crossroad={cr}
          storyId={storyId}
          isOwner={isOwner}
          isVoting={votingId === cr.id}
          votingOptionIndex={
            votingId === cr.id ? votingOptionIndex : null
          }
          effectiveVoteAmount={effectiveVoteAmount}
          voteAmount={voteAmount}
          customVoteAmount={customVoteAmount}
          voteSubmitting={voteSubmitting}
          voteError={votingId === cr.id ? voteError : null}
          onVoteClick={(optIndex) => handleVoteClick(cr.id, optIndex)}
          onPresetSelect={setVoteAmount}
          onCustomChange={(v) => {
            setCustomVoteAmount(v.replace(/[^0-9]/g, ""));
            setVoteAmount(null);
          }}
          onVoteSubmit={handleVoteSubmit}
          onResolved={fetchCrossroads}
        />
      ))}

      {/* Closed crossroads */}
      {closedCrossroads.length > 0 && (
        <div className="space-y-4">
          {openCrossroads.length > 0 && (
            <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mt-4">
              Past Crossroads
            </p>
          )}
          {closedCrossroads.map((cr) => (
            <CrossroadCard
              key={cr.id}
              crossroad={cr}
              storyId={storyId}
              isOwner={isOwner}
              isClosed
              isVoting={false}
              votingOptionIndex={null}
              effectiveVoteAmount={0}
              voteAmount={null}
              customVoteAmount=""
              voteSubmitting={false}
              voteError={null}
              onVoteClick={() => {}}
              onPresetSelect={() => {}}
              onCustomChange={() => {}}
              onVoteSubmit={() => {}}
              onResolved={fetchCrossroads}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Individual Crossroad Card ─── */

interface CrossroadCardProps {
  crossroad: Crossroad;
  storyId: string;
  isOwner: boolean;
  isClosed?: boolean;
  isVoting: boolean;
  votingOptionIndex: number | null;
  effectiveVoteAmount: number;
  voteAmount: number | null;
  customVoteAmount: string;
  voteSubmitting: boolean;
  voteError: string | null;
  onVoteClick: (optionIndex: number) => void;
  onPresetSelect: (amount: number) => void;
  onCustomChange: (value: string) => void;
  onVoteSubmit: () => void;
  onResolved: () => void;
}

function CrossroadCard({
  crossroad,
  storyId,
  isOwner,
  isClosed,
  isVoting,
  votingOptionIndex,
  effectiveVoteAmount,
  voteAmount,
  customVoteAmount,
  voteSubmitting,
  voteError,
  onVoteClick,
  onPresetSelect,
  onCustomChange,
  onVoteSubmit,
  onResolved,
}: CrossroadCardProps) {
  const maxDrops = Math.max(...crossroad.options.map((o) => o.totalDrops), 1);
  const isResolved = crossroad.resolvedOptionIndex !== undefined;

  const [showResolveUI, setShowResolveUI] = useState(false);
  const [selectedResolveIndex, setSelectedResolveIndex] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const canResolve = isOwner && !isResolved && (crossroad.status === "active" || isClosed);

  const handleResolve = async () => {
    if (selectedResolveIndex === null || resolving) return;
    setResolving(true);
    setResolveError(null);

    try {
      const res = await fetch(
        `/api/stories/${storyId}/crossroads/${crossroad.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resolve",
            resolvedOption: selectedResolveIndex,
          }),
        }
      );

      if (res.ok) {
        setShowResolveUI(false);
        onResolved();
      } else {
        const json = await res.json().catch(() => ({}));
        setResolveError(json?.error?.message || "Failed to resolve crossroad.");
      }
    } catch {
      setResolveError("Network error. Check your connection.");
    } finally {
      setResolving(false);
    }
  };

  const timeLeft = crossroad.closesAt
    ? getTimeLeft(crossroad.closesAt)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-ink/50 p-5 ${
        isClosed
          ? "border-border-subtle opacity-80"
          : "border-border"
      }`}
    >
      {/* Question */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h4 className="font-display text-[15px] text-paper font-semibold leading-snug">
          {crossroad.question}
        </h4>
        {isClosed ? (
          <span className="flex-shrink-0 text-[10px] uppercase tracking-[0.1em] text-text-ghost bg-surface/60 px-2 py-0.5 rounded-full border border-border-subtle">
            Closed
          </span>
        ) : timeLeft ? (
          <span className="flex-shrink-0 text-[10px] text-text-ghost whitespace-nowrap">
            {timeLeft}
          </span>
        ) : null}
      </div>

      {/* Grand total */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="text-amber/50"
        >
          <path d="M8 2C8 2 4 7 4 10a4 4 0 0 0 8 0c0-3-4-8-4-8z" />
        </svg>
        <span className="text-[12px] text-text-secondary">
          <span className="text-paper font-semibold">
            {crossroad.grandTotal.toLocaleString()}
          </span>{" "}
          total Ink Drops
        </span>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {crossroad.options.map((opt, i) => {
          const isLeading =
            !isClosed &&
            opt.totalDrops > 0 &&
            opt.totalDrops === maxDrops;
          const isWinner =
            isResolved && crossroad.resolvedOptionIndex === i;
          const isSelected = isVoting && votingOptionIndex === i;
          const barWidth =
            crossroad.grandTotal > 0
              ? Math.max((opt.totalDrops / crossroad.grandTotal) * 100, 0)
              : 0;

          return (
            <div key={i}>
              <button
                onClick={() => !isClosed && onVoteClick(i)}
                disabled={!!isClosed}
                className={`w-full text-left relative rounded-lg overflow-hidden transition-all duration-200 ${
                  isClosed
                    ? "cursor-default"
                    : "cursor-pointer hover:bg-surface/30"
                } ${isSelected ? "ring-1 ring-amber/40" : ""}`}
              >
                {/* Background bar */}
                <div className="absolute inset-0 rounded-lg bg-gold/5" />
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-lg ${
                    isWinner
                      ? "bg-amber/25"
                      : isLeading
                        ? "bg-gold/20"
                        : "bg-gold/10"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />

                <div className="relative flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isWinner && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-amber flex-shrink-0"
                      >
                        <path d="M3 8l3 3 7-7" />
                      </svg>
                    )}
                    <span
                      className={`text-[13px] font-medium truncate ${
                        isWinner
                          ? "text-amber"
                          : isLeading
                            ? "text-paper"
                            : "text-text-secondary"
                      }`}
                    >
                      {opt.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    {/* User contribution */}
                    {opt.userDrops > 0 && (
                      <span className="text-[10px] text-amber/70 bg-amber/10 px-1.5 py-0.5 rounded-full">
                        You: {opt.userDrops}
                      </span>
                    )}
                    <span className="text-[11px] text-text-ghost tabular-nums">
                      {opt.totalDrops.toLocaleString()} drops
                    </span>
                    <span className="text-[10px] text-text-ghost tabular-nums w-8 text-right">
                      {Math.round(opt.percentage)}%
                    </span>
                    {!isClosed && (
                      <span className="text-[10px] text-text-ghost">
                        {opt.voterCount} voter{opt.voterCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Vote amount selector */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 pb-1 px-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.1em] text-text-ghost">
                          Amount:
                        </span>
                        {VOTE_PRESETS.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => {
                              onPresetSelect(amt);
                              onCustomChange("");
                            }}
                            className={`px-3 py-1 rounded-full border text-[12px] font-medium transition-all cursor-pointer ${
                              voteAmount === amt
                                ? "bg-amber/15 border-amber/40 text-amber"
                                : "bg-void/50 border-border text-text-secondary hover:border-amber/25"
                            }`}
                          >
                            {amt}
                          </button>
                        ))}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={customVoteAmount}
                          onChange={(e) => onCustomChange(e.target.value)}
                          placeholder="Custom"
                          className="w-20 bg-void/50 border border-border rounded-lg px-2.5 py-1 text-text text-[12px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                        />
                      </div>

                      {voteError && (
                        <p className="text-rose text-[11px]">{voteError}</p>
                      )}

                      <button
                        onClick={onVoteSubmit}
                        disabled={
                          voteSubmitting ||
                          effectiveVoteAmount < 5 ||
                          effectiveVoteAmount > MAX_VOTE
                        }
                        className="px-4 py-1.5 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {voteSubmitting
                          ? "Voting..."
                          : effectiveVoteAmount >= 5
                            ? `Vote ${effectiveVoteAmount} Drops`
                            : "Select amount"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Resolve UI (owner only) ── */}
      {canResolve && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          {!showResolveUI ? (
            <button
              onClick={() => setShowResolveUI(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber/10 border border-amber/20 text-amber hover:bg-amber/15 transition-all cursor-pointer"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 8l3 3 7-7" />
              </svg>
              Resolve
            </button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold">
                  Which option did you choose?
                </p>
                <div className="flex flex-wrap gap-2">
                  {crossroad.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedResolveIndex(i)}
                      className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all cursor-pointer ${
                        selectedResolveIndex === i
                          ? "bg-amber/15 border-amber/40 text-amber"
                          : "bg-void/50 border-border text-text-secondary hover:border-amber/25"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {resolveError && (
                  <p className="text-rose text-[11px]">{resolveError}</p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResolve}
                    disabled={selectedResolveIndex === null || resolving}
                    className="px-4 py-1.5 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resolving ? "Resolving..." : "Confirm Resolution"}
                  </button>
                  <button
                    onClick={() => {
                      setShowResolveUI(false);
                      setSelectedResolveIndex(null);
                      setResolveError(null);
                    }}
                    disabled={resolving}
                    className="px-3 py-1.5 text-text-secondary hover:text-paper text-[12px] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Helpers ─── */

function getTimeLeft(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 1) return `${days}d left`;
  if (days === 1) return "1d left";
  if (hours > 0) return `${hours}h left`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m left`;
}
