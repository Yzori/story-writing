"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CommentThread, addReply, formatTimeAgo } from "@/client/comments";

interface CommentsSidebarProps {
  threads: CommentThread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onReply: (threadId: string, text: string) => void;
  onResolve: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onClose: () => void;
}

export default function CommentsSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onReply,
  onResolve,
  onDelete,
  onClose,
}: CommentsSidebarProps) {
  const activeThreads = threads.filter((t) => !t.resolved);
  const resolvedThreads = threads.filter((t) => t.resolved);

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col"
    >
      <div className="min-w-[320px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-paper">Comments</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-ghost px-1.5 py-0.5 rounded-full bg-subtle">
              {activeThreads.length}
            </span>
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
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto py-2">
          {activeThreads.length === 0 && resolvedThreads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center text-text-ghost mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-4 3v-3H3a1 1 0 0 1-1-1V5z" />
                </svg>
              </div>
              <p className="text-sm text-text-tertiary">No comments yet</p>
              <p className="text-[11px] text-text-ghost mt-1">
                Select text and click the comment button to start a conversation
              </p>
            </div>
          )}

          {/* Active threads */}
          {activeThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onSelect={() => onSelectThread(thread.id)}
              onReply={(text) => onReply(thread.id, text)}
              onResolve={() => onResolve(thread.id)}
              onDelete={() => onDelete(thread.id)}
            />
          ))}

          {/* Resolved section */}
          {resolvedThreads.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost px-4 py-2">
                Resolved ({resolvedThreads.length})
              </p>
              {resolvedThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === activeThreadId}
                  onSelect={() => onSelectThread(thread.id)}
                  onReply={(text) => onReply(thread.id, text)}
                  onResolve={() => onResolve(thread.id)}
                  onDelete={() => onDelete(thread.id)}
                  resolved
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

function ThreadCard({
  thread,
  isActive,
  resolved,
  onSelect,
  onReply,
  onResolve,
  onDelete,
}: {
  thread: CommentThread;
  isActive: boolean;
  resolved?: boolean;
  onSelect: () => void;
  onReply: (text: string) => void;
  onResolve: () => void;
  onDelete: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(replyText.trim());
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div
      onClick={onSelect}
      className={`mx-2 mb-1 rounded-lg border cursor-pointer transition-all ${
        isActive
          ? "border-amber/30 bg-amber/[0.04]"
          : "border-transparent hover:bg-subtle/30"
      } ${resolved ? "opacity-50" : ""}`}
    >
      <div className="px-3 py-2.5">
        {/* Quoted text */}
        <div className="text-[11px] text-text-ghost italic border-l-2 border-amber/30 pl-2 mb-2 line-clamp-2">
          {thread.quotedText}
        </div>

        {/* Comments */}
        {thread.comments.map((comment, i) => (
          <div key={comment.id} className={i > 0 ? "mt-2 pt-2 border-t border-border" : ""}>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-4 h-4 rounded-full bg-amber/20 flex items-center justify-center">
                <span className="text-[8px] font-bold text-amber">
                  {comment.author[0].toUpperCase()}
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

        {/* Actions */}
        <div className="flex items-center gap-1 mt-2 pl-6">
          {!resolved && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReply((v) => !v);
                }}
                className="text-[11px] text-text-ghost hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded"
              >
                Reply
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve();
                }}
                className="text-[11px] text-text-ghost hover:text-sage transition-colors px-1.5 py-0.5 rounded"
              >
                Resolve
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-[11px] text-text-ghost hover:text-rose transition-colors px-1.5 py-0.5 rounded"
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
                    if (e.key === "Enter") handleSubmitReply();
                    if (e.key === "Escape") setShowReply(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Reply..."
                  className="flex-1 bg-surface border border-border rounded-md px-2 py-1 text-[12px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmitReply();
                  }}
                  className="px-2 py-1 rounded-md bg-amber/15 text-amber text-[11px] hover:bg-amber/25 transition-colors"
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
