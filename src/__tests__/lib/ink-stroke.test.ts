import { describe, expect, it } from "vitest";

import { inkStroke } from "@/lib/ink-stroke";

// The stroke is generated math, not an asset — so the tests pin the contract
// the renderer relies on: determinism (server and client draw the same ink),
// a closed fillable ribbon, and staying inside the 200×200 viewBox.

describe("inkStroke", () => {
  it("is deterministic — same options, same ink", () => {
    const a = inkStroke();
    const b = inkStroke();
    expect(a.fill).toBe(b.fill);
    expect(a.guide).toBe(b.guide);
    expect(a.tail).toEqual(b.tail);
  });

  it("produces a closed fill ribbon and an open guide centerline", () => {
    const s = inkStroke();
    expect(s.fill.startsWith("M")).toBe(true);
    expect(s.fill.endsWith("Z")).toBe(true);
    expect(s.guide.startsWith("M")).toBe(true);
    expect(s.guide.endsWith("Z")).toBe(false);
  });

  it("stays inside the 200×200 viewBox with a safety margin", () => {
    const s = inkStroke();
    const nums = s.fill.match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      expect(nums[i]).toBeGreaterThan(0);
      expect(nums[i]).toBeLessThan(200);
      expect(nums[i + 1]).toBeGreaterThan(0);
      expect(nums[i + 1]).toBeLessThan(200);
    }
  });

  it("the ribbon has real taper: sampled width swells then thins", () => {
    // reconstruct rough widths by pairing outer/inner samples
    const s = inkStroke({ samples: 40 });
    const pts = s.fill
      .replace(/^M|Z$/g, "")
      .split("L")
      .map((p) => p.split(" ").map(Number) as [number, number]);
    const n = pts.length / 2;
    const width = (i: number) => {
      const o = pts[i];
      const inn = pts[pts.length - 1 - i];
      return Math.hypot(o[0] - inn[0], o[1] - inn[1]);
    };
    const landing = width(0);
    const mid = width(Math.floor(n / 2));
    const lift = width(n - 1);
    expect(mid).toBeGreaterThan(landing * 2);
    expect(mid).toBeGreaterThan(lift * 2);
  });

  it("the tail lands where the guide ends", () => {
    const s = inkStroke();
    const last = s.guide.split("L").pop()!.split(" ").map(Number);
    expect(s.tail.x).toBeCloseTo(last[0], 1);
    expect(s.tail.y).toBeCloseTo(last[1], 1);
  });
});
