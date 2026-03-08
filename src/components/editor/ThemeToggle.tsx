"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Theme, setTheme, getStoredTheme } from "@/lib/theme";

const THEMES: { id: Theme; label: string; icon: React.ReactNode }[] = [
  {
    id: "light",
    label: "Morning",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="7" cy="7" r="3" />
        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.75 2.75l1.06 1.06M10.19 10.19l1.06 1.06M2.75 11.25l1.06-1.06M10.19 3.81l1.06-1.06" />
      </svg>
    ),
  },
  {
    id: "sepia",
    label: "Library",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8" />
        <path d="M2 12h10" />
        <path d="M5 6h4" />
        <path d="M5 9h2" />
      </svg>
    ),
  },
  {
    id: "dark",
    label: "Lamplight",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12.5 7.5a5.5 5.5 0 1 1-6-6 4.5 4.5 0 0 0 6 6z" />
      </svg>
    ),
  },
];

export default function ThemeToggle() {
  const [current, setCurrent] = useState<Theme>("light");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getStoredTheme();
    setCurrent(stored);
    setTheme(stored);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = (theme: Theme) => {
    setCurrent(theme);
    setTheme(theme);
    setOpen(false);
  };

  const currentTheme = THEMES.find((t) => t.id === current)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-subtle/50 dark:hover:bg-subtle/50 transition-colors"
        title={`Theme: ${currentTheme.label}`}
      >
        {currentTheme.icon}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-2 right-0 flex gap-1 p-1 rounded-lg bg-elevated border border-border-active shadow-xl shadow-black/20"
          >
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] transition-colors whitespace-nowrap ${
                  current === theme.id
                    ? "bg-amber/15 text-amber"
                    : "text-text-secondary hover:text-paper hover:bg-subtle/50"
                }`}
              >
                {theme.icon}
                {theme.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
