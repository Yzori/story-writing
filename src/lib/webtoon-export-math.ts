/**
 * Pure geometry for the webtoon "export episode as an image strip" feature.
 *
 * Everything here is deliberately canvas-free: the renderer in
 * `webtoon-export.ts` owns the 2D context, this module owns the arithmetic
 * (grid slots, crop rects, seam gaps, slice boundaries, text wrapping) so the
 * layout maths can be unit-tested in a plain node environment.
 *
 * The numbers mirror what the reader renders in the browser
 * (`components/reader/WebtoonReader.tsx` + `components/editor/webtoon-seam.ts`).
 * The reader lays panels out inside a `max-w-2xl px-4` column — 672px minus
 * 16px of padding on each side — so 640px is the reference width every pixel
 * constant (font sizes, paddings, seam margins) is expressed against, and an
 * export at some other width scales those constants proportionally.
 */

export const REFERENCE_WIDTH = 640;

export type PanelLayout =
  | "single"
  | "side-by-side"
  | "stack"
  | "top-pair-bottom"
  | "left-stack-right"
  | "grid-4"
  | "mosaic-5"
  | "grid-6";

export type FrameFit = "cover" | "contain" | "top";
export type Seam = "none" | "beat" | "pause" | "breath" | "blackout";
export type OverlayFontSize = "small" | "medium" | "large";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A slot's position in the panel's grid, in grid-track units. */
export interface SlotPlacement {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface LayoutGrid {
  columns: number;
  rows: number;
  placements: SlotPlacement[];
}

/** drawImage() arguments: a source crop rect and the destination rect. */
export interface DrawRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export type MeasureText = (text: string) => number;

// ── Slots ───────────────────────────────────────────────────

/**
 * How many frames a layout shows. Frames stored beyond this are kept by the
 * editor so switching layouts never destroys art, but they are never rendered
 * — the export must truncate exactly like the reader does.
 */
export function getLayoutSlotCount(layout: string | undefined, frameCount: number): number {
  if (layout === "grid-6") return 6;
  if (layout === "mosaic-5") return 5;
  if (layout === "grid-4") return 4;
  if (layout === "top-pair-bottom" || layout === "left-stack-right") return 3;
  if (layout === "side-by-side" || layout === "stack") return 2;
  if (layout === "single") return 1;
  // Legacy panels stored before `layout` existed: every frame is a slot.
  return frameCount;
}

function getColumnCount(layout: string | undefined, slotCount: number): number {
  if (slotCount <= 1) return 1;
  if (layout === "stack") return 1;
  if (layout === "mosaic-5") return 6;
  return 2;
}

function getSlotSpan(
  layout: string | undefined,
  index: number,
  slotCount: number
): { colSpan: number; rowSpan: number } {
  if (slotCount <= 1) return { colSpan: 1, rowSpan: 1 };
  if (layout === "top-pair-bottom" && index === 2) return { colSpan: 2, rowSpan: 1 };
  if (layout === "left-stack-right" && index === 0) return { colSpan: 1, rowSpan: 2 };
  if (layout === "mosaic-5") return index < 2 ? { colSpan: 3, rowSpan: 1 } : { colSpan: 2, rowSpan: 1 };
  return { colSpan: 1, rowSpan: 1 };
}

/**
 * Reproduce CSS `grid-auto-flow: row` (non-dense) placement for a layout: walk
 * a cursor forward, dropping each item in the first position where its span
 * fits and nothing is occupied. Non-dense means the cursor never moves
 * backwards, which is what leaves the hole under a `row-span-2` cell.
 */
export function getLayoutGrid(layout: string | undefined, slotCount: number): LayoutGrid {
  const count = Math.max(0, Math.floor(slotCount));
  const columns = getColumnCount(layout, count);
  const occupied = new Set<string>();
  const placements: SlotPlacement[] = [];
  let cursorRow = 0;
  let cursorCol = 0;
  let maxRow = 0;

  const isFree = (row: number, col: number, colSpan: number, rowSpan: number) => {
    for (let r = row; r < row + rowSpan; r += 1) {
      for (let c = col; c < col + colSpan; c += 1) {
        if (occupied.has(`${r}:${c}`)) return false;
      }
    }
    return true;
  };

  for (let index = 0; index < count; index += 1) {
    const { colSpan: rawColSpan, rowSpan } = getSlotSpan(layout, index, count);
    const colSpan = Math.min(rawColSpan, columns);

    while (cursorCol + colSpan > columns || !isFree(cursorRow, cursorCol, colSpan, rowSpan)) {
      cursorCol += 1;
      if (cursorCol + colSpan > columns) {
        cursorCol = 0;
        cursorRow += 1;
      }
    }

    for (let r = cursorRow; r < cursorRow + rowSpan; r += 1) {
      for (let c = cursorCol; c < cursorCol + colSpan; c += 1) {
        occupied.add(`${r}:${c}`);
      }
    }
    placements.push({ col: cursorCol, row: cursorRow, colSpan, rowSpan });
    maxRow = Math.max(maxRow, cursorRow + rowSpan - 1);

    cursorCol += colSpan;
    if (cursorCol >= columns) {
      cursorCol = 0;
      cursorRow += 1;
    }
  }

  return { columns, rows: count === 0 ? 0 : maxRow + 1, placements };
}

/** Equal-width tracks separated by `gap`, matching a CSS `grid-cols-N gap-x`. */
export function computeColumnWidths(contentWidth: number, columns: number, gap: number): number[] {
  if (columns <= 0) return [];
  const usable = contentWidth - gap * (columns - 1);
  const width = usable / columns;
  return Array.from({ length: columns }, () => width);
}

function spanExtent(sizes: number[], start: number, span: number, gap: number): number {
  let total = 0;
  for (let i = start; i < start + span && i < sizes.length; i += 1) {
    total += sizes[i];
  }
  return total + gap * Math.max(0, Math.min(span, sizes.length - start) - 1);
}

function spanOffset(sizes: number[], index: number, gap: number): number {
  let total = 0;
  for (let i = 0; i < index && i < sizes.length; i += 1) {
    total += sizes[i] + gap;
  }
  return total;
}

/**
 * Row heights for a panel.
 *
 * When the panel has an authored aspect ratio (tall/wide/full/custom) the whole
 * grid box is height-constrained, so rows split it evenly. Otherwise the panel
 * is as tall as its art: each row takes the tallest image it holds, rendered at
 * that slot's width — which is how the browser resolves auto rows of
 * intrinsically-sized images.
 */
export function computeRowHeights(params: {
  grid: LayoutGrid;
  columnWidths: number[];
  gap: number;
  /** Per-slot natural aspect (width / height); null when the image is missing. */
  naturalAspects: (number | null)[];
  /** Fixed total content height when the panel's sizing pins an aspect ratio. */
  totalHeight?: number | null;
  /** Aspect used for empty slots — matches the reader's `aspect-[3/4]` placeholder. */
  fallbackAspect?: number;
}): number[] {
  const { grid, columnWidths, gap, naturalAspects, totalHeight, fallbackAspect = 3 / 4 } = params;
  if (grid.rows <= 0) return [];

  if (totalHeight != null) {
    const usable = totalHeight - gap * (grid.rows - 1);
    const height = Math.max(0, usable / grid.rows);
    return Array.from({ length: grid.rows }, () => height);
  }

  const heights = Array.from({ length: grid.rows }, () => 0);

  // Single-row slots set their row's height directly.
  grid.placements.forEach((placement, index) => {
    if (placement.rowSpan !== 1) return;
    const aspect = naturalAspects[index] ?? fallbackAspect;
    const width = spanExtent(columnWidths, placement.col, placement.colSpan, gap);
    heights[placement.row] = Math.max(heights[placement.row], width / aspect);
  });

  // Rows made up entirely of spanning slots still need a starting height.
  const columnWidth = columnWidths[0] ?? 0;
  for (let row = 0; row < grid.rows; row += 1) {
    if (heights[row] === 0) heights[row] = columnWidth / fallbackAspect;
  }

  // Then grow rows so multi-row slots are not crushed.
  grid.placements.forEach((placement, index) => {
    if (placement.rowSpan <= 1) return;
    const aspect = naturalAspects[index] ?? fallbackAspect;
    const width = spanExtent(columnWidths, placement.col, placement.colSpan, gap);
    const required = width / aspect;
    const available = spanExtent(heights, placement.row, placement.rowSpan, gap);
    if (required > available) {
      const lastRow = Math.min(placement.row + placement.rowSpan - 1, heights.length - 1);
      heights[lastRow] += required - available;
    }
  });

  return heights;
}

/** Absolute rect for every slot, in the same order as the frames. */
export function computeSlotRects(params: {
  grid: LayoutGrid;
  columnWidths: number[];
  rowHeights: number[];
  gap: number;
  origin?: { x: number; y: number };
}): Rect[] {
  const { grid, columnWidths, rowHeights, gap, origin = { x: 0, y: 0 } } = params;
  return grid.placements.map((placement) => ({
    x: origin.x + spanOffset(columnWidths, placement.col, gap),
    y: origin.y + spanOffset(rowHeights, placement.row, gap),
    width: spanExtent(columnWidths, placement.col, placement.colSpan, gap),
    height: spanExtent(rowHeights, placement.row, placement.rowSpan, gap),
  }));
}

// ── Panel sizing ────────────────────────────────────────────

/**
 * The aspect ratio (width / height) a panel's `sizing` pins its grid box to,
 * or null for "standard" (grow to the art).
 */
export function getPanelAspect(sizing: string | undefined, aspectRatio: string | null | undefined): number | null {
  if (sizing === "tall") return 9 / 16;
  if (sizing === "wide") return 16 / 9;
  // "full" ≈ one phone viewport tall — the same ratio the editor and reader use.
  if (sizing === "full") return 9 / 19.5;
  if (sizing === "custom" && aspectRatio) {
    const [w, h] = aspectRatio.split(":").map(Number);
    if (w && h && Number.isFinite(w) && Number.isFinite(h)) return w / h;
  }
  return null;
}

/** Panel padding and inter-frame gutter for each border style, at export scale. */
export function getBorderMetrics(borderStyle: string | undefined, scale: number): { padding: number; gap: number } {
  if (borderStyle === "black") return { padding: 4 * scale, gap: 4 * scale };
  if (borderStyle === "light") return { padding: 1 * scale, gap: 4 * scale };
  return { padding: 0, gap: 0 };
}

// ── Fit / cropping ──────────────────────────────────────────

/**
 * Source-crop and destination rects for drawing an image into a slot.
 * `cover` crops to fill from the centre, `top` crops to fill but anchors the
 * top edge (the fit that keeps faces in frame), `contain` letterboxes.
 */
export function computeFitRect(
  fit: string | undefined,
  source: { width: number; height: number },
  dest: Rect
): DrawRect {
  const sw = source.width;
  const sh = source.height;
  if (!(sw > 0) || !(sh > 0) || !(dest.width > 0) || !(dest.height > 0)) {
    return { sx: 0, sy: 0, sw: Math.max(sw, 0), sh: Math.max(sh, 0), dx: dest.x, dy: dest.y, dw: dest.width, dh: dest.height };
  }

  if (fit === "contain") {
    const scale = Math.min(dest.width / sw, dest.height / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    return {
      sx: 0,
      sy: 0,
      sw,
      sh,
      dx: dest.x + (dest.width - dw) / 2,
      dy: dest.y + (dest.height - dh) / 2,
      dw,
      dh,
    };
  }

  const scale = Math.max(dest.width / sw, dest.height / sh);
  const visibleW = dest.width / scale;
  const visibleH = dest.height / scale;
  return {
    sx: (sw - visibleW) / 2,
    sy: fit === "top" ? 0 : (sh - visibleH) / 2,
    sw: visibleW,
    sh: visibleH,
    dx: dest.x,
    dy: dest.y,
    dw: dest.width,
    dh: dest.height,
  };
}

// ── Seams ───────────────────────────────────────────────────

/**
 * Seam margins in reference pixels — the Tailwind classes the seam module
 * applies above a panel (mt-4 / mt-12 / mt-24 / mt-44).
 */
export const SEAM_BASE_HEIGHT: Record<Seam, number> = {
  none: 0,
  beat: 16,
  pause: 48,
  breath: 96,
  blackout: 176,
};

export function normalizeSeam(value: string | null | undefined): Seam {
  return value === "beat" || value === "pause" || value === "breath" || value === "blackout" ? value : "none";
}

/** Height of the gap above a panel. The first panel of a strip never has one. */
export function getSeamHeight(seam: string | null | undefined, scale: number, isFirst = false): number {
  if (isFirst) return 0;
  return Math.round(SEAM_BASE_HEIGHT[normalizeSeam(seam)] * scale);
}

// ── Slicing ─────────────────────────────────────────────────

export interface SliceRange {
  /** Index of the first block in the slice. */
  startIndex: number;
  /** Index one past the last block in the slice. */
  endIndex: number;
  /** Offset of the slice within the full strip. */
  y: number;
  height: number;
}

/**
 * Split a strip into canvas-sized parts. Browsers refuse to allocate canvases
 * past roughly 16k pixels tall, so a long episode has to become several PNGs —
 * always cut between panels, never through one. A single block taller than the
 * limit gets its own (oversized) slice rather than being split.
 */
export function computeSlices(blockHeights: number[], maxSliceHeight: number): SliceRange[] {
  const limit = maxSliceHeight > 0 ? maxSliceHeight : Infinity;
  const slices: SliceRange[] = [];
  let y = 0;
  let current: SliceRange | null = null;

  blockHeights.forEach((height, index) => {
    if (current && current.height + height > limit) {
      slices.push(current);
      current = null;
    }
    if (!current) {
      current = { startIndex: index, endIndex: index + 1, y, height };
    } else {
      current.endIndex = index + 1;
      current.height += height;
    }
    y += height;
  });

  if (current) slices.push(current);
  return slices;
}

// ── Text ────────────────────────────────────────────────────

/**
 * Greedy word wrap against a measuring function (the caller supplies one bound
 * to a canvas context, or a stub in tests). Explicit newlines are kept, and a
 * word too long for the line is broken by character rather than overflowing.
 */
export function wrapText(text: string, maxWidth: number, measure: MeasureText): string[] {
  if (!text) return [];
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of words) {
      if (measure(word) > maxWidth) {
        // A word too long for the line: break it by character rather than
        // letting it bleed out of the bubble.
        if (line) {
          lines.push(line);
          line = "";
        }
        let chunk = "";
        for (const char of word) {
          if (chunk && measure(chunk + char) > maxWidth) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        line = chunk;
        continue;
      }

      const candidate = line ? `${line} ${word}` : word;
      if (!line || measure(candidate) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

// ── Overlays ────────────────────────────────────────────────

/**
 * Lettering sizes are container-query based: `clamp(min, Ncqw, max)` against
 * the panel's width, so a bubble is proportional to the art it sits on rather
 * than a fixed pixel size. The author's `scale` multiplies the clamped result,
 * and the rest of the bubble's geometry is expressed in em, so scaling the
 * font scales the whole drawn object.
 */
export const OVERLAY_FONT_SIZING: Record<OverlayFontSize, { min: number; cqw: number; max: number }> = {
  small: { min: 9, cqw: 1.2615, max: 20 },
  medium: { min: 11, cqw: 1.6055, max: 26 },
  large: { min: 14, cqw: 2.0642, max: 34 },
};

export function getOverlayFontPx(
  fontSize: string | undefined,
  containerWidth: number,
  scale = 1
): number {
  const key: OverlayFontSize = fontSize === "small" || fontSize === "large" ? fontSize : "medium";
  const { min, cqw, max } = OVERLAY_FONT_SIZING[key];
  const base = Math.min(max, Math.max(min, (cqw / 100) * containerWidth));
  return base * (scale > 0 ? scale : 1);
}

/**
 * Where a bubble sits inside its panel. `x`/`y` are percentages of the panel
 * box and address the bubble's *centre* (the CSS uses
 * `transform: translate(-50%, -50%)`), and `width` is a percentage of the panel
 * width including padding, since the app is border-box. `scale` does not enter
 * here — it changes the font, and through it the em-based height and padding
 * the caller has already measured.
 */
export function computeOverlayBox(
  overlay: { x?: number; y?: number; width?: number },
  panel: Rect,
  metrics: { contentHeight: number; minWidth: number; minHeight: number }
): Rect {
  const width = Math.max((clampPercent(toPercent(overlay.width, 30), 1) / 100) * panel.width, metrics.minWidth);
  const height = Math.max(metrics.contentHeight, metrics.minHeight);
  const cx = panel.x + (toPercent(overlay.x, 50) / 100) * panel.width;
  const cy = panel.y + (toPercent(overlay.y, 50) / 100) * panel.height;
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

function toPercent(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampPercent(value: number, min: number): number {
  return Math.min(100, Math.max(min, value));
}
