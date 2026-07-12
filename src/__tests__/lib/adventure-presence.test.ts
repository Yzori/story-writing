import { describe, expect, it } from "vitest";
import {
  AT_TABLE_WINDOW_MS,
  WRITING_WINDOW_MS,
  presenceMap,
  presenceView,
} from "@/lib/adventure-presence";

const NOW = 1_800_000_000_000;
const at = (msAgo: number) => new Date(NOW - msAgo);

describe("presenceView", () => {
  it("marks a fresh heartbeat as at the table", () => {
    expect(presenceView("s1", at(1_000), null, NOW)).toEqual({
      seatId: "s1",
      atTable: true,
      writing: false,
    });
  });

  it("marks a stale heartbeat as away", () => {
    const view = presenceView("s1", at(AT_TABLE_WINDOW_MS + 1), null, NOW);
    expect(view.atTable).toBe(false);
    expect(view.writing).toBe(false);
  });

  it("treats a missing heartbeat as away", () => {
    expect(presenceView("s1", null, null, NOW).atTable).toBe(false);
  });

  it("shows writing only while the pulse is fresh", () => {
    expect(presenceView("s1", at(1_000), at(2_000), NOW).writing).toBe(true);
    expect(
      presenceView("s1", at(1_000), at(WRITING_WINDOW_MS + 1), NOW).writing
    ).toBe(false);
  });

  it("never shows writing for a seat that left the table", () => {
    const view = presenceView("s1", at(AT_TABLE_WINDOW_MS + 1), at(0), NOW);
    expect(view.writing).toBe(false);
  });

  it("accepts ISO strings the way JSON delivers them", () => {
    const view = presenceView(
      "s1",
      at(1_000).toISOString(),
      at(1_000).toISOString(),
      NOW
    );
    expect(view).toEqual({ seatId: "s1", atTable: true, writing: true });
  });
});

describe("presenceMap", () => {
  it("indexes views by seat and tolerates undefined", () => {
    const view = presenceView("s1", at(0), null, NOW);
    expect(presenceMap([view]).get("s1")).toBe(view);
    expect(presenceMap(undefined).size).toBe(0);
  });
});
