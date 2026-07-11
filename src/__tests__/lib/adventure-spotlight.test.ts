import { describe, expect, it } from "vitest";
import {
  canCloseScene,
  canLowerHand,
  canOpenScene,
  canPassSpotlight,
  canRaiseHand,
  canSignPassage,
  canStartAdventure,
  canStepForward,
  nextScenePosition,
  passSpotlightEffects,
  signPassageEffects,
  signTiming,
  spotlightDue,
  stepForwardEffects,
  type SpotlightSeat,
  type SpotlightState,
} from "@/lib/adventure-spotlight";

const NOW = new Date("2026-07-11T12:00:00Z");

const director: SpotlightSeat = {
  id: "seat-director",
  role: "director",
  status: "seated",
  stepForwardAct: 0,
};

const mira: SpotlightSeat = {
  id: "seat-mira",
  role: "writer",
  status: "seated",
  stepForwardAct: 0,
};

const jonas: SpotlightSeat = {
  id: "seat-jonas",
  role: "writer",
  status: "seated",
  stepForwardAct: 1,
};

const openSeat: SpotlightSeat = {
  id: "seat-open",
  role: "writer",
  status: "open",
  stepForwardAct: 0,
};

function state(overrides: Partial<SpotlightState> = {}): SpotlightState {
  return {
    status: "running",
    actNo: 1,
    spotlightSeatId: director.id,
    spotlightDueAt: null,
    turnDueHours: 48,
    hasOpenScene: true,
    ...overrides,
  };
}

describe("canPassSpotlight", () => {
  it("lets the director pass to a seated writer", () => {
    expect(canPassSpotlight(state(), director, mira)).toEqual({ allowed: true });
  });

  it("rejects a writer passing the spotlight", () => {
    const s = state({ spotlightSeatId: mira.id });
    expect(canPassSpotlight(s, mira, jonas).allowed).toBe(false);
  });

  it("rejects passing while a writer holds the spotlight", () => {
    const s = state({ spotlightSeatId: mira.id });
    expect(canPassSpotlight(s, director, jonas).allowed).toBe(false);
  });

  it("rejects passing to an open or left seat", () => {
    expect(canPassSpotlight(state(), director, openSeat).allowed).toBe(false);
    expect(
      canPassSpotlight(state(), director, { ...mira, status: "left" }).allowed
    ).toBe(false);
  });

  it("rejects passing to the director seat", () => {
    expect(canPassSpotlight(state(), director, director).allowed).toBe(false);
  });

  it("requires an open scene", () => {
    expect(
      canPassSpotlight(state({ hasOpenScene: false }), director, mira).allowed
    ).toBe(false);
  });

  it("requires a running adventure", () => {
    expect(canPassSpotlight(state({ status: "casting" }), director, mira).allowed).toBe(false);
    expect(canPassSpotlight(state({ status: "finished" }), director, mira).allowed).toBe(false);
  });

  it("computes deadline effects from pace", () => {
    const effects = passSpotlightEffects(state(), mira.id, NOW);
    expect(effects.spotlightSeatId).toBe(mira.id);
    expect(effects.spotlightSince).toEqual(NOW);
    expect(effects.spotlightDueAt).toEqual(
      new Date("2026-07-13T12:00:00Z")
    );
  });
});

describe("raise / lower hand", () => {
  it("lets a seated writer raise a hand", () => {
    expect(canRaiseHand(state(), mira, false)).toEqual({ allowed: true });
  });

  it("rejects raising while holding the spotlight", () => {
    const s = state({ spotlightSeatId: mira.id });
    expect(canRaiseHand(s, mira, false).allowed).toBe(false);
  });

  it("rejects a second active hand", () => {
    expect(canRaiseHand(state(), mira, true).allowed).toBe(false);
  });

  it("rejects the director and unseated writers", () => {
    expect(canRaiseHand(state(), director, false).allowed).toBe(false);
    expect(canRaiseHand(state(), openSeat, false).allowed).toBe(false);
  });

  it("lower requires an active hand", () => {
    expect(canLowerHand(true)).toEqual({ allowed: true });
    expect(canLowerHand(false).allowed).toBe(false);
  });
});

describe("canStepForward", () => {
  it("lets a writer with an unspent token take the spotlight from the director", () => {
    expect(canStepForward(state(), mira, director.id)).toEqual({ allowed: true });
  });

  it("rejects when the token was spent this act", () => {
    expect(canStepForward(state(), jonas, director.id).allowed).toBe(false);
  });

  it("refreshes the token in a new act", () => {
    expect(canStepForward(state({ actNo: 2 }), jonas, director.id)).toEqual({
      allowed: true,
    });
  });

  it("rejects while another writer is writing (no yanking mid-write)", () => {
    const s = state({ spotlightSeatId: jonas.id });
    expect(canStepForward(s, mira, director.id).allowed).toBe(false);
  });

  it("rejects when the writer already holds the spotlight", () => {
    const s = state({ spotlightSeatId: mira.id });
    expect(canStepForward(s, mira, director.id).allowed).toBe(false);
  });

  it("requires an open scene and a running adventure", () => {
    expect(canStepForward(state({ hasOpenScene: false }), mira, director.id).allowed).toBe(false);
    expect(canStepForward(state({ status: "abandoned" }), mira, director.id).allowed).toBe(false);
  });

  it("stamps the token to the current act in effects", () => {
    const effects = stepForwardEffects(state({ actNo: 3 }), mira, NOW);
    expect(effects.spotlightSeatId).toBe(mira.id);
    expect(effects.stepForwardAct).toBe(3);
    expect(effects.spotlightDueAt).toEqual(spotlightDue(NOW, 48));
  });
});

describe("canSignPassage", () => {
  it("lets the spotlit writer sign a character passage", () => {
    const s = state({ spotlightSeatId: mira.id });
    expect(canSignPassage(s, mira, "character")).toEqual({ allowed: true });
  });

  it("never lets the director sign a character passage", () => {
    expect(canSignPassage(state(), director, "character").allowed).toBe(false);
  });

  it("only the director signs direction and scene-open", () => {
    expect(canSignPassage(state(), director, "direction")).toEqual({ allowed: true });
    const s = state({ spotlightSeatId: mira.id });
    expect(canSignPassage(s, mira, "direction").allowed).toBe(false);
    expect(canSignPassage(s, mira, "scene-open").allowed).toBe(false);
  });

  it("rejects writing without the spotlight", () => {
    expect(canSignPassage(state(), mira, "character").allowed).toBe(false);
  });

  it("requires an open scene except for scene-open itself", () => {
    const closed = state({ hasOpenScene: false });
    expect(canSignPassage(closed, director, "direction").allowed).toBe(false);
    expect(canSignPassage(closed, director, "scene-open")).toEqual({ allowed: true });
  });
});

describe("signPassageEffects", () => {
  it("returns the spotlight to the director after a writer signs", () => {
    expect(signPassageEffects(mira, director.id, NOW)).toEqual({
      spotlightSeatId: director.id,
      spotlightSince: NOW,
      spotlightDueAt: null,
    });
  });

  it("keeps the spotlight when the director signs", () => {
    expect(signPassageEffects(director, director.id, NOW)).toBeNull();
  });
});

describe("signTiming", () => {
  it("is on-time at or before the deadline, late after", () => {
    const due = new Date("2026-07-11T12:00:00Z");
    expect(signTiming(due, new Date("2026-07-11T11:59:59Z"))).toBe("on-time");
    expect(signTiming(due, due)).toBe("on-time");
    expect(signTiming(due, new Date("2026-07-11T12:00:01Z"))).toBe("late");
  });

  it("is on-time when there is no deadline (director's desk)", () => {
    expect(signTiming(null, NOW)).toBe("on-time");
  });
});

describe("scenes", () => {
  it("only the spotlit director opens and closes scenes", () => {
    expect(canOpenScene(state({ hasOpenScene: false }), director)).toEqual({ allowed: true });
    expect(canCloseScene(state(), director)).toEqual({ allowed: true });
    expect(canOpenScene(state({ hasOpenScene: false }), mira).allowed).toBe(false);
    expect(canCloseScene(state(), mira).allowed).toBe(false);
  });

  it("cannot open over an open scene or close a closed one", () => {
    expect(canOpenScene(state(), director).allowed).toBe(false);
    expect(canCloseScene(state({ hasOpenScene: false }), director).allowed).toBe(false);
  });

  it("cannot change scenes while a writer holds the spotlight", () => {
    const s = state({ spotlightSeatId: mira.id, hasOpenScene: false });
    expect(canOpenScene(s, director).allowed).toBe(false);
  });

  it("advances scene and act counters", () => {
    expect(nextScenePosition(1, 3, false)).toEqual({ actNo: 1, sceneNo: 4 });
    expect(nextScenePosition(1, 3, true)).toEqual({ actNo: 2, sceneNo: 1 });
  });
});

describe("canStartAdventure", () => {
  it("needs casting status, a director, and 2–4 writers", () => {
    expect(canStartAdventure("casting", 2, true)).toEqual({ allowed: true });
    expect(canStartAdventure("casting", 4, true)).toEqual({ allowed: true });
    expect(canStartAdventure("casting", 1, true).allowed).toBe(false);
    expect(canStartAdventure("casting", 5, true).allowed).toBe(false);
    expect(canStartAdventure("casting", 3, false).allowed).toBe(false);
    expect(canStartAdventure("running", 3, true).allowed).toBe(false);
  });
});
