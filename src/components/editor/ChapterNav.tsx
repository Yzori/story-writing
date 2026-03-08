"use client";

import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Chapter } from "@/lib/store";
import { formatNumber } from "@/lib/store";

interface ChapterNavProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  storyTitle: string;
  collapsed: boolean;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onReorderChapters: (chapters: Chapter[]) => void;
  onRenameChapter: (id: string, title: string) => void;
  onDeleteChapter: (id: string) => void;
  onToggleCollapse: () => void;
  onUpdateStoryTitle: (title: string) => void;
  onOpenMetadata?: () => void;
  onOpenBible?: () => void;
  onOpenFrontMatter?: () => void;
  onOpenChapterSettings?: () => void;
  onOpenOutline?: () => void;
  onOpenTypography?: () => void;
  hasCover?: boolean;
}

export default function ChapterNav({
  chapters,
  activeChapterId,
  storyTitle,
  collapsed,
  onSelectChapter,
  onAddChapter,
  onReorderChapters,
  onRenameChapter,
  onDeleteChapter,
  onToggleCollapse,
  onUpdateStoryTitle,
  onOpenMetadata,
  onOpenBible,
  onOpenFrontMatter,
  onOpenChapterSettings,
  onOpenOutline,
  onOpenTypography,
  hasCover,
}: ChapterNavProps) {
  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 48 : 272 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="relative flex flex-col h-full bg-surface border-r border-border shrink-0 overflow-hidden"
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-subtle/50 transition-colors"
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
            className="flex flex-col h-full min-w-[272px]"
          >
            {/* Project title */}
            <div className="px-5 pt-5 pb-3">
              <input
                value={storyTitle}
                onChange={(e) => onUpdateStoryTitle(e.target.value)}
                className="w-full bg-transparent text-sm font-display font-semibold text-paper outline-none placeholder:text-text-ghost truncate"
                placeholder="Untitled Story"
              />
              <p className="text-[10px] text-text-ghost mt-1.5 uppercase tracking-[0.15em]">
                {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"} · {formatNumber(totalWords)} words
              </p>
            </div>

            {/* Story tools */}
            <div className="px-4 pb-2 flex gap-1.5">
              {onOpenMetadata && (
                <button
                  onClick={onOpenMetadata}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-text-ghost hover:text-text-secondary hover:bg-subtle/30 transition-colors flex-1"
                  title="Story details & cover"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="1" width="8" height="10" rx="1" />
                    <path d="M4.5 4h3M4.5 6h2" />
                  </svg>
                  {hasCover ? "Details" : "Cover & Details"}
                </button>
              )}
              {onOpenBible && (
                <button
                  onClick={onOpenBible}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-text-ghost hover:text-text-secondary hover:bg-subtle/30 transition-colors flex-1"
                  title="Story bible: characters, places, notes"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1H10v8H3.5A1.5 1.5 0 0 0 2 10.5V2.5z" />
                    <path d="M2 10.5A1.5 1.5 0 0 1 3.5 9H10" />
                  </svg>
                  Bible
                </button>
              )}
            </div>

            <div className="px-4 pb-2 flex gap-1.5">
              {onOpenFrontMatter && (
                <button
                  onClick={onOpenFrontMatter}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-text-ghost hover:text-text-secondary hover:bg-subtle/30 transition-colors flex-1"
                  title="Epigraph, foreword, table of contents"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 1v10M3 1h6l-2 2 2 2H3" />
                  </svg>
                  Front Matter
                </button>
              )}
              {onOpenTypography && (
                <button
                  onClick={onOpenTypography}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-text-ghost hover:text-text-secondary hover:bg-subtle/30 transition-colors flex-1"
                  title="Drop caps, scene break styles"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 10L4 2h0.5L7.5 10M2.2 7.5h4.1" />
                    <path d="M9 5v5M9 2v0.5" />
                  </svg>
                  Type
                </button>
              )}
            </div>

            <div className="px-4 pb-2 flex gap-1.5">
              {onOpenOutline && (
                <button
                  onClick={onOpenOutline}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-text-ghost hover:text-text-secondary hover:bg-subtle/30 transition-colors flex-1"
                  title="Story outline & planning"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                    <path d="M4 3h6M4 6h6M4 9h4M1.5 3h0M1.5 6h0M1.5 9h0" />
                  </svg>
                  Outline
                </button>
              )}
              {onOpenChapterSettings && (
                <button
                  onClick={onOpenChapterSettings}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-text-ghost hover:text-text-secondary hover:bg-subtle/30 transition-colors flex-1"
                  title="Chapter status, notes, history"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="6" r="2" />
                    <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.5 2.5l1 1M8.5 8.5l1 1M9.5 2.5l-1 1M3.5 8.5l-1 1" />
                  </svg>
                  Chapter
                </button>
              )}
            </div>

            <div className="h-px bg-border mx-4" />

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

            {/* Add chapter */}
            <div className="p-3">
              <button
                onClick={onAddChapter}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-subtle/30 transition-colors text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="7" y1="3" x2="7" y2="11" />
                  <line x1="3" y1="7" x2="11" y2="7" />
                </svg>
                New Chapter
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
              key={ch.id}
              onClick={() => onSelectChapter(ch.id)}
              title={ch.title}
              className={`w-6 h-6 rounded text-[9px] font-medium flex items-center justify-center transition-colors ${
                ch.id === activeChapterId
                  ? "bg-amber/15 text-amber"
                  : "text-text-ghost hover:text-text-secondary hover:bg-subtle/50"
              }`}
            >
              {i + 1}
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
        <input
          value={chapter.title}
          onChange={(e) => {
            e.stopPropagation();
            onRename(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full bg-transparent text-[13px] outline-none truncate transition-colors ${
            isActive ? "text-paper" : "text-text-secondary"
          } placeholder:text-text-ghost`}
          placeholder="Untitled"
        />
        <p className="text-[10px] text-text-ghost mt-0.5">
          {formatNumber(chapter.wordCount)} words
        </p>
      </div>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-ghost hover:text-rose transition-all"
          title="Delete chapter"
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
