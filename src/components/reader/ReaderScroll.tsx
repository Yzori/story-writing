"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { sanitizeHtmlClient } from "@/lib/sanitize-client";

interface ReaderScrollProps {
  htmlContent: string;
  chapterTitle: string;
  hasNextChapter?: boolean;
  hasPrevChapter?: boolean;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  nextChapterTitle?: string;
  authorNoteBefore?: string;
  authorNoteAfter?: string;
  fontClass?: string;
  fontSizeValue?: string;
  initialScrollPercent?: number;
  onScrollProgress?: (percent: number) => void;
  reactionsElement?: React.ReactNode;
}

export default function ReaderScroll({
  htmlContent,
  chapterTitle,
  hasNextChapter,
  hasPrevChapter,
  onNextChapter,
  onPrevChapter,
  nextChapterTitle,
  authorNoteBefore,
  authorNoteAfter,
  fontClass,
  fontSizeValue,
  initialScrollPercent,
  onScrollProgress,
  reactionsElement,
}: ReaderScrollProps) {
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const sanitizedContent = useMemo(() => sanitizeHtmlClient(htmlContent), [htmlContent]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      setProgress(100);
      return;
    }
    const pct = (el.scrollTop / scrollable) * 100;
    setProgress(pct);
    onScrollProgress?.(pct);
  }, [onScrollProgress]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Restore initial scroll position
  useEffect(() => {
    if (restoredRef.current || !initialScrollPercent || initialScrollPercent <= 0) return;
    const el = scrollRef.current;
    if (!el) return;
    // Wait for content to render
    const timer = setTimeout(() => {
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable > 0) {
        el.scrollTop = (initialScrollPercent / 100) * scrollable;
        restoredRef.current = true;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [initialScrollPercent]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="h-[2px] bg-border shrink-0">
        <motion.div
          className="h-full bg-amber/60"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "easeOut" }}
        />
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-10 sm:py-14 md:py-16"
      >
        <div className="max-w-[680px] mx-auto">
          {authorNoteBefore?.trim() && (
            <div className="author-note">{authorNoteBefore}</div>
          )}

          <div
            className={`prose-reader ${fontClass || ""}`}
            style={fontSizeValue ? { "--reader-font-size": fontSizeValue } as React.CSSProperties : undefined}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {authorNoteAfter?.trim() && (
            <div className="author-note">{authorNoteAfter}</div>
          )}

          {/* End marker */}
          <div className="flex items-center justify-center gap-4 mt-16 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent" />
            <span className="text-[11px] text-text-ghost tracking-[0.2em] uppercase">End of chapter</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent" />
          </div>

          {/* Reactions */}
          {reactionsElement && <div className="mb-12">{reactionsElement}</div>}

          {/* Chapter navigation */}
          <div className="flex items-center justify-between gap-4 mb-16">
            {hasPrevChapter ? (
              <button
                onClick={onPrevChapter}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:text-paper hover:border-border-active transition-colors text-[13px]"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3L5 8l5 5" />
                </svg>
                Previous
              </button>
            ) : <div />}
            {hasNextChapter ? (
              <button
                onClick={onNextChapter}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber text-void font-medium hover:bg-amber/90 transition-colors text-[13px]"
              >
                {nextChapterTitle ? `Next: ${nextChapterTitle}` : "Next Chapter"}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            ) : (
              <div className="text-center py-4">
                <p className="text-text-ghost text-[12px]">You&apos;ve reached the latest chapter</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar: progress */}
      <div className="shrink-0 flex items-center justify-center py-4 text-[12px] text-text-ghost select-none">
        <span className="tabular-nums">{Math.round(progress)}% read</span>
      </div>
    </div>
  );
}
