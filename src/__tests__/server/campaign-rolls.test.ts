import { describe, expect, it } from "vitest";
import { resolveRoll, rollTierFor, buildRollConsequenceText } from "@/server/services/campaign-rolls";

// Pure dice resolution — the flat 2d6 + aspect-trump model (audit D1).
// No numeric modifiers; the only lever is the once-per-scene aspect save.

const base = {
  approach: null,
  aspect: "",
  aspectInvoked: false,
  aspectAvailable: false,
  fatalRequested: false,
};

describe("rollTierFor", () => {
  it("uses PbtA 2d6 thresholds at the boundaries", () => {
    expect(rollTierFor(12)).toBe("success");
    expect(rollTierFor(10)).toBe("success");
    expect(rollTierFor(9)).toBe("partial");
    expect(rollTierFor(7)).toBe("partial");
    expect(rollTierFor(6)).toBe("failure");
    expect(rollTierFor(2)).toBe("failure");
  });
});

describe("resolveRoll", () => {
  it("resolves a full success with no modifier and no mark", () => {
    const r = resolveRoll({ ...base, d1: 5, d2: 5 });
    expect(r.total).toBe(10);
    expect(r.tier).toBe("success");
    expect(r.markEligible).toBe(false);
    expect(r.aspectSaved).toBe(false);
    expect(r.content).toContain("It holds.");
  });

  it("flags a partial as mark-eligible", () => {
    const r = resolveRoll({ ...base, d1: 4, d2: 3 });
    expect(r.tier).toBe("partial");
    expect(r.markEligible).toBe(true);
  });

  it("resolves a plain miss without an aspect", () => {
    const r = resolveRoll({ ...base, d1: 1, d2: 1 });
    expect(r.tier).toBe("failure");
    expect(r.aspectSaved).toBe(false);
    expect(r.markEligible).toBe(true);
  });

  it("aspect trump turns a miss into a foothold when available", () => {
    const r = resolveRoll({
      ...base,
      d1: 2,
      d2: 3,
      aspect: "Never abandons her own",
      aspectInvoked: true,
      aspectAvailable: true,
    });
    expect(r.tier).toBe("partial");
    expect(r.aspectSaved).toBe(true);
    expect(r.content).toContain("Their truth turned the miss.");
  });

  it("does not save when the aspect is already spent this scene", () => {
    const r = resolveRoll({
      ...base,
      d1: 2,
      d2: 3,
      aspect: "Never abandons her own",
      aspectInvoked: true,
      aspectAvailable: false,
    });
    expect(r.tier).toBe("failure");
    expect(r.aspectSaved).toBe(false);
  });

  it("never wastes the aspect on a roll that did not miss", () => {
    const r = resolveRoll({
      ...base,
      d1: 6,
      d2: 6,
      aspect: "Never abandons her own",
      aspectInvoked: true,
      aspectAvailable: true,
    });
    expect(r.tier).toBe("success");
    expect(r.aspectSaved).toBe(false);
  });

  it("marks a fatal failure", () => {
    const r = resolveRoll({ ...base, d1: 1, d2: 2, fatalRequested: true });
    expect(r.tier).toBe("failure");
    expect(r.fatal).toBe(true);
    expect(r.markEligible).toBe(true);
  });

  it("lets the aspect cheat a fatal miss (failure -> partial, not fatal)", () => {
    const r = resolveRoll({
      ...base,
      d1: 1,
      d2: 2,
      aspect: "Never abandons her own",
      aspectInvoked: true,
      aspectAvailable: true,
      fatalRequested: true,
    });
    expect(r.tier).toBe("partial");
    expect(r.aspectSaved).toBe(true);
    expect(r.fatal).toBe(false);
  });

  it("treats a survived fatal roll as mark-eligible", () => {
    const r = resolveRoll({ ...base, d1: 6, d2: 6, fatalRequested: true });
    expect(r.tier).toBe("success");
    expect(r.fatal).toBe(false);
    expect(r.markEligible).toBe(true); // fatalRequested still makes it worth marking
  });

  it("includes the approach as fictional texture in the content", () => {
    const r = resolveRoll({ ...base, d1: 5, d2: 5, approach: "Bold" });
    expect(r.content).toContain("Bold");
  });

  it("prints the roller's first name in the set line", () => {
    const r = resolveRoll({ ...base, d1: 5, d2: 5, approach: "Keen", characterName: "Lyra Varen" });
    expect(r.content).toBe("— Lyra rolled Keen: 5 + 5 = 10. It holds.");
  });
});

describe("buildRollConsequenceText", () => {
  it("uses the GM's written outcomes when present", () => {
    expect(buildRollConsequenceText("success", { onSuccess: "The lock clicks open." })).toBe("The lock clicks open.");
    expect(buildRollConsequenceText("failure", { onFailure: "The guard turns." })).toBe("The guard turns.");
  });

  it("falls back to fail-forward generic text on a plain miss", () => {
    const text = buildRollConsequenceText("failure", {});
    expect(text).not.toBe("The attempt fails.");
    expect(text.length).toBeGreaterThan(0);
  });

  it("uses fatal-specific generics when the roll was fatal", () => {
    expect(buildRollConsequenceText("failure", { fatal: true })).toContain("no escape");
  });

  it("combines both sides on a partial when the GM wrote them", () => {
    const text = buildRollConsequenceText("partial", { onSuccess: "You reach the ledge", onFailure: "Your pack falls into the dark" });
    expect(text).toBe("You reach the ledge - but your pack falls into the dark");
  });

  it("uses the generic partial when only one side is written", () => {
    const text = buildRollConsequenceText("partial", { onSuccess: "You reach the ledge" });
    expect(text).toContain("ground shifts");
  });
});
