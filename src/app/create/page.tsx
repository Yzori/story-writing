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
  const modeData = MODES.find((m) => m.id === writingMode)!;
  const modeLabel = writingMode === "co-op" ? "Co-op" : isCampaign ? "Adventure" : "Solo";

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row"
    >
      {/* ── Left column: Cover & visual identity ─────────── */}
      <div className="relative lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] w-full lg:w-[420px] xl:w-[480px] shrink-0 overflow-hidden">
        {/* Mode image as blurred backdrop */}
        <img
          src={modeData.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px]"
          style={{ filter: "blur(2px) brightness(0.35) saturate(0.7)" }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-void/60 via-void/30 to-void/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-void/50 hidden lg:block" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 lg:p-10">
          {/* Back button */}
          <motion.button
            type="button"
            onClick={() => setWritingMode(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-6 left-6 group flex items-center gap-2 text-text-ghost hover:text-paper transition-colors text-[12px] cursor-pointer font-body"
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-white/10 group-hover:border-white/25 backdrop-blur-md bg-white/5 transition-all">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </span>
          </motion.button>

          {/* Mode badge */}
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`px-3 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold rounded-full border backdrop-blur-md mb-6 ${
              isCampaign
                ? "bg-violet/15 text-violet border-violet/25"
                : writingMode === "co-op"
                ? "bg-teal/15 text-teal border-teal/25"
                : "bg-amber/15 text-amber border-amber/25"
            }`}
          >
            {modeLabel}
          </motion.span>

          {/* Cover upload area — book-cover proportioned */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-[240px]"
          >
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
              className={`relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 ${
                isDragging
                  ? `border-2 border-${accentColor}/50 shadow-[0_0_40px_rgba(200,150,60,0.1)]`
                  : "border border-white/10 hover:border-white/20"
              }`}
            >
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-void/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-paper">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <p className="text-paper text-[12px] font-body">Change cover</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCoverPreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-void/70 backdrop-blur-md text-paper flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose/80"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.03] backdrop-blur-sm">
                  {/* Decorative corner marks */}
                  <div className="absolute top-3 left-3 w-5 h-5 border-t border-l border-white/15" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-t border-r border-white/15" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-b border-l border-white/15" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-b border-r border-white/15" />

                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/30 mb-3">
                    <rect x="3" y="3" width="22" height="22" rx="2" />
                    <circle cx="10" cy="10" r="2" />
                    <path d="M3 21l6-6 4 4 3-3 9 9" />
                  </svg>
                  <p className="text-white/40 text-[12px] font-body mb-1">Add cover image</p>
                  <p className="text-white/20 text-[10px] font-body">600 &times; 900px</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Title preview on the cover area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-6 text-center max-w-[280px]"
          >
            <p className={`font-display text-lg text-paper/90 leading-snug ${title ? "" : "italic text-white/20"}`}>
              {title || "Your title here"}
            </p>
            {selectedGenres.length > 0 && (
              <p className="text-white/30 text-[11px] mt-2 font-body">
                {selectedGenres.slice(0, 3).join(" · ")}{selectedGenres.length > 3 ? ` +${selectedGenres.length - 3}` : ""}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Right column: Form fields ────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 lg:px-10 xl:px-14 py-10 lg:py-14">

          {/* Title input */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              {isCampaign ? "Adventure Title" : "Story Title"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isCampaign ? "Untitled Adventure" : "Untitled Story"}
                className={`w-full font-display text-2xl sm:text-3xl text-paper bg-transparent outline-none placeholder:text-text-ghost/30 border-none pb-3`}
                required
              />
              <div className={`absolute bottom-0 left-0 h-px transition-all duration-500 ${
                title
                  ? `w-full bg-gradient-to-r from-${accentColor}/50 via-${accentColor}/30 to-transparent`
                  : "w-16 bg-gradient-to-r from-text-ghost/30 to-transparent"
              }`} />
            </div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 px-4 py-3 rounded-xl border border-rose/25 bg-rose/5 text-rose text-[13px] flex items-center gap-2"
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
              className="mb-10"
            >
              <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">Format</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {FORMATS.map((f) => {
                  const isBeta = f.id !== "novel";
                  const isSelected = format === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={`relative rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? `border-${accentColor}/30 bg-${accentColor}/[0.04] ring-1 ring-${accentColor}/10`
                          : "border-border hover:border-border-active bg-transparent"
                      }`}
                    >
                      {isBeta && (
                        <span className="absolute top-2.5 right-2.5 text-[9px] uppercase tracking-wider text-lavender/70 bg-lavender/10 px-1.5 py-0.5 rounded-full">
                          Soon
                        </span>
                      )}
                      <div className={`mb-1.5 ${isSelected ? `text-${accentColor}` : "text-text-tertiary"}`}>
                        {f.icon}
                      </div>
                      <p className={`text-[13px] font-medium ${isSelected ? "text-paper" : "text-text"}`}>
                        {f.label}
                      </p>
                      <p className="text-[11px] text-text-tertiary leading-snug mt-0.5">
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
              className="mb-10 rounded-xl border border-violet/20 p-5 relative overflow-hidden bg-violet/[0.03]"
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

          {/* Synopsis */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
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
              className={`w-full bg-elevated border border-border rounded-xl px-4 py-3.5 text-[13px] text-text font-body outline-none placeholder:text-text-ghost/50 placeholder:italic transition-all resize-none leading-relaxed focus:border-${accentColor}/25`}
            />
            <p className="text-[11px] text-text-ghost mt-1.5">
              {synopsis.length}/500
            </p>
          </motion.div>

          {/* Genres */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-10"
          >
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
              {isCampaign ? "Setting & Genres" : "Genres"}
              {selectedGenres.length > 0 && (
                <span className="text-text-tertiary ml-2 normal-case tracking-normal text-[11px]">
                  {selectedGenres.length} selected
                </span>
              )}
            </label>
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

          {/* Content Rating */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">Content Rating</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CONTENT_RATINGS.map((rating) => {
                const isSelected = contentRating === rating.value;
                return (
                  <button
                    key={rating.value}
                    type="button"
                    onClick={() => setContentRating(rating.value)}
                    className={`rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? `border-${accentColor}/30 bg-${accentColor}/[0.04] ring-1 ring-${accentColor}/10`
                        : "border-border hover:border-border-active bg-transparent"
                    }`}
                  >
                    <p className={`text-[13px] font-medium ${isSelected ? "text-paper" : "text-text"}`}>
                      {rating.label}
                    </p>
                    <p className="text-[11px] text-text-tertiary leading-snug mt-0.5">
                      {rating.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex items-center gap-4"
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className={`group relative font-display font-semibold px-8 py-3.5 rounded-full transition-all duration-300 text-[14px] flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${
                isCampaign
                  ? "bg-violet text-white hover:shadow-[0_0_30px_rgba(126,94,158,0.25)] hover:scale-[1.02]"
                  : `bg-${accentColor} text-void hover:shadow-[0_0_30px_rgba(200,150,60,0.25)] hover:scale-[1.02]`
              }`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent`} />
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
              className="text-text-ghost hover:text-text-secondary text-[13px] transition-colors font-body"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      </div>
    </motion.form>
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
