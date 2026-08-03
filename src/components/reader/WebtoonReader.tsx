"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { parseOverlays } from "@/types/editor";
import OverlayRenderer from "@/components/editor/OverlayRenderer";
import { getSeamClass } from "@/components/editor/webtoon-seam";

interface Panel {
  id: string;
  imageData: string;
  caption: string;
  sortOrder: number;
  sizing: string;
  layout?: string;
  frames?: string;
  borderStyle?: string;
  imageFit?: string;
  aspectRatio: string | null;
  overlays: string;
  seam?: string;
}

interface PanelFrame {
  id: string;
  imageData: string;
  /** Per-frame image fit override ("cover" | "contain" | "top"). */
  fit?: string;
}

// Legacy format from before panels table
interface LegacyPanel {
  id: string;
  imageDataUrl: string;
  caption: string;
  order: number;
}

interface WebtoonReaderProps {
  storyId: string;
  chapterId: string;
  chapterTitle: string;
  content?: string; // legacy: JSON string of panels (fallback)
  /** When provided (editor preview), render these panels directly and skip fetch. */
  panels?: Panel[];
  /**
   * Render gray "Empty frame" placeholders for frames without image data.
   * Only the editor preview should turn this on — public readers must never
   * see storyboard scaffolding, so empty frames are filtered out by default.
   */
  showEmptyFrames?: boolean;
  hasNextChapter?: boolean;
  hasPrevChapter?: boolean;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  nextChapterTitle?: string;
  reactionsElement?: React.ReactNode;
}

function parseLegacyPanels(content: string): Panel[] {
  if (!content || content.trim() === "" || content === "[]") return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((p: LegacyPanel) => ({
        id: p.id,
        imageData: p.imageDataUrl || "",
        caption: p.caption || "",
        sortOrder: p.order ?? 0,
        sizing: "standard",
        layout: "single",
        frames: JSON.stringify([{ id: p.id || "frame-1", imageData: p.imageDataUrl || "" }]),
        borderStyle: "none",
        imageFit: "cover",
        aspectRatio: null,
        overlays: "[]",
      }));
    }
  } catch {
    // Not JSON
  }
  return [];
}

function parseFrames(panel: Pick<Panel, "frames" | "imageData">): PanelFrame[] {
  try {
    const parsed = JSON.parse(panel.frames || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .map((frame, index) => ({
          id: typeof frame.id === "string" ? frame.id : `frame-${index + 1}`,
          imageData: typeof frame?.imageData === "string" ? frame.imageData : "",
          fit: frame?.fit === "cover" || frame?.fit === "contain" || frame?.fit === "top" ? frame.fit : undefined,
        }));
    }
  } catch {
    // Legacy panel.
  }

  return panel.imageData ? [{ id: "frame-1", imageData: panel.imageData }] : [];
}

function getLayoutSlotCount(layout: string | undefined, frameCount: number) {
  if (layout === "grid-6") return 6;
  if (layout === "mosaic-5") return 5;
  if (layout === "grid-4") return 4;
  if (layout === "top-pair-bottom" || layout === "left-stack-right") return 3;
  if (layout === "side-by-side" || layout === "stack") return 2;
  if (layout === "single") return 1;
  // Legacy panels without a layout: every stored frame is a slot.
  return frameCount;
}

function getLayoutClass(layout: string | undefined, frameCount: number) {
  if (frameCount <= 1) return "grid-cols-1";
  if (layout === "stack") return "grid-cols-1";
  if (layout === "mosaic-5") return "grid-cols-6";
  return "grid-cols-2";
}

function getFrameCellClass(layout: string | undefined, index: number, frameCount: number) {
  if (frameCount <= 1) return "";
  if (layout === "top-pair-bottom" && index === 2) return "col-span-2";
  if (layout === "left-stack-right" && index === 0) return "row-span-2";
  if (layout === "mosaic-5") return index < 2 ? "col-span-3" : "col-span-2";
  return "";
}

function getBorderStyleClasses(borderStyle: string | undefined) {
  switch (borderStyle) {
    case "black":
      return { panel: "bg-black p-1", grid: "gap-1 bg-black", cell: "bg-black" };
    case "light":
      return { panel: "bg-border-subtle p-px", grid: "gap-1 bg-border-subtle", cell: "bg-elevated" };
    default:
      return { panel: "bg-transparent p-0", grid: "gap-0 bg-transparent", cell: "bg-transparent" };
  }
}

function getImageFitClass(imageFit: string | undefined, shouldFillSlot: boolean) {
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

function getSizingStyle(sizing: string, aspectRatio: string | null): React.CSSProperties {
  if (sizing === "tall") return { aspectRatio: "9/16", objectFit: "cover" as const };
  if (sizing === "wide") return { aspectRatio: "16/9", objectFit: "cover" as const };
  // "full" ≈ one phone viewport tall (matches the editor; reader-true at phone width).
  if (sizing === "full") return { aspectRatio: "9/19.5", objectFit: "cover" as const };
  if (sizing === "custom" && aspectRatio) {
    const [w, h] = aspectRatio.split(":").map(Number);
    if (w && h) return { aspectRatio: `${w}/${h}`, objectFit: "cover" as const };
  }
  return {};
}

export default function WebtoonReader({
  storyId,
  chapterId,
  chapterTitle,
  content,
  hasNextChapter,
  hasPrevChapter,
  onNextChapter,
  onPrevChapter,
  nextChapterTitle,
  reactionsElement,
  panels: panelsProp,
  showEmptyFrames = false,
}: WebtoonReaderProps) {
  // When the editor passes `panels` (preview), render them live — derive rather
  // than sync into state, so there's no fetch and no setState-in-effect.
  const isPreview = panelsProp !== undefined;
  const [fetchedPanels, setFetchedPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [loadedPanels, setLoadedPanels] = useState<Set<string>>(new Set());

  // Fetch panels from API, fall back to legacy content parsing. Skipped entirely
  // in preview mode (the editor owns the panels).
  useEffect(() => {
    if (isPreview) return;
    let cancelled = false;

    async function loadPanels() {
      setIsLoading(true);
      setIsLocked(false);
      try {
        const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/panels`);
        // A gated episode answers 402 — that's a locked door, not an empty
        // room, and it must never fall through to "no panels yet".
        if (res.status === 402) {
          if (!cancelled) {
            setIsLocked(true);
            setIsLoading(false);
          }
          return;
        }
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.data && json.data.length > 0) {
            setFetchedPanels(json.data);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // API failed, try legacy
      }

      // Fallback: parse from content prop (legacy inline JSON)
      if (!cancelled && content) {
        setFetchedPanels(parseLegacyPanels(content));
      }
      if (!cancelled) setIsLoading(false);
    }

    loadPanels();
    return () => { cancelled = true; };
  }, [storyId, chapterId, content, isPreview]);

  const panels = isPreview ? (panelsProp as Panel[]) : fetchedPanels;
  const sortedPanels = useMemo(
    () => [...panels].sort((a, b) => a.sortOrder - b.sortOrder),
    [panels]
  );

  if (!isPreview && isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (isLocked) {
    // The page-level chapter fetch normally intercepts gated chapters with the
    // full ChapterLockScreen (terms, price, unlock button). Reaching here means
    // only the panels call was refused — say what's true and route to the door.
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <svg className="mx-auto mb-4 text-amber/70" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <p className="font-display text-lg text-paper">This episode is locked</p>
          <p className="mt-2 text-sm text-text-secondary">
            It&rsquo;s part of the paid chapters. Reload to see the unlock terms.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-full bg-gold-fill px-5 py-2.5 text-[13px] font-semibold text-on-gold transition-transform hover:-translate-y-0.5"
          >
            Show unlock terms
          </button>
        </div>
      </div>
    );
  }

  if (sortedPanels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-ghost">
        <p className="text-sm">No panels in this episode yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Episode title */}
        <h1 className="font-display text-2xl text-paper text-center mb-8">
          {chapterTitle}
        </h1>

        {/* Panels — continuous vertical scroll (webtoon standard) */}
        <div className="flex flex-wrap items-start justify-center gap-0">
          {sortedPanels.map((panel, i) => {
            const hasCustomSizing = panel.sizing !== "standard";
            const sizingStyle = getSizingStyle(panel.sizing, panel.aspectRatio);
            const overlays = parseOverlays(panel.overlays);
            const allFrames = parseFrames(panel);
            // Frames beyond the layout's slot count are storage-only extras
            // (kept so switching layouts never destroys art) — the editor
            // canvas never shows them, so readers must not either.
            const slotFrames = allFrames.slice(0, getLayoutSlotCount(panel.layout, allFrames.length));
            const slotCount = slotFrames.length;
            // Public readers never see "Empty frame" placeholders — only the
            // editor preview (showEmptyFrames) renders unfinished slots. Keep
            // each frame's original slot index so the layout's index-based
            // span classes stay correct after filtering.
            const indexedFrames = slotFrames.map((frame, slotIndex) => ({ frame, slotIndex }));
            const frames = showEmptyFrames
              ? indexedFrames
              : indexedFrames.filter(({ frame }) => frame.imageData);
            const borderClasses = getBorderStyleClasses(panel.borderStyle);
            const hasImageFrame = frames.some(({ frame }) => frame.imageData);

            return (
              <motion.div
                key={panel.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: loadedPanels.has(panel.id) || !hasImageFrame ? 1 : 0.3 }}
                className={`w-full relative ${borderClasses.panel} ${getSeamClass(panel.seam, i === 0)}`}
              >
                <div
                  className={`grid ${getLayoutClass(panel.layout, slotCount)} ${borderClasses.grid}`}
                  style={hasCustomSizing ? sizingStyle : undefined}
                >
                  {frames.map(({ frame, slotIndex }) => (
                    <div
                      key={`${frame.id}-${slotIndex}`}
                      className={`relative overflow-hidden ${borderClasses.cell} ${slotCount > 1 ? "min-h-32" : ""} ${getFrameCellClass(panel.layout, slotIndex, slotCount)}`}
                    >
                      {frame.imageData ? (
                        <img
                          src={frame.imageData}
                          alt={panel.caption || `Panel ${i + 1}, frame ${slotIndex + 1}`}
                          className={`w-full block ${getImageFitClass(frame.fit || panel.imageFit, hasCustomSizing || slotCount > 1)}`}
                          loading={i < 3 ? "eager" : "lazy"}
                          onLoad={() =>
                            setLoadedPanels((prev) => new Set(prev).add(panel.id))
                          }
                          onError={() =>
                            setLoadedPanels((prev) => new Set(prev).add(panel.id))
                          }
                        />
                      ) : (
                        <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 bg-elevated text-text-ghost">
                          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="4" width="20" height="20" rx="3" />
                            <circle cx="10" cy="10" r="2" />
                            <path d="M4 20l5.5-5.5 4 4 3-3L24 23" />
                          </svg>
                          <span className="text-xs">Empty frame</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Speech bubbles / text overlays */}
                {overlays.length > 0 && (
                  <OverlayRenderer overlays={overlays} />
                )}

                {/* Caption */}
                {panel.caption && (
                  <div className="bg-void/90 backdrop-blur-sm px-4 py-3 text-center">
                    <p className="text-text-secondary text-sm leading-relaxed italic">
                      {panel.caption}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Reactions */}
        {reactionsElement && <div className="mt-12">{reactionsElement}</div>}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 mb-16 px-4">
          {hasPrevChapter ? (
            <button
              type="button"
              onClick={onPrevChapter}
              className="flex items-center gap-2 text-text-secondary hover:text-paper transition-colors text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
              Previous
            </button>
          ) : (
            <div />
          )}

          {hasNextChapter && (
            <button
              type="button"
              onClick={onNextChapter}
              className="flex items-center gap-2 bg-amber text-void font-semibold px-5 py-2.5 rounded-full hover:bg-amber-light transition-all text-sm"
            >
              Next: {nextChapterTitle || "Next Episode"}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
