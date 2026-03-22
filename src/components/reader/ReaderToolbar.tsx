"use client";

import { useState } from "react";
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

interface ReaderToolbarProps {
  storyTitle: string;
  chapter: Chapter;
  chapterIndex: number;
  totalChapters: number;
  mode: ReadingMode;
  onModeChange: (mode: ReadingMode) => void;
  fontSize: FontSizeKey;
  onFontSizeChange: (size: FontSizeKey) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onBack: () => void;
  onSelectChapter: (id: string) => void;
  chapters: Chapter[];
  wordCount?: number;
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
  onPrevChapter,
  onNextChapter,
  onBack,
  onSelectChapter,
  chapters,
  wordCount,
}: ReaderToolbarProps) {
  const [showChapterList, setShowChapterList] = useState(false);
  const { toast } = useToast();

  return (
    <>
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-surface/50 backdrop-blur-sm">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
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
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] truncate">
              {storyTitle}
            </p>
            <button
              onClick={() => setShowChapterList((v) => !v)}
              className="text-[13px] text-text-secondary hover:text-text transition-colors truncate max-w-[300px] block text-left"
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
        <div className="flex items-center gap-2">
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
          <span className="text-[11px] text-text-ghost tabular-nums">
            Ch. {chapterIndex + 1} / {totalChapters}
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

        {/* Right: view mode + theme */}
        <div className="flex items-center gap-1">
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

          <span className="text-text-ghost/30 mx-1">|</span>

          {/* Share */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href).then(
                () => toast("Link copied", "success"),
                () => toast("Couldn\u2019t copy link", "error")
              );
            }}
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
      </div>

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
              className="absolute left-5 top-[60px] z-50 w-[280px] max-h-[400px] overflow-y-auto rounded-xl bg-elevated border border-border-active shadow-2xl shadow-black/40 py-2"
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
