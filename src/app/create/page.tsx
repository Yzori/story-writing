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

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Back to mode selection */}
        <motion.button
          type="button"
          onClick={() => setWritingMode(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 text-text-ghost hover:text-text-secondary transition-colors text-sm mb-8 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Change writing mode
        </motion.button>

        {/* Page heading */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center justify-center gap-2.5 mb-3"
          >
            <span className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] font-semibold rounded-full border ${
              isCampaign
                ? "bg-violet/15 text-violet border-violet/20"
                : writingMode === "co-op"
                ? "bg-teal/15 text-teal border-teal/20"
                : "bg-amber/15 text-amber border-amber/20"
            }`}>
              {writingMode === "co-op" ? "Co-op" : isCampaign ? "Campaign" : "Solo"}
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3"
          >
            {isCampaign ? "Name Your Campaign" : "Begin a New Story"}
          </motion.p>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isCampaign ? "Untitled Campaign" : "Untitled Story"}
            className="w-full text-center font-display text-3xl sm:text-4xl text-paper bg-transparent outline-none placeholder:text-text-ghost/50 border-none"
            required
          />
          <div className={`w-16 h-px mx-auto mt-4 ${isCampaign ? "bg-violet/30" : "bg-amber/30"}`} />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-4 py-3 bg-rose/10 border border-rose/20 rounded-lg text-rose text-[13px]"
          >
            {error}
          </motion.div>
        )}

        {/* Format selector — only for solo + co-op */}
        {!isCampaign && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-10"
          >
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              Format
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {FORMATS.map((f) => {
                const isBeta = f.id !== "novel";
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`bg-surface/80 border rounded-2xl p-4 text-left transition-all duration-200 relative ${
                      format === f.id
                        ? "border-amber/30 bg-amber/8 shadow-sm shadow-amber/5"
                        : "border-border hover:border-border-active hover:bg-surface"
                    }`}
                  >
                    {isBeta && (
                      <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider text-lavender/70 bg-lavender/10 px-1.5 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                    <div className={`mb-2 ${format === f.id ? "text-amber" : "text-text-tertiary"}`}>
                      {f.icon}
                    </div>
                    <p className={`text-[13px] font-medium mb-0.5 ${format === f.id ? "text-paper" : "text-text"}`}>
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
              <p className="text-[11px] text-lavender/70 mt-2">
                The {FORMATS.find((f) => f.id === format)?.label} editor is coming soon.
                Your story will be created with the novel editor for now.
              </p>
            )}
          </motion.div>
        )}

        {/* Campaign-specific hint */}
        {isCampaign && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-10 bg-violet/5 border border-violet/15 rounded-2xl p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet">
                  <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.5-.8z" />
                </svg>
              </div>
              <div>
                <p className="text-paper text-sm font-medium mb-1">You&apos;ll be the Game Master</p>
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
          className="mb-10"
        >
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
            {isCampaign ? "Setting & Genres" : "Genres"}
            {selectedGenres.length > 0 && (
              <span className="text-text-tertiary ml-2 normal-case tracking-normal">
                {selectedGenres.length} selected
              </span>
            )}
          </span>
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

        {/* Synopsis */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-10"
        >
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
            {isCampaign ? "Campaign Premise" : "Synopsis"}
          </span>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder={
              isCampaign
                ? "Set the stage. What world will your players step into?"
                : "A brief description of your story. What will draw readers in?"
            }
            rows={4}
            className="w-full bg-elevated/80 border border-border rounded-xl px-4 py-3 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/25 focus:shadow-sm focus:shadow-amber/5 transition-all resize-none leading-relaxed"
          />
          <p className="text-[11px] text-text-ghost mt-1.5">
            {synopsis.length}/500 characters
          </p>
        </motion.div>

        {/* Content Rating */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
            Content Rating
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CONTENT_RATINGS.map((rating) => (
              <button
                key={rating.value}
                type="button"
                onClick={() => setContentRating(rating.value)}
                className={`bg-surface/80 border rounded-2xl p-4 text-left transition-all duration-200 ${
                  contentRating === rating.value
                    ? "border-amber/30 bg-amber/8 shadow-sm shadow-amber/5"
                    : "border-border hover:border-border-active hover:bg-surface"
                }`}
              >
                <p className={`text-[13px] font-medium mb-0.5 ${contentRating === rating.value ? "text-paper" : "text-text"}`}>
                  {rating.label}
                </p>
                <p className="text-[11px] text-text-tertiary leading-snug">
                  {rating.description}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Cover Upload */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-12"
        >
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
            Cover Image
          </span>
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
            className={`border-2 border-dashed rounded-2xl text-center transition-all duration-200 cursor-pointer overflow-hidden ${
              isDragging
                ? "border-amber/40 bg-amber/5 shadow-inner"
                : "border-border hover:border-amber/20 hover:bg-surface/50"
            } ${coverPreview ? "p-0" : "p-12"}`}
          >
            {coverPreview ? (
              <div className="relative group">
                <img src={coverPreview} alt="Cover preview" className="w-full max-h-64 object-contain" />
                <div className="absolute inset-0 bg-void/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-paper text-[13px] font-medium">Click to change</p>
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
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-text-ghost mb-3">
                  <rect x="4" y="4" width="24" height="24" rx="3" />
                  <circle cx="12" cy="12" r="2.5" />
                  <path d="M4 22l7-7 5 5 3-3 9 9" />
                </svg>
                <p className="text-text-secondary text-[13px] mb-1">Drag and drop your cover image here</p>
                <p className="text-text-ghost text-[11px]">PNG, JPG, or WebP. Recommended 600 x 900px.</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <button
            type="submit"
            disabled={isSubmitting}
            className={`font-semibold px-8 py-3 rounded-full transition-all duration-200 text-[14px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg ${
              isCampaign
                ? "bg-violet text-white hover:bg-violet/90 hover:shadow-violet/15"
                : "bg-amber text-void hover:bg-amber-light hover:shadow-amber/15"
            }`}
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 3L6 14l-3-4" />
              </svg>
            )}
            {isSubmitting
              ? "Creating..."
              : isCampaign
              ? "Launch Campaign"
              : "Create Story"}
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
        className="text-center mb-14"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-text-ghost mb-4">
          How do you want to write?
        </p>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-paper font-semibold">
          Choose Your Path
        </h1>
      </motion.div>

      {/* Three cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 w-full max-w-5xl">

        {/* ── Solo ───────────────────────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          whileHover={{ y: -4 }}
          onMouseEnter={() => setHoveredMode("solo")}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => onSelect("solo")}
          className="group relative bg-surface/60 border border-border rounded-3xl p-8 pb-10 text-left transition-all duration-300 cursor-pointer overflow-hidden hover:border-amber/40 hover:shadow-xl hover:shadow-amber/5"
        >
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-amber/8 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          {/* Icon */}
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber/15 via-amber/8 to-transparent border border-amber/10 flex items-center justify-center mb-6 group-hover:border-amber/25 transition-colors">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-amber">
              <circle cx="16" cy="11" r="5" />
              <path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10" />
              {/* Pen */}
              <path d="M22 4l4 4-9 9-4 1 1-4z" strokeWidth="1.2" className="text-amber/60" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h2 className="font-display text-2xl text-paper mb-2 group-hover:text-amber transition-colors">
              Solo
            </h2>
            <p className="text-text-secondary text-[14px] leading-relaxed mb-5">
              Your story, your rules. Write at your own pace with the full creative toolkit.
            </p>

            {/* Feature hints */}
            <div className="space-y-2">
              {["Chapters & rich text editor", "Story bible & world-building", "Export to PDF, EPUB, DOCX"].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-text-ghost text-[12px]">
                  <div className="w-1 h-1 rounded-full bg-amber/50" />
                  {feat}
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

        {/* ── Co-op ──────────────────────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          whileHover={{ y: -4 }}
          onMouseEnter={() => setHoveredMode("co-op")}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => onSelect("co-op")}
          className="group relative bg-surface/60 border border-border rounded-3xl p-8 pb-10 text-left transition-all duration-300 cursor-pointer overflow-hidden hover:border-teal/40 hover:shadow-xl hover:shadow-teal/5"
        >
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-teal/8 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-teal/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          {/* Icon */}
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal/15 via-teal/8 to-transparent border border-teal/10 flex items-center justify-center mb-6 group-hover:border-teal/25 transition-colors">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-teal">
              {/* Two people */}
              <circle cx="11" cy="11" r="4" />
              <path d="M3 26c0-4.4 3.6-8 8-8" />
              <circle cx="21" cy="11" r="4" />
              <path d="M29 26c0-4.4-3.6-8-8-8" />
              {/* Connection line */}
              <path d="M14 20h4" strokeDasharray="2 2" className="text-teal/50" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h2 className="font-display text-2xl text-paper mb-2 group-hover:text-teal transition-colors">
              Co-op
            </h2>
            <p className="text-text-secondary text-[14px] leading-relaxed mb-5">
              Write together. Invite collaborators, manage suggestions, and build shared worlds.
            </p>

            {/* Feature hints */}
            <div className="space-y-2">
              {["Invite writers, editors, illustrators", "Collaborative lore book", "Creative agreements & credit"].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-text-ghost text-[12px]">
                  <div className="w-1 h-1 rounded-full bg-teal/50" />
                  {feat}
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

        {/* ── Campaign ───────────────────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{ y: -4 }}
          onMouseEnter={() => setHoveredMode("campaign")}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => onSelect("campaign")}
          className="group relative bg-surface/60 border border-border rounded-3xl p-8 pb-10 text-left transition-all duration-300 cursor-pointer overflow-hidden hover:border-violet/40 hover:shadow-xl hover:shadow-violet/5"
        >
          {/* Ambient glow — more dramatic for campaign */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet/8 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-violet/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-copper/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none" />

          {/* "New" badge */}
          <div className="absolute top-5 right-5 z-20">
            <span className="px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] font-bold bg-violet/15 text-violet border border-violet/25 rounded-full">
              New
            </span>
          </div>

          {/* Icon */}
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet/15 via-copper/8 to-transparent border border-violet/10 flex items-center justify-center mb-6 group-hover:border-violet/25 transition-colors">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" strokeWidth="1.3" className="text-violet">
              {/* D20 / star shape */}
              <path d="M16 3l4 8 9 1.3-6.5 6.4 1.5 9.3L16 23.5 8 28l1.5-9.3L3 12.3 12 11z" stroke="currentColor" />
              {/* Inner detail */}
              <path d="M16 10v8M12 15h8" stroke="currentColor" strokeWidth="1" className="text-copper" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h2 className="font-display text-2xl text-paper mb-2 group-hover:text-violet transition-colors">
              Campaign
            </h2>
            <p className="text-text-secondary text-[14px] leading-relaxed mb-5">
              Run a tabletop-style narrative. You&apos;re the Game Master — narrate the world while players take turns.
            </p>

            {/* Feature hints */}
            <div className="space-y-2">
              {["GM narration & player turns", "Character sheets & dice rolls", "Session-based adventures"].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-text-ghost text-[12px]">
                  <div className="w-1 h-1 rounded-full bg-violet/50" />
                  {feat}
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

      {/* Subtle hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-text-ghost text-[11px] mt-10"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={hoveredMode ?? "default"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {hoveredMode === "solo"
              ? "Perfect for novels, short stories, poetry, and screenplays."
              : hoveredMode === "co-op"
              ? "Best for shared universes, anthology projects, and creative partnerships."
              : hoveredMode === "campaign"
              ? "Think D&D meets collaborative fiction. Dice optional, imagination required."
              : "You can always change how you collaborate later."}
          </motion.span>
        </AnimatePresence>
      </motion.p>
    </div>
  );
}
