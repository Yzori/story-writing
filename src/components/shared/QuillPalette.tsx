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

type GlyphName =
  | "for-you"
  | "stacks"
  | "library"
  | "studio"
  | "jams"
  | "notifications"
  | "profile"
  | "settings"
  | "earnings"
  | "commissions"
  | "boost"
  | "pricing"
  | "create"
  | "refill"
  | "lamp"
  | "sign-in"
  | "demo"
  | "register"
  | "search";

export interface QuillCommand {
  label: string;
  hint?: string;
  href?: string;
  /** Commands that act instead of navigating. */
  action?: "toggle-theme";
  keywords: string;
  section: "Go" | "Do";
  glyph: GlyphName;
}

/* Hand-inked 16px glyphs — one nib weight (1.4) so the list reads as a
   single scribe's hand, not a sticker sheet. */
const GLYPH_PATHS: Record<GlyphName, React.ReactNode> = {
  "for-you": (
    <>
      <path d="M2.5 4c1.8-.9 3.7-.9 5.5 0v8.5c-1.8-.9-3.7-.9-5.5 0V4z" />
      <path d="M13.5 4c-1.8-.9-3.7-.9-5.5 0v8.5c1.8-.9 3.7-.9 5.5 0V4z" />
    </>
  ),
  stacks: (
    <>
      <path d="M2.5 2.5h3v11h-3z" />
      <path d="M7 2.5h2.5v11H7z" />
      <path d="M11 3.4l2.7 10.1" />
    </>
  ),
  library: <path d="M4 2.5h8v11l-4-3.1-4 3.1v-11z" />,
  studio: (
    <>
      <path d="M3 7.6L8 3l5 4.6v5.9H3V7.6z" />
      <path d="M6.5 13.5V10h3v3.5" />
    </>
  ),
  jams: (
    <>
      <path d="M8 2.2v3.2M8 10.6v3.2M2.2 8h3.2M10.6 8h3.2" />
      <path d="M4.4 4.4l1.8 1.8M9.8 9.8l1.8 1.8M11.6 4.4L9.8 6.2M6.2 9.8l-1.8 1.8" />
    </>
  ),
  notifications: (
    <>
      <path d="M4 11h8a3 3 0 01-1-2.2V7a3 3 0 10-6 0v1.8A3 3 0 014 11z" />
      <path d="M6.9 13a1.2 1.2 0 002.2 0" />
    </>
  ),
  profile: (
    <>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3.4 13.2c.7-2.3 2.5-3.5 4.6-3.5s3.9 1.2 4.6 3.5" />
    </>
  ),
  settings: (
    <>
      <path d="M2.5 4.8h1.8M6.7 4.8h7.8M2.5 8h6.6M11.5 8h3M2.5 11.2h2.8M7.7 11.2h6.8" />
      <circle cx="5.5" cy="4.8" r="1.2" />
      <circle cx="10.3" cy="8" r="1.2" />
      <circle cx="6.5" cy="11.2" r="1.2" />
    </>
  ),
  earnings: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.3" />
    </>
  ),
  commissions: (
    <>
      <path d="M4.5 3h6.5A1.5 1.5 0 0112.5 4.5V13H6a1.5 1.5 0 01-1.5-1.5V3z" />
      <path d="M4.5 3A1.5 1.5 0 003 4.5V6h1.5M7 6h3.5M7 8.5h3.5" />
    </>
  ),
  boost: (
    <>
      <path d="M3.5 12.5L12.5 3.5" />
      <path d="M6 3.5h6.5V10" />
    </>
  ),
  pricing: (
    <>
      <path d="M2.5 3.5v4.2l6.2 6.2 4.6-4.6-6.2-6.2H2.5z" />
      <circle cx="5.3" cy="6.3" r="0.6" />
    </>
  ),
  create: (
    <>
      <path d="M13.5 2.5l-9 9L2 14l2.5-2.5 9-9z" />
      <path d="M11 5l1-1" />
    </>
  ),
  refill: <path d="M8 2.4c2.2 3 3.8 4.9 3.8 6.9a3.8 3.8 0 11-7.6 0c0-2 1.6-3.9 3.8-6.9z" />,
  lamp: (
    <>
      <path d="M8 2a3.6 3.6 0 012 6.6c-.5.4-.8.9-.8 1.6H6.8c0-.7-.3-1.2-.8-1.6A3.6 3.6 0 018 2z" />
      <path d="M6.8 12h2.4M7.3 13.8h1.4" />
    </>
  ),
  "sign-in": (
    <>
      <path d="M6.5 8H13M10.5 5.5L13 8l-2.5 2.5" />
      <path d="M6.5 2.5H3.5v11h3" />
    </>
  ),
  demo: (
    <>
      <path d="M9.7 3.6l2.7 2.7-6.3 6.3-3.4.7.7-3.4 6.3-6.3z" />
      <path d="M8.6 4.7l2.7 2.7" />
    </>
  ),
  register: (
    <>
      <circle cx="6.5" cy="5.5" r="2.5" />
      <path d="M2.3 13.2c.6-2.2 2.2-3.3 4.2-3.3s3.6 1.1 4.2 3.3" />
      <path d="M12.7 4.8v4M10.7 6.8h4" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.4 10.4L14 14" />
    </>
  ),
};

function Glyph({ name }: { name: GlyphName }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      {GLYPH_PATHS[name]}
    </svg>
  );
}

const TURN_THE_LAMP: QuillCommand = {
  label: "Turn the lamp",
  hint: "light / dark",
  action: "toggle-theme",
  keywords: "theme dark light midnight vellum lamplight daybreak appearance mode toggle switch lamp",
  section: "Do",
  glyph: "lamp",
};

export const SIGNED_IN_COMMANDS: QuillCommand[] = [
  { label: "For You", hint: "your reader", href: "/read", keywords: "read for you feed reader", section: "Go", glyph: "for-you" },
  { label: "The Stacks", hint: "browse stories", href: "/browse", keywords: "browse discover stacks search stories", section: "Go", glyph: "stacks" },
  { label: "My Library", hint: "saved stories", href: "/library", keywords: "library saved reading list", section: "Go", glyph: "library" },
  { label: "The Studio", hint: "your dashboard", href: "/dashboard", keywords: "dashboard studio home stats", section: "Go", glyph: "studio" },
  { label: "Story Jams", href: "/jams", keywords: "jams events community", section: "Go", glyph: "jams" },
  { label: "Notifications", href: "/notifications", keywords: "notifications bell unread", section: "Go", glyph: "notifications" },
  { label: "Profile", href: "/profile", keywords: "profile portfolio public page", section: "Go", glyph: "profile" },
  { label: "Settings", href: "/settings", keywords: "settings preferences account theme", section: "Go", glyph: "settings" },
  { label: "Earnings", href: "/creator/monetization", keywords: "earnings monetization money payout circle", section: "Go", glyph: "earnings" },
  { label: "Commissions", href: "/commissions", keywords: "commissions scriptorium marketplace", section: "Go", glyph: "commissions" },
  { label: "Boost", href: "/creator/boost", keywords: "boost visibility promote", section: "Go", glyph: "boost" },
  { label: "Pricing", href: "/pricing", keywords: "pricing plans cost", section: "Go", glyph: "pricing" },
  { label: "Begin a new story", href: "/create", keywords: "new story create write start novel webtoon poetry screenplay", section: "Do", glyph: "create" },
  { label: "Refill your well", hint: "ink drops", href: "/settings/ink-drops", keywords: "ink drops refill balance buy", section: "Do", glyph: "refill" },
  TURN_THE_LAMP,
];

export const SIGNED_OUT_COMMANDS: QuillCommand[] = [
  { label: "The Stacks", hint: "browse stories", href: "/browse", keywords: "browse discover stacks search stories", section: "Go", glyph: "stacks" },
  { label: "Pricing", href: "/pricing", keywords: "pricing plans cost free", section: "Go", glyph: "pricing" },
  { label: "Sign in", href: "/login", keywords: "sign in login return", section: "Go", glyph: "sign-in" },
  { label: "Try the editor", hint: "no account needed", href: "/demo/try", keywords: "try demo editor write quill", section: "Do", glyph: "demo" },
  { label: "Write yourself in", hint: "create an account", href: "/register", keywords: "register sign up join account", section: "Do", glyph: "register" },
  TURN_THE_LAMP,
];

/** The matched stretch of a label gets a highlighter swipe, like a
    reader marking a line. */
function MarkedLabel({ label, query }: { label: string; query: string }) {
  const q = query.trim().toLowerCase();
  const at = q ? label.toLowerCase().indexOf(q) : -1;
  if (at < 0) return <>{label}</>;
  return (
    <>
      {label.slice(0, at)}
      <span className="rounded-[3px] bg-gold/25 -mx-px px-px">
        {label.slice(at, at + q.length)}
      </span>
      {label.slice(at + q.length)}
    </>
  );
}

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
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Mouse hover also moves the highlight; only keyboard moves should
  // scroll, or hovering while the list scrolls fights the wheel.
  const scrollOnHighlight = useRef(false);

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

  useEffect(() => {
    if (!scrollOnHighlight.current) return;
    scrollOnHighlight.current = false;
    rowRefs.current[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

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
      scrollOnHighlight.current = true;
      setHighlighted((h) => Math.min(h + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      scrollOnHighlight.current = true;
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

  const row = (index: number, glyph: GlyphName, children: React.ReactNode, hint?: string) => {
    const active = highlighted === index;
    return (
      <button
        ref={(el) => {
          rowRefs.current[index] = el;
        }}
        role="option"
        id={`quill-option-${index}`}
        aria-selected={active}
        onClick={() => run(index)}
        onMouseMove={() => setHighlighted(index)}
        className="relative w-full flex items-center gap-3 px-5 py-2 text-left"
      >
        {active && (
          <motion.div
            layoutId="quill-highlight"
            className="absolute inset-y-0 left-2 right-2 rounded-md bg-gold/15"
            transition={{ type: "spring", stiffness: 600, damping: 40 }}
            aria-hidden
          >
            {/* the ink stroke down the margin */}
            <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-gold-dark/60" />
          </motion.div>
        )}
        <span className={`relative transition-colors ${active ? "text-on-gold/70" : "text-on-gold/40"}`}>
          <Glyph name={glyph} />
        </span>
        <span className="relative flex-1 font-reading text-[14.5px] text-on-gold truncate">
          {children}
        </span>
        {hint && (
          <span className="relative text-[10px] uppercase tracking-[0.14em] text-on-gold/40 shrink-0">
            {hint}
          </span>
        )}
        <span
          className={`relative hidden md:inline text-[11px] text-on-gold/45 shrink-0 transition-opacity ${
            active ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        >
          ↵
        </span>
      </button>
    );
  };

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

            <div className="relative flex flex-col">
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
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="quill-options"
                  aria-activedescendant={total > 0 ? `quill-option-${highlighted}` : undefined}
                  className="flex-1 bg-transparent font-reading italic text-[15px] text-on-gold placeholder:text-on-gold/35 placeholder:not-italic outline-none caret-gold-dark"
                />
                <kbd className="hidden md:inline text-[9px] uppercase tracking-[0.15em] text-on-gold/40 border border-on-gold/20 rounded px-1.5 py-0.5">
                  esc
                </kbd>
              </div>

              <div id="quill-options" role="listbox" aria-label="Destinations and actions" className="max-h-[46vh] overflow-y-auto py-2">
                {sections.map((section) => (
                  <div key={section.name}>
                    <div className="flex items-center gap-3 px-5 pt-2.5 pb-1.5">
                      <p className="text-[9px] uppercase tracking-[0.26em] text-on-gold/40">
                        {section.name === "Go" ? "Go to" : "Do"}
                      </p>
                      <div className="flex-1 h-px bg-on-gold/10" aria-hidden />
                    </div>
                    {section.items.map(({ command, index }) =>
                      <div key={`${command.label}-${command.href ?? command.action}`}>
                        {row(index, command.glyph, <MarkedLabel label={command.label} query={query} />, command.hint)}
                      </div>
                    )}
                  </div>
                ))}

                {searchRow && (
                  <div>
                    <div className="flex items-center gap-3 px-5 pt-2.5 pb-1.5">
                      <p className="text-[9px] uppercase tracking-[0.26em] text-on-gold/40">
                        The stacks
                      </p>
                      <div className="flex-1 h-px bg-on-gold/10" aria-hidden />
                    </div>
                    {row(
                      results.length,
                      "search",
                      <span className="italic">search the stacks for “{query.trim()}”</span>,
                    )}
                  </div>
                )}

                {total === 0 && (
                  <p className="px-5 py-6 font-reading italic text-[13px] text-on-gold/50 text-center">
                    Nothing by that name in tonight&apos;s ledger.
                  </p>
                )}
              </div>

              {/* the colophon — how to hold the quill (keyboard-only, so desktop-only) */}
              <div className="hidden md:flex items-center justify-between px-5 py-2 border-t border-on-gold/10">
                <div className="flex items-center gap-3 text-[10px] text-on-gold/40">
                  <span className="flex items-center gap-1">
                    <kbd className="text-[9px] border border-on-gold/20 rounded px-1 py-px">↑↓</kbd>
                    move
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="text-[9px] border border-on-gold/20 rounded px-1 py-px">↵</kbd>
                    open
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.22em] text-on-gold/30">
                  The Quill
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
