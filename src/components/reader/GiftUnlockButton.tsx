"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GiftUnlockButtonProps {
  storyId: string;
  chapterId: string;
  price: number;
  tier: string;
}

export default function GiftUnlockButton({
  storyId,
  chapterId,
  price,
  tier,
}: GiftUnlockButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = useCallback(async () => {
    const trimmed = recipient.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/stories/${storyId}/chapters/${chapterId}/unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giftTo: trimmed }),
        }
      );

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error?.code === "INSUFFICIENT_BALANCE"
            ? "Not enough Ink Drops to send this gift."
            : data?.error?.code === "USER_NOT_FOUND"
              ? "Could not find that user."
              : data?.error?.message || "Failed to send gift. Try again."
        );
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setSending(false);
    }
  }, [storyId, chapterId, recipient, sending]);

  const handleClose = () => {
    setShowModal(false);
    // Reset state after animation completes
    setTimeout(() => {
      setRecipient("");
      setError(null);
      setSuccess(false);
    }, 200);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 text-text-ghost text-xs hover:text-gold transition-colors cursor-pointer"
      >
        <GiftIcon className="w-3.5 h-3.5" />
        <span>Gift this chapter</span>
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-void/70 backdrop-blur-sm"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-sm rounded-xl border border-border bg-ink/50 backdrop-blur-md p-6"
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-text-ghost hover:text-text-secondary transition-colors cursor-pointer p-1"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>

              <AnimatePresence mode="wait">
                {success ? (
                  /* Success state */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gold"
                      >
                        <path d="M3 8l3 3 7-7" />
                      </svg>
                    </div>
                    <h3 className="font-display text-lg text-paper mb-1">
                      Gift Sent
                    </h3>
                    <p className="text-text-secondary text-sm mb-5">
                      The chapter unlock has been gifted to{" "}
                      <span className="text-gold">{recipient.trim()}</span>.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-5 py-2 rounded-lg bg-surface/50 border border-border text-text-secondary text-sm hover:text-text transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  /* Form state */
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2.5 mb-1">
                      <GiftIcon className="w-5 h-5 text-gold" />
                      <h3 className="font-display text-lg text-paper">
                        Gift Chapter Unlock
                      </h3>
                    </div>
                    <p className="text-text-secondary text-sm mb-5">
                      Send a {price} Ink Drop unlock
                      {tier !== "standard" ? ` (${tier})` : ""} to another
                      reader.
                    </p>

                    {/* Recipient input */}
                    <div className="space-y-1.5 mb-4">
                      <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold">
                        Recipient
                      </label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="Display name or email"
                        className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && recipient.trim()) {
                            handleSend();
                          }
                        }}
                      />
                    </div>

                    {/* Cost display */}
                    <div className="flex items-center gap-2 rounded-lg bg-surface/30 border border-border-subtle px-3 py-2 mb-4">
                      <DropletIcon className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                      <span className="text-text-secondary text-xs">
                        This will cost{" "}
                        <span className="text-paper font-medium">
                          {price} Ink Drops
                        </span>{" "}
                        from your balance.
                      </span>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-rose text-xs mb-3"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSend}
                        disabled={sending || !recipient.trim()}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        {sending ? (
                          <>
                            <span className="inline-block w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Gift"
                        )}
                      </button>
                      <button
                        onClick={handleClose}
                        disabled={sending}
                        className="px-4 py-2.5 text-text-secondary hover:text-paper text-sm transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Inline SVG Icons ─── */

function GiftIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 12 8 12 8" />
      <path d="M16.5 8a2.5 2.5 0 0 0 0-5C15 3 12 8 12 8" />
    </svg>
  );
}

function DropletIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}
