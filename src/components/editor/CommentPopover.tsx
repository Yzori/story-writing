"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface CommentPopoverProps {
  position: { x: number; y: number };
  selectedText: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export default function CommentPopover({
  position,
  selectedText,
  onSubmit,
  onCancel,
}: CommentPopoverProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus after animation
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[60] -translate-x-1/2"
      style={{ left: position.x, top: position.y + 8 }}
    >
      <div className="w-[300px] rounded-xl bg-elevated border border-border-active shadow-2xl shadow-black/40 overflow-hidden">
        {/* Quoted text */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] uppercase tracking-[0.1em] text-text-ghost mb-1.5">
            Comment on
          </p>
          <p className="text-[12px] text-text-secondary italic border-l-2 border-amber/30 pl-2 line-clamp-2">
            {selectedText}
          </p>
        </div>

        {/* Input */}
        <div className="px-4 pb-3">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Add your comment..."
            rows={2}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-[10px] text-text-ghost">
            Enter to submit · Esc to cancel
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-[12px] text-text-ghost hover:text-text-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="px-3 py-1.5 rounded-lg text-[12px] bg-amber/15 text-amber hover:bg-amber/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Comment
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
