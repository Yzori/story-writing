"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Chapter } from "@/types/editor";
import { formatNumber } from "@/lib/format";
import { useModChord } from "@/lib/keys";

// Format-aware vocabulary — "chapter" for novels, "poem" for poetry, etc.
const FORMAT_LABELS: Record<string, { singular: string; plural: string; newLabel: string }> = {
  novel: { singular: "chapter", plural: "chapters", newLabel: "New Chapter" },
  poetry: { singular: "poem", plural: "poems", newLabel: "New Poem" },
  webtoon: { singular: "episode", plural: "episodes", newLabel: "New Episode" },
  illustrated: { singular: "chapter", plural: "chapters", newLabel: "New Chapter" },
  screenplay: { singular: "scene", plural: "scenes", newLabel: "New Scene" },
};

function getFormatLabels(format?: string) {
  return FORMAT_LABELS[format || "novel"] || FORMAT_LABELS.novel;
}

interface ChapterNavProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  storyTitle: string;
  collapsed: boolean;
  format?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onReorderChapters: (chapters: Chapter[]) => void;
  onRenameChapter: (id: string, title: string) => void;
  onDeleteChapter: (id: string) => void;
  onToggleCollapse: () => void;
  onUpdateStoryTitle: (title: string) => void;
  onOpenToolkit: () => void;
  coachSlot?: ReactNode;
}

export default function ChapterNav({
  chapters,
  activeChapterId,
  storyTitle,
  collapsed,
  format,
  onSelectChapter,
  onAddChapter,
  onReorderChapters,
  onRenameChapter,
  onDeleteChapter,
  onToggleCollapse,
  onUpdateStoryTitle,
  onOpenToolkit,
  coachSlot,
}: ChapterNavProps) {
  const commandChord = useModChord("K");
  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const labels = getFormatLabels(format);
  const publishedCount = chapters.filter((ch) => ch.status === "published").length;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 48 : 272 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="relative flex flex-col h-full shrink-0 overflow-hidden"
    >
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute top-5 right-3 z-10 p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-subtle/50 transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
        >
          <path d="M9 3L5 7l4 4" />
        </svg>
      </button>

      {/* Content — hidden when collapsed */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col h-full min-w-[272px] pt-2"
          >
            {/* Project title */}
            <div className="px-5 pt-7 pb-3">
              <input
                value={storyTitle}
                onChange={(e) => onUpdateStoryTitle(e.target.value)}
                className="w-full bg-transparent text-sm font-display font-semibold text-paper outline-none placeholder:text-text-ghost truncate"
                placeholder="Untitled Story"
                aria-label="Story title"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.15em]">
                  {chapters.length} {chapters.length === 1 ? labels.singular : labels.plural} · {formatNumber(totalWords)} words
                </p>
                {publishedCount > 0 && (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sage/10 text-sage/60">
                    {publishedCount} live
                  </span>
                )}
              </div>
            </div>

            {/* Chapter list */}
            <div className="flex-1 overflow-y-auto py-2 px-2">
              <Reorder.Group
                axis="y"
                values={chapters}
                onReorder={onReorderChapters}
                className="flex flex-col gap-0.5"
              >
                {chapters.map((chapter, index) => (
                  <Reorder.Item
                    key={chapter.id}
                    value={chapter}
                    className="list-none"
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.altKey && e.key === "ArrowUp" && index > 0) {
                        e.preventDefault();
                        const reordered = [...chapters];
                        [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
                        onReorderChapters(reordered);
                      } else if (e.altKey && e.key === "ArrowDown" && index < chapters.length - 1) {
                        e.preventDefault();
                        const reordered = [...chapters];
                        [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
                        onReorderChapters(reordered);
                      }
                    }}
                  >
                    <ChapterItem
                      chapter={chapter}
                      index={index}
                      isActive={chapter.id === activeChapterId}
                      onSelect={() => onSelectChapter(chapter.id)}
                      onRename={(title) => onRenameChapter(chapter.id, title)}
                      onDelete={chapters.length > 1 ? () => onDeleteChapter(chapter.id) : undefined}
                    />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>

            {coachSlot && (
              <div className="px-3 pb-2">
                {coachSlot}
              </div>
            )}

            {/* Bottom actions */}
            <div className="p-3 space-y-1">
              <button
                type="button"
                onClick={onAddChapter}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-subtle/30 transition-colors text-sm"
                aria-label={`Add new ${labels.singular}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="7" y1="3" x2="7" y2="11" />
                  <line x1="3" y1="7" x2="11" y2="7" />
                </svg>
                {labels.newLabel}
              </button>
              {/* One door to everything: the command palette (the old
                  "Toolkit" was a third duplicate menu of the same items) */}
              <button
                type="button"
                onClick={onOpenToolkit}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-amber/70 hover:text-amber hover:bg-amber/[0.06] transition-colors text-sm"
                aria-label="Open command palette"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 1.5L2 8l3.5 3.5L12 5" />
                  <path d="M10 3l1 1" />
                  <path d="M2 8l1.5-0.5L3 9.5z" />
                </svg>
                Commands
                <span className="ml-auto rounded bg-subtle/50 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-text-tertiary">{commandChord}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state icon */}
      {collapsed && (
        <div className="flex flex-col items-center gap-2 pt-12">
          {chapters.map((ch, i) => (
            <button
              type="button"
              key={ch.id}
              onClick={() => onSelectChapter(ch.id)}
              title={ch.title}
              className={`w-6 h-6 rounded text-[9px] font-medium flex items-center justify-center transition-colors relative ${
                ch.id === activeChapterId
                  ? "bg-amber/15 text-amber"
                  : "text-text-ghost hover:text-text-secondary hover:bg-subtle/50"
              }`}
            >
              {i + 1}
              {ch.status === "published" && (
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-sage/60" />
              )}
            </button>
          ))}
        </div>
      )}
    </motion.aside>
  );
}

function ChapterItem({
  chapter,
  index,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  chapter: Chapter;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`
        group relative flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200
        ${isActive
          ? "bg-amber/[0.07]"
          : "hover:bg-subtle/20"
        }
      `}
    >
      {/* Chapter number */}
      <span
        className={`text-[10px] font-mono mt-0.5 shrink-0 transition-colors ${
          isActive ? "text-amber" : "text-text-ghost"
        }`}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <input
            value={chapter.title}
            onChange={(e) => {
              e.stopPropagation();
              onRename(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className={`flex-1 min-w-0 appearance-none rounded-md border border-transparent bg-subtle/20 px-1.5 py-0.5 text-[13px] outline-none truncate transition-colors focus:border-amber/25 focus:bg-elevated/70 ${
              isActive ? "text-paper" : "text-text-secondary"
            } placeholder:text-text-ghost`}
            placeholder="Untitled"
            aria-label="Title"
          />
          {/* Status badge */}
          <span className={`shrink-0 text-[8px] uppercase tracking-wider px-1 py-0.5 rounded-full ${
            chapter.status === "published"
              ? "bg-sage/12 text-sage/60"
              : "bg-subtle/20 text-text-ghost"
          }`}>
            {chapter.status === "published" ? "Live" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-text-ghost">
            {formatNumber(chapter.wordCount)} words
          </p>
        </div>
        {/* Word count progress bar (show for chapters with content but not published) */}
        {chapter.wordCount > 0 && chapter.status !== "published" && (
          <div className="mt-1.5 h-[2px] bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber/30 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (chapter.wordCount / 3000) * 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-1 rounded text-text-ghost hover:text-rose transition-all"
          title="Delete"
          aria-label="Delete"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="3" x2="9" y2="9" />
            <line x1="9" y1="3" x2="3" y2="9" />
          </svg>
        </button>
      )}

      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeChapter"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-amber rounded-r-full"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </div>
  );
}
