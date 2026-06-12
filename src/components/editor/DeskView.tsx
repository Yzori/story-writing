"use client";

/**
 * The Desk — zoom-out navigation for the editor cockpit.
 *
 * ⌘E (or the breadcrumb) pulls the camera back from the page: chapters
 * lie on the desk as sheets, with outline / story bible / details /
 * publish as objects beside them. Clicking a sheet dives back into it.
 * Each sheet carries its own management: rename in place, move along
 * the desk, version history, delete (two-step).
 *
 * The camera move is a shared-layout morph: the page sheet in the
 * cockpit and the chosen chapter's card share layoutId "page-sheet",
 * so the page physically shrinks into its place on the desk and grows
 * back out of whichever card the writer picks (the card-expand pattern,
 * reversed). Falls back to a plain fade when the cockpit isn't showing
 * the bare-page sheet. Concept approved from /mockup/editor-desk.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface DeskChapter {
  id: string;
  title: string;
  content: string;
  outline: string;
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
  onOpenBible: () => void;
  onOpenDetails: () => void;
  onOpenPublish: () => void;
  onOpenHistory: (chapterId: string) => void;
  onUpdateOutline: (chapterId: string, outline: string) => void;
  /** Open with the sheets already turned to their outline side. */
  initialFlipped?: boolean;
  /** True when the cockpit is rendering the bare-page sheet (write mode). */
  morphEnabled: boolean;
  onRenameChapter: (id: string, title: string) => void;
  onMoveChapter: (id: string, dir: -1 | 1) => void;
  onDeleteChapter: (id: string) => void;
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
  onOpenBible,
  onOpenDetails,
  onOpenPublish,
  onOpenHistory,
  onUpdateOutline,
  initialFlipped,
  morphEnabled,
  onRenameChapter,
  onMoveChapter,
  onDeleteChapter,
}: DeskViewProps) {
  const leavingRef = useRef(false);
  // Which card the page morphs out of / back into.
  const [morphId, setMorphId] = useState<string | null>(activeChapterId);

  // Flip the sheets over: the back of every sheet is its outline.
  const [flipped, setFlipped] = useState(initialFlipped ?? false);
  const [outlineDrafts, setOutlineDrafts] = useState<Record<string, string>>({});
  const outlineTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Sheet management state
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const busyRef = useRef(false);
  busyRef.current = menuId !== null || renamingId !== null;
  const flippedRef = useRef(false);
  flippedRef.current = flipped;

  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);

  const commitOutline = useCallback(
    (id: string, value: string) => {
      const chapter = chapters.find((c) => c.id === id);
      if (chapter && value !== chapter.outline) onUpdateOutline(id, value);
    },
    [chapters, onUpdateOutline]
  );

  const scheduleOutlineSave = useCallback(
    (id: string, value: string) => {
      setOutlineDrafts((prev) => ({ ...prev, [id]: value }));
      clearTimeout(outlineTimers.current[id]);
      outlineTimers.current[id] = setTimeout(() => commitOutline(id, value), 800);
    },
    [commitOutline]
  );

  const flushOutlineSaves = useCallback(() => {
    for (const [id, timer] of Object.entries(outlineTimers.current)) {
      clearTimeout(timer);
      const draft = outlineDrafts[id];
      if (draft !== undefined) commitOutline(id, draft);
    }
    outlineTimers.current = {};
  }, [outlineDrafts, commitOutline]);

  // Don't lose a half-typed outline to an unmount.
  const flushRef = useRef(flushOutlineSaves);
  flushRef.current = flushOutlineSaves;
  useEffect(() => () => flushRef.current(), []);

  const leave = useCallback(
    (cardId: string | null, action?: () => void) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      flushRef.current();
      // Hand the layoutId to the chosen card first, so the page grows
      // out of the right sheet; commit the action a frame later.
      setMorphId(cardId ?? activeChapterId);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          action?.();
          onClose();
        })
      );
    },
    [activeChapterId, onClose]
  );

  // Esc and ⌘E both dive back into the page — unless a menu or rename
  // is open, in which case Esc only dismisses that. The page-level
  // handler only opens the desk, so owning the close here keeps one
  // animation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (busyRef.current) {
          setMenuId(null);
          setConfirmDeleteId(null);
          setRenamingId(null);
          return;
        }
        if (flippedRef.current) {
          setFlipped(false);
          return;
        }
        leave(null);
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (flippedRef.current) {
          setFlipped(false);
          return;
        }
        leave(null);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [leave]);

  const handleCardClick = (id: string) => {
    if (flipped || renamingId === id) return;
    if (menuId) {
      setMenuId(null);
      setConfirmDeleteId(null);
      return;
    }
    if (id === activeChapterId) {
      leave(id);
    } else {
      leave(id, () => onSelectChapter(id));
    }
  };

  const handleObject = (id: DeskObjectId) => {
    if (id === "outline") {
      // The outline isn't a place — it's the manuscript seen from its
      // skeleton side. Turn the sheets over.
      if (flipped) flushOutlineSaves();
      setFlipped((v) => !v);
      return;
    }
    const actions: Record<Exclude<DeskObjectId, "outline">, () => void> = {
      bible: onOpenBible,
      details: onOpenDetails,
      publish: onOpenPublish,
    };
    leave(null, actions[id]);
  };

  const startRename = (c: DeskChapter) => {
    setMenuId(null);
    setConfirmDeleteId(null);
    setRenamingId(c.id);
    setRenameDraft(c.title || "");
  };

  const commitRename = () => {
    if (!renamingId) return;
    const title = renameDraft.trim();
    const current = chapters.find((c) => c.id === renamingId);
    if (title && current && title !== current.title) {
      onRenameChapter(renamingId, title);
    }
    setRenamingId(null);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] overflow-y-auto"
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      role="dialog"
      aria-modal="true"
      aria-label="The desk — chapters overview"
    >
      {/* Backdrop fades on its own so the root never "enters" — a root
          entrance animation makes framer skip the shared-layout
          promotion of the page sheet into its card. */}
      <motion.div
        className="pointer-events-none fixed inset-0 bg-void/95 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.25 } }}
        aria-hidden
      />
      {/* lamp glow */}
      <div
        className="pointer-events-none fixed left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-amber/[0.07] blur-[130px]"
        aria-hidden
      />

      <div className="relative flex min-h-full flex-col items-center px-6 pb-24 pt-16">
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
              layout={!(morphEnabled && c.id === morphId)}
              layoutId={morphEnabled && c.id === morphId ? "page-sheet" : undefined}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              data-desk-card={c.id}
              initial={
                morphEnabled && c.id === morphId ? false : { opacity: 0, y: 12 }
              }
              animate={
                morphEnabled && c.id === morphId
                  ? undefined
                  : { opacity: 1, y: 0, transition: { delay: 0.06 + i * 0.03 } }
              }
              whileHover={
                flipped || menuId || renamingId
                  ? undefined
                  : { y: -6, rotate: i % 2 ? 0.6 : -0.6 }
              }
              className={`group/sheet relative ${menuId === c.id ? "z-30" : ""}`}
              style={{ perspective: 1200 }}
            >
              <motion.div
                className="relative h-full"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 28,
                  delay: i * 0.05,
                }}
              >
              <div
                role="button"
                tabIndex={flipped ? -1 : 0}
                onClick={() => handleCardClick(c.id)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && renamingId !== c.id) {
                    e.preventDefault();
                    handleCardClick(c.id);
                  }
                }}
                aria-label={`Open ${c.title || "Untitled"}`}
                aria-hidden={flipped}
                className={`flex h-full w-44 cursor-pointer flex-col rounded-2xl border bg-ink p-4 text-left shadow-[0_16px_48px_rgba(0,0,0,0.4)] transition-colors ${
                  c.id === activeChapterId
                    ? "border-amber/30"
                    : "border-border hover:border-border-active"
                }`}
                style={{ backfaceVisibility: "hidden" }}
              >
                <span className="mb-2 font-mono text-[10px] text-text-ghost">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {renamingId === c.id ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="mb-2.5 w-full rounded-md border border-amber/30 bg-elevated px-1.5 py-0.5 font-display text-[15px] font-semibold leading-snug text-paper outline-none"
                    aria-label={`Rename ${unit.singular.toLowerCase()}`}
                  />
                ) : (
                  <span className="mb-2.5 font-display text-[15px] font-semibold leading-snug text-paper">
                    {c.title || "Untitled"}
                  </span>
                )}
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
              </div>

              {/* the back of the sheet — its outline */}
              <div
                className="absolute inset-0 flex w-44 flex-col rounded-2xl border border-amber/25 bg-ink p-4 shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
                style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                aria-hidden={!flipped}
              >
                <span className="mb-1 font-mono text-[10px] text-text-ghost">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mb-2 truncate font-display text-[12px] font-semibold text-paper/70">
                  {c.title || "Untitled"}
                </span>
                <textarea
                  value={outlineDrafts[c.id] ?? c.outline}
                  onChange={(e) => scheduleOutlineSave(c.id, e.target.value)}
                  onBlur={() => commitOutline(c.id, outlineDrafts[c.id] ?? c.outline)}
                  tabIndex={flipped ? 0 : -1}
                  placeholder={`What happens in this ${unit.singular.toLowerCase()}?`}
                  aria-label={`Outline of ${c.title || "Untitled"}`}
                  className="flex-1 resize-none bg-transparent font-reading text-[11px] leading-[1.7] text-text outline-none placeholder:text-text-ghost/60"
                />
              </div>
              </motion.div>

              {/* sheet tools — versions + manage */}
              {!flipped && (
              <div
                className={`absolute right-2 top-2 flex items-center gap-0.5 transition-opacity ${
                  menuId === c.id ? "opacity-100" : "opacity-0 group-hover/sheet:opacity-100"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    leave(c.id, () => onOpenHistory(c.id));
                  }}
                  className="rounded-md p-1 text-text-ghost transition-colors hover:bg-paper/[0.06] hover:text-paper"
                  title="Versions"
                  aria-label={`Versions of ${c.title || "Untitled"}`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 8v4l2.5 2.5 M3.05 11a9 9 0 1 1 .5 4" />
                    <path d="M3 16v-5h5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(null);
                    setMenuId((v) => (v === c.id ? null : c.id));
                  }}
                  className={`rounded-md p-1 transition-colors hover:bg-paper/[0.06] hover:text-paper ${
                    menuId === c.id ? "text-paper" : "text-text-ghost"
                  }`}
                  title="Manage"
                  aria-label={`Manage ${c.title || "Untitled"}`}
                  aria-expanded={menuId === c.id}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <circle cx="5" cy="12" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="19" cy="12" r="1.6" />
                  </svg>
                </button>
              </div>
              )}

              {/* manage menu */}
              <AnimatePresence>
                {menuId === c.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.1 } }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="absolute right-1 top-9 z-30 w-40 overflow-hidden rounded-xl border border-border bg-elevated py-1 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => startRename(c)}
                      className="block w-full px-3 py-1.5 text-left text-[12px] text-text-secondary transition-colors hover:bg-paper/[0.05] hover:text-paper"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuId(null);
                        leave(c.id, () => onOpenHistory(c.id));
                      }}
                      className="block w-full px-3 py-1.5 text-left text-[12px] text-text-secondary transition-colors hover:bg-paper/[0.05] hover:text-paper"
                    >
                      Versions
                    </button>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => onMoveChapter(c.id, -1)}
                      className="block w-full px-3 py-1.5 text-left text-[12px] text-text-secondary transition-colors hover:bg-paper/[0.05] hover:text-paper disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Move earlier
                    </button>
                    <button
                      type="button"
                      disabled={i === chapters.length - 1}
                      onClick={() => onMoveChapter(c.id, 1)}
                      className="block w-full px-3 py-1.5 text-left text-[12px] text-text-secondary transition-colors hover:bg-paper/[0.05] hover:text-paper disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Move later
                    </button>
                    <div className="my-1 h-px bg-border" aria-hidden />
                    {confirmDeleteId === c.id ? (
                      <button
                        type="button"
                        disabled={chapters.length <= 1}
                        onClick={() => {
                          setMenuId(null);
                          setConfirmDeleteId(null);
                          onDeleteChapter(c.id);
                        }}
                        className="block w-full px-3 py-1.5 text-left text-[12px] font-medium text-rose transition-colors hover:bg-rose/10"
                      >
                        Really delete?
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={chapters.length <= 1}
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="block w-full px-3 py-1.5 text-left text-[12px] text-rose/80 transition-colors hover:bg-rose/10 hover:text-rose disabled:cursor-not-allowed disabled:opacity-35"
                        title={chapters.length <= 1 ? `A story keeps its last ${unit.singular.toLowerCase()}` : undefined}
                      >
                        Delete
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {/* a fresh sheet */}
          <motion.button
            type="button"
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.06 + chapters.length * 0.03 },
            }}
            onClick={() => leave(null, onNewChapter)}
            className="flex min-h-[180px] w-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-text-ghost transition-all hover:-translate-y-1.5 hover:border-amber/30 hover:text-amber"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14 M5 12h14" />
            </svg>
            <span className="text-[12px]">New {unit.singular.toLowerCase()}</span>
          </motion.button>
        </div>

        {/* click-away for the manage menu */}
        {menuId && (
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close menu"
            onClick={() => {
              setMenuId(null);
              setConfirmDeleteId(null);
            }}
          />
        )}

        {/* the other things on the desk */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
        >
          {DESK_OBJECTS.map((o) => {
            const isFlip = o.id === "outline";
            const active = isFlip && flipped;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => handleObject(o.id)}
                aria-pressed={isFlip ? flipped : undefined}
                className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  active
                    ? "border-amber/30 bg-amber/[0.06]"
                    : "border-border bg-surface hover:border-amber/25 hover:bg-amber/[0.04]"
                }`}
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
                  className={`transition-colors ${
                    active ? "text-amber" : "text-text-ghost group-hover:text-amber"
                  }`}
                  aria-hidden
                >
                  <path d={o.icon} />
                </svg>
                <span className="text-left">
                  <span className={`block text-[13px] ${active ? "text-amber" : "text-paper"}`}>
                    {o.label}
                  </span>
                  <span className="block text-[11px] text-text-ghost">
                    {isFlip && flipped ? "turn the sheets back" : o.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.35 } }}
          className="mt-10 text-[11px] text-text-ghost"
        >
          <kbd className="mr-1.5 rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>
          {flipped ? "turn the sheets back" : "back to the page"}
        </motion.p>
      </div>
    </motion.div>
  );
}
