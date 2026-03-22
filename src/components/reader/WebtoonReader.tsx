"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { parseOverlays } from "@/types/editor";
import OverlayRenderer from "@/components/editor/OverlayRenderer";

interface Panel {
  id: string;
  imageData: string;
  caption: string;
  sortOrder: number;
  sizing: string;
  aspectRatio: string | null;
  overlays: string;
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
        aspectRatio: null,
        overlays: "[]",
      }));
    }
  } catch {
    // Not JSON
  }
  return [];
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
}: WebtoonReaderProps) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedPanels, setLoadedPanels] = useState<Set<string>>(new Set());

  // Fetch panels from API, fall back to legacy content parsing
  useEffect(() => {
    let cancelled = false;

    async function loadPanels() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/panels`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.data && json.data.length > 0) {
            setPanels(json.data);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // API failed, try legacy
      }

      // Fallback: parse from content prop (legacy inline JSON)
      if (!cancelled && content) {
        setPanels(parseLegacyPanels(content));
      }
      if (!cancelled) setIsLoading(false);
    }

    loadPanels();
    return () => { cancelled = true; };
  }, [storyId, chapterId, content]);

  const sortedPanels = useMemo(
    () => [...panels].sort((a, b) => a.sortOrder - b.sortOrder),
    [panels]
  );

  if (isLoading) {
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
        <div className="flex flex-col items-center gap-0">
          {sortedPanels.map((panel, i) => {
            const hasCustomSizing = panel.sizing !== "standard";
            const sizingStyle = getSizingStyle(panel.sizing, panel.aspectRatio);
            const overlays = parseOverlays(panel.overlays);

            return (
              <motion.div
                key={panel.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: loadedPanels.has(panel.id) ? 1 : 0.3 }}
                className="w-full relative"
              >
                <img
                  src={panel.imageData}
                  alt={panel.caption || `Panel ${i + 1}`}
                  className={`w-full h-auto block ${hasCustomSizing ? "object-cover" : ""}`}
                  style={hasCustomSizing ? sizingStyle : undefined}
                  loading={i < 3 ? "eager" : "lazy"}
                  onLoad={() =>
                    setLoadedPanels((prev) => new Set(prev).add(panel.id))
                  }
                />

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
