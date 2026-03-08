"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface ReaderScrollProps {
  htmlContent: string;
  chapterTitle: string;
}

export default function ReaderScroll({
  htmlContent,
  chapterTitle,
}: ReaderScrollProps) {
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      setProgress(100);
      return;
    }
    setProgress((el.scrollTop / scrollable) * 100);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="h-[2px] bg-border shrink-0">
        <motion.div
          className="h-full bg-amber/60"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "easeOut" }}
        />
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-8 py-16"
      >
        <div className="max-w-[680px] mx-auto">
          <div
            className="prose-reader"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* End marker */}
          <div className="flex items-center justify-center gap-4 mt-16 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent" />
            <span className="text-[11px] text-text-ghost tracking-[0.2em] uppercase">End of chapter</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent" />
          </div>
        </div>
      </div>

      {/* Bottom bar: progress */}
      <div className="shrink-0 flex items-center justify-center py-4 text-[12px] text-text-ghost select-none">
        <span className="tabular-nums">{Math.round(progress)}% read</span>
      </div>
    </div>
  );
}
