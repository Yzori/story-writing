"use client";

import { motion } from "framer-motion";

interface AnnotationPopoverProps {
  content: string;
  displayName: string | null;
  createdAt: string;
  isOwn: boolean;
  position: { top: number; left: number };
  onDelete?: () => void;
  onClose: () => void;
}

export default function AnnotationPopover({
  content,
  displayName,
  createdAt,
  isOwn,
  position,
  onDelete,
  onClose,
}: AnnotationPopoverProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-72 bg-elevated border border-border rounded-lg shadow-xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary font-medium">
          {displayName || "Anonymous"}
        </span>
        <button
          onClick={onClose}
          className="text-text-ghost hover:text-text transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-text leading-relaxed mb-2">{content}</p>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-ghost">
          {new Date(createdAt).toLocaleDateString()}
        </span>
        {isOwn && onDelete && (
          <button
            onClick={onDelete}
            className="text-[10px] text-rose/60 hover:text-rose transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}
