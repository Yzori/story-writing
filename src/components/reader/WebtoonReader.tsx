"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface Panel {
  id: string;
  imageDataUrl: string;
  caption: string;
  order: number;
}

interface WebtoonReaderProps {
  content: string;
  chapterTitle: string;
  hasNextChapter?: boolean;
  hasPrevChapter?: boolean;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  nextChapterTitle?: string;
  reactionsElement?: React.ReactNode;
}

function parsePanels(content: string): Panel[] {
  if (!content || content.trim() === "" || content === "[]") return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON — might be HTML from a novel editor, show nothing
  }
  return [];
}

export default function WebtoonReader({
  content,
  chapterTitle,
  hasNextChapter,
  hasPrevChapter,
  onNextChapter,
  onPrevChapter,
  nextChapterTitle,
  reactionsElement,
}: WebtoonReaderProps) {
  const panels = useMemo(() => parsePanels(content), [content]);
  const [loadedPanels, setLoadedPanels] = useState<Set<string>>(new Set());

  if (panels.length === 0) {
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
          {panels
            .sort((a, b) => a.order - b.order)
            .map((panel, i) => (
              <motion.div
                key={panel.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: loadedPanels.has(panel.id) ? 1 : 0.3 }}
                className="w-full relative"
              >
                {/* Panel image */}
                <img
                  src={panel.imageDataUrl}
                  alt={panel.caption || `Panel ${i + 1}`}
                  className="w-full h-auto block"
                  loading={i < 3 ? "eager" : "lazy"}
                  onLoad={() =>
                    setLoadedPanels((prev) => new Set(prev).add(panel.id))
                  }
                />

                {/* Caption */}
                {panel.caption && (
                  <div className="bg-void/90 backdrop-blur-sm px-4 py-3 text-center">
                    <p className="text-text-secondary text-sm leading-relaxed italic">
                      {panel.caption}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
