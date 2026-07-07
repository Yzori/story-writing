import { describe, expect, it } from "vitest";
import {
  penTierFor,
  isAbandoned,
  PEN_NUDGE_MS,
  PEN_STALL_MS,
  SESSION_ABANDON_MS,
} from "@/lib/campaign-stall";

const MIN = 60 * 1000;

describe("penTierFor", () => {
  it("is quiet below the nudge threshold", () => {
    expect(penTierFor(0)).toBe("quiet");
    expect(penTierFor(PEN_NUDGE_MS - 1)).toBe("quiet");
  });

  it("nudges between nudge and stall", () => {
    expect(penTierFor(PEN_NUDGE_MS)).toBe("nudge");
    expect(penTierFor(PEN_STALL_MS - 1)).toBe("nudge");
  });

  it("stalls at and past the stall threshold", () => {
    expect(penTierFor(PEN_STALL_MS)).toBe("stall");
    expect(penTierFor(30 * MIN)).toBe("stall");
  });

  it("honors overridden thresholds", () => {
    expect(penTierFor(90 * 1000, { nudgeMs: 60 * 1000, stallMs: 2 * MIN })).toBe("nudge");
    expect(penTierFor(3 * MIN, { nudgeMs: 60 * 1000, stallMs: 2 * MIN })).toBe("stall");
  });
});

describe("isAbandoned", () => {
  const now = 1_000_000_000_000;

  it("is not abandoned while someone has a fresh heartbeat", () => {
    expect(
      isAbandoned({
        now,
        lastEventMs: now - 30 * MIN, // no turns for 30 min
        lastHeartbeatMs: now - 20 * 1000, // but someone is here
      }),
    ).toBe(false);
  });

  it("is not abandoned while the story is still moving", () => {
    expect(
      isAbandoned({
        now,
        lastEventMs: now - 2 * MIN, // a turn 2 min ago
        lastHeartbeatMs: now - 30 * MIN, // even if presence is stale
      }),
    ).toBe(false);
  });

  it("is abandoned when both the story and every heartbeat are stale", () => {
    expect(
      isAbandoned({
        now,
        lastEventMs: now - (SESSION_ABANDON_MS + MIN),
        lastHeartbeatMs: now - (SESSION_ABANDON_MS + MIN),
      }),
    ).toBe(true);
  });

  it("treats no heartbeat at all as a gone table", () => {
    expect(
      isAbandoned({
        now,
        lastEventMs: now - (SESSION_ABANDON_MS + MIN),
        lastHeartbeatMs: null,
      }),
    ).toBe(true);
  });

  it("waits for the full window at the boundary", () => {
    // Event stale exactly at the window, heartbeat null → abandoned.
    expect(
      isAbandoned({ now, lastEventMs: now - SESSION_ABANDON_MS, lastHeartbeatMs: null }),
    ).toBe(true);
    // One ms short → not yet.
    expect(
      isAbandoned({ now, lastEventMs: now - (SESSION_ABANDON_MS - 1), lastHeartbeatMs: null }),
    ).toBe(false);
  });
});
