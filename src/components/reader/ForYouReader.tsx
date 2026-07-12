"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { sanitizeHtmlClient } from "@/lib/sanitize-client";

/**
 * For You Reader — the candlelit room.
 *
 * Full-bleed chapter, five gestures, between-chapters moment, zero decisions.
 * Spec: docs/FOR_YOU_READER.md.
 */

// ── Types ─────────────────────────────────────────────────────

type Reason =
  | "resume"
  | "new-chapter"
  | "sparked-author"
  | "staff-pick"
  | "new-voice"
  | "genre-match"
  | "exploration";

interface QueueItem {
  storyId: string;
  chapterId: string;
  startOffset: number;
  reason: Reason;
  story: {
    title: string;
    slug: string | null;
    synopsis: string | null;
    coverImageUrl: string | null;
    format: string;
    authorName: string | null;
    authorAvatar: string | null;
  };
}

interface ChapterContent {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  sortOrder: number;
  authorNoteBefore: string | null;
  authorNoteAfter: string | null;
}

interface SiblingChapter {
  id: string;
  title: string;
  sortOrder: number;
  status: string;
}

const REASON_COPY: Record<Reason, string> = {
  resume: "Picking up",
  "new-chapter": "New chapter",
  "sparked-author": "You sparked their work",
  "staff-pick": "Staff pick",
  "new-voice": "New voice",
  "genre-match": "Your kind of thing",
  exploration: "Something different",
};

const SESSION_EXCLUDES_KEY = "quiloria-fyr-excludes";
const READING_SPEED_WPM = 230;

function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / READING_SPEED_WPM));
}

function loadSessionExcludes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_EXCLUDES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveSessionExcludes(ids: string[]) {
  try {
    sessionStorage.setItem(SESSION_EXCLUDES_KEY, JSON.stringify(ids));
  } catch {}
}

// ── Component ─────────────────────────────────────────────────

export default function ForYouReader({
  mode,
}: {
  mode: "personalized" | "demo";
}) {
  const { data: session } = useSession();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [chapterCache, setChapterCache] = useState<
    Record<string, ChapterContent>
  >({});
  const [siblingCache, setSiblingCache] = useState<
    Record<string, SiblingChapter[]>
  >({});
  const [scrollPercent, setScrollPercent] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showBetween, setShowBetween] = useState(false);
  const [storyEnded, setStoryEnded] = useState(false);
  const [finishedCelebration, setFinishedCelebration] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);

  const readerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const excludesRef = useRef<string[]>([]);
  const lastProgressSaveRef = useRef<number>(0);

  // ── Queue fetching ─────────────────────────────────────────

  const fetchQueue = useCallback(
    async (append: boolean) => {
      const excludes = excludesRef.current;
      const endpoint =
        mode === "demo"
          ? "/api/read/demo"
          : `/api/read/queue${
              excludes.length ? `?exclude=${excludes.join(",")}` : ""
            }`;
      try {
        const res = await fetch(endpoint);
        const json = await res.json();
        const next: QueueItem[] = json?.data?.queue ?? [];
        setQueue((prev) => {
          if (!append) return next;
          // De-dupe against what's already queued
          const seen = new Set(prev.map((q) => q.storyId));
          return [...prev, ...next.filter((q) => !seen.has(q.storyId))];
        });
      } catch {
        if (!append) setQueue([]);
      } finally {
        setLoadingQueue(false);
      }
    },
    [mode],
  );

  useEffect(() => {
    excludesRef.current = loadSessionExcludes();
    fetchQueue(false);
  }, [fetchQueue]);

  // ── Chapter prefetch ───────────────────────────────────────

  const fetchChapter = useCallback(
    async (storyId: string, chapterId: string) => {
      const key = `${storyId}:${chapterId}`;
      if (chapterCache[key]) return chapterCache[key];
      try {
        const res = await fetch(
          `/api/stories/${storyId}/chapters/${chapterId}`,
        );
        if (!res.ok) return null;
        const json = await res.json();
        const ch: ChapterContent = json.data;
        setChapterCache((prev) => {
          // Cap in-memory at 3 chapters (LRU by insertion order)
          const entries = Object.entries(prev);
          const trimmed =
            entries.length >= 3 ? Object.fromEntries(entries.slice(-2)) : prev;
          return { ...trimmed, [key]: ch };
        });
        return ch;
      } catch {
        return null;
      }
    },
    [chapterCache],
  );

  const fetchSiblings = useCallback(
    async (storyId: string) => {
      if (siblingCache[storyId]) return siblingCache[storyId];
      try {
        const res = await fetch(`/api/stories/${storyId}`);
        if (!res.ok) return [];
        const json = await res.json();
        const chs: SiblingChapter[] = (json.data?.chapters ?? [])
          .filter((c: SiblingChapter) => c.status === "published")
          .sort(
            (a: SiblingChapter, b: SiblingChapter) => a.sortOrder - b.sortOrder,
          );
        setSiblingCache((prev) => ({ ...prev, [storyId]: chs }));
        return chs;
      } catch {
        return [];
      }
    },
    [siblingCache],
  );

  const current = queue[cursor];
  const currentChapter = current
    ? chapterCache[`${current.storyId}:${current.chapterId}`]
    : null;
  const currentSiblings = current
    ? siblingCache[current.storyId] ?? []
    : [];

  // Prefetch current + next chapter content and siblings
  useEffect(() => {
    if (!current) return;
    fetchChapter(current.storyId, current.chapterId);
    fetchSiblings(current.storyId);
    // Pre-fetch next queue item's chapter on idle
    const nextItem = queue[cursor + 1];
    if (nextItem) {
      const idle =
        typeof window !== "undefined" &&
        "requestIdleCallback" in window
          ? (window as unknown as {
              requestIdleCallback: (cb: () => void) => number;
            }).requestIdleCallback
          : (cb: () => void) => setTimeout(cb, 300);
      idle(() => fetchChapter(nextItem.storyId, nextItem.chapterId));
    }
    // Refetch queue when we're running low
    if (queue.length - cursor <= 3 && !loadingQueue && mode === "personalized") {
      fetchQueue(true);
    }
  }, [
    current,
    cursor,
    queue,
    fetchChapter,
    fetchSiblings,
    fetchQueue,
    loadingQueue,
    mode,
  ]);

  // Mount-in fade
  useEffect(() => {
    if (currentChapter && !mounted) setMounted(true);
  }, [currentChapter, mounted]);

  // Restore scroll offset when chapter loads
  useEffect(() => {
    if (!currentChapter || !readerRef.current || !current) return;
    const target =
      current.startOffset > 0
        ? (current.startOffset / 100) *
          (readerRef.current.scrollHeight - readerRef.current.clientHeight)
        : 0;
    readerRef.current.scrollTo({ top: target, behavior: "auto" });
    setScrollPercent(current.startOffset);
    setAtEnd(false);
    setShowBetween(false);
    setStoryEnded(false);
    setFinishedCelebration(false);
    setDonationOpen(false);
  }, [currentChapter, current]);

  // ── Progress save (debounced) ──────────────────────────────

  const saveProgress = useCallback(
    (percent: number, pageNumber = 1) => {
      if (mode !== "personalized" || !session?.user?.id || !current) return;
      const now = Date.now();
      if (now - lastProgressSaveRef.current < 5000) return;
      lastProgressSaveRef.current = now;
      fetch("/api/reading-progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: current.storyId,
          chapterId: current.chapterId,
          scrollPercent: Math.round(percent),
          pageNumber,
        }),
      }).catch(() => {});
    },
    [mode, session?.user?.id, current],
  );

  // Scroll handler: track percentage, detect end
  const handleScroll = useCallback(() => {
    const el = readerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max <= 0 ? 100 : (el.scrollTop / max) * 100;
    setScrollPercent(pct);
    if (pct >= 95 && !atEnd) {
      setAtEnd(true);
      saveProgress(100);
    } else if (pct < 95 && atEnd) {
      setAtEnd(false);
    }
    if (pct > 5 && pct < 95) saveProgress(pct);
  }, [atEnd, saveProgress]);

  // ── Navigation between queue items ─────────────────────────

  const advanceTo = useCallback(
    (nextCursor: number) => {
      if (nextCursor >= queue.length) {
        if (mode === "personalized") {
          // Try a refetch; if still empty, will render empty state
          fetchQueue(true).then(() => setCursor(nextCursor));
        } else {
          // Demo mode: loop
          setCursor(0);
        }
        return;
      }
      setCursor(nextCursor);
    },
    [queue.length, fetchQueue, mode],
  );

  const dismissCurrent = useCallback(() => {
    if (!current) return;
    excludesRef.current = [...excludesRef.current, current.storyId].slice(-50);
    saveSessionExcludes(excludesRef.current);
    advanceTo(cursor + 1);
  }, [current, cursor, advanceTo]);

  const saveAndNext = useCallback(async () => {
    if (!current) return;
    if (mode === "personalized" && session?.user?.id) {
      try {
        await fetch(`/api/stories/${current.storyId}/follows`, {
          method: "POST",
        });
      } catch {}
    }
    advanceTo(cursor + 1);
  }, [current, cursor, advanceTo, mode, session?.user?.id]);

  const sparkCurrent = useCallback(async () => {
    if (!current || mode !== "personalized" || !session?.user?.id) return;
    try {
      await fetch(`/api/stories/${current.storyId}/sparks`, { method: "POST" });
    } catch {}
  }, [current, mode, session?.user?.id]);

  // ── Next chapter within the same story ─────────────────────

  const activeChapterIndex = currentSiblings.findIndex(
    (c) => c.id === current?.chapterId,
  );
  const hasNextChapter =
    activeChapterIndex >= 0 && activeChapterIndex < currentSiblings.length - 1;
  const nextChapter = hasNextChapter
    ? currentSiblings[activeChapterIndex + 1]
    : null;

  const continueToNextChapter = useCallback(async () => {
    if (!current || !nextChapter) return;
    // Fetch content first so the swap is instant
    await fetchChapter(current.storyId, nextChapter.id);
    // Mutate the queue item in place to point at the new chapter
    setQueue((prev) =>
      prev.map((q, i) =>
        i === cursor
          ? { ...q, chapterId: nextChapter.id, startOffset: 0, reason: "resume" }
          : q,
      ),
    );
  }, [current, nextChapter, fetchChapter, cursor]);

  // When atEnd fires, either reveal the next-chapter card or the Finished moment
  useEffect(() => {
    if (!atEnd) return;
    if (hasNextChapter) {
      setShowBetween(true);
    } else {
      setStoryEnded(true);
      setFinishedCelebration(true);
      const t = setTimeout(() => {
        setFinishedCelebration(false);
        setDonationOpen(true);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [atEnd, hasNextChapter]);

  // ── Gesture handling ───────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const dt = Date.now() - start.t;

      // Tap detection for spark (double-tap)
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 250) {
        const now = Date.now();
        const last = lastTapRef.current;
        if (
          last &&
          now - last.t < 350 &&
          Math.abs(t.clientX - last.x) < 40 &&
          Math.abs(t.clientY - last.y) < 40
        ) {
          sparkCurrent();
          lastTapRef.current = null;
          return;
        }
        lastTapRef.current = { t: now, x: t.clientX, y: t.clientY };
        return;
      }

      // Horizontal swipe (must clearly beat vertical)
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) dismissCurrent();
        else saveAndNext();
      }
    },
    [dismissCurrent, saveAndNext, sparkCurrent],
  );

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      const el = readerRef.current;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        dismissCurrent();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        saveAndNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        el?.scrollBy({ top: -el.clientHeight * 0.85, behavior: "smooth" });
      } else if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        if (showBetween && nextChapter) continueToNextChapter();
        else el?.scrollBy({ top: el.clientHeight * 0.85, behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissCurrent, saveAndNext, continueToNextChapter, showBetween, nextChapter]);

  // ── Render ─────────────────────────────────────────────────

  const bgCover = current?.story.coverImageUrl ?? null;

  const reasonTag = current ? REASON_COPY[current.reason] : "";

  // Loading first chapter
  if (loadingQueue && queue.length === 0) {
    return (
      <div className="reader-foryou-shell fixed inset-0 bg-void flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-text-ghost text-[12px] tracking-[0.3em] uppercase"
        >
          lighting the lamp…
        </motion.div>
      </div>
    );
  }

  // Empty queue — terse mood
  if (!loadingQueue && queue.length === 0) {
    return (
      <div className="reader-foryou-shell fixed inset-0 bg-void flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="text-center flex flex-col items-center gap-4"
        >
          <p className="font-display text-paper text-xl">
            No stories left tonight.
          </p>
          <Link
            href="/browse"
            className="text-text-ghost hover:text-gold transition-colors text-[12px] tracking-wide"
          >
            Browse the archive
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="reader-foryou-shell fixed top-14 left-0 right-0 bottom-0 bg-void overflow-hidden select-text"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Ambient cover background */}
      <AnimatePresence mode="wait">
        {bgCover && (
          <motion.div
            key={`bg-${current?.storyId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="reader-foryou-cover absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${bgCover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(40px) saturate(0.6)",
            }}
          />
        )}
      </AnimatePresence>
      {/* Candlelight vignette */}
      <div className="reader-foryou-vignette absolute inset-0 pointer-events-none" />

      {/* Top-left: dimmed title chip */}
      <AnimatePresence>
        {current && (
          <motion.div
            key={`chip-${current.storyId}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 0.82, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="absolute top-5 left-6 z-10 max-w-xs"
          >
            <Link
              href={
                current.story.slug
                  ? `/story/${current.story.slug}`
                  : `/story/${current.storyId}`
              }
              className="group block"
            >
              <p className="font-display text-paper text-[15px] leading-tight truncate group-hover:text-gold transition-colors">
                {current.story.title}
              </p>
              {current.story.authorName && (
                <p className="text-text-ghost text-[11px] mt-0.5 truncate">
                  by {current.story.authorName}
                </p>
              )}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right: ambient reason indicator */}
      <AnimatePresence>
        {reasonTag && (
          <motion.div
            key={`reason-${current?.storyId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.72 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="absolute top-5 right-6 z-10 font-display text-text-ghost text-[11px] italic tracking-wide"
          >
            {reasonTag}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter content */}
      <div
        ref={readerRef}
        onScroll={handleScroll}
        className="reader-foryou-scroll relative h-full w-full overflow-y-auto scroll-smooth"
      >
        <div className="reader-foryou-stage min-h-full flex flex-col items-center px-6 pt-16 pb-32">
          <AnimatePresence mode="wait">
            {currentChapter ? (
              <motion.article
                key={`${current?.storyId}:${current?.chapterId}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="reader-foryou-article max-w-[680px] w-full"
              >
                <h1 className="font-display text-paper text-3xl md:text-4xl mb-2 tracking-tight">
                  {currentChapter.title}
                </h1>
                <p className="text-text-ghost text-[11px] tracking-wide mb-10">
                  {readingMinutes(currentChapter.wordCount)} min ·{" "}
                  {currentChapter.wordCount.toLocaleString()} words
                </p>
                {currentChapter.authorNoteBefore && (
                  <div className="text-text-ghost text-[13px] italic mb-8 border-l border-border pl-4">
                    {currentChapter.authorNoteBefore}
                  </div>
                )}
                <div
                  className="novel-reader text-text text-[1.1rem] leading-[1.85] font-serif"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtmlClient(currentChapter.content),
                  }}
                />
                {currentChapter.authorNoteAfter && (
                  <div className="text-text-ghost text-[13px] italic mt-10 border-l border-border pl-4">
                    {currentChapter.authorNoteAfter}
                  </div>
                )}
                <div className="h-32" />
              </motion.article>
            ) : (
              <motion.div
                key="loading-chapter"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-text-ghost text-[12px] tracking-[0.3em] uppercase mt-40"
              >
                turning the page…
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Ambient progress line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-gold/30 via-gold/60 to-gold/30 transition-[width] duration-200"
        style={{ width: `${scrollPercent}%` }}
      />

      {/* Between-chapters card */}
      <AnimatePresence>
        {showBetween && nextChapter && !storyEnded && (
          <motion.div
            key="between"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-void/85 backdrop-blur-sm"
          >
            <div className="max-w-md text-center px-8">
              {bgCover && (
                <div
                  className="w-32 h-48 mx-auto mb-6 rounded-sm shadow-2xl bg-cover bg-center"
                  style={{ backgroundImage: `url(${bgCover})` }}
                />
              )}
              <p className="text-text-ghost text-[11px] tracking-[0.3em] uppercase mb-3">
                Next chapter
              </p>
              <h2 className="font-display text-paper text-2xl mb-2">
                {nextChapter.title}
              </h2>
              <p className="text-text-ghost text-[12px] mb-8">
                from {current?.story.title}
              </p>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={continueToNextChapter}
                  className="px-6 py-2.5 border border-gold/30 text-gold hover:bg-gold/10 rounded-sm font-display text-[14px] tracking-wide transition-all"
                >
                  Continue
                </button>
                <button
                  onClick={saveAndNext}
                  className="text-text-ghost hover:text-paper text-[12px] tracking-wide transition-colors"
                >
                  Save &amp; next story →
                </button>
              </div>
              <p className="text-text-ghost text-[10px] tracking-wide mt-8 opacity-60">
                ← dismiss · → save · ↓ continue
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finished moment */}
      <AnimatePresence>
        {finishedCelebration && current && (
          <motion.div
            key="finished"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{
              backgroundImage: bgCover ? `url(${bgCover})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-void/80" />
            <div className="relative text-center">
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.1em" }}
                animate={{ opacity: 1, letterSpacing: "0.4em" }}
                transition={{ duration: 1.2 }}
                className="font-display text-paper text-4xl md:text-6xl uppercase"
              >
                Finished
              </motion.p>
              <p className="font-display text-text-secondary text-lg mt-4">
                {current.story.title}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Donation sheet (pre-primed after Finished) */}
      <AnimatePresence>
        {donationOpen && current && storyEnded && (
          <DonationSheet
            key="donation"
            storyId={current.storyId}
            storyTitle={current.story.title}
            authorName={current.story.authorName ?? "the author"}
            onClose={() => {
              setDonationOpen(false);
              advanceTo(cursor + 1);
            }}
          />
        )}
      </AnimatePresence>

      {/* Desktop gesture hint cluster (discoverability) */}
      <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 gap-6 text-text-ghost text-[10px] tracking-[0.2em] uppercase opacity-40 pointer-events-none">
        <span>← next story</span>
        <span>↓ page</span>
        <span>→ save</span>
      </div>
    </div>
  );
}

// ── Inline donation sheet ─────────────────────────────────────

function DonationSheet({
  storyId,
  storyTitle,
  authorName,
  onClose,
}: {
  storyId: string;
  storyTitle: string;
  authorName: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(25);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, message }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Something went wrong");
        setSending(false);
        return;
      }
      setSent(true);
      setTimeout(onClose, 1600);
    } catch {
      setError("Network error");
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-40 flex items-end md:items-center justify-center bg-void/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-elevated border border-border rounded-t-2xl md:rounded-lg p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div className="text-center py-4">
            <p className="font-display text-gold text-xl mb-2">Gift sent.</p>
            <p className="text-text-ghost text-[13px]">
              {amount} drops to {authorName}
            </p>
          </div>
        ) : (
          <>
            <p className="text-text-ghost text-[11px] tracking-[0.25em] uppercase mb-2">
              Leave a gift
            </p>
            <h3 className="font-display text-paper text-xl mb-1">
              {storyTitle}
            </h3>
            <p className="text-text-secondary text-[13px] mb-6">
              Send Ink Drops to {authorName}
            </p>
            <div className="flex gap-2 mb-4">
              {[10, 25, 50, 100, 250].map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={`flex-1 py-2 rounded-sm border text-[13px] transition-all ${
                    amount === a
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-border text-text-secondary hover:text-paper"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 300))}
              placeholder="A note (optional)…"
              className="w-full bg-void border border-border rounded-sm px-3 py-2 text-[13px] text-text placeholder:text-text-ghost/60 outline-none focus:border-gold/40 resize-none"
              rows={2}
            />
            {error && (
              <p className="text-rose text-[12px] mt-2">{error}</p>
            )}
            <div className="flex items-center justify-between mt-5">
              <button
                onClick={onClose}
                className="text-text-ghost hover:text-paper text-[12px] tracking-wide"
              >
                Maybe later
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="px-5 py-2 border border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold rounded-sm font-display text-[13px] tracking-wide disabled:opacity-50 transition-all"
              >
                {sending ? "Sending…" : `Send ${amount} drops`}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
