"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  StoryBible,
  StoryCharacter,
  StoryPlace,
  StoryNote,
} from "@/lib/store";
import { compressImage } from "@/lib/images";

type BibleTab = "characters" | "places" | "notes";
type NoteCategory = "all" | "lore" | "timeline" | "research" | "custom";

interface StoryBiblePanelProps {
  bible: StoryBible;
  storyId: string;
  chapters: Array<{ id: string; title: string; content: string }>;
  onUpdate: (bible: StoryBible) => void;
  onClose: () => void;
}

// Encode extra fields into JSON details column
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

export default function StoryBiblePanel({
  bible,
  storyId,
  chapters,
  onUpdate,
  onClose,
}: StoryBiblePanelProps) {
  const [tab, setTab] = useState<BibleTab>("characters");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteFilter, setNoteFilter] = useState<NoteCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const query = searchQuery.toLowerCase().trim();

  // Collect unique tags per tab
  const allTagsForTab = useMemo(() => {
    if (tab === "characters") return [...new Set(bible.characters.flatMap((c) => c.tags))];
    if (tab === "places") return [...new Set(bible.places.flatMap((p) => p.tags))];
    return [...new Set(bible.notes.flatMap((n) => n.tags))];
  }, [tab, bible.characters, bible.places, bible.notes]);

  // Filter helpers
  const matchesSearch = useCallback(
    (name: string, desc?: string) => {
      if (!query) return true;
      return (
        name.toLowerCase().includes(query) ||
        (desc?.toLowerCase().includes(query) ?? false)
      );
    },
    [query]
  );

  const matchesTags = useCallback(
    (tags: string[]) => {
      if (activeTags.size === 0) return true;
      return tags.some((t) => activeTags.has(t));
    },
    [activeTags]
  );

  // Filtered lists
  const filteredCharacters = useMemo(
    () =>
      bible.characters.filter(
        (c) => matchesSearch(c.name, c.description) && matchesTags(c.tags)
      ),
    [bible.characters, matchesSearch, matchesTags]
  );

  const filteredPlaces = useMemo(
    () =>
      bible.places.filter(
        (p) => matchesSearch(p.name, p.description) && matchesTags(p.tags)
      ),
    [bible.places, matchesSearch, matchesTags]
  );

  const chaptersMap = useMemo(() => new Map(chapters.map(c => [c.id, c])), [chapters]);

  const characterAppearances = useMemo(() => {
    const appearances = new Map<string, string[]>();
    for (const char of bible.characters) {
      const chapterIds: string[] = [];
      for (const ch of chapters) {
        if (!ch.content) continue;
        const mentionMatch = ch.content.includes(`data-mention="${char.id}"`);
        const nameMatch = ch.content.toLowerCase().includes(char.name.toLowerCase());
        if (mentionMatch || nameMatch) {
          chapterIds.push(ch.id);
        }
      }
      appearances.set(char.id, chapterIds);
    }
    return appearances;
  }, [bible.characters, chapters]);

  const resolvedAppearances = useMemo(() => {
    const result = new Map<string, Array<{ id: string; title: string }>>();
    for (const [charId, chapterIds] of characterAppearances) {
      result.set(charId, chapterIds
        .map(chId => chaptersMap.get(chId))
        .filter(Boolean)
        .map(c => ({ id: c!.id, title: c!.title }))
      );
    }
    return result;
  }, [characterAppearances, chaptersMap]);

  const hasActiveFilters = query.length > 0 || activeTags.size > 0;

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveTags(new Set());
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const tabs: { key: BibleTab; label: string; count: number }[] = [
    { key: "characters", label: "Characters", count: bible.characters.length },
    { key: "places", label: "Places", count: bible.places.length },
    { key: "notes", label: "Notes", count: bible.notes.length },
  ];

  // Debounced PATCH to API
  const debouncedPatch = useCallback(
    (entryId: string, body: Record<string, unknown>) => {
      const existing = patchTimers.current.get(entryId);
      if (existing) clearTimeout(existing);
      patchTimers.current.set(
        entryId,
        setTimeout(() => {
          fetch(`/api/stories/${storyId}/bible/${entryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }).catch(() => {});
          patchTimers.current.delete(entryId);
        }, 800)
      );
    },
    [storyId]
  );

  useEffect(() => {
    return () => {
      // Cancel all pending debounced patches on unmount
      for (const timer of patchTimers.current.values()) {
        clearTimeout(timer);
      }
      patchTimers.current.clear();
    };
  }, []);

  // ── Character handlers ────────────────────────────────────
  const handleAddCharacter = async () => {
    try {
      const res = await fetch(`/api/stories/${storyId}/bible`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "character",
          name: "New Character",
          description: "",
          details: encodeCharacterDetails({}),
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        const char: StoryCharacter = {
          id: data.id,
          name: data.name,
          aliases: [],
          description: "",
          imageDataUrl: null,
          color: "#D4A574",
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onUpdate({ ...bible, characters: [...bible.characters, char] });
        setEditingId(char.id);
      }
    } catch {}
  };

  const handleUpdateCharacter = (id: string, updates: Partial<StoryCharacter>) => {
    const updated = bible.characters.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    onUpdate({ ...bible, characters: updated });

    const full = updated.find((c) => c.id === id);
    if (full) {
      debouncedPatch(id, {
        name: full.name,
        description: full.description,
        details: encodeCharacterDetails(full),
      });
    }
  };

  const handleDeleteCharacter = (id: string) => {
    onUpdate({ ...bible, characters: bible.characters.filter((c) => c.id !== id) });
    if (editingId === id) setEditingId(null);
    fetch(`/api/stories/${storyId}/bible/${id}`, { method: "DELETE" }).catch(() => {});
  };

  // ── Place handlers ────────────────────────────────────────
  const handleAddPlace = async () => {
    try {
      const res = await fetch(`/api/stories/${storyId}/bible`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "place",
          name: "New Place",
          description: "",
          details: encodePlaceDetails({}),
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        const place: StoryPlace = {
          id: data.id,
          name: data.name,
          description: "",
          imageDataUrl: null,
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onUpdate({ ...bible, places: [...bible.places, place] });
        setEditingId(place.id);
      }
    } catch {}
  };

  const handleUpdatePlace = (id: string, updates: Partial<StoryPlace>) => {
    const updated = bible.places.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    onUpdate({ ...bible, places: updated });

    const full = updated.find((p) => p.id === id);
    if (full) {
      debouncedPatch(id, {
        name: full.name,
        description: full.description,
        details: encodePlaceDetails(full),
      });
    }
  };

  const handleDeletePlace = (id: string) => {
    onUpdate({ ...bible, places: bible.places.filter((p) => p.id !== id) });
    if (editingId === id) setEditingId(null);
    fetch(`/api/stories/${storyId}/bible/${id}`, { method: "DELETE" }).catch(() => {});
  };

  // ── Note handlers ─────────────────────────────────────────
  const handleAddNote = async () => {
    try {
      const res = await fetch(`/api/stories/${storyId}/bible`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "note",
          name: "New Note",
          description: "",
          details: encodeNoteDetails({}),
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        const note: StoryNote = {
          id: data.id,
          title: data.name,
          content: "",
          category: "custom",
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onUpdate({ ...bible, notes: [...bible.notes, note] });
        setEditingId(note.id);
      }
    } catch {}
  };

  const handleUpdateNote = (id: string, updates: Partial<StoryNote>) => {
    const updated = bible.notes.map((n) =>
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    );
    onUpdate({ ...bible, notes: updated });

    const full = updated.find((n) => n.id === id);
    if (full) {
      debouncedPatch(id, {
        name: full.title,
        description: full.content,
        details: encodeNoteDetails(full),
      });
    }
  };

  const handleDeleteNote = (id: string) => {
    onUpdate({ ...bible, notes: bible.notes.filter((n) => n.id !== id) });
    if (editingId === id) setEditingId(null);
    fetch(`/api/stories/${storyId}/bible/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filteredNotes = useMemo(() => {
    let notes = noteFilter === "all"
      ? bible.notes
      : bible.notes.filter((n) => n.category === noteFilter);
    notes = notes.filter(
      (n) => matchesSearch(n.title, n.content) && matchesTags(n.tags)
    );
    return notes;
  }, [bible.notes, noteFilter, matchesSearch, matchesTags]);

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 360, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col"
    >
      <div className="min-w-[360px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-paper">Story Bible</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2.5 text-[11px] transition-all relative ${
                tab === t.key
                  ? "text-amber"
                  : "text-text-ghost hover:text-text-secondary"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-1.5 text-[9px] opacity-60">
                  {t.count}
                </span>
              )}
              {tab === t.key && (
                <motion.div
                  layoutId="bible-tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Search & Tag Filters */}
        <div className="px-3 pt-2 pb-1 space-y-1.5 border-b border-border">
          {/* Search input */}
          <div className="relative">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-text-ghost"
            >
              <circle cx="5" cy="5" r="3.5" />
              <path d="M8 8l2.5 2.5" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${tab}...`}
              className="w-full h-8 bg-surface border border-border-active rounded-md pl-7 pr-7 text-[12px] text-paper placeholder:text-text-ghost outline-none focus:border-amber/30 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-ghost hover:text-text-secondary transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="2" y1="2" x2="8" y2="8" />
                  <line x1="8" y1="2" x2="2" y2="8" />
                </svg>
              </button>
            )}
          </div>

          {/* Tag pills */}
          {allTagsForTab.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {allTagsForTab.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-[10px] py-0.5 px-2 rounded-full border transition-all ${
                    activeTags.has(tag)
                      ? "bg-amber/15 text-amber border-amber/30"
                      : "bg-surface/50 text-text-ghost border-border hover:text-text-secondary hover:border-text-ghost"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Result count & clear filters */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-ghost">
                {tab === "characters" && `${filteredCharacters.length} of ${bible.characters.length} characters`}
                {tab === "places" && `${filteredPlaces.length} of ${bible.places.length} places`}
                {tab === "notes" && `${filteredNotes.length} of ${bible.notes.length} notes`}
              </span>
              <button
                onClick={clearAllFilters}
                className="text-[10px] text-amber hover:text-amber/80 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Characters tab */}
          {tab === "characters" && (
            <>
              {bible.characters.length === 0 && (
                <EmptyState
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="10" cy="7" r="3" />
                      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                    </svg>
                  }
                  label="No characters yet"
                  hint="Track your characters, their traits, and relationships"
                />
              )}
              {bible.characters.length > 0 && filteredCharacters.length === 0 && hasActiveFilters && (
                <NoMatchesState onClear={clearAllFilters} />
              )}
              <AnimatePresence initial={false}>
                {filteredCharacters.map((char) => (
                  <motion.div
                    key={char.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CharacterCard
                      character={char}
                      isEditing={editingId === char.id}
                      appearances={resolvedAppearances.get(char.id)}
                      onToggleEdit={() =>
                        setEditingId(editingId === char.id ? null : char.id)
                      }
                      onUpdate={(updates) => handleUpdateCharacter(char.id, updates)}
                      onDelete={() => handleDeleteCharacter(char.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              <AddButton label="Add Character" onClick={handleAddCharacter} />
            </>
          )}

          {/* Places tab */}
          {tab === "places" && (
            <>
              {bible.places.length === 0 && (
                <EmptyState
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" />
                    </svg>
                  }
                  label="No places yet"
                  hint="Map out the locations in your story"
                />
              )}
              {bible.places.length > 0 && filteredPlaces.length === 0 && hasActiveFilters && (
                <NoMatchesState onClear={clearAllFilters} />
              )}
              <AnimatePresence initial={false}>
                {filteredPlaces.map((place) => (
                  <motion.div
                    key={place.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <PlaceCard
                      place={place}
                      isEditing={editingId === place.id}
                      onToggleEdit={() =>
                        setEditingId(editingId === place.id ? null : place.id)
                      }
                      onUpdate={(updates) => handleUpdatePlace(place.id, updates)}
                      onDelete={() => handleDeletePlace(place.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              <AddButton label="Add Place" onClick={handleAddPlace} />
            </>
          )}

          {/* Notes tab */}
          {tab === "notes" && (
            <>
              {/* Category filter */}
              <div className="flex gap-1 px-3 py-2">
                {(["all", "lore", "timeline", "research", "custom"] as NoteCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setNoteFilter(cat)}
                      className={`px-2 py-1 rounded-md text-[10px] capitalize transition-all ${
                        noteFilter === cat
                          ? "bg-amber/15 text-amber"
                          : "text-text-ghost hover:text-text-secondary"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
              {filteredNotes.length === 0 && bible.notes.length === 0 && (
                <EmptyState
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M4 4h12v12H4z" />
                      <path d="M7 8h6M7 11h4" />
                    </svg>
                  }
                  label="No notes yet"
                  hint="Keep lore, timelines, and research at your fingertips"
                />
              )}
              {bible.notes.length > 0 && filteredNotes.length === 0 && hasActiveFilters && (
                <NoMatchesState onClear={clearAllFilters} />
              )}
              <AnimatePresence initial={false}>
                {filteredNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <NoteCard
                      note={note}
                      isEditing={editingId === note.id}
                      onToggleEdit={() =>
                        setEditingId(editingId === note.id ? null : note.id)
                      }
                      onUpdate={(updates) => handleUpdateNote(note.id, updates)}
                      onDelete={() => handleDeleteNote(note.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              <AddButton label="Add Note" onClick={handleAddNote} />
            </>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

// ── Sub-components ────────────────────────────────────────────

function EmptyState({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center text-text-ghost mb-3">
        {icon}
      </div>
      <p className="text-sm text-text-tertiary">{label}</p>
      <p className="text-[11px] text-text-ghost mt-1">{hint}</p>
    </div>
  );
}

function NoMatchesState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <p className="text-sm text-text-tertiary">No matches found</p>
      <button
        onClick={onClear}
        className="mt-2 text-[11px] text-amber hover:text-amber/80 transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="px-3 py-2">
      <button
        onClick={onClick}
        className="w-full py-2.5 rounded-lg border border-dashed border-border text-[12px] text-text-ghost hover:text-text-secondary hover:border-text-ghost transition-colors"
      >
        + {label}
      </button>
    </div>
  );
}

function CharacterCard({
  character,
  isEditing,
  appearances,
  onToggleEdit,
  onUpdate,
  onDelete,
}: {
  character: StoryCharacter;
  isEditing: boolean;
  appearances?: Array<{ id: string; title: string }>;
  onToggleEdit: () => void;
  onUpdate: (updates: Partial<StoryCharacter>) => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImage(file, 200, 0.7);
      onUpdate({ imageDataUrl: dataUrl });
    } catch {}
  };

  return (
    <div data-bible-entry={character.id} className="mx-2 mb-1 rounded-lg border border-transparent hover:bg-subtle/20 transition-all">
      {/* Summary row */}
      <button
        onClick={onToggleEdit}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <div
          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold overflow-hidden"
          style={{
            backgroundColor: character.color + "20",
            color: character.color,
          }}
        >
          {character.imageDataUrl ? (
            <img
              src={character.imageDataUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            character.name[0]?.toUpperCase() ?? "?"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-text-secondary truncate">
            {character.name || "Unnamed character"}
          </p>
          {character.description && (
            <p className="text-[11px] text-text-ghost truncate">
              {character.description}
            </p>
          )}
          {appearances && appearances.length > 0 && (
            <div className="text-[10px] text-text-ghost mt-0.5 truncate">
              Appears in {appearances.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <span className="text-amber/60">{a.title}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`shrink-0 text-text-ghost transition-transform ${
            isEditing ? "rotate-180" : ""
          }`}
        >
          <path d="M3 4l2 2 2-2" />
        </svg>
      </button>

      {/* Edit form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5">
              <input
                type="file"
                ref={fileRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImage(f);
                }}
              />

              <input
                value={character.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Character name"
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors"
              />
              <input
                value={character.aliases.join(", ")}
                onChange={(e) =>
                  onUpdate({
                    aliases: e.target.value
                      .split(",")
                      .map((a) => a.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Aliases (comma separated)"
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors"
              />
              <textarea
                value={character.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Description, traits, backstory..."
                rows={3}
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors resize-none leading-relaxed"
              />
              <input
                value={character.tags.join(", ")}
                onChange={(e) =>
                  onUpdate({
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Tags (comma separated)"
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-2.5 py-1 rounded-md text-[11px] text-text-ghost hover:text-text-secondary border border-border transition-colors"
                >
                  {character.imageDataUrl ? "Change image" : "Add image"}
                </button>
                <div className="flex-1" />
                <button
                  onClick={onDelete}
                  className="px-2.5 py-1 rounded-md text-[11px] text-rose hover:bg-rose/10 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlaceCard({
  place,
  isEditing,
  onToggleEdit,
  onUpdate,
  onDelete,
}: {
  place: StoryPlace;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (updates: Partial<StoryPlace>) => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImage(file, 200, 0.7);
      onUpdate({ imageDataUrl: dataUrl });
    } catch {}
  };

  return (
    <div className="mx-2 mb-1 rounded-lg border border-transparent hover:bg-subtle/20 transition-all">
      <button
        onClick={onToggleEdit}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-sage/20 shrink-0 flex items-center justify-center text-sage overflow-hidden">
          {place.imageDataUrl ? (
            <img
              src={place.imageDataUrl}
              alt={place.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M7 1v4M3 5l4 3 4-3M2 9l5 4 5-4" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-text-secondary truncate">
            {place.name || "Unnamed place"}
          </p>
          {place.description && (
            <p className="text-[11px] text-text-ghost truncate">
              {place.description}
            </p>
          )}
        </div>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={`shrink-0 text-text-ghost transition-transform ${isEditing ? "rotate-180" : ""}`}
        >
          <path d="M3 4l2 2 2-2" />
        </svg>
      </button>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5">
              <input type="file" ref={fileRef} accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
              <input
                value={place.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Place name"
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors"
              />
              <textarea
                value={place.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Description, atmosphere, significance..."
                rows={3}
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors resize-none leading-relaxed"
              />
              <input
                value={place.tags.join(", ")}
                onChange={(e) => onUpdate({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                placeholder="Tags (comma separated)"
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors"
              />
              <div className="flex items-center gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className="px-2.5 py-1 rounded-md text-[11px] text-text-ghost hover:text-text-secondary border border-border transition-colors">
                  {place.imageDataUrl ? "Change image" : "Add image"}
                </button>
                <div className="flex-1" />
                <button onClick={onDelete}
                  className="px-2.5 py-1 rounded-md text-[11px] text-rose hover:bg-rose/10 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NoteCard({
  note,
  isEditing,
  onToggleEdit,
  onUpdate,
  onDelete,
}: {
  note: StoryNote;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (updates: Partial<StoryNote>) => void;
  onDelete: () => void;
}) {
  const categoryColors: Record<string, string> = {
    lore: "text-lavender bg-lavender/15",
    timeline: "text-amber bg-amber/15",
    research: "text-sage bg-sage/15",
    custom: "text-text-ghost bg-subtle",
  };

  return (
    <div className="mx-2 mb-1 rounded-lg border border-transparent hover:bg-subtle/20 transition-all">
      <button
        onClick={onToggleEdit}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <span
          className={`text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md shrink-0 ${
            categoryColors[note.category] ?? categoryColors.custom
          }`}
        >
          {note.category}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-text-secondary truncate">
            {note.title || "Untitled note"}
          </p>
          {note.content && (
            <p className="text-[11px] text-text-ghost truncate">
              {note.content}
            </p>
          )}
        </div>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={`shrink-0 text-text-ghost transition-transform ${isEditing ? "rotate-180" : ""}`}
        >
          <path d="M3 4l2 2 2-2" />
        </svg>
      </button>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5">
              <input
                value={note.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Note title"
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors"
              />
              <div className="flex gap-1">
                {(["lore", "timeline", "research", "custom"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => onUpdate({ category: cat })}
                    className={`px-2 py-1 rounded-md text-[10px] capitalize transition-all ${
                      note.category === cat
                        ? categoryColors[cat]
                        : "text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <textarea
                value={note.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                placeholder="Write your notes..."
                rows={5}
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors resize-none leading-relaxed"
              />
              <input
                value={note.tags.join(", ")}
                onChange={(e) => onUpdate({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                placeholder="Tags (comma separated)"
                className="w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-amber/30 transition-colors"
              />
              <div className="flex justify-end">
                <button onClick={onDelete}
                  className="px-2.5 py-1 rounded-md text-[11px] text-rose hover:bg-rose/10 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
