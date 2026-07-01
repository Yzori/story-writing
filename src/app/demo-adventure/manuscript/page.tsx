"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ManuscriptRoom from "@/components/campaign/manuscript/ManuscriptRoom";
import ManuscriptPage from "@/components/campaign/manuscript/ManuscriptPage";
import InlineQuill from "@/components/campaign/manuscript/InlineQuill";
import WaitingLine from "@/components/campaign/manuscript/WaitingLine";
import { useMediaQuery } from "@/hooks/use-media-query";
import { isLogTurnType } from "@/lib/campaign-turns";
import { getSessionInteractionState } from "@/lib/campaign-interaction-state";
import { resolveQuillState } from "@/lib/manuscript-quill-state";
import { getPlayerInk, type Turn } from "@/types/campaign";
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
export default function ManuscriptHarnessPage() {
  const [viewAs, setViewAs] = useState<ViewAs>("gm");
  const [turns, setTurns] = useState<Turn[]>(INITIAL_TURNS);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const nextSortRef = useRef(INITIAL_TURNS.length);

  const currentUserId = viewAsToUserId(viewAs);
  const isGM = viewAs === "gm";
  const spectator = viewAs === "spectator";
  const myCharacter = CHARACTERS.find((c) => c.userId === currentUserId) ?? null;

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
        hasPendingRollRequest: false,
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
          characters={CHARACTERS}
          activePlayerId={activePlayerId}
          currentUserId={currentUserId}
          isGM={isGM}
          sessionTitle="The Obsidian Crown"
          sessionStatus="active"
          sessionOpening={OPENING_NARRATION}
          storyTitle="The Shattered City"
          onEditTurn={handleEditTurn}
          spectatorMode={spectator}
          endOfPage={endOfPage}
        />
      }
    >
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
