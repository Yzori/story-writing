"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Turn } from "@/types/campaign";
import { getPlayerInk } from "@/types/campaign";
import PageRoom from "@/components/campaign/v2/PageRoom";
import StoryProse, { inkFor } from "@/components/campaign/v2/StoryProse";
import Quill from "@/components/campaign/v2/Quill";
import WaitingLine from "@/components/campaign/v2/WaitingLine";
import DiceSlip from "@/components/campaign/v2/DiceSlip";
import RollCall from "@/components/campaign/v2/RollCall";
import VoteCall from "@/components/campaign/v2/VoteCall";
import VoteBlock, { type VoteOption } from "@/components/campaign/v2/VoteBlock";
import StrangerCall from "@/components/campaign/v2/StrangerCall";
import StrangerBlock, { type StrangerDeed } from "@/components/campaign/v2/StrangerBlock";
import GoldSlip from "@/components/campaign/v2/GoldSlip";
import GoldLight from "@/components/campaign/v2/GoldLight";
import PenMark from "@/components/campaign/v2/PenMark";
import { composeStrangerLine } from "@/components/campaign/v2/stranger";
import { composeVoteLine } from "@/components/campaign/v2/votes";
import {
  composeSetLine,
  findOpenRoll,
  rollDice,
  type RollResult,
} from "@/components/campaign/v2/rolls";
import {
  CHARACTERS,
  GM_USER_ID,
  INITIAL_TURNS,
  OPENING_NARRATION,
  SESSION_ID,
  STRANGER_NAME,
} from "./fixtures";

/**
 * Adventure v2 demo — the "Set in Ink" core loop on fixtures, no API.
 * One page; the Director passes the pen by writing @Name; committed
 * passages replay as flowing ink. "/" summons the Director's moves: a
 * roll prints as a slip at the live edge, the named player rolls, and
 * the result settles into the story as one line of set type. A vote
 * prints the Director's question; players write rival lines each in
 * their own ink, the table votes, viewers lean, and the winner joins
 * the story behind a record line. Switch roles with the demo bar to
 * see each chair's view.
 */

type Role = "gm" | (typeof CHARACTERS)[number]["userId"] | "viewer";

const ROLE_LABELS: Array<{ key: Role; label: string }> = [
  { key: "gm", label: "the Director" },
  ...CHARACTERS.map((c) => ({
    key: c.userId as Role,
    label: c.name.split(" ")[0],
  })),
  { key: "viewer", label: "a viewer" },
];

const ACTIVE_USER_IDS = CHARACTERS.filter((c) => c.status === "active").map(
  (c) => c.userId,
);

const DIRECTOR_MOVES = [
  { key: "roll", label: "Call for a roll" },
  { key: "vote", label: "Put it to a vote" },
  { key: "stranger", label: "Wake the Stranger" },
];

/** A live vote round — furniture at the page's edge, never a turn. */
interface DemoRound {
  prompt: string;
  submissions: Array<{ id: string; userId: string; content: string }>;
  /** voter userId → submission id */
  votes: Record<string, string>;
  viewerLean: string | null;
  /** The rest of the "12 watching" — simulated house lean, per submission. */
  ambientLeans: Record<string, number>;
}

/** The Stranger's ballot — Director-framed deeds, chosen by the house alone. */
interface DemoStrangerRound {
  prompt: string;
  deeds: Array<{ id: string; content: string }>;
  viewerChoice: string | null;
  /** The rest of the "12 watching" — simulated house voices, per deed. */
  ambientVoices: Record<string, number>;
}

export default function DemoAdventureV2Page() {
  const [role, setRole] = useState<Role>("gm");
  const [turns, setTurns] = useState<Turn[]>(INITIAL_TURNS);
  // null = the Director writes.
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  // The Director is filling in a roll slip, a vote question, or a ballot.
  const [composing, setComposing] = useState<"roll" | "vote" | "stranger" | null>(null);
  const [round, setRound] = useState<DemoRound | null>(null);
  const [strangerRound, setStrangerRound] = useState<DemoStrangerRound | null>(null);
  const [replayIds, setReplayIds] = useState<ReadonlySet<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  // The House, demo-local: one line arrives already set in gold; the viewer
  // chair can gild more and leave gold for the table. Gold buys light only.
  const [gildedTurnIds, setGildedTurnIds] = useState<ReadonlySet<string>>(
    new Set(["t-2"]),
  );
  const [flareCount, setFlareCount] = useState(0);
  const [demoBalance, setDemoBalance] = useState(120);
  const [goldTarget, setGoldTarget] = useState<{ turnId: string | null } | null>(
    null,
  );

  const gildLine = useMemo(() => {
    if (!goldTarget?.turnId) return null;
    const turn = turns.find((t) => t.id === goldTarget.turnId);
    if (!turn) return null;
    return {
      content: turn.content,
      ink: inkFor(turn.userId, GM_USER_ID, ACTIVE_USER_IDS),
    };
  }, [goldTarget, turns]);

  const onSendGold = useCallback(
    async (amount: number) => {
      setDemoBalance((b) => b - amount);
      if (goldTarget?.turnId) {
        const turnId = goldTarget.turnId;
        setGildedTurnIds((prev) => new Set(prev).add(turnId));
      }
      setFlareCount((c) => c + 1);
    },
    [goldTarget],
  );

  // The live slip, if a roll is on the table.
  const pendingRoll = useMemo(() => findOpenRoll(turns), [turns]);

  // Keep the end of the page in view as ink arrives.
  const roundSubmissionCount = round ? round.submissions.length : -1;
  const strangerOpen = strangerRound !== null;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, activePlayerId, composing, roundSubmissionCount, strangerOpen]);

  // The felt audience: while lines are on the table, the dark stirs — a
  // few of the "12 watching" lean, one by one. Demo-only colour.
  const roundHasLines = !!round && round.submissions.length > 0;
  useEffect(() => {
    if (!roundHasLines) return;
    const id = setInterval(() => {
      setRound((prev) => {
        if (!prev || prev.submissions.length === 0) return prev;
        const total = Object.values(prev.ambientLeans).reduce((a, b) => a + b, 0);
        if (total >= 9) return prev;
        const pick =
          prev.submissions[Math.floor(Math.random() * prev.submissions.length)].id;
        return {
          ...prev,
          ambientLeans: {
            ...prev.ambientLeans,
            [pick]: (prev.ambientLeans[pick] ?? 0) + 1,
          },
        };
      });
    }, 2600);
    return () => clearInterval(id);
  }, [roundHasLines]);

  // The dark stirs at the Stranger's ballot too — a few of the "12
  // watching" cast their voices, one by one. Demo-only colour.
  const strangerHasDeeds = !!strangerRound && strangerRound.deeds.length > 0;
  useEffect(() => {
    if (!strangerHasDeeds) return;
    const id = setInterval(() => {
      setStrangerRound((prev) => {
        if (!prev || prev.deeds.length === 0) return prev;
        const total = Object.values(prev.ambientVoices).reduce((a, b) => a + b, 0);
        if (total >= 9) return prev;
        const pick = prev.deeds[Math.floor(Math.random() * prev.deeds.length)].id;
        return {
          ...prev,
          ambientVoices: {
            ...prev.ambientVoices,
            [pick]: (prev.ambientVoices[pick] ?? 0) + 1,
          },
        };
      });
    }, 2200);
    return () => clearInterval(id);
  }, [strangerHasDeeds]);

  const onReplayDone = useCallback((turnId: string) => {
    setReplayIds((prev) => {
      if (!prev.has(turnId)) return prev;
      const next = new Set(prev);
      next.delete(turnId);
      return next;
    });
  }, []);

  const commit = useCallback(
    (content: string, passToUserId: string | null) => {
      const isGM = role === "gm";
      const character = CHARACTERS.find((c) => c.userId === role) ?? null;
      const id = `t-live-${Date.now()}`;
      const turn: Turn = {
        id,
        sessionId: SESSION_ID,
        userId: isGM ? GM_USER_ID : (role as string),
        characterId: character?.id ?? null,
        type: isGM ? "narration" : "action",
        content,
        metadata: null,
        sortOrder: turns.length,
        createdAt: new Date().toISOString(),
        user: {
          id: isGM ? GM_USER_ID : (role as string),
          displayName: isGM ? "The Director" : character?.user?.displayName ?? null,
          avatarUrl: null,
        },
        characterName: character?.name ?? null,
        characterPortrait: null,
      };
      setTurns((prev) => [...prev, turn]);
      setReplayIds((prev) => new Set(prev).add(id));
      // The pass: the Director's @ hands the pen; a player's commit returns it.
      setActivePlayerId(isGM ? passToUserId : null);
    },
    [role, turns.length],
  );

  // The Director asks for a roll: the slip prints at the live edge.
  const onRollCall = useCallback(
    (meta: {
      targetUserId: string;
      reason: string;
      onSuccess: string | null;
      onFailure: string | null;
    }) => {
      const target = CHARACTERS.find((c) => c.userId === meta.targetUserId);
      const first = target?.name.split(" ")[0] ?? "someone";
      const id = `t-call-${Date.now()}`;
      setTurns((prev) => [
        ...prev,
        {
          id,
          sessionId: SESSION_ID,
          userId: GM_USER_ID,
          characterId: null,
          type: "roll-request",
          content: `The Director asks ${first} for a roll — ${meta.reason}`,
          metadata: JSON.stringify({ ...meta, status: "open" }),
          sortOrder: prev.length,
          createdAt: new Date().toISOString(),
          user: { id: GM_USER_ID, displayName: "The Director", avatarUrl: null },
          characterName: null,
          characterPortrait: null,
        },
      ]);
      setComposing(null);
    },
    [],
  );

  // The named player casts — demo rolls client-side; live, the server rolls.
  // Flat 2d6: identical odds for everyone (audit D1).
  const executeRoll = useCallback((): RollResult => rollDice(), []);

  // The result has been read: close the slip, set one line of type into the
  // story, and let the stakes land as the Director's consequence — exactly
  // what the live server does — before the pen returns to the Director.
  const onRollSettled = useCallback(
    (result: RollResult) => {
      if (!pendingRoll) return;
      const { turn: request, meta } = pendingRoll;
      const target = CHARACTERS.find((c) => c.userId === meta.targetUserId) ?? null;
      const first = target?.name.split(" ")[0] ?? "The table";
      const id = `t-roll-${Date.now()}`;
      const consequence =
        result.tier === "holds"
          ? meta.onSuccess
          : result.tier === "breaks"
            ? meta.onFailure
            : meta.onSuccess && meta.onFailure
              ? `${meta.onSuccess} — but ${meta.onFailure.charAt(0).toLowerCase()}${meta.onFailure.slice(1)}`
              : meta.onSuccess ?? meta.onFailure;
      const consequenceId = `t-cons-${Date.now()}`;
      setTurns((prev) => {
        const next = prev
          .map((t) =>
            t.id === request.id
              ? { ...t, metadata: JSON.stringify({ ...meta, status: "closed" }) }
              : t,
          )
          .concat({
            id,
            sessionId: SESSION_ID,
            userId: meta.targetUserId,
            characterId: target?.id ?? null,
            type: "roll",
            content: composeSetLine(first, result),
            metadata: JSON.stringify(result),
            sortOrder: prev.length,
            createdAt: new Date().toISOString(),
            user: {
              id: meta.targetUserId,
              displayName: target?.user?.displayName ?? null,
              avatarUrl: null,
            },
            characterName: target?.name ?? null,
            characterPortrait: null,
          });
        if (consequence) {
          next.push({
            id: consequenceId,
            sessionId: SESSION_ID,
            userId: GM_USER_ID,
            characterId: null,
            type: "consequence",
            content: consequence,
            metadata: null,
            sortOrder: prev.length + 1,
            createdAt: new Date().toISOString(),
            user: { id: GM_USER_ID, displayName: "The Director", avatarUrl: null },
            characterName: null,
            characterPortrait: null,
          });
        }
        return next;
      });
      setReplayIds((prev) => {
        const next = new Set(prev).add(id);
        if (consequence) next.add(consequenceId);
        return next;
      });
      setActivePlayerId(null);
    },
    [pendingRoll],
  );

  // The Director takes a stale call back — a slip must never deadlock the page.
  const onRollCallOff = useCallback(() => {
    if (!pendingRoll) return;
    const { turn: request, meta } = pendingRoll;
    setTurns((prev) =>
      prev.map((t) =>
        t.id === request.id
          ? { ...t, metadata: JSON.stringify({ ...meta, status: "cancelled" }) }
          : t,
      ),
    );
  }, [pendingRoll]);

  // ── The Stranger — the house's ballot ──────────────────────
  const onStrangerCall = useCallback(
    ({ prompt, deeds }: { prompt: string; deeds: string[] }) => {
      setStrangerRound({
        prompt,
        deeds: deeds.map((d, i) => ({ id: `deed-${i}`, content: d })),
        viewerChoice: null,
        ambientVoices: {},
      });
      setComposing(null);
    },
    [],
  );

  // The viewer's voice — tapping their current choice takes it back.
  const onStrangerChoose = useCallback((deedId: string) => {
    setStrangerRound((prev) =>
      prev
        ? { ...prev, viewerChoice: prev.viewerChoice === deedId ? null : deedId }
        : prev,
    );
  }, []);

  const strangerVoices = useCallback(
    (r: DemoStrangerRound, deedId: string) =>
      (r.ambientVoices[deedId] ?? 0) + (r.viewerChoice === deedId ? 1 : 0),
    [],
  );

  // The Director lets it be done: the record line prints, and the chosen
  // deed writes itself in the Stranger's moon-silver ink.
  const onStrangerResolve = useCallback(() => {
    if (!strangerRound || strangerRound.deeds.length === 0) return;
    const winner = [...strangerRound.deeds].sort(
      (a, b) => strangerVoices(strangerRound, b.id) - strangerVoices(strangerRound, a.id),
    )[0];
    const voicesFor = strangerVoices(strangerRound, winner.id);
    const voicesOthers = strangerRound.deeds
      .filter((d) => d.id !== winner.id)
      .reduce((sum, d) => sum + strangerVoices(strangerRound, d.id), 0);
    const recordId = `t-strec-${Date.now()}`;
    const deedTurnId = `t-deed-${Date.now()}`;
    setTurns((prev) => [
      ...prev,
      {
        id: recordId,
        sessionId: SESSION_ID,
        userId: GM_USER_ID,
        characterId: null,
        type: "ooc",
        content: composeStrangerLine(STRANGER_NAME, voicesFor, voicesOthers),
        metadata: JSON.stringify({ kind: "stranger-record", prompt: strangerRound.prompt }),
        sortOrder: prev.length,
        createdAt: new Date().toISOString(),
        user: { id: GM_USER_ID, displayName: "The Director", avatarUrl: null },
        characterName: null,
        characterPortrait: null,
      },
      {
        id: deedTurnId,
        sessionId: SESSION_ID,
        userId: GM_USER_ID,
        characterId: null,
        type: "narration",
        content: winner.content,
        metadata: JSON.stringify({ kind: "stranger", prompt: strangerRound.prompt }),
        sortOrder: prev.length + 1,
        createdAt: new Date().toISOString(),
        user: { id: GM_USER_ID, displayName: "The Director", avatarUrl: null },
        characterName: null,
        characterPortrait: null,
      },
    ]);
    // The record is print; the deed writes itself in.
    setReplayIds((prev) => new Set(prev).add(deedTurnId));
    setStrangerRound(null);
  }, [strangerRound, strangerVoices]);

  // The Director opens the floor: the question prints at the live edge.
  const onVoteCall = useCallback((prompt: string) => {
    setRound({
      prompt,
      submissions: [],
      votes: {},
      viewerLean: null,
      ambientLeans: {},
    });
    setComposing(null);
  }, []);

  const onSubmitLine = useCallback(
    (content: string) => {
      setRound((prev) =>
        prev
          ? {
              ...prev,
              submissions: [
                ...prev.submissions,
                { id: `s-${Date.now()}`, userId: role as string, content },
              ],
            }
          : prev,
      );
    },
    [role],
  );

  // A player's vote — tapping their current pick takes it back.
  const onVote = useCallback(
    (optionId: string) => {
      setRound((prev) => {
        if (!prev) return prev;
        const votes = { ...prev.votes };
        if (votes[role as string] === optionId) delete votes[role as string];
        else votes[role as string] = optionId;
        return { ...prev, votes };
      });
    },
    [role],
  );

  const onLean = useCallback((optionId: string) => {
    setRound((prev) =>
      prev
        ? { ...prev, viewerLean: prev.viewerLean === optionId ? null : optionId }
        : prev,
    );
  }, []);

  const leansFor = useCallback(
    (r: DemoRound, submissionId: string) =>
      (r.ambientLeans[submissionId] ?? 0) + (r.viewerLean === submissionId ? 1 : 0),
    [],
  );

  // The Director adds the winner: the block leaves the page, a record line
  // of set type prints, and the winning passage replays in its author's ink.
  const onVoteResolve = useCallback(() => {
    if (!round || round.submissions.length === 0) return;
    const tally = (id: string) =>
      Object.values(round.votes).filter((v) => v === id).length;
    const winner = [...round.submissions].sort(
      (a, b) =>
        tally(b.id) - tally(a.id) || leansFor(round, b.id) - leansFor(round, a.id),
    )[0];
    const winnerChar = CHARACTERS.find((c) => c.userId === winner.userId) ?? null;
    const first = winnerChar?.name.split(" ")[0] ?? "The table";
    const votesFor = tally(winner.id);
    const votesOthers = Object.keys(round.votes).length - votesFor;
    const winnerLeans = leansFor(round, winner.id);
    const otherLeans = round.submissions
      .filter((s) => s.id !== winner.id)
      .reduce((sum, s) => sum + leansFor(round, s.id), 0);

    const recordId = `t-vote-${Date.now()}`;
    const passageId = `t-won-${Date.now()}`;
    setTurns((prev) => [
      ...prev,
      {
        id: recordId,
        sessionId: SESSION_ID,
        userId: GM_USER_ID,
        characterId: null,
        type: "ooc",
        content: composeVoteLine(first, votesFor, votesOthers, winnerLeans, otherLeans),
        metadata: JSON.stringify({ kind: "vote-record", prompt: round.prompt }),
        sortOrder: prev.length,
        createdAt: new Date().toISOString(),
        user: { id: GM_USER_ID, displayName: "The Director", avatarUrl: null },
        characterName: null,
        characterPortrait: null,
      },
      {
        id: passageId,
        sessionId: SESSION_ID,
        userId: winner.userId,
        characterId: winnerChar?.id ?? null,
        type: "action",
        content: winner.content,
        metadata: null,
        sortOrder: prev.length + 1,
        createdAt: new Date().toISOString(),
        user: {
          id: winner.userId,
          displayName: winnerChar?.user?.displayName ?? null,
          avatarUrl: null,
        },
        characterName: winnerChar?.name ?? null,
        characterPortrait: null,
      },
    ]);
    // The record is print, not ink — it lands set. The passage replays.
    setReplayIds((prev) => new Set(prev).add(passageId));
    setRound(null);
    setActivePlayerId(null);
  }, [round, leansFor]);

  // Whose pen is it, and what does this chair see at the end of the page?
  const writerUserId = activePlayerId ?? GM_USER_ID;
  const iAmWriting =
    (role === "gm" && writerUserId === GM_USER_ID) || role === writerUserId;
  const writerChar = CHARACTERS.find((c) => c.userId === writerUserId) ?? null;
  const writerName =
    writerUserId === GM_USER_ID ? "the Director" : writerChar?.name.split(" ")[0] ?? "…";
  const writerInk = inkFor(writerUserId, GM_USER_ID, ACTIVE_USER_IDS);
  const myChar = CHARACTERS.find((c) => c.userId === role) ?? null;

  // What this chair may do at a live vote.
  const isPlayer = myChar !== null;
  const strangerDeeds: StrangerDeed[] = strangerRound
    ? strangerRound.deeds.map((d) => ({
        id: d.id,
        content: d.content,
        voiceCount: strangerVoices(strangerRound, d.id),
        isMyChoice: role === "viewer" && strangerRound.viewerChoice === d.id,
      }))
    : [];
  const strangerVoiceTotal = strangerRound
    ? strangerRound.deeds.reduce((s, d) => s + strangerVoices(strangerRound, d.id), 0)
    : 0;
  const voteOptions: VoteOption[] = round
    ? round.submissions.map((s) => {
        const author = CHARACTERS.find((c) => c.userId === s.userId) ?? null;
        return {
          id: s.id,
          authorName: author?.name.split(" ")[0] ?? "?",
          ink: getPlayerInk(s.userId, ACTIVE_USER_IDS),
          content: s.content,
          voteCount: Object.values(round.votes).filter((v) => v === s.id).length,
          leanCount: leansFor(round, s.id),
          isMyVote: round.votes[role as string] === s.id,
          isMyLean: role === "viewer" && round.viewerLean === s.id,
          isMine: s.userId === role,
        };
      })
    : [];

  return (
    <>
      <PageRoom
        leaveHref="/"
        houseCount={12}
        header={
          <>
            <h1 className="font-display text-[21px] font-semibold tracking-tight text-paper">
              The Shattered City
            </h1>
            <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-text-ghost">
              session ii — live<span className="text-amber/80"> · 12 watching</span>
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
              {writerUserId === GM_USER_ID && <PenMark ink="var(--ink-gm)" />}
              ✦ the Director{role === "gm" ? " · you" : ""}
            </span>
            {CHARACTERS.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-baseline gap-1 font-medium not-italic"
                style={{ color: getPlayerInk(c.userId, ACTIVE_USER_IDS) }}
              >
                · {writerUserId === c.userId && (
                  <PenMark ink={getPlayerInk(c.userId, ACTIVE_USER_IDS)} />
                )}
                {c.name.split(" ")[0]}
                {role === c.userId ? " · you" : ""}
              </span>
            ))}
            <span
              className="font-medium not-italic"
              style={{ color: "var(--ink-strange)" }}
              title="A chair left for the dark — the audience plays this character"
            >
              · ☾ {STRANGER_NAME}
            </span>
            <span>· 12 watching from the dark</span>
            {role === "viewer" && (
              <button
                type="button"
                onClick={() => setGoldTarget({ turnId: null })}
                className="cursor-pointer text-amber/80 transition-colors hover:text-amber"
                title="Leave gold for the table — it becomes light"
              >
                · leave gold ✦
              </button>
            )}
          </div>
        }
        overlays={
          <>
            <GoldLight flareCount={flareCount} />
            {goldTarget && (
              <GoldSlip
                line={gildLine}
                balance={demoBalance}
                onSend={onSendGold}
                onClose={() => setGoldTarget(null)}
              />
            )}
          </>
        }
      >
        <p className="mb-8 font-reading text-[15px] italic leading-[1.85] text-text-secondary">
          {OPENING_NARRATION}
        </p>

        <StoryProse
          turns={turns}
          characters={CHARACTERS}
          gmUserId={GM_USER_ID}
          replayIds={replayIds}
          onReplayDone={onReplayDone}
          gildedTurnIds={gildedTurnIds}
          onGild={
            role === "viewer" ? (turnId) => setGoldTarget({ turnId }) : undefined
          }
          strangerName={STRANGER_NAME}
        />

        <div className="mt-2 border-t border-dashed border-border/40 pt-5">
          {pendingRoll ? (
            <DiceSlip
              key={pendingRoll.turn.id}
              meta={pendingRoll.meta}
              characters={CHARACTERS}
              allPlayerUserIds={ACTIVE_USER_IDS}
              canRoll={role === pendingRoll.meta.targetUserId}
              onRoll={executeRoll}
              onSettled={onRollSettled}
              onCallOff={role === "gm" ? onRollCallOff : undefined}
            />
          ) : round ? (
            <VoteBlock
              prompt={round.prompt}
              options={voteOptions}
              canSubmit={isPlayer && !round.submissions.some((s) => s.userId === role)}
              myName={myChar?.name.split(" ")[0] ?? null}
              myInk={isPlayer ? getPlayerInk(role as string, ACTIVE_USER_IDS) : ""}
              canVote={isPlayer && round.submissions.length > 0}
              canLean={role === "viewer" && round.submissions.length > 0}
              canResolve={role === "gm"}
              resolveReady={
                round.submissions.length > 0 && Object.keys(round.votes).length > 0
              }
              onSubmit={onSubmitLine}
              onVote={onVote}
              onLean={onLean}
              onResolve={onVoteResolve}
              onCallOff={() => setRound(null)}
            />
          ) : strangerRound ? (
            <StrangerBlock
              name={STRANGER_NAME}
              prompt={strangerRound.prompt}
              deeds={strangerDeeds}
              canChoose={role === "viewer"}
              canResolve={role === "gm"}
              resolveReady={strangerVoiceTotal > 0}
              onChoose={onStrangerChoose}
              onResolve={onStrangerResolve}
              onCallOff={() => setStrangerRound(null)}
            />
          ) : composing === "roll" && role === "gm" ? (
            <RollCall
              characters={CHARACTERS}
              allPlayerUserIds={ACTIVE_USER_IDS}
              onCommit={onRollCall}
              onCancel={() => setComposing(null)}
            />
          ) : composing === "vote" && role === "gm" ? (
            <VoteCall onCommit={onVoteCall} onCancel={() => setComposing(null)} />
          ) : composing === "stranger" && role === "gm" ? (
            <StrangerCall
              name={STRANGER_NAME}
              onCommit={onStrangerCall}
              onCancel={() => setComposing(null)}
            />
          ) : iAmWriting ? (
            <Quill
              isGM={role === "gm"}
              myCharName={myChar?.name.split(" ")[0] ?? null}
              ink={writerInk}
              characters={CHARACTERS}
              onCommit={commit}
              moves={role === "gm" ? DIRECTOR_MOVES : undefined}
              onMove={(key) =>
                (key === "roll" || key === "vote" || key === "stranger") &&
                setComposing(key)
              }
              strangerName={role === "gm" ? STRANGER_NAME : null}
            />
          ) : (
            <WaitingLine name={writerName} ink={writerInk} />
          )}
        </div>
        <div ref={endRef} />
      </PageRoom>

      {/* Demo chrome — not part of the surface. */}
      <div className="fixed right-4 top-4 z-[90] flex items-center gap-1 rounded-full border border-border bg-void/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] backdrop-blur-md">
        <span className="px-1 text-text-ghost">view as</span>
        {ROLE_LABELS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => {
              setRole(r.key);
              setComposing(null);
            }}
            className={`cursor-pointer rounded-full px-2 py-1 transition-colors ${
              role === r.key
                ? "bg-amber/20 text-amber"
                : "text-text-tertiary hover:text-paper"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </>
  );
}
