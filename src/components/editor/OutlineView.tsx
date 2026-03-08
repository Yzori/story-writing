"use client";

import { motion } from "framer-motion";
import { Chapter, formatNumber } from "@/lib/store";

interface OutlineViewProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onUpdateOutline: (chapterId: string, outline: string) => void;
}

export default function OutlineView({
  chapters,
  activeChapterId,
  onSelectChapter,
  onUpdateOutline,
}: OutlineViewProps) {
  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
  const publishedCount = chapters.filter((c) => c.status === "published").length;

  return (
    <div className="flex-1 overflow-y-auto px-8 py-12">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-lg font-display font-semibold text-paper mb-1">
            Story Outline
          </h2>
          <p className="text-[12px] text-text-ghost">
            {chapters.length} chapters · {formatNumber(totalWords)} words · {publishedCount} published
          </p>
        </div>

        {/* Outline cards */}
        <div className="space-y-3">
          {chapters.map((chapter, index) => (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`group rounded-xl border transition-all ${
                chapter.id === activeChapterId
                  ? "border-amber/30 bg-amber/[0.03]"
                  : "border-border hover:border-border-active"
              }`}
            >
              <div className="flex gap-4 p-4">
                {/* Chapter number + status */}
                <div className="flex flex-col items-center gap-1.5 pt-0.5">
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      chapter.id === activeChapterId ? "text-amber" : "text-text-ghost"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      chapter.status === "published" ? "bg-sage" : "bg-text-ghost/30"
                    }`}
                    title={chapter.status === "published" ? "Published" : "Draft"}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => onSelectChapter(chapter.id)}
                      className="text-[14px] font-medium text-paper hover:text-amber transition-colors truncate text-left"
                    >
                      {chapter.title}
                    </button>
                    <span className="text-[10px] text-text-ghost shrink-0 tabular-nums">
                      {formatNumber(chapter.wordCount)}w
                    </span>
                    {chapter.authorNoteBefore && (
                      <span className="text-[9px] text-lavender bg-lavender/10 px-1.5 py-0.5 rounded shrink-0">
                        note before
                      </span>
                    )}
                    {chapter.authorNoteAfter && (
                      <span className="text-[9px] text-lavender bg-lavender/10 px-1.5 py-0.5 rounded shrink-0">
                        note after
                      </span>
                    )}
                  </div>

                  {/* Outline textarea */}
                  <textarea
                    value={chapter.outline}
                    onChange={(e) => onUpdateOutline(chapter.id, e.target.value)}
                    placeholder="What happens in this chapter? Key events, character arcs, plot points..."
                    rows={2}
                    className="w-full bg-transparent text-[12px] text-text-secondary leading-relaxed outline-none placeholder:text-text-ghost resize-none"
                  />

                  {/* Content preview */}
                  {chapter.content && (
                    <p className="text-[11px] text-text-ghost mt-1 line-clamp-2 leading-relaxed">
                      {chapter.content.replace(/<[^>]*>/g, " ").trim().slice(0, 200)}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
