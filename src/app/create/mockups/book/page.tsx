"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Data ────────────────────────────────────────────────────

const GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller",
  "Horror", "Literary Fiction", "Historical Fiction", "Contemporary",
  "Adventure", "Dystopian", "Magical Realism", "Urban Fantasy",
  "Dark Academia", "Mythology", "Steampunk", "Cyberpunk", "Gothic",
  "Paranormal", "Comedy", "Drama", "Psychological", "Crime", "Slice of Life",
];

const FORMATS = [
  { id: "novel", label: "Novel", desc: "Long-form prose fiction", icon: "M4 2h12a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm2 4v0h8M6 10v0h8M6 14v0h5", soon: false },
  { id: "webtoon", label: "Webtoon", desc: "Vertical scroll comics", icon: "M4 3h16v18H4zM4 9h16M4 15h16", soon: true },
  { id: "poetry", label: "Poetry", desc: "Verse and stanza", icon: "M6 4v0h4M5 8v0h6M7 12v0h3M4 16v0h8M6 20v0h5", soon: true },
  { id: "illustrated", label: "Illustrated", desc: "Art-driven narrative", icon: "M3 3h18v18H3zM3 17l5-5 3.5 3.5 2.5-2.5L21 20M9 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z", soon: true },
  { id: "screenplay", label: "Screenplay", desc: "Script format", icon: "M7 2h10l4 4v14a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2zm2 8h6M9 12h6M9 16h4", soon: true },
];

const POPULAR_GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller",
  "Horror", "Literary Fiction", "Dark Academia",
];

const RATINGS = [
  { value: "G", label: "General", desc: "All audiences" },
  { value: "PG13", label: "Teen", desc: "13+" },
  { value: "R", label: "Mature", desc: "17+" },
  { value: "MA", label: "Explicit", desc: "Adults only" },
];

// ── Main Component ──────────────────────────────────────────

export default function BookBeingBornMockup() {
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [format, setFormat] = useState("novel");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [contentRating, setContentRating] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");
  const [showAllGenres, setShowAllGenres] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const filteredGenres = genreSearch
    ? GENRES.filter((g) => g.toLowerCase().includes(genreSearch.toLowerCase()))
    : showAllGenres
    ? GENRES
    : POPULAR_GENRES;

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length >= 5
        ? prev
        : [...prev, genre]
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
    console.log({ title, synopsis, format, genres: selectedGenres, contentRating });
  };

  const ratingLabel = RATINGS.find((r) => r.value === contentRating)?.label;
  const synopsisPreview = synopsis.length > 0
    ? synopsis.length > 70 ? synopsis.slice(0, 70) + "..." : synopsis
    : null;

  return (
    <div className="relative min-h-screen bg-void overflow-x-hidden">
      {/* ── Ambient background ──────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <img
          src="/adventure_mode.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.1) blur(4px) saturate(0.5)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(126,94,158,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-void/50 via-transparent to-void/90" />
      </div>

      {/* ── Back button ──────────────────────────────────────── */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        onClick={() => window.history.back()}
        className="fixed top-6 left-6 z-50 group cursor-pointer"
      >
        <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 hover:border-white/20 backdrop-blur-xl bg-white/5 transition-all text-text-ghost hover:text-paper text-[12px] font-body">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back
        </span>
      </motion.button>

      {/* ── Layout: sticky book + scrolling form ─────────────── */}
      <form onSubmit={handleSubmit} className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-20 pb-20 flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">

          {/* ── LEFT: The Book (sticky) ──────────────────────── */}
          <div className="w-full lg:w-auto lg:sticky lg:top-20 flex flex-col items-center lg:items-start shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Ambient glow behind book */}
              <div
                className="absolute -inset-10 rounded-3xl pointer-events-none"
                style={{ boxShadow: "0 0 80px rgba(126,94,158,0.1)" }}
              />

              {/* Book container with page edges */}
              <div className="relative">
                {/* Page edges (right side) */}
                <div
                  className="absolute top-[3px] -right-[7px] bottom-[3px] w-[7px] rounded-r-sm pointer-events-none"
                  style={{
                    background: "repeating-linear-gradient(to bottom, rgba(180,170,155,0.08) 0px, rgba(180,170,155,0.04) 1px, rgba(180,170,155,0.08) 2px)",
                    boxShadow: "1px 0 3px rgba(0,0,0,0.3)",
                  }}
                />
                {/* Page edges (bottom) */}
                <div
                  className="absolute -bottom-[6px] left-[8px] right-[2px] h-[6px] rounded-b-sm pointer-events-none"
                  style={{
                    background: "repeating-linear-gradient(to right, rgba(180,170,155,0.06) 0px, rgba(180,170,155,0.03) 1px, rgba(180,170,155,0.06) 2px)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                />

                <div className="relative w-[400px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
                  {/* Spine effect */}
                  <div
                    className="absolute top-0 left-0 w-[7px] h-full z-30 pointer-events-none"
                    style={{
                      background: "linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0.1) 40%, transparent)",
                    }}
                  />

                  {/* ── Cover zone (2:3 ratio) ────────────── */}
                  <div className="relative" style={{ aspectRatio: "2/3" }}>
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
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleCoverFile(f);
                      }}
                      className={`absolute inset-0 cursor-pointer group transition-all duration-300 ${
                        isDragging ? "ring-2 ring-violet/50 ring-inset" : ""
                      }`}
                    >
                      {coverPreview ? (
                        <>
                          <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-void/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-paper">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M3 17l5-5 3.5 3.5 2.5-2.5L21 20" />
                            </svg>
                            <p className="text-paper text-[12px] font-body">Change cover</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCoverPreview(null); }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-void/70 backdrop-blur-md text-paper flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose/80"
                          >
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M3 3l6 6M9 3l-6 6" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        /* Default: mode image as placeholder cover */
                        <div className="absolute inset-0 overflow-hidden">
                          <img
                            src="/adventure_mode.png"
                            alt=""
                            className="w-full h-full object-cover"
                            style={{ filter: "brightness(0.25) saturate(0.5)" }}
                          />
                          {/* Upload prompt overlay */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/30">
                            {/* Corner marks */}
                            <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-white/20" />
                            <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-white/20" />
                            <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-white/20" />
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-white/20" />

                            <div className="opacity-60 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/50 mb-2">
                                <rect x="3" y="3" width="22" height="22" rx="2" />
                                <circle cx="10" cy="10" r="2" />
                                <path d="M3 21l6-6 4 4 3-3 9 9" />
                              </svg>
                              <p className="text-white/50 text-[12px] font-body mb-0.5">Add cover</p>
                              <p className="text-white/25 text-[10px] font-body">600 &times; 900</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom gradient into title zone */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-void/95 via-void/60 to-transparent pointer-events-none z-10" />
                  </div>

                  {/* ── Title zone ────────────────────────── */}
                  <div className="relative bg-void/95 backdrop-blur-xl px-5 py-4">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Untitled Story"
                      className="w-full bg-transparent font-display text-lg text-paper outline-none placeholder:text-white/20 border-none leading-snug"
                    />

                    {/* Author name on book */}
                    <AnimatePresence>
                      {authorName && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-[11px] text-white/40 font-body mt-0.5 tracking-wide overflow-hidden"
                        >
                          by {authorName}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Synopsis preview */}
                    <AnimatePresence>
                      {synopsisPreview && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-[11px] text-white/30 italic font-body mt-1.5 leading-relaxed overflow-hidden"
                        >
                          {synopsisPreview}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Live preview pills */}
                    <div className="flex items-center gap-1.5 mt-2.5 min-h-[20px] flex-wrap">
                      <AnimatePresence mode="popLayout">
                        {selectedGenres.slice(0, 3).map((genre) => (
                          <motion.span
                            key={genre}
                            initial={{ opacity: 0, scale: 0.7, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.7, y: -4 }}
                            transition={{ type: "spring", stiffness: 400, damping: 22 }}
                            className="px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] rounded-full bg-violet/15 border border-violet/20 text-violet font-body"
                          >
                            {genre}
                          </motion.span>
                        ))}
                        {selectedGenres.length > 3 && (
                          <motion.span
                            key="overflow"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            className="px-1.5 py-0.5 text-[9px] text-white/30 font-body"
                          >
                            +{selectedGenres.length - 3}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {contentRating && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.7, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.7, y: -4 }}
                            transition={{ type: "spring", stiffness: 400, damping: 22 }}
                            className="px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] rounded-full bg-white/5 border border-white/10 text-text-secondary font-body ml-auto"
                          >
                            {ratingLabel}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: Form fields ───────────────────────────── */}
          <div className="flex-1 min-w-0 w-full lg:max-w-xl">
            {/* Ambient glow behind form */}
            <div
              className="absolute -inset-8 rounded-3xl pointer-events-none hidden lg:block"
              style={{ boxShadow: "0 0 140px rgba(126,94,158,0.1), 0 0 60px rgba(126,94,158,0.05)" }}
            />

            {/* Form card */}
            <div className="relative rounded-2xl border border-white/[0.08] bg-surface/80 backdrop-blur-xl p-8 lg:p-10 shadow-2xl shadow-black/40">
            {/* Top edge highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent rounded-t-2xl" />

            <div className="space-y-9">
              {/* Title input (right side — larger, for actual editing) */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-3 block font-body">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled Story"
                  className="w-full font-display text-2xl text-paper bg-transparent outline-none placeholder:text-text-secondary/50 border-b border-white/[0.06] pb-3 focus:border-violet/30 transition-colors"
                />
              </motion.div>

              {/* Author / Pen Name */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
              >
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-3 block font-body">
                  Author Name
                  <span className="text-text-ghost/40 ml-2 normal-case tracking-normal text-[11px]">
                    pen name or real name
                  </span>
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name as it appears on the cover"
                  className="w-full font-body text-[15px] text-paper bg-transparent outline-none placeholder:text-text-secondary/50 border-b border-white/[0.06] pb-3 focus:border-violet/30 transition-colors"
                />
              </motion.div>

              {/* Synopsis */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
              >
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-3 block font-body">
                  Synopsis
                </label>
                <textarea
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="What will draw readers in?"
                  rows={4}
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-3.5 text-[13px] text-text font-body outline-none placeholder:text-text-secondary/50 placeholder:italic transition-all resize-none leading-relaxed focus:border-violet/25"
                />
                <p className="text-[11px] text-text-ghost mt-1.5">{synopsis.length}/500</p>
              </motion.div>

              {/* Format */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 }}
              >
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-3 block font-body">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {FORMATS.map((f) => {
                    const isSelected = format === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => !f.soon && setFormat(f.id)}
                        className={`relative flex flex-col items-center gap-2 px-3 py-4 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-violet/10 border-violet/30 shadow-[0_0_20px_rgba(126,94,158,0.08)]"
                            : "border-white/[0.08] hover:border-white/15 bg-elevated/70"
                        } ${f.soon ? "opacity-40 cursor-default" : ""}`}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={isSelected ? "text-violet" : "text-text-secondary"}>
                          <path d={f.icon} />
                        </svg>
                        <span className={`text-[12px] font-medium font-body ${isSelected ? "text-violet" : "text-text-secondary"}`}>
                          {f.label}
                        </span>
                        <span className={`text-[10px] leading-tight font-body ${isSelected ? "text-violet/50" : "text-text-tertiary"}`}>
                          {f.desc}
                        </span>
                        {f.soon && (
                          <span className="absolute top-2 right-2 text-[8px] uppercase tracking-wider text-lavender/60 bg-lavender/10 px-1.5 py-0.5 rounded-full">
                            Soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Genres */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.44 }}
              >
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-3 block font-body">
                  Genres
                  <span className="text-text-tertiary ml-2 normal-case tracking-normal text-[11px]">
                    {selectedGenres.length}/5
                  </span>
                </label>

                {/* Selected genres as removable tags */}
                <AnimatePresence>
                  {selectedGenres.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-1.5 mb-3 overflow-hidden"
                    >
                      {selectedGenres.map((genre) => (
                        <motion.span
                          key={genre}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ type: "spring", stiffness: 400, damping: 22 }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet/10 border border-violet/20 text-violet text-[11px] font-body"
                        >
                          {genre}
                          <button
                            type="button"
                            onClick={() => toggleGenre(genre)}
                            className="hover:text-paper transition-colors ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search input */}
                <div className="relative mb-3">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost pointer-events-none">
                    <circle cx="6.5" cy="6.5" r="5" />
                    <path d="M10.5 10.5L14 14" />
                  </svg>
                  <input
                    type="text"
                    value={genreSearch}
                    onChange={(e) => { setGenreSearch(e.target.value); if (e.target.value) setShowAllGenres(true); }}
                    placeholder="Search genres..."
                    className="w-full bg-elevated border border-border rounded-lg pl-9 pr-3 py-2 text-[13px] text-text font-body outline-none placeholder:text-text-secondary/50 focus:border-violet/25 transition-colors"
                  />
                </div>

                {/* Genre pills */}
                <div className="flex flex-wrap gap-1.5">
                  {filteredGenres.filter((g) => !selectedGenres.includes(g)).map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      disabled={selectedGenres.length >= 5}
                      className={`px-3 py-1.5 rounded-full border text-[12px] font-body transition-all duration-200 cursor-pointer ${
                        selectedGenres.length >= 5
                          ? "border-white/[0.06] text-text-tertiary/40 cursor-default"
                          : "border-white/[0.08] text-text-secondary hover:border-violet/30 hover:text-violet hover:bg-violet/[0.04]"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                  {filteredGenres.filter((g) => !selectedGenres.includes(g)).length === 0 && genreSearch && (
                    <p className="text-[12px] text-text-ghost/50 italic font-body py-1">No genres match &ldquo;{genreSearch}&rdquo;</p>
                  )}
                </div>

                {/* Show all / show less toggle */}
                {!genreSearch && (
                  <button
                    type="button"
                    onClick={() => setShowAllGenres(!showAllGenres)}
                    className="mt-2.5 text-[11px] text-text-ghost hover:text-violet transition-colors font-body cursor-pointer"
                  >
                    {showAllGenres ? "Show less" : `Browse all ${GENRES.length} genres →`}
                  </button>
                )}
              </motion.div>

              {/* Content Rating */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.52 }}
              >
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-3 block font-body">
                  Content Rating
                </label>
                <div className="flex flex-wrap gap-2">
                  {RATINGS.map((rating) => {
                    const isSelected = contentRating === rating.value;
                    return (
                      <button
                        key={rating.value}
                        type="button"
                        onClick={() => setContentRating(rating.value)}
                        className={`px-4 py-2 rounded-xl border text-[12px] font-body transition-all duration-200 cursor-pointer flex flex-col items-start ${
                          isSelected
                            ? "bg-violet/10 border-violet/30 text-violet"
                            : "border-white/[0.08] text-text-secondary bg-elevated/70 hover:border-white/15"
                        }`}
                      >
                        <span className="font-medium">{rating.label}</span>
                        <span className={`text-[10px] mt-0.5 ${isSelected ? "text-violet/60" : "text-text-tertiary"}`}>
                          {rating.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Submit */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-4 pt-4"
              >
                <button
                  type="submit"
                  className="group relative font-display font-semibold px-8 py-3.5 rounded-full bg-violet text-white text-[14px] flex items-center gap-2.5 transition-all duration-300 hover:shadow-[0_0_30px_rgba(126,94,158,0.25)] hover:scale-[1.02] cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  <span className="relative z-10 flex items-center gap-2.5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 1l2 4 4.4.6-3.2 3.1.8 4.3L8 11l-4 2 .8-4.3L1.6 5.6 6 5z" />
                    </svg>
                    Launch Adventure
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="text-text-ghost hover:text-text-secondary text-[13px] transition-colors font-body cursor-pointer"
                >
                  Cancel
                </button>
              </motion.div>
            </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
