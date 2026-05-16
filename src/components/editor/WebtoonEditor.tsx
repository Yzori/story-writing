"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { compressImage } from "@/client/images";
import { parseOverlays, createTextOverlay } from "@/types/editor";
import type { TextOverlay } from "@/types/editor";
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
}

interface PanelFrame {
  id: string;
  imageData: string;
  fit?: PanelImageFit;
}

type PanelSizing = "standard" | "tall" | "wide" | "custom";
type PanelLayout = "single" | "side-by-side" | "stack" | "top-pair-bottom" | "left-stack-right" | "grid-4" | "mosaic-5" | "grid-6";
type PanelBorderStyle = "none" | "black" | "light";
type PanelImageFit = "cover" | "contain" | "top";
type UploadMode = "frames" | "panels";

const SIZING_OPTIONS: { key: PanelSizing; label: string; ratio: string }[] = [
  { key: "standard", label: "Standard", ratio: "" },
  { key: "tall", label: "Tall", ratio: "9:16" },
  { key: "wide", label: "Wide", ratio: "16:9" },
];

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
  onWordCountChange?: (count: number) => void;
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
  onLayoutChange,
  onBorderStyleChange,
  onImageFitChange,
  onFrameFitChange,
  onAddFrames,
  onReplaceFrame,
  onClearFrame,
  onOverlaysChange,
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
  onLayoutChange: (id: string, layout: PanelLayout) => void;
  onBorderStyleChange: (id: string, borderStyle: PanelBorderStyle) => void;
  onImageFitChange: (id: string, imageFit: PanelImageFit) => void;
  onFrameFitChange: (panel: Panel, frameIndex: number, fit: PanelImageFit | null) => void;
  onAddFrames: (panel: Panel, files: FileList) => void;
  onReplaceFrame: (panel: Panel, frameIndex: number, file: File) => void;
  onClearFrame: (panel: Panel, frameIndex: number) => void;
  onOverlaysChange: (id: string, overlays: TextOverlay[]) => void;
  onDuplicate: (panel: Panel) => void;
  onDelete: (id: string) => void;
}) {
  const sizingStyle = getSizingStyle(panel.sizing, panel.aspectRatio);
  const hasCustomSizing = panel.sizing !== "standard";
  const rawFrames = useMemo(() => parseFrames(panel), [panel]);
  const layout = (panel.layout || getDefaultLayout(rawFrames.length)) as PanelLayout;
  const frames = useMemo(() => ensureFramesForLayout(rawFrames, layout), [rawFrames, layout]);
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
    const updated = overlays.filter((o) => o.id !== overlayId);
    onOverlaysChange(panel.id, updated);
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
  onDuplicate,
  onDelete,
}: {
  panel: Panel;
  index: number;
  editable: boolean;
  isSaving: boolean;
  className?: string;
  onCaptionChange: (id: string, caption: string) => void;
  onSizingChange: (id: string, sizing: PanelSizing) => void;
  onLayoutChange: (id: string, layout: PanelLayout) => void;
  onBorderStyleChange: (id: string, borderStyle: PanelBorderStyle) => void;
  onImageFitChange: (id: string, imageFit: PanelImageFit) => void;
  onFrameFitChange: (panel: Panel, frameIndex: number, fit: PanelImageFit | null) => void;
  onAddFrames: (panel: Panel, files: FileList) => void;
  onReplaceFrame: (panel: Panel, frameIndex: number, file: File) => void;
  onClearFrame: (panel: Panel, frameIndex: number) => void;
  onOverlaysChange: (id: string, overlays: TextOverlay[]) => void;
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
        onLayoutChange={onLayoutChange}
        onBorderStyleChange={onBorderStyleChange}
        onImageFitChange={onImageFitChange}
        onFrameFitChange={onFrameFitChange}
        onAddFrames={onAddFrames}
        onReplaceFrame={onReplaceFrame}
        onClearFrame={onClearFrame}
        onOverlaysChange={onOverlaysChange}
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
// Main Component
// ---------------------------------------------------------------------------

export default function WebtoonEditor({
  storyId,
  chapterId,
  editable = true,
  placeholder,
  scriptContent,
  onScriptUpdate,
  onWordCountChange,
}: WebtoonEditorProps) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [savingPanels, setSavingPanels] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"visual" | "script">("visual");
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("frames");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Debounce timers for caption saves
  const captionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const panelsRef = useRef<Panel[]>([]);

  const apiBase = `/api/stories/${storyId}/chapters/${chapterId}/panels`;

  useEffect(() => {
    panelsRef.current = panels;
  }, [panels]);

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

  const patchPanel = useCallback(async (panelId: string, data: Record<string, unknown>) => {
    markSaving(panelId, true);
    try {
      const res = await fetch(`${apiBase}/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Panel save failed");
      setUploadError(null);
    } catch {
      setUploadError("Panel changes couldn't be saved. Check your connection and try again.");
    } finally {
      markSaving(panelId, false);
    }
  }, [apiBase, markSaving]);

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
      }>
    ) => {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panels: newPanelData }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Failed to create panels");
      }

      const json = await res.json();
      setPanels((prev) => [...prev, ...(json.data || [])]);
      setUploadError(null);
    },
    [apiBase]
  );

  // ---- Panel operations ----

  const handleCaptionChange = useCallback(
    (id: string, caption: string) => {
      // Update local state immediately
      setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));

      // Debounce the API call
      const existing = captionTimers.current.get(id);
      if (existing) clearTimeout(existing);
      captionTimers.current.set(id, setTimeout(() => {
        patchPanel(id, { caption });
        captionTimers.current.delete(id);
      }, 600));
    },
    [patchPanel]
  );

  const handleSizingChange = useCallback(
    (id: string, sizing: PanelSizing) => {
      const ratio = SIZING_OPTIONS.find((o) => o.key === sizing)?.ratio || null;
      setPanels((prev) => prev.map((p) =>
        p.id === id ? { ...p, sizing, aspectRatio: ratio } : p
      ));
      patchPanel(id, { sizing, aspectRatio: ratio });
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
      const frames = ensureFramesForLayout(parseFrames(panel), layout);
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

  const handleClearFrame = useCallback(
    async (panel: Panel, frameIndex: number) => {
      const layout = (panel.layout || getDefaultLayout(parseFrames(panel).length)) as PanelLayout;
      const frames = ensureFramesForLayout(parseFrames(panel), layout);
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
      await patchPanel(panel.id, { imageData, frames: framesJson });
    },
    [patchPanel]
  );

  const handleLayoutChange = useCallback(
    (id: string, layout: PanelLayout) => {
      const panel = panels.find((candidate) => candidate.id === id);
      const frames = ensureFramesForLayout(panel ? parseFrames(panel) : [], layout);
      const framesJson = JSON.stringify(frames);
      const imageData = frames.find((frame) => frame.imageData)?.imageData || panel?.imageData || "";
      setPanels((prev) => prev.map((p) =>
        p.id === id ? { ...p, imageData, frames: framesJson, layout } : p
      ));
      patchPanel(id, { imageData, frames: framesJson, layout });
    },
    [panels, patchPanel]
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

        const frames = [...existingFrames, ...addedFrames].slice(0, 6);
        const layout = panel.layout && panel.layout !== "single"
          ? (panel.layout as PanelLayout)
          : getDefaultLayout(frames.length);
        const framesJson = JSON.stringify(frames);
        const imageData = frames[0]?.imageData || panel.imageData;

        setPanels((prev) => prev.map((p) =>
          p.id === panel.id ? { ...p, imageData, frames: framesJson, layout } : p
        ));
        await patchPanel(panel.id, { imageData, frames: framesJson, layout });
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
        const frames = ensureFramesForLayout(parseFrames(panel), layout);
        const imageData = await compressImage(file, PANEL_MAX_DIM, PANEL_QUALITY);
        frames[frameIndex] = {
          id: frames[frameIndex]?.id || `frame-${frameIndex + 1}`,
          imageData,
          fit: frames[frameIndex]?.fit,
        };

        const framesJson = JSON.stringify(frames);
        const primaryImageData = frames.find((frame) => frame.imageData)?.imageData || imageData;
        setPanels((prev) => prev.map((p) =>
          p.id === panel.id ? { ...p, imageData: primaryImageData, frames: framesJson, layout } : p
        ));
        await patchPanel(panel.id, { imageData: primaryImageData, frames: framesJson, layout });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to add frame image.");
      } finally {
        markSaving(panel.id, false);
      }
    },
    [markSaving, patchPanel]
  );

  const handleOverlaysChange = useCallback(
    (id: string, overlaysList: TextOverlay[]) => {
      const json = JSON.stringify(overlaysList);
      setPanels((prev) => prev.map((p) =>
        p.id === id ? { ...p, overlays: json } : p
      ));

      // Debounce save
      const existing = captionTimers.current.get(`overlay-${id}`);
      if (existing) clearTimeout(existing);
      captionTimers.current.set(`overlay-${id}`, setTimeout(() => {
        patchPanel(id, { overlays: json });
        captionTimers.current.delete(`overlay-${id}`);
      }, 600));
    },
    [patchPanel]
  );

  const handleDeletePanel = useCallback(
    async (id: string) => {
      let previousPanels: Panel[] = [];
      const timersToClear = [id, `overlay-${id}`];
      timersToClear.forEach((timerId) => {
        const timer = captionTimers.current.get(timerId);
        if (timer) clearTimeout(timer);
        captionTimers.current.delete(timerId);
      });
      setPanels((prev) => {
        previousPanels = prev;
        const next = prev.filter((p) => p.id !== id);
        panelsRef.current = next;
        return next;
      });
      try {
        const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Panel delete failed");
        setUploadError(null);
      } catch {
        panelsRef.current = previousPanels;
        setPanels(previousPanels);
        setUploadError("Panel couldn't be deleted. Your episode has been restored locally.");
      }
    },
    [apiBase]
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
      await createPanels(
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
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to build storyboard.");
    } finally {
      setIsUploading(false);
    }
  }, [createPanels, scriptContent]);

  const handleReorder = useCallback(
    (reordered: Panel[]) => {
      const currentIds = new Set(panelsRef.current.map((panel) => panel.id));
      const reorderedCurrentPanels = reordered.filter((panel) => currentIds.has(panel.id));
      if (reorderedCurrentPanels.length !== currentIds.size) {
        return;
      }

      let previousPanels: Panel[] = [];
      const updated = reorderedCurrentPanels.map((p, i) => ({ ...p, sortOrder: i }));
      setPanels((prev) => {
        previousPanels = prev;
        panelsRef.current = updated;
        return updated;
      });

      fetch(`${apiBase}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panels: updated.map((p) => ({ id: p.id, sortOrder: p.sortOrder })),
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Panel reorder failed");
          setUploadError(null);
        })
        .catch(() => {
          panelsRef.current = previousPanels;
          setPanels(previousPanels);
          setUploadError("Panel order couldn't be saved. The previous order has been restored.");
        });
    },
    [apiBase]
  );

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
          await createPanels([
            {
              imageData: frames[0]?.imageData || "",
              caption: "",
              sizing: "standard",
              layout: getDefaultLayout(frames.length),
              frames: JSON.stringify(frames.slice(0, 6)),
              borderStyle: "none",
              imageFit: "cover",
              aspectRatio: null,
              overlays: "[]",
            },
          ]);
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

  // ---- Cleanup caption timers ----
  useEffect(() => {
    const timers = captionTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // ---- Render ----

  const panelCount = panels.length;
  const overlayCount = useMemo(
    () => panels.reduce((sum, panel) => sum + parseOverlays(panel.overlays).length, 0),
    [panels]
  );
  const captionedCount = panels.filter((panel) => panel.caption.trim().length > 0).length;
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
                  onClick={handleBuildStoryboardFromScript}
                  disabled={isUploading}
                  className="hidden md:flex items-center gap-1.5 rounded-lg border border-amber/20 bg-amber/[0.04] px-2.5 py-1.5 text-[11px] text-amber transition-colors hover:bg-amber/[0.08] disabled:opacity-50"
                  title="Create thumbnail panels from script beats"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2h8v10H3z" />
                    <path d="M5 5h4M5 8h2" />
                  </svg>
                  Storyboard
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

      {/* Main content area */}
      {viewMode === "visual" ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[680px] mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-8">
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
                      onCaptionChange={handleCaptionChange}
                      onSizingChange={handleSizingChange}
                      onLayoutChange={handleLayoutChange}
                      onBorderStyleChange={handleBorderStyleChange}
                      onImageFitChange={handleImageFitChange}
                      onFrameFitChange={handleFrameFitChange}
                      onAddFrames={handleAddFrames}
                      onReplaceFrame={handleReplaceFrame}
                      onClearFrame={handleClearFrame}
                      onOverlaysChange={handleOverlaysChange}
                      onDuplicate={handleDuplicatePanel}
                      onDelete={handleDeletePanel}
                      className="w-full"
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
                      onCaptionChange={handleCaptionChange}
                      onSizingChange={handleSizingChange}
                      onLayoutChange={handleLayoutChange}
                      onBorderStyleChange={handleBorderStyleChange}
                      onImageFitChange={handleImageFitChange}
                      onFrameFitChange={handleFrameFitChange}
                      onAddFrames={handleAddFrames}
                      onReplaceFrame={handleReplaceFrame}
                      onClearFrame={handleClearFrame}
                      onOverlaysChange={handleOverlaysChange}
                      onDuplicate={handleDuplicatePanel}
                      onDelete={handleDeletePanel}
                      className="w-full"
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
            <div className="px-4 sm:px-5 py-3 border-b border-border">
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Episode Script
              </h3>
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
    </div>
  );
}
