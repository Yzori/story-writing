"use client";

import { motion } from "framer-motion";
import { TypographySettings } from "@/types/editor";

interface TypographyPanelProps {
  settings: TypographySettings;
  onUpdate: (settings: TypographySettings) => void;
  onClose: () => void;
}

const SCENE_BREAKS: {
  value: TypographySettings["sceneBreakStyle"];
  label: string;
  preview: string;
}[] = [
  { value: "asterism", label: "Asterism", preview: "\u2042" },
  { value: "fleuron", label: "Fleuron", preview: "\u2767" },
  { value: "dots", label: "Three Dots", preview: "\u2022 \u2022 \u2022" },
  { value: "line", label: "Line", preview: "\u2014\u2014\u2014\u2014" },
  { value: "text-line", label: "Text Line", preview: "Text" },
  { value: "space", label: "Blank Space", preview: "(extra space)" },
];

const LINE_SPACING_OPTIONS: {
  value: TypographySettings["lineSpacing"];
  label: string;
  multiplier: string;
}[] = [
  { value: "compact", label: "Compact", multiplier: "1.6" },
  { value: "comfortable", label: "Comfortable", multiplier: "1.8" },
  { value: "relaxed", label: "Relaxed", multiplier: "2.0" },
];

const PARAGRAPH_SPACING_OPTIONS: {
  value: TypographySettings["paragraphSpacing"];
  label: string;
  size: string;
}[] = [
  { value: "tight", label: "Tight", size: "0.5em" },
  { value: "normal", label: "Normal", size: "1em" },
  { value: "loose", label: "Loose", size: "1.5em" },
];

const ALIGNMENT_OPTIONS: {
  value: TypographySettings["textAlignment"];
  label: string;
}[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "justified", label: "Justified" },
];

function AlignLeftIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <line x1="1" y1="3" x2="15" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AlignCenterIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <line x1="1" y1="3" x2="15" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AlignJustifyIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <line x1="1" y1="3" x2="15" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const ALIGNMENT_ICONS: Record<TypographySettings["textAlignment"], React.FC<{ className?: string }>> = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  justified: AlignJustifyIcon,
};

export default function TypographyPanel({
  settings,
  onUpdate,
  onClose,
}: TypographyPanelProps) {
  const update = (partial: Partial<TypographySettings>) => {
    onUpdate({ ...settings, ...partial });
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
        <div className="flex items-start justify-between gap-4 px-5 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-medium text-paper">Story Typography</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-text-ghost">
              Applies to the whole story in editor preview and published reading.
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors"
            aria-label="Close typography panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <div className="rounded-lg border border-amber/20 bg-amber/[0.04] px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-text-secondary">
              These are global story settings. They do not format selected text; use the floating toolbar or commands for selection formatting.
            </p>
          </div>

          {/* Drop Caps */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                Drop Caps
              </label>
              <button
                onClick={() => update({ dropCaps: !settings.dropCaps })}
                className={`relative w-8 h-[18px] rounded-full transition-colors ${
                  settings.dropCaps ? "bg-amber" : "bg-subtle"
                }`}
              >
                <div
                  className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-void transition-transform ${
                    settings.dropCaps ? "left-[16px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-text-ghost mb-3">
              Adds a decorative first letter to the opening paragraph of each chapter.
            </p>

            {/* Preview */}
            <div className="bg-elevated border border-border rounded-lg p-4">
              {settings.dropCaps ? (
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  <span className="float-left text-[42px] leading-[0.8] font-display font-bold text-paper mr-2 mt-1">
                    T
                  </span>
                  he morning light crept through the curtains, casting amber streaks across the worn floorboards. She hadn&apos;t slept, not really...
                </p>
              ) : (
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  The morning light crept through the curtains, casting amber streaks across the worn floorboards. She hadn&apos;t slept, not really...
                </p>
              )}
            </div>
          </section>

          <div className="border-t border-border-active/50" />

          {/* Paragraph Indent */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                Story First-Line Indent
              </label>
              <button
                onClick={() => update({ paragraphIndent: !settings.paragraphIndent })}
                className={`relative w-8 h-[18px] rounded-full transition-colors ${
                  settings.paragraphIndent ? "bg-amber" : "bg-subtle"
                }`}
              >
                <div
                  className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-void transition-transform ${
                    settings.paragraphIndent ? "left-[16px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-text-ghost mb-3">
              Indents paragraphs across the story, except opening paragraphs.
            </p>

            {/* Preview */}
            <div className="bg-elevated border border-border rounded-lg p-4 space-y-2">
              <p
                className="text-[12px] text-text-secondary leading-relaxed"
                style={settings.paragraphIndent ? { textIndent: "1.5em" } : undefined}
              >
                The morning light crept through the curtains, casting amber streaks across the worn floorboards.
              </p>
              <p
                className="text-[12px] text-text-secondary leading-relaxed"
                style={settings.paragraphIndent ? { textIndent: "1.5em" } : undefined}
              >
                She set down her pen and listened to the silence that filled the room like water.
              </p>
            </div>
          </section>

          <div className="border-t border-border-active/50" />

          {/* Line Spacing */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              Story Line Spacing
            </label>
            <p className="text-[11px] text-text-ghost mb-3">
              Changes the line height for paragraphs throughout the story.
            </p>

            <div className="flex gap-2">
              {LINE_SPACING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => update({ lineSpacing: option.value })}
                  className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border transition-all ${
                    settings.lineSpacing === option.value
                      ? "border-amber/30 bg-amber/[0.04]"
                      : "border-border hover:bg-subtle/30"
                  }`}
                >
                  <span
                    className={`text-[12px] ${
                      settings.lineSpacing === option.value
                        ? "text-paper"
                        : "text-text-secondary"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span
                    className={`text-[10px] ${
                      settings.lineSpacing === option.value
                        ? "text-amber"
                        : "text-text-ghost"
                    }`}
                  >
                    {option.multiplier}&times;
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-border-active/50" />

          {/* Text Alignment */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              Paragraph Alignment
            </label>
            <p className="text-[11px] text-text-ghost mb-3">
              Aligns paragraphs across the story.
            </p>

            <div className="flex gap-2">
              {ALIGNMENT_OPTIONS.map((option) => {
                const Icon = ALIGNMENT_ICONS[option.value];
                return (
                  <button
                    key={option.value}
                    onClick={() => update({ textAlignment: option.value })}
                    className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border transition-all ${
                      settings.textAlignment === option.value
                        ? "border-amber/30 bg-amber/[0.04]"
                        : "border-border hover:bg-subtle/30"
                    }`}
                  >
                    <Icon
                      className={
                        settings.textAlignment === option.value
                          ? "text-amber"
                          : "text-text-ghost"
                      }
                    />
                    <span
                      className={`text-[11px] ${
                        settings.textAlignment === option.value
                          ? "text-paper"
                          : "text-text-secondary"
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="border-t border-border-active/50" />

          {/* Paragraph Spacing */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              Story Paragraph Spacing
            </label>
            <p className="text-[11px] text-text-ghost mb-3">
              Sets the space between paragraphs throughout the story.
            </p>

            <div className="flex gap-2">
              {PARAGRAPH_SPACING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => update({ paragraphSpacing: option.value })}
                  className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border transition-all ${
                    settings.paragraphSpacing === option.value
                      ? "border-amber/30 bg-amber/[0.04]"
                      : "border-border hover:bg-subtle/30"
                  }`}
                >
                  <span
                    className={`text-[12px] ${
                      settings.paragraphSpacing === option.value
                        ? "text-paper"
                        : "text-text-secondary"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span
                    className={`text-[10px] ${
                      settings.paragraphSpacing === option.value
                        ? "text-amber"
                        : "text-text-ghost"
                    }`}
                  >
                    {option.size}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-border-active/50" />

          {/* Scene Break Style */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              Default Scene Break
            </label>
            <p className="text-[11px] text-text-ghost mb-3">
              Sets the default divider style. Individual dividers can still use their own style.
            </p>

            <div className="space-y-1.5">
              {SCENE_BREAKS.map((style) => (
                <button
                  key={style.value}
                  onClick={() => update({ sceneBreakStyle: style.value })}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border transition-all ${
                    settings.sceneBreakStyle === style.value
                      ? "border-amber/30 bg-amber/[0.04]"
                      : "border-transparent hover:bg-subtle/30"
                  }`}
                >
                  <span
                    className={`w-24 text-center text-[14px] shrink-0 ${
                      settings.sceneBreakStyle === style.value
                        ? "text-amber"
                        : "text-text-ghost"
                    }`}
                    style={style.value === "space" ? { fontSize: "10px" } : undefined}
                  >
                    {style.preview}
                  </span>
                  <span className={`text-[12px] ${
                    settings.sceneBreakStyle === style.value
                      ? "text-paper"
                      : "text-text-secondary"
                  }`}>
                    {style.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.aside>
  );
}
