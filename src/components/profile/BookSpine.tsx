"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Story {
  id: string;
  title: string;
  synopsis: string | null;
  genres: string[];
  status: string;
  slug: string | null;
  totalWords: number;
  sparkCount: number;
  chapterCount: number;
}

const GENRE_BG: Record<string, string> = {
  Fantasy: "bg-amber/15",
  "Science Fiction": "bg-lavender/15",
  Romance: "bg-rose/15",
  Mystery: "bg-violet/15",
  Thriller: "bg-rose/12",
  Horror: "bg-rose/15",
  Adventure: "bg-teal/12",
  Contemporary: "bg-sage/12",
};

const GENRE_EDGE: Record<string, string> = {
  Fantasy: "bg-amber",
  "Science Fiction": "bg-lavender",
  Romance: "bg-rose",
  Mystery: "bg-violet",
  Thriller: "bg-rose",
  Horror: "bg-rose",
  Adventure: "bg-teal",
  Contemporary: "bg-sage",
};

function spineHeight(totalWords: number) {
  return Math.min(280, Math.max(120, Math.round(totalWords / 400)));
}

function formatWords(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

interface BookSpineProps {
  story: Story;
  isDraft: boolean;
  index: number;
}

export default function BookSpine({ story, isDraft, index }: BookSpineProps) {
  const [expanded, setExpanded] = useState(false);
  const height = spineHeight(story.totalWords);
  const bg = (story.genres[0] && GENRE_BG[story.genres[0]]) || "bg-amber/15";
  const edge =
    (story.genres[0] && GENRE_EDGE[story.genres[0]]) || "bg-amber";
  const href = `/story/${story.slug || story.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 + index * 0.05, duration: 0.4 }}
      layout
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
      onTap={() => setExpanded((e) => !e)}
      className={`relative flex-shrink-0 ${isDraft ? "opacity-50" : ""}`}
      style={{ height }}
    >
      <motion.div
        layout
        animate={{ width: expanded ? 224 : 48 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`h-full ${bg} rounded-sm border border-border overflow-hidden cursor-pointer relative`}
      >
        {/* Collapsed: vertical title */}
        <motion.div
          animate={{ opacity: expanded ? 0 : 1 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="spine-title text-[11px] text-text-secondary font-medium whitespace-nowrap max-h-[90%] overflow-hidden">
            {story.title}
          </span>
        </motion.div>

        {/* Expanded: full info */}
        <motion.div
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.2, delay: expanded ? 0.1 : 0 }}
          className="absolute inset-0 p-4 flex flex-col justify-between"
        >
          <div>
            <h4 className="font-display text-[14px] text-paper font-semibold leading-snug mb-2 line-clamp-2">
              {story.title}
            </h4>
            {story.synopsis && (
              <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3">
                {story.synopsis}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] text-text-ghost mb-2">
              <span>{formatWords(story.totalWords)} words</span>
              {story.sparkCount > 0 && (
                <span className="text-amber/60">{story.sparkCount}&#10023;</span>
              )}
            </div>
            <Link
              href={href}
              className="text-[11px] text-amber hover:text-amber-light transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Read &rarr;
            </Link>
          </div>
        </motion.div>

        {/* Colored bottom edge */}
        <div className={`absolute bottom-0 inset-x-0 h-1 ${edge}`} />
      </motion.div>
    </motion.div>
  );
}
