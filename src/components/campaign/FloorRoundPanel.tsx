"use client";

import { useMemo, useState } from "react";
import type { CampaignTurnType, FloorRound, FloorRoundMode, PlayerCharacter } from "@/types/campaign";

interface FloorRoundPanelProps {
  floorRound: FloorRound | null;
  isGM: boolean;
  myCharacter: PlayerCharacter | null;
  isActive: boolean;
  onCreateRound: (prompt: string, mode: FloorRoundMode, audiencePulseEnabled?: boolean) => Promise<void>;
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
  onCreateRound,
  onSubmitResponse,
  onVoteSubmission,
  onUpdateRound,
}: FloorRoundPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<FloorRoundMode>("gm_pick");
  const [audiencePulseEnabled, setAudiencePulseEnabled] = useState(false);
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
  const canGMCanonize = floorRound?.mode === "gm_pick" || floorRound?.status === "closed";

  if (!isActive) return null;

  if (!floorRound) {
    if (!isGM) return null;

    return (
      <div className="sticky bottom-4 z-30 w-full max-w-[650px] mt-8 mb-4">
        <div className="bg-ink border border-lavender/20 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-display text-lavender">Crossroads</p>
              <p className="text-xs text-text-tertiary mt-1">Collect player responses before choosing canon.</p>
            </div>
            <div className="flex rounded-full border border-border bg-subtle/20 p-0.5">
              {(["gm_pick", "vote"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`px-3 py-2 text-[10px] uppercase tracking-wider rounded-full transition-colors cursor-pointer ${
                    mode === value ? "bg-lavender/20 text-lavender" : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {value === "gm_pick" ? "GM Pick" : "Table Vote"}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="What does the table attempt?"
            className="w-full bg-black/30 border border-border rounded-xl px-3 py-2.5 text-sm text-paper outline-none placeholder:text-text-ghost focus:border-lavender/40 resize-none min-h-[80px]"
          />
          {mode === "vote" && (
            <label className="mt-3 flex items-start gap-3 rounded-xl border border-lavender/15 bg-lavender/[0.04] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={audiencePulseEnabled}
                onChange={(event) => setAudiencePulseEnabled(event.target.checked)}
                className="mt-0.5 accent-current"
              />
              <span>
                <span className="block text-[10px] uppercase tracking-widest text-lavender font-display">
                  Audience Pulse
                </span>
                <span className="block text-xs text-text-tertiary mt-1">
                  Spectators can signal a favorite. The table vote stays separate; GM resolves.
                </span>
              </span>
            </label>
          )}
          <div className="flex justify-end mt-3">
            <button
              onClick={async () => {
                if (!prompt.trim()) return;
                setBusy(true);
                try {
                  await onCreateRound(prompt.trim(), mode, mode === "vote" && audiencePulseEnabled);
                  setPrompt("");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={!prompt.trim() || busy}
              className="bg-lavender/15 hover:bg-lavender/25 border border-lavender/25 text-lavender rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Open Crossroads
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-3 z-30 mt-6 mb-4 w-full max-w-[650px] sm:bottom-4 sm:mt-8">
      <div className="rounded-2xl border border-lavender/20 bg-ink p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)] sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4 sm:gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-display text-lavender">
              {floorRound.mode === "vote"
                ? floorRound.audiencePulseEnabled ? "Table Vote + Audience Pulse" : "Table Vote"
                : "GM Pick"}
            </p>
            <p className="mt-1 font-serif text-base leading-snug text-paper sm:text-lg">{floorRound.prompt}</p>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-subtle/30 px-2.5 py-1 text-[9px] uppercase tracking-wider text-text-secondary sm:px-3 sm:py-1.5 sm:text-[10px]">
            {floorRound.status}
          </span>
        </div>
        {floorRound.mode === "vote" && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-wider text-text-secondary sm:mb-4 sm:text-[10px]">
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
              <span className="hidden rounded-full border border-lavender/25 bg-lavender/10 px-3 py-1 text-lavender sm:inline-flex">
                Audience {floorRound.audiencePulseCount}
              </span>
            )}
          </div>
        )}

        {!isGM && floorRound.status === "open" && myCharacter?.status === "active" && (
          <div className="border border-border-subtle rounded-xl p-3 bg-black/20 mb-4">
            {mySubmission ? (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-sage mb-2">Submitted</p>
                <p className="text-sm text-paper/80 font-serif italic">{mySubmission.content}</p>
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
                  className="w-full bg-transparent text-[17px] leading-[1.8] text-paper/90 outline-none font-serif resize-none min-h-[90px] placeholder:text-text-ghost"
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

        {revealed && sortedSubmissions.length > 0 && (
          <div className="space-y-2">
            {sortedSubmissions.map((submission) => (
              <div
                key={submission.id}
                className={`rounded-xl border bg-black/20 p-3 ${
                  floorRound.myVoteSubmissionId === submission.id ? "border-lavender/50" : "border-border-subtle"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                      {submission.characterName ?? "Unknown"} · {submission.type}
                    </p>
                    <p className="mt-1 line-clamp-3 font-serif text-[13px] leading-relaxed text-paper/85 sm:line-clamp-none sm:text-sm">{submission.content}</p>
                  </div>
                  <div className="shrink-0 text-right text-[10px] sm:text-[11px]">
                    <div className="text-lavender font-bold">{submission.voteCount} votes</div>
                    {floorRound.audiencePulseEnabled && (
                      <div className="mt-1 hidden text-text-tertiary sm:block">{submission.audiencePulseCount} pulses</div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-2 sm:mt-3">
                  {!isGM && floorRound.mode === "vote" && floorRound.status === "voting" && floorRound.isVoteEligible && (
                    <button
                      onClick={() => onVoteSubmission(floorRound.id, submission.id)}
                      className="min-h-9 text-[10px] uppercase tracking-wider border border-lavender/25 text-lavender rounded-full px-4 py-2 hover:bg-lavender/10 cursor-pointer"
                    >
                      {floorRound.myVoteSubmissionId === submission.id ? "Voted" : "Vote"}
                    </button>
                  )}
                  {isGM && canGMCanonize && (
                    <button
                      onClick={() => onUpdateRound(floorRound.id, { status: "resolved", selectedSubmissionId: submission.id })}
                      className="min-h-9 text-[10px] uppercase tracking-wider border border-amber/25 text-amber rounded-full px-4 py-2 hover:bg-amber/10 cursor-pointer"
                    >
                      Canonize
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isGM && (
          <div className="mt-3 flex justify-end gap-2 border-t border-border-subtle pt-3 sm:mt-4">
            {floorRound.mode === "vote" && floorRound.status === "open" && (
              <button
                onClick={() => onUpdateRound(floorRound.id, { status: "voting" })}
                className="min-h-9 text-[10px] uppercase tracking-wider border border-lavender/25 text-lavender rounded-full px-4 py-2 hover:bg-lavender/10 cursor-pointer"
              >
                Reveal Vote
              </button>
            )}
            {floorRound.mode === "vote" && floorRound.status === "voting" && (
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
