"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TIP_TIERS = [5, 10, 25, 50, 100] as const;

interface Recipient {
  id: string;
  name: string;
  role?: string; // "GM" | character name
}

interface TipModalProps {
  recipients: Recipient[];
  balance: number;
  onSend: (recipientUserId: string, amount: number, message?: string) => Promise<number>;
  onClose: () => void;
}

export default function TipModal({
  recipients,
  balance,
  onSend,
  onClose,
}: TipModalProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<string>(
    recipients[0]?.id || ""
  );
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSend =
    selectedRecipient && selectedAmount && selectedAmount <= balance && !sending;

  const handleSend = async () => {
    if (!canSend || !selectedAmount) return;

    setSending(true);
    setError(null);

    try {
      await onSend(selectedRecipient, selectedAmount, message || undefined);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send tip");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm bg-surface border border-border rounded-xl p-5 shadow-xl"
        >
          {success ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: [-8, 0] }}
                transition={{ repeat: 2, duration: 0.3 }}
                className="text-4xl"
              >
                💧
              </motion.div>
              <p className="text-gold font-medium">Ink Drops sent!</p>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-gold"
                  >
                    <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
                  </svg>
                  <h3 className="font-medium text-paper">Send Ink Drops</h3>
                </div>
                <button
                  onClick={onClose}
                  className="text-text-ghost hover:text-text transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              {/* Recipient selector */}
              {recipients.length > 1 && (
                <div className="mb-3">
                  <label className="text-[11px] text-text-secondary uppercase tracking-wider mb-1.5 block">
                    Send to
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {recipients.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRecipient(r.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                          selectedRecipient === r.id
                            ? "bg-gold/15 border border-gold/30 text-gold"
                            : "bg-elevated/50 border border-border text-text-secondary hover:border-border-active"
                        }`}
                      >
                        {r.role ? `${r.name} (${r.role})` : r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount tiers */}
              <div className="mb-3">
                <label className="text-[11px] text-text-secondary uppercase tracking-wider mb-1.5 block">
                  Amount
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {TIP_TIERS.map((tier) => {
                    const affordable = tier <= balance;
                    return (
                      <button
                        key={tier}
                        onClick={() => affordable && setSelectedAmount(tier)}
                        disabled={!affordable}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedAmount === tier
                            ? "bg-gold/15 border border-gold/30 text-gold"
                            : affordable
                            ? "bg-elevated/50 border border-border text-text hover:border-border-active"
                            : "bg-elevated/30 border border-border/50 text-text-ghost cursor-not-allowed"
                        }`}
                      >
                        {tier}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="text-[11px] text-text-secondary uppercase tracking-wider mb-1.5 block">
                  Message <span className="normal-case text-text-ghost">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                  placeholder="Great storytelling..."
                  rows={2}
                  className="w-full bg-elevated/50 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-ghost resize-none focus:outline-none focus:border-gold/30"
                />
                <div className="text-right text-[10px] text-text-ghost mt-0.5">
                  {message.length}/200
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-rose mb-3">{error}</p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-ghost">
                  Balance: <span className="text-gold tabular-nums">{balance}</span>
                </span>
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    canSend
                      ? "bg-gold/15 border border-gold/30 text-gold hover:bg-gold/25 cursor-pointer"
                      : "bg-elevated/30 border border-border/50 text-text-ghost cursor-not-allowed"
                  }`}
                >
                  {sending ? "Sending..." : `Send ${selectedAmount || "—"} Drops`}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
