"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { compressImage } from "@/client/images";
import { parseOverlays, createTextOverlay } from "@/types/editor";
import type { TextOverlay } from "@/types/editor";
import { getSeamClass, nextSeam, normalizeSeam, SEAM_LABELS, SEAM_ORDER } from "./webtoon-seam";
import WebtoonReader from "@/components/reader/WebtoonReader";
import OverlayRenderer from "./OverlayRenderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Panel {
  id: string;
  imageData: string;
  caption: string;
  sortOrder: number;
  sizing: string;
  layout: string;
  frames: string;
  borderStyle: string;
  imageFit: string;
  aspectRatio: string | null;
  overlays: string;
  seam?: string;
  /** Server clock of the last save — the optimistic-lock base for PATCHes. */
  updatedAt?: string;
}

interface PanelFrame {
  id: string;
  imageData: string;
  fit?: PanelImageFit;
}

/**
 * Library entry as returned by the assets list API — metadata only. Thumbnails
 * stream from `/assets/[id]?raw=1`; the full base64 payload is fetched on
 * demand when an asset is dropped into a panel.
 */
interface StoryAsset {
  id: string;
  name: string;
}

type PanelSizing = "standard" | "tall" | "wide" | "custom" | "full";
type PanelLayout = "single" | "side-by-side" | "stack" | "top-pair-bottom" | "left-stack-right" | "grid-4" | "mosaic-5" | "grid-6";
type PanelBorderStyle = "none" | "black" | "light";
type PanelImageFit = "cover" | "contain" | "top";
type UploadMode = "frames" | "panels";

const SIZING_OPTIONS: { key: PanelSizing; label: string; ratio: string }[] = [
  { key: "standard", label: "Standard", ratio: "" },
  { key: "tall", label: "Tall", ratio: "9:16" },
  { key: "wide", label: "Wide", ratio: "16:9" },
  { key: "full", label: "Full screen", ratio: "9:19.5" },
  { key: "custom", label: "Custom", ratio: "" },
];

/** Parse "W:H" into two positive ints, or null if it isn't one. */
function parseAspectRatio(ratio: string | null): { w: number; h: number } | null {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(ratio ?? "");
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  return w > 0 && h > 0 ? { w, h } : null;
}

/** The W:H pair shown when a panel's shape is "Custom". */
function AspectRatioFields({ ratio, onChange }: { ratio: string | null; onChange: (ratio: string) => void }) {
  const parsed = parseAspectRatio(ratio) ?? { w: 4, h: 5 };
  const commit = (w: number, h: number) => {
    const cw = Math.min(99, Math.max(1, Math.round(w) || parsed.w));
    const ch = Math.min(99, Math.max(1, Math.round(h) || parsed.h));
    onChange(`${cw}:${ch}`);
  };
  const field =
    "h-8 w-14 rounded-md border border-border bg-surface px-2 text-center text-[12px] text-text outline-none transition-colors focus:border-amber/30";
  return (
    <div className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">Shape ratio</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={99}
          value={parsed.w}
          onChange={(e) => commit(Number(e.target.value), parsed.h)}
          className={field}
          aria-label="Width ratio"
        />
        <span className="text-[12px] text-text-ghost">:</span>
        <input
          type="number"
          min={1}
          max={99}
          value={parsed.h}
          onChange={(e) => commit(parsed.w, Number(e.target.value))}
          className={field}
          aria-label="Height ratio"
        />
        <span className="ml-1 text-[10.5px] text-text-ghost">width : height</span>
      </div>
    </div>
  );
}

const PANEL_LAYOUT_OPTIONS: { key: PanelLayout; label: string; minFrames: number }[] = [
  { key: "single", label: "1 frame", minFrames: 1 },
  { key: "side-by-side", label: "2 side", minFrames: 2 },
  { key: "stack", label: "Stack", minFrames: 2 },
  { key: "top-pair-bottom", label: "2 + 1", minFrames: 3 },
  { key: "left-stack-right", label: "1 + 2", minFrames: 3 },
  { key: "grid-4", label: "2 x 2", minFrames: 4 },
  { key: "mosaic-5", label: "2 + 3", minFrames: 5 },
  { key: "grid-6", label: "2 x 3", minFrames: 6 },
];

const PANEL_BORDER_OPTIONS: { key: PanelBorderStyle; label: string }[] = [
  { key: "none", label: "No gap" },
  { key: "black", label: "Black" },
  { key: "light", label: "Light" },
];

const IMAGE_FIT_OPTIONS: { key: PanelImageFit; label: string }[] = [
  { key: "cover", label: "Cover" },
  { key: "contain", label: "Fit" },
  { key: "top", label: "Top crop" },
];

interface WebtoonEditorProps {
  storyId: string;
  chapterId: string;
  editable?: boolean;
  placeholder?: string;
  scriptContent?: string;
  onScriptUpdate?: (content: string) => void;
  /** Parent's last script save failed — the message shows in the script pane header. */
  scriptSaveError?: string | null;
  onWordCountChange?: (count: number) => void;
  /**
   * Widen the panel board for the standalone webtoon route, which gives the
   * comic its own full-bleed canvas instead of the 680px prose column.
   */
  wide?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(panelList: Panel[]): number {
  const allText = panelList
    .map((p) => {
      const overlayText = parseOverlays(p.overlays)
        .map((overlay) => overlay.text || "")
        .join(" ");
      return `${p.caption || ""} ${overlayText}`;
    })
    .join(" ");
  const trimmed = allText.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const PANEL_MAX_DIM = 1200;
const PANEL_QUALITY = 0.8;
const MAX_PANEL_FRAMES = 6;

/** localStorage key prefix for the unmount-flush marker (suffixed with apiBase). */
const FLUSH_MARKER_PREFIX = "quiloria:webtoon-flush:";

/** Server-side limit on chapters.outline (see updateChapterSchema) and when to start counting down. */
const SCRIPT_MAX_CHARS = 10_000;
const SCRIPT_WARN_CHARS = 9_000;
// Server-side updatePanelSchema/createPanelsSchema cap the serialized `frames`
// string at 6,000,000 chars — check client-side so oversized combinations fail
// loudly before the optimistic update instead of silently vanishing on reload.
const MAX_FRAMES_JSON_LENGTH = 6_000_000;

function stripHtmlToLines(html: string): string[] {
  if (!html.trim()) return [];

  const source = html
    .replace(/<\/(p|h1|h2|h3|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"");

  return source
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function getSizingStyle(sizing: string, aspectRatio: string | null): React.CSSProperties {
  if (sizing === "tall") return { aspectRatio: "9/16", objectFit: "cover" as const };
  if (sizing === "wide") return { aspectRatio: "16/9", objectFit: "cover" as const };
  // "full" ≈ one phone viewport tall (reader-true at phone width); not device-vh.
  if (sizing === "full") return { aspectRatio: "9/19.5", objectFit: "cover" as const };
  if (sizing === "custom" && aspectRatio) {
    const [w, h] = aspectRatio.split(":").map(Number);
    if (w && h) return { aspectRatio: `${w}/${h}`, objectFit: "cover" as const };
  }
  return {};
}

function parseFrames(panel: Pick<Panel, "frames" | "imageData">): PanelFrame[] {
  try {
    const parsed = JSON.parse(panel.frames || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((frame, index) => ({
        id: typeof frame?.id === "string" ? frame.id : `frame-${index + 1}`,
        imageData: typeof frame?.imageData === "string" ? frame.imageData : "",
        fit: frame?.fit === "cover" || frame?.fit === "contain" || frame?.fit === "top" ? frame.fit : undefined,
      }));
    }
  } catch {
    // Legacy panels did not have a frame payload.
  }

  return panel.imageData ? [{ id: "frame-1", imageData: panel.imageData }] : [];
}

function getLayoutSlotCount(layout: string) {
  if (layout === "grid-6") return 6;
  if (layout === "mosaic-5") return 5;
  if (layout === "grid-4") return 4;
  if (layout === "top-pair-bottom" || layout === "left-stack-right") return 3;
  if (layout === "side-by-side" || layout === "stack") return 2;
  return 1;
}

function createEmptyFrames(count: number): PanelFrame[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `frame-${index + 1}`,
    imageData: "",
    fit: undefined,
  }));
}

function ensureFramesForLayout(frames: PanelFrame[], layout: string) {
  const slotCount = getLayoutSlotCount(layout);
  return Array.from({ length: slotCount }, (_, index) => (
    frames[index] || { id: `frame-${index + 1}`, imageData: "", fit: undefined }
  ));
}

/**
 * Pad frames to the layout's slot count WITHOUT truncating extras. Write paths
 * must preserve frames beyond the visible slots so switching to a smaller
 * layout (and back) never destroys uploaded art — only the renderers truncate
 * (via ensureFramesForLayout / the reader's slot-count slice).
 */
function padFramesForLayout(frames: PanelFrame[], layout: string): PanelFrame[] {
  const slotCount = getLayoutSlotCount(layout);
  return frames.length >= slotCount ? [...frames] : ensureFramesForLayout(frames, layout);
}

/**
 * Place newly added images into a panel's frame list: fill the layout's empty
 * slots first (so the image is visible where the editor renders it), then
 * append — growing past the layout — up to the 6-frame cap. Returns how many
 * images had to be dropped so callers can surface an error instead of
 * silently losing them.
 */
function placeFramesInPanel(
  existing: PanelFrame[],
  added: PanelFrame[],
  layout: string
): { frames: PanelFrame[]; dropped: number } {
  const frames = [...existing];
  const slotCount = getLayoutSlotCount(layout);
  let dropped = 0;
  for (const frame of added) {
    const emptySlot = frames.findIndex((f, i) => i < slotCount && !f.imageData);
    if (emptySlot !== -1) {
      frames[emptySlot] = { ...frames[emptySlot], imageData: frame.imageData };
    } else if (frames.length < MAX_PANEL_FRAMES) {
      frames.push(frame);
    } else {
      dropped += 1;
    }
  }
  return { frames, dropped };
}

function getDefaultLayout(frameCount: number): PanelLayout {
  if (frameCount >= 6) return "grid-6";
  if (frameCount === 5) return "mosaic-5";
  if (frameCount === 4) return "grid-4";
  if (frameCount >= 3) return "top-pair-bottom";
  if (frameCount === 2) return "side-by-side";
  return "single";
}

function getLayoutClass(layout: string, frameCount: number) {
  if (frameCount <= 1) return "grid-cols-1";
  if (layout === "stack") return "grid-cols-1";
  if (layout === "mosaic-5") return "grid-cols-6";
  if (layout === "left-stack-right") return "grid-cols-2";
  if (layout === "top-pair-bottom") return "grid-cols-2";
  return "grid-cols-2";
}

function getFrameCellClass(layout: string, index: number, frameCount: number) {
  if (frameCount <= 1) return "";
  if (layout === "top-pair-bottom" && index === 2) return "col-span-2";
  if (layout === "left-stack-right" && index === 0) return "row-span-2";
  if (layout === "mosaic-5") return index < 2 ? "col-span-3" : "col-span-2";
  return "";
}

function getBorderStyleClasses(borderStyle: string) {
  switch (borderStyle) {
    case "black":
      return {
        card: "bg-black p-1",
        grid: "gap-1 bg-black",
        cell: "bg-black",
        empty: "border-border bg-elevated",
      };
    case "light":
      return {
        card: "bg-border-subtle p-px",
        grid: "gap-1 bg-border-subtle",
        cell: "bg-elevated",
        empty: "border-border bg-elevated",
      };
    default:
      return {
        card: "bg-transparent",
        grid: "gap-0 bg-transparent",
        cell: "bg-transparent",
        empty: "border-border bg-elevated",
      };
  }
}

function getImageFitClass(imageFit: string, shouldFillSlot: boolean) {
  if (!shouldFillSlot) return "h-auto";
  switch (imageFit) {
    case "contain":
      return "h-full object-contain";
    case "top":
      return "h-full object-cover object-top";
    default:
      return "h-full object-cover";
  }
}

// ---------------------------------------------------------------------------
// Panel Card
// ---------------------------------------------------------------------------

function PanelCard({
  panel,
  index,
  editable,
  isSaving,
  className = "w-full",
  onReorderStart,
  onCaptionChange,
  onSizingChange,
  onAspectRatioChange,
  onLayoutChange,
  onBorderStyleChange,
  onImageFitChange,
  onFrameFitChange,
  onAddFrames,
  onReplaceFrame,
  onClearFrame,
  onOverlaysChange,
  onOverlayDelete,
  onSeamChange,
  onDuplicate,
  onDelete,
}: {
  panel: Panel;
  index: number;
  editable: boolean;
  isSaving: boolean;
  className?: string;
  onReorderStart?: (event: React.PointerEvent) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onSizingChange: (id: string, sizing: PanelSizing) => void;
  onAspectRatioChange: (id: string, ratio: string) => void;
  onLayoutChange: (id: string, layout: PanelLayout) => void;
  onBorderStyleChange: (id: string, borderStyle: PanelBorderStyle) => void;
  onImageFitChange: (id: string, imageFit: PanelImageFit) => void;
  onFrameFitChange: (panel: Panel, frameIndex: number, fit: PanelImageFit | null) => void;
  onAddFrames: (panel: Panel, files: FileList) => void;
  onReplaceFrame: (panel: Panel, frameIndex: number, file: File) => void;
  onClearFrame: (panel: Panel, frameIndex: number) => void;
  onOverlaysChange: (id: string, overlays: TextOverlay[]) => void;
  /** Bubble removal is routed up so it can be pushed onto the undo stack. */
  onOverlayDelete: (id: string, overlayId: string) => void;
  onSeamChange?: (id: string, seam: string) => void;
  onDuplicate: (panel: Panel) => void;
  onDelete: (id: string) => void;
}) {
  const sizingStyle = getSizingStyle(panel.sizing, panel.aspectRatio);
  const hasCustomSizing = panel.sizing !== "standard";
  // Keyed on the two fields parseFrames reads — NOT the panel object, which
  // is recreated on every caption keystroke. Frames can be multi-MB of
  // base64; re-parsing them per keystroke froze typing on image-heavy strips.
  const rawFrames = useMemo(
    () => parseFrames({ frames: panel.frames, imageData: panel.imageData }),
    [panel.frames, panel.imageData]
  );
  const layout = (panel.layout || getDefaultLayout(rawFrames.length)) as PanelLayout;
  const frames = useMemo(() => ensureFramesForLayout(rawFrames, layout), [rawFrames, layout]);
  // Frames past the layout's slots keep their art but the renderers never draw
  // it — say so on the card instead of letting the pictures look deleted.
  const hiddenFrameCount = useMemo(
    () => rawFrames.slice(getLayoutSlotCount(layout)).filter((frame) => frame.imageData).length,
    [rawFrames, layout]
  );
  const borderStyle = (panel.borderStyle || "none") as PanelBorderStyle;
  const borderClasses = getBorderStyleClasses(borderStyle);
  const imageFit = (panel.imageFit || "cover") as PanelImageFit;
  const overlays = useMemo(() => parseOverlays(panel.overlays), [panel.overlays]);
  const frameInputRef = useRef<HTMLInputElement>(null);
  const pendingFrameIndexRef = useRef<number | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleAddBubble = () => {
    const bubble = createTextOverlay(50, 40);
    const updated = [...overlays, bubble];
    onOverlaysChange(panel.id, updated);
    setSelectedOverlayId(bubble.id);
  };

  const handleOverlayTextChange = useCallback((overlayId: string, text: string) => {
    const updated = overlays.map((o) => o.id === overlayId ? { ...o, text } : o);
    onOverlaysChange(panel.id, updated);
  }, [overlays, panel.id, onOverlaysChange]);

  const handleOverlayPosition = useCallback((overlayId: string, x: number, y: number) => {
    const updated = overlays.map((o) => o.id === overlayId ? { ...o, x, y } : o);
    onOverlaysChange(panel.id, updated);
  }, [overlays, panel.id, onOverlaysChange]);

  const handleOverlayStyle = useCallback((overlayId: string, updates: Partial<TextOverlay>) => {
    const updated = overlays.map((o) => o.id === overlayId ? { ...o, ...updates } : o);
    onOverlaysChange(panel.id, updated);
  }, [overlays, panel.id, onOverlaysChange]);

  const handleOverlayDelete = (overlayId: string) => {
    onOverlayDelete(panel.id, overlayId);
    setSelectedOverlayId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`overflow-hidden group rounded-none border-0 ${borderClasses.card} ${className}`}
    >
      {/* Seam control — pacing of the gap ABOVE this panel (never on the first). */}
      {editable && onSeamChange && index > 0 && (
        <div className="relative flex justify-center -mt-3 mb-1 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onSeamChange(panel.id, nextSeam(panel.seam))}
            className="pointer-events-auto rounded-full border border-border bg-void/80 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-text-ghost opacity-0 backdrop-blur-sm transition-opacity hover:text-amber group-hover:opacity-100 focus-visible:opacity-100"
            title="Pacing above this panel — click to cycle (flush → beat → pause → breath → blackout)"
          >
            ⤵ {SEAM_LABELS[normalizeSeam(panel.seam)]}
          </button>
        </div>
      )}

      {/* Image area */}
      <div className="relative">
        {/* Panel number / reorder handle */}
        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
            onReorderStart?.(event);
          }}
          className={`absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-amber text-void text-xs font-bold flex items-center justify-center shadow-lg ${
            editable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
          }`}
          title={editable ? "Drag to reorder panel" : `Panel ${index + 1}`}
          aria-label={editable ? `Reorder panel ${index + 1}` : `Panel ${index + 1}`}
        >
          {index + 1}
        </button>

        {/* Saving indicator */}
        {isSaving && (
          <div className="absolute top-3 left-12 z-10 flex items-center gap-1.5 bg-void/70 backdrop-blur-sm rounded-full px-2.5 py-1">
            <div className="w-3 h-3 border border-text-ghost border-t-amber rounded-full animate-spin" />
            <span className="text-[10px] text-text-ghost">Saving</span>
          </div>
        )}

        {/* Controls (top right) */}
        {editable && (
          <>
            <input
              ref={frameInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files && event.target.files.length > 0) {
                  const pendingFrameIndex = pendingFrameIndexRef.current;
                  if (pendingFrameIndex !== null) {
                    onReplaceFrame(panel, pendingFrameIndex, event.target.files[0]);
                  } else {
                    onAddFrames(panel, event.target.files);
                  }
                  pendingFrameIndexRef.current = null;
                  event.target.value = "";
                }
              }}
            />

            <div className="absolute top-2 right-2 z-20 flex max-w-[calc(100%-56px)] flex-wrap items-center justify-end gap-1 rounded-2xl border border-white/10 bg-void/70 p-1 shadow-xl backdrop-blur-md opacity-100 transition-opacity md:top-3 md:right-3 md:max-w-[calc(100%-64px)] md:flex-nowrap md:gap-1.5 md:rounded-full md:bg-void/55 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <button
                type="button"
                onClick={handleAddBubble}
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-white/10 hover:text-amber md:h-8 md:w-8"
                title="Add speech bubble"
                aria-label="Add speech bubble"
              >
                <svg width="15" height="15" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                  <path d="M2 2h8a1 1 0 011 1v5a1 1 0 01-1 1H5l-2 2V9H2a1 1 0 01-1-1V3a1 1 0 011-1z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setNotesOpen((open) => !open)}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors md:h-8 md:w-8 ${
                  notesOpen || panel.caption ? "bg-amber/15 text-amber" : "text-text-secondary hover:bg-white/10 hover:text-amber"
                }`}
                title="Panel notes"
                aria-label="Panel notes"
              >
                <svg width="15" height="15" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 2h6v8H3z" />
                  <path d="M5 4h2M5 6h2" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  pendingFrameIndexRef.current = null;
                  frameInputRef.current?.click();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-white/10 hover:text-amber md:h-8 md:w-8"
                title="Add frames to this panel"
                aria-label="Add frames to this panel"
              >
                <svg width="15" height="15" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1.75" y="2" width="9.5" height="9" rx="1.2" />
                  <path d="M6.5 4.25v4.5M4.25 6.5h4.5" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors md:h-8 md:w-8 ${
                  settingsOpen ? "bg-amber/15 text-amber" : "text-text-secondary hover:bg-white/10 hover:text-amber"
                }`}
                title="Panel settings"
                aria-label="Panel settings"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7.5" cy="7.5" r="2" />
                  <path d="M7.5 1.5v2M7.5 11.5v2M2.3 4.5l1.7 1M11 9l1.7 1M2.3 10.5l1.7-1M11 6l1.7-1" />
                </svg>
              </button>

              <span className="hidden h-5 w-px bg-white/10 min-[380px]:block" />

              <button
                type="button"
                onClick={() => onDuplicate(panel)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-white/10 hover:text-amber md:h-8 md:w-8"
                title="Duplicate panel"
                aria-label="Duplicate panel"
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="6" height="7" rx="1" />
                  <path d="M2 8V2h6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => onDelete(panel.id)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-rose transition-colors hover:bg-rose/10 md:h-8 md:w-8"
                title="Remove panel"
                aria-label="Remove panel"
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="3" x2="9" y2="9" />
                  <line x1="9" y1="3" x2="3" y2="9" />
                </svg>
              </button>
            </div>

            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="absolute left-2 right-2 top-14 z-30 rounded-lg border border-border bg-elevated/95 p-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:w-60"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-paper">Panel settings</span>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-text-ghost transition-colors hover:bg-subtle hover:text-text"
                      title="Close settings"
                      aria-label="Close settings"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="3" y1="3" x2="9" y2="9" />
                        <line x1="9" y1="3" x2="3" y2="9" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">Panel shape</span>
                      <select
                        value={panel.sizing || "standard"}
                        onChange={(e) => onSizingChange(panel.id, e.target.value as PanelSizing)}
                        className="h-8 w-full cursor-pointer rounded-md border border-border bg-surface px-2 text-[12px] text-text outline-none transition-colors focus:border-amber/30"
                      >
                        {SIZING_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {panel.sizing === "custom" && (
                      <AspectRatioFields
                        ratio={panel.aspectRatio}
                        onChange={(ratio) => onAspectRatioChange(panel.id, ratio)}
                      />
                    )}

                    <label className="block">
                      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">Frame layout</span>
                      <select
                        value={layout}
                        onChange={(e) => onLayoutChange(panel.id, e.target.value as PanelLayout)}
                        className="h-8 w-full cursor-pointer rounded-md border border-border bg-surface px-2 text-[12px] text-text outline-none transition-colors focus:border-amber/30"
                      >
                        {PANEL_LAYOUT_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">Dividers</span>
                      <select
                        value={borderStyle}
                        onChange={(e) => onBorderStyleChange(panel.id, e.target.value as PanelBorderStyle)}
                        className="h-8 w-full cursor-pointer rounded-md border border-border bg-surface px-2 text-[12px] text-text outline-none transition-colors focus:border-amber/30"
                      >
                        {PANEL_BORDER_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">Default image fit</span>
                      <select
                        value={imageFit}
                        onChange={(e) => onImageFitChange(panel.id, e.target.value as PanelImageFit)}
                        className="h-8 w-full cursor-pointer rounded-md border border-border bg-surface px-2 text-[12px] text-text outline-none transition-colors focus:border-amber/30"
                      >
                        {IMAGE_FIT_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* The panel frames */}
        <div
          className={`grid ${getLayoutClass(layout, frames.length)} ${borderClasses.grid}`}
          style={hasCustomSizing ? sizingStyle : undefined}
        >
          {frames.map((frame, frameIndex) => (
            <div
              key={`${frame.id}-${frameIndex}`}
              className={`group/frame relative overflow-hidden ${borderClasses.cell} ${frames.length > 1 ? "min-h-40" : "min-h-72"} ${getFrameCellClass(layout, frameIndex, frames.length)}`}
            >
              {frame.imageData ? (
                <>
                <img
                  src={frame.imageData}
                  alt={`Panel ${index + 1}, frame ${frameIndex + 1}`}
                  className={`w-full block ${getImageFitClass(frame.fit || imageFit, hasCustomSizing || frames.length > 1)}`}
                  draggable={false}
                />
                {editable && (
                  <div className="absolute bottom-2 right-2 z-10 flex max-w-[calc(100%-16px)] flex-wrap justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover/frame:opacity-100 md:focus-within:opacity-100">
                    <select
                      value={frame.fit || ""}
                      onChange={(event) => onFrameFitChange(panel, frameIndex, event.target.value ? event.target.value as PanelImageFit : null)}
                      className="h-9 w-[96px] cursor-pointer rounded-md border border-white/10 bg-void/80 px-2 text-[11px] text-text-secondary outline-none backdrop-blur-sm md:h-7 md:w-[86px] md:px-1.5 md:text-[10px]"
                      title="Frame image fit"
                    >
                      <option value="">Panel fit</option>
                      {IMAGE_FIT_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        pendingFrameIndexRef.current = frameIndex;
                        frameInputRef.current?.click();
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-void/80 text-text shadow-sm backdrop-blur-sm transition-colors hover:text-amber md:h-7 md:w-7"
                      title={`Replace frame ${frameIndex + 1}`}
                      aria-label={`Replace frame ${frameIndex + 1}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4.5A4 4 0 018.7 2.4L10 3.7" />
                        <path d="M10 1.5v2.2H7.8" />
                        <path d="M11 8.5a4 4 0 01-6.7 2.1L3 9.3" />
                        <path d="M3 11.5V9.3h2.2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onClearFrame(panel, frameIndex)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-rose/20 bg-void/80 text-rose shadow-sm backdrop-blur-sm transition-colors hover:bg-rose/10 md:h-7 md:w-7"
                      title={`Clear frame ${frameIndex + 1}`}
                      aria-label={`Clear frame ${frameIndex + 1}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="3" y1="3" x2="9" y2="9" />
                        <line x1="9" y1="3" x2="3" y2="9" />
                      </svg>
                    </button>
                  </div>
                )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    pendingFrameIndexRef.current = frameIndex;
                    frameInputRef.current?.click();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const file = Array.from(event.dataTransfer.files).find((candidate) => candidate.type.startsWith("image/"));
                    if (file) onReplaceFrame(panel, frameIndex, file);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  className={`absolute inset-0 flex w-full flex-col items-center justify-center gap-2 border border-dashed ${borderClasses.empty} text-text-secondary transition-colors hover:border-amber/40 hover:bg-amber/[0.04] hover:text-amber`}
                  title={`Add image to frame ${frameIndex + 1}`}
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="20" height="20" rx="3" />
                    <circle cx="10" cy="10" r="2" />
                    <path d="M4 20l5.5-5.5 4 4 3-3L24 23" />
                    <path d="M19 7v6M16 10h6" />
                  </svg>
                  <span className="text-xs font-medium">Frame {frameIndex + 1}</span>
                  <span className="text-[10px] text-text-ghost">Drop or click</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Art that this layout has no slot for — still stored, still yours. */}
        {editable && hiddenFrameCount > 0 && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-full border border-border bg-void/75 px-2.5 py-1 text-[10px] text-text-ghost backdrop-blur-sm">
            {hiddenFrameCount} {hiddenFrameCount === 1 ? "frame" : "frames"} hidden by this layout
          </div>
        )}

        {/* Speech bubbles / text overlays */}
        {overlays.length > 0 && (
          <OverlayRenderer
            overlays={overlays}
            editable={editable}
            selectedId={selectedOverlayId}
            onSelect={setSelectedOverlayId}
            onTextChange={handleOverlayTextChange}
            onPositionChange={handleOverlayPosition}
            onStyleChange={handleOverlayStyle}
            onDelete={handleOverlayDelete}
          />
        )}
      </div>

      {/* Caption area */}
      {(notesOpen || panel.caption || (!editable && panel.caption)) && (
      <div className="bg-elevated px-4 py-3">
        {editable ? (
          <textarea
            value={panel.caption || ""}
            onChange={(e) => onCaptionChange(panel.id, e.target.value)}
            placeholder="Panel notes, alt text, or off-panel narration..."
            rows={2}
            className="w-full bg-transparent text-paper text-sm leading-relaxed outline-none resize-none placeholder:text-text-ghost"
          />
        ) : (
          <p className="text-paper text-sm leading-relaxed whitespace-pre-wrap">
            {panel.caption || (
              <span className="text-text-ghost italic">No caption</span>
            )}
          </p>
        )}
      </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Upload Zone
// ---------------------------------------------------------------------------

function UploadZone({
  onFilesSelected,
  isLoading,
  uploadMode,
  onUploadModeChange,
}: {
  onFilesSelected: (files: FileList) => void;
  isLoading: boolean;
  uploadMode: UploadMode;
  onUploadModeChange: (mode: UploadMode) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(e.target.files);
        e.target.value = "";
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
        ${
          isDragOver
            ? "border-amber bg-amber/[0.06] scale-[1.01]"
            : "border-border hover:border-text-ghost bg-surface/50 hover:bg-surface/70"
        }
        px-8 py-12 flex flex-col items-center justify-center gap-3
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Processing panels...</p>
        </div>
      ) : (
        <>
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
              isDragOver
                ? "bg-amber/15 text-amber"
                : "bg-surface text-text-ghost"
            }`}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="22" height="22" rx="3" />
              <circle cx="10" cy="10" r="2" />
              <path d="M3 20l6-6 4 4 3-3 9 9" />
              <path d="M19 3v6h6" />
              <path d="M22 6l-3-3" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm text-text-secondary font-medium">
              Drop frames here or click to create a panel
            </p>
            <p className="text-xs text-text-ghost mt-1">
              PNG, JPG, or WebP.
            </p>
          </div>

          <div
            className="flex rounded-lg border border-border bg-elevated/70 p-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onUploadModeChange("frames")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                uploadMode === "frames"
                  ? "bg-amber/10 text-amber"
                  : "text-text-ghost hover:text-text-secondary"
              }`}
            >
              One panel
            </button>
            <button
              type="button"
              onClick={() => onUploadModeChange("panels")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                uploadMode === "panels"
                  ? "bg-amber/10 text-amber"
                  : "text-text-ghost hover:text-text-secondary"
              }`}
            >
              Separate panels
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ReorderablePanelCard({
  panel,
  index,
  editable,
  isSaving,
  className,
  onReorderCommit,
  onCaptionChange,
  onSizingChange,
  onLayoutChange,
  onBorderStyleChange,
  onImageFitChange,
  onFrameFitChange,
  onAddFrames,
  onReplaceFrame,
  onClearFrame,
  onOverlaysChange,
  onOverlayDelete,
  onSeamChange,
  onDuplicate,
  onDelete,
  onAspectRatioChange,
}: {
  panel: Panel;
  index: number;
  editable: boolean;
  isSaving: boolean;
  className?: string;
  /** Persist the order once the drag ends (onReorder is local-only). */
  onReorderCommit: () => void;
  onCaptionChange: (id: string, caption: string) => void;
  onSizingChange: (id: string, sizing: PanelSizing) => void;
  onAspectRatioChange: (id: string, ratio: string) => void;
  onLayoutChange: (id: string, layout: PanelLayout) => void;
  onBorderStyleChange: (id: string, borderStyle: PanelBorderStyle) => void;
  onImageFitChange: (id: string, imageFit: PanelImageFit) => void;
  onFrameFitChange: (panel: Panel, frameIndex: number, fit: PanelImageFit | null) => void;
  onAddFrames: (panel: Panel, files: FileList) => void;
  onReplaceFrame: (panel: Panel, frameIndex: number, file: File) => void;
  onClearFrame: (panel: Panel, frameIndex: number) => void;
  onOverlaysChange: (id: string, overlays: TextOverlay[]) => void;
  onOverlayDelete: (id: string, overlayId: string) => void;
  onSeamChange?: (id: string, seam: string) => void;
  onDuplicate: (panel: Panel) => void;
  onDelete: (id: string) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={panel.id}
      value={panel}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onReorderCommit}
      className={`list-none ${className || "w-full"}`}
    >
      <PanelCard
        panel={panel}
        index={index}
        editable={editable}
        isSaving={isSaving}
        className="w-full"
        onReorderStart={(event) => dragControls.start(event)}
        onCaptionChange={onCaptionChange}
        onSizingChange={onSizingChange}
        onAspectRatioChange={onAspectRatioChange}
        onLayoutChange={onLayoutChange}
        onBorderStyleChange={onBorderStyleChange}
        onImageFitChange={onImageFitChange}
        onFrameFitChange={onFrameFitChange}
        onAddFrames={onAddFrames}
        onReplaceFrame={onReplaceFrame}
        onClearFrame={onClearFrame}
        onOverlaysChange={onOverlaysChange}
        onOverlayDelete={onOverlayDelete}
        onSeamChange={onSeamChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </Reorder.Item>
  );
}

// ---------------------------------------------------------------------------
// Script View (Tiptap for script text)
// ---------------------------------------------------------------------------

function ScriptPane({
  content,
  onUpdate,
}: {
  content: string;
  onUpdate?: (content: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: "Write your episode script here...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: content || "",
    editable: !!onUpdate,
    editorProps: {
      attributes: {
        class: "tiptap-editor script-editor",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (onUpdate) {
        onUpdate(ed.getHTML());
      }
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    queueMicrotask(() => {
      if (editor.isDestroyed) return;
      const current = editor.getHTML();
      if (current !== content) {
        editor.commands.setContent(content || "");
      }
    });
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-[560px] mx-auto">
        <EditorContent editor={editor} className="prose-editor-content" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tools rails (standalone studio)
// ---------------------------------------------------------------------------

function railOption(active: boolean) {
  return `rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
    active
      ? "border-amber/40 bg-amber/[0.08] text-amber"
      : "border-border text-text-secondary hover:border-border-active hover:text-paper"
  }`;
}

function InspectorGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** Left rail: a jumpable, thumbnailed outline of the episode's panels. */
function PanelOutlineRail({
  panels,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  isUploading,
}: {
  panels: Panel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  isUploading: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-text-ghost">
        Panels
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {panels.map((panel, i) => {
          const frames = parseFrames(panel);
          const thumb = frames.find((f) => f.imageData)?.imageData;
          return (
            <div
              key={panel.id}
              className={`group/row flex items-center gap-2 rounded-lg border p-1.5 transition-colors ${
                panel.id === selectedId ? "border-amber/40 bg-amber/[0.06]" : "border-border hover:border-border-active"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(panel.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber/15 text-[10px] font-bold text-amber">
                  {i + 1}
                </span>
                <span className="h-10 w-8 shrink-0 overflow-hidden rounded bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-text-secondary">
                  {panel.caption || `Panel ${i + 1}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(panel.id)}
                title="Delete panel"
                aria-label={`Delete panel ${i + 1}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-ghost opacity-0 transition-opacity hover:text-rose focus-visible:opacity-100 group-hover/row:opacity-100"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 3.5h9M5.5 3.5V2.5h3v1M3.5 3.5l.5 8a1 1 0 001 1h4a1 1 0 001-1l.5-8" />
                </svg>
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          disabled={isUploading}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-text-ghost transition-colors hover:border-amber/30 hover:text-amber disabled:opacity-50"
        >
          + Panel
        </button>
      </div>
    </div>
  );
}

/** Right rail: inspector for the selected panel. */
function PanelInspector({
  panel,
  index,
  onLayout,
  onSizing,
  onAspectRatio,
  onBorder,
  onFit,
  onSeam,
  onAddBubble,
}: {
  panel: Panel;
  index: number;
  onLayout: (id: string, layout: PanelLayout) => void;
  onSizing: (id: string, sizing: PanelSizing) => void;
  onAspectRatio: (id: string, ratio: string) => void;
  onBorder: (id: string, border: PanelBorderStyle) => void;
  onFit: (id: string, fit: PanelImageFit) => void;
  onSeam: (id: string, seam: string) => void;
  onAddBubble: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3 font-display text-sm text-paper">
        Panel {index + 1}
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <InspectorGroup label="Layout">
          {PANEL_LAYOUT_OPTIONS.map((o) => (
            <button key={o.key} type="button" onClick={() => onLayout(panel.id, o.key)} className={railOption(panel.layout === o.key)}>
              {o.label}
            </button>
          ))}
        </InspectorGroup>
        <InspectorGroup label="Sizing">
          {SIZING_OPTIONS.map((o) => (
            <button key={o.key} type="button" onClick={() => onSizing(panel.id, o.key)} className={railOption(panel.sizing === o.key)}>
              {o.label}
            </button>
          ))}
        </InspectorGroup>
        {panel.sizing === "custom" && (
          <AspectRatioFields ratio={panel.aspectRatio} onChange={(ratio) => onAspectRatio(panel.id, ratio)} />
        )}
        <InspectorGroup label="Frame fit">
          {IMAGE_FIT_OPTIONS.map((o) => (
            <button key={o.key} type="button" onClick={() => onFit(panel.id, o.key)} className={railOption(panel.imageFit === o.key)}>
              {o.label}
            </button>
          ))}
        </InspectorGroup>
        <InspectorGroup label="Gutter">
          {PANEL_BORDER_OPTIONS.map((o) => (
            <button key={o.key} type="button" onClick={() => onBorder(panel.id, o.key)} className={railOption(panel.borderStyle === o.key)}>
              {o.label}
            </button>
          ))}
        </InspectorGroup>
        {index > 0 && (
          <InspectorGroup label="Seam above">
            {SEAM_ORDER.map((s) => (
              <button key={s} type="button" onClick={() => onSeam(panel.id, s)} className={railOption(normalizeSeam(panel.seam) === s)}>
                {SEAM_LABELS[s]}
              </button>
            ))}
          </InspectorGroup>
        )}
        <button
          type="button"
          onClick={() => onAddBubble(panel.id)}
          className="w-full rounded-md border border-amber/25 bg-amber/[0.05] px-3 py-2 text-[12px] text-amber transition-colors hover:bg-amber/[0.1]"
        >
          + Speech bubble
        </button>
      </div>
    </div>
  );
}

/** Reusable image library; click an asset to drop it into the selected panel. */
function AssetTray({
  storyId,
  assets,
  canApply,
  onUpload,
  onApply,
  onDelete,
}: {
  storyId: string;
  assets: StoryAsset[];
  canApply: boolean;
  onUpload: (file: File) => void;
  onApply: (assetId: string) => void;
  onDelete: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col border-t border-border-subtle">
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <span className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">Assets</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-border px-2 py-0.5 text-[10px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
        >
          + Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
      </div>
      <div className="max-h-48 overflow-y-auto px-3 pb-3">
        {assets.length === 0 ? (
          <p className="px-1 text-[11px] italic text-text-ghost">
            Upload characters or backgrounds to reuse across episodes.
          </p>
        ) : (
          <div className="space-y-2">
            {!canApply && (
              <p className="rounded-md border border-border bg-elevated/60 px-2 py-1.5 text-[10px] text-text-ghost">
                Select a panel to place assets.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {assets.map((asset) => (
                <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-elevated">
                  <button
                    type="button"
                    onClick={() => canApply && onApply(asset.id)}
                    disabled={!canApply}
                    title={canApply ? `Add “${asset.name || "asset"}” to the selected panel` : "Select a panel first"}
                    className="h-full w-full disabled:cursor-not-allowed"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/stories/${storyId}/assets/${asset.id}?raw=1`}
                      alt={asset.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                  {!canApply && (
                    <div className="pointer-events-none absolute inset-0 bg-void/45 backdrop-blur-[1px]" />
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(asset.id)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-void/80 text-text-ghost opacity-0 transition-opacity hover:text-rose group-hover:opacity-100"
                    aria-label="Delete asset"
                  >
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <line x1="2" y1="2" x2="8" y2="8" />
                      <line x1="8" y1="2" x2="2" y2="8" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

/**
 * One reversible edit. `undo` runs against whatever the panels look like NOW —
 * it must not assume the board is unchanged — and throws when the reversal
 * can't be persisted, which keeps the entry on the stack for another try.
 */
interface UndoEntry {
  id: number;
  label: string;
  undo: () => Promise<void>;
}

const UNDO_LIMIT = 20;
const TOAST_MS = 6000;

interface ToastState {
  id: number;
  message: string;
  tone: "quiet" | "error";
  /** Entry this toast offers to reverse; the stack outlives the toast. */
  undoEntryId: number | null;
}

/** Bottom-centred, low-volume confirmation of a destructive edit. */
function UndoToast({
  toast,
  onUndo,
  onDismiss,
}: {
  toast: ToastState | null;
  onUndo: (entryId: number) => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <div
            className={`pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2 shadow-2xl shadow-black/40 backdrop-blur-xl ${
              toast.tone === "error"
                ? "border-rose/25 bg-rose/10 text-rose"
                : "border-border bg-elevated/95 text-text"
            }`}
          >
            <span className="text-[12px]">{toast.message}</span>
            {toast.undoEntryId !== null && (
              <button
                type="button"
                onClick={() => onUndo(toast.undoEntryId as number)}
                className="text-[12px] font-medium text-amber transition-colors hover:text-paper"
                title="Undo (⌘Z)"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="text-text-ghost transition-colors hover:text-text"
              aria-label="Dismiss"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="3" x2="9" y2="9" />
                <line x1="9" y1="3" x2="3" y2="9" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WebtoonEditor({
  storyId,
  chapterId,
  editable = true,
  placeholder,
  scriptContent,
  onScriptUpdate,
  scriptSaveError = null,
  onWordCountChange,
  wide = false,
}: WebtoonEditorProps) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [savingPanels, setSavingPanels] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"visual" | "script">("visual");
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("frames");
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Tools rail (wide / standalone studio): selected panel drives the right
  // inspector; the rails collapse to drawers below lg.
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [leftRailOpen, setLeftRailOpen] = useState(false);
  const [rightRailOpen, setRightRailOpen] = useState(false);
  // Reusable per-story image library (asset tray).
  const [assets, setAssets] = useState<StoryAsset[]>([]);

  // Debounce timers for caption saves
  const captionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Payloads for debounced saves that haven't fired yet, keyed like the timers,
  // so the unmount cleanup can flush them instead of silently dropping edits.
  const pendingDebouncedSaves = useRef<Map<string, { panelId: string; data: Record<string, unknown> }>>(new Map());
  const panelsRef = useRef<Panel[]>([]);

  const apiBase = `/api/stories/${storyId}/chapters/${chapterId}/panels`;

  useEffect(() => {
    panelsRef.current = panels;
  }, [panels]);

  // ---- Undo stack (in memory, this session only) ----
  // Nothing renders from the stack itself, so it lives in a ref and stays
  // readable synchronously from the keyboard handler.
  const undoStackRef = useRef<UndoEntry[]>([]);
  const undoSeqRef = useRef(0);
  const undoBusyRef = useRef(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, tone: ToastState["tone"], undoEntryId: number | null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = ++undoSeqRef.current;
    setToast({ id, message, tone, undoEntryId });
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  /** Record a reversible edit and offer it in the toast. */
  const pushUndo = useCallback(
    (label: string, undo: () => Promise<void>) => {
      const entry: UndoEntry = { id: ++undoSeqRef.current, label, undo };
      const next = [...undoStackRef.current, entry];
      undoStackRef.current = next.length > UNDO_LIMIT ? next.slice(next.length - UNDO_LIMIT) : next;
      showToast(label, "quiet", entry.id);
    },
    [showToast]
  );

  /**
   * Reverse an edit — the newest by default, or the one a toast still points
   * at. A failed reversal goes back on the stack so ⌘Z can try again.
   */
  const runUndo = useCallback(async (entryId?: number) => {
    if (undoBusyRef.current) return;
    const stack = undoStackRef.current;
    const index = entryId === undefined ? stack.length - 1 : stack.findIndex((e) => e.id === entryId);
    if (index === -1) return;
    const entry = stack[index];

    undoBusyRef.current = true;
    undoStackRef.current = stack.filter((_, i) => i !== index);
    try {
      await entry.undo();
      setToast((current) => (current?.undoEntryId === entry.id ? null : current));
    } catch (err) {
      undoStackRef.current = [...undoStackRef.current, entry];
      showToast(
        err instanceof Error && err.message ? err.message : `Couldn't undo — ${entry.label.toLowerCase()}.`,
        "error",
        null
      );
    } finally {
      undoBusyRef.current = false;
    }
  }, [showToast]);

  // ⌘Z / Ctrl+Z. Text fields own their own undo, so stay out of them.
  useEffect(() => {
    if (!editable) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      if (undoStackRef.current.length === 0) return;
      event.preventDefault();
      void runUndo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editable, runUndo]);

  // ---- Load panels from API ----
  useEffect(() => {
    let cancelled = false;

    async function loadPanels() {
      setIsLoading(true);
      try {
        const res = await fetch(apiBase);
        if (!res.ok) throw new Error("Failed to load panels");
        const json = await res.json();
        if (!cancelled) {
          setPanels(json.data || []);
        }
      } catch {
        // Panel load failed — fall back to empty
        if (!cancelled) setPanels([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPanels();
    return () => { cancelled = true; };
  }, [apiBase]);

  // ---- Report word count to parent ----
  const wordCount = useMemo(() => countWords(panels), [panels]);

  useEffect(() => {
    onWordCountChange?.(wordCount);
  }, [wordCount, onWordCountChange]);

  // ---- API helpers ----

  const markSaving = useCallback((panelId: string, saving: boolean) => {
    setSavingPanels((prev) => {
      const next = new Set(prev);
      if (saving) next.add(panelId);
      else next.delete(panelId);
      return next;
    });
  }, []);

  // One in-flight PATCH per panel at a time. Serializing matters for the
  // optimistic lock: a second edit fired before the first response lands
  // would carry a stale baseUpdatedAt and read as a conflict with yourself.
  const patchQueues = useRef<Map<string, Promise<void>>>(new Map());
  // Latest server clock per panel, updated synchronously — React state (and
  // panelsRef, which follows it by a render) lags behind the microtask queue.
  const panelClocks = useRef<Map<string, string>>(new Map());

  // Throws on failure — undo paths need the error to keep their entry alive.
  const patchPanelStrict = useCallback((panelId: string, data: Record<string, unknown>) => {
    const prev = patchQueues.current.get(panelId) ?? Promise.resolve();
    const run = prev
      .catch(() => {}) // a failed predecessor shouldn't poison the queue
      .then(async () => {
        markSaving(panelId, true);
        try {
          const base =
            panelClocks.current.get(panelId) ??
            panelsRef.current.find((p) => p.id === panelId)?.updatedAt;
          const res = await fetch(`${apiBase}/${panelId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(base ? { ...data, baseUpdatedAt: base } : data),
          });
          if (res.status === 409) {
            // A collaborator saved this panel after we loaded it. Show their
            // version — silently overwriting it is the real data loss.
            try {
              const j = await res.json();
              const server = j?.data as Partial<Panel> | undefined;
              if (server?.id) {
                if (server.updatedAt) panelClocks.current.set(panelId, String(server.updatedAt));
                setPanels((prevPanels) =>
                  prevPanels.map((p) => (p.id === server.id ? { ...p, ...server } : p))
                );
              }
            } catch {}
            throw new Error(
              "Someone else edited this panel while you had it open — their version is shown. Re-apply your change on top of it."
            );
          }
          // Wording matters: undo surfaces this message to the author directly.
          if (!res.ok) throw new Error("Those changes couldn't be saved. Check your connection and try again.");
          // Remember the server's clock so the next PATCH bases on it.
          try {
            const j = await res.json();
            const fresh = (j?.data as Partial<Panel> | undefined)?.updatedAt;
            if (fresh) {
              panelClocks.current.set(panelId, String(fresh));
              setPanels((prevPanels) =>
                prevPanels.map((p) => (p.id === panelId ? { ...p, updatedAt: fresh } : p))
              );
            }
          } catch {}
          setUploadError(null);
        } finally {
          markSaving(panelId, false);
        }
      });
    patchQueues.current.set(panelId, run.catch(() => {}));
    return run;
  }, [apiBase, markSaving]);

  /** Reports the failure inline and answers whether the write landed. */
  const patchPanel = useCallback(async (panelId: string, data: Record<string, unknown>) => {
    try {
      await patchPanelStrict(panelId, data);
      return true;
    } catch (err) {
      setUploadError(
        err instanceof Error && err.message
          ? err.message
          : "Panel changes couldn't be saved. Check your connection and try again."
      );
      return false;
    }
  }, [patchPanelStrict]);

  /** Persist a full ordering (used when undo puts a panel back in its place). */
  const persistOrder = useCallback(async (list: Panel[]) => {
    if (list.length === 0) return;
    const res = await fetch(`${apiBase}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panels: list.map((p) => ({ id: p.id, sortOrder: p.sortOrder })) }),
    });
    if (!res.ok) throw new Error("Panel order couldn't be saved. Check your connection and try again.");
  }, [apiBase]);

  // Debounce a panel PATCH under `key`, remembering the payload so the unmount
  // cleanup can flush saves that haven't fired yet (switching episodes remounts
  // the editor, which would otherwise drop the last <600ms of edits).
  const schedulePanelSave = useCallback(
    (key: string, panelId: string, data: Record<string, unknown>) => {
      const existing = captionTimers.current.get(key);
      if (existing) clearTimeout(existing);
      pendingDebouncedSaves.current.set(key, { panelId, data });
      captionTimers.current.set(key, setTimeout(() => {
        captionTimers.current.delete(key);
        pendingDebouncedSaves.current.delete(key);
        patchPanel(panelId, data);
      }, 600));
    },
    [patchPanel]
  );

  const cancelPanelSave = useCallback((key: string) => {
    const timer = captionTimers.current.get(key);
    if (timer) clearTimeout(timer);
    captionTimers.current.delete(key);
    pendingDebouncedSaves.current.delete(key);
  }, []);

  const createPanels = useCallback(
    async (
      newPanelData: Array<{
        imageData: string;
        caption: string;
        sortOrder?: number;
        sizing?: PanelSizing;
        layout?: PanelLayout;
        frames?: string;
        borderStyle?: PanelBorderStyle;
        imageFit?: PanelImageFit;
        aspectRatio?: string | null;
        overlays?: string;
        seam?: string;
      }>
    ) => {
      // The API validates at most 20 panels per request (createPanelsSchema),
      // so larger creates are sent as sequential batches. The server assigns
      // sortOrder from the chapter's current max, so ordering is preserved
      // across batches as long as they run one at a time.
      const BATCH_SIZE = 20;
      const created: Panel[] = [];
      try {
        for (let i = 0; i < newPanelData.length; i += BATCH_SIZE) {
          const batch = newPanelData.slice(i, i + BATCH_SIZE);
          const res = await fetch(apiBase, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ panels: batch }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || "Failed to create panels");
          }

          const json = await res.json();
          created.push(...(json.data || []));
        }
      } finally {
        // Keep whatever the server did create even if a later batch failed.
        if (created.length > 0) {
          setPanels((prev) => [...prev, ...created]);
        }
      }
      setUploadError(null);
      return created;
    },
    [apiBase]
  );

  // ---- Panel operations ----

  const handleCaptionChange = useCallback(
    (id: string, caption: string) => {
      // Update local state immediately
      setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));

      // Debounce the API call
      schedulePanelSave(id, id, { caption });
    },
    [schedulePanelSave]
  );

  const handleSizingChange = useCallback(
    (id: string, sizing: PanelSizing) => {
      // "Custom" keeps whatever valid ratio the panel already has (so
      // switching away and back isn't destructive) and seeds 4:5 otherwise.
      const current = panelsRef.current.find((p) => p.id === id);
      const ratio =
        sizing === "custom"
          ? parseAspectRatio(current?.aspectRatio ?? null)
            ? current!.aspectRatio
            : "4:5"
          : SIZING_OPTIONS.find((o) => o.key === sizing)?.ratio || null;
      setPanels((prev) => prev.map((p) =>
        p.id === id ? { ...p, sizing, aspectRatio: ratio } : p
      ));
      patchPanel(id, { sizing, aspectRatio: ratio });
    },
    [patchPanel]
  );

  const handleAspectRatioChange = useCallback(
    (id: string, ratio: string) => {
      if (!parseAspectRatio(ratio)) return; // inputs are clamped, but belt and braces
      setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, aspectRatio: ratio } : p)));
      patchPanel(id, { aspectRatio: ratio });
    },
    [patchPanel]
  );

  const handleBorderStyleChange = useCallback(
    (id: string, borderStyle: PanelBorderStyle) => {
      setPanels((prev) => prev.map((p) =>
        p.id === id ? { ...p, borderStyle } : p
      ));
      patchPanel(id, { borderStyle });
    },
    [patchPanel]
  );

  const handleSeamChange = useCallback(
    (id: string, seam: string) => {
      setPanels((prev) => prev.map((p) =>
        p.id === id ? { ...p, seam } : p
      ));
      patchPanel(id, { seam });
    },
    [patchPanel]
  );

  // Add a speech bubble to a panel from the inspector rail (overlays are JSON).
  const handleAddBubbleToPanel = useCallback(
    (id: string) => {
      const panel = panelsRef.current.find((p) => p.id === id);
      const next = [...parseOverlays(panel?.overlays || "[]"), createTextOverlay(50, 40)];
      const serialized = JSON.stringify(next);
      // Cancel any pending debounced overlays save for this panel — if it fired
      // after this immediate PATCH it would overwrite the server with a stale
      // overlay list that doesn't include the new bubble. The local state below
      // already reflects those edits, so nothing is lost by cancelling.
      cancelPanelSave(`overlay-${id}`);
      setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, overlays: serialized } : p)));
      patchPanel(id, { overlays: serialized });
    },
    [cancelPanelSave, patchPanel]
  );

  // ── Asset library (reusable images dropped into panel frames) ────────────
  const assetsBase = `/api/stories/${storyId}/assets`;

  useEffect(() => {
    let cancelled = false;
    fetch(assetsBase)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (!cancelled && Array.isArray(json?.data)) setAssets(json.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [assetsBase]);

  const handleUploadAsset = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const imageData = await compressImage(file, PANEL_MAX_DIM, PANEL_QUALITY);
      const res = await fetch(assetsBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name.replace(/\.[^.]+$/, "").slice(0, 120), imageData }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        // Keep only metadata in state — thumbnails stream from ?raw=1.
        setAssets((prev) => [{ id: json.data.id, name: json.data.name }, ...prev]);
      } else {
        setUploadError(json?.error?.message || "Couldn't save that asset.");
      }
    } catch {
      setUploadError("Couldn't process that image.");
    }
  }, [assetsBase]);

  const handleDeleteAsset = useCallback(async (id: string) => {
    const deletedAsset = assets.find((a) => a.id === id) ?? null;
    // The tray only holds metadata, so grab the image itself before the delete
    // takes it away — without the bytes there is nothing to put back.
    let deletedImageData: string | null = null;
    try {
      const res = await fetch(`${assetsBase}/${id}`);
      const json = await res.json().catch(() => null);
      if (res.ok && typeof json?.data?.imageData === "string") deletedImageData = json.data.imageData;
    } catch {
      // Undo just won't be offered for this one.
    }

    setAssets((prev) => prev.filter((a) => a.id !== id));

    try {
      const res = await fetch(`${assetsBase}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Asset delete failed");
      setUploadError(null);
      if (deletedImageData) {
        const imageData = deletedImageData;
        const name = deletedAsset?.name || "";
        pushUndo("Asset deleted", async () => {
          const res = await fetch(assetsBase, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.slice(0, 120), imageData }),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.data) {
            throw new Error(json?.error?.message || "That asset couldn't be put back. Try again.");
          }
          setAssets((prev) => [{ id: json.data.id, name: json.data.name }, ...prev]);
        });
      }
    } catch {
      if (deletedAsset) setAssets((prev) => [deletedAsset, ...prev]);
      setUploadError("Asset couldn't be deleted. It has been restored locally.");
    }
  }, [assets, assetsBase, pushUndo]);

  // Drop an asset into a panel as a new frame. The list endpoint only carries
  // metadata, so fetch the full asset (with its base64 imageData) on demand and
  // copy the bytes inline, exactly like a fresh upload.
  const handleApplyAssetToPanel = useCallback(async (panelId: string, assetId: string) => {
    const panel = panelsRef.current.find((p) => p.id === panelId);
    if (!panel) return;
    markSaving(panelId, true);
    try {
      const res = await fetch(`${assetsBase}/${assetId}`);
      const json = await res.json().catch(() => null);
      const imageData: string | undefined = json?.data?.imageData;
      if (!res.ok || !imageData) {
        setUploadError(json?.error?.message || "Couldn't load that asset. Try again.");
        return;
      }
      const existingFrames = parseFrames(panel);
      const currentLayout = (panel.layout || getDefaultLayout(existingFrames.length)) as PanelLayout;
      // Fill the first empty layout slot (where the editor canvas actually
      // renders); only append past the slots when they're all full.
      const { frames, dropped } = placeFramesInPanel(
        existingFrames,
        [{ id: `${Date.now()}`, imageData }],
        currentLayout
      );
      if (dropped > 0) {
        setUploadError(`This panel already holds the maximum of ${MAX_PANEL_FRAMES} frames. Clear a frame first.`);
        return;
      }
      // Grow the layout when the new frame had to be appended beyond the
      // current slot count, so it stays visible in the editor.
      const layout = frames.length > Math.max(existingFrames.length, getLayoutSlotCount(currentLayout))
        ? getDefaultLayout(frames.length)
        : currentLayout;
      const framesJson = JSON.stringify(frames);
      if (framesJson.length > MAX_FRAMES_JSON_LENGTH) {
        setUploadError("This panel's combined frame images are too large to save. Clear a frame or use smaller images.");
        return;
      }
      const primary = frames.find((frame) => frame.imageData)?.imageData || imageData;
      setPanels((prev) => prev.map((p) => (p.id === panelId ? { ...p, imageData: primary, frames: framesJson, layout } : p)));
      await patchPanel(panelId, { imageData: primary, frames: framesJson, layout });
    } catch {
      setUploadError("Couldn't load that asset. Try again.");
    } finally {
      markSaving(panelId, false);
    }
  }, [assetsBase, markSaving, patchPanel]);

  const handleImageFitChange = useCallback(
    (id: string, imageFit: PanelImageFit) => {
      setPanels((prev) => prev.map((p) =>
        p.id === id ? { ...p, imageFit } : p
      ));
      patchPanel(id, { imageFit });
    },
    [patchPanel]
  );

  const handleFrameFitChange = useCallback(
    async (panel: Panel, frameIndex: number, fit: PanelImageFit | null) => {
      const layout = (panel.layout || getDefaultLayout(parseFrames(panel).length)) as PanelLayout;
      // padFramesForLayout (not ensureFramesForLayout): re-saving must not
      // truncate stored frames beyond the visible slots.
      const frames = padFramesForLayout(parseFrames(panel), layout);
      frames[frameIndex] = {
        ...frames[frameIndex],
        fit: fit || undefined,
      };
      const framesJson = JSON.stringify(frames);
      setPanels((prev) => prev.map((p) =>
        p.id === panel.id ? { ...p, frames: framesJson } : p
      ));
      await patchPanel(panel.id, { frames: framesJson });
    },
    [patchPanel]
  );

  /**
   * Put one frame slot back the way it was, recomputed against the panel as it
   * stands now so a concurrent edit to a different slot survives.
   *
   * No debounce to cancel here: the debounced writes only ever carry `caption`
   * or `overlays`, and the panel PATCH is a partial update, so neither can
   * clobber `frames` — while cancelling them WOULD throw away the author's
   * last keystrokes.
   */
  const restoreFrame = useCallback(
    async (panelId: string, frameIndex: number, previous: PanelFrame) => {
      const panel = panelsRef.current.find((p) => p.id === panelId);
      if (!panel) throw new Error("That panel is gone, so its frame can't come back.");
      const layout = (panel.layout || getDefaultLayout(parseFrames(panel).length)) as PanelLayout;
      const frames = padFramesForLayout(parseFrames(panel), layout);
      while (frames.length <= frameIndex) {
        frames.push({ id: `frame-${frames.length + 1}`, imageData: "", fit: undefined });
      }
      frames[frameIndex] = { ...previous };
      const framesJson = JSON.stringify(frames);
      if (framesJson.length > MAX_FRAMES_JSON_LENGTH) {
        throw new Error("This panel is too full to put that frame back. Clear a frame first.");
      }
      const imageData = frames.find((frame) => frame.imageData)?.imageData || "";
      setPanels((prev) => prev.map((p) =>
        p.id === panelId ? { ...p, imageData, frames: framesJson } : p
      ));
      try {
        await patchPanelStrict(panelId, { imageData, frames: framesJson });
      } catch (err) {
        // Don't leave the canvas claiming a restore the server never took.
        setPanels((prev) => prev.map((p) =>
          p.id === panelId ? { ...p, imageData: panel.imageData, frames: panel.frames } : p
        ));
        throw err;
      }
    },
    [patchPanelStrict]
  );

  const handleClearFrame = useCallback(
    async (panel: Panel, frameIndex: number) => {
      const layout = (panel.layout || getDefaultLayout(parseFrames(panel).length)) as PanelLayout;
      // padFramesForLayout (not ensureFramesForLayout): re-saving must not
      // truncate stored frames beyond the visible slots.
      const frames = padFramesForLayout(parseFrames(panel), layout);
      const previous: PanelFrame = frames[frameIndex]
        ? { ...frames[frameIndex] }
        : { id: `frame-${frameIndex + 1}`, imageData: "", fit: undefined };
      frames[frameIndex] = {
        ...frames[frameIndex],
        imageData: "",
        fit: undefined,
      };
      const framesJson = JSON.stringify(frames);
      const imageData = frames.find((frame) => frame.imageData)?.imageData || "";
      setPanels((prev) => prev.map((p) =>
        p.id === panel.id ? { ...p, imageData, frames: framesJson } : p
      ));
      const saved = await patchPanel(panel.id, { imageData, frames: framesJson });
      if (saved && previous.imageData) {
        pushUndo("Frame cleared", () => restoreFrame(panel.id, frameIndex, previous));
      }
    },
    [patchPanel, pushUndo, restoreFrame]
  );

  const handleLayoutChange = useCallback(
    async (id: string, layout: PanelLayout) => {
      const panel = panelsRef.current.find((candidate) => candidate.id === id);
      const previousLayout = (panel?.layout || getDefaultLayout(panel ? parseFrames(panel).length : 0)) as PanelLayout;
      // Pad without truncating: switching to a layout with fewer slots must
      // not destroy the extra frames' images — the renderers hide them, and
      // switching back restores them.
      const frames = padFramesForLayout(panel ? parseFrames(panel) : [], layout);
      const framesJson = JSON.stringify(frames);
      const imageData = frames.find((frame) => frame.imageData)?.imageData || panel?.imageData || "";
      setPanels((prev) => prev.map((p) =>
        p.id === id ? { ...p, imageData, frames: framesJson, layout } : p
      ));
      const saved = await patchPanel(id, { imageData, frames: framesJson, layout });
      // Only the layout needs reversing — the padding above is harmless and the
      // frames themselves were never touched.
      if (saved && previousLayout !== layout) {
        pushUndo("Layout changed", async () => {
          setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, layout: previousLayout } : p)));
          try {
            await patchPanelStrict(id, { layout: previousLayout });
          } catch (err) {
            setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, layout } : p)));
            throw err;
          }
        });
      }
    },
    [patchPanel, patchPanelStrict, pushUndo]
  );

  const handleAddFrames = useCallback(
    async (panel: Panel, files: FileList) => {
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        setUploadError("No valid image files selected.");
        return;
      }

      markSaving(panel.id, true);
      setUploadError(null);
      try {
        const existingFrames = parseFrames(panel);
        const addedFrames: PanelFrame[] = [];
        for (const file of imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
          const imageData = await compressImage(file, PANEL_MAX_DIM, PANEL_QUALITY);
          addedFrames.push({
            id: `${Date.now()}-${addedFrames.length}`,
            imageData,
          });
        }

        const currentLayout = (panel.layout || getDefaultLayout(existingFrames.length)) as PanelLayout;
        // Fill empty layout slots first (where the editor canvas renders),
        // appending — and growing the layout — only once the slots are full.
        const { frames, dropped } = placeFramesInPanel(existingFrames, addedFrames, currentLayout);
        if (dropped === addedFrames.length) {
          setUploadError(`This panel already holds the maximum of ${MAX_PANEL_FRAMES} frames. Clear a frame first.`);
          return;
        }
        const layout = frames.length > Math.max(existingFrames.length, getLayoutSlotCount(currentLayout))
          ? getDefaultLayout(frames.length)
          : currentLayout;
        const framesJson = JSON.stringify(frames);
        if (framesJson.length > MAX_FRAMES_JSON_LENGTH) {
          setUploadError("This panel's combined frame images are too large to save. Use fewer or smaller images.");
          return;
        }
        const imageData = frames.find((frame) => frame.imageData)?.imageData || panel.imageData;

        setPanels((prev) => prev.map((p) =>
          p.id === panel.id ? { ...p, imageData, frames: framesJson, layout } : p
        ));
        await patchPanel(panel.id, { imageData, frames: framesJson, layout });
        if (dropped > 0) {
          setUploadError(
            `${dropped} image${dropped === 1 ? "" : "s"} couldn't be added — panels hold at most ${MAX_PANEL_FRAMES} frames.`
          );
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to add frames.");
      } finally {
        markSaving(panel.id, false);
      }
    },
    [markSaving, patchPanel]
  );

  const handleReplaceFrame = useCallback(
    async (panel: Panel, frameIndex: number, file: File) => {
      if (!file.type.startsWith("image/")) {
        setUploadError("No valid image file selected.");
        return;
      }

      markSaving(panel.id, true);
      setUploadError(null);
      try {
        const layout = (panel.layout || getDefaultLayout(parseFrames(panel).length)) as PanelLayout;
        // padFramesForLayout (not ensureFramesForLayout): re-saving must not
        // truncate stored frames beyond the visible slots.
        const frames = padFramesForLayout(parseFrames(panel), layout);
        const imageData = await compressImage(file, PANEL_MAX_DIM, PANEL_QUALITY);
        const previous: PanelFrame = frames[frameIndex]
          ? { ...frames[frameIndex] }
          : { id: `frame-${frameIndex + 1}`, imageData: "", fit: undefined };
        frames[frameIndex] = {
          id: frames[frameIndex]?.id || `frame-${frameIndex + 1}`,
          imageData,
          fit: frames[frameIndex]?.fit,
        };

        const framesJson = JSON.stringify(frames);
        if (framesJson.length > MAX_FRAMES_JSON_LENGTH) {
          setUploadError("This panel's combined frame images are too large to save. Use a smaller image.");
          return;
        }
        const primaryImageData = frames.find((frame) => frame.imageData)?.imageData || imageData;
        setPanels((prev) => prev.map((p) =>
          p.id === panel.id ? { ...p, imageData: primaryImageData, frames: framesJson, layout } : p
        ));
        const saved = await patchPanel(panel.id, { imageData: primaryImageData, frames: framesJson, layout });
        if (saved) {
          // An empty slot means this was an add, not a replacement — the
          // reversal is the same either way.
          pushUndo(previous.imageData ? "Frame replaced" : "Frame added", () =>
            restoreFrame(panel.id, frameIndex, previous)
          );
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to add frame image.");
      } finally {
        markSaving(panel.id, false);
      }
    },
    [markSaving, patchPanel, pushUndo, restoreFrame]
  );

  const handleOverlaysChange = useCallback(
    (id: string, overlaysList: TextOverlay[]) => {
      const json = JSON.stringify(overlaysList);
      setPanels((prev) => prev.map((p) =>
        p.id === id ? { ...p, overlays: json } : p
      ));

      // Debounce save
      schedulePanelSave(`overlay-${id}`, id, { overlays: json });
    },
    [schedulePanelSave]
  );

  /**
   * Write an overlay list straight through. Cancels the panel's pending
   * overlays debounce first — that payload is a snapshot of the list BEFORE
   * this change, so letting it fire afterwards would put the bubble back (or
   * take it away again). The list passed here is computed from local state, so
   * cancelling drops nothing.
   */
  const writeOverlays = useCallback(
    async (panelId: string, overlaysList: TextOverlay[]) => {
      const previous = panelsRef.current.find((p) => p.id === panelId)?.overlays ?? "[]";
      const json = JSON.stringify(overlaysList);
      cancelPanelSave(`overlay-${panelId}`);
      setPanels((prev) => prev.map((p) => (p.id === panelId ? { ...p, overlays: json } : p)));
      try {
        await patchPanelStrict(panelId, { overlays: json });
      } catch (err) {
        setPanels((prev) => prev.map((p) => (p.id === panelId ? { ...p, overlays: previous } : p)));
        throw err;
      }
    },
    [cancelPanelSave, patchPanelStrict]
  );

  const handleDeleteOverlay = useCallback(
    async (panelId: string, overlayId: string) => {
      const panel = panelsRef.current.find((p) => p.id === panelId);
      if (!panel) return;
      const overlays = parseOverlays(panel.overlays);
      const index = overlays.findIndex((o) => o.id === overlayId);
      if (index === -1) return;
      const removed = overlays[index];

      try {
        await writeOverlays(panelId, overlays.filter((o) => o.id !== overlayId));
      } catch {
        setUploadError("Bubble changes couldn't be saved. Check your connection and try again.");
        return;
      }

      pushUndo("Bubble deleted", async () => {
        const current = panelsRef.current.find((p) => p.id === panelId);
        if (!current) throw new Error("That panel is gone, so its bubble can't come back.");
        const list = parseOverlays(current.overlays);
        if (list.some((o) => o.id === removed.id)) return;
        const restored = [...list];
        restored.splice(Math.min(index, restored.length), 0, removed);
        await writeOverlays(panelId, restored);
      });
    },
    [pushUndo, writeOverlays]
  );

  /**
   * Bring a deleted panel back, art and lettering and all. The create API
   * always appends, so the panel returns under a NEW id and the old position is
   * re-applied with a follow-up reorder.
   */
  const restorePanel = useCallback(
    async (snapshot: Panel, index: number) => {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panels: [{
            imageData: snapshot.imageData || "",
            caption: snapshot.caption || "",
            sizing: (snapshot.sizing || "standard") as PanelSizing,
            layout: (snapshot.layout || getDefaultLayout(parseFrames(snapshot).length)) as PanelLayout,
            frames: snapshot.frames || JSON.stringify(parseFrames(snapshot)),
            borderStyle: (snapshot.borderStyle || "none") as PanelBorderStyle,
            imageFit: (snapshot.imageFit || "cover") as PanelImageFit,
            aspectRatio: snapshot.aspectRatio,
            overlays: snapshot.overlays || "[]",
            seam: normalizeSeam(snapshot.seam),
          }],
        }),
      });
      const json = await res.json().catch(() => null);
      const created: Panel | undefined = json?.data?.[0];
      if (!res.ok || !created) {
        throw new Error(json?.error?.message || "That panel couldn't be brought back. Try again.");
      }

      const next = [...panelsRef.current];
      next.splice(index < 0 ? next.length : Math.min(index, next.length), 0, created);
      const ordered = next.map((panel, i) => ({ ...panel, sortOrder: i }));
      panelsRef.current = ordered;
      setPanels(ordered);
      await persistOrder(ordered);
    },
    [apiBase, persistOrder]
  );

  const handleDeletePanel = useCallback(
    async (id: string) => {
      cancelPanelSave(id);
      cancelPanelSave(`overlay-${id}`);
      const removedIndex = panelsRef.current.findIndex((p) => p.id === id);
      const removedPanel = removedIndex === -1 ? null : { ...panelsRef.current[removedIndex] };
      setPanels((prev) => {
        const next = prev.filter((p) => p.id !== id);
        panelsRef.current = next;
        return next;
      });
      try {
        const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Panel delete failed");
        setUploadError(null);
        if (removedPanel) {
          pushUndo("Panel deleted", () => restorePanel(removedPanel, removedIndex));
        }
      } catch {
        // Re-insert only the panel this delete removed — restoring a full
        // pre-delete snapshot would resurrect panels deleted (or roll back
        // edits made) while this request was in flight.
        if (removedPanel) {
          setPanels((prev) => {
            if (prev.some((p) => p.id === id)) return prev;
            const next = [...prev];
            next.splice(
              removedIndex < 0 ? next.length : Math.min(removedIndex, next.length),
              0,
              removedPanel
            );
            panelsRef.current = next;
            return next;
          });
        }
        setUploadError("Panel couldn't be deleted. It has been restored locally.");
      }
    },
    [apiBase, cancelPanelSave, pushUndo, restorePanel]
  );

  const handleAddStoryboardPanel = useCallback(async () => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const layout: PanelLayout = "top-pair-bottom";
      const frames = createEmptyFrames(getLayoutSlotCount(layout));
      await createPanels([
        {
          imageData: "",
          caption: "",
          sizing: "tall",
          layout,
          frames: JSON.stringify(frames),
          borderStyle: "none",
          imageFit: "cover",
          aspectRatio: "9:16",
          overlays: "[]",
        },
      ]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to add storyboard panel.");
    } finally {
      setIsUploading(false);
    }
  }, [createPanels]);

  const handleDuplicatePanel = useCallback(
    async (panel: Panel) => {
      setIsUploading(true);
      setUploadError(null);
      try {
        await createPanels([
          {
            imageData: panel.imageData,
            caption: panel.caption || "",
            sizing: (panel.sizing || "standard") as PanelSizing,
            layout: (panel.layout || getDefaultLayout(parseFrames(panel).length)) as PanelLayout,
            frames: panel.frames || JSON.stringify(parseFrames(panel)),
            borderStyle: (panel.borderStyle || "none") as PanelBorderStyle,
            imageFit: (panel.imageFit || "cover") as PanelImageFit,
            aspectRatio: panel.aspectRatio,
            overlays: panel.overlays || "[]",
            seam: panel.seam || "none",
          },
        ]);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to duplicate panel.");
      } finally {
        setIsUploading(false);
      }
    },
    [createPanels]
  );

  const handleBuildStoryboardFromScript = useCallback(async () => {
    const lines = stripHtmlToLines(scriptContent || "").slice(0, 24);
    if (lines.length === 0) {
      setUploadError("Write a few script beats first, then build thumbnails from them.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const created = await createPanels(
        lines.map((line) => {
          const layout: PanelLayout = "top-pair-bottom";
          return {
            imageData: "",
            caption: line,
            sizing: "tall" as PanelSizing,
            layout,
            frames: JSON.stringify(createEmptyFrames(getLayoutSlotCount(layout))),
            borderStyle: "none" as PanelBorderStyle,
            imageFit: "cover" as PanelImageFit,
            aspectRatio: "9:16",
            overlays: "[]",
          };
        })
      );
      setViewMode("visual");
      if (created.length > 0) {
        const createdIds = created.map((panel) => panel.id);
        pushUndo(`${createdIds.length} ${createdIds.length === 1 ? "panel" : "panels"} added`, async () => {
          const removed = new Set<string>();
          await Promise.all(createdIds.map(async (panelId) => {
            try {
              const res = await fetch(`${apiBase}/${panelId}`, { method: "DELETE" });
              // A 404 means it is already gone, which is the outcome we wanted.
              if (res.ok || res.status === 404) removed.add(panelId);
            } catch {
              // Left in `createdIds` so the retry below can pick it up.
            }
          }));
          const ordered = panelsRef.current
            .filter((panel) => !removed.has(panel.id))
            .map((panel, i) => ({ ...panel, sortOrder: i }));
          panelsRef.current = ordered;
          setPanels(ordered);
          if (removed.size < createdIds.length) {
            throw new Error("Some storyboard panels couldn't be removed. Try again.");
          }
          await persistOrder(ordered);
        });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to build storyboard.");
    } finally {
      setIsUploading(false);
    }
  }, [apiBase, createPanels, persistOrder, pushUndo, scriptContent]);

  // Building the storyboard again appends a second copy of every beat, so once
  // the episode already has panels the button asks for a second click first.
  const [storyboardArmed, setStoryboardArmed] = useState(false);
  const storyboardArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (storyboardArmTimer.current) clearTimeout(storyboardArmTimer.current);
  }, []);

  const handleStoryboardClick = useCallback(() => {
    if (storyboardArmTimer.current) clearTimeout(storyboardArmTimer.current);
    if (panelsRef.current.length > 0 && !storyboardArmed) {
      setStoryboardArmed(true);
      storyboardArmTimer.current = setTimeout(() => setStoryboardArmed(false), 5000);
      return;
    }
    setStoryboardArmed(false);
    void handleBuildStoryboardFromScript();
  }, [handleBuildStoryboardFromScript, storyboardArmed]);

  // Reorder.Group fires onReorder on EVERY position crossing during a drag, so
  // this only updates local state — persisting here would fire a burst of
  // overlapping PUTs that can interleave server-side. The order is saved once,
  // on drag end (handleReorderCommit).
  const reorderDirtyRef = useRef(false);
  const handleReorder = useCallback(
    (reordered: Panel[]) => {
      const currentIds = new Set(panelsRef.current.map((panel) => panel.id));
      const reorderedCurrentPanels = reordered.filter((panel) => currentIds.has(panel.id));
      if (reorderedCurrentPanels.length !== currentIds.size) {
        return;
      }

      const updated = reorderedCurrentPanels.map((p, i) => ({ ...p, sortOrder: i }));
      panelsRef.current = updated;
      reorderDirtyRef.current = true;
      setPanels(updated);
    },
    []
  );

  const handleReorderCommit = useCallback(() => {
    if (!reorderDirtyRef.current) return;
    reorderDirtyRef.current = false;

    fetch(`${apiBase}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panels: panelsRef.current.map((p) => ({ id: p.id, sortOrder: p.sortOrder })),
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Panel reorder failed");
        setUploadError(null);
      })
      .catch(async () => {
        // Re-fetch the authoritative order instead of restoring a snapshot —
        // other edits may have landed while this request was in flight.
        try {
          const res = await fetch(apiBase);
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.data)) {
              panelsRef.current = json.data;
              setPanels(json.data);
            }
          }
        } catch {
          // Keep the local order — the next successful save will persist it.
        }
        setUploadError("Panel order couldn't be saved. Check your connection and try again.");
      });
  }, [apiBase]);

  const handleFilesSelected = useCallback(
    async (files: FileList) => {
      setIsUploading(true);
      setUploadError(null);

      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );

      if (imageFiles.length === 0) {
        setUploadError("No valid image files selected.");
        setIsUploading(false);
        return;
      }

      try {
        const frames: PanelFrame[] = [];

        for (const file of imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
          const dataUrl = await compressImage(file, PANEL_MAX_DIM, PANEL_QUALITY);
          frames.push({
            id: `${Date.now()}-${frames.length}`,
            imageData: dataUrl,
          });
        }

        if (uploadMode === "panels") {
          await createPanels(
            frames.map((frame) => ({
              imageData: frame.imageData,
              caption: "",
              sizing: "standard",
              layout: "single" as PanelLayout,
              frames: JSON.stringify([frame]),
              borderStyle: "none" as PanelBorderStyle,
              imageFit: "cover" as PanelImageFit,
              aspectRatio: null,
              overlays: "[]",
            }))
          );
        } else {
          // One panel holds at most MAX_PANEL_FRAMES frames; say so instead of
          // quietly dropping the rest, exactly like handleAddFrames does.
          const kept = frames.slice(0, MAX_PANEL_FRAMES);
          const dropped = frames.length - kept.length;
          await createPanels([
            {
              imageData: kept[0]?.imageData || "",
              caption: "",
              sizing: "standard",
              layout: getDefaultLayout(kept.length),
              frames: JSON.stringify(kept),
              borderStyle: "none",
              imageFit: "cover",
              aspectRatio: null,
              overlays: "[]",
            },
          ]);
          if (dropped > 0) {
            setUploadError(
              `${dropped} image${dropped === 1 ? "" : "s"} couldn't be added — panels hold at most ${MAX_PANEL_FRAMES} frames. Use "Separate panels" to keep them all.`
            );
          }
        }
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Failed to process images."
        );
      } finally {
        setIsUploading(false);
      }
    },
    [createPanels, uploadMode]
  );

  // ---- Cleanup caption timers (flushing un-fired saves) ----
  useEffect(() => {
    const timers = captionTimers.current;
    const pending = pendingDebouncedSaves.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      // Flush debounced caption/overlay saves that haven't fired yet — the
      // studio remounts the editor per episode (key={episode.id}), so without
      // this the last <600ms of edits before a switch are silently lost.
      // A marker in localStorage records what was in flight: each confirmed
      // save clears its share, so a marker that survives means a flush died
      // with the page — the next mount compares it against the server and
      // says so instead of letting the loss stay invisible.
      const markerKey = FLUSH_MARKER_PREFIX + apiBase;
      const entries = [...pending.values()];
      if (entries.length > 0) {
        try {
          localStorage.setItem(markerKey, JSON.stringify({ at: Date.now(), entries }));
        } catch {}
      }
      let unconfirmed = entries.length;
      pending.forEach(({ panelId, data }) => {
        void fetch(`${apiBase}/${panelId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          keepalive: true,
        })
          .then((r) => {
            if (!r.ok) return;
            unconfirmed -= 1;
            if (unconfirmed === 0) {
              try {
                localStorage.removeItem(markerKey);
              } catch {}
            }
          })
          .catch(() => {});
      });
      pending.clear();
    };
  }, [apiBase]);

  // ---- Surface a flush that died with the last page ----
  useEffect(() => {
    if (isLoading) return;
    const markerKey = FLUSH_MARKER_PREFIX + apiBase;
    try {
      const raw = localStorage.getItem(markerKey);
      if (!raw) return;
      const marker = JSON.parse(raw) as {
        at?: number;
        entries?: { panelId: string; data: Record<string, unknown> }[];
      };
      // A fresh marker belongs to a flush still in flight from an episode
      // switch moments ago — leave it; success will clear it itself.
      if (typeof marker.at !== "number" || Date.now() - marker.at < 3_000) return;
      localStorage.removeItem(markerKey);
      // Only warn when the server really doesn't have what the flush carried.
      const lost = (marker.entries ?? []).some(({ panelId, data }) => {
        const panel = panelsRef.current.find((p) => p.id === panelId);
        if (!panel) return false; // panel is gone — nothing left to disagree
        return Object.entries(data).some(
          ([field, value]) => (panel as unknown as Record<string, unknown>)[field] !== value
        );
      });
      if (lost) {
        setUploadError(
          "A caption or bubble edit from your last visit didn't reach the server — the panels show what was kept. Re-apply the change you're missing."
        );
      }
    } catch {}
  }, [isLoading, apiBase]);

  // ---- Render ----

  const panelCount = panels.length;
  const overlayCount = useMemo(
    () => panels.reduce((sum, panel) => sum + parseOverlays(panel.overlays).length, 0),
    [panels]
  );
  const captionedCount = panels.filter((panel) => panel.caption.trim().length > 0).length;
  // The rails (left outline / right inspector) only show in the standalone
  // studio (`wide`) while editing — not in preview, script, or the narrow shell.
  const showRails = wide && editable && !previewMode && viewMode === "visual";
  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? panels[0] ?? null;
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
          <p className="text-sm text-text-ghost">Loading episode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-void overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-surface/30 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {showRails && (
            <button
              type="button"
              onClick={() => setLeftRailOpen(true)}
              className="lg:hidden rounded-md border border-border p-1.5 text-text-ghost transition-colors hover:text-paper"
              aria-label="Open panel list"
              title="Panels"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4h12M2 8h12M2 12h8" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-3 text-xs text-text-ghost">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="10" height="10" rx="1.5" />
                <path d="M5 2v10M9 2v10M2 5h10M2 9h10" />
              </svg>
              {panelCount} {panelCount === 1 ? "panel" : "panels"}
            </span>
            <span className="text-text-ghost/30">|</span>
            <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
            <span className="text-text-ghost/30 hidden sm:inline">|</span>
            <span className="hidden sm:inline">{overlayCount} {overlayCount === 1 ? "bubble" : "bubbles"}</span>
            <span className="text-text-ghost/30 hidden md:inline">|</span>
            <span className="hidden md:inline">{captionedCount}/{panelCount || 0} noted</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showRails && (
            <button
              type="button"
              onClick={() => setRightRailOpen(true)}
              className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-ghost transition-colors hover:border-amber/25 hover:text-amber"
              aria-label="Open panel inspector"
              title="Panel inspector"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h10v10H3z" />
                <path d="M6 6h4M6 8.5h4M6 11h2" />
              </svg>
            </button>
          )}
          {editable && viewMode === "visual" && (
            <button
              type="button"
              onClick={() => setPreviewMode((preview) => !preview)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${
                previewMode
                  ? "border-amber/30 bg-amber/[0.06] text-amber"
                  : "border-border text-text-secondary hover:border-amber/25 hover:text-amber"
              }`}
              title="Toggle clean reader preview"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 7s2-3.5 5.5-3.5S12.5 7 12.5 7 10.5 10.5 7 10.5 1.5 7 1.5 7z" />
                <circle cx="7" cy="7" r="1.5" />
              </svg>
              Preview
            </button>
          )}
          {editable && (
            <>
              <button
                type="button"
                onClick={handleAddStoryboardPanel}
                disabled={isUploading}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-amber/25 hover:text-amber disabled:opacity-50"
                title="Add storyboard panel"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="2" y="2" width="10" height="10" rx="1.5" />
                  <path d="M7 4v6M4 7h6" />
                </svg>
                Panel
              </button>
              {scriptContent !== undefined && (
                <button
                  type="button"
                  onClick={handleStoryboardClick}
                  disabled={isUploading}
                  className={`hidden md:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors disabled:opacity-50 ${
                    storyboardArmed
                      ? "border-amber/50 bg-amber/[0.12] text-amber"
                      : "border-amber/20 bg-amber/[0.04] text-amber hover:bg-amber/[0.08]"
                  }`}
                  title={
                    storyboardArmed
                      ? "This adds a new panel for every script beat, on top of the ones you already have"
                      : "Create thumbnail panels from script beats"
                  }
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2h8v10H3z" />
                    <path d="M5 5h4M5 8h2" />
                  </svg>
                  {storyboardArmed ? "Add panels anyway?" : "Storyboard"}
                </button>
              )}
            </>
          )}

          {/* View toggle */}
          {scriptContent !== undefined && (
            <div className="flex items-center bg-void/50 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("visual")}
                disabled={previewMode}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "visual"
                    ? "bg-surface text-paper shadow-sm"
                    : "text-text-ghost hover:text-text-secondary"
                }`}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={() => setViewMode("script")}
                disabled={previewMode}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "script"
                    ? "bg-surface text-paper shadow-sm"
                    : "text-text-ghost hover:text-text-secondary"
                }`}
              >
                Script
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* Left rail — panel outline + asset tray (desktop) */}
        {showRails && (
          <aside className="hidden shrink-0 flex-col border-r border-border bg-surface/40 lg:flex lg:w-56">
            <div className="min-h-0 flex-1">
              <PanelOutlineRail
                panels={panels}
                selectedId={selectedPanel?.id ?? null}
                onSelect={setSelectedPanelId}
                onAdd={handleAddStoryboardPanel}
                onDelete={handleDeletePanel}
                isUploading={isUploading}
              />
            </div>
            <AssetTray
              storyId={storyId}
              assets={assets}
              canApply={!!selectedPanel}
              onUpload={handleUploadAsset}
              onApply={(assetId) => selectedPanel && handleApplyAssetToPanel(selectedPanel.id, assetId)}
              onDelete={handleDeleteAsset}
            />
          </aside>
        )}

      {/* Main content area */}
      {viewMode === "visual" && previewMode ? (
        /* Reader-true preview: the actual WebtoonReader at phone width, so the
           author sees the real thumb-scroll — seams, lettering, and all. */
        <div className="flex-1 overflow-y-auto bg-void/40 py-8">
          <div className="mx-auto w-[390px] max-w-full px-3">
            <div className="flex h-[720px] flex-col overflow-hidden rounded-[2rem] border border-border bg-void shadow-2xl shadow-black/50">
              <div className="flex shrink-0 items-center justify-center border-b border-border-subtle bg-black/40 py-2">
                <span className="h-1 w-16 rounded-full bg-text-ghost/30" />
              </div>
              <WebtoonReader
                storyId={storyId}
                chapterId={chapterId}
                chapterTitle=""
                panels={panels}
                showEmptyFrames
              />
            </div>
            <p className="mt-3 text-center text-[11px] text-text-ghost">Reader preview · phone width</p>
          </div>
        </div>
      ) : viewMode === "visual" ? (
        <div className="flex-1 overflow-y-auto">
          <div className={`${wide ? "max-w-[920px]" : "max-w-[680px]"} mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-8`}>
            {/* Panel list */}
            {panelCount > 0 && editable && !previewMode ? (
              <Reorder.Group
                axis="y"
                values={panels}
                onReorder={handleReorder}
                className="flex flex-wrap items-start gap-x-4 gap-y-0 sm:gap-x-6"
              >
                <AnimatePresence mode="popLayout">
                  {panels.map((panel, i) => (
                    <ReorderablePanelCard
                      key={panel.id}
                      panel={panel}
                      index={i}
                      editable={editable}
                      isSaving={savingPanels.has(panel.id)}
                      onReorderCommit={handleReorderCommit}
                      onCaptionChange={handleCaptionChange}
                      onSizingChange={handleSizingChange}
                      onAspectRatioChange={handleAspectRatioChange}
                      onLayoutChange={handleLayoutChange}
                      onBorderStyleChange={handleBorderStyleChange}
                      onImageFitChange={handleImageFitChange}
                      onFrameFitChange={handleFrameFitChange}
                      onAddFrames={handleAddFrames}
                      onReplaceFrame={handleReplaceFrame}
                      onClearFrame={handleClearFrame}
                      onOverlaysChange={handleOverlaysChange}
                      onOverlayDelete={handleDeleteOverlay}
                      onSeamChange={handleSeamChange}
                      onDuplicate={handleDuplicatePanel}
                      onDelete={handleDeletePanel}
                      className={`w-full ${getSeamClass(panel.seam, i === 0)} ${
                        showRails && panel.id === selectedPanel?.id ? "outline outline-1 outline-offset-4 outline-amber/35" : ""
                      }`}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            ) : panelCount > 0 ? (
              <div className="flex flex-wrap items-start gap-x-4 gap-y-0 sm:gap-x-6">
                <AnimatePresence mode="popLayout">
                  {panels.map((panel, i) => (
                    <PanelCard
                      key={panel.id}
                      panel={panel}
                      index={i}
                      editable={editable && !previewMode}
                      isSaving={false}
                      className={`w-full ${getSeamClass(panel.seam, i === 0)} ${
                        showRails && panel.id === selectedPanel?.id ? "outline outline-1 outline-offset-4 outline-amber/35" : ""
                      }`}
                      onCaptionChange={handleCaptionChange}
                      onSizingChange={handleSizingChange}
                      onAspectRatioChange={handleAspectRatioChange}
                      onLayoutChange={handleLayoutChange}
                      onBorderStyleChange={handleBorderStyleChange}
                      onImageFitChange={handleImageFitChange}
                      onFrameFitChange={handleFrameFitChange}
                      onAddFrames={handleAddFrames}
                      onReplaceFrame={handleReplaceFrame}
                      onClearFrame={handleClearFrame}
                      onOverlaysChange={handleOverlaysChange}
                      onOverlayDelete={handleDeleteOverlay}
                      onDuplicate={handleDuplicatePanel}
                      onDelete={handleDeletePanel}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : null}

            {/* Empty state / upload zone */}
            {editable && !previewMode && (
              <>
                {panelCount === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-4"
                  >
                    <h2 className="font-display text-xl text-paper mb-2">
                      {placeholder || "Start your episode"}
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Upload your panels to begin building the episode. You can
                      reorder them by dragging.
                    </p>
                  </motion.div>
                )}

                <UploadZone
                  onFilesSelected={handleFilesSelected}
                  isLoading={isUploading}
                  uploadMode={uploadMode}
                  onUploadModeChange={setUploadMode}
                />

                <AnimatePresence>
                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose/10 border border-rose/20 text-rose text-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 5v4M8 11v0.5" />
                      </svg>
                      {uploadError}
                      <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        className="ml-auto text-rose/60 hover:text-rose"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <line x1="3" y1="3" x2="9" y2="9" />
                          <line x1="9" y1="3" x2="3" y2="9" />
                        </svg>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ---- Script Mode ---- */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-1/2 md:min-h-0 min-h-[50vh] border-b md:border-b-0 md:border-r border-border bg-surface flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border">
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Episode Script
              </h3>
              <div className="flex min-w-0 items-center gap-3">
                {/* The server rejects scripts past the limit — count down to it
                    instead of letting the save fail with no explanation. */}
                {(scriptContent ?? "").length > SCRIPT_WARN_CHARS && (
                  <span
                    className={`shrink-0 font-mono text-[10.5px] ${
                      (scriptContent ?? "").length > SCRIPT_MAX_CHARS ? "text-rose" : "text-text-ghost"
                    }`}
                  >
                    {(scriptContent ?? "").length.toLocaleString()} / {SCRIPT_MAX_CHARS.toLocaleString()}
                  </span>
                )}
                {scriptSaveError && (
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-rose">
                    <svg className="shrink-0" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v4M8 11v0.5" />
                    </svg>
                    <span className="truncate">{scriptSaveError}</span>
                  </span>
                )}
              </div>
            </div>
            <ScriptPane
              content={scriptContent || ""}
              onUpdate={onScriptUpdate}
            />
          </div>

          <div className="w-full md:w-1/2 bg-void flex flex-col">
            <div className="px-4 sm:px-5 py-3 border-b border-border">
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Panel Sequence
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 sm:px-4 py-6 space-y-4">
                {panelCount > 0 ? (
                  panels.map((panel, i) => {
                    const previewImage = parseFrames(panel).find((frame) => frame.imageData)?.imageData || panel.imageData;

                    return (
                      <div
                        key={panel.id}
                        className="bg-surface border border-border rounded-lg overflow-hidden"
                      >
                        <div className="relative">
                          <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-amber text-void text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </div>
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt={`Panel ${i + 1}`}
                              className="w-full block"
                              draggable={false}
                            />
                          ) : (
                            <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 bg-elevated text-text-ghost">
                              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="4" y="4" width="20" height="20" rx="3" />
                                <circle cx="10" cy="10" r="2" />
                                <path d="M4 20l5.5-5.5 4 4 3-3L24 23" />
                              </svg>
                              <span className="text-xs">Empty frame slots</span>
                            </div>
                          )}
                        </div>
                        {panel.caption && (
                          <div className="bg-elevated px-3 py-2">
                            <p className="text-xs text-text-secondary leading-relaxed">
                              {panel.caption}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-text-ghost">
                      No panels uploaded yet. Switch to Visual mode to add panels.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Right rail — inspector for the selected panel (desktop) */}
        {showRails && (
          <aside className="hidden shrink-0 border-l border-border bg-surface/40 lg:block lg:w-64">
            {selectedPanel ? (
              <PanelInspector
                panel={selectedPanel}
                index={panels.findIndex((p) => p.id === selectedPanel.id)}
                onLayout={handleLayoutChange}
                onSizing={handleSizingChange}
                onAspectRatio={handleAspectRatioChange}
                onBorder={handleBorderStyleChange}
                onFit={handleImageFitChange}
                onSeam={handleSeamChange}
                onAddBubble={handleAddBubbleToPanel}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-[12px] text-text-ghost">
                Add a panel to start.
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Mobile rail drawers (below lg) */}
      <AnimatePresence>
        {showRails && leftRailOpen && (
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setLeftRailOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-[61] flex w-[260px] max-w-[88vw] flex-col border-r border-border bg-surface/95 backdrop-blur-2xl"
            >
              <div className="min-h-0 flex-1">
                <PanelOutlineRail
                  panels={panels}
                  selectedId={selectedPanel?.id ?? null}
                  onSelect={(id) => { setSelectedPanelId(id); setLeftRailOpen(false); }}
                  onAdd={handleAddStoryboardPanel}
                  onDelete={handleDeletePanel}
                  isUploading={isUploading}
                />
              </div>
              <AssetTray
                storyId={storyId}
                assets={assets}
                canApply={!!selectedPanel}
                onUpload={handleUploadAsset}
                onApply={(assetId) => selectedPanel && handleApplyAssetToPanel(selectedPanel.id, assetId)}
                onDelete={handleDeleteAsset}
              />
            </motion.div>
          </div>
        )}
        {showRails && rightRailOpen && (
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setRightRailOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 right-0 z-[61] w-[280px] max-w-[88vw] border-l border-border bg-surface/95 backdrop-blur-2xl"
            >
              {selectedPanel ? (
                <PanelInspector
                  panel={selectedPanel}
                  index={panels.findIndex((p) => p.id === selectedPanel.id)}
                  onLayout={handleLayoutChange}
                  onSizing={handleSizingChange}
                  onAspectRatio={handleAspectRatioChange}
                  onBorder={handleBorderStyleChange}
                  onFit={handleImageFitChange}
                  onSeam={handleSeamChange}
                  onAddBubble={handleAddBubbleToPanel}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-[12px] text-text-ghost">
                  Add a panel to start.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <UndoToast toast={toast} onUndo={(entryId) => void runUndo(entryId)} onDismiss={dismissToast} />
    </div>
  );
}
