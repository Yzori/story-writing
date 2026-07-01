"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ManuscriptRoom from "@/components/campaign/manuscript/ManuscriptRoom";
import ManuscriptPage from "@/components/campaign/manuscript/ManuscriptPage";
import InlineQuill from "@/components/campaign/manuscript/InlineQuill";
import WaitingLine from "@/components/campaign/manuscript/WaitingLine";
import DiceRoller from "@/components/campaign/DiceRoller";
import type { ProgressClockData } from "@/components/campaign/ProgressClock";
import { useMediaQuery } from "@/hooks/use-media-query";
import { isLogTurnType } from "@/lib/campaign-turns";
import { getSessionInteractionState } from "@/lib/campaign-interaction-state";
import { resolveQuillState } from "@/lib/manuscript-quill-state";
import { derivePendingRollRequest } from "@/lib/campaign-play-derive";
import { getPlayerInk, parseStats, type CharacterMark, type Turn } from "@/types/campaign";
import {
  ACTIVE_PLAYER_USER_IDS,
  CHARACTERS,
  GM_TURN_BASE,
  INITIAL_TURNS,
  OPENING_NARRATION,
  SESSION_ID,
  STORY_ID,
  VIEW_AS_OPTIONS,
  viewAsToUserId,
  type ViewAs,
} from "../fixtures";

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

  // ── End-of-page state (the ActionDock replacement) ─────────
  const interaction = getSessionInteractionState({
    sessionStatus: "active",
    activePlayerId,
    currentUserId,
    isGM,
    myCharacterStatus: myCharacter?.status ?? null,
    floorRound: null,
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
        onReaction={() => {}}
        showHandRaise
        myHandRaised={false}
        onRaiseHand={() => {}}
        onLowerHand={() => {}}
      />
    ) : quillState.kind === "roll-pending" ? (
      <WaitingLine
        rollPending
        rollAttribute={pendingRollRequest?.attribute ?? null}
        rollReason={pendingRollRequest?.reason ?? null}
        rollFatal={pendingRollRequest?.fatal ?? false}
        onOpenDiceRoller={() => setShowDiceRoller(true)}
      />
    ) : quillState.kind === "gone" ? (
      <WaitingLine goneNotice={quillState.dead ? "dead" : "retired"} />
    ) : null;

  return (
    <ManuscriptRoom
      leaveHref="/demo-adventure"
      isDesktop={isDesktop}
      page={
        <ManuscriptPage
          sessionId={SESSION_ID}
          storyId={STORY_ID}
          storyTurns={storyTurns}
          logTurns={logTurns}
          characters={characters}
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
          endOfPage={endOfPage}
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
          characters={characters}
          currentUserId={currentUserId}
          aspectAvailable
          preSelectedAttribute={pendingRollRequest?.attribute ?? null}
          rollReason={pendingRollRequest?.reason ?? null}
          rollOnSuccess={pendingRollRequest?.onSuccess ?? null}
          rollOnFailure={pendingRollRequest?.onFailure ?? null}
          rollFatal={pendingRollRequest?.fatal ?? false}
        />
      )}
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
