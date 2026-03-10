"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import GenrePill from "./GenrePill";

const RATING_BADGES: Record<string, { label: string; className: string }> = {
  everyone: { label: "All Ages", className: "text-sage" },
  teen: { label: "Teen+", className: "text-amber" },
  mature: { label: "Mature", className: "text-rose/70" },
  explicit: { label: "18+", className: "text-rose" },
};

interface StoryCardProps {
  title: string;
  author?: string;
  coverUrl?: string;
  genres: string[];
  wordCount: number;
  chapterCount: number;
  sparkCount?: number;
  contentRating?: string;
  status?: "draft" | "in-progress" | "on-hiatus" | "complete";
  slug: string;
  href?: string;
  lastEdited?: string;
  variant?: "default" | "featured";
  excerpt?: string;
}

const STATUS_STYLES: Record<string, { label: string; dot: string; className: string }> = {
  draft: { label: "Draft", dot: "bg-text-ghost", className: "text-text-ghost" },
  "in-progress": { label: "In Progress", dot: "bg-amber", className: "text-amber" },
  "on-hiatus": { label: "On Hiatus", dot: "bg-lavender", className: "text-lavender" },
  complete: { label: "Published", dot: "bg-sage", className: "text-sage" },
};

const GENRE_GRADIENTS: Record<string, string> = {
  Fantasy: "from-amber/40 via-amber/15 to-transparent",
  "Science Fiction": "from-lavender/40 via-lavender/15 to-transparent",
  Romance: "from-rose/40 via-rose/15 to-transparent",
  Mystery: "from-violet/40 via-violet/15 to-transparent",
  Thriller: "from-rose/35 via-rose/10 to-transparent",
  Horror: "from-rose/40 via-rose/15 to-transparent",
  Adventure: "from-teal/35 via-teal/10 to-transparent",
  Contemporary: "from-sage/35 via-sage/10 to-transparent",
  default: "from-amber/30 via-amber/10 to-transparent",
};

function getGradient(genres: string[]): string {
  if (genres.length === 0) return GENRE_GRADIENTS.default;
  return GENRE_GRADIENTS[genres[0]] || GENRE_GRADIENTS.default;
}

function formatWordCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export default function StoryCard({
  title,
  author,
  coverUrl,
  genres,
  wordCount,
  chapterCount,
  sparkCount,
  contentRating,
  status,
  slug,
  href,
  lastEdited,
  variant = "default",
  excerpt,
}: StoryCardProps) {
  const linkHref = href || `/story/${slug}`;
  const statusInfo = status ? STATUS_STYLES[status] : null;

  if (variant === "featured") {
    return (
      <Link href={linkHref}>
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="relative bg-surface/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden hover:border-amber/20 transition-all duration-300 min-w-[300px] w-[300px] flex-shrink-0 cursor-pointer group hover:shadow-xl hover:shadow-amber/5"
        >
          <div
            className={`h-44 bg-gradient-to-br ${getGradient(genres)} relative overflow-hidden`}
          >
            {coverUrl && (
              <img
                src={coverUrl}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
            {/* Shimmer on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </div>
          <div className="p-5 -mt-10 relative">
            <h3 className="font-display text-paper text-lg font-semibold mb-1.5 group-hover:text-amber transition-colors duration-200 leading-snug">
              {title}
            </h3>
            {author && (
              <p className="text-text-secondary text-[12px] mb-2.5">
                by {author}
              </p>
            )}
            {excerpt && (
              <p className="text-text-tertiary text-[12px] leading-relaxed line-clamp-2 mb-3">
                {excerpt}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {genres.slice(0, 2).map((g) => (
                <GenrePill key={g} genre={g} />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3.5 pt-3 border-t border-border-subtle text-[11px] text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                  <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
                  <path d="M5 5h6M5 8h4" />
                </svg>
                {chapterCount} ch
              </span>
              {sparkCount !== undefined && sparkCount > 0 && (
                <span className="flex items-center gap-1 text-amber/70">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                  </svg>
                  {sparkCount}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={linkHref}>
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative bg-surface/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden hover:border-amber/15 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-amber/[0.04]"
      >
        {/* Cover / Gradient header */}
        <div
          className={`h-36 bg-gradient-to-br ${getGradient(genres)} relative overflow-hidden`}
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
          {/* Status badge */}
          {statusInfo && (
            <span
              className={`absolute top-3 right-3 text-[10px] font-medium tracking-wider ${statusInfo.className} bg-void/70 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
              {statusInfo.label}
            </span>
          )}
          {/* Shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </div>

        {/* Content */}
        <div className="p-4 pt-3">
          <h3 className="font-display text-paper text-[15px] font-semibold mb-1.5 group-hover:text-amber transition-colors duration-200 leading-snug">
            {title}
          </h3>
          {author && (
            <p className="text-text-secondary text-[12px] mb-2.5">
              by {author}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {genres.slice(0, 2).map((g) => (
              <GenrePill key={g} genre={g} />
            ))}
            {genres.length > 2 && (
              <span className="text-[10px] text-text-ghost ml-0.5">
                +{genres.length - 2}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-3 border-t border-border-subtle">
            <div className="flex items-center gap-3">
              <span>{formatWordCount(wordCount)} words</span>
              <span className="text-text-ghost">|</span>
              <span>{chapterCount} ch</span>
              {sparkCount !== undefined && sparkCount > 0 && (
                <span className="flex items-center gap-1 text-amber/60">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                  </svg>
                  {sparkCount}
                </span>
              )}
            </div>
            {contentRating && contentRating !== "everyone" && RATING_BADGES[contentRating] && (
              <span className={`text-[10px] font-medium ${RATING_BADGES[contentRating].className}`}>
                {RATING_BADGES[contentRating].label}
              </span>
            )}
            {lastEdited && (
              <span className="text-text-ghost">{lastEdited}</span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
