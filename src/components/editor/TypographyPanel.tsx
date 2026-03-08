"use client";

import { motion } from "framer-motion";
import { TypographySettings } from "@/lib/store";

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
  { value: "space", label: "Blank Space", preview: "(extra space)" },
];

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
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-paper">Typography</h3>
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
              Large decorative first letter at the start of each chapter.
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

          {/* Scene Break Style */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              Scene Break Style
            </label>

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
