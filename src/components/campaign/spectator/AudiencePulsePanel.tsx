"use client";

import type { FloorRound } from "@/types/campaign";

interface AudiencePulsePanelProps {
  floorRound: FloorRound | null;
  onPulse: (submissionId: string) => Promise<void>;
}

export default function AudiencePulsePanel({ floorRound, onPulse }: AudiencePulsePanelProps) {
  if (!floorRound || !floorRound.audiencePulseEnabled) return null;

  const isOpen = floorRound.status === "voting";
  const sortedSubmissions = [...floorRound.submissions].sort(
    (a, b) => b.audiencePulseCount - a.audiencePulseCount,
  );
  const leader = sortedSubmissions[0];

  return (
    <div className="absolute bottom-20 left-1/2 z-30 max-h-[42vh] w-[min(720px,calc(100%-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-lavender/25 bg-ink/95 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl [scrollbar-width:thin] [scrollbar-color:rgba(167,139,250,0.24)_transparent] sm:bottom-5 sm:max-h-none sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-display text-lavender">Audience Pulse</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Guide the GM. The table keeps character agency.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-tertiary">
          <span className="rounded-full border border-lavender/20 bg-lavender/10 px-3 py-1 text-lavender">
            {floorRound.audiencePulseCount} pulses
          </span>
          {leader && floorRound.audiencePulseCount > 0 && (
            <span className="hidden rounded-full border border-border bg-subtle/20 px-3 py-1 sm:inline-flex">
              Crowd favors {leader.characterName ?? "a proposal"}
            </span>
          )}
          {!isOpen && (
            <span className="rounded-full border border-amber/25 bg-amber/10 px-3 py-1 text-amber">
              Pulse closed
            </span>
          )}
        </div>
      </div>

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
                    {submission.characterName ?? "Unknown"} · {submission.type}
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
    </div>
  );
}
