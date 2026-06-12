"use client";

/*
 * The Quill — Quiloria's command palette (⌘K / Ctrl-K).
 *
 * "Rare things get summoned, not seated": the long tail of destinations
 * lives here so the dock can stay small. Styled as a slip of manuscript
 * paper in the dark room, matching the auth pages.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getStoredTheme, setTheme } from "@/client/theme";

export interface QuillCommand {
  label: string;
  hint?: string;
  href?: string;
  /** Commands that act instead of navigating. */
  action?: "toggle-theme";
  keywords: string;
  section: "Go" | "Do";
}

const TURN_THE_LAMP: QuillCommand = {
  label: "Turn the lamp",
  hint: "light / dark",
  action: "toggle-theme",
  keywords: "theme dark light midnight vellum lamplight daybreak appearance mode toggle switch lamp",
  section: "Do",
};

export const SIGNED_IN_COMMANDS: QuillCommand[] = [
  { label: "For You", hint: "your reader", href: "/read", keywords: "read for you feed reader", section: "Go" },
  { label: "The Stacks", hint: "browse stories", href: "/browse", keywords: "browse discover stacks search stories", section: "Go" },
  { label: "My Library", hint: "saved stories", href: "/library", keywords: "library saved reading list", section: "Go" },
  { label: "The Studio", hint: "your dashboard", href: "/dashboard", keywords: "dashboard studio home stats", section: "Go" },
  { label: "Story Jams", href: "/jams", keywords: "jams events community", section: "Go" },
  { label: "Notifications", href: "/notifications", keywords: "notifications bell unread", section: "Go" },
  { label: "Profile", href: "/profile", keywords: "profile portfolio public page", section: "Go" },
  { label: "Settings", href: "/settings", keywords: "settings preferences account theme", section: "Go" },
  { label: "Earnings", href: "/creator/monetization", keywords: "earnings monetization money payout circle", section: "Go" },
  { label: "Commissions", href: "/commissions", keywords: "commissions scriptorium marketplace", section: "Go" },
  { label: "Boost", href: "/creator/boost", keywords: "boost visibility promote", section: "Go" },
  { label: "Pricing", href: "/pricing", keywords: "pricing plans cost", section: "Go" },
  { label: "Begin a new story", href: "/create", keywords: "new story create write start novel webtoon poetry screenplay", section: "Do" },
  { label: "Refill your well", hint: "ink drops", href: "/settings/ink-drops", keywords: "ink drops refill balance buy", section: "Do" },
  TURN_THE_LAMP,
];

export const SIGNED_OUT_COMMANDS: QuillCommand[] = [
  { label: "The Stacks", hint: "browse stories", href: "/browse", keywords: "browse discover stacks search stories", section: "Go" },
  { label: "Pricing", href: "/pricing", keywords: "pricing plans cost free", section: "Go" },
  { label: "Sign in", href: "/login", keywords: "sign in login return", section: "Go" },
  { label: "Try the editor", hint: "no account needed", href: "/demo/try", keywords: "try demo editor write quill", section: "Do" },
  { label: "Write yourself in", hint: "create an account", href: "/register", keywords: "register sign up join account", section: "Do" },
  TURN_THE_LAMP,
];

interface Props {
  open: boolean;
  onClose: () => void;
  commands: QuillCommand[];
}

export default function QuillPalette({ open, onClose, commands }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q),
    );
  }, [query, commands]);

  // Trailing row: any un-matched text becomes a search of the stacks.
  const searchRow = query.trim().length > 0;
  const total = results.length + (searchRow ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlighted(0);
    // focus after the entrance animation has mounted the input
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  const run = (index: number) => {
    if (index < results.length) {
      const command = results[index];
      if (command.action === "toggle-theme") {
        setTheme(getStoredTheme() === "dark" ? "light" : "dark");
      } else if (command.href) {
        router.push(command.href);
      }
    } else if (searchRow) {
      router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
    }
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (total > 0) run(highlighted);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const sections: Array<{ name: string; items: Array<{ command: QuillCommand; index: number }> }> = [];
  results.forEach((command, index) => {
    const last = sections[sections.length - 1];
    if (!last || last.name !== command.section) {
      sections.push({ name: command.section, items: [{ command, index }] });
    } else {
      last.items.push({ command, index });
    }
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[18vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* the dark room dims */}
          <div
            className="absolute inset-0 bg-void/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* a slip of paper */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="The Quill — quick navigation"
            className="quill-sheet relative w-full max-w-lg bg-paper rounded-[8px] shadow-[0_40px_90px_rgba(0,0,0,0.7)] overflow-hidden"
            initial={{ opacity: 0, y: -14, rotate: -0.6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            onKeyDown={onKeyDown}
          >
            {/* candlelight across the slip */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 90% 50% at 15% 0%, rgba(255,248,230,0.55) 0%, transparent 55%)" }}
              aria-hidden
            />

            <div className="relative">
              <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-on-gold/15">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="text-on-gold/45 shrink-0" aria-hidden>
                  <path d="M13.5 2.5l-9 9L2 14l2.5-2.5 9-9z" />
                  <path d="M11 5l1-1" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Where to? Try “studio”, “earnings”, or a story…"
                  aria-label="Search destinations and actions"
                  className="flex-1 bg-transparent font-reading italic text-[15px] text-on-gold placeholder:text-on-gold/35 placeholder:not-italic outline-none caret-gold-dark"
                />
                <kbd className="hidden md:inline text-[9px] uppercase tracking-[0.15em] text-on-gold/40 border border-on-gold/20 rounded px-1.5 py-0.5">
                  esc
                </kbd>
              </div>

              <div className="max-h-[46vh] overflow-y-auto py-2">
                {sections.map((section) => (
                  <div key={section.name}>
                    <p className="px-5 pt-2 pb-1 text-[9px] uppercase tracking-[0.26em] text-on-gold/40">
                      {section.name === "Go" ? "Go to" : "Do"}
                    </p>
                    {section.items.map(({ command, index }) => (
                      <button
                        key={`${command.label}-${command.href ?? command.action}`}
                        onClick={() => run(index)}
                        onMouseEnter={() => setHighlighted(index)}
                        className={`w-full flex items-baseline justify-between gap-4 px-5 py-2 text-left transition-colors ${
                          highlighted === index ? "bg-gold/15" : ""
                        }`}
                      >
                        <span className="font-reading text-[14.5px] text-on-gold">
                          {command.label}
                        </span>
                        {command.hint && (
                          <span className="text-[10px] uppercase tracking-[0.14em] text-on-gold/40 shrink-0">
                            {command.hint}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}

                {searchRow && (
                  <div>
                    <p className="px-5 pt-2 pb-1 text-[9px] uppercase tracking-[0.26em] text-on-gold/40">
                      The stacks
                    </p>
                    <button
                      onClick={() => run(results.length)}
                      onMouseEnter={() => setHighlighted(results.length)}
                      className={`w-full flex items-baseline gap-2 px-5 py-2 text-left transition-colors ${
                        highlighted === results.length ? "bg-gold/15" : ""
                      }`}
                    >
                      <span className="font-reading italic text-[14.5px] text-on-gold">
                        search the stacks for “{query.trim()}”
                      </span>
                    </button>
                  </div>
                )}

                {total === 0 && (
                  <p className="px-5 py-6 font-reading italic text-[13px] text-on-gold/50 text-center">
                    Nothing by that name in tonight&apos;s ledger.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
