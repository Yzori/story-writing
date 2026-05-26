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
        }));
    }
  } catch {
    // Legacy panel.
  }

  return panel.imageData ? [{ id: "frame-1", imageData: panel.imageData }] : [];
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
}: WebtoonReaderProps) {
  // When the editor passes `panels` (preview), render them live — derive rather
  // than sync into state, so there's no fetch and no setState-in-effect.
  const isPreview = panelsProp !== undefined;
  const [fetchedPanels, setFetchedPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedPanels, setLoadedPanels] = useState<Set<string>>(new Set());

  // Fetch panels from API, fall back to legacy content parsing. Skipped entirely
  // in preview mode (the editor owns the panels).
  useEffect(() => {
    if (isPreview) return;
    let cancelled = false;

    async function loadPanels() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/panels`);
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
            const frames = parseFrames(panel);
            const borderClasses = getBorderStyleClasses(panel.borderStyle);
            const hasImageFrame = frames.some((frame) => frame.imageData);

            return (
              <motion.div
                key={panel.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: loadedPanels.has(panel.id) || !hasImageFrame ? 1 : 0.3 }}
                className={`w-full relative ${borderClasses.panel} ${getSeamClass(panel.seam, i === 0)}`}
              >
                <div
                  className={`grid ${getLayoutClass(panel.layout, frames.length)} ${borderClasses.grid}`}
                  style={hasCustomSizing ? sizingStyle : undefined}
                >
                  {frames.map((frame, frameIndex) => (
                    <div
                      key={`${frame.id}-${frameIndex}`}
                      className={`relative overflow-hidden ${borderClasses.cell} ${frames.length > 1 ? "min-h-32" : ""} ${getFrameCellClass(panel.layout, frameIndex, frames.length)}`}
                    >
                      {frame.imageData ? (
                        <img
                          src={frame.imageData}
                          alt={panel.caption || `Panel ${i + 1}, frame ${frameIndex + 1}`}
                          className={`w-full block ${getImageFitClass(panel.imageFit, hasCustomSizing || frames.length > 1)}`}
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
