import type { FloorRound } from "@/types/campaign";

export type SessionInteractionMode =
  | "inactive"
  | "gm_narrating"
  | "assigned_player_turn"
  | "your_turn"
  | "crossroads_collecting"
  | "crossroads_voting"
  | "crossroads_closed"
  | "last_words"
  | "locked";

interface SessionInteractionInput {
  sessionStatus: string;
  activePlayerId: string | null;
  currentUserId: string | null;
  isGM: boolean;
  myCharacterStatus?: string | null;
  floorRound?: Pick<FloorRound, "status"> | null;
}

interface SessionInteractionState {
  mode: SessionInteractionMode;
  label: string;
  canWriteDirect: boolean;
  canSubmitCrossroads: boolean;
  canVoteCrossroads: boolean;
  canSendLastWords: boolean;
}

// Shared "what does the spotlight say?" check. Both the server gate
// (canPostDirectStoryTurn) and the client mode classifier
// (getSessionInteractionState) need to branch on this; extracting it here
// is the load-bearing piece that keeps the two from drifting.
type SpotlightCheck = "your_turn" | "no_spotlight" | "other_player_turn";

function checkSpotlight(
  activePlayerId: string | null,
  currentUserId: string | null,
): SpotlightCheck {
  if (!activePlayerId) return "no_spotlight";
  if (activePlayerId === currentUserId) return "your_turn";
  return "other_player_turn";
}

export function getSessionInteractionState({
  sessionStatus,
  activePlayerId,
  currentUserId,
  isGM,
  myCharacterStatus,
  floorRound,
}: SessionInteractionInput): SessionInteractionState {
  const isActive = sessionStatus === "active";
  const isCharDead = myCharacterStatus === "dead";
  const isCharRetired = myCharacterStatus === "retired";
  const isCharGone = isCharDead || isCharRetired;

  if (!isActive) {
    return {
      mode: "inactive",
      label: sessionStatus === "draft" ? "Preparing" : "Ended",
      canWriteDirect: false,
      canSubmitCrossroads: false,
      canVoteCrossroads: false,
      canSendLastWords: false,
    };
  }

  if (!isGM && isCharDead) {
    return {
      mode: "last_words",
      label: "Last Words",
      canWriteDirect: false,
      canSubmitCrossroads: false,
      canVoteCrossroads: false,
      canSendLastWords: true,
    };
  }

  if (floorRound?.status === "open") {
    return {
      mode: "crossroads_collecting",
      label: "Crossroads Open",
      canWriteDirect: false,
      canSubmitCrossroads: !isGM && !isCharGone,
      canVoteCrossroads: false,
      canSendLastWords: false,
    };
  }

  if (floorRound?.status === "voting") {
    return {
      mode: "crossroads_voting",
      label: "Crossroads Voting",
      canWriteDirect: false,
      canSubmitCrossroads: false,
      canVoteCrossroads: !isGM && !isCharGone,
      canSendLastWords: false,
    };
  }

  if (floorRound?.status === "closed") {
    return {
      mode: "crossroads_closed",
      label: "Crossroads Closed",
      canWriteDirect: false,
      canSubmitCrossroads: false,
      canVoteCrossroads: false,
      canSendLastWords: false,
    };
  }

  if (isGM) {
    return {
      mode: "gm_narrating",
      label: "GM Narrating",
      canWriteDirect: !isCharGone,
      canSubmitCrossroads: false,
      canVoteCrossroads: false,
      canSendLastWords: false,
    };
  }

  // Remaining cases are non-GM, character not gone, no crossroads round.
  // Spotlight check decides which mode applies.
  const spotlight = checkSpotlight(activePlayerId, currentUserId);

  if (spotlight === "your_turn") {
    return {
      mode: "your_turn",
      label: "Your Turn",
      canWriteDirect: true,
      canSubmitCrossroads: false,
      canVoteCrossroads: false,
      canSendLastWords: false,
    };
  }

  if (spotlight === "other_player_turn") {
    return {
      mode: "assigned_player_turn",
      label: "Player's Turn",
      canWriteDirect: false,
      canSubmitCrossroads: false,
      canVoteCrossroads: false,
      canSendLastWords: false,
    };
  }

  return {
    mode: "locked",
    label: "GM Narrating",
    canWriteDirect: false,
    canSubmitCrossroads: false,
    canVoteCrossroads: false,
    canSendLastWords: false,
  };
}

interface DirectStoryTurnInput {
  isGM: boolean;
  activePlayerId: string | null;
  currentUserId: string;
  isLastWords: boolean;
}

export function canPostDirectStoryTurn({
  isGM,
  activePlayerId,
  currentUserId,
  isLastWords,
}: DirectStoryTurnInput): { allowed: true } | { allowed: false; message: string } {
  if (isGM || isLastWords) return { allowed: true };
  const spotlight = checkSpotlight(activePlayerId, currentUserId);
  if (spotlight === "your_turn") return { allowed: true };
  if (spotlight === "no_spotlight") {
    return { allowed: false, message: "Wait for your turn or submit through Crossroads" };
  }
  return { allowed: false, message: "It is not your turn" };
}
