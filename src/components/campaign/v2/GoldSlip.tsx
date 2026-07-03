"use client";

import { useState } from "react";
import Link from "next/link";

const GOLD_TIERS = [10, 25, 50, 100] as const;

/**
 * The House's one hand: give gold, make light. The same slip serves both
 * gestures — gold for the whole table, or one line set in gold (the line
 * keeps its shimmer forever, into the published chapter). Gold never votes
 * and never buys an outcome; the cast shares it evenly. No amounts and no
 * names ever print in the room — the page only gets brighter.
 */
export default function GoldSlip({
  line,
  balance,
  onSend,
  onClose,
}: {
  /** The line being set in gold — absent, the gold is for the table. */
  line?: { content: string; ink: string } | null;
  balance: number;
  onSend: (amount: number) => Promise<unknown>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<number>(25);
  const [sending, setSending] = useState(false);
  const [lit, setLit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = amount <= balance && !sending;
  const excerpt =
    line && line.content.length > 160
      ? `${line.content.slice(0, 160)}…`
      : line?.content;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSend(amount);
      setLit(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave gold");
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={line ? "Set this line in gold" : "Leave gold"}
    >
      <div className="absolute inset-0 bg-void/70 backdrop-blur-[2px]" />
      <div
        className="manuscript-sheet relative w-full max-w-sm rounded-md px-6 py-5"
        onClick={(e) => e.stopPropagation()}
      >
        {lit ? (
          <div className="py-8 text-center">
            <p className="font-reading text-[15px] italic text-amber">
              the room grows brighter
            </p>
          </div>
        ) : (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
              {line ? "set this line in gold" : "leave gold for the table"}
            </p>

            {excerpt && line && (
              <p
                className="mt-3 border-l-2 border-amber/40 pl-3 font-reading text-[14px] italic leading-relaxed"
                style={{ color: line.ink }}
              >
                {excerpt}
              </p>
            )}

            <div className="mt-4 grid grid-cols-4 gap-1.5">
              {GOLD_TIERS.map((tier) => {
                const affordable = tier <= balance;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => affordable && setAmount(tier)}
                    disabled={!affordable}
                    className={`rounded-md border py-2 font-mono text-[13px] tabular-nums transition-colors ${
                      amount === tier
                        ? "border-amber/50 bg-amber/10 text-amber"
                        : affordable
                          ? "cursor-pointer border-border text-text-secondary hover:border-amber/30 hover:text-text"
                          : "cursor-not-allowed border-border/40 text-text-ghost"
                    }`}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>

            <p className="table-murmur mt-3">
              gold buys light, never the story — the cast shares it evenly
            </p>

            {error && <p className="mt-2 text-xs text-rose">{error}</p>}

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                your well holds{" "}
                <span className="text-amber tabular-nums">{balance}</span>
                {balance < GOLD_TIERS[0] && (
                  <>
                    {" · "}
                    <Link
                      href="/settings/ink-drops"
                      className="text-amber hover:underline"
                    >
                      Refill your well
                    </Link>
                  </>
                )}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Never mind
                </button>
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!canSend}
                  className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
                >
                  {sending ? "…" : line ? "Set it in gold" : "Leave gold"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
