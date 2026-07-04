"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useSpectatorSession } from "@/hooks/use-spectator-session";
import { useSpectatorPresence } from "@/hooks/use-spectator-presence";
import { useSpectatorFloorRound } from "@/hooks/use-spectator-floor-round";
import { useHouseGold } from "@/hooks/use-house-gold";
import PageRoom from "@/components/campaign/v2/PageRoom";
import StoryProse, { isSetLine, inkFor } from "@/components/campaign/v2/StoryProse";
import WaitingLine from "@/components/campaign/v2/WaitingLine";
import DiceSlip from "@/components/campaign/v2/DiceSlip";
import VoteBlock, { type VoteOption } from "@/components/campaign/v2/VoteBlock";
import StrangerBlock, { type StrangerDeed } from "@/components/campaign/v2/StrangerBlock";
import GoldSlip from "@/components/campaign/v2/GoldSlip";
import GoldLight from "@/components/campaign/v2/GoldLight";
import PenMark from "@/components/campaign/v2/PenMark";
import { findOpenRoll } from "@/components/campaign/v2/rolls";
import { getPlayerInk, type PlayerCharacter, type Turn } from "@/types/campaign";

/**
 * The dark beyond the page: the same "Set in Ink" sheet, fully read-only.
 * A watcher reads the ink as it arrives, sees the slip and the vote exactly
 * as the table does, and has two quiet hands of their own — leaning on a
 * vote line, and The House's gesture: give gold, make light. Tapping a
 * settled line sets it in gold; "leave gold" at the page's foot lights the
 * whole table. Gold splits evenly across the cast and never buys the story.
 */

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
      return true;
    case "ooc":
      return isSetLine(turn);
    default:
      return false;
  }
}

export default function WatchSessionPage() {
  const params = useParams();
  const storyId = params.storyId as string;
  const sessionId = params.sessionId as string;

  const {
    loading,
    error,
    campaignSession,
    turns,
    characters: spectatorChars,
    spectatorCount: pollCount,
    storyTitle,
    strangerName,
  } = useSpectatorSession(storyId, sessionId);
  const { spectatorCount: presenceCount, token } = useSpectatorPresence(storyId, sessionId);
  const { floorRound, sendPulse } = useSpectatorFloorRound(storyId, sessionId, token);
  const { gildedTurnIds, flareCount, balance, sendGold } = useHouseGold(
    storyId,
    sessionId,
    campaignSession?.status === "active",
  );

  const spectatorCount = Math.max(pollCount, presenceCount);
  // The gold slip's target: null = closed; { turnId: null } = gold for the
  // table; { turnId } = setting that line in gold.
  const [goldTarget, setGoldTarget] = useState<{ turnId: string | null } | null>(null);
  const [replayIds, setReplayIds] = useState<ReadonlySet<string>>(new Set());
  const seenIdsRef = useRef<Set<string> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // The page components speak PlayerCharacter; the spectate feed is thinner.
  const characters = useMemo<PlayerCharacter[]>(
    () =>
      spectatorChars.map((c) => ({
        id: c.id,
        userId: c.userId ?? "",
        name: c.name,
        portrait: c.portrait,
        description: "",
        traits: "",
        stats: null,
        status: "active",
        user: { id: c.userId ?? "", displayName: c.displayName, avatarUrl: null },
      })),
    [spectatorChars],
  );
  const activePlayerUserIds = useMemo(
    () => characters.map((c) => c.userId),
    [characters],
  );

  // The spectate feed doesn't carry the story owner; the Director is whoever
  // writes the narration.
  const gmUserId = useMemo(() => {
    const gmTurn = turns.find(
      (t) =>
        (t.type === "narration" || t.type === "consequence") &&
        !activePlayerUserIds.includes(t.userId),
    );
    return gmTurn?.userId ?? "";
  }, [turns, activePlayerUserIds]);

  const pageTurns = useMemo(() => turns.filter(isPageTurn), [turns]);

  // Live ink for the dark too — arriving passages write themselves in.
  // (Async flush: React 19 forbids synchronous setState in an effect body;
  // the ref survives an effect re-run cancelling the pending flush.)
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
  }, [turns, loading]);

  const onReplayDone = useCallback((turnId: string) => {
    setReplayIds((prev) => {
      if (!prev.has(turnId)) return prev;
      const next = new Set(prev);
      next.delete(turnId);
      return next;
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pageTurns.length, floorRound?.status]);

  const pendingRoll = useMemo(() => findOpenRoll(pageTurns), [pageTurns]);

  const liveRound =
    floorRound && ["open", "voting", "closed"].includes(floorRound.status)
      ? floorRound
      : null;

  const voteOptions: VoteOption[] = useMemo(() => {
    if (!liveRound) return [];
    return liveRound.submissions.map((s) => ({
      id: s.id,
      authorName: s.characterName?.split(" ")[0] ?? s.user.displayName ?? "?",
      ink: s.userId ? getPlayerInk(s.userId, activePlayerUserIds) : "var(--ink-faded)",
      content: s.content,
      voteCount: s.voteCount,
      leanCount: s.audiencePulseCount,
      isMyVote: false,
      isMyLean: liveRound.myAudiencePulseSubmissionId === s.id,
      isMine: false,
    }));
  }, [liveRound, activePlayerUserIds]);

  const onLean = useCallback(
    (submissionId: string) => {
      void sendPulse(submissionId).catch(() => undefined);
    },
    [sendPulse],
  );

  // The Stranger's ballot — the same pulse machinery, but here the house's
  // choice IS the mechanic. Free by law: gold never buys the story.
  const strangerDeeds: StrangerDeed[] = useMemo(() => {
    if (!liveRound || liveRound.mode !== "stranger") return [];
    return liveRound.submissions.map((s) => ({
      id: s.id,
      content: s.content,
      voiceCount: s.audiencePulseCount,
      isMyChoice: liveRound.myAudiencePulseSubmissionId === s.id,
    }));
  }, [liveRound]);

  const sessionStatus = campaignSession?.status ?? "draft";
  const activePlayerId = campaignSession?.activePlayerId ?? null;
  const writerChar = characters.find((c) => c.userId === activePlayerId) ?? null;
  const directorWriting = !writerChar;
  const writerName = directorWriting ? "the Director" : writerChar!.name.split(" ")[0];
  const writerInk = directorWriting
    ? "var(--ink-gm)"
    : getPlayerInk(activePlayerId ?? "", activePlayerUserIds);

  // The House's hands are only offered to a signed-in watcher of a live page.
  const canGive = sessionStatus === "active" && balance !== null;

  const gildLine = useMemo(() => {
    if (!goldTarget?.turnId) return null;
    const turn = pageTurns.find((t) => t.id === goldTarget.turnId);
    if (!turn) return null;
    return {
      content: turn.content,
      ink: inkFor(turn.userId, gmUserId, activePlayerUserIds),
    };
  }, [goldTarget, pageTurns, gmUserId, activePlayerUserIds]);

  const onGild = useCallback(
    (turnId: string) => setGoldTarget({ turnId }),
    [],
  );

  if (loading) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-void">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-amber/20 border-t-amber" />
          <p className="hand-note text-base">finding a place in the dark…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-void">
        <div className="max-w-md text-center">
          <p className="mb-4 text-sm text-rose">{error}</p>
          <Link href={`/campaign/${storyId}`} className="text-sm text-amber hover:underline">
            Back to the campaign
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageRoom
        leaveHref={`/campaign/${storyId}`}
        houseCount={spectatorCount}
        header={
          <>
            <h1 className="font-display text-[21px] font-semibold tracking-tight text-paper">
              {storyTitle ?? "A tale"}
            </h1>
            <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-text-ghost">
              {campaignSession?.title ?? "session"}
              {sessionStatus === "active" ? " — live" : sessionStatus === "draft" ? " — preparing" : " — written"}
              {spectatorCount > 0 && (
                <span className="text-amber/80"> · {spectatorCount} watching</span>
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
              ✦ the Director
            </span>
            {characters.map((c) => (
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
            <span>· you are in the dark</span>
            {canGive && (
              <button
                type="button"
                onClick={() => setGoldTarget({ turnId: null })}
                className="table-action ml-auto flex cursor-pointer items-center gap-1 rounded-full border border-amber/30 px-2.5 py-1 text-amber/90 transition-colors hover:bg-amber/10"
                title="Leave gold for the table — it becomes light. Or tap any line marked ✦ to set it in gold."
              >
                leave gold ✦
              </button>
            )}
          </div>
        }
        overlays={
          <>
            {/* The House: gold arriving anywhere in the room flares the dark. */}
            <GoldLight flareCount={flareCount} />
            {goldTarget && balance !== null && (
              <GoldSlip
                line={gildLine}
                balance={balance}
                onSend={(amount) => sendGold(amount, goldTarget.turnId ?? undefined)}
                onClose={() => setGoldTarget(null)}
              />
            )}
          </>
        }
      >
        {/* The opening lands as the first turn once the session begins. */}
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
          onGild={canGive ? onGild : undefined}
          strangerName={strangerName}
        />

        <div className="mt-2 border-t border-dashed border-border/40 pt-5">
          {sessionStatus !== "active" && sessionStatus !== "draft" ? (
            <div className="py-4 text-center">
              {campaignSession?.epilogue && (
                <p className="mb-3 font-reading text-[15px] italic leading-[1.85] text-text-secondary">
                  {campaignSession.epilogue}
                </p>
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
              canRoll={false}
              onRoll={() => {
                throw new Error("Watchers don't hold the dice");
              }}
              onSettled={() => undefined}
            />
          ) : liveRound && liveRound.mode === "stranger" ? (
            <StrangerBlock
              name={strangerName ?? "the Stranger"}
              prompt={liveRound.prompt}
              deeds={strangerDeeds}
              canChoose={!!token && ["open", "voting"].includes(liveRound.status)}
              canResolve={false}
              resolveReady={false}
              onChoose={onLean}
              onResolve={() => undefined}
              onCallOff={() => undefined}
            />
          ) : liveRound ? (
            <VoteBlock
              prompt={liveRound.prompt}
              options={voteOptions}
              canSubmit={false}
              myName={null}
              myInk="var(--ink-faded)"
              canVote={false}
              canLean={
                liveRound.audiencePulseEnabled &&
                ["open", "voting"].includes(liveRound.status) &&
                liveRound.submissions.length > 0
              }
              canResolve={false}
              resolveReady={false}
              onSubmit={() => undefined}
              onVote={() => undefined}
              onLean={onLean}
              onResolve={() => undefined}
              onCallOff={() => undefined}
            />
          ) : sessionStatus === "draft" ? (
            <p className="table-murmur py-2 text-center">the table is being set…</p>
          ) : (
            <WaitingLine name={writerName} ink={writerInk} />
          )}
        </div>
        <div ref={endRef} />
      </PageRoom>

    </>
  );
}
