"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface DonationButtonProps {
  storyId: string;
  authorName: string;
  storyTitle: string;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];
const MIN_AMOUNT = 5;
const MAX_AMOUNT = 500;
const MAX_MESSAGE_LENGTH = 300;

type ModalState = "form" | "confirm" | "success" | "error";

export default function DonationButton({
  storyId,
  authorName,
  storyTitle,
}: DonationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalState, setModalState] = useState<ModalState>("form");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveAmount =
    selectedAmount ?? (customAmount ? parseInt(customAmount, 10) : 0);
  const isValidAmount =
    effectiveAmount >= MIN_AMOUNT && effectiveAmount <= MAX_AMOUNT;
  const hasInsufficientBalance =
    balance !== null && effectiveAmount > balance;

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/user/ink-drops");
      if (res.ok) {
        const json = await res.json();
        setBalance(json.balance ?? 0);
      }
    } catch {
      // silently fail
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
    }
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, [isOpen, fetchBalance]);

  const resetForm = useCallback(() => {
    setSelectedAmount(null);
    setCustomAmount("");
    setMessage("");
    setModalState("form");
    setErrorCode(null);
  }, []);

  const handleOpen = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (sending) return;
    setIsOpen(false);
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
  };

  const handleSelectPreset = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    setCustomAmount(cleaned);
    setSelectedAmount(null);
  };

  const handleConfirm = () => {
    if (!isValidAmount) return;
    if (hasInsufficientBalance) return;
    setModalState("confirm");
  };

  const handleSend = async () => {
    if (!isValidAmount || sending) return;
    setSending(true);
    setErrorCode(null);

    try {
      const res = await fetch(`/api/stories/${storyId}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: effectiveAmount,
          message: message.trim() || undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setSentAmount(effectiveAmount);
        setBalance(json.newBalance ?? null);
        setModalState("success");

        autoCloseRef.current = setTimeout(() => {
          setIsOpen(false);
        }, 3000);
      } else {
        const json = await res.json().catch(() => ({}));
        const code = json?.error?.code;
        if (code === "INSUFFICIENT_BALANCE") {
          setErrorCode("INSUFFICIENT_BALANCE");
          setModalState("form");
          // Refresh balance
          fetchBalance();
        } else {
          setErrorCode("UNKNOWN");
          setModalState("form");
        }
      }
    } catch {
      setErrorCode("NETWORK");
      setModalState("form");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border bg-surface/80 border-border text-text-secondary hover:border-amber/25 hover:text-amber text-[13px] font-medium transition-all duration-200 cursor-pointer"
      >
        {/* Ink drop icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M8 2C8 2 4 7 4 10a4 4 0 0 0 8 0c0-3-4-8-4-8z" />
        </svg>
        Leave a Gift
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-void/80 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Modal content */}
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl shadow-void/50 overflow-hidden"
            >
              {/* Top glow */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

              {/* Success state */}
              {modalState === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-amber/15 border border-amber/25 flex items-center justify-center mb-5">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-amber"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl text-paper font-semibold mb-2">
                    Gift Sent!
                  </h3>
                  <p className="text-text-secondary text-[13px]">
                    You sent{" "}
                    <span className="text-amber font-semibold">
                      {sentAmount} drops of ink
                    </span>{" "}
                    to {authorName}&apos;s well
                  </p>
                  <p className="text-text-ghost text-[11px] mt-3">
                    Closing automatically...
                  </p>
                </motion.div>
              )}

              {/* Form / Confirm states */}
              {modalState !== "success" && (
                <div className="p-6 space-y-5">
                  {/* Header */}
                  <div>
                    <h3 className="font-display text-xl text-paper font-semibold">
                      {modalState === "confirm"
                        ? "Confirm Your Gift"
                        : "Leave a Gift"}
                    </h3>
                    <p className="text-text-secondary text-[13px] mt-1">
                      {modalState === "confirm" ? (
                        <>
                          Send{" "}
                          <span className="text-amber font-semibold">
                            {effectiveAmount} drops of ink
                          </span>{" "}
                          to {authorName} for{" "}
                          <span className="text-paper">{storyTitle}</span>
                        </>
                      ) : (
                        <>
                          Refill {authorName}&apos;s well for{" "}
                          <span className="text-paper">{storyTitle}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Balance display */}
                  <div className="flex items-center gap-2 bg-ink/50 border border-border-subtle rounded-lg px-3 py-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="text-amber/60"
                    >
                      <path d="M8 2C8 2 4 7 4 10a4 4 0 0 0 8 0c0-3-4-8-4-8z" />
                    </svg>
                    <span className="text-[12px] text-text-secondary">
                      In your well:
                    </span>
                    {balanceLoading ? (
                      <div className="w-3 h-3 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                    ) : (
                      <span className="text-[12px] text-paper font-semibold">
                        {balance?.toLocaleString() ?? "---"} Ink Drops
                      </span>
                    )}
                  </div>

                  {/* Error messages */}
                  {errorCode === "INSUFFICIENT_BALANCE" && (
                    <div className="bg-rose/10 border border-rose/20 rounded-lg px-3 py-2.5 flex items-start gap-2">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-rose mt-0.5 flex-shrink-0"
                      >
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 5v3.5M8 11v.5" />
                      </svg>
                      <div>
                        <p className="text-rose text-[12px] font-medium">
                          Not enough ink in your well
                        </p>
                        <Link
                          href="/settings/ink-drops"
                          className="text-amber text-[12px] hover:underline"
                        >
                          Refill your inkwell
                        </Link>
                      </div>
                    </div>
                  )}
                  {errorCode === "UNKNOWN" && (
                    <p className="text-rose text-[12px]">
                      Something went wrong. Please try again.
                    </p>
                  )}
                  {errorCode === "NETWORK" && (
                    <p className="text-rose text-[12px]">
                      Network error. Check your connection.
                    </p>
                  )}

                  {/* Confirm view */}
                  {modalState === "confirm" && (
                    <>
                      {message.trim() && (
                        <div className="bg-ink/50 border border-border-subtle rounded-lg px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5">
                            Your message
                          </p>
                          <p className="text-text-secondary text-[13px] leading-relaxed font-reading">
                            {message}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={handleSend}
                          disabled={sending}
                          className="px-6 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-50 cursor-pointer"
                        >
                          {sending ? (
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                              Sending...
                            </span>
                          ) : (
                            `Send ${effectiveAmount} drops of ink`
                          )}
                        </button>
                        <button
                          onClick={() => setModalState("form")}
                          disabled={sending}
                          className="px-4 py-2.5 text-text-secondary hover:text-paper text-[13px] transition-colors cursor-pointer"
                        >
                          Back
                        </button>
                      </div>
                    </>
                  )}

                  {/* Form view */}
                  {modalState === "form" && (
                    <>
                      {/* Preset amounts */}
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                          Choose an amount
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_AMOUNTS.map((amount) => (
                            <button
                              key={amount}
                              onClick={() => handleSelectPreset(amount)}
                              className={`px-4 py-2 rounded-full border text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                                selectedAmount === amount
                                  ? "bg-amber/15 border-amber/40 text-amber"
                                  : "bg-ink/50 border-border text-text-secondary hover:border-amber/25 hover:text-amber"
                              }`}
                            >
                              {amount}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom amount */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                          Or enter a custom amount ({MIN_AMOUNT}-{MAX_AMOUNT})
                        </p>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={customAmount}
                            onChange={(e) =>
                              handleCustomAmountChange(e.target.value)
                            }
                            placeholder="Custom amount"
                            className="w-full bg-ink border border-border rounded-xl px-4 py-2.5 text-text text-[13px] placeholder:text-text-ghost focus:outline-none focus:border-amber/30 transition-colors pr-20"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-text-ghost">
                            drops of ink
                          </span>
                        </div>
                      </div>

                      {/* Optional message */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                          Message (optional)
                        </p>
                        <textarea
                          value={message}
                          onChange={(e) => {
                            if (e.target.value.length <= MAX_MESSAGE_LENGTH)
                              setMessage(e.target.value);
                          }}
                          placeholder="Leave a note for the author..."
                          rows={3}
                          className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
                        />
                        <div className="flex justify-end">
                          <span className="text-[11px] text-text-ghost">
                            {message.length}/{MAX_MESSAGE_LENGTH}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-1">
                        {hasInsufficientBalance && isValidAmount ? (
                          <Link
                            href="/settings/ink-drops"
                            className="px-6 py-2.5 bg-amber/15 border border-amber/25 text-amber font-semibold text-[13px] rounded-full hover:bg-amber/25 transition-all duration-200"
                          >
                            Refill your inkwell
                          </Link>
                        ) : (
                          <button
                            onClick={handleConfirm}
                            disabled={!isValidAmount}
                            className="px-6 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Send Gift
                          </button>
                        )}
                        <button
                          onClick={handleClose}
                          className="px-4 py-2.5 text-text-secondary hover:text-paper text-[13px] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
