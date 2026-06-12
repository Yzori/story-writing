"use client";

/**
 * The Codex — the Story Bible as a full-screen place.
 *
 * Reached from the desk (or ⌘⇧L / the Grimoire). Worldbuilding is real
 * work, not a 360px sidebar: the codex gives every character, place and
 * note a full page — portrait, aliases, tags, a description with room
 * to breathe, and the chapters it appears in. Esc walks back to the
 * desk.
 *
 * Same data contract as the old StoryBiblePanel (POST/PATCH/DELETE on
 * /api/stories/[storyId]/bible, details JSON column), so the two can
 * coexist until the modes die. One deliberate improvement: pending
 * debounced PATCHes are flushed on unmount, not cancelled.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  StoryBible,
  StoryCharacter,
  StoryPlace,
  StoryNote,
} from "@/types/editor";
import { compressImage } from "@/client/images";

type EntryKind = "character" | "place" | "note";
type Selection = { kind: EntryKind; id: string } | null;

interface BibleCodexProps {
  bible: StoryBible;
  storyId: string;
  storyTitle: string;
  chapters: Array<{ id: string; title: string; content: string }>;
  onUpdate: (bible: StoryBible) => void;
  onBack: () => void;
}

function encodeCharacterDetails(char: Partial<StoryCharacter>) {
  return JSON.stringify({
    aliases: char.aliases ?? [],
    color: char.color ?? "#D4A574",
    tags: char.tags ?? [],
    imageDataUrl: char.imageDataUrl ?? null,
  });
}

function encodePlaceDetails(place: Partial<StoryPlace>) {
  return JSON.stringify({
    tags: place.tags ?? [],
    imageDataUrl: place.imageDataUrl ?? null,
  });
}

function encodeNoteDetails(note: Partial<StoryNote>) {
  return JSON.stringify({
    category: note.category ?? "custom",
    tags: note.tags ?? [],
  });
}

const CHARACTER_COLORS = [
  "#D4A574", "#C98A8A", "#9DB89D", "#A99BC4",
  "#7FAFAF", "#B07A9E", "#C4915C", "#8A9BB8",
];

const NOTE_CATEGORIES: Array<{ key: StoryNote["category"]; label: string }> = [
  { key: "lore", label: "Lore" },
  { key: "timeline", label: "Timeline" },
  { key: "research", label: "Research" },
  { key: "custom", label: "Notes" },
];

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function BibleCodex({
  bible,
  storyId,
  storyTitle,
  chapters,
  onUpdate,
  onBack,
}: BibleCodexProps) {
  const [selected, setSelected] = useState<Selection>(() => {
    if (bible.characters[0]) return { kind: "character", id: bible.characters[0].id };
    if (bible.places[0]) return { kind: "place", id: bible.places[0].id };
    if (bible.notes[0]) return { kind: "note", id: bible.notes[0].id };
    return null;
  });
  const [search, setSearch] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // The just-created entry: its name field takes focus, pre-selected,
  // so "create → type the name" is one motion.
  const [freshId, setFreshId] = useState<string | null>(null);

  // ── Debounced PATCH, flushed (not cancelled) on unmount ────
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingBodies = useRef<Map<string, Record<string, unknown>>>(new Map());

  const sendPatch = useCallback(
    (entryId: string, body: Record<string, unknown>) => {
      fetch(`/api/stories/${storyId}/bible/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    },
    [storyId]
  );

  const debouncedPatch = useCallback(
    (entryId: string, body: Record<string, unknown>) => {
      pendingBodies.current.set(entryId, body);
      const existing = patchTimers.current.get(entryId);
      if (existing) clearTimeout(existing);
      patchTimers.current.set(
        entryId,
        setTimeout(() => {
          patchTimers.current.delete(entryId);
          pendingBodies.current.delete(entryId);
          sendPatch(entryId, body);
        }, 800)
      );
    },
    [sendPatch]
  );

  useEffect(() => {
    const timers = patchTimers.current;
    const pending = pendingBodies.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      for (const [id, body] of pending) sendPatch(id, body);
      timers.clear();
      pending.clear();
    };
  }, [sendPatch]);

  // ── Esc walks back to the desk (blur fields first) ─────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.blur();
        return;
      }
      onBack();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onBack]);

  useEffect(() => setConfirmingDelete(false), [selected?.id]);

  // ── CRUD ───────────────────────────────────────────────────
  const addEntry = async (kind: EntryKind) => {
    const defaults = {
      character: { name: "New Character", details: encodeCharacterDetails({}) },
      place: { name: "New Place", details: encodePlaceDetails({}) },
      note: { name: "New Note", details: encodeNoteDetails({}) },
    }[kind];
    try {
      const res = await fetch(`/api/stories/${storyId}/bible`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: kind, description: "", ...defaults }),
      });
      if (!res.ok) return;
      const { data } = await res.json();
      const base = { id: data.id, tags: [], createdAt: Date.now(), updatedAt: Date.now() };
      if (kind === "character") {
        const char: StoryCharacter = {
          ...base, name: data.name, aliases: [], description: "",
          imageDataUrl: null, color: "#D4A574",
        };
        onUpdate({ ...bible, characters: [...bible.characters, char] });
      } else if (kind === "place") {
        const place: StoryPlace = {
          ...base, name: data.name, description: "", imageDataUrl: null,
        };
        onUpdate({ ...bible, places: [...bible.places, place] });
      } else {
        const note: StoryNote = {
          ...base, title: data.name, content: "", category: "custom",
        };
        onUpdate({ ...bible, notes: [...bible.notes, note] });
      }
      setSelected({ kind, id: data.id });
      setFreshId(data.id);
    } catch {}
  };

  const updateCharacter = (id: string, updates: Partial<StoryCharacter>) => {
    const characters = bible.characters.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    onUpdate({ ...bible, characters });
    const full = characters.find((c) => c.id === id);
    if (full) {
      debouncedPatch(id, {
        name: full.name,
        description: full.description,
        details: encodeCharacterDetails(full),
      });
    }
  };

  const updatePlace = (id: string, updates: Partial<StoryPlace>) => {
    const places = bible.places.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    onUpdate({ ...bible, places });
    const full = places.find((p) => p.id === id);
    if (full) {
      debouncedPatch(id, {
        name: full.name,
        description: full.description,
        details: encodePlaceDetails(full),
      });
    }
  };

  const updateNote = (id: string, updates: Partial<StoryNote>) => {
    const notes = bible.notes.map((n) =>
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    );
    onUpdate({ ...bible, notes });
    const full = notes.find((n) => n.id === id);
    if (full) {
      debouncedPatch(id, {
        name: full.title,
        description: full.content,
        details: encodeNoteDetails(full),
      });
    }
  };

  const deleteSelected = () => {
    if (!selected) return;
    const { kind, id } = selected;
    if (kind === "character") {
      onUpdate({ ...bible, characters: bible.characters.filter((c) => c.id !== id) });
    } else if (kind === "place") {
      onUpdate({ ...bible, places: bible.places.filter((p) => p.id !== id) });
    } else {
      onUpdate({ ...bible, notes: bible.notes.filter((n) => n.id !== id) });
    }
    fetch(`/api/stories/${storyId}/bible/${id}`, { method: "DELETE" }).catch(() => {});
    setSelected(null);
    setConfirmingDelete(false);
  };

  const uploadImage = async (file: File) => {
    if (!selected || selected.kind === "note") return;
    try {
      const dataUrl = await compressImage(file, 400, 0.75);
      if (selected.kind === "character") updateCharacter(selected.id, { imageDataUrl: dataUrl });
      else updatePlace(selected.id, { imageDataUrl: dataUrl });
    } catch {}
  };

  // ── Lookups ────────────────────────────────────────────────
  const query = search.toLowerCase().trim();
  const match = (name: string, desc?: string) =>
    !query || name.toLowerCase().includes(query) || (desc?.toLowerCase().includes(query) ?? false);

  const characterAppearances = useMemo(() => {
    if (!selected || selected.kind !== "character") return [];
    const char = bible.characters.find((c) => c.id === selected.id);
    if (!char) return [];
    return chapters
      .filter(
        (ch) =>
          ch.content &&
          (ch.content.includes(`data-mention="${char.id}"`) ||
            ch.content.toLowerCase().includes(char.name.toLowerCase()))
      )
      .map((ch) => ch.title || "Untitled");
  }, [selected, bible.characters, chapters]);

  const selectedCharacter =
    selected?.kind === "character"
      ? bible.characters.find((c) => c.id === selected.id)
      : undefined;
  const selectedPlace =
    selected?.kind === "place" ? bible.places.find((p) => p.id === selected.id) : undefined;
  const selectedNote =
    selected?.kind === "note" ? bible.notes.find((n) => n.id === selected.id) : undefined;

  const sections: Array<{
    kind: EntryKind;
    label: string;
    entries: Array<{ id: string; name: string; sub: string; color?: string; image?: string | null }>;
  }> = [
    {
      kind: "character",
      label: "Characters",
      entries: bible.characters
        .filter((c) => match(c.name, c.description))
        .map((c) => ({
          id: c.id,
          name: c.name,
          sub: c.aliases[0] ?? "",
          color: c.color,
          image: c.imageDataUrl,
        })),
    },
    {
      kind: "place",
      label: "Places",
      entries: bible.places
        .filter((p) => match(p.name, p.description))
        .map((p) => ({ id: p.id, name: p.name, sub: "", image: p.imageDataUrl })),
    },
    {
      kind: "note",
      label: "Notes",
      entries: bible.notes
        .filter((n) => match(n.title, n.content))
        .map((n) => ({
          id: n.id,
          name: n.title,
          sub: NOTE_CATEGORIES.find((c) => c.key === n.category)?.label ?? "",
        })),
    },
  ];

  const fieldLabel = "mb-2 block text-[10px] uppercase tracking-[0.14em] text-text-ghost";
  const ghostInput =
    "w-full bg-transparent text-[13px] text-text outline-none placeholder:text-text-ghost/60 border-b border-transparent focus:border-amber/30 pb-1 transition-colors";

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col bg-void"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      role="dialog"
      aria-modal="true"
      aria-label="The story bible"
    >
      {/* lamp glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-amber/[0.07] blur-[130px]"
        aria-hidden
      />

      {/* top bar */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="group flex items-center gap-2 text-[12px] text-text-secondary transition-colors hover:text-amber"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5" aria-hidden>
            <path d="M19 12H5 M11 18l-6-6 6-6" />
          </svg>
          The desk
          <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-ghost">
            Esc
          </kbd>
        </button>
        <p className="text-[11px] uppercase tracking-[0.2em] text-text-ghost">
          The Story Bible
          <span className="ml-2 normal-case tracking-normal text-text-ghost/70">
            {storyTitle}
          </span>
        </p>
        <div className="flex items-center gap-1.5">
          {(
            [
              ["character", "Character"],
              ["place", "Place"],
              ["note", "Note"],
            ] as Array<[EntryKind, string]>
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => void addEntry(kind)}
              className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-amber/25 hover:bg-amber/[0.04] hover:text-amber"
            >
              + {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* ── index ── */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-surface/40">
          <div className="px-4 pb-2 pt-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the codex…"
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-[12px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
              aria-label="Search entries"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {sections.map((section) => (
              <div key={section.kind} className="mt-4">
                <div className="mb-1 flex items-center justify-between px-4">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                    {section.label}
                    <span className="ml-1.5 font-mono">{section.entries.length}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void addEntry(section.kind)}
                    className="rounded-md p-1 text-text-ghost transition-colors hover:bg-paper/[0.05] hover:text-amber"
                    aria-label={`New ${section.kind}`}
                    title={`New ${section.kind}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <path d="M12 5v14 M5 12h14" />
                    </svg>
                  </button>
                </div>
                {section.entries.map((e) => {
                  const isSelected = selected?.kind === section.kind && selected.id === e.id;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelected({ kind: section.kind, id: e.id })}
                      className={`flex w-full items-center gap-2.5 border-l-2 px-4 py-2 text-left transition-colors ${
                        isSelected
                          ? "border-amber bg-amber/[0.05]"
                          : "border-transparent hover:bg-paper/[0.03]"
                      }`}
                    >
                      {section.kind !== "note" && (
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-void"
                          style={{ backgroundColor: e.color ?? "var(--t-gold)" }}
                        >
                          {e.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={e.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (e.name || "?").charAt(0).toUpperCase()
                          )}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className={`block truncate text-[13px] ${isSelected ? "text-paper" : "text-text-secondary"}`}>
                          {e.name || "Untitled"}
                        </span>
                        {e.sub && (
                          <span className="block truncate text-[10px] text-text-ghost">{e.sub}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {section.entries.length === 0 && (
                  <p className="px-4 py-1.5 text-[11px] italic text-text-ghost/60">
                    {query ? "Nothing matches." : "None yet."}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="border-t border-border px-4 py-2.5 text-[10px] text-text-ghost/70">
            Everything here saves as you type.
          </p>
        </aside>

        {/* ── the entry page ── */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {selectedCharacter && (
            <div key={selectedCharacter.id} className="mx-auto max-w-[680px] px-10 py-12">
              <div className="mb-8 flex items-start gap-6">
                <label className="group relative block h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl" title="Set a portrait">
                  <span
                    className="flex h-full w-full items-center justify-center text-3xl font-semibold text-void"
                    style={{ backgroundColor: selectedCharacter.color }}
                  >
                    {selectedCharacter.imageDataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={selectedCharacter.imageDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (selectedCharacter.name || "?").charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-void/60 text-[10px] uppercase tracking-wider text-paper opacity-0 transition-opacity group-hover:opacity-100">
                    Portrait
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadImage(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1 pt-1">
                  <input
                    value={selectedCharacter.name}
                    onChange={(e) => updateCharacter(selectedCharacter.id, { name: e.target.value })}
                    placeholder="Their name"
                    className="w-full bg-transparent font-display text-[30px] font-semibold leading-tight text-paper outline-none placeholder:text-text-ghost/50"
                    aria-label="Character name"
                    autoFocus={selectedCharacter.id === freshId}
                    onFocus={(e) => {
                      if (e.target.value && selectedCharacter.id === freshId) e.target.select();
                    }}
                  />
                  <input
                    key={`aliases-${selectedCharacter.id}`}
                    defaultValue={selectedCharacter.aliases.join(", ")}
                    onBlur={(e) => updateCharacter(selectedCharacter.id, { aliases: parseList(e.target.value) })}
                    placeholder="Also known as…"
                    className={`mt-1 ${ghostInput}`}
                    aria-label="Aliases"
                  />
                  <div className="mt-3 flex items-center gap-1.5">
                    {CHARACTER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateCharacter(selectedCharacter.id, { color })}
                        className={`h-4 w-4 rounded-full transition-transform hover:scale-125 ${
                          selectedCharacter.color === color ? "ring-2 ring-paper/60 ring-offset-2 ring-offset-void" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Ink color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <label className={fieldLabel}>Who they are</label>
              <textarea
                value={selectedCharacter.description}
                onChange={(e) => updateCharacter(selectedCharacter.id, { description: e.target.value })}
                placeholder="Who are they when no one is watching?"
                rows={10}
                className="w-full resize-none bg-transparent font-reading text-[15px] leading-[1.85] text-text outline-none placeholder:text-text-ghost/50"
                aria-label="Character description"
              />

              <label className={`mt-8 ${fieldLabel}`}>Tags</label>
              <input
                key={`tags-${selectedCharacter.id}`}
                defaultValue={selectedCharacter.tags.join(", ")}
                onBlur={(e) => updateCharacter(selectedCharacter.id, { tags: parseList(e.target.value) })}
                placeholder="protagonist, crew, drowned…"
                className={ghostInput}
                aria-label="Tags"
              />

              {characterAppearances.length > 0 && (
                <>
                  <label className={`mt-8 ${fieldLabel}`}>Appears in</label>
                  <div className="flex flex-wrap gap-1.5">
                    {characterAppearances.map((title) => (
                      <span key={title} className="rounded-full bg-paper/[0.04] border border-border px-2.5 py-1 text-[11px] text-text-secondary">
                        {title}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <DeleteEntry
                label="character"
                confirming={confirmingDelete}
                onFirst={() => setConfirmingDelete(true)}
                onConfirm={deleteSelected}
              />
            </div>
          )}

          {selectedPlace && (
            <div key={selectedPlace.id} className="mx-auto max-w-[680px] px-10 py-12">
              <div className="mb-8 flex items-start gap-6">
                <label className="group relative block h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-elevated" title="Set an image">
                  <span className="flex h-full w-full items-center justify-center text-2xl text-text-ghost">
                    {selectedPlace.imageDataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={selectedPlace.imageDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                    )}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-void/60 text-[10px] uppercase tracking-wider text-paper opacity-0 transition-opacity group-hover:opacity-100">
                    Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadImage(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1 pt-2">
                  <input
                    value={selectedPlace.name}
                    onChange={(e) => updatePlace(selectedPlace.id, { name: e.target.value })}
                    placeholder="Name this place"
                    className="w-full bg-transparent font-display text-[30px] font-semibold leading-tight text-paper outline-none placeholder:text-text-ghost/50"
                    aria-label="Place name"
                    autoFocus={selectedPlace.id === freshId}
                    onFocus={(e) => {
                      if (e.target.value && selectedPlace.id === freshId) e.target.select();
                    }}
                  />
                </div>
              </div>

              <label className={fieldLabel}>What it's like</label>
              <textarea
                value={selectedPlace.description}
                onChange={(e) => updatePlace(selectedPlace.id, { description: e.target.value })}
                placeholder="What does a stranger notice first?"
                rows={10}
                className="w-full resize-none bg-transparent font-reading text-[15px] leading-[1.85] text-text outline-none placeholder:text-text-ghost/50"
                aria-label="Place description"
              />

              <label className={`mt-8 ${fieldLabel}`}>Tags</label>
              <input
                key={`tags-${selectedPlace.id}`}
                defaultValue={selectedPlace.tags.join(", ")}
                onBlur={(e) => updatePlace(selectedPlace.id, { tags: parseList(e.target.value) })}
                placeholder="city, drowned, ruin…"
                className={ghostInput}
                aria-label="Tags"
              />

              <DeleteEntry
                label="place"
                confirming={confirmingDelete}
                onFirst={() => setConfirmingDelete(true)}
                onConfirm={deleteSelected}
              />
            </div>
          )}

          {selectedNote && (
            <div key={selectedNote.id} className="mx-auto max-w-[680px] px-10 py-12">
              <input
                value={selectedNote.title}
                onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                placeholder="What is this note about?"
                className="mb-4 w-full bg-transparent font-display text-[30px] font-semibold leading-tight text-paper outline-none placeholder:text-text-ghost/50"
                aria-label="Note title"
                autoFocus={selectedNote.id === freshId}
                onFocus={(e) => {
                  if (e.target.value && selectedNote.id === freshId) e.target.select();
                }}
              />
              <div className="mb-8 flex items-center gap-1.5">
                {NOTE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => updateNote(selectedNote.id, { category: cat.key })}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] transition-all ${
                      selectedNote.category === cat.key
                        ? "border-amber/30 bg-amber/[0.06] text-amber"
                        : "border-border text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <textarea
                value={selectedNote.content}
                onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
                placeholder="Rules, history, the things only you know…"
                rows={14}
                className="w-full resize-none bg-transparent font-reading text-[15px] leading-[1.85] text-text outline-none placeholder:text-text-ghost/50"
                aria-label="Note content"
              />

              <label className={`mt-8 ${fieldLabel}`}>Tags</label>
              <input
                key={`tags-${selectedNote.id}`}
                defaultValue={selectedNote.tags.join(", ")}
                onBlur={(e) => updateNote(selectedNote.id, { tags: parseList(e.target.value) })}
                placeholder="magic-system, act-two…"
                className={ghostInput}
                aria-label="Tags"
              />

              <DeleteEntry
                label="note"
                confirming={confirmingDelete}
                onFirst={() => setConfirmingDelete(true)}
                onConfirm={deleteSelected}
              />
            </div>
          )}

          {!selectedCharacter && !selectedPlace && !selectedNote && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
              <p className="font-display text-xl text-text-secondary">
                The codex is open to a blank page.
              </p>
              <p className="max-w-sm text-[13px] leading-relaxed text-text-ghost">
                Every world keeps its truths somewhere. Start with whoever
                walked into the story first.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void addEntry("character")}
                  className="rounded-lg border border-amber/30 bg-amber/[0.06] px-3.5 py-2 text-[12px] text-amber transition-colors hover:bg-amber/10"
                >
                  New character
                </button>
                <button
                  type="button"
                  onClick={() => void addEntry("place")}
                  className="rounded-lg border border-border px-3.5 py-2 text-[12px] text-text-secondary transition-colors hover:border-amber/25 hover:text-amber"
                >
                  New place
                </button>
                <button
                  type="button"
                  onClick={() => void addEntry("note")}
                  className="rounded-lg border border-border px-3.5 py-2 text-[12px] text-text-secondary transition-colors hover:border-amber/25 hover:text-amber"
                >
                  New note
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}

function DeleteEntry({
  label,
  confirming,
  onFirst,
  onConfirm,
}: {
  label: string;
  confirming: boolean;
  onFirst: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-12 border-t border-border pt-5">
      {confirming ? (
        <button
          type="button"
          onClick={onConfirm}
          className="text-[12px] font-medium text-rose transition-colors hover:text-rose"
        >
          Really remove this {label} from the codex?
        </button>
      ) : (
        <button
          type="button"
          onClick={onFirst}
          className="text-[12px] text-text-ghost transition-colors hover:text-rose"
        >
          Remove from the codex
        </button>
      )}
    </div>
  );
}
