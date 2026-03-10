"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { GENRES, CONTENT_RATINGS } from "@/lib/genres";
import GenrePill from "@/components/shared/GenrePill";

const FORMATS = [
  {
    id: "prose",
    label: "Prose",
    description: "Traditional chapters with rich text",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 4h12M4 8h10M4 12h8M4 16h12" />
      </svg>
    ),
  },
  {
    id: "webtoon",
    label: "Webtoon",
    description: "Vertical-scroll illustrated panels",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
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
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M6 4h8M8 8h6M5 12h7M7 16h5" />
      </svg>
    ),
  },
  {
    id: "illustrated",
    label: "Illustrated Prose",
    description: "Prose with inline artwork",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
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
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="2" width="14" height="16" rx="1" />
        <path d="M7 6h6M8 9h4M7 12h6M9 15h2" />
      </svg>
    ),
  },
];

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("prose");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [synopsis, setSynopsis] = useState("");
  const [contentRating, setContentRating] = useState("everyone");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          genres: selectedGenres,
          synopsis: synopsis || undefined,
          contentRating,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || "Failed to create story");
        return;
      }

      router.push(`/write/${json.data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Page heading */}
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3"
          >
            Begin a New Story
          </motion.p>
          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Story"
            className="w-full text-center font-display text-3xl sm:text-4xl text-paper bg-transparent outline-none placeholder:text-text-ghost/50 border-none"
            required
          />
          <div className="w-16 h-px bg-amber/30 mx-auto mt-4" />
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

        {/* Format selector */}
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
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                className={`bg-surface border rounded-xl p-4 text-left transition-all ${
                  format === f.id
                    ? "border-amber/40 bg-amber/5"
                    : "border-border hover:border-border-active"
                }`}
              >
                <div
                  className={`mb-2 ${
                    format === f.id ? "text-amber" : "text-text-tertiary"
                  }`}
                >
                  {f.icon}
                </div>
                <p
                  className={`text-[13px] font-medium mb-0.5 ${
                    format === f.id ? "text-paper" : "text-text"
                  }`}
                >
                  {f.label}
                </p>
                <p className="text-[11px] text-text-tertiary leading-snug">
                  {f.description}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Genre multi-select */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-3 block">
            Genres
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
            Synopsis
          </span>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="A brief description of your story. What will draw readers in?"
            rows={4}
            className="w-full bg-elevated border border-border rounded-lg px-4 py-3 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none leading-relaxed"
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
                className={`bg-surface border rounded-xl p-4 text-left transition-all ${
                  contentRating === rating.value
                    ? "border-amber/40 bg-amber/5"
                    : "border-border hover:border-border-active"
                }`}
              >
                <p
                  className={`text-[13px] font-medium mb-0.5 ${
                    contentRating === rating.value ? "text-paper" : "text-text"
                  }`}
                >
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
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              // TODO: Handle file upload
            }}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-amber/50 bg-amber/5"
                : "border-border hover:border-border-active"
            }`}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto text-text-ghost mb-3"
            >
              <rect x="4" y="4" width="24" height="24" rx="3" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M4 22l7-7 5 5 3-3 9 9" />
            </svg>
            <p className="text-text-secondary text-[13px] mb-1">
              Drag and drop your cover image here
            </p>
            <p className="text-text-ghost text-[11px]">
              PNG, JPG, or WebP. Recommended 600 x 900px.
            </p>
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
            className="bg-amber text-void font-medium px-8 py-3 rounded-lg hover:bg-amber/90 transition-colors text-[14px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M13 3L6 14l-3-4" />
              </svg>
            )}
            {isSubmitting ? "Creating..." : "Create Story"}
          </button>
        </motion.div>
      </motion.form>
    </div>
  );
}
