"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";

export type DeckSegment = "you" | "talk" | "cast";

interface DeckSheetProps {
  open: boolean;
  segment: DeckSegment;
  onChangeSegment: (segment: DeckSegment) => void;
  onClose: () => void;
  /** Segment labels adapt to the viewer ("You" vs "Party" for the GM). */
  youLabel: string;
  renderSegment: (segment: DeckSegment) => ReactNode;
}

const SNAP_HALF = "52dvh";
const SNAP_FULL = "88dvh";

/**
 * The player deck's drag-up sheet — Character / Table talk / Cast & clocks in
 * one thumb-reachable surface. Drag is bound to the grip header only, so the
 * content (chat log, long sheets) scrolls freely without fighting the sheet.
 */
export default function DeckSheet({
  open,
  segment,
  onChangeSegment,
  onClose,
  youLabel,
  renderSegment,
}: DeckSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const dragControls = useDragControls();

  // Fresh open always starts at the half detent (render-time adjustment —
  // React's sanctioned pattern for state that follows a prop).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setExpanded(false);
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.y > 90 || velocity.y > 600) {
      if (expanded) setExpanded(false);
      else onClose();
    } else if (offset.y < -70 || velocity.y < -600) {
      setExpanded(true);
    }
  };

  const segments: Array<{ key: DeckSegment; label: string }> = [
    { key: "you", label: youLabel },
    { key: "talk", label: "Table talk" },
    { key: "cast", label: "Cast & clocks" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0, height: expanded ? SNAP_FULL : SNAP_HALF }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 0.3 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-3xl border-t border-x border-amber/20 bg-gradient-to-b from-elevated/98 to-ink shadow-[0_-24px_70px_rgba(0,0,0,0.7)]"
            role="dialog"
            aria-label="The table deck"
          >
            {/* Grip — the only drag surface */}
            <div
              className="shrink-0 cursor-grab touch-none select-none px-4 pb-1 pt-2.5 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-border-active" />
              <div className="mt-2.5 flex items-center gap-1 rounded-xl border border-border bg-ink/50 p-1">
                {segments.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onChangeSegment(s.key)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                      segment === s.key
                        ? "bg-elevated text-amber"
                        : "text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-ghost transition-colors hover:text-paper"
                  aria-label="Close deck"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="12" y1="4" x2="4" y2="12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Segment body — scrolls freely */}
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(224,169,62,0.22)_transparent] [scrollbar-width:thin]">
              {renderSegment(segment)}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
