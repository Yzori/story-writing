"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CommentThread } from "@/client/comments";
import { formatTimeAgo } from "@/lib/format";

/**
 * The conversation inside one comment thread — quoted text, the replies, and
 * the reply/resolve/delete actions. Shared by the margin note popover
 * (MarginaliaLayer) and the ⌘K comments list so both speak with one voice.
 */
export default function CommentThreadBody({
  thread,
  onReply,
  onResolve,
  onDelete,
  autoFocusReply = false,
}: {
  thread: CommentThread;
  onReply: (text: string) => void;
  onResolve: () => void;
  onDelete: () => void;
  autoFocusReply?: boolean;
}) {
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(autoFocusReply);

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(replyText.trim());
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div className="px-3 py-2.5">
      {/* Quoted text */}
      <div className="text-[11px] text-text-ghost italic border-l-2 border-amber/30 pl-2 mb-2 line-clamp-3">
        {thread.quotedText}
      </div>

      {/* Comments */}
      <div className="max-h-48 overflow-y-auto -mx-0.5 px-0.5">
        {thread.comments.map((comment, i) => (
          <div
            key={comment.id}
            className={i > 0 ? "mt-2 pt-2 border-t border-border" : ""}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-4 h-4 rounded-full bg-amber/20 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-amber">
                  {comment.author[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
              <span className="text-[11px] font-medium text-text-secondary">
                {comment.author}
              </span>
              <span className="text-[10px] text-text-ghost">
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed pl-6">
              {comment.text}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 pl-6">
        <button
          onClick={() => setShowReply((v) => !v)}
          className="text-[11px] text-text-ghost hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded"
        >
          Reply
        </button>
        <button
          onClick={onResolve}
          className="text-[11px] text-text-ghost hover:text-sage transition-colors px-1.5 py-0.5 rounded"
        >
          Resolve
        </button>
        <button
          onClick={onDelete}
          className="text-[11px] text-text-ghost hover:text-rose transition-colors px-1.5 py-0.5 rounded ml-auto"
        >
          Delete
        </button>
      </div>

      {/* Reply input */}
      <AnimatePresence>
        {showReply && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pl-6 flex gap-2">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitReply();
                  if (e.key === "Escape") setShowReply(false);
                  e.stopPropagation();
                }}
                placeholder="Reply…"
                className="flex-1 bg-surface border border-border rounded-md px-2 py-1 text-[12px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
              />
              <button
                onClick={submitReply}
                className="px-2 py-1 rounded-md bg-amber/15 text-amber text-[11px] hover:bg-amber/25 transition-colors"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
