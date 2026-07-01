"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Turn } from "@/types/campaign";
import SessionLog from "@/components/campaign/SessionLog";

/**
 * Table talk — the out-of-character voices UNDER the table, kept off the
 * page. A right-hand drawer hosting the kept SessionLog (Talk | Rolls).
 * Opened from a rim tab (desktop) or wherever the page puts the toggle.
 */
export default function TableTalkDrawer({
  open,
  onClose,
  turns,
  currentUserId,
  sessionTitle,
  storyTitle,
  chatInput,
  setChatInput,
  onSendChat,
  readOnly = false,
  isGM = false,
  onUpdateRollRequest,
  view,
  onChangeView,
}: {
  open: boolean;
  onClose: () => void;
  turns: Turn[];
  currentUserId: string | null;
  sessionTitle: string;
  storyTitle: string;
  chatInput: string;
  setChatInput: (value: string) => void;
  onSendChat: (message: string) => void;
  readOnly?: boolean;
  isGM?: boolean;
  onUpdateRollRequest?: (turnId: string, status: "closed" | "cancelled") => void;
  view?: "all" | "talk" | "rolls";
  onChangeView?: (view: "talk" | "rolls") => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 right-0 top-0 z-40 flex w-full max-w-sm flex-col border-l border-border bg-ink/98 shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <p className="hand-note text-lg text-paper/85">under the table</p>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-text-ghost transition-colors hover:text-paper"
                aria-label="Close table talk"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <SessionLog
                turns={turns}
                currentUserId={currentUserId}
                sessionTitle={sessionTitle}
                storyTitle={storyTitle}
                onSendChat={onSendChat}
                chatInput={chatInput}
                setChatInput={setChatInput}
                readOnly={readOnly}
                isGM={isGM}
                onUpdateRollRequest={onUpdateRollRequest}
                fullWidth
                view={view}
                onChangeView={onChangeView}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
