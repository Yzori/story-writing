"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface Story {
  id: string;
  title: string;
  synopsis: string | null;
  coverImageUrl: string | null;
  genres: string[];
  status: string;
  slug: string | null;
  totalWords: number;
  sparkCount: number;
  chapterCount: number;
}

const GENRE_GRADIENT: Record<string, string> = {
  Fantasy: "from-amber/20 via-amber/10 to-transparent",
  "Science Fiction": "from-lavender/20 via-lavender/10 to-transparent",
  Romance: "from-rose/20 via-rose/10 to-transparent",
  Mystery: "from-violet/20 via-violet/10 to-transparent",
  Thriller: "from-rose/20 via-rose/10 to-transparent",
  Horror: "from-rose/20 via-rose/10 to-transparent",
  Adventure: "from-teal/20 via-teal/10 to-transparent",
  Contemporary: "from-sage/20 via-sage/10 to-transparent",
};

function formatWords(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

interface FeaturedWorkProps {
  story: Story;
  isOwner: boolean;
}

export default function FeaturedWork({ story, isOwner }: FeaturedWorkProps) {
  const gradient =
    (story.genres[0] && GENRE_GRADIENT[story.genres[0]]) ||
    "from-amber/20 via-amber/10 to-transparent";
  const href = `/story/${story.slug || story.id}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="max-w-3xl mx-auto px-6 mb-16"
    >
      <p className="section-label mb-6">Featured Work</p>
      <Link href={href}>
        <div className="card-page overflow-hidden flex flex-col sm:flex-row group cursor-pointer">
          {/* Cover / gradient area */}
          <div
            className={`sm:w-[40%] h-48 sm:h-auto bg-gradient-to-br ${gradient} relative overflow-hidden flex-shrink-0`}
          >
            {story.coverImageUrl ? (
              <img
                src={story.coverImageUrl}
                alt={story.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-paper/10"
                >
                  <path d="M8 8h32v32H8z" />
                  <path d="M14 20h20M14 26h14M14 32h8" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-display text-xl text-paper font-semibold group-hover:text-amber transition-colors">
                {story.title}
              </h3>
              {isOwner && story.status === "in-progress" && (
                <span className="flex items-center gap-1.5 text-[10px] text-amber">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
                  Currently writing
                </span>
              )}
            </div>
            {story.synopsis && (
              <p className="text-text-secondary text-[13px] leading-relaxed line-clamp-3 mb-4">
                {story.synopsis}
              </p>
            )}
            <div className="flex items-center gap-4 text-[11px] text-text-ghost">
              <span>{formatWords(story.totalWords)} words</span>
              <span>{story.chapterCount} chapters</span>
              {story.sparkCount > 0 && (
                <span className="text-amber/60">{story.sparkCount} sparks</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.section>
  );
}
