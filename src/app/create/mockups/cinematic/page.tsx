"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// ── Format data ─────────────────────────────────────────────

const FORMATS = [
  {
    id: "novel",
    label: "Novel",
    desc: "Traditional chapters with rich text",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 5h16M4 9h12M4 13h10M4 17h14" />
      </svg>
    ),
  },
  {
    id: "webtoon",
    label: "Webtoon",
    desc: "Vertical-scroll illustrated panels",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="2" width="14" height="7" rx="1.5" />
        <rect x="5" y="12" width="14" height="10" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "poetry",
    label: "Poetry",
    desc: "Verse and stanza formatting",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 5h10M9 9h7M6 13h8M8 17h6" />
      </svg>
    ),
  },
  {
    id: "illustrated",
    label: "Illustrated Novel",
    desc: "Chapters with inline artwork",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
        <circle cx="8" cy="8" r="2" />
        <path d="M3 17l5-5 4 4 2.5-2.5L21 20" />
      </svg>
    ),
  },
  {
    id: "screenplay",
    label: "Screenplay",
    desc: "Script-formatted dialogue",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="2" width="16" height="20" rx="1.5" />
        <path d="M8 7h8M9 10h5M8 13h7M10 16h3" />
      </svg>
    ),
  },
];

// ── Genre list ──────────────────────────────────────────────

const GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller",
  "Horror", "Literary Fiction", "Historical Fiction", "Contemporary",
  "Adventure", "Dystopian", "Magical Realism", "Urban Fantasy",
  "Dark Academia", "Mythology", "Steampunk", "Cyberpunk", "Gothic",
  "Paranormal", "Comedy", "Drama", "Psychological", "Crime", "Slice of Life",
];

// ── Content ratings ─────────────────────────────────────────

const RATINGS = [
  { id: "general", label: "General", desc: "Suitable for all audiences" },
  { id: "teen", label: "Teen", desc: "May contain mild language or themes" },
  { id: "mature", label: "Mature", desc: "Adult themes, violence, or language" },
  { id: "explicit", label: "Explicit", desc: "Graphic content, 18+ only" },
];

// ── Stagger animation helpers ───────────────────────────────

const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  },
};

// ── Main component ──────────────────────────────────────────

export default function CinematicCreateMockup() {
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [format, setFormat] = useState("novel");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [contentRating, setContentRating] = useState("general");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [titleFocused, setTitleFocused] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleCoverFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Create story:", {
      title,
      synopsis,
      format,
      genres: selectedGenres,
      contentRating,
      coverPreview: coverPreview ? "[image data]" : null,
    });
  };

  return (
    <div className="min-h-screen bg-void">
      {/* ── Cinematic Banner ─────────────────────────────────── */}
      <div className="relative h-[320px] w-full overflow-hidden">
        {/* Mode image */}
        <Image
          src="/coop_story_mode.png"
          alt="Co-op writing mode"
          fill
          className="object-cover brightness-50"
          priority
        />

        {/* Gradient overlays for seamless fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-transparent to-void" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-void to-transparent" />

        {/* Back button — frosted pill */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-void/40 px-4 py-2 text-sm text-paper/80 backdrop-blur-xl transition-colors hover:bg-void/60 hover:text-paper"
          onClick={() => console.log("Back")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back
        </motion.button>

        {/* Mode badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="absolute top-6 left-1/2 z-10 -translate-x-1/2"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal/10 px-3 py-1 text-xs font-medium tracking-wide text-teal backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            Co-op
          </span>
        </motion.div>
      </div>

      {/* ── Cover Upload — The Bridge Element ────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto -mt-40 w-[200px]"
      >
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleCoverFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleCoverFile(f);
          }}
          className="group relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-ink shadow-2xl shadow-black/50 transition-all hover:border-teal/30 hover:shadow-teal/5"
        >
          {coverPreview ? (
            <Image
              src={coverPreview}
              alt="Cover preview"
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 px-4">
              {/* Corner marks */}
              <div className="absolute top-3 left-3 h-4 w-4 border-t border-l border-text-ghost/30" />
              <div className="absolute top-3 right-3 h-4 w-4 border-t border-r border-text-ghost/30" />
              <div className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-text-ghost/30" />
              <div className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-text-ghost/30" />

              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-text-ghost transition-colors group-hover:text-teal/60"
              >
                <rect x="4" y="4" width="20" height="20" rx="3" />
                <path d="M4 20l6-6 4 4 3-3 7 7" />
                <circle cx="10" cy="10" r="2" />
              </svg>
              <span className="text-xs text-text-ghost transition-colors group-hover:text-text-secondary">
                Add cover
              </span>
            </div>
          )}

          {/* Hover overlay for replacement */}
          {coverPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-void/60 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-xs text-paper">Change cover</span>
            </div>
          )}
        </button>
      </motion.div>

      {/* ── Title Input ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mx-auto mt-8 max-w-2xl px-6"
      >
        <div className="relative text-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            placeholder="Your story title"
            className="w-full bg-transparent text-center font-display text-3xl text-paper placeholder:text-text-ghost/40 focus:outline-none"
          />
          {/* Teal underline that expands */}
          <motion.div
            className="mx-auto mt-2 h-px bg-teal/40"
            initial={{ width: "40px" }}
            animate={{ width: titleFocused || title ? "120px" : "40px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* ── Form Fields ──────────────────────────────────────── */}
      <motion.form
        onSubmit={handleSubmit}
        variants={stagger.container}
        initial="hidden"
        animate="show"
        className="mx-auto mt-12 max-w-2xl space-y-10 px-6 pb-24"
      >
        {/* Synopsis */}
        <motion.div variants={stagger.item}>
          <label className="mb-3 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">
            Synopsis
          </label>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="A brief description of your story..."
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-elevated px-4 py-3 font-body text-sm text-text placeholder:text-text-ghost/40 transition-colors focus:border-border-active focus:outline-none"
          />
        </motion.div>

        {/* Format Selector */}
        <motion.div variants={stagger.item}>
          <label className="mb-3 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">
            Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {FORMATS.map((f) => {
              const selected = format === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={`group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? "border-teal/30 bg-teal/5"
                      : "border-border bg-elevated hover:border-border-active"
                  }`}
                >
                  <div
                    className={`transition-colors ${
                      selected ? "text-teal" : "text-text-ghost group-hover:text-text-secondary"
                    }`}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium transition-colors ${
                        selected ? "text-teal" : "text-text"
                      }`}
                    >
                      {f.label}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-text-ghost">
                      {f.desc}
                    </div>
                  </div>

                  {/* Selected indicator dot */}
                  {selected && (
                    <motion.div
                      layoutId="format-dot"
                      className="absolute top-3 right-3 h-2 w-2 rounded-full bg-teal"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Genre Pills */}
        <motion.div variants={stagger.item}>
          <label className="mb-3 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">
            Genres
            {selectedGenres.length > 0 && (
              <span className="ml-2 text-teal/70">{selectedGenres.length} selected</span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => {
              const selected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                    selected
                      ? "border-teal/30 bg-teal/10 text-teal"
                      : "border-border text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Content Rating */}
        <motion.div variants={stagger.item}>
          <label className="mb-3 block text-[10px] uppercase tracking-[0.12em] text-text-ghost">
            Content Rating
          </label>
          <div className="grid grid-cols-3 gap-3">
            {RATINGS.map((r) => {
              const selected = contentRating === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setContentRating(r.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? "border-teal/30 bg-teal/5"
                      : "border-border bg-elevated hover:border-border-active"
                  }`}
                >
                  <div
                    className={`text-sm font-medium transition-colors ${
                      selected ? "text-teal" : "text-text"
                    }`}
                  >
                    {r.label}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-text-ghost">
                    {r.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Submit */}
        <motion.div variants={stagger.item} className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="rounded-full bg-teal px-7 py-3 text-sm font-medium text-void transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Create Story
          </button>
          <button
            type="button"
            onClick={() => console.log("Cancel")}
            className="text-sm text-text-ghost transition-colors hover:text-text-secondary"
          >
            Cancel
          </button>
        </motion.div>
      </motion.form>
    </div>
  );
}
