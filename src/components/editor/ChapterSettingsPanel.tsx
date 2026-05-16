"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Chapter } from "@/types/editor";

interface ChapterSettingsPanelProps {
  chapter: Chapter;
  onUpdate: (updates: Partial<Chapter>) => void;
  onClose: () => void;
}

export default function ChapterSettingsPanel({
  chapter,
  onUpdate,
  onClose,
}: ChapterSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "notes">("settings");

  const tabs = [
    { key: "settings" as const, label: "Settings" },
    { key: "notes" as const, label: "Author Notes" },
  ];

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 360, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col"
    >
      <div className="min-w-[360px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-paper truncate">{chapter.title}</h3>
            <p className="text-[10px] text-text-ghost mt-0.5">Chapter settings</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 px-3 py-2.5 text-[11px] transition-all relative ${
                activeTab === t.key
                  ? "text-amber"
                  : "text-text-ghost hover:text-text-secondary"
              }`}
            >
              {t.label}
              {activeTab === t.key && (
                <motion.div
                  layoutId="chapter-tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Settings tab */}
          {activeTab === "settings" && (
            <>
              {/* Publish status */}
              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Status
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdate({ status: "draft" })}
                    className={`flex-1 px-3 py-2 rounded-lg text-[12px] border transition-all ${
                      chapter.status === "draft"
                        ? "border-amber/30 bg-amber/[0.06] text-amber"
                        : "border-border text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    <span className="block font-medium">Draft</span>
                    <span className="text-[10px] opacity-70">Work in progress</span>
                  </button>
                  <button
                    onClick={() => onUpdate({ status: "published" })}
                    className={`flex-1 px-3 py-2 rounded-lg text-[12px] border transition-all ${
                      chapter.status === "published"
                        ? "border-sage/30 bg-sage/[0.06] text-sage"
                        : "border-border text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    <span className="block font-medium">Published</span>
                    <span className="text-[10px] opacity-70">Visible to readers</span>
                  </button>
                </div>
              </section>

              {/* Outline */}
              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Chapter Outline
                </label>
                <p className="text-[11px] text-text-ghost mb-2">
                  Plan what happens in this chapter. Only visible to you.
                </p>
                <textarea
                  value={chapter.outline}
                  onChange={(e) => onUpdate({ outline: e.target.value })}
                  placeholder="Key events, character arcs, plot points..."
                  rows={5}
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
                />
              </section>
            </>
          )}

          {/* Author Notes tab */}
          {activeTab === "notes" && (
            <>
              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Note Before Chapter
                </label>
                <p className="text-[11px] text-text-ghost mb-2">
                  Shown to readers before the chapter content begins.
                </p>
                <textarea
                  value={chapter.authorNoteBefore}
                  onChange={(e) => onUpdate({ authorNoteBefore: e.target.value })}
                  placeholder="A note to your readers before this chapter..."
                  rows={4}
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
                />
              </section>

              <section>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Note After Chapter
                </label>
                <p className="text-[11px] text-text-ghost mb-2">
                  Shown to readers after the chapter content ends. Good for reflections, thanks, or teasers.
                </p>
                <textarea
                  value={chapter.authorNoteAfter}
                  onChange={(e) => onUpdate({ authorNoteAfter: e.target.value })}
                  placeholder="Thanks for reading! Next week we'll..."
                  rows={4}
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
                />
              </section>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
