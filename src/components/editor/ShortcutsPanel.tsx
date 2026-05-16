"use client";

import { motion } from "framer-motion";

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
const mod = isMac ? "\u2318" : "Ctrl+";
const shift = isMac ? "\u21E7" : "Shift+";

interface ShortcutsPanelProps {
  onClose: () => void;
}

const shortcuts = [
  { category: "Editor", items: [
    { keys: `${mod}B`, action: "Bold" },
    { keys: `${mod}I`, action: "Italic" },
    { keys: `${mod}U`, action: "Underline" },
    { keys: `${mod}${shift}X`, action: "Strikethrough" },
    { keys: "/", action: "Insert block menu (in editor)" },
    { keys: "@", action: "Mention a character" },
  ]},
  { category: "Navigation", items: [
    { keys: `${mod}K`, action: "Command palette" },
    { keys: `${mod}${shift}H`, action: "Search & replace" },
    { keys: `${mod}${shift}\u2191`, action: "Previous chapter" },
    { keys: `${mod}${shift}\u2193`, action: "Next chapter" },
    { keys: `Alt+\u2191/\u2193`, action: "Reorder chapter" },
  ]},
  { category: "Panels", items: [
    { keys: `${mod}${shift}G`, action: "Writing goals" },
    { keys: `${mod}${shift}L`, action: "Story bible" },
    { keys: `${mod}E`, action: "Command palette" },
  ]},
];

export default function ShortcutsPanel({ onClose }: ShortcutsPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md rounded-2xl bg-elevated border border-border-active shadow-2xl p-6 overflow-y-auto max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-display text-paper">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-text-ghost hover:text-paper transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {shortcuts.map((section) => (
          <div key={section.category} className="mb-5 last:mb-0">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-text-ghost mb-2">{section.category}</h3>
            <div className="space-y-1.5">
              {section.items.map((item) => (
                <div key={item.action} className="flex items-center justify-between py-1">
                  <span className="text-sm text-text-secondary">{item.action}</span>
                  <kbd className="px-2 py-0.5 rounded bg-surface border border-border text-[11px] text-text-ghost font-mono">{item.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
