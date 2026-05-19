"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { sanitizeHtmlClient } from "@/lib/sanitize-client";

interface PoetryReaderProps {
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

export default function PoetryReader({
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
}: PoetryReaderProps) {
  const sanitizedContent = useMemo(() => sanitizeHtmlClient(content), [content]);

  // Check if content already has stanza structure
  const hasStanzaStructure = useMemo(
    () => content.includes('class="stanza"'),
    [content]
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[600px] mx-auto px-5 sm:px-6 md:px-8 py-10 sm:py-14 md:py-16">
        {/* Poem title */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display text-2xl text-paper text-center mb-12"
        >
          {chapterTitle}
        </motion.h1>

        {/* Poetry content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className={`novel-reader poetry-reader ${fontClass || ""}`}
          style={
            fontSizeValue
              ? ({ "--reader-font-size": fontSizeValue } as React.CSSProperties)
              : undefined
          }
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Reactions */}
        {reactionsElement && <div className="mt-16">{reactionsElement}</div>}

        {/* End marker */}
        <div className="flex items-center justify-center gap-4 mt-16 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent" />
          <span className="text-[11px] text-text-ghost tracking-[0.2em] uppercase">
            End
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent" />
        </div>

        {/* Chapter navigation */}
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
                : "Next Poem"}
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
