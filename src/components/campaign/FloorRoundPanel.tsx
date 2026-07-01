"use client";

import { useMemo, useState } from "react";
import type { FloorRound, PlayerCharacter } from "@/types/campaign";
import type { CampaignTurnType } from "@/lib/campaign-turns";

interface FloorRoundPanelProps {
  floorRound: FloorRound | null;
  isGM: boolean;
  myCharacter: PlayerCharacter | null;
  isActive: boolean;
  onSubmitResponse: (roundId: string, body: { characterId: string; type: string; content: string }) => Promise<void>;
  onVoteSubmission: (roundId: string, submissionId: string) => Promise<void>;
  onUpdateRound: (roundId: string, body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string }) => Promise<void>;
}

const PLAYER_TYPES = [
  { key: "action", label: "Act" },
  { key: "dialogue", label: "Speak" },
  { key: "reaction", label: "React" },
  { key: "description", label: "Describe" },
] as const;

export default function FloorRoundPanel({
  floorRound,
  isGM,
  myCharacter,
  isActive,
  onSubmitResponse,
  onVoteSubmission,
  onUpdateRound,
}: FloorRoundPanelProps) {
  const [content, setContent] = useState("");
  const [turnType, setTurnType] = useState<CampaignTurnType>("action");
  const [busy, setBusy] = useState(false);

  const mySubmission = useMemo(
    () => floorRound?.submissions.find((submission) => submission.isMine) ?? null,
    [floorRound],
  );
  const revealed = floorRound?.status === "voting" || floorRound?.status === "closed" || isGM;
  const sortedSubmissions = useMemo(
    () => [...(floorRound?.submissions ?? [])].sort((a, b) => b.voteCount - a.voteCount),
    [floorRound],
  );
  const canGMCanonize = floorRound?.status === "closed";
  const submissionCount = floorRound?.submissions.length ?? 0;
  const hasVoteOptions = submissionCount > 0;

  if (!isActive || !floorRound) return null;

  return (
    // The action dock is in-flow now (no fixed composer to clear) — a small
    // sticky offset keeps the round visible while the prose scrolls.
    <div className="sticky bottom-4 z-10 mt-8 mb-4 w-full max-w-[760px] sm:mt-10">
      <div className="relative overflow-hidden rounded-xl border border-lavender/25 bg-surface/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lavender/60 to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-lavender/[0.06] blur-3xl" />

        <div className="mb-4 flex items-start justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-display text-lavender">
              {floorRound.status === "open"
                ? "Collecting Vote Options"
                : floorRound.audiencePulseEnabled ? "Table Vote + Audience Pulse" : "Table Vote"}
            </p>
            <p className="mt-1 font-reading text-[18px] leading-snug text-paper sm:text-[20px]">{floorRound.prompt}</p>
          </div>
          <span className="shrink-0 rounded-full border border-lavender/25 bg-lavender/10 px-2.5 py-1 text-[9px] uppercase tracking-wider text-lavender sm:px-3 sm:py-1.5 sm:text-[10px]">
            {floorRound.status}
          </span>
        </div>

        <div className="mb-4 grid gap-2 text-[9px] uppercase tracking-wider text-text-secondary sm:grid-cols-3 sm:text-[10px]">
            {floorRound.status === "open" && (
              <span className="rounded-full border border-lavender/25 bg-lavender/10 px-2.5 py-1 text-lavender sm:px-3 sm:py-1.5">
                {submissionCount} option{submissionCount === 1 ? "" : "s"} collected
              </span>
            )}
            <span className="rounded-full border border-lavender/25 bg-lavender/10 px-2.5 py-1 text-lavender sm:px-3 sm:py-1.5">
              {floorRound.voteCount}/{floorRound.eligibleVoterCount} votes
            </span>
            {floorRound.status === "voting" && floorRound.allEligibleVotersVoted && (
              <span className="rounded-full border border-sage/25 bg-sage/10 px-3 py-1 text-sage">
                All votes in
              </span>
            )}
            {floorRound.status === "closed" && (
              <span className="rounded-full border border-amber/25 bg-amber/10 px-3 py-1 text-amber">
                Voting closed
              </span>
            )}
            {floorRound.audiencePulseEnabled && (
              <span className="rounded-full border border-lavender/25 bg-lavender/10 px-3 py-1 text-lavender">
                Audience {floorRound.audiencePulseCount}
              </span>
            )}
          </div>

        {!isGM && floorRound.status === "open" && myCharacter?.status === "active" && (
          <div className="mb-4 rounded-lg border border-border-subtle bg-elevated/60 p-3">
            {mySubmission ? (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-sage mb-2">Submitted</p>
                <p className="font-reading text-[15px] leading-relaxed text-paper/80">{mySubmission.content}</p>
              </div>
            ) : (
              <>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {PLAYER_TYPES.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setTurnType(option.key)}
                      className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full border cursor-pointer ${
                        turnType === option.key
                          ? "border-lavender/40 bg-lavender/15 text-lavender"
                          : "border-border text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write your proposed turn..."
                  className="min-h-[100px] w-full resize-none bg-transparent font-reading text-[17px] leading-[1.8] text-paper/90 outline-none placeholder:text-text-ghost"
                />
                <div className="flex justify-end pt-3 border-t border-border-subtle">
                  <button
                    onClick={async () => {
                      if (!content.trim() || !myCharacter) return;
                      setBusy(true);
                      try {
                        await onSubmitResponse(floorRound.id, {
                          characterId: myCharacter.id,
                          type: turnType,
                          content: content.trim(),
                        });
                        setContent("");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    disabled={!content.trim() || busy}
                    className="bg-lavender/15 hover:bg-lavender/25 border border-lavender/25 text-lavender rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {revealed && sortedSubmissions.length === 0 && (
          <div className="rounded-lg border border-border bg-elevated/60 px-4 py-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-ghost">No vote options yet</p>
            <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-relaxed text-text-secondary">
              This is the collection step. Players need to submit possible outcomes before there is anything to vote on.
            </p>
          </div>
        )}

        {revealed && sortedSubmissions.length > 0 && (
          <div className="grid gap-2">
            {sortedSubmissions.map((submission) => {
              const isSelected = floorRound.myVoteSubmissionId === submission.id;
              return (
                <div
                  key={submission.id}
                  className={`rounded-lg border bg-elevated/70 p-3 transition-colors ${
                    isSelected ? "border-lavender/50" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                        {submission.sourceLabel ?? submission.characterName ?? "Unknown"} · {submission.type}
                      </p>
                      <p className="mt-1 line-clamp-3 font-reading text-[14px] leading-relaxed text-paper sm:line-clamp-none">{submission.content}</p>
                    </div>
                    <div className="shrink-0 text-right text-[10px] sm:text-[11px]">
                      <div className="font-bold text-lavender">{submission.voteCount} votes</div>
                      {floorRound.audiencePulseEnabled && (
                        <div className="mt-1 text-text-tertiary">{submission.audiencePulseCount} pulses</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    {!isGM && floorRound.status === "voting" && floorRound.isVoteEligible && (
                      <button
                        onClick={() => onVoteSubmission(floorRound.id, submission.id)}
                        className="min-h-9 rounded-full border border-lavender/25 px-4 py-2 text-[10px] uppercase tracking-wider text-lavender hover:bg-lavender/10 cursor-pointer"
                      >
                        {isSelected ? "Voted" : "Vote"}
                      </button>
                    )}
                    {isGM && canGMCanonize && (
                      <button
                        onClick={() => onUpdateRound(floorRound.id, { status: "resolved", selectedSubmissionId: submission.id })}
                        className="min-h-9 rounded-full border border-amber/25 px-4 py-2 text-[10px] uppercase tracking-wider text-amber hover:bg-amber/10 cursor-pointer"
                      >
                        Add to Canon
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isGM && (
          <div className="mt-3 flex justify-end gap-2 border-t border-border-subtle pt-3 sm:mt-4">
            {floorRound.status === "open" && (
              <button
                onClick={() => onUpdateRound(floorRound.id, { status: "voting" })}
                disabled={!hasVoteOptions}
                className="min-h-9 text-[10px] uppercase tracking-wider border border-lavender/25 text-lavender rounded-full px-4 py-2 hover:bg-lavender/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={hasVoteOptions ? "Reveal collected responses as vote options" : "Collect at least one response before voting"}
              >
                Reveal Options
              </button>
            )}
            {floorRound.status === "voting" && (
              <button
                onClick={() => onUpdateRound(floorRound.id, { status: "closed" })}
                className={`min-h-9 rounded-full px-4 py-2 text-[10px] uppercase tracking-wider cursor-pointer ${
                  floorRound.allEligibleVotersVoted
                    ? "border border-sage/25 text-sage hover:bg-sage/10"
                    : "border border-amber/25 text-amber hover:bg-amber/10"
                }`}
              >
                Close Vote
              </button>
            )}
            <button
              onClick={() => onUpdateRound(floorRound.id, { status: "cancelled" })}
              className="min-h-9 rounded-full border border-border px-4 py-2 text-[10px] uppercase tracking-wider text-text-secondary hover:text-paper cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
