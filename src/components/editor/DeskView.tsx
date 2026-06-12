"use client";

/**
 * The Desk — zoom-out navigation for the editor cockpit.
 *
 * ⌘E (or the breadcrumb) pulls the camera back from the page: chapters
 * lie on the desk as sheets, with outline / story bible / details /
 * publish as objects beside them. Clicking a sheet dives back into it.
 *
 * The camera move is a transform-origin zoom: the desk scales down out
 * of the active chapter's card position on entry, and scales back up
 * into whichever card the writer chooses on exit. Concept approved from
 * /mockup/editor-desk (2026-06-12).
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export interface DeskChapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  status: "draft" | "published";
}

interface DeskViewProps {
  storyTitle: string;
  unit: { singular: string; plural: string };
  chapters: DeskChapter[];
  activeChapterId: string | null;
  onClose: () => void;
  onSelectChapter: (id: string) => void;
  onNewChapter: () => void;
  onOpenOutline: () => void;
  onOpenBible: () => void;
  onOpenDetails: () => void;
  onOpenPublish: () => void;
  onOpenHistory: (chapterId: string) => void;
}

function excerptOf(html: string): string {
  const text = html
    .slice(0, 1200)
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Nothing here yet — a fresh sheet.";
  return text.length > 150 ? `${text.slice(0, 150).trimEnd()}…` : text;
}

const DESK_OBJECTS = [
  {
    id: "outline",
    label: "Outline",
    hint: "the shape of the whole",
    icon: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  },
  {
    id: "bible",
    label: "Story Bible",
    hint: "names, places, rules",
    icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  },
  {
    id: "details",
    label: "Details",
    hint: "title, cover, genres",
    icon: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  },
  {
    id: "publish",
    label: "Publish",
    hint: "send chapters into the world",
    icon: "M12 19V5 M5 12l7-7 7 7",
  },
] as const;

type DeskObjectId = (typeof DESK_OBJECTS)[number]["id"];

export default function DeskView({
  storyTitle,
  unit,
  chapters,
  activeChapterId,
  onClose,
  onSelectChapter,
  onNewChapter,
  onOpenOutline,
  onOpenBible,
  onOpenDetails,
  onOpenPublish,
  onOpenHistory,
}: DeskViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);

  const measureOrigin = useCallback((cardId: string | null) => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const card = cardId
      ? container.querySelector(`[data-desk-card="${cardId}"]`)
      : null;
    if (card) {
      const rect = card.getBoundingClientRect();
      setOrigin({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      });
    } else {
      setOrigin({ x: containerRect.width / 2, y: containerRect.height / 2 });
    }
  }, []);

  // The camera arrives out of the active chapter's place on the desk.
  useLayoutEffect(() => {
    measureOrigin(activeChapterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leave = useCallback(
    (cardId: string | null, action?: () => void) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      pendingAction.current = action ?? null;
      measureOrigin(cardId ?? activeChapterId);
      setLeaving(true);
    },
    [activeChapterId, measureOrigin]
  );

  // Esc and ⌘E both dive back into the page. The page-level handler
  // only opens the desk, so owning the close here keeps one animation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        leave(null);
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        leave(null);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [leave]);

  const handleCardClick = (id: string) => {
    if (id === activeChapterId) {
      leave(id);
    } else {
      leave(id, () => onSelectChapter(id));
    }
  };

  const handleObject = (id: DeskObjectId) => {
    const actions: Record<DeskObjectId, () => void> = {
      outline: onOpenOutline,
      bible: onOpenBible,
      details: onOpenDetails,
      publish: onOpenPublish,
    };
    leave(null, actions[id]);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] overflow-y-auto bg-void/95 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      role="dialog"
      aria-modal="true"
      aria-label="The desk — chapters overview"
    >
      {/* lamp glow */}
      <div
        className="pointer-events-none fixed left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-amber/[0.07] blur-[130px]"
        aria-hidden
      />

      <motion.div
        ref={containerRef}
        className="relative flex min-h-full flex-col items-center px-6 pb-24 pt-16"
        style={origin ? { transformOrigin: `${origin.x}px ${origin.y}px` } : undefined}
        initial={{ scale: 1.55, opacity: 0 }}
        animate={
          origin
            ? leaving
              ? { scale: 1.55, opacity: 0 }
              : { scale: 1, opacity: 1 }
            : undefined
        }
        transition={
          leaving
            ? { duration: 0.26, ease: "easeIn" }
            : { type: "spring", stiffness: 260, damping: 32 }
        }
        onAnimationComplete={() => {
          if (!leavingRef.current) return;
          pendingAction.current?.();
          pendingAction.current = null;
          onClose();
        }}
      >
        <header className="mb-10 text-center">
          <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-text-ghost">
            Your desk
          </p>
          <h2 className="font-display text-[32px] font-semibold leading-tight text-paper">
            {storyTitle}
          </h2>
          <p className="mt-2 font-mono text-[11px] text-text-ghost">
            {chapters.length} {chapters.length === 1 ? unit.singular.toLowerCase() : unit.plural.toLowerCase()} ·{" "}
            {totalWords.toLocaleString()} words
          </p>
        </header>

        {/* the chapters, laid out as sheets */}
        <div className="flex max-w-5xl flex-wrap items-stretch justify-center gap-5">
          {chapters.map((c, i) => (
            <motion.div
              key={c.id}
              data-desk-card={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.06 + i * 0.03 } }}
              whileHover={{ y: -6, rotate: i % 2 ? 0.6 : -0.6 }}
              className="relative"
            >
              <button
                type="button"
                onClick={() => handleCardClick(c.id)}
                className={`group flex h-full w-44 flex-col rounded-2xl border bg-ink p-4 text-left shadow-[0_16px_48px_rgba(0,0,0,0.4)] transition-colors ${
                  c.id === activeChapterId
                    ? "border-amber/30"
                    : "border-border hover:border-border-active"
                }`}
              >
                <span className="mb-2 font-mono text-[10px] text-text-ghost">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mb-2.5 font-display text-[15px] font-semibold leading-snug text-paper">
                  {c.title || "Untitled"}
                </span>
                <span className="mb-4 line-clamp-4 font-reading text-[10px] leading-[1.7] text-text-ghost">
                  {excerptOf(c.content)}
                </span>
                <span className="mt-auto flex items-center gap-2 font-mono text-[10px] text-text-secondary">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      c.status === "published" ? "bg-sage" : "bg-amber/70"
                    }`}
                    aria-hidden
                  />
                  {c.wordCount.toLocaleString()}
                  <span className="text-text-ghost">·</span>
                  <span className={c.status === "published" ? "text-sage" : "text-amber/80"}>
                    {c.status}
                  </span>
                </span>
              </button>
              {/* versions — hangs off each sheet */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  leave(c.id, () => onOpenHistory(c.id));
                }}
                className="absolute right-2.5 top-2.5 rounded-md p-1 text-text-ghost opacity-0 transition-all hover:bg-paper/[0.06] hover:text-paper focus:opacity-100 group-hover:opacity-100 [div:hover>&]:opacity-100"
                title="Versions"
                aria-label={`Versions of ${c.title || "Untitled"}`}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 8v4l2.5 2.5 M3.05 11a9 9 0 1 1 .5 4" />
                  <path d="M3 16v-5h5" />
                </svg>
              </button>
            </motion.div>
          ))}

          {/* a fresh sheet */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.06 + chapters.length * 0.03 },
            }}
            onClick={() => leave(null, onNewChapter)}
            className="flex min-h-[180px] w-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-text-ghost transition-all hover:-translate-y-1.5 hover:border-amber/30 hover:text-amber"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5v14 M5 12h14" />
            </svg>
            <span className="text-[12px]">New {unit.singular.toLowerCase()}</span>
          </motion.button>
        </div>

        {/* the other things on the desk */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
        >
          {DESK_OBJECTS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => handleObject(o.id)}
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-amber/25 hover:bg-amber/[0.04]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-ghost transition-colors group-hover:text-amber"
                aria-hidden
              >
                <path d={o.icon} />
              </svg>
              <span className="text-left">
                <span className="block text-[13px] text-paper">{o.label}</span>
                <span className="block text-[11px] text-text-ghost">{o.hint}</span>
              </span>
            </button>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.35 } }}
          className="mt-10 text-[11px] text-text-ghost"
        >
          <kbd className="mr-1.5 rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>
          back to the page
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
