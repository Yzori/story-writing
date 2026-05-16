"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { GENRES, CONTENT_RATINGS } from "@/config/genres";
import Image from "next/image";
import { compressImage } from "@/client/images";

// ── Format options (shared by solo + co-op) ─────────────────

const FORMATS = [
  { id: "novel", label: "Novel", desc: "Long-form fiction", icon: "M4 2h12a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm2 4v0h8M6 10v0h8M6 14v0h5", soon: false },
  { id: "webtoon", label: "Webtoon", desc: "Vertical scroll comics", icon: "M4 3h16v18H4zM4 9h16M4 15h16", soon: false },
  { id: "poetry", label: "Poetry", desc: "Verse and stanza", icon: "M6 4v0h4M5 8v0h6M7 12v0h3M4 16v0h8M6 20v0h5", soon: false },
  { id: "illustrated", label: "Illustrated", desc: "Art-driven narrative", icon: "M3 3h18v18H3zM3 17l5-5 3.5 3.5 2.5-2.5L21 20M9 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z", soon: false },
  { id: "screenplay", label: "Screenplay", desc: "Script format", icon: "M7 2h10l4 4v14a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2zm2 8h6M9 12h6M9 16h4", soon: false },
];

const POPULAR_GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller",
  "Horror", "Literary Fiction", "Dark Fantasy",
];

// Static per-mode class strings. Tailwind only sees class names that appear as
// literal substrings in the source — dynamic `bg-${x}/10` template literals
// get stripped at build time, so we hand-roll the three combinations here.
// Inline CSS uses `color-mix(...)` instead of `var(--color-X/0.08)` because
// the slash-opacity syntax is Tailwind sugar, not valid CSS inside var().
type AccentKey = "violet" | "teal" | "amber";

const ACCENT: Record<AccentKey, {
  ambientBg: string;
  ambientGlow: string;
  dragRing: string;
  bookGenrePill: string;
  inputFocus: string;
  synopsisFocus: string;
  formatSelected: string;
  formatGlow: string;
  formatTextActive: string;
  formatDescActive: string;
  selectedGenrePill: string;
  genrePillHover: string;
  genreToggleHover: string;
  ratingSelected: string;
  ratingDescActive: string;
  submitBg: string;
  submitHoverShadow: string;
}> = {
  violet: {
    ambientBg: "radial-gradient(ellipse 60% 50% at 50% 35%, color-mix(in srgb, var(--color-violet) 8%, transparent) 0%, transparent 70%)",
    ambientGlow: "0 0 140px color-mix(in srgb, var(--color-violet) 10%, transparent), 0 0 60px color-mix(in srgb, var(--color-violet) 5%, transparent)",
    dragRing: "ring-2 ring-violet/50 ring-inset",
    bookGenrePill: "bg-violet/15 border border-violet/20 text-violet",
    inputFocus: "focus:border-violet/30",
    synopsisFocus: "focus:border-violet/25",
    formatSelected: "bg-violet/10 border-violet/30",
    formatGlow: "0 0 20px color-mix(in srgb, var(--color-violet) 8%, transparent)",
    formatTextActive: "text-violet",
    formatDescActive: "text-violet/50",
    selectedGenrePill: "bg-violet/10 border-violet/20 text-violet",
    genrePillHover: "hover:border-violet/30 hover:text-violet hover:bg-violet/[0.04]",
    genreToggleHover: "hover:text-violet",
    ratingSelected: "bg-violet/10 border-violet/30 text-violet",
    ratingDescActive: "text-violet/60",
    submitBg: "bg-violet text-void",
    submitHoverShadow: "0 0 30px color-mix(in srgb, var(--color-violet) 25%, transparent)",
  },
  teal: {
    ambientBg: "radial-gradient(ellipse 60% 50% at 50% 35%, color-mix(in srgb, var(--color-teal) 8%, transparent) 0%, transparent 70%)",
    ambientGlow: "0 0 140px color-mix(in srgb, var(--color-teal) 10%, transparent), 0 0 60px color-mix(in srgb, var(--color-teal) 5%, transparent)",
    dragRing: "ring-2 ring-teal/50 ring-inset",
    bookGenrePill: "bg-teal/15 border border-teal/20 text-teal",
    inputFocus: "focus:border-teal/30",
    synopsisFocus: "focus:border-teal/25",
    formatSelected: "bg-teal/10 border-teal/30",
    formatGlow: "0 0 20px color-mix(in srgb, var(--color-teal) 8%, transparent)",
    formatTextActive: "text-teal",
    formatDescActive: "text-teal/50",
    selectedGenrePill: "bg-teal/10 border-teal/20 text-teal",
    genrePillHover: "hover:border-teal/30 hover:text-teal hover:bg-teal/[0.04]",
    genreToggleHover: "hover:text-teal",
    ratingSelected: "bg-teal/10 border-teal/30 text-teal",
    ratingDescActive: "text-teal/60",
    submitBg: "bg-teal text-void",
    submitHoverShadow: "0 0 30px color-mix(in srgb, var(--color-teal) 25%, transparent)",
  },
  amber: {
    ambientBg: "radial-gradient(ellipse 60% 50% at 50% 35%, color-mix(in srgb, var(--color-amber) 8%, transparent) 0%, transparent 70%)",
    ambientGlow: "0 0 140px color-mix(in srgb, var(--color-amber) 10%, transparent), 0 0 60px color-mix(in srgb, var(--color-amber) 5%, transparent)",
    dragRing: "ring-2 ring-amber/50 ring-inset",
    bookGenrePill: "bg-amber/15 border border-amber/20 text-amber",
    inputFocus: "focus:border-amber/30",
    synopsisFocus: "focus:border-amber/25",
    formatSelected: "bg-amber/10 border-amber/30",
    formatGlow: "0 0 20px color-mix(in srgb, var(--color-amber) 8%, transparent)",
    formatTextActive: "text-amber",
    formatDescActive: "text-amber/50",
    selectedGenrePill: "bg-amber/10 border-amber/20 text-amber",
    genrePillHover: "hover:border-amber/30 hover:text-amber hover:bg-amber/[0.04]",
    genreToggleHover: "hover:text-amber",
    ratingSelected: "bg-amber/10 border-amber/30 text-amber",
    ratingDescActive: "text-amber/60",
    submitBg: "bg-amber text-void",
    submitHoverShadow: "0 0 30px color-mix(in srgb, var(--color-amber) 25%, transparent)",
  },
};

// ── Main component ──────────────────────────────────────────

type WritingMode = "solo" | "co-op" | "campaign" | null;

export default function CreatePage() {
  const router = useRouter();
  const [writingMode, setWritingMode] = useState<WritingMode>(null);

  // Story details state
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("novel");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [synopsis, setSynopsis] = useState("");
  const [contentRating, setContentRating] = useState("everyone");
  const [contentNotes, setContentNotes] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genreSearch, setGenreSearch] = useState("");
  const [showAllGenres, setShowAllGenres] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const filteredGenres = genreSearch
    ? GENRES.filter((g) => g.toLowerCase().includes(genreSearch.toLowerCase()))
    : showAllGenres
    ? GENRES
    : POPULAR_GENRES;

  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImage(file, 900, 0.8);
      setCoverPreview(dataUrl);
    } catch {}
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length >= 5
        ? prev
        : [...prev, genre]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          format,
          writingMode,
          genres: selectedGenres,
          synopsis: synopsis || undefined,
          contentRating,
          contentNotes: contentNotes.length > 0 ? contentNotes : undefined,
          coverImageUrl: coverPreview || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || "Failed to create story");
        return;
      }

      if (writingMode === "campaign") {
        router.push(`/campaign/${json.data.id}`);
      } else if (writingMode === "co-op") {
        // Co-op stories need team setup first — redirect to story page
        const slug = json.data.slug || json.data.id;
        router.push(`/story/${slug}/workshop?setup=true`);
      } else {
        router.push(`/write/${json.data.id}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 1: Mode selection ──────────────────────────────────

  if (!writingMode) {
    return <ModeSelection onSelect={setWritingMode} />;
  }

  // ── Step 2: Story details ───────────────────────────────────

  const isCampaign = writingMode === "campaign";
  const accentColor: AccentKey = isCampaign ? "violet" : writingMode === "co-op" ? "teal" : "amber";
  const accent = ACCENT[accentColor];
  const modeData = MODES.find((m) => m.id === writingMode)!;

  const ratingLabel = CONTENT_RATINGS.find((r) => r.value === contentRating)?.label;
  const synopsisPreview = synopsis.length > 0
    ? synopsis.length > 70 ? synopsis.slice(0, 70) + "..." : synopsis
    : null;

  return (
    <div className="create-details relative min-h-screen bg-void overflow-x-hidden">
      {/* ── Ambient background ──────────────────────────────── */}
      <div className="create-details-backdrop fixed inset-0 pointer-events-none">
        <Image
          src={modeData.image}
          alt=""
          fill
          sizes="100vw"
          priority
          className="create-details-backdrop-image object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: accent.ambientBg }}
        />
        <div className="create-details-paper-wash absolute inset-0" />
      </div>

      {/* ── Back button ──────────────────────────────────────── */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        onClick={() => setWritingMode(null)}
        className="fixed top-6 left-6 z-50 group cursor-pointer"
      >
        <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border hover:border-border-active backdrop-blur-xl bg-elevated/80 shadow-elevated transition-all text-text-secondary hover:text-paper text-[12px] font-body">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back
        </span>
      </motion.button>

      {/* ── Layout: sticky book + scrolling form ─────────────── */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10"
      >
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
                style={{ boxShadow: accent.ambientGlow }}
              />

              {/* Book container with page edges */}
              <div className="relative">
                {/* Page edges (right side) */}
                <div
                  className="absolute top-[3px] -right-[7px] bottom-[3px] w-[7px] rounded-r-sm pointer-events-none"
                  style={{
                    background: "repeating-linear-gradient(to bottom, rgba(180,170,155,0.08) 0px, rgba(180,170,155,0.04) 1px, rgba(180,170,155,0.08) 2px)",
                    boxShadow: "var(--t-shadow-card)",
                  }}
                />
                {/* Page edges (bottom) */}
                <div
                  className="absolute -bottom-[6px] left-[8px] right-[2px] h-[6px] rounded-b-sm pointer-events-none"
                  style={{
                    background: "repeating-linear-gradient(to right, rgba(180,170,155,0.06) 0px, rgba(180,170,155,0.03) 1px, rgba(180,170,155,0.06) 2px)",
                    boxShadow: "var(--t-shadow-card)",
                  }}
                />

                <div className="create-details-book relative w-full max-w-[280px] sm:max-w-[340px] md:w-[400px] md:max-w-none rounded-2xl overflow-hidden border border-border shadow-elevated">
                  {/* Spine effect */}
                  <div
                    className="absolute top-0 left-0 w-[7px] h-full z-30 pointer-events-none"
                    style={{
                      background: "linear-gradient(to right, color-mix(in srgb, var(--t-paper) 18%, transparent), color-mix(in srgb, var(--t-paper) 6%, transparent) 42%, transparent)",
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
                        isDragging ? accent.dragRing : ""
                      }`}
                    >
                      {coverPreview ? (
                        <>
                          <Image src={coverPreview} alt="Cover" fill sizes="200px" className="object-cover" unoptimized />
                          <div className="absolute inset-0 bg-void/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
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
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-elevated/85 backdrop-blur-md text-paper flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose hover:text-void"
                          >
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M3 3l6 6M9 3l-6 6" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        /* Default: mode image as placeholder cover */
                        <div className="absolute inset-0 overflow-hidden">
                          <Image
                            src={modeData.image}
                            alt=""
                            fill
                            sizes="(min-width: 768px) 400px, 80vw"
                            className="create-details-cover-image object-cover"
                          />
                          {/* Upload prompt overlay */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/25">
                            {/* Corner marks */}
                            <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-border-active" />
                            <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-border-active" />
                            <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-border-active" />
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-border-active" />

                            <div className="opacity-60 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-secondary mb-2">
                                <rect x="3" y="3" width="22" height="22" rx="2" />
                                <circle cx="10" cy="10" r="2" />
                                <path d="M3 21l6-6 4 4 3-3 9 9" />
                              </svg>
                              <p className="text-text-secondary text-[12px] font-body mb-0.5">Add cover</p>
                              <p className="text-text-ghost text-[10px] font-body">600 &times; 900</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom gradient into title zone */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface via-surface/60 to-transparent pointer-events-none z-10" />
                  </div>

                  {/* ── Title zone ────────────────────────── */}
                  <div className="relative bg-surface/95 backdrop-blur-xl px-5 py-4 border-t border-border">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Untitled Story"
                      className="w-full bg-transparent font-display text-lg text-paper outline-none placeholder:text-text-ghost border-none leading-snug"
                    />

                    {/* Synopsis preview */}
                    <AnimatePresence>
                      {synopsisPreview && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-[11px] text-text-secondary italic font-body mt-1.5 leading-relaxed overflow-hidden"
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
                            className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] rounded-full ${accent.bookGenrePill} font-body`}
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
                            className="px-1.5 py-0.5 text-[9px] text-text-ghost font-body"
                          >
                            +{selectedGenres.length - 3}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {contentRating && contentRating !== "G" && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.7, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.7, y: -4 }}
                            transition={{ type: "spring", stiffness: 400, damping: 22 }}
                            className="px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] rounded-full bg-elevated border border-border text-text-secondary font-body ml-auto"
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
              style={{ boxShadow: accent.ambientGlow }}
            />

            {/* Form card */}
            <div className="create-details-form-panel relative rounded-xl border border-border bg-surface/95 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-elevated">
              {/* Top edge highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-active to-transparent rounded-t-xl" />

              <div className="space-y-9">
                {/* Title input */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-3 block font-body">
                    {isCampaign ? "Adventure Title" : "Story Title"}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isCampaign ? "Untitled Adventure" : "Untitled Story"}
                    className={`w-full font-display text-2xl text-paper bg-transparent outline-none placeholder:text-text-secondary/50 border-b border-border pb-3 ${accent.inputFocus} transition-colors`}
                    required
                  />
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-3 rounded-xl border border-rose/25 bg-rose/5 text-rose text-[13px] flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                      <circle cx="7" cy="7" r="6" />
                      <path d="M7 4v3M7 9v.5" />
                    </svg>
                    {error}
                  </motion.div>
                )}

                {/* Synopsis */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                >
                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-3 block font-body">
                    {isCampaign ? "Adventure Premise" : "Synopsis"}
                  </label>
                  <textarea
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder={
                      isCampaign
                        ? "Set the stage. What world will your players step into?"
                        : "A brief description of your story. What will draw readers in?"
                    }
                    rows={4}
                    className={`w-full bg-elevated border border-border rounded-xl px-4 py-3.5 text-[13px] text-text font-body outline-none placeholder:text-text-secondary/50 placeholder:italic transition-all resize-none leading-relaxed ${accent.synopsisFocus}`}
                  />
                  <p className="text-[11px] text-text-ghost mt-1.5">{synopsis.length}/500</p>
                </motion.div>

                {/* Format — only for solo + co-op */}
                {!isCampaign && (
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
                            onClick={() => setFormat(f.id)}
                            className={`relative flex flex-col items-center gap-2 px-3 py-4 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? accent.formatSelected
                                : "border-border hover:border-border-active bg-elevated"
                            }`}
                            style={isSelected ? { boxShadow: accent.formatGlow } : undefined}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={isSelected ? accent.formatTextActive : "text-text-secondary"}>
                              <path d={f.icon} />
                            </svg>
                            <span className={`text-[12px] font-medium font-body ${isSelected ? accent.formatTextActive : "text-text-secondary"}`}>
                              {f.label}
                            </span>
                            <span className={`text-[10px] leading-tight font-body ${isSelected ? accent.formatDescActive : "text-text-tertiary"}`}>
                              {f.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {format !== "novel" && (
                      <p className="text-[11px] text-text-ghost mt-2.5">
                        Each format has its own dedicated editor tuned to that medium.
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Adventure-specific GM hint */}
                {isCampaign && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.36 }}
                    className="rounded-xl border border-violet/20 p-5 relative overflow-hidden bg-violet/[0.03]"
                  >
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet/8 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-start gap-3.5 relative z-10">
                      <div className="w-9 h-9 rounded-lg bg-violet/10 border border-violet/15 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet">
                          <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.5-.8z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-paper text-[13px] font-display font-semibold mb-1">You&apos;ll be the Game Master</p>
                        <p className="text-text-secondary text-[12px] leading-relaxed">
                          Create sessions, narrate the world, and guide your players through the story.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Genres */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.44 }}
                >
                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-3 block font-body">
                    {isCampaign ? "Setting & Genres" : "Genres"}
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
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${accent.selectedGenrePill} text-[11px] font-body`}
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
                      className={`w-full bg-elevated border border-border rounded-lg pl-9 pr-3 py-2 text-[13px] text-text font-body outline-none placeholder:text-text-secondary/50 ${accent.synopsisFocus} transition-colors`}
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
                            ? "border-border-subtle text-text-tertiary/50 cursor-default"
                            : `border-border text-text-secondary ${accent.genrePillHover}`
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
                      className={`mt-2.5 text-[11px] text-text-ghost ${accent.genreToggleHover} transition-colors font-body cursor-pointer`}
                    >
                      {showAllGenres ? "Show less" : `Browse all ${GENRES.length} genres \u2192`}
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
                    {CONTENT_RATINGS.map((rating) => {
                      const isSelected = contentRating === rating.value;
                      return (
                        <button
                          key={rating.value}
                          type="button"
                          onClick={() => setContentRating(rating.value)}
                          className={`px-4 py-2 rounded-xl border text-[12px] font-body transition-all duration-200 cursor-pointer flex flex-col items-start ${
                            isSelected
                              ? accent.ratingSelected
                              : "border-border text-text-secondary bg-elevated hover:border-border-active"
                          }`}
                        >
                          <span className="font-medium">{rating.label}</span>
                          <span className={`text-[10px] mt-0.5 ${isSelected ? accent.ratingDescActive : "text-text-tertiary"}`}>
                            {rating.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Content Notes */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.56 }}
                >
                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-secondary mb-1.5 block font-body">
                    Content Notes
                  </label>
                  <p className="text-[11px] text-text-ghost mb-3 font-body">
                    Help readers make informed choices
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Violence", "Gore", "Sexual Content", "Strong Language", "Self-Harm",
                      "Substance Use", "Abuse", "Horror", "Death", "Discrimination",
                    ].map((note) => {
                      const isSelected = contentNotes.includes(note);
                      return (
                        <button
                          key={note}
                          type="button"
                          onClick={() =>
                            setContentNotes((prev) =>
                              prev.includes(note)
                                ? prev.filter((n) => n !== note)
                                : prev.length >= 10
                                ? prev
                                : [...prev, note]
                            )
                          }
                          className={`px-2.5 py-1 rounded-full text-[11px] border font-body transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? `bg-amber/10 text-amber border-amber/30`
                              : "border-border text-text-secondary hover:border-border-active hover:bg-elevated"
                          }`}
                        >
                          {note}
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
                    disabled={isSubmitting}
                    className={`group relative font-display font-semibold px-8 py-3.5 rounded-full transition-all duration-300 text-[14px] flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden cursor-pointer hover:scale-[1.02] ${
                      isCampaign
                        ? "bg-violet text-white"
                        : accent.submitBg
                    }`}
                    style={{ ["--submit-hover-shadow" as string]: accent.submitHoverShadow }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = accent.submitHoverShadow;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "";
                    }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    <span className="relative z-10 flex items-center gap-2.5">
                      {isSubmitting ? (
                        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : isCampaign ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M8 1l2 4 4.4.6-3.2 3.1.8 4.3L8 11l-4 2 .8-4.3L1.6 5.6 6 5z" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 3l-7 7M5 10l-2 5 5-2M12 3l2 2-7 7" />
                        </svg>
                      )}
                      {isSubmitting
                        ? "Creating..."
                        : isCampaign
                        ? "Launch Adventure"
                        : "Create Story"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWritingMode(null)}
                    className="text-text-ghost hover:text-text-secondary text-[13px] transition-colors font-body cursor-pointer"
                  >
                    Cancel
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.form>
    </div>
  );
}

// ── Mode Selection (Step 1) — Card Panels ─────────────────

const MODES = [
  {
    id: "solo" as WritingMode,
    title: "The Study",
    subtitle: "Write solo",
    description: "A quiet room. A desk by the window. Your story, your pace.",
    features: ["Rich prose editor", "Story bible", "Export anywhere"],
    image: "/solo_story_mode.png",
    color: "amber",
    glowColor: "bg-amber/30",
    borderColor: "border-amber/40",
    textColor: "text-amber",
  },
  {
    id: "co-op" as WritingMode,
    title: "The Workshop",
    subtitle: "Collaborate on a story",
    description: "A long table. Maps and manuscripts. Stories charted side by side.",
    features: ["Invite collaborators", "Shared lore book", "Agreements & credit"],
    image: "/coop_story_mode.png",
    color: "teal",
    glowColor: "bg-teal/30",
    borderColor: "border-teal/40",
    textColor: "text-teal",
  },
  {
    id: "campaign" as WritingMode,
    title: "The Tavern",
    subtitle: "Run an adventure",
    description: "A round table. Dice on wood. Heroes waiting for their tale.",
    features: ["GM narration & turns", "Character sheets", "Session adventures"],
    badge: "New",
    image: "/adventure_mode.png",
    color: "violet",
    glowColor: "bg-violet/30",
    borderColor: "border-violet/40",
    textColor: "text-violet",
  },
];

function ModeSelection({
  onSelect,
}: {
  onSelect: (mode: WritingMode) => void;
}) {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<WritingMode>(null);

  const handleSelect = (mode: WritingMode) => {
    setSelectedMode(mode);
    setTimeout(() => onSelect(mode), 1000);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-void">
      {/* Dynamic Ambient Background — blurs with enough weight to register in light mode */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet/8 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-amber/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-teal/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: selectedMode ? 0 : 1,
          y: selectedMode ? -40 : 0,
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-12 relative z-10"
      >
        <p className="font-display text-[12px] uppercase tracking-[0.25em] text-text-ghost mb-4">
          Choose your path
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-paper font-medium tracking-tight">
          Open a New Chapter
        </h1>
      </motion.div>

      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-[700px] relative z-10">
        {MODES.map((mode) => {
          const isHovered = hoveredMode === mode.id;
          const isSelected = selectedMode === mode.id;
          const isOtherSelected = selectedMode !== null && !isSelected;

          return (
            <motion.button
              key={mode.id}
              layout
              initial={{ opacity: 0, y: 40 }}
              animate={{
                opacity: isOtherSelected ? 0 : 1,
                y: isOtherSelected ? 20 : 0,
                flex: isSelected ? 3 : isHovered ? 1.5 : 1,
                scale: isSelected ? 1.02 : 1,
              }}
              transition={{
                opacity: { duration: 0.4 },
                y: { duration: 0.6, ease: "easeOut" },
                flex: { type: "spring", stiffness: 200, damping: 25 },
                scale: { duration: 0.6, ease: "backOut" },
                layout: { type: "spring", stiffness: 200, damping: 25 },
              }}
              onMouseEnter={() => !selectedMode && setHoveredMode(mode.id)}
              onMouseLeave={() => !selectedMode && setHoveredMode(null)}
              onClick={() => !selectedMode && handleSelect(mode.id)}
              disabled={!!selectedMode}
              className={`relative rounded-3xl overflow-hidden group border border-border bg-surface focus:outline-none transition-all duration-500 cursor-pointer shadow-card ${
                isHovered && !selectedMode ? `shadow-card-hover ` + mode.borderColor : ""
              } ${isSelected ? `shadow-card-hover ` + mode.borderColor : ""}`}
            >
              {/* Background Image Container */}
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                <motion.img
                  src={mode.image}
                  alt={mode.title}
                  animate={{ scale: isHovered || isSelected ? 1.05 : 1 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className={`w-full h-full object-cover ${
                    isHovered || isSelected ? "card-image-active" : "card-image-dim"
                  }`}
                />

                {/* Vignette & Gradients — fade into the card's own surface color so light mode looks clean */}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent opacity-95" />
                <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-transparent to-transparent opacity-60" />

                {/* Selection Glow Flash */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.4, 0] }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className={`absolute inset-0 ${mode.glowColor} mix-blend-overlay`}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Content Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end h-full">

                {/* Top Badge Overlay */}
                <div className="absolute top-6 left-6 flex justify-between w-[calc(100%-3rem)]">
                  {mode.badge && (
                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-bold rounded-full bg-surface/80 backdrop-blur-md border border-${mode.color}/30 ${mode.textColor} shadow-sm`}>
                      {mode.badge}
                    </span>
                  )}
                </div>

                <div className="relative z-20 w-full flex flex-col items-start text-left">
                  <motion.p
                    animate={{
                      color: isHovered || isSelected ? `var(--color-${mode.color})` : "var(--color-text-ghost)"
                    }}
                    className={`text-[12px] uppercase tracking-[0.15em] mb-2 transition-colors duration-300 ${mode.textColor}`}
                  >
                    {mode.subtitle}
                  </motion.p>

                  <motion.h2
                    layout="position"
                    className="font-display text-3xl sm:text-4xl font-medium text-paper mb-4"
                  >
                    {mode.title}
                  </motion.h2>

                  <AnimatePresence>
                    {(isHovered || isSelected) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: 10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-full overflow-hidden"
                      >
                        <div className="pt-4 border-t border-border mt-2">
                          <p className="text-text-secondary text-[14px] leading-relaxed mb-6 font-body">
                            {mode.description}
                          </p>

                          <ul className="space-y-3">
                            {mode.features.map((feat, i) => (
                              <motion.li
                                key={feat}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 + 0.1 }}
                                className="flex items-center gap-3 text-text text-[13px] font-medium"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full bg-${mode.color} shadow-[0_0_8px_currentColor]`} />
                                {feat}
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        {/* Selected State Arrow Indicator */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.5 }}
                              className="mt-8 flex justify-end w-full"
                            >
                              <div className={`w-10 h-10 rounded-full bg-${mode.color}/20 border border-${mode.color}/50 flex items-center justify-center text-${mode.color} backdrop-blur-md`}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M4 10h12M12 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        animate={{ opacity: selectedMode ? 0 : 1, y: selectedMode ? 20 : 0 }}
        className="mt-10 text-center relative z-10 h-6"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={hoveredMode ?? "default"}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="text-text-ghost text-[13px] italic font-body max-w-md mx-auto"
          >
            {hoveredMode === "solo"
              ? "Perfect for novels, short stories, poetry, and screenplays."
              : hoveredMode === "co-op"
              ? "Best for shared universes, anthology projects, and collaborative writing teams."
              : hoveredMode === "campaign"
              ? "Think a TTRPG meets collaborative fiction. You become the Game Master."
              : "Decide how you want to weave your next tale."}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Import existing manuscript */}
      <ImportEntry disabled={!!selectedMode} />
    </div>
  );
}

function ImportEntry({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File) => {
    if (importing) return;
    setError(null);
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("We only support .docx for now.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. 10 MB max.");
      return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/stories/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.data?.id) {
        setError(json.error?.message || "Import failed.");
        setImporting(false);
        return;
      }
      router.push(`/write/${json.data.id}`);
    } catch {
      setError("Network error. Try again.");
      setImporting(false);
    }
  };

  if (disabled) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-center"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="text-[12px] text-text-ghost hover:text-amber transition-colors disabled:opacity-50 inline-flex items-center gap-2"
      >
        {importing ? (
          <>
            <span className="w-3 h-3 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
            Importing your manuscript…
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 11V3M8 3l-3 3M8 3l3 3" />
              <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2" />
            </svg>
            Or import a .docx manuscript
          </>
        )}
      </button>
      {error && <p className="text-[11px] text-rose mt-2">{error}</p>}
    </motion.div>
  );
}
