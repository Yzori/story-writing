/**
 * Export a webtoon episode as a vertical image strip (client-side only).
 *
 * Redraws the panels the reader shows — layout grid, per-frame fit, borders,
 * seams, captions and lettering — onto an offscreen canvas and hands back PNG
 * blobs. Browsers refuse very tall canvases, so a long episode comes back as
 * several sequential parts cut at panel boundaries.
 *
 * All the arithmetic lives in `webtoon-export-math.ts` (unit-tested there);
 * this module owns the 2D context and the drawing.
 */

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
  wrapText,
  type Rect,
} from "@/lib/webtoon-export-math";
import { parseOverlays as parseOverlayJson, type TextOverlay } from "@/types/editor";

// ── Input shapes ────────────────────────────────────────────

/**
 * A panel as stored. Everything is optional and read defensively — legacy
 * panels predate `frames`/`layout`/`seam`, and `frames`/`overlays` may arrive
 * as JSON strings (from the API) or already parsed (from editor state).
 */
export interface WebtoonExportPanel {
  id?: string;
  sortOrder?: number;
  imageData?: string | null;
  caption?: string | null;
  sizing?: string | null;
  layout?: string | null;
  frames?: string | unknown[] | null;
  borderStyle?: string | null;
  imageFit?: string | null;
  aspectRatio?: string | null;
  overlays?: string | unknown[] | null;
  seam?: string | null;
}

export interface WebtoonExportOptions {
  /** Output width in pixels (default 800). */
  width?: number;
  /** Cut the strip into parts once a part would exceed this height (default 8000). */
  maxSliceHeight?: number;
  /** Strip background, behind seams and letterboxed art (default the dark reader background). */
  background?: string;
  /** Draw panel captions under the art (default true). */
  includeCaptions?: boolean;
  /** Draw speech bubbles and lettering (default true). */
  includeOverlays?: boolean;
  /** Draw a placeholder block for a slot with no art (default true). */
  showEmptyFrames?: boolean;
  /** Blob mime type (default "image/png"). */
  type?: string;
  /** Blob quality for lossy types. */
  quality?: number;
  signal?: AbortSignal;
}

export interface WebtoonExportResult {
  blobs: Blob[];
  width: number;
  totalHeight: number;
  sliceCount: number;
}

export const WEBTOON_EXPORT_DEFAULTS = {
  width: 800,
  maxSliceHeight: 8000,
  background: "#090B12",
  type: "image/png",
} as const;

// ── Palette ─────────────────────────────────────────────────

const COLORS = {
  placeholderFill: "#12141C",
  placeholderStroke: "rgba(255, 255, 255, 0.08)",
  blackGutter: "#000000",
  /** The reader's `light` gutter reads as a pale comic gutter in an exported image. */
  lightGutter: "#EDE9E0",
  lightCell: "#19223B",
  captionText: "#94948A",
};

interface BubblePalette {
  fill: string;
  text: string;
  line: string;
}

/** Each bubble style's own palette, mirroring the `--bubble-*` CSS variables. */
const STYLE_PALETTE: Record<string, BubblePalette> = {
  speech: { fill: "#ffffff", text: "#1a1a1a", line: "#222222" },
  thought: { fill: "#ffffff", text: "#1a1a1a", line: "#222222" },
  narration: { fill: "rgba(0, 0, 0, 0.8)", text: "#f0f0f0", line: "rgba(255, 255, 255, 0.15)" },
  shout: { fill: "#fffbe6", text: "#1a1a1a", line: "#222222" },
  caption: { fill: "#fdf6e3", text: "#1a1a1a", line: "#222222" },
  // SFX draws its letters in the fill and outlines them in the line.
  sfx: { fill: "#ffd83d", text: "#1a1a1a", line: "#1a1a1a" },
};

/** The named lettering schemes an author can pick; they repaint all three. */
const INK_SCHEMES: Record<string, BubblePalette> = {
  paper: { fill: "#fbf8f0", text: "#141826", line: "#141826" },
  ink: { fill: "#141826", text: "#f4f0e2", line: "#f4f0e2" },
  gold: { fill: "#e8b23f", text: "#231806", line: "#231806" },
  rose: { fill: "#e9909f", text: "#2e0c15", line: "#2e0c15" },
  teal: { fill: "#7fcfc9", text: "#06231f", line: "#06231f" },
};

function getBubblePalette(style: string, ink: string | undefined): BubblePalette {
  const base = STYLE_PALETTE[style] ?? STYLE_PALETTE.speech;
  if (!ink) return base;
  // The "ink" scheme would put a near-black word on dark art, so SFX swaps to
  // the cream — the same exception the stylesheet makes.
  if (style === "sfx" && ink === "ink") return { fill: "#f4f0e2", text: "#f4f0e2", line: "#141826" };
  return INK_SCHEMES[ink] ?? base;
}

const FONT_COMIC = '"Comic Sans MS", "Chalkboard SE", sans-serif';
const FONT_READING = 'Literata, Georgia, "Times New Roman", serif';
const FONT_IMPACT = 'Impact, "Arial Black", sans-serif';

// ── Normalized internals ────────────────────────────────────

interface Frame {
  id: string;
  imageData: string;
  fit?: string;
}

interface PanelPlan {
  seamHeight: number;
  /** Solid black band instead of empty space, for the "blackout" seam. */
  seamBlackout: boolean;
  panelHeight: number;
  blockHeight: number;
  padding: number;
  gap: number;
  borderStyle: string;
  gridRect: Rect;
  slotRects: Rect[];
  frames: Frame[];
  overlays: TextOverlay[];
  captionLines: string[];
  captionRect: Rect | null;
  captionFontPx: number;
  captionLineHeight: number;
}

// ── Parsing helpers ─────────────────────────────────────────

function asArray(value: string | unknown[] | null | undefined): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim() || value === "[]") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseFrames(panel: WebtoonExportPanel): Frame[] {
  const raw = asArray(panel.frames);
  if (raw.length > 0) {
    return raw.map((entry, index) => {
      const frame = (entry ?? {}) as Record<string, unknown>;
      const fit = frame.fit;
      return {
        id: typeof frame.id === "string" ? frame.id : `frame-${index + 1}`,
        imageData: typeof frame.imageData === "string" ? frame.imageData : "",
        fit: fit === "cover" || fit === "contain" || fit === "top" ? fit : undefined,
      };
    });
  }
  return panel.imageData ? [{ id: "frame-1", imageData: panel.imageData }] : [];
}

/**
 * Reuse the app's own overlay sanitizer so the export clamps and whitelists
 * exactly like the renderer does — including legacy rows with no ink/rotation.
 */
function parsePanelOverlays(panel: WebtoonExportPanel): TextOverlay[] {
  const raw = panel.overlays;
  if (!raw) return [];
  return parseOverlayJson(typeof raw === "string" ? raw : JSON.stringify(raw));
}

// ── Image loading ───────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadImages(sources: string[]): Promise<Map<string, HTMLImageElement | null>> {
  const unique = Array.from(new Set(sources.filter(Boolean)));
  const loaded = await Promise.all(unique.map((src) => loadImage(src)));
  const map = new Map<string, HTMLImageElement | null>();
  unique.forEach((src, i) => map.set(src, loaded[i]));
  return map;
}

// ── Canvas plumbing ─────────────────────────────────────────

function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document === "undefined") {
    throw new Error("exportWebtoonStrip can only run in the browser.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context for the export.");
  return ctx;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas could not be encoded as an image."))),
      type,
      quality
    );
  });
}

function roundedRectPath(ctx: CanvasRenderingContext2D, rect: Rect, radius: number) {
  const r = Math.max(0, Math.min(radius, rect.width / 2, rect.height / 2));
  ctx.beginPath();
  ctx.moveTo(rect.x + r, rect.y);
  ctx.lineTo(rect.x + rect.width - r, rect.y);
  ctx.quadraticCurveTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + r);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height - r);
  ctx.quadraticCurveTo(rect.x + rect.width, rect.y + rect.height, rect.x + rect.width - r, rect.y + rect.height);
  ctx.lineTo(rect.x + r, rect.y + rect.height);
  ctx.quadraticCurveTo(rect.x, rect.y + rect.height, rect.x, rect.y + rect.height - r);
  ctx.lineTo(rect.x, rect.y + r);
  ctx.quadraticCurveTo(rect.x, rect.y, rect.x + r, rect.y);
  ctx.closePath();
}

function ellipsePath(ctx: CanvasRenderingContext2D, rect: Rect) {
  ctx.beginPath();
  ctx.ellipse(
    rect.x + rect.width / 2,
    rect.y + rect.height / 2,
    rect.width / 2,
    rect.height / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.closePath();
}

function inflate(rect: Rect, widthFactor: number, heightFactor: number): Rect {
  const width = rect.width * widthFactor;
  const height = rect.height * heightFactor;
  return {
    x: rect.x - (width - rect.width) / 2,
    y: rect.y - (height - rect.height) / 2,
    width,
    height,
  };
}

function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string, stroke: string, lineWidth: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

// ── Planning ────────────────────────────────────────────────

function planPanel(
  panel: WebtoonExportPanel,
  index: number,
  images: Map<string, HTMLImageElement | null>,
  measureCtx: CanvasRenderingContext2D,
  opts: Required<Pick<WebtoonExportOptions, "width" | "includeCaptions" | "includeOverlays">> & { scale: number }
): PanelPlan {
  const { width, scale } = opts;
  const borderStyle = panel.borderStyle ?? "none";
  const { padding, gap } = getBorderMetrics(borderStyle, scale);

  const allFrames = parseFrames(panel);
  const slotCount = Math.max(
    1,
    Math.min(allFrames.length || 1, getLayoutSlotCount(panel.layout ?? undefined, allFrames.length || 1))
  );
  const frames = Array.from({ length: slotCount }, (_, i) => allFrames[i] ?? { id: `frame-${i + 1}`, imageData: "" });

  const contentWidth = Math.max(1, width - padding * 2);
  const grid = getLayoutGrid(panel.layout ?? undefined, slotCount);
  const columnWidths = computeColumnWidths(contentWidth, grid.columns, gap);
  const aspect = getPanelAspect(panel.sizing ?? undefined, panel.aspectRatio);
  const naturalAspects = frames.map((frame) => {
    const img = images.get(frame.imageData);
    return img && img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : null;
  });
  const rowHeights = computeRowHeights({
    grid,
    columnWidths,
    gap,
    naturalAspects,
    totalHeight: aspect ? contentWidth / aspect : null,
  });
  const gridHeight = rowHeights.reduce((sum, h) => sum + h, 0) + gap * Math.max(0, grid.rows - 1);
  const gridRect: Rect = { x: padding, y: padding, width: contentWidth, height: gridHeight };
  const slotRects = computeSlotRects({
    grid,
    columnWidths,
    rowHeights,
    gap,
    origin: { x: padding, y: padding },
  });

  // Caption band, measured with the font it will be drawn in.
  const captionFontPx = 14 * scale;
  const captionLineHeight = captionFontPx * 1.625;
  const captionPadX = 16 * scale;
  const captionPadY = 12 * scale;
  const captionText = opts.includeCaptions ? (panel.caption ?? "").trim() : "";
  let captionLines: string[] = [];
  let captionRect: Rect | null = null;
  if (captionText) {
    measureCtx.font = `italic ${captionFontPx}px ${FONT_READING}`;
    captionLines = wrapText(captionText, width - captionPadX * 2, (t) => measureCtx.measureText(t).width);
    captionRect = {
      x: 0,
      y: padding * 2 + gridHeight,
      width,
      height: captionLines.length * captionLineHeight + captionPadY * 2,
    };
  }

  const panelHeight = padding * 2 + gridHeight + (captionRect?.height ?? 0);
  const seamHeight = getSeamHeight(panel.seam, scale, index === 0);

  return {
    seamHeight,
    seamBlackout: panel.seam === "blackout" && index > 0,
    panelHeight,
    blockHeight: seamHeight + panelHeight,
    padding,
    gap,
    borderStyle,
    gridRect,
    slotRects,
    frames,
    overlays: opts.includeOverlays ? parsePanelOverlays(panel) : [],
    captionLines,
    captionRect,
    captionFontPx,
    captionLineHeight,
  };
}

// ── Drawing ─────────────────────────────────────────────────

function drawPanel(
  ctx: CanvasRenderingContext2D,
  plan: PanelPlan,
  top: number,
  images: Map<string, HTMLImageElement | null>,
  opts: { width: number; scale: number; background: string; showEmptyFrames: boolean; defaultFit?: string }
) {
  const { width, scale, background } = opts;

  // Border style paints the panel's padding and gutters.
  if (plan.borderStyle === "black" || plan.borderStyle === "light") {
    ctx.fillStyle = plan.borderStyle === "black" ? COLORS.blackGutter : COLORS.lightGutter;
    ctx.fillRect(0, top, width, plan.panelHeight);
  }

  plan.slotRects.forEach((rect, i) => {
    const slot: Rect = { ...rect, y: rect.y + top };
    const frame = plan.frames[i];
    const img = frame ? images.get(frame.imageData) ?? null : null;

    if (plan.borderStyle === "light") {
      ctx.fillStyle = COLORS.lightCell;
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
    } else if (plan.borderStyle === "black") {
      ctx.fillStyle = COLORS.blackGutter;
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
    }

    if (!img) {
      if (opts.showEmptyFrames) drawPlaceholder(ctx, slot, scale);
      return;
    }

    // `contain` letterboxes, so the slot needs a backing colour first.
    const fit = frame?.fit ?? opts.defaultFit;
    if (fit === "contain" && plan.borderStyle === "none") {
      ctx.fillStyle = background;
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
    }

    const d = computeFitRect(fit, { width: img.naturalWidth, height: img.naturalHeight }, slot);
    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.width, slot.height);
    ctx.clip();
    ctx.drawImage(img, d.sx, d.sy, d.sw, d.sh, d.dx, d.dy, d.dw, d.dh);
    ctx.restore();
  });

  if (plan.captionRect && plan.captionLines.length > 0) {
    const rect = plan.captionRect;
    ctx.fillStyle = background;
    ctx.fillRect(rect.x, rect.y + top, rect.width, rect.height);
    ctx.fillStyle = COLORS.captionText;
    ctx.font = `italic ${plan.captionFontPx}px ${FONT_READING}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    plan.captionLines.forEach((line, i) => {
      ctx.fillText(line, rect.x + rect.width / 2, rect.y + top + 12 * scale + (i + 0.5) * plan.captionLineHeight);
    });
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  if (plan.overlays.length > 0) {
    const panelBox: Rect = { x: 0, y: top, width, height: plan.panelHeight };
    plan.overlays.forEach((overlay) => drawOverlay(ctx, overlay, panelBox));
  }
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, slot: Rect, scale: number) {
  ctx.fillStyle = COLORS.placeholderFill;
  ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
  ctx.strokeStyle = COLORS.placeholderStroke;
  ctx.lineWidth = Math.max(1, scale);
  const inset = 6 * scale;
  ctx.strokeRect(slot.x + inset, slot.y + inset, Math.max(0, slot.width - inset * 2), Math.max(0, slot.height - inset * 2));
}

function bubbleFont(style: string, fontPx: number): string {
  switch (style) {
    case "thought":
      return `italic ${fontPx}px ${FONT_COMIC}`;
    case "narration":
      return `italic ${fontPx}px ${FONT_READING}`;
    case "caption":
      return `${fontPx}px ${FONT_READING}`;
    case "shout":
      return `800 ${fontPx}px ${FONT_IMPACT}`;
    case "sfx":
      return `900 ${fontPx}px ${FONT_IMPACT}`;
    default:
      return `${fontPx}px ${FONT_COMIC}`;
  }
}

/**
 * Draw one bubble. Bubble geometry is em-based in CSS, so everything here is a
 * multiple of the computed font size — that is what makes a bubble scale as one
 * drawn object when the author scales it or the export width changes.
 */
function drawOverlay(ctx: CanvasRenderingContext2D, overlay: TextOverlay, panel: Rect) {
  const text = overlay.style === "shout" || overlay.style === "sfx" ? overlay.text.toUpperCase() : overlay.text;
  if (!text.trim()) return;

  const em = getOverlayFontPx(overlay.fontSize, panel.width, overlay.scale ?? 1);
  const padX = 0.86 * em;
  const padY = 0.57 * em;
  const lineHeight = 1.4 * em;
  const palette = getBubblePalette(overlay.style, overlay.ink);

  ctx.save();
  ctx.font = bubbleFont(overlay.style, em);
  setLetterSpacing(ctx, overlay.style, em);

  const boxWidth = Math.max((overlay.width / 100) * panel.width, 2.86 * em);
  const lines = wrapText(text, Math.max(1, boxWidth - padX * 2), (t) => ctx.measureText(t).width);
  const box = computeOverlayBox(overlay, panel, {
    contentHeight: lines.length * lineHeight + padY * 2,
    minWidth: 2.86 * em,
    minHeight: 1.71 * em,
  });

  // SFX leans by default in the stylesheet; an authored rotation wins over that.
  const rotation = overlay.rotation ?? (overlay.style === "sfx" ? -4 : 0);
  if (rotation) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  switch (overlay.style) {
    case "thought": {
      // The stylesheet rounds a box (`border-radius: 50% / 40%`) rather than
      // drawing a true ellipse, so an ellipse tight to the text box would clip
      // it. Inflate the oval until the text sits comfortably inside.
      const oval = inflate(box, 1.3, 1.4);
      ellipsePath(ctx, oval);
      ctx.fillStyle = palette.fill;
      ctx.fill();
      ctx.lineWidth = Math.max(1, 0.14 * em);
      ctx.strokeStyle = palette.line;
      ctx.stroke();
      drawThoughtDots(ctx, oval, overlay.tailDirection, em, palette);
      break;
    }
    case "narration": {
      roundedRectPath(ctx, box, 0.29 * em);
      ctx.fillStyle = palette.fill;
      ctx.fill();
      ctx.lineWidth = overlay.ink ? Math.max(1, 0.1 * em) : Math.max(1, 0.07 * em);
      ctx.strokeStyle = palette.line;
      ctx.stroke();
      break;
    }
    case "caption": {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(box.x + 0.14 * em, box.y + 0.14 * em, box.width, box.height);
      roundedRectPath(ctx, box, 0.14 * em);
      ctx.fillStyle = palette.fill;
      ctx.fill();
      ctx.lineWidth = Math.max(1, 0.14 * em);
      ctx.strokeStyle = palette.line;
      ctx.stroke();
      break;
    }
    case "shout": {
      ctx.fillStyle = palette.line;
      ctx.fillRect(box.x + 0.21 * em, box.y + 0.21 * em, box.width, box.height);
      roundedRectPath(ctx, box, 0.29 * em);
      ctx.fillStyle = palette.fill;
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, 0.21 * em);
      ctx.strokeStyle = palette.line;
      ctx.stroke();
      drawTail(ctx, box, overlay.tailDirection, palette, em, { half: 0.71, height: 1.14, inset: 0.15 });
      break;
    }
    case "sfx": {
      drawSfxText(ctx, lines, box, lineHeight, em, palette);
      ctx.restore();
      return;
    }
    default: {
      roundedRectPath(ctx, box, 1.29 * em);
      ctx.fillStyle = palette.fill;
      ctx.fill();
      ctx.lineWidth = Math.max(1, 0.14 * em);
      ctx.strokeStyle = palette.line;
      ctx.stroke();
      drawTail(ctx, box, overlay.tailDirection, palette, em, { half: 0.57, height: 1, inset: 0.18 });
      break;
    }
  }

  ctx.fillStyle = palette.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const firstLineY = box.y + (box.height - lines.length * lineHeight) / 2 + lineHeight / 2;
  lines.forEach((l, i) => ctx.fillText(l, box.x + box.width / 2, firstLineY + i * lineHeight));
  ctx.restore();
}

/** Shout and SFX letter-space their lettering; the rest do not. */
function setLetterSpacing(ctx: CanvasRenderingContext2D, style: string, em: number) {
  if (!("letterSpacing" in ctx)) return;
  const spacing = style === "shout" ? 0.04 : style === "sfx" ? 0.06 : 0;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing * em}px`;
}

/** SFX has no bubble: the letters themselves are the object — filled, outlined, dropped. */
function drawSfxText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  box: Rect,
  lineHeight: number,
  em: number,
  palette: BubblePalette
) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = box.x + box.width / 2;
  const firstLineY = box.y + (box.height - lines.length * lineHeight) / 2 + lineHeight / 2;
  lines.forEach((l, i) => {
    const y = firstLineY + i * lineHeight;
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillText(l, cx + 0.21 * em, y + 0.21 * em);
    // `-webkit-text-stroke` centres the stroke on the glyph edge; canvas
    // strokes outside it, so double the width to land in the same place.
    ctx.lineWidth = Math.max(1, 0.14 * em) * 2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = palette.line;
    ctx.strokeText(l, cx, y);
    ctx.fillStyle = palette.fill;
    ctx.fillText(l, cx, y);
  });
}

function drawTail(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  direction: string,
  palette: BubblePalette,
  em: number,
  shape: { half: number; height: number; inset: number }
) {
  if (direction !== "bottom-left" && direction !== "bottom-right" && direction !== "top-left" && direction !== "top-right") {
    return;
  }
  const fill = palette.fill;
  const stroke = palette.line;
  const scale = em / 14;
  const halfWidth = shape.half * em;
  const height = shape.height * em;
  const isBottom = direction.startsWith("bottom");
  const isLeft = direction.endsWith("left");
  const anchorX = isLeft
    ? box.x + box.width * shape.inset + halfWidth
    : box.x + box.width * (1 - shape.inset) - halfWidth;
  const baseY = isBottom ? box.y + box.height : box.y;
  const tipY = isBottom ? baseY + height : baseY - height;

  ctx.beginPath();
  ctx.moveTo(anchorX - halfWidth, baseY);
  ctx.lineTo(anchorX + halfWidth, baseY);
  ctx.lineTo(anchorX, tipY);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1, 0.14 * em);
  ctx.strokeStyle = stroke;
  ctx.stroke();

  // Hide the seam where the tail meets the bubble body.
  ctx.beginPath();
  ctx.moveTo(anchorX - halfWidth + scale, baseY);
  ctx.lineTo(anchorX + halfWidth - scale, baseY);
  ctx.strokeStyle = fill;
  ctx.lineWidth = Math.max(2, 0.2 * em);
  ctx.stroke();
}

/** Trailing dots, walked outwards from the oval's edge so they read as a tail. */
function drawThoughtDots(
  ctx: CanvasRenderingContext2D,
  oval: Rect,
  direction: string,
  em: number,
  palette: BubblePalette
) {
  if (direction === "none" || !direction) return;
  const isBottom = direction.startsWith("bottom");
  const isLeft = direction.endsWith("left");
  const dir = isBottom ? 1 : -1;
  const away = isLeft ? -1 : 1;

  const cx = oval.x + oval.width / 2;
  const cy = oval.y + oval.height / 2;
  const rx = oval.width / 2;
  const ry = oval.height / 2;
  const x = oval.x + oval.width * (isLeft ? 0.2 : 0.8);
  const normalized = rx > 0 ? (x - cx) / rx : 0;
  const edgeY = cy + dir * ry * Math.sqrt(Math.max(0, 1 - normalized * normalized));
  const border = Math.max(1, 0.14 * em);

  circle(ctx, x, edgeY + dir * 0.25 * em, 0.42 * em, palette.fill, palette.line, border);
  circle(ctx, x + away * 0.6 * em, edgeY + dir * 1.15 * em, 0.28 * em, palette.fill, palette.line, border);
}

// ── Entry point ─────────────────────────────────────────────

/**
 * Compose the panels into one or more PNG blobs, top to bottom in sortOrder.
 * Inputs are never mutated.
 */
export async function exportWebtoonStrip(
  panels: readonly WebtoonExportPanel[],
  options: WebtoonExportOptions = {}
): Promise<WebtoonExportResult> {
  const width = Math.max(1, Math.round(options.width ?? WEBTOON_EXPORT_DEFAULTS.width));
  const maxSliceHeight = options.maxSliceHeight ?? WEBTOON_EXPORT_DEFAULTS.maxSliceHeight;
  const background = options.background ?? WEBTOON_EXPORT_DEFAULTS.background;
  const type = options.type ?? WEBTOON_EXPORT_DEFAULTS.type;
  const includeCaptions = options.includeCaptions ?? true;
  const includeOverlays = options.includeOverlays ?? true;
  const showEmptyFrames = options.showEmptyFrames ?? true;
  const scale = width / REFERENCE_WIDTH;

  const ordered = [...panels].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (ordered.length === 0) {
    return { blobs: [], width, totalHeight: 0, sliceCount: 0 };
  }

  const sources = ordered.flatMap((panel) => parseFrames(panel).map((frame) => frame.imageData));
  const images = await loadImages(sources);
  throwIfAborted(options.signal);

  const measureCanvas = createCanvas(1, 1);
  const measureCtx = getContext(measureCanvas);

  const plans = ordered.map((panel, index) =>
    planPanel(panel, index, images, measureCtx, { width, scale, includeCaptions, includeOverlays })
  );

  const slices = computeSlices(plans.map((plan) => plan.blockHeight), maxSliceHeight);
  const totalHeight = plans.reduce((sum, plan) => sum + plan.blockHeight, 0);

  const blobs: Blob[] = [];
  for (const slice of slices) {
    throwIfAborted(options.signal);
    const canvas = createCanvas(width, slice.height);
    const ctx = getContext(canvas);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 0;
    for (let i = slice.startIndex; i < slice.endIndex; i += 1) {
      const plan = plans[i];
      if (plan.seamHeight > 0) {
        if (plan.seamBlackout) {
          ctx.fillStyle = COLORS.blackGutter;
          ctx.fillRect(0, y, width, plan.seamHeight);
        }
        y += plan.seamHeight;
      }
      drawPanel(ctx, plan, y, images, {
        width,
        scale,
        background,
        showEmptyFrames,
        defaultFit: ordered[i].imageFit ?? undefined,
      });
      y += plan.panelHeight;
    }

    blobs.push(await toBlob(canvas, type, options.quality));
    // Free the backing store early — a strip can be several huge canvases.
    canvas.width = 1;
    canvas.height = 1;
  }

  return { blobs, width, totalHeight, sliceCount: blobs.length };
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
}
