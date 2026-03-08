"use client";

import { motion } from "framer-motion";
import { FrontMatter, StoryMetadata, Chapter, formatNumber } from "@/lib/store";

interface FrontMatterPanelProps {
  frontMatter: FrontMatter;
  metadata: StoryMetadata;
  chapters: Chapter[];
  onUpdate: (frontMatter: FrontMatter) => void;
  onClose: () => void;
}

export default function FrontMatterPanel({
  frontMatter,
  metadata,
  chapters,
  onUpdate,
  onClose,
}: FrontMatterPanelProps) {
  const update = (partial: Partial<FrontMatter>) => {
    onUpdate({ ...frontMatter, ...partial });
  };

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
          <h3 className="text-sm font-medium text-paper">Front Matter</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Epigraph */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Epigraph
            </label>
            <p className="text-[11px] text-text-ghost mb-2">
              A quote that sets the tone for your story.
            </p>
            <textarea
              value={frontMatter.epigraph}
              onChange={(e) => update({ epigraph: e.target.value })}
              placeholder="&quot;Not all those who wander are lost.&quot;"
              rows={3}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none italic"
            />
            <input
              value={frontMatter.epigraphAttribution}
              onChange={(e) => update({ epigraphAttribution: e.target.value })}
              placeholder="Attribution (e.g. J.R.R. Tolkien)"
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[12px] text-text-secondary outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors mt-2"
            />
          </section>

          {/* Foreword */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Author&apos;s Foreword
            </label>
            <p className="text-[11px] text-text-ghost mb-2">
              A personal note to readers before the story begins.
            </p>
            <textarea
              value={frontMatter.foreword}
              onChange={(e) => update({ foreword: e.target.value })}
              placeholder="Write a foreword for your readers..."
              rows={6}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
            />
          </section>

          {/* Table of Contents */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                Table of Contents
              </label>
              <button
                onClick={() => update({ showToc: !frontMatter.showToc })}
                className={`relative w-8 h-[18px] rounded-full transition-colors ${
                  frontMatter.showToc ? "bg-amber" : "bg-subtle"
                }`}
              >
                <div
                  className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-void transition-transform ${
                    frontMatter.showToc ? "left-[16px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-text-ghost mb-3">
              Auto-generated from your chapters. Appears in exports and reader view.
            </p>

            {/* TOC preview */}
            {frontMatter.showToc && (
              <div className="bg-elevated border border-border rounded-lg p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3">
                  Preview
                </p>
                <ol className="space-y-1.5">
                  {chapters.map((ch, i) => (
                    <li key={ch.id} className="flex items-center gap-2">
                      <span className="text-[11px] text-text-ghost tabular-nums w-4 text-right shrink-0">
                        {i + 1}.
                      </span>
                      <span className="text-[12px] text-text-secondary truncate flex-1">
                        {ch.title}
                      </span>
                      <span className="text-[10px] text-text-ghost shrink-0">
                        {formatNumber(ch.wordCount)}w
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* Dedication preview (read-only, set in metadata panel) */}
          {metadata.dedication && (
            <section>
              <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                Dedication
              </label>
              <div className="bg-elevated border border-border rounded-lg p-4 text-center">
                <p className="text-[13px] text-text-secondary italic">
                  {metadata.dedication}
                </p>
              </div>
              <p className="text-[10px] text-text-ghost mt-1.5">
                Edit in Story Details panel.
              </p>
            </section>
          )}

          {/* Front matter order info */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Order in Exports
            </label>
            <div className="space-y-1">
              {[
                { label: "Cover", active: !!metadata.coverImageDataUrl },
                { label: "Title Page", active: true },
                { label: "Dedication", active: !!metadata.dedication },
                { label: "Epigraph", active: !!frontMatter.epigraph },
                { label: "Foreword", active: !!frontMatter.foreword },
                { label: "Table of Contents", active: frontMatter.showToc },
                { label: "Chapters", active: true },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] ${
                    item.active ? "text-text-secondary" : "text-text-ghost line-through opacity-50"
                  }`}
                >
                  <span className="text-[9px] text-text-ghost tabular-nums w-3">{i + 1}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.aside>
  );
}
