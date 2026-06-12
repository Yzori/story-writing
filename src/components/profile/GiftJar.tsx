"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Gift, Droplet, X } from "lucide-react";

interface GiftJarProps {
  userId: string;
  ownerName: string;
  open: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];
const MIN_AMOUNT = 5;
const MAX_AMOUNT = 500;
const MAX_MESSAGE = 300;

type ModalState = "form" | "success" | "error";

/**
 * Leave a gift at the writer's study — profile-level ink drops, no story
 * attached. Posts to /api/users/[userId]/gift.
 */
export default function GiftJar({ userId, ownerName, open, onClose }: GiftJarProps) {
  const [state, setState] = useState<ModalState>("form");
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const amount = selected ?? (custom ? parseInt(custom, 10) : 0);
  const isValid = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
  const insufficient = balance !== null && amount > balance;

  useEffect(() => {
    if (!open) return;
    setState("form");
    setSelected(null);
    setCustom("");
    setMessage("");
    setErrorMsg(null);
    fetch("/api/user/ink-drops")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setBalance(j?.balance ?? null))
      .catch(() => {});
  }, [open]);

  const handleSend = useCallback(async () => {
    if (!isValid || sending) return;
    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/users/${userId}/gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, message: message.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "The gift couldn't be sent.");
        setState("error");
      } else {
        setSentAmount(amount);
        setState("success");
      }
    } catch {
      setErrorMsg("The gift couldn't be sent.");
      setState("error");
    } finally {
      setSending(false);
    }
  }, [isValid, sending, userId, amount, message]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/70 px-5 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="relative w-full max-w-md overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[var(--t-shadow-modal)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-amber/[0.16] blur-2xl" aria-hidden />

            <div className="relative flex items-center justify-between px-6 pt-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber/25 bg-amber/[0.06] text-amber">
                  <Gift size={13} />
                </span>
                <h3 className="font-display text-[17px] font-semibold text-paper">
                  A gift for {ownerName}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-text-ghost transition-colors hover:text-text-secondary"
              >
                <X size={15} />
              </button>
            </div>

            {state === "success" ? (
              <div className="relative px-6 py-10 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber/30 bg-amber/10 text-amber"
                >
                  <Droplet size={18} />
                </motion.div>
                <p className="font-reading text-[15px] italic text-text">
                  {sentAmount} drops left quietly on the desk.
                </p>
                <p className="mt-1.5 text-[12px] text-text-ghost">
                  {ownerName} will know it was you.
                </p>
                <button
                  onClick={onClose}
                  className="mt-5 rounded-full border border-border px-4 py-1.5 text-[12px] text-text-secondary transition-colors hover:text-paper"
                >
                  Back to the study
                </button>
              </div>
            ) : (
              <div className="relative space-y-4 px-6 py-5">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                    Ink drops
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          setSelected(amt);
                          setCustom("");
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-[12px] transition-all ${
                          selected === amt
                            ? "border-amber/30 bg-amber/[0.06] text-amber"
                            : "border-border text-text-ghost hover:text-text-secondary"
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={MIN_AMOUNT}
                      max={MAX_AMOUNT}
                      placeholder="Custom"
                      value={custom}
                      onChange={(e) => {
                        setCustom(e.target.value);
                        setSelected(null);
                      }}
                      className="w-20 rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-[12px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30"
                    />
                  </div>
                  {balance !== null && (
                    <p className="mt-2 font-mono text-[10px] tracking-wider text-text-ghost">
                      {balance} drops in your well
                      {insufficient && (
                        <span className="text-rose">
                          {" "}
                          — not enough.{" "}
                          <Link href="/pricing" className="underline underline-offset-2">
                            Refill your well
                          </Link>
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                    A note, if you like
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                    rows={2}
                    placeholder="Your words kept me up past midnight…"
                    className="w-full resize-none rounded-lg border border-border bg-elevated px-3 py-2.5 text-[13px] leading-relaxed text-text outline-none placeholder:text-text-ghost focus:border-amber/30"
                  />
                </div>

                {state === "error" && errorMsg && (
                  <p className="text-[12px] text-rose">{errorMsg}</p>
                )}

                <button
                  onClick={handleSend}
                  disabled={!isValid || insufficient || sending}
                  className="w-full rounded-full bg-amber py-2.5 text-[13px] font-semibold text-void transition-all hover:shadow-[0_0_20px_rgba(226,172,74,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending
                    ? "Leaving the gift…"
                    : isValid
                      ? `Leave ${amount} drops on the desk`
                      : "Choose an amount"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
