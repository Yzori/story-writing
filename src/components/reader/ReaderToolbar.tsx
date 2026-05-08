"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chapter } from "@/types/editor";
import ThemeToggle from "@/components/editor/ThemeToggle";
import { useToast } from "@/components/shared/Toast";

export type ReadingMode = "paginated" | "scroll";

export type FontSizeKey = "small" | "medium" | "large" | "xl";

export const FONT_SIZE_OPTIONS: { key: FontSizeKey; label: string; value: string }[] = [
  { key: "small", label: "S", value: "0.95rem" },
  { key: "medium", label: "M", value: "1.1rem" },
  { key: "large", label: "L", value: "1.25rem" },
  { key: "xl", label: "XL", value: "1.4rem" },
];

export type ReadingFont = "default" | "serif" | "sans" | "mono";

export const FONT_FAMILY_OPTIONS: { key: ReadingFont; label: string; sample: string }[] = [
  { key: "default", label: "Default", sample: "Aa" },
  { key: "serif", label: "Serif", sample: "Aa" },
  { key: "sans", label: "Sans", sample: "Aa" },
  { key: "mono", label: "Mono", sample: "Aa" },
];

const FONT_FAMILY_PREVIEW_CLASS: Record<ReadingFont, string> = {
  default: "",
  serif: "font-serif",
  sans: "font-sans",
  mono: "font-mono",
};

const AUTO_HIDE_DELAY = 3000;

interface ReaderToolbarProps {
  storyTitle: string;
  chapter: Chapter;
  chapterIndex: number;
  totalChapters: number;
  mode: ReadingMode;
  onModeChange: (mode: ReadingMode) => void;
  fontSize: FontSizeKey;
  onFontSizeChange: (size: FontSizeKey) => void;
  fontFamily?: ReadingFont;
  onFontFamilyChange?: (font: ReadingFont) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onBack: () => void;
  onSelectChapter: (id: string) => void;
  chapters: Chapter[];
  wordCount?: number;
  /** Disable font family switcher when format requires fixed typography (e.g., screenplay). */
  disableFontFamily?: boolean;
}

export default function ReaderToolbar({
  storyTitle,
  chapter,
  chapterIndex,
  totalChapters,
  mode,
  onModeChange,
  fontSize,
  onFontSizeChange,
  fontFamily = "default",
  onFontFamilyChange,
  onPrevChapter,
  onNextChapter,
  onBack,
  onSelectChapter,
  chapters,
  wordCount,
  disableFontFamily,
}: ReaderToolbarProps) {
  const [showChapterList, setShowChapterList] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const { toast } = useToast();

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollYRef = useRef(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // ── Auto-hide logic ──────────────────────────────────────────
  const showToolbar = useCallback(() => {
    setToolbarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setToolbarVisible(false), AUTO_HIDE_DELAY);
  }, []);

  // Start the initial hide timer
  useEffect(() => {
    hideTimerRef.current = setTimeout(() => setToolbarVisible(false), AUTO_HIDE_DELAY);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Show on scroll-up, hide on scroll-down
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < lastScrollYRef.current) {
        // Scrolling up
        showToolbar();
      }
      lastScrollYRef.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showToolbar]);

  // Show on tap/click in top 60px zone
  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const y = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      if (y <= 60) {
        showToolbar();
      }
    };
    window.addEventListener("click", handleClick, { passive: true });
    window.addEventListener("touchstart", handleClick, { passive: true });
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("touchstart", handleClick);
    };
  }, [showToolbar]);

  // Show on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        showToolbar();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showToolbar]);

  // Keep toolbar visible while settings/chapter panels are open
  useEffect(() => {
    if (showMobileSettings || showChapterList) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setToolbarVisible(true);
    }
  }, [showMobileSettings, showChapterList]);

  // Reset hide timer on any interaction within the toolbar
  const handleToolbarInteraction = useCallback(() => {
    showToolbar();
  }, [showToolbar]);

  const progress = totalChapters > 1
    ? ((chapterIndex) / (totalChapters - 1)) * 100
    : 100;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => toast("Link copied", "success"),
      () => toast("Couldn\u2019t copy link", "error")
    );
  };

  return (
    <>
      {/* Progress bar -- always visible */}
      <div className="shrink-0 h-[2px] bg-border z-50 relative">
        <motion.div
          className="h-full bg-amber/60"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Top bar with auto-hide */}
      <AnimatePresence>
        {toolbarVisible && (
          <motion.div
            ref={toolbarRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="shrink-0 flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3 border-b border-border bg-surface/80 backdrop-blur-md z-40"
            onMouseMove={handleToolbarInteraction}
            onTouchStart={handleToolbarInteraction}
          >
            {/* Left: back + title */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-subtle transition-all shrink-0"
                title="Back to story"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M10 3L5 8l5 5" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] truncate hidden md:block">
                  {storyTitle}
                </p>
                <button
                  onClick={() => setShowChapterList((v) => !v)}
                  className="text-[13px] text-text-secondary hover:text-text transition-colors truncate max-w-[160px] md:max-w-[300px] block text-left"
                >
                  {chapter.title}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="inline ml-1.5 opacity-40"
                  >
                    <path d="M3 4l2 2 2-2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Center: chapter nav */}
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <button
                onClick={onPrevChapter}
                disabled={chapterIndex <= 0}
                className="p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-subtle disabled:opacity-20 transition-all"
                title="Previous chapter"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M8 3l-4 4 4 4" />
                </svg>
              </button>
              <span className="text-[11px] text-text-ghost tabular-nums whitespace-nowrap">
                {chapterIndex + 1}/{totalChapters}
              </span>
              <button
                onClick={onNextChapter}
                disabled={chapterIndex >= totalChapters - 1}
                className="p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-subtle disabled:opacity-20 transition-all"
                title="Next chapter"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 3l4 4-4 4" />
                </svg>
              </button>
            </div>

            {/* Right: desktop controls (hidden on mobile) + mobile gear icon */}
            <div className="flex items-center gap-1 flex-1 justify-end">
              {/* ── Desktop-only controls ── */}
              <div className="hidden md:flex items-center gap-1">
                {/* Reading mode toggle */}
                <div className="flex items-center bg-surface rounded-lg border border-border p-0.5">
                  <button
                    onClick={() => onModeChange("paginated")}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      mode === "paginated"
                        ? "bg-amber/15 text-amber"
                        : "text-text-ghost hover:text-text-secondary"
                    }`}
                    title="Paginated view"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="inline mr-1">
                      <rect x="2" y="1.5" width="10" height="11" rx="1" />
                      <path d="M7 1.5v11" />
                    </svg>
                    Pages
                  </button>
                  <button
                    onClick={() => onModeChange("scroll")}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      mode === "scroll"
                        ? "bg-amber/15 text-amber"
                        : "text-text-ghost hover:text-text-secondary"
                    }`}
                    title="Scroll view"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="inline mr-1">
                      <rect x="3" y="1" width="8" height="12" rx="1" />
                      <path d="M5 5h4M5 7h4M5 9h2" />
                    </svg>
                    Scroll
                  </button>
                </div>

                <span className="text-text-ghost/30 mx-1">|</span>

                {/* Font size selector */}
                <div className="flex items-center bg-surface rounded-lg border border-border p-0.5">
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => onFontSizeChange(opt.key)}
                      className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                        fontSize === opt.key
                          ? "bg-amber/15 text-amber"
                          : "text-text-ghost hover:text-text-secondary"
                      }`}
                      title={`Font size: ${opt.key}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {!disableFontFamily && onFontFamilyChange && (
                  <>
                    <span className="hidden lg:inline text-text-ghost/30 mx-1">|</span>
                    {/* Font family selector — desktop ≥lg only (mobile gets sheet) */}
                    <div className="hidden lg:flex items-center bg-surface rounded-lg border border-border p-0.5">
                      {FONT_FAMILY_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => onFontFamilyChange(opt.key)}
                          className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                            fontFamily === opt.key
                              ? "bg-amber/15 text-amber"
                              : "text-text-ghost hover:text-text-secondary"
                          } ${FONT_FAMILY_PREVIEW_CLASS[opt.key]}`}
                          title={`Font: ${opt.label}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <span className="text-text-ghost/30 mx-1">|</span>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-subtle transition-all"
                  title="Copy chapter link"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M6 10l4-4" />
                    <path d="M9 3l2-1.5a2.12 2.12 0 0 1 3 3L12.5 7" />
                    <path d="M7 13l-2 1.5a2.12 2.12 0 0 1-3-3L3.5 9" />
                  </svg>
                </button>

                {/* Reading time */}
                {wordCount != null && wordCount > 0 && (
                  <span className="text-[10px] text-text-ghost tabular-nums whitespace-nowrap">
                    ~{Math.ceil(wordCount / 250)}m
                  </span>
                )}

                <span className="text-text-ghost/30 mx-1">|</span>
                <ThemeToggle />
              </div>

              {/* ── Mobile-only gear icon ── */}
              <button
                onClick={() => setShowMobileSettings((v) => !v)}
                className="md:hidden p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-subtle transition-all"
                title="Reading settings"
                aria-label="Open reading settings"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="2.5" />
                  <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile settings slide-up panel ── */}
      <AnimatePresence>
        {showMobileSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-void/50 backdrop-blur-sm md:hidden"
              onClick={() => setShowMobileSettings(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-elevated border-t border-border-active rounded-t-2xl shadow-2xl shadow-black/60 px-5 pt-4 md:hidden"
              style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-5">
                <div className="w-10 h-1 rounded-full bg-text-ghost/20" />
              </div>

              <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-4">
                Reading Settings
              </p>

              {/* Reading mode */}
              <div className="mb-5">
                <p className="text-[11px] text-text-secondary mb-2">View Mode</p>
                <div className="flex items-center bg-surface rounded-lg border border-border p-0.5">
                  <button
                    onClick={() => onModeChange("paginated")}
                    className={`flex-1 px-3 py-2 rounded-md text-[12px] transition-all text-center ${
                      mode === "paginated"
                        ? "bg-amber/15 text-amber"
                        : "text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    Pages
                  </button>
                  <button
                    onClick={() => onModeChange("scroll")}
                    className={`flex-1 px-3 py-2 rounded-md text-[12px] transition-all text-center ${
                      mode === "scroll"
                        ? "bg-amber/15 text-amber"
                        : "text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    Scroll
                  </button>
                </div>
              </div>

              {/* Font size */}
              <div className="mb-5">
                <p className="text-[11px] text-text-secondary mb-2">Text Size</p>
                <div className="flex items-center bg-surface rounded-lg border border-border p-0.5 gap-0.5">
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => onFontSizeChange(opt.key)}
                      className={`flex-1 px-2 py-2 rounded-md text-[12px] transition-all text-center ${
                        fontSize === opt.key
                          ? "bg-amber/15 text-amber"
                          : "text-text-ghost hover:text-text-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font family */}
              {!disableFontFamily && onFontFamilyChange && (
                <div className="mb-5">
                  <p className="text-[11px] text-text-secondary mb-2">Font</p>
                  <div className="flex items-center bg-surface rounded-lg border border-border p-0.5 gap-0.5">
                    {FONT_FAMILY_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => onFontFamilyChange(opt.key)}
                        className={`flex-1 px-2 py-2 rounded-md text-[12px] transition-all text-center ${
                          fontFamily === opt.key
                            ? "bg-amber/15 text-amber"
                            : "text-text-ghost hover:text-text-secondary"
                        } ${FONT_FAMILY_PREVIEW_CLASS[opt.key]}`}
                        aria-label={opt.label}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Theme + Share row */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-secondary">Theme</span>
                  <ThemeToggle />
                </div>

                <div className="flex-1" />

                <button
                  onClick={() => {
                    handleShare();
                    setShowMobileSettings(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-text text-[12px] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M6 10l4-4" />
                    <path d="M9 3l2-1.5a2.12 2.12 0 0 1 3 3L12.5 7" />
                    <path d="M7 13l-2 1.5a2.12 2.12 0 0 1-3-3L3.5 9" />
                  </svg>
                  Share
                </button>
              </div>

              {/* Reading time */}
              {wordCount != null && wordCount > 0 && (
                <p className="text-[10px] text-text-ghost mt-4 text-center tabular-nums">
                  ~{Math.ceil(wordCount / 250)} min read
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chapter dropdown */}
      <AnimatePresence>
        {showChapterList && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowChapterList(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-3 md:left-5 top-[52px] md:top-[60px] z-50 w-[calc(100vw-24px)] md:w-[280px] max-h-[400px] overflow-y-auto rounded-xl bg-elevated border border-border-active shadow-2xl shadow-black/40 py-2"
            >
              <p className="text-[10px] uppercase tracking-[0.1em] text-text-ghost px-4 py-2">
                Chapters
              </p>
              {chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    onSelectChapter(ch.id);
                    setShowChapterList(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-subtle/50 transition-colors ${
                    ch.id === chapter.id ? "bg-amber/[0.04]" : ""
                  }`}
                >
                  <span className={`text-[11px] tabular-nums shrink-0 ${
                    ch.id === chapter.id ? "text-amber" : "text-text-ghost"
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`text-[13px] truncate ${
                    ch.id === chapter.id ? "text-paper" : "text-text-secondary"
                  }`}>
                    {ch.title}
                  </span>
                  <span className="text-[10px] text-text-ghost ml-auto shrink-0">
                    {(ch.wordCount ?? 0).toLocaleString()}w
                  </span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
