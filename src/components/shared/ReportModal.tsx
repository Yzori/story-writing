"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId?: string;
  commentId?: string;
}

const REASONS = [
  {
    value: "misrated",
    label: "Misrated content",
    description:
      "The content rating does not accurately reflect the material in this story.",
  },
  {
    value: "harmful",
    label: "Harmful content",
    description:
      "Contains content that is abusive, threatening, or violates community guidelines.",
  },
  {
    value: "spam",
    label: "Spam or bad faith",
    description:
      "This content is spam, misleading, or was posted in bad faith.",
  },
] as const;

type Reason = (typeof REASONS)[number]["value"];

export default function ReportModal({
  isOpen,
  onClose,
  storyId,
  commentId,
}: ReportModalProps) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          details: details.trim() || undefined,
          storyId,
          commentId,
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const json = await res.json();
        setError(json.error?.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after animation completes
    setTimeout(() => {
      setReason(null);
      setDetails("");
      setSuccess(false);
      setError(null);
    }, 200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-void/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="font-display text-lg text-paper font-semibold">
                Report Content
              </h2>
              <button
                onClick={handleClose}
                className="text-text-ghost hover:text-text transition-colors p-1"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
                </svg>
              </button>
            </div>

            {success ? (
              /* Success state */
              <div className="px-6 pb-8 pt-2 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-sage"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-text-secondary text-[14px] leading-relaxed max-w-xs mx-auto">
                  Thank you for your report. Our stewardship team will review
                  it.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-2.5 bg-surface border border-border text-text text-[13px] font-medium rounded-full hover:border-amber/25 transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Form */
              <div className="px-6 pb-6">
                <p className="text-text-secondary text-[13px] mb-5">
                  Select a reason for reporting this content.
                </p>

                {/* Reason options */}
                <div className="space-y-2.5 mb-5">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                        reason === r.value
                          ? "bg-amber/5 border-amber/25"
                          : "bg-ink/50 border-border-subtle hover:border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="sr-only"
                      />
                      <div
                        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          reason === r.value
                            ? "border-amber"
                            : "border-text-ghost"
                        }`}
                      >
                        {reason === r.value && (
                          <div className="w-2 h-2 rounded-full bg-amber" />
                        )}
                      </div>
                      <div>
                        <p className="text-paper text-[13px] font-medium">
                          {r.label}
                        </p>
                        <p className="text-text-ghost text-[12px] mt-0.5 leading-relaxed">
                          {r.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Details textarea */}
                <div className="mb-5">
                  <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                    Additional details{" "}
                    <span className="normal-case tracking-normal">(optional)</span>
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) setDetails(e.target.value);
                    }}
                    placeholder="Provide any additional context..."
                    rows={3}
                    className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-text text-[13px] placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                  />
                  <span className="text-[11px] text-text-ghost mt-1 block text-right">
                    {details.length}/1000
                  </span>
                </div>

                {/* Error message */}
                {error && (
                  <p className="text-rose text-[12px] mb-4">{error}</p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2.5 text-text-secondary text-[13px] font-medium hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || submitting}
                    className="px-6 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
