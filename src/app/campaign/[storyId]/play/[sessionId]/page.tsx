"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { useCampaignSession } from "@/hooks/use-campaign-session";
import { useHouseGold } from "@/hooks/use-house-gold";
import PageRoom from "@/components/campaign/v2/PageRoom";
import GoldLight from "@/components/campaign/v2/GoldLight";
import StoryProse, { isSetLine } from "@/components/campaign/v2/StoryProse";
import Quill from "@/components/campaign/v2/Quill";
import WaitingLine from "@/components/campaign/v2/WaitingLine";
import DiceSlip from "@/components/campaign/v2/DiceSlip";
import RollCall from "@/components/campaign/v2/RollCall";
import VoteCall from "@/components/campaign/v2/VoteCall";
import VoteBlock, { type VoteOption } from "@/components/campaign/v2/VoteBlock";
import StrangerCall from "@/components/campaign/v2/StrangerCall";
import StrangerBlock, { type StrangerDeed } from "@/components/campaign/v2/StrangerBlock";
import { composeStrangerLine } from "@/components/campaign/v2/stranger";
import {
  composeVoteLine,
} from "@/components/campaign/v2/votes";
import {
  findOpenRoll,
  tierFromServer,
  type RollResult,
} from "@/components/campaign/v2/rolls";
import EndSessionModal from "@/components/campaign/EndSessionModal";
import PenMark from "@/components/campaign/v2/PenMark";
import { getPlayerInk, type Turn } from "@/types/campaign";

/**
 * The "Set in Ink" play surface: one lit page in the dark. The story is the
 * interface — the Director writes and passes the pen with @Name, "/"
 * summons the two moves (a roll, a vote) plus the session's end, mechanics
 * print at the live edge and resolve into one line of set type. Everything
 * else the old manuscript surface had is gone on purpose.
 */

// What prints on the page. Everything else in the archive (old ooc chat,
// scene furniture, illustrations) stays in the data and off the paper.
function isPageTurn(turn: Turn): boolean {
  switch (turn.type) {
    case "narration":
    case "consequence":
    case "action":
    case "dialogue":
    case "reaction":
    case "description":
      return true;
    case "story-moment":
      return turn.content.trim().length > 0;
    case "roll":
    case "roll-request":
      return true; // set line / live-edge slip (StoryProse skips requests)
    case "ooc":
      return isSetLine(turn);
    default:
      return false;
  }
}

// Aliases let the Director's own word land on the canonical move —
// "/dice" finds the roll, "/decide" finds the vote.
const DIRECTOR_MOVES_ACTIVE = [
  { key: "roll", label: "Call for a roll", aliases: ["dice", "check", "ask"] },
  { key: "vote", label: "Put it to a vote", aliases: ["crossroads", "choice", "decide"] },
  { key: "end", label: "End the session", aliases: ["finish", "close"] },
];
const STRANGER_MOVE = {
  key: "stranger",
  label: "Wake the Stranger",
  aliases: ["audience", "dark"],
};

export default function SessionPlayPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;
  const sessionId = params.sessionId as string;

  const {
    story,
    campaignSession,
    turns,
    characters,
    rosterCharacters,
    floorRound,
    loading,
    error,
    toast,
    showToast,
    currentUserId,
    isGM,
    myCharacter,
    sendTurn,
    setActivePlayer,
    updateSession,
    updateRollRequest,
    createFloorRound,
    submitFloorResponse,
    voteFloorSubmission,
    updateFloorRound,
  } = useCampaignSession(storyId, sessionId);

  const [composing, setComposing] = useState<"roll" | "vote" | "stranger" | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [epilogueText, setEpilogueText] = useState("");
  const [cliffhangerText, setCliffhangerText] = useState("");
  const [houseCount, setHouseCount] = useState(0);
  // The just-cast roll turn stays off the page while its slip stamps the
  // result; onSettled releases it and the set line inks in.
  const [suppressedIds, setSuppressedIds] = useState<ReadonlySet<string>>(new Set());
  const lastRollTurnIdRef = useRef<string | null>(null);
  const [replayIds, setReplayIds] = useState<ReadonlySet<string>>(new Set());
  const seenIdsRef = useRef<Set<string> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const sessionStatus = campaignSession?.status ?? "draft";
  const activePlayerId = campaignSession?.activePlayerId ?? null;

  // The House's light reaches the table too: gilded lines shimmer and gold
  // arriving from the dark flares the room. The cast never sends — gold
  // flows one way, from the audience to the page.
  const { gildedTurnIds, flareCount } = useHouseGold(
    storyId,
    sessionId,
    sessionStatus === "active",
  );

  // ── The page's turns ───────────────────────────────────────
  const pageTurns = useMemo(
    () => turns.filter((t) => isPageTurn(t) && !suppressedIds.has(t.id)),
    [turns, suppressedIds],
  );

  // Live ink: turns that arrive after first paint replay as flowing ink.
  // Vote records land as print (set type appears; it is not written).
  // Fresh ids accumulate in a ref and flush async — React 19 forbids
  // synchronous setState in an effect body, and the ref survives an
  // effect re-run cancelling the pending flush.
  const pendingReplayRef = useRef<string[]>([]);
  useEffect(() => {
    if (loading) return;
    if (!seenIdsRef.current) {
      seenIdsRef.current = new Set(turns.map((t) => t.id));
      return;
    }
    const seen = seenIdsRef.current;
    for (const t of turns) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      if (!isPageTurn(t) || t.type === "roll-request" || t.type === "ooc") continue;
      if (suppressedIds.has(t.id)) continue;
      pendingReplayRef.current.push(t.id);
    }
    if (pendingReplayRef.current.length === 0) return;
    const t = setTimeout(() => {
      const ids = pendingReplayRef.current;
      pendingReplayRef.current = [];
      setReplayIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
    }, 0);
    return () => clearTimeout(t);
  }, [turns, loading, suppressedIds]);

  const onReplayDone = useCallback((turnId: string) => {
    setReplayIds((prev) => {
      if (!prev.has(turnId)) return prev;
      const next = new Set(prev);
      next.delete(turnId);
      return next;
    });
  }, []);

  // Keep the end of the page in view as ink arrives.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pageTurns.length, activePlayerId, composing, floorRound?.status]);

  // The page feels the house: poll the live spectator count.
  useEffect(() => {
    if (!storyId || !sessionId || sessionStatus !== "active") {
      const t = setTimeout(() => setHouseCount(0), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch(
          `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/presence`,
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && typeof json.spectatorCount === "number")
          setHouseCount(json.spectatorCount);
      } catch {
        // a missing count shouldn't disrupt play
      }
    };
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [storyId, sessionId, sessionStatus]);

  // ── Derivations ────────────────────────────────────────────
  const activeChars = useMemo(
    () => characters.filter((c) => c.status === "active"),
    [characters],
  );
  const activePlayerUserIds = useMemo(
    () => activeChars.map((c) => c.userId),
    [activeChars],
  );
  const gmUserId = story?.userId ?? "";

  // The chair left for the dark, if this story keeps one. The move only
  // wakes while someone is actually watching — below quorum it sleeps.
  const strangerName = story?.campaignStrangerEnabled
    ? story.campaignStrangerName?.trim() || "the Stranger"
    : null;
  const directorMoves = useMemo(
    () =>
      strangerName && houseCount > 0
        ? [...DIRECTOR_MOVES_ACTIVE.slice(0, 2), STRANGER_MOVE, DIRECTOR_MOVES_ACTIVE[2]]
        : DIRECTOR_MOVES_ACTIVE,
    [strangerName, houseCount],
  );

  const pendingRoll = useMemo(() => findOpenRoll(pageTurns), [pageTurns]);

  const directorWriting =
    !activePlayerId || !activeChars.some((c) => c.userId === activePlayerId);
  const iAmWriting =
    sessionStatus === "active" &&
    (isGM ? directorWriting : activePlayerId === currentUserId && myCharacter?.status === "active");
  const writerChar = activeChars.find((c) => c.userId === activePlayerId) ?? null;
  const writerName = directorWriting
    ? "the Director"
    : writerChar?.name.split(" ")[0] ?? "…";
  const writerInk = directorWriting
    ? "var(--ink-gm)"
    : getPlayerInk(activePlayerId ?? "", activePlayerUserIds);
  const myInk = isGM
    ? "var(--ink-gm)"
    : currentUserId
      ? getPlayerInk(currentUserId, activePlayerUserIds)
      : "var(--ink-faded)";
  const myCharGone = !isGM && !!myCharacter && myCharacter.status !== "active";

  // ── Writing + the pass ─────────────────────────────────────
  const commit = useCallback(
    async (content: string, passToUserId: string | null) => {
      try {
        await sendTurn(
          isGM ? "narration" : "action",
          content,
          isGM ? undefined : myCharacter?.id,
        );
        if (isGM && passToUserId) await setActivePlayer(passToUserId);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to add to the story");
        throw err;
      }
    },
    [sendTurn, setActivePlayer, isGM, myCharacter, showToast],
  );

  // ── The dice ───────────────────────────────────────────────
  const onRollCall = useCallback(
    async (meta: {
      targetUserId: string;
      reason: string;
      onSuccess: string | null;
      onFailure: string | null;
    }) => {
      try {
        const target = activeChars.find((c) => c.userId === meta.targetUserId);
        const first = target?.name.split(" ")[0] ?? "the party";
        await sendTurn(
          "roll-request",
          `The Director asks ${first} for a roll — ${meta.reason}`,
          undefined,
          JSON.stringify({
            targetUserId: meta.targetUserId,
            reason: meta.reason,
            onSuccess: meta.onSuccess ?? "",
            onFailure: meta.onFailure ?? "",
            fatal: false,
          }),
        );
        setComposing(null);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to ask for the roll");
      }
    },
    [sendTurn, activeChars, showToast],
  );

  // The named player casts: the server rolls flat 2d6 with crypto and writes
  // the set line; we hold that turn off the page while the slip stamps.
  const executeRoll = useCallback(async (): Promise<RollResult> => {
    if (!pendingRoll || !myCharacter) throw new Error("No roll to make");
    const turn = await sendTurn(
      "roll",
      "Rolling…",
      myCharacter.id,
      JSON.stringify({
        aspectInvoked: false,
        rollRequestTurnId: pendingRoll.turn.id,
      }),
    );
    lastRollTurnIdRef.current = turn.id;
    setSuppressedIds((prev) => new Set(prev).add(turn.id));
    seenIdsRef.current?.add(turn.id);
    const meta = JSON.parse(turn.metadata ?? "{}");
    if (!meta?.dice || meta.total === undefined || !meta.tier) {
      throw new Error("Server returned an incomplete roll");
    }
    return {
      dice: meta.dice,
      modifier: meta.modifier ?? 0,
      total: meta.total,
      tier: tierFromServer(meta.tier),
    };
  }, [pendingRoll, myCharacter, sendTurn]);

  const onRollSettled = useCallback(() => {
    const rollTurnId = lastRollTurnIdRef.current;
    lastRollTurnIdRef.current = null;
    if (!rollTurnId) return;
    setSuppressedIds((prev) => {
      const next = new Set(prev);
      next.delete(rollTurnId);
      return next;
    });
    setReplayIds((prev) => new Set(prev).add(rollTurnId));
  }, []);

  const onRollCallOff = useCallback(async () => {
    if (!pendingRoll) return;
    try {
      await updateRollRequest(pendingRoll.turn.id, "cancelled");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to call it off");
    }
  }, [pendingRoll, updateRollRequest, showToast]);

  // ── The vote ───────────────────────────────────────────────
  const onVoteCall = useCallback(
    async (prompt: string) => {
      try {
        await createFloorRound(prompt, { audiencePulseEnabled: true });
        setComposing(null);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to open the vote");
      }
    },
    [createFloorRound, showToast],
  );

  // ── The Stranger ───────────────────────────────────────────
  const onStrangerCall = useCallback(
    async (ballot: { prompt: string; deeds: string[] }) => {
      try {
        await createFloorRound(ballot.prompt, { mode: "stranger", deeds: ballot.deeds });
        setComposing(null);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to wake the Stranger");
      }
    },
    [createFloorRound, showToast],
  );

  const liveRound =
    floorRound && ["open", "voting", "closed"].includes(floorRound.status)
      ? floorRound
      : null;

  const voteOptions: VoteOption[] = useMemo(() => {
    if (!liveRound) return [];
    return liveRound.submissions.map((s) => ({
      id: s.id,
      authorName: s.characterName?.split(" ")[0] ?? s.user.displayName ?? "?",
      ink: s.userId
        ? getPlayerInk(s.userId, activePlayerUserIds)
        : "var(--ink-faded)",
      content: s.content,
      voteCount: s.voteCount,
      leanCount: s.audiencePulseCount,
      isMyVote: liveRound.myVoteSubmissionId === s.id,
      isMyLean: false,
      isMine: s.isMine,
    }));
  }, [liveRound, activePlayerUserIds]);

  const onSubmitLine = useCallback(
    async (content: string) => {
      if (!liveRound || !myCharacter) return;
      try {
        await submitFloorResponse(liveRound.id, {
          characterId: myCharacter.id,
          type: "action",
          content,
        });
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to add your line");
      }
    },
    [liveRound, myCharacter, submitFloorResponse, showToast],
  );

  const onVote = useCallback(
    async (submissionId: string) => {
      if (!liveRound) return;
      try {
        await voteFloorSubmission(liveRound.id, submissionId);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to cast your vote");
      }
    },
    [liveRound, voteFloorSubmission, showToast],
  );

  const onVoteResolve = useCallback(async () => {
    if (!liveRound || liveRound.submissions.length === 0) return;
    const winner = [...liveRound.submissions].sort(
      (a, b) =>
        b.voteCount - a.voteCount || b.audiencePulseCount - a.audiencePulseCount,
    )[0];
    const first = winner.characterName?.split(" ")[0] ?? "The table";
    const votesFor = winner.voteCount;
    const votesOthers = liveRound.submissions
      .filter((s) => s.id !== winner.id)
      .reduce((sum, s) => sum + s.voteCount, 0);
    const otherLeans = liveRound.submissions
      .filter((s) => s.id !== winner.id)
      .reduce((sum, s) => sum + s.audiencePulseCount, 0);
    try {
      // The record line prints first, then the winning passage joins under it.
      const record = await sendTurn(
        "ooc",
        composeVoteLine(first, votesFor, votesOthers, winner.audiencePulseCount, otherLeans),
        undefined,
        JSON.stringify({ kind: "vote-record", prompt: liveRound.prompt }),
      );
      seenIdsRef.current?.add(record.id);
      await updateFloorRound(liveRound.id, {
        status: "resolved",
        selectedSubmissionId: winner.id,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add the winner");
    }
  }, [liveRound, sendTurn, updateFloorRound, showToast]);

  const onVoteCallOff = useCallback(async () => {
    if (!liveRound) return;
    try {
      await updateFloorRound(liveRound.id, { status: "cancelled" });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to call it off");
    }
  }, [liveRound, updateFloorRound, showToast]);

  // The house has spoken: the record line prints, then the chosen deed
  // joins the story in the Stranger's ink (the server writes it on resolve).
  const strangerDeeds: StrangerDeed[] = useMemo(() => {
    if (!liveRound || liveRound.mode !== "stranger") return [];
    return liveRound.submissions.map((s) => ({
      id: s.id,
      content: s.content,
      voiceCount: s.audiencePulseCount,
      isMyChoice: false,
    }));
  }, [liveRound]);

  const onStrangerResolve = useCallback(async () => {
    if (!liveRound || liveRound.submissions.length === 0 || !strangerName) return;
    const winner = [...liveRound.submissions].sort(
      (a, b) => b.audiencePulseCount - a.audiencePulseCount,
    )[0];
    const voicesFor = winner.audiencePulseCount;
    const voicesOthers = liveRound.submissions
      .filter((s) => s.id !== winner.id)
      .reduce((sum, s) => sum + s.audiencePulseCount, 0);
    try {
      const record = await sendTurn(
        "ooc",
        composeStrangerLine(strangerName, voicesFor, voicesOthers),
        undefined,
        JSON.stringify({ kind: "stranger-record", prompt: liveRound.prompt }),
      );
      seenIdsRef.current?.add(record.id);
      await updateFloorRound(liveRound.id, {
        status: "resolved",
        selectedSubmissionId: winner.id,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add the deed");
    }
  }, [liveRound, strangerName, sendTurn, updateFloorRound, showToast]);

  // ── Session lifecycle ──────────────────────────────────────
  const onBegin = useCallback(async () => {
    try {
      await updateSession({ status: "active" });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to begin the session");
    }
  }, [updateSession, showToast]);

  const onConfirmEnd = useCallback(async () => {
    try {
      await updateSession({
        status: "completed",
        epilogue: epilogueText.trim() || undefined,
        cliffhanger: cliffhangerText.trim() || undefined,
      });
      setShowEndModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to end the session");
    }
  }, [updateSession, epilogueText, cliffhangerText, showToast]);

  const onMove = useCallback((key: string) => {
    if (key === "roll" || key === "vote" || key === "stranger") setComposing(key);
    if (key === "end") setShowEndModal(true);
  }, []);

  // ── Loading / error ────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-void">
        <div className="space-y-4 text-center">
          <p className="text-white/60">{error ?? "Session not found"}</p>
          <button
            onClick={() => router.push(`/campaign/${storyId}`)}
            className="inline-block cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            Back to the campaign
          </button>
        </div>
      </div>
    );
  }

  // ── The end of the page ────────────────────────────────────
  const endOfPage =
    sessionStatus === "draft" ? (
      <div className="py-4 text-center">
        <p className="table-murmur">
          {isGM
            ? "the table is set — begin when the cast is ready"
            : "the Director will begin soon"}
        </p>
        {isGM && (
          <button
            type="button"
            onClick={() => void onBegin()}
            className="wax-seal mt-4 cursor-pointer px-5 py-2 text-[12px] font-bold uppercase tracking-[0.16em]"
          >
            Begin the session
          </button>
        )}
      </div>
    ) : sessionStatus !== "active" ? (
      <div className="py-4 text-center">
        {campaignSession?.epilogue && (
          <p className="mb-3 font-reading text-[15px] italic leading-[1.85] text-text-secondary">
            {campaignSession.epilogue}
          </p>
        )}
        {campaignSession?.cliffhanger && (
          <p className="table-murmur mb-3">next: {campaignSession.cliffhanger}</p>
        )}
        <p className="table-murmur">
          this session is written ·{" "}
          <Link href={`/campaign/${storyId}`} className="text-amber hover:underline">
            back to the campaign
          </Link>
        </p>
      </div>
    ) : pendingRoll ? (
      <DiceSlip
        key={pendingRoll.turn.id}
        meta={pendingRoll.meta}
        characters={characters}
        allPlayerUserIds={activePlayerUserIds}
        canRoll={
          currentUserId === pendingRoll.meta.targetUserId &&
          myCharacter?.status === "active"
        }
        onRoll={executeRoll}
        onSettled={onRollSettled}
        onCallOff={isGM ? onRollCallOff : undefined}
      />
    ) : liveRound && liveRound.mode === "stranger" ? (
      <StrangerBlock
        name={strangerName ?? "the Stranger"}
        prompt={liveRound.prompt}
        deeds={strangerDeeds}
        canChoose={false}
        canResolve={isGM}
        resolveReady={liveRound.audiencePulseCount > 0}
        onChoose={() => undefined}
        onResolve={() => void onStrangerResolve()}
        onCallOff={() => void onVoteCallOff()}
      />
    ) : liveRound ? (
      <VoteBlock
        prompt={liveRound.prompt}
        options={voteOptions}
        canSubmit={
          !isGM &&
          !!myCharacter &&
          myCharacter.status === "active" &&
          liveRound.status === "open" &&
          !liveRound.submissions.some((s) => s.isMine)
        }
        myName={myCharacter?.name.split(" ")[0] ?? null}
        myInk={myInk}
        canVote={
          !isGM &&
          liveRound.isVoteEligible &&
          ["open", "voting"].includes(liveRound.status) &&
          liveRound.submissions.length > 0
        }
        canLean={false}
        canResolve={isGM}
        resolveReady={liveRound.submissions.length > 0 && liveRound.voteCount > 0}
        onSubmit={onSubmitLine}
        onVote={onVote}
        onLean={() => undefined}
        onResolve={onVoteResolve}
        onCallOff={onVoteCallOff}
      />
    ) : myCharGone ? (
      <p className="table-murmur py-2 text-center">
        the story goes on — {myCharacter?.name.split(" ")[0]}&rsquo;s part in it is written
      </p>
    ) : iAmWriting ? (
      <Quill
        isGM={isGM}
        myCharName={myCharacter?.name.split(" ")[0] ?? null}
        ink={myInk}
        characters={characters}
        onCommit={commit}
        moves={isGM ? directorMoves : undefined}
        onMove={onMove}
        strangerName={isGM ? strangerName : null}
      />
    ) : (
      <WaitingLine name={writerName} ink={writerInk} />
    );

  // The Director's composers take precedence over their own quill.
  const endOfPageFinal =
    sessionStatus === "active" && !pendingRoll && !liveRound && isGM && composing
      ? composing === "roll" ? (
          <RollCall
            characters={characters}
            allPlayerUserIds={activePlayerUserIds}
            onCommit={(meta) => void onRollCall(meta)}
            onCancel={() => setComposing(null)}
          />
        ) : composing === "stranger" ? (
          <StrangerCall
            name={strangerName ?? "the Stranger"}
            onCommit={(ballot) => void onStrangerCall(ballot)}
            onCancel={() => setComposing(null)}
          />
        ) : (
          <VoteCall onCommit={(p) => void onVoteCall(p)} onCancel={() => setComposing(null)} />
        )
      : endOfPage;

  const castForSignature = rosterCharacters.length > 0 ? rosterCharacters : activeChars;

  return (
    <>
      <PageRoom
        leaveHref={`/campaign/${storyId}`}
        houseCount={houseCount}
        header={
          <>
            <h1 className="font-display text-[21px] font-semibold tracking-tight text-paper">
              {story.title}
            </h1>
            <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-text-ghost">
              {campaignSession?.title ?? "session"}
              {sessionStatus === "active"
                ? " — live"
                : sessionStatus === "draft"
                  ? " — preparing"
                  : " — written"}
              {houseCount > 0 && (
                <span className="text-amber/80"> · {houseCount} watching</span>
              )}
            </p>
          </>
        }
        signature={
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span>at the table —</span>
            <span
              className="inline-flex items-baseline gap-1 font-medium not-italic"
              style={{ color: "var(--ink-gm)" }}
            >
              {sessionStatus === "active" && directorWriting && (
                <PenMark ink="var(--ink-gm)" />
              )}
              ✦ the Director{isGM ? " · you" : ""}
            </span>
            {castForSignature.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-baseline gap-1 font-medium not-italic"
                style={{ color: getPlayerInk(c.userId, activePlayerUserIds) }}
              >
                · {sessionStatus === "active" &&
                  !directorWriting &&
                  activePlayerId === c.userId && (
                    <PenMark ink={getPlayerInk(c.userId, activePlayerUserIds)} />
                  )}
                {c.name.split(" ")[0]}
                {currentUserId === c.userId ? " · you" : ""}
              </span>
            ))}
            {strangerName && (
              <span
                className="font-medium not-italic"
                style={{ color: "var(--ink-strange)" }}
                title="A chair left for the dark — the audience plays this character"
              >
                · ☾ {strangerName}
              </span>
            )}
            {houseCount > 0 && <span>· {houseCount} watching from the dark</span>}
          </div>
        }
        overlays={<GoldLight flareCount={flareCount} />}
      >
        {/* Beginning the session posts the opening as the first turn, so the
            preview block only shows while the page is still being set. */}
        {sessionStatus === "draft" && campaignSession?.opening && (
          <p className="mb-8 font-reading text-[15px] italic leading-[1.85] text-text-secondary">
            {campaignSession.opening}
          </p>
        )}

        <StoryProse
          turns={pageTurns}
          characters={characters}
          gmUserId={gmUserId}
          replayIds={replayIds}
          onReplayDone={onReplayDone}
          gildedTurnIds={gildedTurnIds}
          strangerName={strangerName}
        />

        <div className="mt-2 border-t border-dashed border-border/40 pt-5">
          {endOfPageFinal}
        </div>
        <div ref={endRef} />
      </PageRoom>

      {toast && (
        <div className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 rounded-xl bg-rose/90 px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
          {toast}
        </div>
      )}

      <EndSessionModal
        open={showEndModal}
        epilogueText={epilogueText}
        setEpilogueText={setEpilogueText}
        cliffhangerText={cliffhangerText}
        setCliffhangerText={setCliffhangerText}
        onConfirm={() => void onConfirmEnd()}
        onClose={() => setShowEndModal(false)}
      />
    </>
  );
}
