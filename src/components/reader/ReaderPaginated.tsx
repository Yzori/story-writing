"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReaderPaginatedProps {
  htmlContent: string;
  chapterTitle: string;
  hasNextChapter?: boolean;
  hasPrevChapter?: boolean;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  nextChapterTitle?: string;
  authorNoteBefore?: string;
  authorNoteAfter?: string;
}

export default function ReaderPaginated({
  htmlContent,
  chapterTitle,
  hasNextChapter,
  hasPrevChapter,
  onNextChapter,
  onPrevChapter,
  nextChapterTitle,
  authorNoteBefore,
  authorNoteAfter,
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

  useEffect(() => {
    // Delay to ensure layout is settled
    const timer = setTimeout(recalculate, 50);

    const observer = new ResizeObserver(() => recalculate());
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [recalculate, htmlContent]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showJump) {
        if (e.key === "Escape") setShowJump(false);
        return;
      }

      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPage(currentPage - 1);
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
  }, [currentPage, totalPages, showJump]);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    if (clamped === currentPage) return;
    setDirection(clamped > currentPage ? 1 : -1);
    setCurrentPage(clamped);
  };

  const handleJumpSubmit = () => {
    const page = parseInt(jumpInput, 10);
    if (!isNaN(page)) goToPage(page);
    setShowJump(false);
  };

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
      <div className="flex-1 overflow-hidden px-8 py-12 relative">
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
                className="prose-reader"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
              {authorNoteAfter?.trim() && (
                <div className="author-note">{authorNoteAfter}</div>
              )}
            </motion.div>
          </div>

          {/* Click zones for prev/next */}
          <div className="absolute inset-0 flex pointer-events-none">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="w-1/4 h-full cursor-w-resize disabled:cursor-default pointer-events-auto group"
              aria-label="Previous page"
            >
              {currentPage > 1 && (
                <div className="flex items-center justify-start pl-2 h-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 rounded-full bg-elevated/80 backdrop-blur border border-border text-text-ghost">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M8 3l-4 4 4 4" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="w-1/4 h-full cursor-e-resize disabled:cursor-default pointer-events-auto group"
              aria-label="Next page"
            >
              {currentPage < totalPages && (
                <div className="flex items-center justify-end pr-2 h-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 rounded-full bg-elevated/80 backdrop-blur border border-border text-text-ghost">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M6 3l4 4-4 4" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          </div>
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

        {/* Next chapter */}
        <div className="w-28 text-right">
          {currentPage >= totalPages && hasNextChapter && (
            <button
              onClick={onNextChapter}
              className="flex items-center gap-1 text-amber hover:text-amber/80 transition-colors ml-auto font-medium"
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
