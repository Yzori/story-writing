"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeHtmlClient } from "@/lib/sanitize-client";

interface ReaderPaginatedProps {
  htmlContent: string;
  chapterTitle: string;
  hasNextChapter?: boolean;
  hasPrevChapter?: boolean;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onShowDiscussion?: () => void;
  nextChapterTitle?: string;
  authorNoteBefore?: string;
  authorNoteAfter?: string;
  fontClass?: string;
  fontSizeValue?: string;
  commentCount?: number;
  reactionsElement?: React.ReactNode;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

export default function ReaderPaginated({
  htmlContent,
  chapterTitle,
  hasNextChapter,
  hasPrevChapter,
  onNextChapter,
  onPrevChapter,
  onShowDiscussion,
  nextChapterTitle,
  authorNoteBefore,
  authorNoteAfter,
  fontClass,
  fontSizeValue,
  commentCount,
  reactionsElement,
  initialPage,
  onPageChange,
}: ReaderPaginatedProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageHeight, setPageHeight] = useState(800);
  const [jumpInput, setJumpInput] = useState("");
  const [showJump, setShowJump] = useState(false);
  const [direction, setDirection] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate how many pages we need based on content height vs container height
  const recalculate = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const availableHeight = container.clientHeight;
    const contentHeight = content.scrollHeight;

    if (availableHeight <= 0) return;

    setPageHeight(availableHeight);
    const pages = Math.max(1, Math.ceil(contentHeight / availableHeight));
    setTotalPages(pages);
    setCurrentPage((prev) => Math.min(prev, pages));
  }, []);

  // Track whether we've restored the initial page
  const restoredRef = useRef(false);

  useEffect(() => {
    // Delay to ensure layout is settled
    const timer = setTimeout(() => {
      recalculate();
      // Restore initial page after first layout calculation
      if (!restoredRef.current && initialPage && initialPage > 1) {
        restoredRef.current = true;
        setCurrentPage((prev) => {
          // Only restore if we have enough pages
          const container = containerRef.current;
          const content = contentRef.current;
          if (!container || !content) return prev;
          const pages = Math.max(1, Math.ceil(content.scrollHeight / container.clientHeight));
          return Math.min(initialPage, pages);
        });
      }
    }, 50);

    const observer = new ResizeObserver(() => recalculate());
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [recalculate, htmlContent, initialPage]);

  // Recalculate pages when font size changes
  useEffect(() => {
    const timer = setTimeout(recalculate, 50);
    return () => clearTimeout(timer);
  }, [recalculate, fontSizeValue]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showJump) {
        if (e.key === "Escape") setShowJump(false);
        return;
      }

      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        if (currentPage >= totalPages && hasNextChapter && onNextChapter) {
          onNextChapter();
        } else {
          goToPage(currentPage + 1);
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if (currentPage <= 1 && hasPrevChapter && onPrevChapter) {
          onPrevChapter();
        } else {
          goToPage(currentPage - 1);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === "End") {
        e.preventDefault();
        goToPage(totalPages);
      } else if (e.key === "g" || e.key === "G") {
        setShowJump(true);
        setJumpInput(String(currentPage));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentPage, totalPages, showJump, hasNextChapter, hasPrevChapter, onNextChapter, onPrevChapter]);

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    if (clamped === currentPage) return;
    setDirection(clamped > currentPage ? 1 : -1);
    setCurrentPage(clamped);
    onPageChange?.(clamped);
  }, [totalPages, currentPage, onPageChange]);

  const handleJumpSubmit = () => {
    const page = parseInt(jumpInput, 10);
    if (!isNaN(page)) goToPage(page);
    setShowJump(false);
  };

  const sanitizedContent = useMemo(() => sanitizeHtmlClient(htmlContent), [htmlContent]);

  const scrollOffset = (currentPage - 1) * pageHeight;
  const progress = totalPages > 1 ? ((currentPage - 1) / (totalPages - 1)) * 100 : 100;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Progress bar */}
      <div className="h-[2px] bg-border shrink-0">
        <motion.div
          className="h-full bg-amber/60"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Page viewport */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 relative">
        <div className="max-w-[680px] mx-auto h-full relative">
          {/* Clipping container */}
          <div
            ref={containerRef}
            className="h-full overflow-hidden"
          >
            <motion.div
              ref={contentRef}
              initial={false}
              animate={{ y: -scrollOffset }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            >
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
              {reactionsElement && (
                <div className="mt-8 border-t border-border pt-6">
                  {reactionsElement}
                </div>
              )}
            </motion.div>
          </div>

          {/* Click zones for prev/next -- wider on mobile, with click-vs-drag detection */}
          <ClickZone
            side="prev"
            disabled={currentPage <= 1 && !hasPrevChapter}
            onActivate={() => {
              if (currentPage <= 1 && hasPrevChapter && onPrevChapter) {
                onPrevChapter();
              } else {
                goToPage(currentPage - 1);
              }
            }}
            showIndicator={currentPage > 1 || !!hasPrevChapter}
          />
          <ClickZone
            side="next"
            disabled={currentPage >= totalPages && !hasNextChapter}
            onActivate={() => {
              if (currentPage >= totalPages && hasNextChapter && onNextChapter) {
                onNextChapter();
              } else {
                goToPage(currentPage + 1);
              }
            }}
            showIndicator={currentPage < totalPages || !!hasNextChapter}
          />
        </div>
      </div>

      {/* Bottom bar: page indicator + chapter nav */}
      <div className="shrink-0 flex items-center justify-between gap-4 py-3 px-4 border-t border-border bg-surface/50 text-[12px] text-text-ghost select-none">
        {/* Prev chapter */}
        <div className="w-28">
          {currentPage <= 1 && hasPrevChapter && (
            <button
              onClick={onPrevChapter}
              className="flex items-center gap-1 text-text-secondary hover:text-paper transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 3l-4 4 4 4" />
              </svg>
              Prev chapter
            </button>
          )}
        </div>

        {/* Page controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md hover:bg-subtle disabled:opacity-20 transition-all"
            aria-label="Previous page"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 3l-4 4 4 4" />
            </svg>
          </button>

          <button
            onClick={() => { setShowJump(true); setJumpInput(String(currentPage)); }}
            className="px-3 py-1 rounded-md hover:bg-subtle transition-colors tabular-nums"
            title="Press G to jump to page"
          >
            Page {currentPage} of {totalPages}
          </button>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-md hover:bg-subtle disabled:opacity-20 transition-all"
            aria-label="Next page"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 3l4 4-4 4" />
            </svg>
          </button>
        </div>

        {/* Discussion + Next chapter */}
        <div className="flex items-center gap-3 ml-auto">
          <AnimatePresence>
            {currentPage >= totalPages && onShowDiscussion && (
              <motion.button
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                onClick={onShowDiscussion}
                className="flex items-center gap-1.5 text-text-secondary hover:text-paper transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                Discussion{commentCount !== undefined ? ` (${commentCount})` : ""}
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 5l4 4 4-4" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
          {currentPage >= totalPages && hasNextChapter && (
            <button
              onClick={onNextChapter}
              className="flex items-center gap-1 text-amber hover:text-amber/80 transition-colors font-medium"
            >
              Next chapter
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 3l4 4-4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Jump to page modal */}
      <AnimatePresence>
        {showJump && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-void/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowJump(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-elevated border border-border-active rounded-xl shadow-2xl shadow-black/40 p-5 w-[240px]"
            >
              <p className="text-[11px] text-text-ghost uppercase tracking-[0.1em] mb-3">
                Go to page
              </p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJumpSubmit();
                    if (e.key === "Escape") setShowJump(false);
                  }}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-amber/30 transition-colors tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder={`1\u2013${totalPages}`}
                />
                <button
                  onClick={handleJumpSubmit}
                  className="px-4 py-2 rounded-lg bg-amber/15 text-amber text-sm hover:bg-amber/25 transition-colors"
                >
                  Go
                </button>
              </div>
              <p className="text-[10px] text-text-ghost mt-2">
                or use arrow keys / click edges
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Click zone with drag detection ─────────────────────────────
// Only fires navigation if the mouseup/touchend is within 200ms and 5px of the start position.
const CLICK_MAX_TIME = 200;
const CLICK_MAX_DISTANCE = 5;

function ClickZone({
  side,
  disabled,
  onActivate,
  showIndicator,
}: {
  side: "prev" | "next";
  disabled: boolean;
  onActivate: () => void;
  showIndicator: boolean;
}) {
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current || disabled) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      const dt = Date.now() - startRef.current.time;
      const dist = Math.sqrt(dx * dx + dy * dy);
      startRef.current = null;

      if (dt <= CLICK_MAX_TIME && dist <= CLICK_MAX_DISTANCE) {
        onActivate();
      }
    },
    [disabled, onActivate]
  );

  const isPrev = side === "prev";

  return (
    <div
      className={`absolute top-0 ${isPrev ? "left-0" : "right-0"} h-full w-1/3 md:w-1/4 pointer-events-auto ${
        disabled ? "cursor-default" : isPrev ? "cursor-w-resize" : "cursor-e-resize"
      } group`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      aria-label={isPrev ? "Previous page" : "Next page"}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {showIndicator && (
        <div
          className={`flex items-center h-full opacity-0 group-hover:opacity-100 transition-opacity ${
            isPrev ? "justify-start pl-2" : "justify-end pr-2"
          }`}
        >
          <div className="p-2 rounded-full bg-elevated/80 backdrop-blur border border-border text-text-ghost">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d={isPrev ? "M8 3l-4 4 4 4" : "M6 3l4 4-4 4"} />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
