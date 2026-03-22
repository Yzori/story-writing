"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { sanitizeHtmlClient } from "@/lib/sanitize-client";

interface ScreenplayReaderProps {
  content: string;
  chapterTitle: string;
  hasNextChapter?: boolean;
  hasPrevChapter?: boolean;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  nextChapterTitle?: string;
  reactionsElement?: React.ReactNode;
}

export default function ScreenplayReader({
  content,
  chapterTitle,
  hasNextChapter,
  hasPrevChapter,
  onNextChapter,
  onPrevChapter,
  nextChapterTitle,
  reactionsElement,
}: ScreenplayReaderProps) {
  const sanitizedContent = useMemo(() => sanitizeHtmlClient(content), [content]);

  return (
    <div className="flex-1 overflow-y-auto bg-void">
      <div className="max-w-[740px] mx-auto px-4 py-8">
        {/* Script page */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative bg-[#FAFAF5] rounded-sm shadow-2xl shadow-black/40 px-16 py-12 min-h-[600px]"
        >
          {/* Brass brads */}
          <div className="absolute top-8 left-6 w-3 h-3 rounded-full bg-[#B8A04A] shadow-inner opacity-40" />
          <div className="absolute bottom-8 left-6 w-3 h-3 rounded-full bg-[#B8A04A] shadow-inner opacity-40" />

          {/* Title page header */}
          <div className="text-center mb-8 pb-6 border-b border-[#e5e5dc]">
            <h1 className="font-mono text-[15px] font-bold uppercase tracking-wider text-[#1a1a1a]">
              {chapterTitle}
            </h1>
          </div>

          {/* Script content */}
          <div
            className="screenplay-reader-content"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </motion.div>

        {/* Reactions */}
        {reactionsElement && <div className="mt-12">{reactionsElement}</div>}

        {/* End marker */}
        <div className="flex items-center justify-center gap-4 mt-12 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent" />
          <span className="text-[11px] text-text-ghost tracking-[0.2em] uppercase">
            End of scene
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
                : "Next Scene"}
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
