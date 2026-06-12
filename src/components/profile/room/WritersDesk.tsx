"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Feather, Pin, Trash2, BookOpen } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";
import { useRoomParallax, ZoneLabel } from "./Room";

interface DeskNote {
  id: string;
  body: string;
  isPinned: boolean;
  editedAt: string | null;
  createdAt: string;
  story: { id: string; title: string; slug: string | null } | null;
}

interface WritersDeskProps {
  userId: string;
  ownerName: string;
  isOwner: boolean;
  /** Ambient stage mode: fewer papers, no expanders — the zone opens instead. */
  compact?: boolean;
  /** Compact mode: where "…N more on the desk" leads (the desk focus). */
  onOpenMore?: () => void;
}

const MAX_NOTE = 500;
const VISIBLE = 4;
const VISIBLE_COMPACT = 2;

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h;
}

/**
 * The desk surface: the writer's notes as sheets of paper, slightly
 * rotated and overlapping, the pinned one squared and sealed. Owners
 * write on a fresh sheet; visitors read what was left out.
 */
export default function WritersDesk({
  userId,
  ownerName,
  isOwner,
  compact = false,
  onOpenMore,
}: WritersDeskProps) {
  const parallax = useRoomParallax(6);
  const [notes, setNotes] = useState<DeskNote[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/notes?limit=30`);
      if (!res.ok) return;
      const json = await res.json();
      setNotes(json.data.notes ?? []);
    } catch {}
  }, [userId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const postNote = useCallback(async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/users/${userId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (res.ok) {
        setDraft("");
        setComposing(false);
        fetchNotes();
      }
    } finally {
      setPosting(false);
    }
  }, [draft, posting, userId, fetchNotes]);

  const pinNote = useCallback(
    async (note: DeskNote) => {
      await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });
      fetchNotes();
    },
    [fetchNotes]
  );

  const deleteNote = useCallback(
    async (note: DeskNote) => {
      await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      fetchNotes();
    },
    [fetchNotes]
  );

  const list = notes ?? [];
  const limit = compact ? VISIBLE_COMPACT : VISIBLE;
  const visible = showAll && !compact ? list : list.slice(0, limit);
  const hidden = list.length - visible.length;

  return (
    <motion.div style={parallax} className="flex h-full flex-col">
      <ZoneLabel>The desk</ZoneLabel>

      {/* A fresh sheet (owner) */}
      {isOwner && (
        <div className="mb-5">
          {composing ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rotate-[0.4deg] rounded-[3px] border border-amber/25 bg-elevated/75 p-4 shadow-[0_8px_20px_rgba(2,4,9,0.4)]"
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_NOTE))}
                rows={3}
                autoFocus
                placeholder="A note for whoever calls on you…"
                className="w-full resize-none bg-transparent font-reading text-[14px] leading-relaxed text-text outline-none placeholder:italic placeholder:text-text-ghost"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-text-ghost">
                  {draft.length}/{MAX_NOTE}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setComposing(false)}
                    className="rounded-full px-3 py-1 text-[11px] text-text-ghost transition-colors hover:text-text-secondary"
                  >
                    Set it aside
                  </button>
                  <button
                    onClick={postNote}
                    disabled={!draft.trim() || posting}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber px-3.5 py-1 text-[11px] font-semibold text-void transition-all hover:shadow-[0_0_14px_rgba(226,172,74,0.22)] disabled:opacity-40"
                  >
                    <Feather size={11} />
                    {posting ? "Drying…" : "Leave it out"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="w-full rotate-[-0.4deg] rounded-[3px] border border-dashed border-border px-4 py-3 text-left font-reading text-[13px] italic text-text-ghost transition-colors hover:border-amber/30 hover:text-text-secondary"
            >
              + a fresh sheet of paper
            </button>
          )}
        </div>
      )}

      {/* The papers */}
      {notes === null ? null : list.length === 0 ? (
        !isOwner && (
          <p className="font-reading text-[12px] italic text-text-ghost">
            The desk is tidy — {ownerName} has left nothing out today.
          </p>
        )
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((note, i) => {
              const h = hash(note.id);
              const rotate = note.isPinned ? 0 : ((h % 5) - 2) * 0.7; // ±1.4°
              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: Math.min(i * 0.05, 0.25), duration: 0.4 }}
                  style={{ rotate }}
                  className={`group relative rounded-[3px] border p-4 shadow-[0_8px_20px_rgba(2,4,9,0.35)] ${
                    note.isPinned
                      ? "z-10 border-amber/30 bg-elevated/85"
                      : "border-border bg-elevated/65"
                  } ${i > 0 ? "-mt-1.5" : ""}`}
                >
                  {/* Ruled-paper grain */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(0deg,transparent_0_21px,currentColor_21px_22px)]"
                  />
                  {note.isPinned && (
                    <span className="absolute -top-1.5 left-5 h-3 w-3 rounded-full border border-amber/50 bg-amber/30 shadow-[0_0_8px_rgba(226,172,74,0.35)]" />
                  )}

                  <p className="relative whitespace-pre-wrap font-reading text-[14px] leading-relaxed text-text">
                    {note.body}
                  </p>

                  <div className="relative mt-2.5 flex items-center gap-2">
                    {note.story && (
                      <Link
                        href={`/story/${note.story.slug || note.story.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-amber/[0.07] px-2 py-0.5 text-[10px] text-amber transition-colors hover:bg-amber/[0.14]"
                      >
                        <BookOpen size={9} />
                        {note.story.title}
                      </Link>
                    )}
                    <span className="font-mono text-[10px] text-text-ghost">
                      {formatTimeAgo(note.createdAt)}
                      {note.editedAt ? " · amended" : ""}
                    </span>

                    {isOwner && (
                      <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => pinNote(note)}
                          title={note.isPinned ? "Unpin" : "Pin to the desk"}
                          className="rounded p-1 text-text-ghost transition-colors hover:text-amber"
                        >
                          <Pin size={11} />
                        </button>
                        <button
                          onClick={() => deleteNote(note)}
                          title="Crumple it"
                          className="rounded p-1 text-text-ghost transition-colors hover:text-rose"
                        >
                          <Trash2 size={11} />
                        </button>
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {hidden > 0 && compact && (
            <button
              onClick={onOpenMore}
              className="w-full text-center text-[11px] italic text-text-ghost transition-colors hover:text-amber"
            >
              …and {hidden} more on the desk
            </button>
          )}
          {hidden > 0 && !compact && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-center text-[11px] italic text-text-ghost transition-colors hover:text-amber"
            >
              …and {hidden} older {hidden === 1 ? "note" : "notes"} beneath
            </button>
          )}
          {!compact && showAll && list.length > VISIBLE && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full text-center text-[11px] italic text-text-ghost transition-colors hover:text-amber"
            >
              square the stack
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
