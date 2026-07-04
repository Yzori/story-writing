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
 * Ending the session (Director only). A leaf of the same paper as the page
 * it closes — sheet, whispered header, wax seal — not a foreign app dialog.
 * Presentational: all state and the confirm handler live in the play page.
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
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onConfirm();
            }
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm outline-none"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2 }}
            className="manuscript-sheet w-full max-w-md rounded-md px-6 py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="end-session-title"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost"
            >
              closing the session
            </p>

            <p className="table-murmur mt-3">
              this closes the page for everyone at the table — you can leave a
              closing line, and a hook for next time
            </p>

            <label
              htmlFor="end-session-epilogue"
              className="table-action mt-5 block text-text-ghost"
            >
              A closing line
            </label>
            <textarea
              id="end-session-epilogue"
              value={epilogueText}
              onChange={(e) => setEpilogueText(e.target.value)}
              placeholder="The road stretches on, and the shadows grow longer…"
              aria-label="Closing line (optional)"
              autoFocus
              className="mt-1 block w-full resize-none border-b border-border/60 bg-transparent pb-1 font-reading text-[15px] italic text-paper/90 outline-none transition-colors placeholder:text-text-ghost focus:border-amber/40"
              rows={3}
              maxLength={5000}
            />
            <p className="mt-1 font-mono text-[9.5px] text-text-ghost">
              optional — the last line under this session
            </p>

            <label
              htmlFor="end-session-cliffhanger"
              className="table-action mt-4 block text-text-ghost"
            >
              A hook for next time
            </label>
            <textarea
              id="end-session-cliffhanger"
              value={cliffhangerText}
              onChange={(e) => setCliffhangerText(e.target.value)}
              placeholder="At dawn, the gates will open — and they are not ready…"
              aria-label="Hook for next session (optional)"
              className="mt-1 block w-full resize-none border-b border-border/60 bg-transparent pb-1 font-reading text-[15px] italic text-paper/90 outline-none transition-colors placeholder:text-text-ghost focus:border-amber/40"
              rows={2}
              maxLength={280}
            />
            <p className="mt-1 font-mono text-[9.5px] text-text-ghost">
              optional — opens the next session&rsquo;s &ldquo;previously&rdquo;
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-mono text-[9.5px] tracking-[0.08em] text-text-ghost">
                Ctrl+Enter ends it · Esc keeps writing
              </span>
              <div className="ml-auto flex items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="table-action cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Never mind
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="wax-seal cursor-pointer px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
                >
                  End the session
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
