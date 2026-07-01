"use client";

import { useMemo } from "react";
import type {
  CampaignSession,
  PlayerCharacter,
  RollRequest,
  FloorRound,
  Turn,
} from "@/types/campaign";
import { isLogTurnType, isStoryTurnType } from "@/lib/campaign-turns";
import {
  deriveActingGmPlayers,
  deriveAspectAvailable,
  deriveCurrentScene,
  deriveExtensionTurns,
  derivePendingRollRequest,
  derivePhase,
  deriveSpotlightQueue,
  type ActingGmPlayer,
  type CurrentScene,
  type PhaseState,
  type SpotlightBid,
} from "@/lib/campaign-play-derive";

interface UsePlayDerivedInput {
  turns: Turn[];
  characters: PlayerCharacter[];
  ownerId: string | null;
  campaignSession: CampaignSession | null;
  floorRound: FloorRound | null;
  currentUserId: string | null;
  isGM: boolean;
  myCharacter: PlayerCharacter | null | undefined;
  tableReactions: Array<{ id: string; userId: string | null; type: string }>;
}

export interface PlayDerivedState {
  /** Meta/mechanical turns for the left pillar (chat, dice, roll requests). */
  logTurns: Turn[];
  /** Narrative turns for the center stage. */
  storyTurns: Turn[];
  /** OOC turns carrying {timerExtension} metadata — feed to useTurnTimer. */
  extensionTurns: Turn[];
  spotlightQueue: SpotlightBid[];
  myHandRaised: boolean;
  pendingRollRequest: RollRequest | null;
  myAspectAvailable: boolean;
  actingGmPlayers: ActingGmPlayer[];
  isActivePlayer: boolean;
  /** Reactions from everyone but me — my own clicks already float locally. */
  incomingReactions: Array<{ id: string; type: string }>;
  currentScene: CurrentScene;
  phase: PhaseState;
}

/**
 * Memoized derivations for the play surface — the thin layer between
 * useCampaignSession's raw state and the presentational shell.
 */
export function usePlayDerived({
  turns,
  characters,
  ownerId,
  campaignSession,
  floorRound,
  currentUserId,
  isGM,
  myCharacter,
  tableReactions,
}: UsePlayDerivedInput): PlayDerivedState {
  const activePlayerId = campaignSession?.activePlayerId ?? null;

  const logTurns = useMemo(() => turns.filter((t) => isLogTurnType(t.type)), [turns]);
  const storyTurns = useMemo(() => turns.filter((t) => isStoryTurnType(t.type)), [turns]);
  const extensionTurns = useMemo(() => deriveExtensionTurns(logTurns), [logTurns]);

  const spotlightQueue = useMemo(
    () => deriveSpotlightQueue(turns, characters, ownerId, activePlayerId),
    [turns, characters, ownerId, activePlayerId],
  );
  const myHandRaised =
    !!currentUserId && spotlightQueue.some((q) => q.userId === currentUserId);

  const pendingRollRequest = useMemo(
    () => derivePendingRollRequest(turns, currentUserId, isGM, myCharacter?.status ?? null),
    [turns, currentUserId, isGM, myCharacter?.status],
  );

  const myAspectAvailable = useMemo(
    () => deriveAspectAvailable(turns, currentUserId, myCharacter),
    [turns, currentUserId, myCharacter],
  );

  const actingGmPlayers = useMemo(
    () => deriveActingGmPlayers(characters, ownerId),
    [characters, ownerId],
  );
  const isActivePlayer =
    !!currentUserId && actingGmPlayers.some((p) => p.userId === currentUserId);

  const incomingReactions = useMemo(
    () =>
      tableReactions
        .filter((r) => r.userId !== currentUserId)
        .map((r) => ({ id: r.id, type: r.type })),
    [tableReactions, currentUserId],
  );

  const currentScene = useMemo(
    () => deriveCurrentScene(storyTurns, campaignSession),
    [storyTurns, campaignSession],
  );

  const phase = useMemo(
    () =>
      derivePhase({
        floorRound,
        pendingRollRequest,
        campaignSession,
        characters,
        isGM,
      }),
    [floorRound, pendingRollRequest, campaignSession, characters, isGM],
  );

  return {
    logTurns,
    storyTurns,
    extensionTurns,
    spotlightQueue,
    myHandRaised,
    pendingRollRequest,
    myAspectAvailable,
    actingGmPlayers,
    isActivePlayer,
    incomingReactions,
    currentScene,
    phase,
  };
}
