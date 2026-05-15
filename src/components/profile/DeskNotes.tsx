"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Pin,
  PinOff,
  Pencil,
  Trash2,
  BookOpen,
  Send,
  X,
  Check,
} from "lucide-react";
import type { ApiStory } from "@/types/api";

const MAX_BODY = 500;

interface NoteStoryRef {
  id: string;
  title: string | null;
  slug: string | null;
}

interface DeskNote {
  id: string;
  body: string;
  isPinned: boolean;
  editedAt: string | null;
  createdAt: string;
  story: NoteStoryRef | null;
}

interface DeskNotesProps {
  userId: string;
  isOwner: boolean;
  ownerName: string;
  ownStories: ApiStory[];
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: new Date(iso).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export default function DeskNotes({
  userId,
  isOwner,
  ownerName,
  ownStories,
}: DeskNotesProps) {
  const [notes, setNotes] = useState<DeskNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${userId}/notes`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setNotes(j.data?.notes ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Hide entirely for non-owners with no notes — empty would be confusing.
  if (!isOwner && loaded && notes.length === 0) return null;
  if (!loaded) return null;

  const publishedStories = ownStories.filter(
    (s) => s.status === "published" && s.isPublic
  );

  async function handleCreate(input: { body: string; storyId: string | null; isPinned: boolean }) {
    const res = await fetch(`/api/users/${userId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return false;
    const j = await res.json();
    const created = j.data?.note;
    if (!created) return false;

    const optimistic: DeskNote = {
      id: created.id,
      body: created.body,
      isPinned: created.isPinned,
      editedAt: created.editedAt,
      createdAt: created.createdAt,
      story: created.storyId
        ? {
            id: created.storyId,
            title:
              publishedStories.find((s) => s.id === created.storyId)?.title ?? null,
            slug:
              publishedStories.find((s) => s.id === created.storyId)?.slug ?? null,
          }
        : null,
    };
    setNotes((prev) => sortNotes([optimistic, ...maybeUnpinOthers(prev, optimistic)]));
    setComposerOpen(false);
    return true;
  }

  async function handleUpdate(
    id: string,
    input: { body: string; storyId: string | null; isPinned?: boolean }
  ) {
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return false;
    const j = await res.json();
    const updated = j.data?.note;
    if (!updated) return false;

    setNotes((prev) =>
      sortNotes(
        maybeUnpinOthers(
          prev.map((n) =>
            n.id === id
              ? {
                  ...n,
                  body: updated.body,
                  isPinned: updated.isPinned,
                  editedAt: updated.editedAt,
                  story: updated.storyId
                    ? {
                        id: updated.storyId,
                        title:
                          publishedStories.find((s) => s.id === updated.storyId)?.title ?? null,
                        slug:
                          publishedStories.find((s) => s.id === updated.storyId)?.slug ?? null,
                      }
                    : null,
                }
              : n
          ),
          { id, isPinned: updated.isPinned }
        )
      )
    );
    setEditingId(null);
    return true;
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleTogglePin(note: DeskNote) {
    await handleUpdate(note.id, {
      body: note.body,
      storyId: note.story?.id ?? null,
      isPinned: !note.isPinned,
    });
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto mt-8 max-w-5xl px-5 lg:px-8"
    >
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber">
            From the desk
          </p>
          <h2 className="mt-1 font-display text-xl text-paper sm:text-2xl">
            {isOwner ? "Your notes" : `Notes from ${ownerName}`}
          </h2>
        </div>
        {isOwner && !composerOpen && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/[0.08] px-3 py-1.5 text-[11px] text-amber transition-colors hover:bg-amber/[0.15]"
          >
            <Pencil size={11} />
            Write a note
          </button>
        )}
      </div>

      {/* Composer */}
      <AnimatePresence>
        {isOwner && composerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-3 overflow-hidden"
          >
            <NoteComposer
              stories={publishedStories}
              onSubmit={handleCreate}
              onCancel={() => setComposerOpen(false)}
              submitLabel="Pin to the desk"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state for owner */}
      {isOwner && notes.length === 0 && !composerOpen && (
        <div className="rounded-2xl border border-dashed border-border bg-elevated/30 p-8 text-center">
          <p className="font-reading text-[14px] italic text-text-secondary">
            The desk is quiet. Leave a note for those who pass through.
          </p>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-amber transition-colors hover:text-amber-light"
          >
            Write your first note
          </button>
        </div>
      )}

      {/* Notes feed */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              {editingId === note.id ? (
                <NoteComposer
                  stories={publishedStories}
                  initialBody={note.body}
                  initialStoryId={note.story?.id ?? null}
                  onSubmit={(input) =>
                    handleUpdate(note.id, {
                      body: input.body,
                      storyId: input.storyId,
                    })
                  }
                  onCancel={() => setEditingId(null)}
                  submitLabel="Save changes"
                />
              ) : (
                <NoteCard
                  note={note}
                  isOwner={isOwner}
                  onEdit={() => setEditingId(note.id)}
                  onDelete={() => handleDelete(note.id)}
                  onTogglePin={() => handleTogglePin(note)}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function sortNotes(list: DeskNote[]): DeskNote[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function maybeUnpinOthers(
  list: DeskNote[],
  newPin: { id: string; isPinned: boolean }
): DeskNote[] {
  if (!newPin.isPinned) return list;
  return list.map((n) =>
    n.id !== newPin.id && n.isPinned ? { ...n, isPinned: false } : n
  );
}

interface NoteCardProps {
  note: DeskNote;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

function NoteCard({ note, isOwner, onEdit, onDelete, onTogglePin }: NoteCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-colors ${
        note.isPinned
          ? "border-amber/30 bg-amber/[0.04]"
          : "border-border bg-surface/82"
      }`}
    >
      {note.isPinned && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" aria-hidden />
      )}

      <div className="flex gap-4 p-5 sm:gap-5 sm:p-6">
        {/* Left margin: pin or quill mark */}
        <div className="flex flex-col items-center pt-1">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full border ${
              note.isPinned
                ? "border-amber/30 bg-amber/[0.08] text-amber"
                : "border-border bg-elevated/50 text-text-ghost"
            }`}
            aria-hidden
          >
            {note.isPinned ? <Pin size={12} /> : <span className="text-[13px]">❋</span>}
          </span>
          {note.isPinned && (
            <span className="mt-1 hidden text-[9px] uppercase tracking-wider text-amber sm:block">
              Pinned
            </span>
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap font-reading text-[15px] leading-relaxed text-paper">
            {note.body}
          </p>

          {note.story && note.story.title && (
            <Link
              href={`/story/${note.story.slug || note.story.id}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated/50 px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
            >
              <BookOpen size={11} />
              {note.story.title}
            </Link>
          )}

          <div className="mt-3 flex items-center gap-2 text-[11px] text-text-ghost">
            <time dateTime={note.createdAt}>{formatRelative(note.createdAt)}</time>
            {note.editedAt && (
              <>
                <span aria-hidden>·</span>
                <span className="italic">edited</span>
              </>
            )}
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={onTogglePin}
              title={note.isPinned ? "Unpin" : "Pin to top"}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-ghost transition-colors hover:bg-elevated/60 hover:text-amber"
            >
              {note.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
            <button
              type="button"
              onClick={onEdit}
              title="Edit"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-ghost transition-colors hover:bg-elevated/60 hover:text-paper"
            >
              <Pencil size={13} />
            </button>
            {confirmDelete ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onDelete}
                  title="Confirm delete"
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-rose/15 text-rose transition-colors hover:bg-rose/25"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  title="Cancel"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-ghost hover:bg-elevated/60"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Delete"
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-ghost transition-colors hover:bg-elevated/60 hover:text-rose"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

interface NoteComposerProps {
  stories: ApiStory[];
  initialBody?: string;
  initialStoryId?: string | null;
  onSubmit: (input: {
    body: string;
    storyId: string | null;
    isPinned: boolean;
  }) => Promise<boolean>;
  onCancel: () => void;
  submitLabel: string;
}

function NoteComposer({
  stories,
  initialBody = "",
  initialStoryId = null,
  onSubmit,
  onCancel,
  submitLabel,
}: NoteComposerProps) {
  const [body, setBody] = useState(initialBody);
  const [storyId, setStoryId] = useState<string | null>(initialStoryId);
  const [pin, setPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const remaining = MAX_BODY - body.length;
  const trimmed = body.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_BODY && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit({ body: trimmed, storyId, isPinned: pin });
    setSubmitting(false);
    if (!ok) {
      // leave the form open so user can try again
    }
  }

  return (
    <div className="rounded-2xl border border-amber/25 bg-surface/82 p-4 shadow-[var(--t-shadow-card)] backdrop-blur-xl sm:p-5">
      <textarea
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="A line from your desk… What you're writing today, a quote that won't leave you, a small announcement."
        rows={4}
        maxLength={MAX_BODY + 50}
        className="w-full resize-none rounded-lg border border-border bg-void/40 px-3 py-2.5 font-reading text-[15px] leading-relaxed text-paper placeholder:text-text-ghost focus:border-amber/40 focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {stories.length > 0 && (
            <select
              value={storyId ?? ""}
              onChange={(e) => setStoryId(e.target.value || null)}
              className="rounded-full border border-border bg-elevated/60 px-3 py-1.5 text-[11px] text-text-secondary focus:border-amber/40 focus:outline-none"
            >
              <option value="">No story attached</option>
              {stories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || "Untitled"}
                </option>
              ))}
            </select>
          )}
          {!initialBody && (
            <label className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated/60 px-3 py-1.5 text-[11px] text-text-secondary">
              <input
                type="checkbox"
                checked={pin}
                onChange={(e) => setPin(e.target.checked)}
                className="h-3 w-3 accent-amber"
              />
              Pin to top
            </label>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-[11px] ${
              remaining < 0
                ? "text-rose"
                : remaining < 60
                  ? "text-amber"
                  : "text-text-ghost"
            }`}
          >
            {remaining}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-3 py-1.5 text-[12px] text-text-secondary transition-colors hover:text-paper"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber px-4 py-1.5 text-[12px] font-semibold text-void transition-colors hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={11} />
            {submitting ? "…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
