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
              {writingMode === "co-op" ? "Co-op" : isCampaign ? "Adventure" : "Solo"}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="section-label text-text-ghost mb-5 max-w-xs mx-auto"
          >
            {isCampaign ? "Name Your Adventure" : "Begin a New Story"}
          </motion.div>

          {/* Manuscript-style title input with gold underline */}
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isCampaign ? "Untitled Adventure" : "Untitled Story"}
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

        {/* Adventure-specific GM hint */}
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
            {isCampaign ? "Adventure Premise" : "Synopsis"}
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
                ? "Launch Adventure"
                : "Create Story"}
            </span>
          </button>
        </motion.div>
      </motion.form>
    </div>
  );
}

// ── Mode Selection (Step 1) — Card Panels ─────────────────

const MODES = [
  {
    id: "solo" as WritingMode,
    title: "The Study",
    subtitle: "Write alone",
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
    subtitle: "Write together",
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
    subtitle: "Adventure together",
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
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-amber/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-teal/5 blur-[120px]" />
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
              className={`relative rounded-3xl overflow-hidden group border border-border-subtle/30 bg-ink focus:outline-none transition-shadow duration-500 cursor-pointer shadow-xl ${
                isHovered && !selectedMode ? `shadow-${mode.color}/10 ` + mode.borderColor : ""
              } ${isSelected ? `shadow-2xl shadow-${mode.color}/20 ` + mode.borderColor : ""}`}
            >
              {/* Background Image Container */}
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                <motion.img
                  src={mode.image}
                  alt={mode.title}
                  animate={{
                    scale: isHovered || isSelected ? 1.05 : 1,
                    filter: isHovered || isSelected ? "brightness(0.9)" : "brightness(0.5) saturate(0.8)",
                  }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="w-full h-full object-cover"
                />

                {/* Vignette & Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-b from-void/50 via-transparent to-transparent opacity-80" />

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
                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-bold rounded-full bg-void/50 backdrop-blur-md border border-${mode.color}/30 ${mode.textColor}`}>
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
                        <div className="pt-4 border-t border-white/10 mt-2">
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
    </div>
  );
}
