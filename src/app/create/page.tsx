"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { GENRES, CONTENT_RATINGS } from "@/lib/genres";
import GenrePill from "@/components/shared/GenrePill";
import { compressImage } from "@/lib/images";

// ── Format options (shared by solo + co-op) ─────────────────

const FORMATS = [
  {
    id: "novel",
    label: "Novel",
    description: "Traditional chapters with rich text",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 4h12M4 8h10M4 12h8M4 16h12" />
      </svg>
    ),
  },
  {
    id: "webtoon",
    label: "Webtoon",
    description: "Vertical-scroll illustrated panels",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="2" width="12" height="6" rx="1" />
        <rect x="4" y="10" width="12" height="8" rx="1" />
      </svg>
    ),
  },
  {
    id: "poetry",
    label: "Poetry",
    description: "Verse and stanza formatting",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 4h8M8 8h6M5 12h7M7 16h5" />
      </svg>
    ),
  },
  {
    id: "illustrated",
    label: "Illustrated Novel",
    description: "Chapters with inline artwork",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <circle cx="7" cy="7" r="1.5" />
        <path d="M3 14l4-4 3 3 2-2 5 5" />
      </svg>
    ),
  },
  {
    id: "screenplay",
    label: "Screenplay",
    description: "Script-formatted dialogue and action",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="2" width="14" height="16" rx="1" />
        <path d="M7 6h6M8 9h4M7 12h6M9 15h2" />
      </svg>
    ),
  },
];

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
  const [isDragging, setIsDragging] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImage(file, 900, 0.8);
      setCoverPreview(dataUrl);
    } catch {}
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
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
  const accentColor = isCampaign ? "violet" : writingMode === "co-op" ? "teal" : "amber";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Back to mode selection — page-turn feel */}
        <motion.button
          type="button"
          onClick={() => setWritingMode(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="group flex items-center gap-2 text-text-ghost hover:text-amber transition-colors text-[13px] mb-10 cursor-pointer font-body"
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-border-subtle group-hover:border-amber/30 transition-colors">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </span>
          <span className="italic">Turn back a page</span>
        </motion.button>

        {/* Page heading */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center justify-center gap-2.5 mb-4"
          >
            <span className={`px-3 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold rounded-full border ${
              isCampaign
                ? "bg-violet/10 text-violet border-violet/20"
                : writingMode === "co-op"
                ? "bg-teal/10 text-teal border-teal/20"
                : "bg-amber/10 text-amber border-amber/20"
            }`}>
              {writingMode === "co-op" ? "Co-op" : isCampaign ? "Campaign" : "Solo"}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="section-label text-text-ghost mb-5 max-w-xs mx-auto"
          >
            {isCampaign ? "Name Your Campaign" : "Begin a New Story"}
          </motion.div>

          {/* Manuscript-style title input with gold underline */}
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isCampaign ? "Untitled Campaign" : "Untitled Story"}
              className="w-full text-center font-display text-3xl sm:text-4xl text-paper bg-transparent outline-none placeholder:text-text-ghost/40 border-none pb-3"
              required
            />
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-px transition-all duration-500 ${
              title
                ? isCampaign ? "w-full bg-gradient-to-r from-transparent via-violet/50 to-transparent" : "w-full bg-gradient-to-r from-transparent via-amber/50 to-transparent"
                : "w-24 bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent"
            }`} />
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 px-4 py-3 card-page !border-rose/25 text-rose text-[13px] flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
              <circle cx="7" cy="7" r="6" />
              <path d="M7 4v3M7 9v.5" />
            </svg>
            {error}
          </motion.div>
        )}

        {/* Format selector -- only for solo + co-op */}
        {!isCampaign && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-12"
          >
            <div className="section-label text-text-ghost mb-4">Format</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {FORMATS.map((f) => {
                const isBeta = f.id !== "novel";
                const isSelected = format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`card-page p-4 text-left transition-all duration-200 relative cursor-pointer ${
                      isSelected
                        ? "!border-amber/35 !shadow-[0_0_20px_rgba(200,150,60,0.08),0_2px_4px_rgba(0,0,0,0.2)] ring-1 ring-amber/10"
                        : "hover:!border-border-active"
                    }`}
                  >
                    {isBeta && (
                      <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider text-lavender/70 bg-lavender/10 px-1.5 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                    <div className={`mb-2 ${isSelected ? "text-amber" : "text-text-tertiary"}`}>
                      {f.icon}
                    </div>
                    <p className={`text-[13px] font-medium mb-0.5 ${isSelected ? "text-paper" : "text-text"}`}>
                      {f.label}
                    </p>
                    <p className="text-[11px] text-text-tertiary leading-snug">
                      {f.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {format !== "novel" && (
              <p className="text-[11px] text-lavender/70 mt-2.5 italic">
                The {FORMATS.find((f) => f.id === format)?.label} editor is coming soon.
                Your story will be created with the novel editor for now.
              </p>
            )}
          </motion.div>
        )}

        {/* Campaign-specific GM hint */}
        {isCampaign && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-12 card-page !border-violet/20 p-5 relative overflow-hidden"
          >
            {/* Mystical ambient glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet/8 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-copper/6 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-start gap-3.5 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet/15 to-copper/10 border border-violet/15 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet">
                  <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.5-.8z" />
                </svg>
              </div>
              <div>
                <p className="text-paper text-sm font-display font-semibold mb-1.5">You&apos;ll be the Game Master</p>
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  Create sessions, narrate the world, and guide your players through the story.
                  After creation, invite players to join and create their characters.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Genre multi-select */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="section-label text-text-ghost mb-4">
            {isCampaign ? "Setting & Genres" : "Genres"}
            {selectedGenres.length > 0 && (
              <span className="text-text-tertiary ml-2 normal-case tracking-normal text-[11px]">
                {selectedGenres.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <GenrePill
                key={genre}
                genre={genre}
                size="md"
                selected={selectedGenres.includes(genre)}
                onClick={() => toggleGenre(genre)}
              />
            ))}
          </div>
        </motion.div>

        {/* Synopsis — aged paper inset */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-12"
        >
          <div className="section-label text-text-ghost mb-4">
            {isCampaign ? "Campaign Premise" : "Synopsis"}
          </div>
          <div className="relative">
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder={
                isCampaign
                  ? "Set the stage. What world will your players step into?"
                  : "A brief description of your story. What will draw readers in?"
              }
              rows={4}
              className={`w-full bg-ink/80 border border-border rounded-xl px-5 py-4 text-[13px] text-text font-body outline-none placeholder:text-text-ghost/60 placeholder:italic transition-all resize-none leading-relaxed ${
                isCampaign
                  ? "focus:border-violet/25 focus:shadow-[0_0_20px_rgba(126,94,158,0.06)]"
                  : "focus:border-amber/25 focus:shadow-[0_0_20px_rgba(200,150,60,0.06)]"
              }`}
              style={{
                backgroundImage: "linear-gradient(165deg, rgba(36,30,22,0.5) 0%, rgba(26,21,16,0.8) 100%)",
              }}
            />
            {/* Parchment corner fold decoration */}
            <div className="absolute top-0 right-0 w-5 h-5 pointer-events-none overflow-hidden rounded-tr-xl">
              <div className="absolute top-0 right-0 w-0 h-0 border-t-[10px] border-t-surface/40 border-l-[10px] border-l-transparent" />
            </div>
          </div>
          <p className="text-[11px] text-text-ghost mt-2 italic">
            {synopsis.length}/500 characters
          </p>
        </motion.div>

        {/* Content Rating */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="section-label text-text-ghost mb-4">Content Rating</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CONTENT_RATINGS.map((rating) => {
              const isSelected = contentRating === rating.value;
              return (
                <button
                  key={rating.value}
                  type="button"
                  onClick={() => setContentRating(rating.value)}
                  className={`card-page p-4 text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? `!border-${accentColor}/35 !shadow-[0_0_20px_rgba(200,150,60,0.08),0_2px_4px_rgba(0,0,0,0.2)] ring-1 ring-${accentColor}/10`
                      : "hover:!border-border-active"
                  }`}
                >
                  <p className={`text-[13px] font-medium mb-0.5 ${isSelected ? "text-paper" : "text-text"}`}>
                    {rating.label}
                  </p>
                  <p className="text-[11px] text-text-tertiary leading-snug">
                    {rating.description}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Cover Upload — empty frame on a wall */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-14"
        >
          <div className="section-label text-text-ghost mb-4">Cover Image</div>
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
            className={`relative border-2 border-dashed rounded-xl text-center transition-all duration-300 cursor-pointer overflow-hidden group ${
              isDragging
                ? "border-amber/40 bg-amber/5 shadow-[inset_0_0_30px_rgba(200,150,60,0.05)]"
                : "border-border-subtle hover:border-amber/25 hover:bg-surface/30"
            } ${coverPreview ? "p-0" : "p-14"}`}
          >
            {/* Frame ornament corners */}
            {!coverPreview && (
              <>
                <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-amber/15 rounded-tl-sm pointer-events-none" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-amber/15 rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-amber/15 rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-amber/15 rounded-br-sm pointer-events-none" />
              </>
            )}

            {coverPreview ? (
              <div className="relative group">
                <img src={coverPreview} alt="Cover preview" className="w-full max-h-64 object-contain" />
                <div className="absolute inset-0 bg-void/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-paper text-[13px] font-display">Click to change</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCoverPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-void/80 text-paper flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose/80"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" className="mx-auto text-text-ghost/60 mb-3">
                  {/* Picture frame */}
                  <rect x="4" y="4" width="24" height="24" rx="2" />
                  <rect x="6" y="6" width="20" height="20" rx="1" strokeDasharray="3 3" className="text-text-ghost/30" />
                  <circle cx="13" cy="13" r="2.5" />
                  <path d="M6 24l6-6 4 4 3-3 7 7" />
                </svg>
                <p className="text-text-secondary text-[13px] mb-1">Drag and drop your cover image here</p>
                <p className="text-text-ghost text-[11px] italic">PNG, JPG, or WebP &mdash; 600 x 900px recommended</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Submit — wax seal / spell casting */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flourish w-48 text-text-ghost/40 mb-2" />
          <button
            type="submit"
            disabled={isSubmitting}
            className={`group relative font-display font-semibold px-10 py-3.5 rounded-full transition-all duration-300 text-[15px] flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${
              isCampaign
                ? "bg-violet text-white hover:shadow-[0_0_30px_rgba(126,94,158,0.25)] hover:scale-[1.02]"
                : "bg-amber text-void hover:shadow-[0_0_30px_rgba(200,150,60,0.25)] hover:scale-[1.02]"
            }`}
          >
            {/* Warm glow behind button on hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
              isCampaign
                ? "bg-gradient-to-r from-violet/0 via-white/10 to-violet/0"
                : "bg-gradient-to-r from-amber/0 via-white/15 to-amber/0"
            }`} />
            <span className="relative z-10 flex items-center gap-2.5">
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : isCampaign ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 1l2 4 4.4.6-3.2 3.1.8 4.3L8 11l-4 2 .8-4.3L1.6 5.6 6 5z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="5" />
                  <path d="M8 5v3l2 1.5" />
                </svg>
              )}
              {isSubmitting
                ? "Creating..."
                : isCampaign
                ? "Launch Campaign"
                : "Create Story"}
            </span>
          </button>
        </motion.div>
      </motion.form>
    </div>
  );
}

// ── Mode Selection (Step 1) ─────────────────────────────────

function ModeSelection({ onSelect }: { onSelect: (mode: WritingMode) => void }) {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 sm:px-6 py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-6"
      >
        <p className="section-label text-text-ghost mb-5">
          How do you want to write?
        </p>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-paper font-semibold">
          Open a New Chapter
        </h1>
      </motion.div>

      {/* Flourish divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flourish w-64 text-amber/30 mb-14"
      />

      {/* Three tome cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 w-full max-w-5xl">

        {/* ── Solo: Personal Grimoire ────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          whileHover={{ y: -6 }}
          onMouseEnter={() => setHoveredMode("solo")}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => onSelect("solo")}
          className="group relative card-page p-8 pb-10 text-left transition-all duration-300 cursor-pointer overflow-hidden hover:!border-amber/40 hover:!shadow-[0_0_40px_rgba(200,150,60,0.1),0_4px_12px_rgba(0,0,0,0.3)]"
        >
          {/* Firelight glow through parchment */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber/6 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          {/* Inner page warm glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />

          {/* Leather journal corner ornaments */}
          <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-amber/10 group-hover:border-amber/25 rounded-tl-sm transition-colors duration-300 pointer-events-none" />
          <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-amber/10 group-hover:border-amber/25 rounded-tr-sm transition-colors duration-300 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-amber/10 group-hover:border-amber/25 rounded-bl-sm transition-colors duration-300 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-amber/10 group-hover:border-amber/25 rounded-br-sm transition-colors duration-300 pointer-events-none" />

          {/* Icon — quill & journal */}
          <div className="relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br from-amber/12 via-amber/6 to-transparent border border-amber/10 flex items-center justify-center mb-6 group-hover:border-amber/30 group-hover:shadow-[0_0_16px_rgba(200,150,60,0.1)] transition-all duration-300">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" strokeWidth="1.2" className="text-amber">
              {/* Book / journal */}
              <rect x="5" y="4" width="14" height="20" rx="2" stroke="currentColor" />
              <path d="M9 4v20" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
              {/* Quill */}
              <path d="M18 6l6-2-2 6-4 4-3 1 1-3z" stroke="currentColor" strokeWidth="1.1" />
              <path d="M20 10l-2-2" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h2 className="font-display text-2xl text-paper mb-1.5 group-hover:text-amber transition-colors duration-300">
              Solo
            </h2>
            <p className="text-text-secondary text-[13px] leading-relaxed mb-5 italic">
              A leather-bound journal, its pages waiting for your words alone.
            </p>

            {/* Feature inscriptions */}
            <div className="space-y-2.5">
              {["Chapters & rich text editor", "Story bible & world-building", "Export to PDF, EPUB, DOCX"].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 text-text-ghost text-[12px]">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0 text-amber/40">
                    <path d="M4 0.5L5 3.5L4 3L3 3.5Z" fill="currentColor" />
                    <path d="M4 7.5L3 4.5L4 5L5 4.5Z" fill="currentColor" />
                    <path d="M0.5 4L3.5 3L3 4L3.5 5Z" fill="currentColor" />
                    <path d="M7.5 4L4.5 5L5 4L4.5 3Z" fill="currentColor" />
                  </svg>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-amber/10 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
              <path d="M5 3l4 4-4 4" />
            </svg>
          </div>
        </motion.button>

        {/* ── Co-op: Shared Chronicle ────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          whileHover={{ y: -6 }}
          onMouseEnter={() => setHoveredMode("co-op")}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => onSelect("co-op")}
          className="group relative card-page p-8 pb-10 text-left transition-all duration-300 cursor-pointer overflow-hidden hover:!border-teal/40 hover:!shadow-[0_0_40px_rgba(59,110,122,0.12),0_4px_12px_rgba(0,0,0,0.3)]"
        >
          {/* Moonlit stained-glass glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-teal/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-teal/6 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-teal/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />

          {/* Interlinked border ornaments */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-transparent via-teal/15 to-transparent group-hover:via-teal/30 transition-all duration-300 pointer-events-none" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-transparent via-teal/15 to-transparent group-hover:via-teal/30 transition-all duration-300 pointer-events-none" />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-12 w-px bg-gradient-to-b from-transparent via-teal/15 to-transparent group-hover:via-teal/30 transition-all duration-300 pointer-events-none" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-px bg-gradient-to-b from-transparent via-teal/15 to-transparent group-hover:via-teal/30 transition-all duration-300 pointer-events-none" />

          {/* Icon — connected atlas / map */}
          <div className="relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br from-teal/12 via-teal/6 to-transparent border border-teal/10 flex items-center justify-center mb-6 group-hover:border-teal/30 group-hover:shadow-[0_0_16px_rgba(59,110,122,0.12)] transition-all duration-300">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" strokeWidth="1.2" className="text-teal">
              {/* Open book / atlas */}
              <path d="M14 7C12 5 9 4 5 4v17c4 0 7 1 9 3" stroke="currentColor" />
              <path d="M14 7c2-2 5-3 9-3v17c-4 0-7 1-9 3" stroke="currentColor" />
              {/* Connection dots */}
              <circle cx="9" cy="11" r="1" fill="currentColor" opacity="0.5" />
              <circle cx="19" cy="11" r="1" fill="currentColor" opacity="0.5" />
              <path d="M10 11h8" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h2 className="font-display text-2xl text-paper mb-1.5 group-hover:text-teal transition-colors duration-300">
              Co-op
            </h2>
            <p className="text-text-secondary text-[13px] leading-relaxed mb-5 italic">
              A map table where stories are charted together, page by page.
            </p>

            {/* Feature inscriptions */}
            <div className="space-y-2.5">
              {["Invite writers, editors, illustrators", "Collaborative lore book", "Creative agreements & credit"].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 text-text-ghost text-[12px]">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0 text-teal/40">
                    <path d="M4 0.5L5 3.5L4 3L3 3.5Z" fill="currentColor" />
                    <path d="M4 7.5L3 4.5L4 5L5 4.5Z" fill="currentColor" />
                    <path d="M0.5 4L3.5 3L3 4L3.5 5Z" fill="currentColor" />
                    <path d="M7.5 4L4.5 5L5 4L4.5 3Z" fill="currentColor" />
                  </svg>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
              <path d="M5 3l4 4-4 4" />
            </svg>
          </div>
        </motion.button>

        {/* ── Campaign: Enchanted War Table ──────── */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          whileHover={{ y: -6 }}
          onMouseEnter={() => setHoveredMode("campaign")}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => onSelect("campaign")}
          className="group relative card-page p-8 pb-10 text-left transition-all duration-300 cursor-pointer overflow-hidden hover:!border-violet/40 hover:!shadow-[0_0_40px_rgba(126,94,158,0.12),0_0_20px_rgba(158,107,66,0.06),0_4px_12px_rgba(0,0,0,0.3)]"
        >
          {/* Arcane energy glow — more dramatic */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-violet/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none" />
          <div className="absolute -bottom-14 -left-14 w-44 h-44 bg-violet/6 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-copper/6 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-violet/[0.02] via-transparent to-copper/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />

          {/* Mystical seal badge */}
          <div className="absolute top-5 right-5 z-20">
            <span className="relative px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] font-bold text-violet">
              {/* Seal background */}
              <span className="absolute inset-0 bg-violet/12 border border-violet/25 rounded-full group-hover:bg-violet/18 group-hover:border-violet/35 group-hover:shadow-[0_0_12px_rgba(126,94,158,0.15)] transition-all duration-300" />
              <span className="relative">New</span>
            </span>
          </div>

          {/* Arcane corner runes */}
          <div className="absolute top-3 left-3 text-violet/10 group-hover:text-violet/25 transition-colors duration-300 pointer-events-none">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.8">
              <path d="M0 5L5 0M0 0L3 3" />
            </svg>
          </div>
          <div className="absolute top-3 right-14 text-violet/10 group-hover:text-violet/25 transition-colors duration-300 pointer-events-none">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.8">
              <path d="M10 5L5 0M10 0L7 3" />
            </svg>
          </div>
          <div className="absolute bottom-3 left-3 text-copper/10 group-hover:text-copper/25 transition-colors duration-300 pointer-events-none">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.8">
              <path d="M0 5L5 10M0 10L3 7" />
            </svg>
          </div>
          <div className="absolute bottom-3 right-3 text-copper/10 group-hover:text-copper/25 transition-colors duration-300 pointer-events-none">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.8">
              <path d="M10 5L5 10M10 10L7 7" />
            </svg>
          </div>

          {/* Icon — star / war table compass */}
          <div className="relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br from-violet/12 via-copper/8 to-transparent border border-violet/10 flex items-center justify-center mb-6 group-hover:border-violet/30 group-hover:shadow-[0_0_16px_rgba(126,94,158,0.12)] transition-all duration-300">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" strokeWidth="1.2" className="text-violet">
              {/* Star / compass rose */}
              <path d="M14 3l3 7 7.5 1-5.5 5.5 1.3 7.5L14 20.5 7.7 24l1.3-7.5L3.5 11l7.5-1z" stroke="currentColor" />
              {/* Inner compass detail */}
              <path d="M14 9v4M14 15v4M9 14h4M15 14h4" stroke="currentColor" strokeWidth="0.8" className="text-copper" />
              <circle cx="14" cy="14" r="1.5" stroke="currentColor" strokeWidth="0.8" className="text-copper" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h2 className="font-display text-2xl text-paper mb-1.5 group-hover:text-violet transition-colors duration-300">
              Campaign
            </h2>
            <p className="text-text-secondary text-[13px] leading-relaxed mb-5 italic">
              An enchanted war table, awaiting its heroes and their tales.
            </p>

            {/* Feature inscriptions */}
            <div className="space-y-2.5">
              {["GM narration & player turns", "Character sheets & dice rolls", "Session-based adventures"].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 text-text-ghost text-[12px]">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0 text-violet/40">
                    <path d="M4 0.5L5 3.5L4 3L3 3.5Z" fill="currentColor" />
                    <path d="M4 7.5L3 4.5L4 5L5 4.5Z" fill="currentColor" />
                    <path d="M0.5 4L3.5 3L3 4L3.5 5Z" fill="currentColor" />
                    <path d="M7.5 4L4.5 5L5 4L4.5 3Z" fill="currentColor" />
                  </svg>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet">
              <path d="M5 3l4 4-4 4" />
            </svg>
          </div>
        </motion.button>
      </div>

      {/* Whispered hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 text-center"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={hoveredMode ?? "default"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-text-ghost text-[11px] italic"
          >
            {hoveredMode === "solo"
              ? "Perfect for novels, short stories, poetry, and screenplays."
              : hoveredMode === "co-op"
              ? "Best for shared universes, anthology projects, and creative partnerships."
              : hoveredMode === "campaign"
              ? "Think D&D meets collaborative fiction. Dice optional, imagination required."
              : "You can always change how you collaborate later."}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
