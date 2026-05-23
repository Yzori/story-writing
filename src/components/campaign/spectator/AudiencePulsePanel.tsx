"use client";

import { useState } from "react";
import type { FloorRound } from "@/types/campaign";

interface AudiencePulsePanelProps {
  floorRound: FloorRound | null;
  onPulse: (submissionId: string) => Promise<void>;
  onSpark?: (content: string, amount?: number) => Promise<void>;
  balance?: number | null;
}

export default function AudiencePulsePanel({ floorRound, onPulse, onSpark, balance = null }: AudiencePulsePanelProps) {
  const [spark, setSpark] = useState("");
  const [sparkBusy, setSparkBusy] = useState(false);
  const [sparkError, setSparkError] = useState<string | null>(null);

  if (!floorRound || (!floorRound.audiencePulseEnabled && floorRound.status !== "open")) return null;

  const isOpen = floorRound.status === "voting";
  const canSendSpark = floorRound.mode === "vote" && floorRound.status === "open" && !!onSpark && balance !== null;
  const sortedSubmissions = [...floorRound.submissions].sort(
    (a, b) => b.audiencePulseCount - a.audiencePulseCount,
  );
  const leader = sortedSubmissions[0];

  return (
    <div className="absolute bottom-20 left-1/2 z-30 max-h-[42vh] w-[min(720px,calc(100%-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-lavender/25 bg-ink/95 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl [scrollbar-width:thin] [scrollbar-color:rgba(167,139,250,0.24)_transparent] sm:bottom-5 sm:max-h-none sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-display text-lavender">
            {floorRound.status === "open" ? "Audience Sparks" : "Audience Pulse"}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {floorRound.status === "open"
              ? "Pay to offer an idea. The Director decides whether it reaches the vote."
              : "Guide the Director. The table keeps character agency."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-tertiary">
          <span className="rounded-full border border-lavender/20 bg-lavender/10 px-3 py-1 text-lavender">
            {floorRound.audiencePulseCount} pulses
          </span>
          {leader && floorRound.audiencePulseCount > 0 && (
            <span className="hidden rounded-full border border-border bg-subtle/20 px-3 py-1 sm:inline-flex">
              Crowd favors {leader.sourceLabel ?? leader.characterName ?? "a proposal"}
            </span>
          )}
          {!isOpen && (
            <span className="rounded-full border border-amber/25 bg-amber/10 px-3 py-1 text-amber">
              Pulse closed
            </span>
          )}
        </div>
      </div>

      {floorRound.status === "open" && (
        <div className="rounded-xl border border-lavender/20 bg-lavender/[0.05] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-lavender">Send Spark · 25 drops</p>
            {balance !== null && <span className="text-[10px] text-text-tertiary">Balance {balance}</span>}
          </div>
          <textarea
            value={spark}
            onChange={(event) => {
              setSpark(event.target.value);
              setSparkError(null);
            }}
            placeholder="Offer a complication, omen, bargain, or possible outcome..."
            className="min-h-20 w-full resize-none rounded-lg border border-border bg-elevated px-3 py-2 text-sm leading-relaxed text-paper outline-none placeholder:text-text-ghost focus:border-lavender/35"
          />
          {sparkError && <p className="mt-2 text-xs text-rose/75">{sparkError}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={!spark.trim() || !canSendSpark || sparkBusy || (balance !== null && balance < 25)}
              onClick={async () => {
                if (!onSpark || !spark.trim()) return;
                setSparkBusy(true);
                try {
                  await onSpark(spark.trim(), 25);
                  setSpark("");
                } catch (error) {
                  setSparkError(error instanceof Error ? error.message : "Failed to send Audience Spark");
                } finally {
                  setSparkBusy(false);
                }
              }}
              className="min-h-9 rounded-full border border-lavender/25 bg-lavender/10 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-lavender hover:bg-lavender/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send Spark
            </button>
          </div>
          {floorRound.audienceSparks.length > 0 && (
            <div className="mt-3 grid gap-2">
              {floorRound.audienceSparks.map((item) => (
                <div key={item.id} className="rounded-lg border border-border-subtle bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    {item.status} · {item.amount} drops
                  </p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-paper/80">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {floorRound.status !== "open" && (
      <div className="grid gap-2 sm:grid-cols-2">
        {sortedSubmissions.map((submission) => {
          const selected = floorRound.myAudiencePulseSubmissionId === submission.id;
          const pct = floorRound.audiencePulseCount > 0
            ? Math.round((submission.audiencePulseCount / floorRound.audiencePulseCount) * 100)
            : 0;

          return (
            <button
              key={submission.id}
              type="button"
              onClick={() => isOpen ? onPulse(submission.id) : undefined}
              disabled={!isOpen}
              className={`relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                selected
                  ? "border-lavender/60 bg-lavender/15"
                  : "border-border-subtle bg-black/25 hover:border-lavender/30 hover:bg-lavender/[0.06]"
              } ${isOpen ? "cursor-pointer" : "cursor-default opacity-80"}`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-lavender/10 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    {submission.sourceLabel ?? submission.characterName ?? "Unknown"} · {submission.type}
                  </p>
                  <span className="text-[10px] text-lavender">{submission.audiencePulseCount} · {pct}%</span>
                </div>
                <p className="line-clamp-2 text-[13px] font-serif leading-relaxed text-paper/85 sm:line-clamp-3 sm:text-sm">
                  {submission.content}
                </p>
                {selected && (
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-lavender">
                    Your pulse
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
