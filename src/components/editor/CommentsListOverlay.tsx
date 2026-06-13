"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CommentThread } from "@/client/comments";
import { formatTimeAgo } from "@/lib/format";

/**
 * The ⌘K comments list — a triage overlay for every thread in the chapter,
 * open and resolved alike. The margin dots are the day-to-day surface; this is
 * where you scan them all, jump to one, or clear out resolved/orphaned notes
 * that no longer have a dot in the gutter.
 */
export default function CommentsListOverlay({
  threads,
  onClose,
  onJump,
  onResolve,
  onDelete,
}: {
  threads: CommentThread[];
  onClose: () => void;
  onJump: (threadId: string) => void;
  onResolve: (threadId: string) => void;
  onDelete: (threadId: string) => void;
}) {
  const open = threads.filter((t) => !t.resolved);
  const resolved = threads.filter((t) => t.resolved);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.16 }}
        className="relative w-full max-w-md max-h-[70vh] overflow-hidden rounded-2xl border border-border-active bg-elevated shadow-2xl shadow-black/50 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-medium text-paper">Comments</h3>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-text-ghost">
              {open.length} open
              {resolved.length > 0 ? ` · ${resolved.length} resolved` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {open.length === 0 && resolved.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-text-tertiary">No comments yet</p>
              <p className="text-[11px] text-text-ghost mt-1">
                Select text in the manuscript and add a comment to start a thread.
              </p>
            </div>
          )}

          {open.map((thread) => (
            <Row
              key={thread.id}
              thread={thread}
              onClick={() => onJump(thread.id)}
              onResolve={() => onResolve(thread.id)}
              onDelete={() => onDelete(thread.id)}
            />
          ))}

          {resolved.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost px-4 py-2">
                Resolved
              </p>
              {resolved.map((thread) => (
                <Row
                  key={thread.id}
                  thread={thread}
                  resolved
                  onDelete={() => onDelete(thread.id)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Row({
  thread,
  resolved,
  onClick,
  onResolve,
  onDelete,
}: {
  thread: CommentThread;
  resolved?: boolean;
  onClick?: () => void;
  onResolve?: () => void;
  onDelete: () => void;
}) {
  const last = thread.comments[thread.comments.length - 1];
  return (
    <div
      onClick={onClick}
      className={`group mx-2 mb-1 rounded-lg border border-transparent px-3 py-2.5 transition-all ${
        onClick ? "cursor-pointer hover:bg-subtle/30" : ""
      } ${resolved ? "opacity-50" : ""}`}
    >
      <div className="text-[11px] text-text-ghost italic border-l-2 border-amber/30 pl-2 mb-1.5 line-clamp-2">
        {thread.quotedText}
      </div>
      {last && (
        <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-2">
          <span className="text-text-ghost">{last.author}: </span>
          {last.text}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-[10px] text-text-ghost">
          {thread.comments.length}{" "}
          {thread.comments.length === 1 ? "note" : "notes"}
          {last ? ` · ${formatTimeAgo(last.createdAt)}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onResolve && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResolve();
              }}
              className="text-[11px] text-text-ghost hover:text-sage transition-colors px-1.5 py-0.5 rounded"
            >
              Resolve
            </button>
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
      </div>
    </div>
  );
}
