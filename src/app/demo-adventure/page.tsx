"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ManuscriptRoom from "@/components/campaign/manuscript/ManuscriptRoom";
import ManuscriptPage from "@/components/campaign/manuscript/ManuscriptPage";
import InlineQuill from "@/components/campaign/manuscript/InlineQuill";
import WaitingLine from "@/components/campaign/manuscript/WaitingLine";
import TableSeats from "@/components/campaign/manuscript/TableSeats";
import CandleTimer from "@/components/campaign/manuscript/CandleTimer";
import QuillStation from "@/components/campaign/manuscript/QuillStation";
import TableTalkDrawer from "@/components/campaign/manuscript/TableTalkDrawer";
import PartyLedger from "@/components/campaign/manuscript/PartyLedger";
import { CoachSlip, useCoachSlip } from "@/components/campaign/manuscript/CoachSlips";
import StakesTracker from "@/components/campaign/StakesTracker";
import DiceRoller from "@/components/campaign/DiceRoller";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTurnTimer } from "@/hooks/use-turn-timer";
import { isLogTurnType } from "@/lib/campaign-turns";
import { getSessionInteractionState } from "@/lib/campaign-interaction-state";
import { resolveQuillState } from "@/lib/manuscript-quill-state";
import {
  derivePendingRollRequest,
  deriveExtensionTurns,
  deriveSpotlightQueue,
} from "@/lib/campaign-play-derive";
import PageFork from "@/components/campaign/manuscript/PageFork";
import TableWhispers from "@/components/campaign/manuscript/TableWhispers";
import {
  getPlayerInk,
  parseStats,
  type CharacterMark,
  type FloorRound,
  type FloorSubmission,
  type Turn,
} from "@/types/campaign";
import {
  ACTIVE_PLAYER_USER_IDS,
  CHARACTERS,
  GM_TURN_BASE,
  GM_USER_ID,
  INITIAL_TURNS,
  OPENING_NARRATION,
  SESSION_ID,
  STORY_ID,
  VIEW_AS_OPTIONS,
  viewAsToUserId,
  type ViewAs,
} from "./fixtures";

/**
 * Manuscript harness — the blank-page rebuild grows here before the live
 * pages cut over. Fixture-only; the legacy demo at /demo-adventure keeps the
 * old shell until step 11 re-points it.
 */
// Extra fixture beats so every margin annotation kind is exercised here:
// a scene-break (clock anchor), a mark-eligible roll for Lyra (stamp +
// prompt), and an open bargain for Kaelen.
const HARNESS_EXTRA_TURNS: Turn[] = [
  {
    ...GM_TURN_BASE,
    id: "hx-scene",
    sessionId: SESSION_ID,
    type: "scene-break",
    content: "",
    metadata: JSON.stringify({ title: "The Altar Wakes", mood: "ominous" }),
    sortOrder: 4,
    createdAt: "2026-05-15T20:04:00Z",
  },
  {
    ...GM_TURN_BASE,
    id: "hx-narration",
    sessionId: SESSION_ID,
    type: "narration",
    content:
      "The runes flare white-hot under Lyra's fingers. Something beneath the altar draws its first breath in three hundred years.",
    metadata: null,
    sortOrder: 5,
    createdAt: "2026-05-15T20:04:30Z",
  },
  {
    id: "hx-roll",
    sessionId: SESSION_ID,
    userId: "user-lyra",
    characterId: "char-lyra",
    type: "roll",
    content: "Lyra rolled Keen — partial.",
    metadata: JSON.stringify({
      total: 8,
      modifier: 2,
      attribute: "Keen",
      tier: "partial",
      die: "2d6",
      dice: [3, 3],
      fatal: false,
      markEligible: true,
      aspectSaved: false,
    }),
    sortOrder: 6,
    createdAt: "2026-05-15T20:05:00Z",
    user: { id: "user-lyra", displayName: "Sarah", avatarUrl: null },
    characterName: "Lyra",
    characterPortrait: null,
  },
  {
    ...GM_TURN_BASE,
    id: "hx-bargain",
    sessionId: SESSION_ID,
    type: "consequence",
    content:
      "The altar offers Kaelen a way through — but old magic never gives without taking.",
    metadata: JSON.stringify({
      kind: "bargain",
      targetUserId: "user-kaelen",
      targetLabel: "Kaelen",
      gain: "The seal breaks quietly",
      price: "The blade remembers your name",
      status: "open",
    }),
    sortOrder: 7,
    createdAt: "2026-05-15T20:05:30Z",
  },
];

const HARNESS_TURNS = [...INITIAL_TURNS, ...HARNESS_EXTRA_TURNS];

export default function ManuscriptHarnessPage() {
  const [viewAs, setViewAs] = useState<ViewAs>("gm");
  const [turns, setTurns] = useState<Turn[]>(HARNESS_TURNS);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [clocks, setClocks] = useState<ProgressClockData[]>([
    { id: "clock-garrison", name: "The garrison wakes", segments: 6, filled: 2, type: "danger" },
  ]);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const nextSortRef = useRef(HARNESS_TURNS.length + 10);

  const currentUserId = viewAsToUserId(viewAs);
  const isGM = viewAs === "gm";
  const spectator = viewAs === "spectator";

  // Marks created in the harness live in state, merged onto the fixture cast.
  const [marksByCharacter, setMarksByCharacter] = useState<Record<string, CharacterMark[]>>({});
  const characters = useMemo(
    () => CHARACTERS.map((c) => ({ ...c, marks: marksByCharacter[c.id] ?? [] })),
    [marksByCharacter],
  );
  const myCharacter = characters.find((c) => c.userId === currentUserId) ?? null;

  const storyTurns = useMemo(() => turns.filter((t) => !isLogTurnType(t.type)), [turns]);
  const logTurns = useMemo(() => turns.filter((t) => isLogTurnType(t.type)), [turns]);

  const appendTurn = useCallback(
    (partial: Pick<Turn, "type" | "content"> & Partial<Turn>) => {
      nextSortRef.current += 1;
      const sortOrder = nextSortRef.current;
      setTurns((prev) => [
        ...prev,
        {
          id: `local-${sortOrder}`,
          sessionId: SESSION_ID,
          metadata: null,
          sortOrder,
          createdAt: new Date().toISOString(),
          ...GM_TURN_BASE,
          ...partial,
        } as Turn,
      ]);
    },
    [],
  );

  const handleCommitDraft = useCallback(
    (content: string, type: string, metadata?: string) => {
      appendTurn({
        type: type as Turn["type"],
        content,
        metadata: metadata ?? null,
        ...(myCharacter
          ? {
              userId: myCharacter.userId,
              characterId: myCharacter.id,
              user: myCharacter.user ?? { id: myCharacter.userId, displayName: null, avatarUrl: null },
              characterName: myCharacter.name.split(" ")[0],
              characterPortrait: null,
            }
          : {}),
      });
      // Server behavior: the pen returns to the Director after a story turn.
      if (!isGM) setActivePlayerId(null);
    },
    [appendTurn, myCharacter, isGM],
  );

  const handleEditTurn = (turnId: string, newContent: string) => {
    setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, content: newContent } : t)));
  };

  // ── Dice (fixture "server": local 2d6, same metadata shape) ──
  const pendingRollRequest = useMemo(
    () => derivePendingRollRequest(turns, currentUserId, isGM, myCharacter?.status ?? null),
    [turns, currentUserId, isGM, myCharacter?.status],
  );

  const handleRollSubmit = useCallback(
    async (intent: { attribute: string; aspectInvoked: boolean }) => {
      const dice: [number, number] = [
        1 + Math.floor(Math.random() * 6),
        1 + Math.floor(Math.random() * 6),
      ];
      const stats = myCharacter ? parseStats(myCharacter.stats) : null;
      const modifier =
        (stats?.approaches[intent.attribute as keyof typeof stats.approaches] ?? 0) +
        (intent.aspectInvoked ? 1 : 0);
      const total = dice[0] + dice[1] + modifier;
      const tier: "success" | "partial" | "failure" =
        total >= 10 ? "success" : total >= 7 ? "partial" : "failure";
      appendTurn({
        type: "roll",
        content: `${myCharacter?.name.split(" ")[0] ?? "Someone"} rolled ${intent.attribute} — ${tier}.`,
        metadata: JSON.stringify({
          total,
          modifier,
          attribute: intent.attribute,
          tier,
          die: "2d6",
          dice,
          fatal: pendingRollRequest?.fatal ?? false,
          markEligible: tier !== "success",
          aspectSaved: false,
          rollRequestTurnId: pendingRollRequest?.turnId,
        }),
        ...(myCharacter
          ? {
              userId: myCharacter.userId,
              characterId: myCharacter.id,
              user: myCharacter.user ?? { id: myCharacter.userId, displayName: null, avatarUrl: null },
              characterName: myCharacter.name.split(" ")[0],
            }
          : {}),
      });
      return { dice, modifier, total, tier };
    },
    [appendTurn, myCharacter, pendingRollRequest],
  );

  // ── Margin actions (fixture-backed) ────────────────────────
  const handleUpdateRollRequest = useCallback((turnId: string, status: "closed" | "cancelled") => {
    setTurns((prev) =>
      prev.map((t) => {
        if (t.id !== turnId || !t.metadata) return t;
        try {
          return { ...t, metadata: JSON.stringify({ ...JSON.parse(t.metadata), status }) };
        } catch {
          return t;
        }
      }),
    );
  }, []);

  const handleResolveBargain = useCallback(
    (turnId: string, response: "accepted" | "refused") => {
      setTurns((prev) =>
        prev.map((t) => {
          if (t.id !== turnId || !t.metadata) return t;
          try {
            return {
              ...t,
              metadata: JSON.stringify({
                ...JSON.parse(t.metadata),
                status: response,
                responseUserId: currentUserId,
                responseLabel: myCharacter?.name.split(" ")[0],
                markEligible: response === "accepted",
              }),
            };
          } catch {
            return t;
          }
        }),
      );
    },
    [currentUserId, myCharacter],
  );

  const handleCreateMark = useCallback(
    async (characterId: string, input: { kind: CharacterMark["kind"]; text: string; sourceTurnId?: string }) => {
      setMarksByCharacter((prev) => ({
        ...prev,
        [characterId]: [
          ...(prev[characterId] ?? []),
          {
            id: `mark-${Date.now()}`,
            characterId,
            storyId: STORY_ID,
            sessionId: SESSION_ID,
            sourceTurnId: input.sourceTurnId ?? null,
            kind: input.kind,
            text: input.text,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    },
    [],
  );

  const handleToggleClockSegment = useCallback((clockId: string, segmentIndex: number) => {
    setClocks((prev) =>
      prev.map((c) =>
        c.id === clockId
          ? { ...c, filled: segmentIndex < c.filled ? segmentIndex : segmentIndex + 1 }
          : c,
      ),
    );
  }, []);

  // ── Hand-raise (ooc turns with spotlight metadata, like the live page) ──
  const spotlightQueue = useMemo(
    () => deriveSpotlightQueue(turns, characters, GM_USER_ID, activePlayerId),
    [turns, characters, activePlayerId],
  );
  const myHandRaised = !!currentUserId && spotlightQueue.some((b) => b.userId === currentUserId);

  const sendSpotlightBid = useCallback(
    (cancel: boolean) => {
      if (!myCharacter) return;
      appendTurn({
        type: "ooc",
        content: cancel ? "lowers their hand." : "reaches for the page.",
        metadata: JSON.stringify(cancel ? { spotlightCancel: true } : { spotlightRequest: true }),
        userId: myCharacter.userId,
        characterId: myCharacter.id,
        user: myCharacter.user ?? { id: myCharacter.userId, displayName: null, avatarUrl: null },
        characterName: myCharacter.name.split(" ")[0],
      });
    },
    [appendTurn, myCharacter],
  );

  // ── The candle — ONE timer mount per client, at page level ──
  const penWithPlayer =
    !!activePlayerId && characters.some((c) => c.userId === activePlayerId && c.status === "active");
  const extensionTurns = useMemo(() => deriveExtensionTurns(logTurns), [logTurns]);
  const {
    progress,
    timeStr,
    urgency,
    extendLocally,
    showExtendButton,
  } = useTurnTimer({
    activePlayerId,
    isPlayerTurn: penWithPlayer,
    isActive: true,
    isGM,
    currentUserId,
    extensionTurns,
    onTurnExpired: () => setActivePlayerId(null),
  });

  const handleFeedTheFlame = useCallback(() => {
    extendLocally();
    appendTurn({
      type: "ooc",
      content: "feeds the flame — three more minutes.",
      metadata: JSON.stringify({ timerExtension: 180 }),
      ...(myCharacter
        ? {
            userId: myCharacter.userId,
            characterId: myCharacter.id,
            user: myCharacter.user ?? { id: myCharacter.userId, displayName: null, avatarUrl: null },
            characterName: myCharacter.name.split(" ")[0],
          }
        : {}),
    });
  }, [extendLocally, appendTurn, myCharacter]);

  // ── Crossroads (fixture lifecycle mirroring the server) ────
  const [floorRound, setFloorRound] = useState<FloorRound | null>(null);
  const [reactionFloats, setReactionFloats] = useState<Array<{ id: string; type: string }>>([]);

  const handleOpenCrossroads = useCallback((prompt: string, audiencePulseEnabled: boolean) => {
    setFloorRound({
      id: `fr-${Date.now()}`,
      sessionId: SESSION_ID,
      openedBy: GM_USER_ID,
      prompt,
      mode: "vote",
      status: "open",
      audiencePulseEnabled,
      selectedSubmissionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submissions: [],
      myVoteSubmissionId: null,
      voteCount: 0,
      eligibleVoterCount: CHARACTERS.length,
      allEligibleVotersVoted: false,
      isVoteEligible: true,
      audiencePulseCount: 0,
      myAudiencePulseSubmissionId: null,
    });
  }, []);

  const handleSubmitFloorResponse = useCallback(
    async (_roundId: string, body: { characterId: string; type: string; content: string }) => {
      const character = CHARACTERS.find((c) => c.id === body.characterId);
      setFloorRound((prev) => {
        if (!prev) return prev;
        const submission: FloorSubmission = {
          id: `sub-${Date.now()}`,
          roundId: prev.id,
          userId: character?.userId ?? null,
          characterId: body.characterId,
          type: body.type as Turn["type"],
          content: body.content,
          source: "player",
          sourceLabel: null,
          audienceSparkId: null,
          status: "submitted",
          createdAt: new Date().toISOString(),
          characterName: character?.name.split(" ")[0] ?? null,
          user: character?.user ?? { id: null, displayName: null, avatarUrl: null },
          voteCount: 0,
          audiencePulseCount: 0,
          isMine: character?.userId === currentUserId,
        };
        return { ...prev, submissions: [...prev.submissions, submission] };
      });
    },
    [currentUserId],
  );

  const handleVoteFloorSubmission = useCallback(async (_roundId: string, submissionId: string) => {
    setFloorRound((prev) => {
      if (!prev) return prev;
      const previousVote = prev.myVoteSubmissionId;
      if (previousVote === submissionId) return prev;
      return {
        ...prev,
        myVoteSubmissionId: submissionId,
        voteCount: previousVote ? prev.voteCount : prev.voteCount + 1,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId
            ? { ...s, voteCount: s.voteCount + 1 }
            : s.id === previousVote
              ? { ...s, voteCount: Math.max(0, s.voteCount - 1) }
              : s,
        ),
      };
    });
  }, []);

  const handleUpdateFloorRound = useCallback(
    async (
      _roundId: string,
      body: { status: "voting" | "closed" | "resolved" | "cancelled"; selectedSubmissionId?: string },
    ) => {
      if (body.status === "cancelled") {
        setFloorRound(null);
        return;
      }
      if (body.status === "resolved") {
        const winner = floorRound?.submissions.find((s) => s.id === body.selectedSubmissionId);
        if (winner) {
          const character = CHARACTERS.find((c) => c.id === winner.characterId);
          appendTurn({
            type: winner.type,
            content: winner.content,
            ...(character
              ? {
                  userId: character.userId,
                  characterId: character.id,
                  user: character.user ?? { id: character.userId, displayName: null, avatarUrl: null },
                  characterName: character.name.split(" ")[0],
                }
              : {}),
          });
        }
        setFloorRound(null);
        return;
      }
      setFloorRound((prev) => (prev ? { ...prev, status: body.status } : prev));
    },
    [floorRound, appendTurn],
  );

  const handleReaction = useCallback((type: string) => {
    setReactionFloats((prev) => [...prev.slice(-30), { id: `r-${Date.now()}-${prev.length}`, type }]);
  }, []);

  // ── The Director's moves (fixture-backed sendTurn equivalents) ──
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const charactersWithStatus = useMemo(
    () => characters.map((c) => ({ ...c, status: statuses[c.id] ?? c.status })),
    [characters, statuses],
  );
  const playerCoach = useCoachSlip("player");
  const gmCoach = useCoachSlip("gm");

  const handleRequestRoll = useCallback(
    (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => {
      const required =
        targetUserId === "everyone"
          ? charactersWithStatus.filter((c) => c.status === "active").map((c) => c.userId)
          : [targetUserId];
      appendTurn({
        type: "roll-request",
        content: `The Director calls for a ${attribute.toUpperCase()} check — ${reason}`,
        metadata: JSON.stringify({
          targetUserId,
          attribute,
          reason,
          onSuccess,
          onFailure,
          fatal: fatal === true,
          status: "open",
          requiredUserIds: required,
        }),
      });
    },
    [appendTurn, charactersWithStatus],
  );

  const handleSceneBreak = useCallback(
    (title: string, mood: string, aspects?: string[]) => {
      appendTurn({
        type: "scene-break",
        content: "",
        metadata: JSON.stringify({ title: title || undefined, mood, aspects }),
      });
    },
    [appendTurn],
  );

  const handleStoryMoment = useCallback(
    (text: string, mood: string, subtext?: string, options?: { importance?: "normal" | "major"; leavesMark?: boolean }) => {
      appendTurn({
        type: "story-moment",
        content: text,
        metadata: JSON.stringify({
          mood,
          subtext,
          importance: options?.importance ?? "normal",
          markEligible: options?.leavesMark || undefined,
        }),
      });
    },
    [appendTurn],
  );

  const handleAddIllustration = useCallback(
    (imageUrl: string, caption?: string) => {
      appendTurn({ type: "illustration", content: caption ?? "", metadata: JSON.stringify({ imageUrl, caption }) });
    },
    [appendTurn],
  );

  const handleOfferBargain = useCallback(
    (body: { targetUserId: string; targetLabel: string; gain: string; price: string }) => {
      appendTurn({
        type: "consequence",
        content: `The Director offers ${body.targetLabel} a bargain.`,
        metadata: JSON.stringify({ kind: "bargain", ...body, status: "open" }),
      });
    },
    [appendTurn],
  );

  const handleSendChat = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      appendTurn({
        type: "ooc",
        content: message.trim(),
        ...(myCharacter
          ? {
              userId: myCharacter.userId,
              characterId: myCharacter.id,
              user: myCharacter.user ?? { id: myCharacter.userId, displayName: null, avatarUrl: null },
              characterName: myCharacter.name.split(" ")[0],
            }
          : {}),
      });
      setChatInput("");
    },
    [appendTurn, myCharacter],
  );

  // ── End-of-page state (the ActionDock replacement) ─────────
  const interaction = getSessionInteractionState({
    sessionStatus: "active",
    activePlayerId,
    currentUserId,
    isGM,
    myCharacterStatus: myCharacter?.status ?? null,
    floorRound,
  });
  const directorWriting =
    !activePlayerId || !CHARACTERS.some((c) => c.userId === activePlayerId && c.status === "active");
  const quillState = spectator
    ? ({ kind: "none" } as const)
    : resolveQuillState({
        mode: interaction.mode,
        isGM,
        myCharacterStatus: myCharacter?.status ?? null,
        hasPendingRollRequest: !!pendingRollRequest,
        lastWordsSent: false,
        directorWriting,
      });

  const penHolder = CHARACTERS.find((c) => c.userId === activePlayerId);
  const inkColor = isGM
    ? "var(--ink-gm)"
    : currentUserId
      ? getPlayerInk(currentUserId, ACTIVE_PLAYER_USER_IDS)
      : "var(--ink-faded)";

  const endOfPage =
    quillState.kind === "quill" ? (
      <InlineQuill
        sessionId={`${SESSION_ID}-${viewAs}`}
        isGM={quillState.gm}
        myCharName={myCharacter ? myCharacter.name.split(" ")[0] : null}
        inkColor={inkColor}
        onCommitDraft={handleCommitDraft}
      />
    ) : quillState.kind === "last-words" ? (
      <InlineQuill
        sessionId={`${SESSION_ID}-${viewAs}`}
        isGM={false}
        myCharName={myCharacter ? myCharacter.name.split(" ")[0] : null}
        inkColor={inkColor}
        lastWords
        onCommitDraft={handleCommitDraft}
      />
    ) : quillState.kind === "waiting" ? (
      <WaitingLine
        penHolderName={penHolder ? penHolder.name.split(" ")[0] : null}
        directorWriting={quillState.directorWriting}
        onReaction={handleReaction}
        showHandRaise
        myHandRaised={myHandRaised}
        onRaiseHand={() => sendSpotlightBid(false)}
        onLowerHand={() => sendSpotlightBid(true)}
      />
    ) : quillState.kind === "roll-pending" ? (
      <WaitingLine
        rollPending
        rollAttribute={pendingRollRequest?.attribute ?? null}
        rollReason={pendingRollRequest?.reason ?? null}
        rollFatal={pendingRollRequest?.fatal ?? false}
        onOpenDiceRoller={() => setShowDiceRoller(true)}
      />
    ) : quillState.kind === "fork" && floorRound ? (
      <PageFork
        floorRound={floorRound}
        isGM={isGM}
        myCharacter={myCharacter}
        playerUserIds={ACTIVE_PLAYER_USER_IDS}
        onSubmitResponse={handleSubmitFloorResponse}
        onVoteSubmission={handleVoteFloorSubmission}
        onUpdateRound={handleUpdateFloorRound}
      />
    ) : quillState.kind === "gone" ? (
      <WaitingLine goneNotice={quillState.dead ? "dead" : "retired"} />
    ) : null;

  const candle = (
    <CandleTimer
      progress={progress}
      timeStr={timeStr}
      urgency={urgency}
      burning={penWithPlayer}
      showExtend={showExtendButton}
      onExtend={handleFeedTheFlame}
      compact={!isDesktop}
    />
  );

  const seats = (
    <TableSeats
      layout={isDesktop ? "rim" : "strip"}
      characters={charactersWithStatus}
      ownerId={GM_USER_ID}
      activePlayerId={activePlayerId}
      currentUserId={currentUserId}
      isGM={isGM}
      canPassSpotlight={isGM}
      onPassTurn={(userId) => setActivePlayerId(userId)}
      spotlightQueue={spotlightQueue}
      strip={!isDesktop ? { candle, leaveHref: "/" } : undefined}
    />
  );

  const station = isGM ? (
    <QuillStation
      isDesktop={isDesktop}
      activeChars={charactersWithStatus.filter((c) => c.status === "active")}
      clocks={clocks}
      onClocksChange={setClocks}
      onRequestRoll={handleRequestRoll}
      onPushEvent={(content) => appendTurn({ type: "narration", content })}
      onSceneBreak={handleSceneBreak}
      onStoryMoment={handleStoryMoment}
      onAddIllustration={handleAddIllustration}
      onOfferBargain={handleOfferBargain}
      floorRound={floorRound}
      onOpenCrossroads={handleOpenCrossroads}
      onUpdateFloorRound={handleUpdateFloorRound}
      ledger={
        <div className="space-y-4">
          <PartyLedger
            characters={charactersWithStatus}
            activePlayerId={activePlayerId}
            onChangeCharacterStatus={(characterId, status) =>
              setStatuses((prev) => ({ ...prev, [characterId]: status }))
            }
            currentUserId={currentUserId}
            onCreateMark={handleCreateMark}
          />
          <StakesTracker clocks={clocks} onClocksChange={setClocks} />
        </div>
      }
      onEndSession={() => {}}
      coachSlip={
        <CoachSlip show={gmCoach.show} onDismiss={gmCoach.dismiss} title="Your moves live here.">
          Pass the pen from a seat to hand a player the next paragraph; everything you do writes
          itself into the margin.
        </CoachSlip>
      }
    />
  ) : undefined;

  return (
    <ManuscriptRoom
      leaveHref="/"
      isDesktop={isDesktop}
      seats={seats}
      candle={isDesktop ? candle : undefined}
      station={station}
      whispers={<TableWhispers houseCount={7} reactionFloats={reactionFloats} />}
      page={
        <ManuscriptPage
          sessionId={SESSION_ID}
          storyId={STORY_ID}
          storyTurns={storyTurns}
          logTurns={logTurns}
          characters={charactersWithStatus}
          activePlayerId={activePlayerId}
          currentUserId={currentUserId}
          isGM={isGM}
          sessionTitle="The Obsidian Crown"
          sessionStatus="active"
          sessionOpening={OPENING_NARRATION}
          storyTitle="The Shattered City"
          onEditTurn={handleEditTurn}
          onResolveBargain={handleResolveBargain}
          spectatorMode={spectator}
          endOfPage={
            <>
              {!isGM && !spectator && myCharacter && (
                <CoachSlip
                  show={playerCoach.show}
                  onDismiss={playerCoach.dismiss}
                  title="You're at the table."
                >
                  You&rsquo;ll write when the pen reaches you. Until then, whisper a reaction or
                  reach for the page. When the dice call, your aspect can save a miss — once per
                  scene.
                </CoachSlip>
              )}
              {endOfPage}
            </>
          }
          margin={
            spectator
              ? undefined
              : {
                  isDesktop,
                  clocks,
                  myCharacter,
                  actions: {
                    onOpenDiceRoller: () => setShowDiceRoller(true),
                    onUpdateRollRequest: handleUpdateRollRequest,
                    onResolveBargain: handleResolveBargain,
                    onCreateMark: handleCreateMark,
                    onToggleClockSegment: isGM ? handleToggleClockSegment : undefined,
                  },
                }
          }
        />
      }
    >
      {/* Dice ritual — opens from the margin's cast seal or auto on request. */}
      {!spectator && (
        <DiceRoller
          visible={showDiceRoller || !!pendingRollRequest}
          onClose={() => setShowDiceRoller(false)}
          onRollSubmit={handleRollSubmit}
          characters={charactersWithStatus}
          currentUserId={currentUserId}
          aspectAvailable
          preSelectedAttribute={pendingRollRequest?.attribute ?? null}
          rollReason={pendingRollRequest?.reason ?? null}
          rollOnSuccess={pendingRollRequest?.onSuccess ?? null}
          rollOnFailure={pendingRollRequest?.onFailure ?? null}
          rollFatal={pendingRollRequest?.fatal ?? false}
          surface="page"
        />
      )}
      {/* Table talk — the voices under the table. */}
      <button
        type="button"
        onClick={() => setShowChat(true)}
        className="hand-note fixed bottom-5 left-4 z-30 cursor-pointer text-base opacity-60 transition-opacity hover:opacity-100"
      >
        under the table ☾
      </button>
      <TableTalkDrawer
        open={showChat}
        onClose={() => setShowChat(false)}
        turns={logTurns}
        currentUserId={currentUserId}
        sessionTitle="The Obsidian Crown"
        storyTitle="The Shattered City"
        chatInput={chatInput}
        setChatInput={setChatInput}
        onSendChat={handleSendChat}
        readOnly={spectator}
        isGM={isGM}
        onUpdateRollRequest={handleUpdateRollRequest}
      />

      {/* Harness controls — dev-only role + pen switches, not part of the design. */}
      <div className="absolute bottom-4 left-1/2 z-[70] flex -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-black/70 px-2 py-1 backdrop-blur-md">
        {VIEW_AS_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => setViewAs(option.key)}
            className={`cursor-pointer rounded-full px-3 py-1 text-[11px] uppercase tracking-wider transition-colors ${
              viewAs === option.key ? "bg-amber/20 text-amber" : "text-text-tertiary hover:text-paper"
            }`}
          >
            {option.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-text-ghost">pen:</span>
        {[null, ...CHARACTERS.map((c) => c.userId)].map((uid) => (
          <button
            key={uid ?? "gm"}
            onClick={() => setActivePlayerId(uid)}
            className={`cursor-pointer rounded-full px-2 py-1 text-[11px] transition-colors ${
              activePlayerId === uid ? "bg-amber/20 text-amber" : "text-text-tertiary hover:text-paper"
            }`}
          >
            {uid ? CHARACTERS.find((c) => c.userId === uid)?.name.split(" ")[0] : "GM"}
          </button>
        ))}
      </div>
    </ManuscriptRoom>
  );
}
