import { describe, expect, it } from "vitest";
import { resolveQuillState, type ResolveQuillStateInput } from "@/lib/manuscript-quill-state";

function input(overrides: Partial<ResolveQuillStateInput> = {}): ResolveQuillStateInput {
  return {
    mode: "locked",
    isGM: false,
    myCharacterStatus: "active",
    hasPendingRollRequest: false,
    lastWordsSent: false,
    directorWriting: true,
    ...overrides,
  };
}

describe("resolveQuillState", () => {
  it("renders nothing while the session is not active", () => {
    expect(resolveQuillState(input({ mode: "inactive" }))).toEqual({ kind: "none" });
    expect(
      resolveQuillState(input({ mode: "inactive", isGM: true, hasPendingRollRequest: true })),
    ).toEqual({ kind: "none" });
  });

  it("gives a dead character the last-words quill exactly once", () => {
    expect(resolveQuillState(input({ mode: "last_words", myCharacterStatus: "dead" }))).toEqual({
      kind: "last-words",
    });
    expect(
      resolveQuillState(input({ mode: "last_words", myCharacterStatus: "dead", lastWordsSent: true })),
    ).toEqual({ kind: "gone", dead: true });
  });

  it("shows the retired notice for a retired character", () => {
    expect(
      resolveQuillState(input({ mode: "locked", myCharacterStatus: "retired" })),
    ).toEqual({ kind: "gone", dead: false });
  });

  it("lets the dice trump the quill for players but never the GM", () => {
    expect(
      resolveQuillState(input({ mode: "your_turn", hasPendingRollRequest: true })),
    ).toEqual({ kind: "roll-pending" });
    expect(
      resolveQuillState(input({ mode: "gm_narrating", isGM: true, hasPendingRollRequest: true })),
    ).toEqual({ kind: "quill", gm: true });
  });

  it("hands the end of the page to the fork during crossroads", () => {
    for (const mode of ["crossroads_collecting", "crossroads_voting", "crossroads_closed"] as const) {
      expect(resolveQuillState(input({ mode }))).toEqual({ kind: "fork" });
      expect(resolveQuillState(input({ mode, isGM: true }))).toEqual({ kind: "fork" });
    }
  });

  it("gives the quill to the GM and to the spotlit player", () => {
    expect(resolveQuillState(input({ mode: "gm_narrating", isGM: true }))).toEqual({
      kind: "quill",
      gm: true,
    });
    expect(resolveQuillState(input({ mode: "your_turn" }))).toEqual({ kind: "quill", gm: false });
  });

  it("everyone else waits, knowing whose ink flows", () => {
    expect(
      resolveQuillState(input({ mode: "assigned_player_turn", directorWriting: false })),
    ).toEqual({ kind: "waiting", directorWriting: false });
    expect(resolveQuillState(input({ mode: "locked", directorWriting: true }))).toEqual({
      kind: "waiting",
      directorWriting: true,
    });
  });
});
