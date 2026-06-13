"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, motion } from "framer-motion";
import { CommentThread } from "@/client/comments";
import CommentThreadBody from "./CommentThreadBody";

/**
 * Comments as marginalia.
 *
 * Every open thread becomes an amber dot in the manuscript's right gutter,
 * pinned to the vertical line of the text it annotates. Positions are read
 * from the live `.comment-highlight` rects rather than stored offsets, so a
 * dot stays beside its sentence even as the writer adds paragraphs above it.
 * Hover a dot to peek the thread; click to pin it open with reply / resolve /
 * delete. Resolving strips the mark, so the dot simply falls away.
 *
 * The dots live inside the scroll stage (a `position: relative` ancestor), so
 * they ride the scroll for free — their `top` is in content space.
 */

const DOT_GAP = 30; // min vertical spacing so clustered notes don't overlap
const CARD_WIDTH = 300;
const GUTTER_OFFSET = 20; // dot distance past the text column's right edge
const LEAVE_DELAY = 120; // ms grace when sliding from dot to card

interface DotPosition {
  id: string;
  top: number; // content-space px within the scroll stage
  left: number; // px from the stage's left padding edge
  count: number;
}

interface MarginaliaLayerProps {
  editor: Editor | null;
  threads: CommentThread[];
  activeThreadId: string | null;
  onSelect: (id: string | null) => void;
  onReply: (threadId: string, text: string) => void;
  onResolve: (threadId: string) => void;
  onDelete: (threadId: string) => void;
}

export default function MarginaliaLayer({
  editor,
  threads,
  activeThreadId,
  onSelect,
  onReply,
  onResolve,
  onDelete,
}: MarginaliaLayerProps) {
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [dots, setDots] = useState<DotPosition[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find the scroll stage the editor lives in.
  useEffect(() => {
    if (!editor) {
      setStage(null);
      return;
    }
    const find = () =>
      setStage(
        (editor.view.dom.closest(".editor-scroll-stage") as HTMLElement) ?? null
      );
    find();
    // The DOM may settle a frame after the editor is ready.
    const raf = requestAnimationFrame(find);
    return () => cancelAnimationFrame(raf);
  }, [editor]);

  const measure = useCallback(() => {
    if (!editor || !stage) {
      setDots([]);
      return;
    }
    const stageRect = stage.getBoundingClientRect();
    const colRight = editor.view.dom.getBoundingClientRect().right;
    const left = colRight - stageRect.left + GUTTER_OFFSET;
    const scrollTop = stage.scrollTop;

    const raw: DotPosition[] = [];
    for (const t of threads) {
      if (t.resolved) continue;
      const node = stage.querySelector(
        `.comment-highlight[data-thread-id="${t.id}"]`
      );
      if (!node) continue; // orphaned — its text was deleted; no dot
      const r = node.getBoundingClientRect();
      raw.push({
        id: t.id,
        top: r.top - stageRect.top + scrollTop,
        left,
        count: t.comments.length,
      });
    }

    raw.sort((a, b) => a.top - b.top);
    let last = -Infinity;
    for (const dot of raw) {
      if (dot.top < last + DOT_GAP) dot.top = last + DOT_GAP;
      last = dot.top;
    }
    setDots(raw);
  }, [editor, stage, threads]);

  // Re-measure on the things that move marks or resize the column.
  useEffect(() => {
    if (!editor || !stage) return;

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    schedule();
    editor.on("update", schedule);
    editor.on("selectionUpdate", schedule);

    const ro = new ResizeObserver(schedule);
    ro.observe(stage);
    window.addEventListener("resize", schedule);
    // Fonts/images can shift line positions shortly after mount.
    const settle = setTimeout(measure, 300);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      editor.off("update", schedule);
      editor.off("selectionUpdate", schedule);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [editor, stage, measure]);

  const cancelLeave = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  const scheduleLeave = useCallback(() => {
    cancelLeave();
    leaveTimer.current = setTimeout(() => setHoveredId(null), LEAVE_DELAY);
  }, [cancelLeave]);

  useEffect(() => () => cancelLeave(), [cancelLeave]);

  if (!stage) return null;

  const openId = activeThreadId ?? hoveredId;
  const openDot = openId ? dots.find((d) => d.id === openId) : undefined;
  const openThread = openId ? threads.find((t) => t.id === openId) : undefined;
  const pinned = openId != null && openId === activeThreadId;

  const cardLeft = openDot ? Math.max(12, openDot.left - CARD_WIDTH - 12) : 0;

  return createPortal(
    <>
      {dots.map((dot) => {
        const isOpen = dot.id === openId;
        return (
          <button
            key={dot.id}
            type="button"
            onMouseEnter={() => {
              cancelLeave();
              setHoveredId(dot.id);
            }}
            onMouseLeave={scheduleLeave}
            onClick={() => onSelect(activeThreadId === dot.id ? null : dot.id)}
            className="group absolute z-[12] flex h-[18px] w-[18px] -translate-y-[3px] items-center justify-center rounded-full border transition-all"
            style={{
              top: dot.top,
              left: dot.left,
              borderColor: isOpen
                ? "var(--t-gold-soft)"
                : "color-mix(in oklab, var(--t-gold-soft) 55%, transparent)",
              background: isOpen
                ? "var(--t-gold-soft)"
                : "color-mix(in oklab, var(--t-gold-glow) 80%, transparent)",
              boxShadow: isOpen
                ? "0 2px 10px color-mix(in oklab, var(--t-gold-soft) 50%, transparent)"
                : "none",
            }}
            aria-label={`Comment thread, ${dot.count} ${
              dot.count === 1 ? "note" : "notes"
            }`}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isOpen ? "text-void" : "text-amber"}
              aria-hidden
            >
              <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 3v-3H5a2 2 0 0 1-2-2z" />
            </svg>
            {dot.count > 1 && (
              <span
                className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none"
                style={{
                  background: "var(--t-gold-soft)",
                  color: "var(--color-void, #000)",
                }}
              >
                {dot.count}
              </span>
            )}
          </button>
        );
      })}

      <AnimatePresence>
        {openDot && openThread && (
          <motion.div
            key={openThread.id}
            initial={{ opacity: 0, x: 8, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            onMouseEnter={cancelLeave}
            onMouseLeave={scheduleLeave}
            className="absolute z-[30] rounded-xl border border-border-active bg-elevated shadow-2xl shadow-black/40"
            style={{ top: openDot.top - 10, left: cardLeft, width: CARD_WIDTH }}
          >
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                {pinned ? "Note" : "Peek"}
              </span>
              {pinned && (
                <button
                  onClick={() => onSelect(null)}
                  className="p-1 -mr-1 rounded text-text-ghost hover:text-text-secondary transition-colors"
                  aria-label="Close note"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <line x1="4" y1="4" x2="10" y2="10" />
                    <line x1="10" y1="4" x2="4" y2="10" />
                  </svg>
                </button>
              )}
            </div>
            <CommentThreadBody
              thread={openThread}
              onReply={(text) => onReply(openThread.id, text)}
              onResolve={() => onResolve(openThread.id)}
              onDelete={() => onDelete(openThread.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    stage
  );
}
