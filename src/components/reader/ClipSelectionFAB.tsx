"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ClipSelectionFABProps {
  /** Called with the trimmed selected text. */
  onClip: (text: string) => void;
  /** Min characters before the FAB shows — avoids triggering on cursor placement. */
  minLength?: number;
  /** Max characters — passages longer than this are truncated by SceneClip. */
}

/**
 * Listens for text selection inside the page body and surfaces a small
 * floating "Clip" button positioned near the end of the selection. Disappears
 * when the selection is collapsed.
 */
export default function ClipSelectionFAB({
  onClip,
  minLength = 12,
}: ClipSelectionFABProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    function update() {
      const sel = typeof window !== "undefined" ? window.getSelection() : null;
      if (!sel || sel.isCollapsed) {
        setPos(null);
        return;
      }
      const selectedText = sel.toString().trim();
      if (selectedText.length < minLength) {
        setPos(null);
        return;
      }
      // Only react when the selection is inside the novel-reader (the actual
      // chapter content, not the comment thread or sidebar).
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer as Node;
      const inProse =
        container instanceof Element
          ? container.closest?.(".novel-reader, .screenplay-reader-content, .poetry-reader")
          : container.parentElement?.closest?.(
              ".novel-reader, .screenplay-reader-content, .poetry-reader",
            );
      if (!inProse) {
        setPos(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        setPos(null);
        return;
      }
      // Position above the end of selection, clamped to the viewport.
      const margin = 8;
      const fabWidth = 88;
      const fabHeight = 36;
      const idealX = rect.right;
      const idealY = rect.top - fabHeight - margin;
      const x = Math.min(
        Math.max(idealX, fabWidth / 2 + margin),
        window.innerWidth - fabWidth / 2 - margin,
      );
      const flipBelow = idealY < margin;
      const y = flipBelow ? rect.bottom + margin : idealY;
      setPos({ x, y });
      setText(selectedText);
    }

    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [minLength]);

  return (
    <AnimatePresence>
      {pos && (
        <motion.button
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onClip(text);
            // Drop the browser selection so the FAB hides cleanly.
            window.getSelection()?.removeAllRanges();
            setPos(null);
          }}
          className="fixed z-50 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber text-void text-[12px] font-semibold shadow-lg shadow-black/50 hover:bg-amber-light transition-colors cursor-pointer"
          style={{ left: pos.x, top: pos.y }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h10M3 6l4-4M3 6l4 4" />
            <path d="M13 10v3a1 1 0 01-1 1H4a1 1 0 01-1-1V6" />
          </svg>
          Clip
        </motion.button>
      )}
    </AnimatePresence>
  );
}
