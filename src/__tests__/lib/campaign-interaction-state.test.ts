import { describe, expect, it } from "vitest";
import {
  canPostDirectStoryTurn,
  getSessionInteractionState,
} from "@/lib/campaign-interaction-state";

describe("campaign interaction state", () => {
  it("blocks player direct story turns when no spotlight is assigned", () => {
    expect(
      canPostDirectStoryTurn({
        isGM: false,
        activePlayerId: null,
        currentUserId: "player-1",
        isLastWords: false,
      }),
    ).toEqual({
      allowed: false,
      message: "Wait for your turn or submit through Crossroads",
    });
  });

  it("allows assigned players and last words through the direct turn gate", () => {
    expect(
      canPostDirectStoryTurn({
        isGM: false,
        activePlayerId: "player-1",
        currentUserId: "player-1",
        isLastWords: false,
      }),
    ).toEqual({ allowed: true });

    expect(
      canPostDirectStoryTurn({
        isGM: false,
        activePlayerId: null,
        currentUserId: "player-1",
        isLastWords: true,
      }),
    ).toEqual({ allowed: true });
  });

  it("gives Crossroads phases precedence over direct writing", () => {
    const state = getSessionInteractionState({
      sessionStatus: "active",
      activePlayerId: "player-1",
      currentUserId: "player-1",
      isGM: false,
      myCharacterStatus: "active",
      floorRound: { status: "voting" },
    });

    expect(state.mode).toBe("crossroads_voting");
    expect(state.canWriteDirect).toBe(false);
    expect(state.canVoteCrossroads).toBe(true);
  });
});
