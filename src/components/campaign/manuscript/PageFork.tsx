"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { FloorRound, PlayerCharacter } from "@/types/campaign";
import type { CampaignTurnType } from "@/lib/campaign-turns";
import { getPlayerInk } from "@/types/campaign";

/**
 * The Crossroads as the page visibly forking: the Director's question spans
 * the sheet over a forked rule, candidates render as competing paragraphs in
 * their authors' inks, the table votes by pressing seals, and the Director
 * sets one candidate in ink — the losers fade to erased pencil.
 *
 * Ports FloorRoundPanel's full lifecycle; GM round controls live on the fork
 * header AND mirror in the quill station (never hidden).
 */

const PLAYER_TYPES = [
  { key: "action", label: "act" },
  { key: "dialogue", label: "speak" },
  { key: "reaction", label: "react" },
  { key: "description", label: "describe" },
] as const;

export default function PageFork({
  floorRound,
  isGM,
  myCharacter,
  playerUserIds,
  onSubmitResponse,
  onVoteSubmission,
  onUpdateRound,
}: {
  floorRound: FloorRound;
  isGM: boolean;
  myCharacter: PlayerCharacter | null;
  /** Stable ink assignment — active player userIds in seat order. */
  playerUserIds: string[];
  onSubmitResponse: (
    roundId: string,
    body: { characterId: string; type: string; content: string },
  ) => Promise<unknown>;
  onVoteSubmission: (roundId: string, submissionId: string) => Promise<unknown>;
  onUpdateRound: (
    roundId: string,
    body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string },
  ) => Promise<unknown>;
}) {
  const [content, setContent] = useState("");
  const [turnType, setTurnType] = useState<CampaignTurnType>("action");
  const [busy, setBusy] = useState(false);

  const mySubmission = useMemo(
    () => floorRound.submissions.find((s) => s.isMine) ?? null,
    [floorRound],
  );
  const revealed = floorRound.status === "voting" || floorRound.status === "closed" || isGM;
  const sorted = useMemo(
    () => [...floorRound.submissions].sort((a, b) => b.voteCount - a.voteCount),
    [floorRound],
  );
  const canCanonize = isGM && floorRound.status === "closed";
  const canWrite =
    !isGM && floorRound.status === "open" && myCharacter?.status === "active" && !mySubmission;
  const myInk = myCharacter ? getPlayerInk(myCharacter.userId, playerUserIds) : "var(--ink-faded)";

  return (
    <div className="relative">
      {/* The forked rule — one line becomes two. */}
      <div className="mb-4 flex items-center justify-center gap-2" aria-hidden="true">
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-lavender/50" />
        <svg width="28" height="16" viewBox="0 0 28 16" fill="none" stroke="currentColor" className="text-lavender/60">
          <path d="M0 8 h8 M8 8 C 14 8, 14 3, 20 3 h8 M8 8 C 14 8, 14 13, 20 13 h8" strokeWidth="1" />
        </svg>
        <span className="h-px w-16 bg-gradient-to-l from-transparent to-lavender/50" />
      </div>

      <p className="hand-note text-center text-lg text-lavender">
        the ink divides —
        {floorRound.audiencePulseEnabled ? " and the dark leans in" : ""}
      </p>
      <p className="mt-1 text-center font-reading text-[18px] leading-snug text-paper sm:text-[20px]">
        {floorRound.prompt}
      </p>

      {/* Status line + GM round controls — always visible on the fork. */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="hand-note text-sm opacity-60">
          {floorRound.status === "open"
            ? `${floorRound.submissions.length} hand${floorRound.submissions.length === 1 ? "" : "s"} writing`
            : `${floorRound.voteCount} of ${floorRound.eligibleVoterCount} seals pressed`}
          {floorRound.status === "voting" && floorRound.allEligibleVotersVoted ? " — all in" : ""}
          {floorRound.audiencePulseEnabled && floorRound.audiencePulseCount > 0
            ? ` · ${floorRound.audiencePulseCount} pulses from the dark`
            : ""}
        </span>
        {isGM && (
          <span className="flex items-center gap-3">
            {floorRound.status === "open" && (
              <button
                type="button"
                disabled={floorRound.submissions.length === 0}
                onClick={() => void onUpdateRound(floorRound.id, { status: "voting" })}
                className="hand-note cursor-pointer text-base text-lavender underline decoration-lavender/50 decoration-wavy underline-offset-4 disabled:cursor-not-allowed disabled:opacity-35"
                title={
                  floorRound.submissions.length
                    ? "Reveal the candidates and open the vote"
                    : "No candidates written yet"
                }
              >
                open the vote
              </button>
            )}
            {floorRound.status === "voting" && (
              <button
                type="button"
                onClick={() => void onUpdateRound(floorRound.id, { status: "closed" })}
                className="hand-note cursor-pointer text-base text-lavender underline decoration-lavender/50 decoration-wavy underline-offset-4"
              >
                close the vote
              </button>
            )}
            <button
              type="button"
              onClick={() => void onUpdateRound(floorRound.id, { status: "cancelled" })}
              className="hand-note cursor-pointer text-base opacity-50 transition-opacity hover:text-rose hover:opacity-90"
            >
              tear it out
            </button>
          </span>
        )}
      </div>

      {/* My candidate quill — write your fork of the page in your own ink. */}
      {canWrite && myCharacter && (
        <div className="mt-5">
          <p className="font-reading text-[16px] leading-[1.85] sm:text-[17px]">
            <span className="font-semibold" style={{ color: myInk }}>
              {myCharacter.name.split(" ")[0]}{" "}
            </span>
            <span className="hand-note text-base opacity-55">might…</span>
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            placeholder="…write how this could go."
            className="ink-caret block w-full resize-none bg-transparent font-reading text-[16px] leading-[1.85] text-paper/95 outline-none placeholder:italic placeholder:text-text-ghost sm:text-[17px]"
            style={{ ["--ink-self" as string]: myInk }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            {PLAYER_TYPES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTurnType(option.key)}
                className={`hand-note cursor-pointer text-base transition-all ${
                  turnType === option.key
                    ? "underline decoration-lavender/60 decoration-wavy underline-offset-4"
                    : "opacity-55 hover:opacity-90"
                }`}
                style={turnType === option.key ? { color: myInk } : undefined}
              >
                {option.label}
              </button>
            ))}
            <div className="ml-auto">
              <button
                type="button"
                disabled={!content.trim() || busy}
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
                className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
              >
                {busy ? "Offering…" : "Offer your ink"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isGM && floorRound.status === "open" && mySubmission && (
        <p className="hand-note mt-4 text-center text-base opacity-60">
          your ink is on the table — waiting for the others…
        </p>
      )}

      {/* The competing paragraphs. */}
      {revealed && sorted.length === 0 && (
        <p className="hand-note mt-5 text-center text-base opacity-55">
          no hands have written yet — the fork waits.
        </p>
      )}

      {revealed && sorted.length > 0 && (
        <div className="mt-5 space-y-4">
          {sorted.map((submission, index) => {
            const ink = submission.userId
              ? getPlayerInk(submission.userId, playerUserIds)
              : "var(--ink-faded)";
            const isMyVote = floorRound.myVoteSubmissionId === submission.id;
            const rotate = index % 2 === 0 ? -0.7 : 0.7;
            return (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-sm border border-border/70 bg-black/10 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                style={{ transform: `rotate(${rotate}deg)` }}
              >
                <p className="font-reading text-[15px] leading-[1.8] text-paper/90">
                  {submission.content}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="hand-note text-base" style={{ color: ink }}>
                    — {submission.sourceLabel ?? submission.characterName ?? "an unknown hand"}
                    <span className="ml-1.5 opacity-50">({submission.type})</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {/* Seal impressions accumulate under the paragraph. */}
                    {(floorRound.status !== "open" || isGM) && (
                      <span
                        className="flex items-center gap-1"
                        title={`${submission.voteCount} seal${submission.voteCount === 1 ? "" : "s"}`}
                      >
                        {Array.from({ length: Math.min(submission.voteCount, 6) }).map((_, i) => (
                          <span
                            key={i}
                            className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber to-amber/50 shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                          />
                        ))}
                        {submission.voteCount > 6 && (
                          <span className="hand-note text-sm text-amber/80">+{submission.voteCount - 6}</span>
                        )}
                        {submission.voteCount === 0 && (
                          <span className="hand-note text-sm opacity-40">no seals</span>
                        )}
                      </span>
                    )}
                    {floorRound.audiencePulseEnabled && submission.audiencePulseCount > 0 && (
                      <span
                        className="hand-note text-sm text-lavender/70"
                        title="Pulses from the audience"
                      >
                        ✧ {submission.audiencePulseCount}
                      </span>
                    )}
                    {!isGM && floorRound.status === "voting" && floorRound.isVoteEligible && (
                      <button
                        type="button"
                        onClick={() => void onVoteSubmission(floorRound.id, submission.id)}
                        className={`cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                          isMyVote
                            ? "wax-seal"
                            : "hand-note text-base font-normal normal-case tracking-normal underline decoration-amber/50 decoration-wavy underline-offset-4 opacity-70 hover:opacity-100"
                        }`}
                      >
                        {isMyVote ? "Your seal" : "press your seal"}
                      </button>
                    )}
                    {canCanonize && (
                      <button
                        type="button"
                        onClick={() =>
                          void onUpdateRound(floorRound.id, {
                            status: "resolved",
                            selectedSubmissionId: submission.id,
                          })
                        }
                        className="wax-seal cursor-pointer px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                      >
                        Set in ink
                      </button>
                    )}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
