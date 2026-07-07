import { describe, expect, it } from "vitest";
import {
  summarizeSession,
  STALL_THRESHOLD_MS,
  type ReadoutTurn,
} from "@/server/services/session-readout";

// The stall instrument — pure arithmetic over turn timestamps. The playtest
// gate rests on these numbers being right.

const T0 = new Date("2026-07-07T20:00:00.000Z");
const at = (minutes: number, seconds = 0) =>
  new Date(T0.getTime() + minutes * 60_000 + seconds * 1000);

const GM = "gm-user-0000";
const P1 = "player-1-000";
const P2 = "player-2-000";

function makeSession(overrides: Partial<{
  status: string;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: "session-0000",
    title: "The Proving Ground",
    status: "completed",
    createdAt: T0,
    updatedAt: at(30),
    ...overrides,
  };
}

function turn(
  userId: string,
  minutes: number,
  type: string,
  content: string,
  characterName: string | null = null
): ReadoutTurn {
  return { userId, createdAt: at(minutes), type, content, characterName };
}

describe("summarizeSession", () => {
  it("handles a session with no turns", () => {
    const r = summarizeSession(makeSession(), GM, []);
    expect(r.totalTurns).toBe(0);
    expect(r.medianGapMs).toBeNull();
    expect(r.longestGapMs).toBeNull();
    expect(r.stallCount).toBe(0);
    expect(r.authors).toEqual([]);
    expect(r.totalWords).toBe(0);
  });

  it("computes median and longest inter-turn gap", () => {
    // gaps: 1m, 2m, 5m  → median = 2m, longest = 5m
    const turns = [
      turn(GM, 0, "narration", "The door groans open.", null),
      turn(P1, 1, "action", "I step inside.", "Vael"),
      turn(P2, 3, "action", "I hang back.", "Corvin"),
      turn(P1, 8, "dialogue", "Anyone there?", "Vael"),
    ];
    const r = summarizeSession(makeSession(), GM, turns);
    expect(r.medianGapMs).toBe(2 * 60_000);
    expect(r.longestGapMs).toBe(5 * 60_000);
  });

  it("flags silences over the stall threshold with context", () => {
    const turns = [
      turn(GM, 0, "narration", "Silence falls.", null),
      // 4-minute gap — a stall
      turn(P1, 4, "action", "Finally, I move.", "Vael"),
      // 1-minute gap — fine
      turn(GM, 5, "narration", "The floor creaks.", null),
    ];
    const r = summarizeSession(makeSession(), GM, turns);
    expect(r.stallThresholdMs).toBe(STALL_THRESHOLD_MS);
    expect(r.stallCount).toBe(1);
    expect(r.stalls[0].gapMs).toBe(4 * 60_000);
    expect(r.stalls[0].afterLabel).toBe("Director");
    expect(r.stalls[0].afterType).toBe("narration");
    expect(r.stalls[0].brokenByLabel).toBe("Vael");
  });

  it("orders stalls worst-first", () => {
    const turns = [
      turn(GM, 0, "narration", "a", null),
      turn(P1, 4, "action", "b", "Vael"), // 4m stall
      turn(P2, 12, "action", "c", "Corvin"), // 8m stall
      turn(P1, 13, "action", "d", "Vael"), // 1m fine
    ];
    const r = summarizeSession(makeSession(), GM, turns);
    expect(r.stallCount).toBe(2);
    expect(r.stalls.map((s) => s.gapMs)).toEqual([8 * 60_000, 4 * 60_000]);
  });

  it("counts words per author from story turns only, log turns excluded", () => {
    const turns = [
      turn(P1, 0, "action", "one two three four five", "Vael"), // 5 words
      turn(P1, 1, "ooc", "brb getting coffee here now", "Vael"), // log — 0
      turn(P2, 2, "dialogue", "hello there friend", "Corvin"), // 3 words
      turn(GM, 3, "roll", "— Vael rolled: 5 + 5 = 10.", null), // log — 0
    ];
    const r = summarizeSession(makeSession(), GM, turns);
    const vael = r.authors.find((a) => a.label === "Vael")!;
    const corvin = r.authors.find((a) => a.label === "Corvin")!;
    expect(vael.words).toBe(5);
    expect(vael.turns).toBe(2); // action + ooc
    expect(vael.storyTurns).toBe(1);
    expect(corvin.words).toBe(3);
    expect(r.totalWords).toBe(8);
    expect(r.storyTurns).toBe(2);
    expect(r.logTurns).toBe(2);
  });

  it("sorts authors by words descending", () => {
    const turns = [
      turn(P1, 0, "action", "one two", "Vael"),
      turn(P2, 1, "action", "one two three four", "Corvin"),
    ];
    const r = summarizeSession(makeSession(), GM, turns);
    expect(r.authors.map((a) => a.label)).toEqual(["Corvin", "Vael"]);
  });

  it("measures how long before close each author went quiet", () => {
    // Session closes (updatedAt) at 30m. Corvin's last touch is at 5m → quiet 25m.
    const turns = [
      turn(P1, 0, "action", "a", "Vael"),
      turn(P2, 5, "action", "b", "Corvin"),
      turn(P1, 28, "action", "c", "Vael"),
    ];
    const r = summarizeSession(makeSession({ updatedAt: at(30) }), GM, turns);
    const corvin = r.authors.find((a) => a.label === "Corvin")!;
    const vael = r.authors.find((a) => a.label === "Vael")!;
    expect(corvin.quietBeforeEndMs).toBe(25 * 60_000);
    expect(vael.quietBeforeEndMs).toBe(2 * 60_000);
  });

  it("reports trailing silence — the pen idle before the session was closed", () => {
    const turns = [
      turn(P1, 0, "action", "a", "Vael"),
      turn(P1, 10, "action", "b", "Vael"),
    ];
    const r = summarizeSession(makeSession({ updatedAt: at(30) }), GM, turns);
    expect(r.trailingSilenceMs).toBe(20 * 60_000);
  });

  it("counts table-voice passages for the book-voice heads-up", () => {
    const turns = [
      turn(GM, 0, "narration", "The bell tolls beneath you.", null), // table-voice
      turn(P1, 1, "action", "Vael leans over the water.", "Vael"), // player, clean
      turn(GM, 2, "narration", "Corvin tears his hand back.", null), // clean narration
      turn(GM, 3, "consequence", "The cold climbs your wrist.", null), // table-voice
    ];
    const r = summarizeSession(makeSession(), GM, turns);
    expect(r.tableVoicePassages).toBe(2);
  });

  it("clamps out-of-order same-instant inserts to a non-negative gap", () => {
    // A resolution can append a record line and a passage at the same instant,
    // occasionally out of clock order. Must not produce a negative gap.
    const turns = [
      turn(GM, 5, "ooc", "— put to a vote: it carried.", null),
      { ...turn(GM, 5, "action", "The passage.", "Vael"), createdAt: at(4, 59) },
    ];
    const r = summarizeSession(makeSession(), GM, turns);
    expect(r.longestGapMs).toBe(0);
    expect(r.stallCount).toBe(0);
  });

  it("runs an open (uncompleted) session's clock to its last turn, not updatedAt", () => {
    const turns = [turn(P1, 0, "action", "a", "Vael"), turn(P1, 10, "action", "b", "Vael")];
    const r = summarizeSession(
      makeSession({ status: "active", updatedAt: at(99) }),
      GM,
      turns
    );
    // endedAt anchors to the last turn (10m), not the stale 99m updatedAt.
    expect(r.endedAt).toBe(at(10).toISOString());
    expect(r.trailingSilenceMs).toBe(0);
  });
});
