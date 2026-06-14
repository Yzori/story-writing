"use client";

import { motion, AnimatePresence } from "framer-motion";

interface EndSessionModalProps {
  open: boolean;
  epilogueText: string;
  setEpilogueText: (value: string) => void;
  cliffhangerText: string;
  setCliffhangerText: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * End-Session confirmation modal (GM only). Presentational — all state and the
 * confirm handler live in the play page. Lifted verbatim to slim the page.
 */
export default function EndSessionModal({
  open,
  epilogueText,
  setEpilogueText,
  cliffhangerText,
  setCliffhangerText,
  onConfirm,
  onClose,
}: EndSessionModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-session-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm outline-none"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-[#111] border border-amber/20 rounded-2xl p-6 max-w-md w-full mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span id="end-session-title" className="text-[11px] uppercase tracking-[0.2em] font-display text-amber">End Session</span>
            </div>

            <p className="text-sm text-white/60 mb-5">
              This will close the session for all players. You can optionally leave a closing thought — a teaser, a reflection, or a &ldquo;to be continued...&rdquo;
            </p>

            <label className="mb-1 block font-display text-[9px] uppercase tracking-[0.18em] text-amber/60">Closing Thought</label>
            <textarea
              value={epilogueText}
              onChange={(e) => setEpilogueText(e.target.value)}
              placeholder="The road stretches on, and the shadows grow longer..."
              aria-label="Closing thought (optional)"
              autoFocus
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm text-paper/80 font-serif italic placeholder:text-white/15 outline-none focus:border-amber/30 resize-none transition-colors"
              rows={3}
              maxLength={5000}
            />
            <p className="text-[9px] text-white/20 mt-1 mb-4">Optional — the closing moment of this session</p>

            <label className="mb-1 block font-display text-[9px] uppercase tracking-[0.18em] text-amber/60">Cliffhanger</label>
            <textarea
              value={cliffhangerText}
              onChange={(e) => setCliffhangerText(e.target.value)}
              placeholder="At dawn, the gates will open — and they are not ready…"
              aria-label="Cliffhanger for next session (optional)"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm text-paper/80 font-serif italic placeholder:text-white/15 outline-none focus:border-amber/30 resize-none transition-colors"
              rows={2}
              maxLength={280}
            />
            <p className="text-[9px] text-white/20 mt-1 mb-5">Optional — the hook that opens next session&apos;s &ldquo;Previously, on…&rdquo;</p>

            <div className="flex gap-3">
              <button
                onClick={onConfirm}
                className="flex-1 bg-amber/10 hover:bg-amber/20 border border-amber/20 text-amber text-[11px] uppercase tracking-wider font-bold rounded-full py-2.5 cursor-pointer transition-colors"
              >
                End Session
              </button>
              <button
                onClick={onClose}
                className="px-5 text-[11px] text-white/40 hover:text-white cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
