"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import GenrePill from "./GenrePill";

interface StoryCardProps {
  title: string;
  author?: string;
  coverUrl?: string;
  genres: string[];
  wordCount: number;
  chapterCount: number;
  sparkCount?: number;
  status?: "draft" | "in-progress" | "on-hiatus" | "complete";
  slug: string;
  lastEdited?: string;
  variant?: "default" | "featured";
  excerpt?: string;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "text-text-ghost" },
  "in-progress": { label: "In Progress", className: "text-amber" },
  "on-hiatus": { label: "On Hiatus", className: "text-lavender" },
  complete: { label: "Published", className: "text-sage" },
};

const GENRE_GRADIENTS: Record<string, string> = {
  Fantasy: "from-amber/30 to-amber/5",
  "Science Fiction": "from-lavender/30 to-lavender/5",
  Romance: "from-rose/30 to-rose/5",
  Mystery: "from-lavender/20 to-void",
  Thriller: "from-rose/20 to-void",
  Horror: "from-rose/30 to-void",
  default: "from-amber/20 to-void",
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
  status,
  slug,
  lastEdited,
  variant = "default",
  excerpt,
}: StoryCardProps) {
  const statusInfo = status ? STATUS_STYLES[status] : null;

  if (variant === "featured") {
    return (
      <Link href={`/write`}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-surface border border-border rounded-xl overflow-hidden hover:border-border-active transition-colors min-w-[300px] w-[300px] flex-shrink-0 cursor-pointer group"
        >
          <div
            className={`h-40 bg-gradient-to-br ${getGradient(genres)} relative`}
          >
            {coverUrl && (
              <img
                src={coverUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-surface/90 to-transparent" />
          </div>
          <div className="p-4 -mt-8 relative">
            <h3 className="font-display text-paper text-lg font-semibold mb-1 group-hover:text-amber transition-colors">
              {title}
            </h3>
            {author && (
              <p className="text-text-secondary text-[12px] mb-2">
                by {author}
              </p>
            )}
            {excerpt && (
              <p className="text-text-secondary text-[12px] leading-relaxed line-clamp-2 mb-3">
                {excerpt}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {genres.slice(0, 2).map((g) => (
                <GenrePill key={g} genre={g} />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 text-[11px] text-text-tertiary">
              <span className="flex items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
                  <path d="M5 5h6M5 8h4" />
                </svg>
                {chapterCount} ch
              </span>
              {sparkCount !== undefined && (
                <span className="flex items-center gap-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
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
    <Link href={`/write`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-surface border border-border rounded-xl overflow-hidden hover:border-border-active transition-all cursor-pointer group"
      >
        <div
          className={`h-32 bg-gradient-to-br ${getGradient(genres)} relative`}
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          )}
          {statusInfo && (
            <span
              className={`absolute top-2.5 right-2.5 text-[10px] font-medium uppercase tracking-wider ${statusInfo.className} bg-void/60 backdrop-blur-sm px-2 py-0.5 rounded-full`}
            >
              {statusInfo.label}
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-paper text-[15px] font-semibold mb-1.5 group-hover:text-amber transition-colors leading-snug">
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
              <span className="text-[10px] text-text-ghost">
                +{genres.length - 2}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-tertiary">
            <div className="flex items-center gap-3">
              <span>{formatWordCount(wordCount)} words</span>
              <span>{chapterCount} ch</span>
              {sparkCount !== undefined && (
                <span className="flex items-center gap-1">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                  </svg>
                  {sparkCount}
                </span>
              )}
            </div>
            {lastEdited && (
              <span className="text-text-ghost">{lastEdited}</span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
