"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";

// ── Format options ──────────────────────────────────────────

const FORMATS = [
  { id: "novel", label: "Novel", desc: "Rich text chapters" },
  { id: "webtoon", label: "Webtoon", desc: "Illustrated panels" },
  { id: "poetry", label: "Poetry", desc: "Verse & stanza" },
  { id: "illustrated", label: "Illustrated", desc: "Chapters + artwork" },
  { id: "screenplay", label: "Screenplay", desc: "Script format" },
];

// ── Genre list ──────────────────────────────────────────────

const GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Thriller",
  "Horror",
  "Literary Fiction",
  "Historical Fiction",
  "Contemporary",
  "Adventure",
  "Dystopian",
  "Magical Realism",
  "Urban Fantasy",
  "Dark Academia",
  "Mythology",
  "Steampunk",
  "Cyberpunk",
  "Gothic",
  "Paranormal",
  "Comedy",
  "Drama",
  "Psychological",
  "Crime",
  "Slice of Life",
  "Epic",
  "Supernatural",
  "Military",
  "Western",
  "Satire",
  "Afrofuturism",
];

// ── Content ratings ─────────────────────────────────────────

const RATINGS = [
  { id: "general", label: "General", desc: "Suitable for all ages" },
  { id: "teen", label: "Teen", desc: "May contain mild themes" },
  { id: "mature", label: "Mature", desc: "Adult themes & language" },
  { id: "explicit", label: "Explicit", desc: "Graphic content" },
];

// ── Stagger helper ──────────────────────────────────────────

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const, delay: 0.1 + i * 0.05 },
});

// ── Main component ──────────────────────────────────────────

export default function CanvasMockup() {
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [format, setFormat] = useState("novel");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [contentRating, setContentRating] = useState("general");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
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
    console.log({
      title: title || "Untitled Story",
      synopsis,
      format,
      genres: selectedGenres,
      contentRating,
      hasCover: !!coverPreview,
    });
  };

  let sectionIndex = 0;

  return (
    <form onSubmit={handleSubmit} className="relative min-h-screen overflow-hidden">
      {/* ── Full-bleed background image ──────────────────────── */}
      <div className="fixed inset-0 z-0">
        <img
          src="/solo_story_mode.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.18) saturate(0.6) blur(1px)" }}
        />
        {/* Warm radial accent glow from center */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(200,150,60,0.07) 0%, transparent 70%)",
          }}
        />
        {/* Bottom fade to void */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-void to-transparent" />
      </div>

      {/* ── Scrollable content ───────────────────────────────── */}
      <div className="relative z-10 pt-8 pb-24">
        {/* ── Back button — top-left frosted pill ─────────── */}
        <motion.button
          type="button"
          onClick={() => console.log("Navigate back")}
          {...stagger(sectionIndex++)}
          className="fixed top-6 left-6 z-20 group flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.09] transition-all duration-300 cursor-pointer"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M10 3L5 8l5 5" />
          </svg>
          <span className="text-[12px] font-body tracking-wide">Choose a different path</span>
        </motion.button>

        {/* ── Centered column ────────────────────────────── */}
        <div className="max-w-xl mx-auto px-6 flex flex-col items-center">
          {/* ── Mode badge ─────────────────────────────── */}
          <motion.div {...stagger(sectionIndex++)} className="mb-10">
            <span className="inline-block px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold rounded-full backdrop-blur-md bg-amber/10 border border-amber/20 text-amber">
              Solo
            </span>
          </motion.div>

          {/* ── Cover upload area ──────────────────────── */}
          <motion.div {...stagger(sectionIndex++)} className="mb-10 w-full flex justify-center">
            <input
              type="file"
              ref={coverInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCoverFile(f);
              }}
            />
            <div
              onClick={() => coverInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleCoverFile(f);
              }}
              className="relative w-[220px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer group backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06]"
            >
              {coverPreview ? (
                <>
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-void/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-paper"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <p className="text-paper text-[12px] font-body">Change cover</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverPreview(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-void/70 backdrop-blur-md text-paper flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose/80 cursor-pointer"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {/* Corner marks */}
                  <div className="absolute top-3 left-3 w-5 h-5 border-t border-l border-white/15" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-t border-r border-white/15" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-b border-l border-white/15" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-b border-r border-white/15" />

                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    className="text-white/30 mb-3"
                  >
                    <rect x="3" y="3" width="22" height="22" rx="2" />
                    <circle cx="10" cy="10" r="2" />
                    <path d="M3 21l6-6 4 4 3-3 9 9" />
                  </svg>
                  <p className="text-white/40 text-[12px] font-body mb-1">Add cover</p>
                  <p className="text-white/20 text-[10px] font-body">600 &times; 900px</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Title input ────────────────────────────── */}
          <motion.div {...stagger(sectionIndex++)} className="mb-12 w-full text-center">
            <div className="relative inline-block w-full">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Story"
                className="w-full text-center font-display text-3xl text-paper bg-transparent outline-none placeholder:text-white/20 border-none pb-3"
              />
              <div
                className={`absolute bottom-0 left-1/2 h-px transition-all duration-700 ease-out ${
                  title
                    ? "w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-amber/50 to-transparent"
                    : "w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                }`}
              />
            </div>
          </motion.div>

          {/* ── Synopsis textarea ──────────────────────── */}
          <motion.div {...stagger(sectionIndex++)} className="mb-12 w-full max-w-lg mx-auto">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3 block text-center">
              Synopsis
            </label>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="A brief description of your story... What will draw readers in?"
              rows={4}
              className="w-full backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-[14px] text-paper/90 font-body outline-none placeholder:text-white/30 placeholder:italic transition-all duration-300 resize-none leading-relaxed focus:border-white/[0.15] focus:bg-white/[0.06]"
            />
            <p className="text-white/25 text-[11px] mt-2 text-right font-body">
              {synopsis.length}/500
            </p>
          </motion.div>

          {/* ── Format selector ────────────────────────── */}
          <motion.div {...stagger(sectionIndex++)} className="mb-12 w-full">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-4 block text-center">
              Format
            </label>
            <div className="flex flex-wrap justify-center gap-2.5">
              {FORMATS.map((f) => {
                const isSelected = format === f.id;
                const isSoon = f.id !== "novel";
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`relative px-4 py-2.5 rounded-full border backdrop-blur-xl transition-all duration-300 cursor-pointer group ${
                      isSelected
                        ? "bg-amber/15 border-amber/30 text-amber shadow-[0_0_20px_rgba(200,150,60,0.08)]"
                        : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="text-[13px] font-body font-medium">{f.label}</span>
                    {isSoon && (
                      <span className="ml-2 text-[9px] uppercase tracking-wider text-lavender/70 bg-lavender/10 px-1.5 py-0.5 rounded-full align-middle">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {format !== "novel" && (
              <p className="text-lavender/60 text-[11px] mt-3 italic text-center font-body">
                The {FORMATS.find((f) => f.id === format)?.label} editor is coming soon. Your story
                will use the novel editor for now.
              </p>
            )}
          </motion.div>

          {/* ── Genre pills ────────────────────────────── */}
          <motion.div {...stagger(sectionIndex++)} className="mb-12 w-full">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-4 block text-center">
              Genres
              {selectedGenres.length > 0 && (
                <span className="ml-2 normal-case tracking-normal text-amber/60 text-[11px]">
                  {selectedGenres.length} selected
                </span>
              )}
            </label>
            <div className="flex flex-wrap justify-center gap-2">
              {GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3.5 py-1.5 rounded-full border text-[12px] font-body transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-amber/20 border-amber/30 text-amber shadow-[0_0_12px_rgba(200,150,60,0.06)]"
                        : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.07]"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ── Content rating ─────────────────────────── */}
          <motion.div {...stagger(sectionIndex++)} className="mb-12 w-full">
            <label className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-4 block text-center">
              Content Rating
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
              {RATINGS.map((rating) => {
                const isSelected = contentRating === rating.id;
                return (
                  <button
                    key={rating.id}
                    type="button"
                    onClick={() => setContentRating(rating.id)}
                    className={`rounded-xl border p-4 text-center transition-all duration-300 cursor-pointer backdrop-blur-xl ${
                      isSelected
                        ? "bg-amber/10 border-amber/30 shadow-[0_0_20px_rgba(200,150,60,0.06)]"
                        : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.12]"
                    }`}
                  >
                    <p
                      className={`text-[13px] font-medium font-body ${
                        isSelected ? "text-amber" : "text-white/60"
                      }`}
                    >
                      {rating.label}
                    </p>
                    <p className="text-[11px] text-white/30 leading-snug mt-1 font-body">
                      {rating.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ── Submit button ──────────────────────────── */}
          <motion.div
            {...stagger(sectionIndex++)}
            className="flex flex-col items-center gap-4 mb-8"
          >
            <button
              type="submit"
              className="group relative font-display font-semibold px-10 py-4 rounded-full bg-amber text-void text-[15px] flex items-center gap-3 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(200,150,60,0.3)] cursor-pointer overflow-hidden"
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="relative z-10 flex items-center gap-2.5">
                {/* Quill icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 3l-7 7M5 10l-2 5 5-2M12 3l2 2-7 7" />
                </svg>
                Create Story
              </span>
            </button>

            {/* Cancel link */}
            <button
              type="button"
              onClick={() => console.log("Cancel")}
              className="text-white/30 hover:text-white/50 text-[13px] transition-colors duration-300 font-body cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      </div>
    </form>
  );
}
