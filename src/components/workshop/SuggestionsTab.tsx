"use client";

import { motion } from "framer-motion";

interface Suggestion {
  id: string;
  storyId: string;
  chapterId: string;
  userId: string;
  content: string;
  note: string | null;
  status: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

const SUGGESTION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber/10 text-amber border-amber/20",
  woven: "bg-sage/10 text-sage border-sage/20",
  revised: "bg-lavender/10 text-lavender border-lavender/20",
  passed: "bg-rose/10 text-rose border-rose/20",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return new Date(dateStr).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

interface SuggestionsTabProps {
  isOwner: boolean;
  suggestions: Suggestion[];
  suggestionsLoading: boolean;
  showSuggestionForm: boolean;
  setShowSuggestionForm: (v: boolean) => void;
  suggestionChapterId: string;
  setSuggestionChapterId: (v: string) => void;
  suggestionContent: string;
  setSuggestionContent: (v: string) => void;
  suggestionNote: string;
  setSuggestionNote: (v: string) => void;
  submittingSuggestion: boolean;
  handleSubmitSuggestion: () => void;
  reviewNotes: Record<string, string>;
  setReviewNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  reviewingId: string | null;
  handleReviewSuggestion: (suggestionId: string, status: "woven" | "passed") => void;
  chapters: { id: string; title: string }[];
  getChapterTitle: (chapterId: string) => string;
}

export function SuggestionsTab({
  isOwner,
  suggestions,
  suggestionsLoading,
  showSuggestionForm,
  setShowSuggestionForm,
  suggestionChapterId,
  setSuggestionChapterId,
  suggestionContent,
  setSuggestionContent,
  suggestionNote,
  setSuggestionNote,
  submittingSuggestion,
  handleSubmitSuggestion,
  reviewNotes,
  setReviewNotes,
  reviewingId,
  handleReviewSuggestion,
  chapters,
  getChapterTitle,
}: SuggestionsTabProps) {
  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {/* New Suggestion form (collaborators, not just owner) */}
      <div className="mb-6">
        {!showSuggestionForm ? (
          <button
            onClick={() => setShowSuggestionForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface/80 border border-border text-paper font-medium text-[13px] rounded-full hover:border-amber/25 hover:text-amber transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" />
            </svg>
            New Suggestion
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface/80 border border-border rounded-xl p-5"
          >
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              New Suggestion
            </span>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                  Chapter
                </label>
                <select
                  value={suggestionChapterId}
                  onChange={(e) => setSuggestionChapterId(e.target.value)}
                  className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] focus:outline-none focus:border-amber/30 transition-colors"
                >
                  <option value="">Select a chapter...</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                  Content
                </label>
                <textarea
                  value={suggestionContent}
                  onChange={(e) => setSuggestionContent(e.target.value)}
                  placeholder="Write your suggestion..."
                  rows={4}
                  className="w-full bg-ink border border-border rounded-lg px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5 block">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={suggestionNote}
                  onChange={(e) => setSuggestionNote(e.target.value)}
                  placeholder="Add context for the author..."
                  className="w-full bg-ink border border-border rounded-lg px-4 py-2.5 text-text text-[13px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubmitSuggestion}
                  disabled={
                    submittingSuggestion ||
                    !suggestionContent.trim() ||
                    !suggestionChapterId
                  }
                  className="px-4 py-2 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submittingSuggestion ? "Submitting..." : "Submit Suggestion"}
                </button>
                <button
                  onClick={() => setShowSuggestionForm(false)}
                  className="text-text-secondary text-[12px] hover:text-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggestions list */}
      {suggestionsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      ) : suggestions.length > 0 ? (
        <div className="space-y-3">
          {suggestions.map((suggestion, i) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className="bg-surface/80 border border-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-[11px] font-display font-semibold flex-shrink-0 overflow-hidden">
                    {suggestion.user?.avatarUrl ? (
                      <img
                        src={suggestion.user.avatarUrl}
                        alt={suggestion.user.displayName || ""}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      (suggestion.user?.displayName || "?").charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="text-paper text-[13px] font-medium">
                      {suggestion.user?.displayName || "Unknown"}
                    </p>
                    <p className="text-text-ghost text-[11px]">
                      {getChapterTitle(suggestion.chapterId)} &middot;{" "}
                      {relativeTime(suggestion.createdAt)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border ${
                    SUGGESTION_STATUS_COLORS[suggestion.status] ||
                    SUGGESTION_STATUS_COLORS.pending
                  }`}
                >
                  {suggestion.status}
                </span>
              </div>

              {/* Content preview */}
              <div className="bg-ink/50 border border-border-subtle rounded-lg p-3 mb-3">
                <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap">
                  {suggestion.content.length > 300
                    ? suggestion.content.slice(0, 300) + "..."
                    : suggestion.content}
                </p>
              </div>

              {suggestion.note && (
                <p className="text-text-ghost text-[12px] italic mb-3">
                  Note: {suggestion.note}
                </p>
              )}

              {suggestion.reviewNote && (
                <p className="text-text-ghost text-[12px] italic mb-3">
                  Review note: {suggestion.reviewNote}
                </p>
              )}

              {/* Owner actions on pending suggestions */}
              {isOwner && suggestion.status === "pending" && (
                <div className="border-t border-border-subtle pt-3 mt-3">
                  <div className="mb-2">
                    <input
                      type="text"
                      value={reviewNotes[suggestion.id] || ""}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({
                          ...prev,
                          [suggestion.id]: e.target.value,
                        }))
                      }
                      placeholder="Review note (optional)..."
                      className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-text text-[12px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleReviewSuggestion(suggestion.id, "woven")
                      }
                      disabled={reviewingId === suggestion.id}
                      className="px-3 py-1.5 bg-sage/10 border border-sage/20 text-sage text-[11px] font-medium rounded-full hover:bg-sage/20 transition-all disabled:opacity-40"
                    >
                      Weave
                    </button>
                    <button
                      onClick={() =>
                        handleReviewSuggestion(suggestion.id, "passed")
                      }
                      disabled={reviewingId === suggestion.id}
                      className="px-3 py-1.5 bg-rose/10 border border-rose/20 text-rose text-[11px] font-medium rounded-full hover:bg-rose/20 transition-all disabled:opacity-40"
                    >
                      Pass
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-surface/60 border border-border rounded-2xl p-14 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost mx-auto mb-3">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <p className="text-text-secondary text-[13px]">
            No suggestions yet. Be the first to contribute an idea.
          </p>
        </div>
      )}
    </motion.div>
  );
}
