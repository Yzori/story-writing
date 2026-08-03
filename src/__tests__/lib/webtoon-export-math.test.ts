import { describe, it, expect } from "vitest";
import {
  REFERENCE_WIDTH,
  computeColumnWidths,
  computeFitRect,
  computeOverlayBox,
  computeRowHeights,
  computeSlices,
  computeSlotRects,
  getBorderMetrics,
  getLayoutGrid,
  getLayoutSlotCount,
  getOverlayFontPx,
  getPanelAspect,
  getSeamHeight,
  normalizeSeam,
  wrapText,
  type LayoutGrid,
} from "@/lib/webtoon-export-math";

/** Slot rects for a layout at a given width, with square source art. */
function slotsFor(layout: string, slotCount: number, width = 600, gap = 0, aspects?: (number | null)[]) {
  const grid = getLayoutGrid(layout, slotCount);
  const columnWidths = computeColumnWidths(width, grid.columns, gap);
  const rowHeights = computeRowHeights({
    grid,
    columnWidths,
    gap,
    naturalAspects: aspects ?? Array.from({ length: slotCount }, () => 1),
  });
  return { grid, rects: computeSlotRects({ grid, columnWidths, rowHeights, gap }), rowHeights };
}

/** Deterministic stand-in for ctx.measureText: every character is 10px wide. */
const measure = (text: string) => text.length * 10;

describe("getLayoutSlotCount", () => {
  it("caps each named layout at the frames it can show", () => {
    expect(getLayoutSlotCount("single", 4)).toBe(1);
    expect(getLayoutSlotCount("side-by-side", 6)).toBe(2);
    expect(getLayoutSlotCount("stack", 6)).toBe(2);
    expect(getLayoutSlotCount("top-pair-bottom", 6)).toBe(3);
    expect(getLayoutSlotCount("left-stack-right", 6)).toBe(3);
    expect(getLayoutSlotCount("grid-4", 6)).toBe(4);
    expect(getLayoutSlotCount("mosaic-5", 6)).toBe(5);
    expect(getLayoutSlotCount("grid-6", 8)).toBe(6);
  });

  it("treats every stored frame as a slot for legacy panels with no layout", () => {
    expect(getLayoutSlotCount(undefined, 3)).toBe(3);
  });
});

describe("layout geometry", () => {
  it("gives a single panel the whole box", () => {
    const { rects } = slotsFor("single", 1, 600);
    expect(rects).toEqual([{ x: 0, y: 0, width: 600, height: 600 }]);
  });

  it("splits side-by-side into two columns on one row", () => {
    const { grid, rects } = slotsFor("side-by-side", 2, 600);
    expect([grid.columns, grid.rows]).toEqual([2, 1]);
    expect(rects[0]).toEqual({ x: 0, y: 0, width: 300, height: 300 });
    expect(rects[1]).toEqual({ x: 300, y: 0, width: 300, height: 300 });
  });

  it("stacks two full-width frames vertically", () => {
    const { grid, rects } = slotsFor("stack", 2, 600);
    expect([grid.columns, grid.rows]).toEqual([1, 2]);
    expect(rects[0]).toEqual({ x: 0, y: 0, width: 600, height: 600 });
    expect(rects[1]).toEqual({ x: 0, y: 600, width: 600, height: 600 });
  });

  it("spans the third frame of top-pair-bottom across both columns", () => {
    const { grid, rects } = slotsFor("top-pair-bottom", 3, 600);
    expect([grid.columns, grid.rows]).toEqual([2, 2]);
    expect(rects[0].width).toBe(300);
    expect(rects[1]).toMatchObject({ x: 300, y: 0, width: 300 });
    expect(rects[2]).toMatchObject({ x: 0, width: 600 });
    expect(rects[2].y).toBe(rects[0].height);
  });

  it("gives left-stack-right a tall left column beside two stacked frames", () => {
    const { grid, rects } = slotsFor("left-stack-right", 3, 600);
    expect([grid.columns, grid.rows]).toEqual([2, 2]);
    expect(rects[0]).toMatchObject({ x: 0, y: 0, width: 300 });
    expect(rects[1]).toMatchObject({ x: 300, y: 0, width: 300 });
    expect(rects[2].x).toBe(300);
    expect(rects[2].y).toBe(rects[1].height);
    // The spanning frame is as tall as the two it sits beside.
    expect(rects[0].height).toBeCloseTo(rects[1].height + rects[2].height, 5);
  });

  it("lays grid-4 out as two rows of two", () => {
    const { grid, rects } = slotsFor("grid-4", 4, 600);
    expect([grid.columns, grid.rows]).toEqual([2, 2]);
    expect(rects.map((r) => r.x)).toEqual([0, 300, 0, 300]);
    expect(rects[2].y).toBe(rects[0].height);
    expect(rects[3].y).toBe(rects[0].height);
  });

  it("splits mosaic-5 into two halves over three thirds", () => {
    const { grid, rects } = slotsFor("mosaic-5", 5, 600);
    expect([grid.columns, grid.rows]).toEqual([6, 2]);
    expect(rects[0]).toMatchObject({ x: 0, y: 0, width: 300 });
    expect(rects[1]).toMatchObject({ x: 300, y: 0, width: 300 });
    expect(rects.slice(2).map((r) => Math.round(r.width))).toEqual([200, 200, 200]);
    expect(rects.slice(2).map((r) => Math.round(r.x))).toEqual([0, 200, 400]);
  });

  it("lays grid-6 out as three rows of two", () => {
    const { grid, rects } = slotsFor("grid-6", 6, 600);
    expect([grid.columns, grid.rows]).toEqual([2, 3]);
    expect(rects.map((r) => r.x)).toEqual([0, 300, 0, 300, 0, 300]);
    expect(new Set(rects.map((r) => r.y)).size).toBe(3);
  });

  it("keeps gutters out of the frames when a border style adds a gap", () => {
    const { rects } = slotsFor("side-by-side", 2, 600, 4);
    expect(rects[0]).toMatchObject({ x: 0, width: 298 });
    expect(rects[1]).toMatchObject({ x: 302, width: 298 });
  });

  it("falls back to a single column when only one frame is present", () => {
    const { grid } = slotsFor("grid-4", 1, 600);
    expect([grid.columns, grid.rows]).toEqual([1, 1]);
  });
});

describe("computeRowHeights", () => {
  const grid: LayoutGrid = getLayoutGrid("grid-4", 4);
  const columnWidths = computeColumnWidths(600, 2, 0);

  it("sizes each row to the tallest art it holds", () => {
    const heights = computeRowHeights({
      grid,
      columnWidths,
      gap: 0,
      // Row 1: a square (300px tall) and a 2:1 wide shot (150px tall).
      naturalAspects: [1, 2, 1, 1],
    });
    expect(heights[0]).toBe(300);
    expect(heights[1]).toBe(300);
  });

  it("splits a fixed panel height evenly across rows", () => {
    const heights = computeRowHeights({
      grid,
      columnWidths,
      gap: 10,
      naturalAspects: [1, 1, 1, 1],
      totalHeight: 410,
    });
    expect(heights).toEqual([200, 200]);
  });

  it("uses the placeholder aspect for slots with no art", () => {
    const heights = computeRowHeights({
      grid: getLayoutGrid("single", 1),
      columnWidths: computeColumnWidths(600, 1, 0),
      gap: 0,
      naturalAspects: [null],
    });
    expect(heights).toEqual([800]); // 600 / (3/4)
  });
});

describe("getPanelAspect", () => {
  it("maps the named sizings and parses a custom ratio", () => {
    expect(getPanelAspect("standard", null)).toBeNull();
    expect(getPanelAspect("tall", null)).toBeCloseTo(9 / 16, 6);
    expect(getPanelAspect("wide", null)).toBeCloseTo(16 / 9, 6);
    expect(getPanelAspect("full", null)).toBeCloseTo(9 / 19.5, 6);
    expect(getPanelAspect("custom", "4:5")).toBeCloseTo(0.8, 6);
    expect(getPanelAspect("custom", "nonsense")).toBeNull();
  });
});

describe("computeFitRect", () => {
  const dest = { x: 10, y: 20, width: 200, height: 100 };

  it("crops a tall source from the centre for cover", () => {
    const d = computeFitRect("cover", { width: 400, height: 400 }, dest);
    expect(d).toMatchObject({ dx: 10, dy: 20, dw: 200, dh: 100 });
    expect(d.sw).toBe(400);
    expect(d.sh).toBe(200);
    expect(d.sx).toBe(0);
    expect(d.sy).toBe(100); // (400 - 200) / 2
  });

  it("anchors the crop to the top edge for top", () => {
    const d = computeFitRect("top", { width: 400, height: 400 }, dest);
    expect(d.sy).toBe(0);
    expect(d.sh).toBe(200);
    expect(d).toMatchObject({ dx: 10, dy: 20, dw: 200, dh: 100 });
  });

  it("letterboxes the whole source for contain", () => {
    const d = computeFitRect("contain", { width: 400, height: 400 }, dest);
    expect({ sx: d.sx, sy: d.sy, sw: d.sw, sh: d.sh }).toEqual({ sx: 0, sy: 0, sw: 400, sh: 400 });
    expect(d.dw).toBe(100);
    expect(d.dh).toBe(100);
    expect(d.dx).toBe(60); // centred: 10 + (200 - 100) / 2
    expect(d.dy).toBe(20);
  });

  it("survives a zero-sized source instead of dividing by zero", () => {
    const d = computeFitRect("cover", { width: 0, height: 0 }, dest);
    expect(Number.isNaN(d.dx)).toBe(false);
    expect(d).toMatchObject({ dx: 10, dy: 20, dw: 200, dh: 100 });
  });
});

describe("seams", () => {
  it("matches the reader's margins at reference width", () => {
    const scale = REFERENCE_WIDTH / REFERENCE_WIDTH;
    expect(getSeamHeight("none", scale)).toBe(0);
    expect(getSeamHeight("beat", scale)).toBe(16);
    expect(getSeamHeight("pause", scale)).toBe(48);
    expect(getSeamHeight("breath", scale)).toBe(96);
    expect(getSeamHeight("blackout", scale)).toBe(176);
  });

  it("scales with the export width and never precedes the first panel", () => {
    expect(getSeamHeight("pause", 800 / REFERENCE_WIDTH)).toBe(60);
    expect(getSeamHeight("blackout", 1, true)).toBe(0);
    expect(normalizeSeam("bogus")).toBe("none");
  });
});

describe("computeSlices", () => {
  it("keeps one slice when the strip fits", () => {
    const slices = computeSlices([1000, 1000, 500], 8000);
    expect(slices).toEqual([{ startIndex: 0, endIndex: 3, y: 0, height: 2500 }]);
  });

  it("cuts at panel boundaries rather than mid-panel", () => {
    const slices = computeSlices([3000, 3000, 3000, 1000], 7000);
    expect(slices).toHaveLength(2);
    expect(slices[0]).toEqual({ startIndex: 0, endIndex: 2, y: 0, height: 6000 });
    expect(slices[1]).toEqual({ startIndex: 2, endIndex: 4, y: 6000, height: 4000 });
    // Every panel lands in exactly one slice, and the offsets are contiguous.
    expect(slices[1].y).toBe(slices[0].height);
    expect(slices.reduce((sum, s) => sum + s.height, 0)).toBe(10000);
  });

  it("gives an oversized panel its own slice instead of splitting it", () => {
    const slices = computeSlices([500, 9000, 500], 8000);
    expect(slices.map((s) => [s.startIndex, s.endIndex])).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
    expect(slices[1].height).toBe(9000);
  });

  it("returns nothing for an empty strip", () => {
    expect(computeSlices([], 8000)).toEqual([]);
  });
});

describe("wrapText", () => {
  it("breaks a line at word boundaries", () => {
    expect(wrapText("aaa bbb ccc", 70, measure)).toEqual(["aaa bbb", "ccc"]);
  });

  it("keeps authored line breaks", () => {
    expect(wrapText("one\ntwo", 1000, measure)).toEqual(["one", "two"]);
  });

  it("splits a word too long to fit rather than overflowing", () => {
    expect(wrapText("abcdefgh", 30, measure)).toEqual(["abc", "def", "gh"]);
  });

  it("returns nothing for empty text", () => {
    expect(wrapText("", 100, measure)).toEqual([]);
  });
});

describe("overlays", () => {
  const panel = { x: 0, y: 100, width: 800, height: 400 };

  it("centres a bubble on its x/y percentage", () => {
    const box = computeOverlayBox(
      { x: 50, y: 50, width: 25 },
      panel,
      { contentHeight: 60, minWidth: 40, minHeight: 24 }
    );
    expect(box.width).toBe(200);
    expect(box.height).toBe(60);
    expect(box.x).toBe(300); // 400 - 200/2
    expect(box.y).toBe(270); // 100 + 200 - 60/2
  });

  it("floors a tiny bubble at the minimum box", () => {
    const box = computeOverlayBox(
      { x: 10, y: 10, width: 1 },
      panel,
      { contentHeight: 10, minWidth: 40, minHeight: 24 }
    );
    expect(box.width).toBe(40);
    expect(box.height).toBe(24);
  });

  it("falls back to defaults when a coordinate is missing", () => {
    const box = computeOverlayBox({}, panel, { contentHeight: 20, minWidth: 40, minHeight: 24 });
    expect(box.x).toBe(400 - (0.3 * 800) / 2);
  });

  it("sizes lettering against the panel width, with the CSS clamp floors", () => {
    // Wide panel: purely proportional (1.6055cqw for medium).
    expect(getOverlayFontPx("medium", 1000)).toBeCloseTo(16.055, 3);
    expect(getOverlayFontPx(undefined, 1000)).toBeCloseTo(16.055, 3);
    // Narrow panel: the floor holds lettering legible instead of following it down.
    expect(getOverlayFontPx("medium", 300)).toBe(11);
    expect(getOverlayFontPx("small", 300)).toBe(9);
    expect(getOverlayFontPx("large", 300)).toBe(14);
    // Very wide panel: the ceiling stops it running away.
    expect(getOverlayFontPx("medium", 4000)).toBe(26);
  });

  it("multiplies the clamped font by the author's scale", () => {
    expect(getOverlayFontPx("medium", 1000, 2)).toBeCloseTo(32.11, 2);
    expect(getOverlayFontPx("medium", 300, 0.5)).toBe(5.5);
  });
});

describe("getBorderMetrics", () => {
  it("gives black borders a padded frame and light borders a hairline", () => {
    expect(getBorderMetrics("black", 1)).toEqual({ padding: 4, gap: 4 });
    expect(getBorderMetrics("light", 1)).toEqual({ padding: 1, gap: 4 });
    expect(getBorderMetrics("none", 1)).toEqual({ padding: 0, gap: 0 });
    expect(getBorderMetrics("black", 2)).toEqual({ padding: 8, gap: 8 });
  });
});
