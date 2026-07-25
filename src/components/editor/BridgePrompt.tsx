"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// The bridge, captured on the way out.
//
// Hemingway stopped mid-sentence so he'd know where to start again. The studio
// quotes this note back at the top of the manuscript hero, so re-entry begins
// with "where was I headed" instead of "what was I doing".
//
// It asks once per chapter per session, only when you actually wrote something,
// and only when that chapter has no note yet. Skipping is one key away and is
// never asked again for that chapter this session — a prompt that nags is a
// prompt people learn to dismiss without reading.
// ─────────────────────────────────────────────────────────────────────────────

const askedKey = (chapterId: string) => `quiloria-bridge-asked-${chapterId}`;

export default function BridgePrompt({
  storyId,
  chapterId,
  chapterTitle,
  wordsWritten,
  hasNote,
}: {
  storyId: string;
  chapterId: string | null;
  chapterTitle: string;
  /** words added in this writing session — no writing, no question */
  wordsWritten: number;
  /** the chapter already carries a note; don't ask again */
  hasNote: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Read through a ref so the click listener can stay mounted for the page's
  // life instead of re-binding on every keystroke's word-count change.
  const state = useRef({ chapterId, wordsWritten, hasNote });
  useEffect(() => {
    state.current = { chapterId, wordsWritten, hasNote };
  }, [chapterId, wordsWritten, hasNote]);

  const markAsked = useCallback((id: string) => {
    try {
      sessionStorage.setItem(askedKey(id), "1");
    } catch {}
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const { chapterId: id, wordsWritten: words, hasNote: noted } = state.current;
      if (!id || words <= 0 || noted) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      // Only the way *out*: in-page anchors, new tabs and moves within this
      // story's desk are not leaving.
      if (!href || !href.startsWith("/") || anchor.target === "_blank") return;
      if (href.startsWith(`/write/${storyId}`)) return;

      try {
        if (sessionStorage.getItem(askedKey(id)) === "1") return;
      } catch {
        return;
      }

      e.preventDefault();
      markAsked(id);
      setDraft("");
      setPending(href);
    };

    // Capture phase, so Next's own link handler doesn't navigate first.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [storyId, markAsked]);

  useEffect(() => {
    if (pending) inputRef.current?.focus();
  }, [pending]);

  const go = useCallback(
    (href: string) => {
      setPending(null);
      router.push(href);
    },
    [router],
  );

  const save = useCallback(async () => {
    const href = pending;
    const note = draft.trim();
    const id = state.current.chapterId;
    if (!href) return;
    if (note && id) {
      try {
        await fetch(`/api/stories/${storyId}/chapters/${id}/bridge`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        });
      } catch {
        // Losing the note is better than trapping someone on their way out.
      }
    }
    go(href);
  }, [draft, pending, storyId, go]);

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-void/70 px-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => go(pending)}
          role="dialog"
          aria-modal="true"
          aria-label="Leave a line for tomorrow"
        >
          <motion.div
            className="quill-sheet w-full max-w-md rounded-[6px] bg-paper px-7 py-7 shadow-sheet"
            initial={{ opacity: 0, y: 18, rotate: -1.4 }}
            animate={{ opacity: 1, y: 0, rotate: -0.5 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[9px] uppercase tracking-[0.3em] text-on-gold/45">Before you go — {chapterTitle}</p>
            <p className="mt-2 font-display text-xl italic text-on-gold">Where were you headed?</p>
            <p className="mt-1.5 font-reading text-[13px] leading-relaxed text-on-gold/60">
              One line. Tomorrow-you will find it waiting on the page.
            </p>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void save();
                }
                if (e.key === "Escape") go(pending);
              }}
              rows={2}
              maxLength={400}
              placeholder="She still hasn't opened the second letter…"
              className="mt-5 w-full resize-none border-0 border-b border-on-gold/25 bg-transparent px-0 py-1 font-reading text-[15px] italic leading-relaxed text-on-gold caret-gold-dark outline-none transition-colors placeholder:not-italic placeholder:text-on-gold/30 focus:border-gold-dark"
            />
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => go(pending)}
                className="text-[12px] text-on-gold/45 transition-colors hover:text-on-gold/75"
              >
                not this time
              </button>
              <button
                onClick={() => void save()}
                disabled={!draft.trim()}
                className="font-display text-[15px] italic text-gold-dark transition-opacity hover:opacity-75 disabled:opacity-30"
              >
                leave the line →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
