"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface IllustratedReaderProps {
  content: string;
  chapterTitle: string;
  hasNextChapter?: boolean;
  hasPrevChapter?: boolean;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  nextChapterTitle?: string;
  fontClass?: string;
  fontSizeValue?: string;
  reactionsElement?: React.ReactNode;
}

export default function IllustratedReader({
  content,
  chapterTitle,
  hasNextChapter,
  hasPrevChapter,
  onNextChapter,
  onPrevChapter,
  nextChapterTitle,
  fontClass,
  fontSizeValue,
  reactionsElement,
}: IllustratedReaderProps) {
  // Transform illustrated block divs into proper image elements for reading
  const processedContent = useMemo(() => {
    if (!content) return "";

    // Replace <div data-type="illustrated" ...> with rendered images
    // These come from Tiptap as self-closing divs with data attributes
    return content.replace(
      /<div[^>]*data-type="illustrated"[^>]*\/?>/g,
      (match) => {
        const src = extractAttr(match, "data-src");
        const alt = extractAttr(match, "data-alt") || "";
        const caption = extractAttr(match, "data-caption") || "";
        const layout = extractAttr(match, "data-layout") || "inline";
        const floatSide = extractAttr(match, "data-floatside") || "left";

        if (!src) return "";

        const layoutClass =
          layout === "side-by-side"
            ? floatSide === "right"
              ? "side-by-side-right"
              : "side-by-side"
            : layout;

        return `<figure class="illustration-block" data-layout="${layoutClass}">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" class="w-full h-auto rounded-lg" />
          ${caption ? `<figcaption class="text-center text-[12px] text-text-ghost mt-2 italic">${escapeHtml(caption)}</figcaption>` : ""}
        </figure>`;
      }
    );
  }, [content]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[680px] mx-auto px-8 py-16">
        {/* Chapter title */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display text-2xl text-paper text-center mb-12"
        >
          {chapterTitle}
        </motion.h1>

        {/* Illustrated content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className={`prose-reader illustrated-reader ${fontClass || ""}`}
          style={
            fontSizeValue
              ? ({ "--reader-font-size": fontSizeValue } as React.CSSProperties)
              : undefined
          }
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />

        {/* Reactions */}
        {reactionsElement && <div className="mt-16">{reactionsElement}</div>}

        {/* End marker */}
        <div className="flex items-center justify-center gap-4 mt-16 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent" />
          <span className="text-[11px] text-text-ghost tracking-[0.2em] uppercase">
            End of chapter
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent" />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 mb-16">
          {hasPrevChapter ? (
            <button
              onClick={onPrevChapter}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:text-paper hover:border-border-active transition-colors text-[13px]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M10 3L5 8l5 5" />
              </svg>
              Previous
            </button>
          ) : (
            <div />
          )}
          {hasNextChapter ? (
            <button
              onClick={onNextChapter}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber text-void font-medium hover:bg-amber/90 transition-colors text-[13px]"
            >
              {nextChapterTitle
                ? `Next: ${nextChapterTitle}`
                : "Next Chapter"}
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function extractAttr(tag: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, "i");
  const match = tag.match(regex);
  return match ? match[1] : null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
