"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, ChevronRight, Sparkles, Feather, Bookmark } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface FeaturedStory {
  id: string;
  title: string;
  synopsis: string | null;
  hook?: string | null;
  coverImageUrl: string | null;
  genres: string[];
  status: string;
  slug: string | null;
  totalWords: number;
  sparkCount: number;
  chapterCount: number;
}

const GENRE_GRADIENT: Record<string, string> = {
  Fantasy: "from-amber/35 via-amber/15 to-transparent",
  "Science Fiction": "from-lavender/35 via-lavender/15 to-transparent",
  Romance: "from-rose/35 via-rose/15 to-transparent",
  Mystery: "from-violet/35 via-violet/15 to-transparent",
  Thriller: "from-rose/30 via-rose/10 to-transparent",
  Horror: "from-rose/35 via-rose/15 to-transparent",
  Adventure: "from-teal/30 via-teal/10 to-transparent",
  Contemporary: "from-sage/30 via-sage/10 to-transparent",
};

const GENRE_TEXT: Record<string, string> = {
  Fantasy: "text-amber",
  "Science Fiction": "text-lavender",
  Romance: "text-rose",
  Mystery: "text-violet",
  Thriller: "text-rose",
  Horror: "text-rose",
  Adventure: "text-teal",
  Contemporary: "text-sage",
};

interface FeaturedManuscriptProps {
  story: FeaturedStory;
  isOwner: boolean;
}

export default function FeaturedManuscript({ story, isOwner }: FeaturedManuscriptProps) {
  const genre = story.genres[0];
  const gradient = (genre && GENRE_GRADIENT[genre]) || GENRE_GRADIENT.Fantasy;
  const accentText = (genre && GENRE_TEXT[genre]) || "text-amber";
  const href = `/story/${story.slug || story.id}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto mt-8 max-w-5xl px-5 lg:px-8"
    >
      <SectionHeader eyebrow="Open on the desk" title="Featured manuscript" />

      <Link href={href} className="group block">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-surface/82 shadow-[var(--t-shadow-card)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-amber/30">
          {/* Manuscript-page lamp */}
          <div className="absolute right-8 top-0 h-14 w-7 rounded-b-full bg-amber/25" />
          <div className="absolute inset-x-8 top-12 h-px bg-border-subtle" />

          <div className="grid gap-0 sm:grid-cols-[280px_1fr]">
            {/* Cover panel */}
            <div className={`relative h-56 overflow-hidden bg-gradient-to-br ${gradient} sm:h-auto`}>
              {story.coverImageUrl ? (
                <img
                  src={story.coverImageUrl}
                  alt={story.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="56" height="56" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-paper/10">
                    <path d="M10 6h28v36H10z" />
                    <path d="M16 16h16M16 22h12M16 28h14M16 34h8" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-void/55 to-transparent sm:hidden" />
            </div>

            {/* Body */}
            <div className="relative flex flex-col justify-center gap-3 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {genre && (
                  <span className={`text-[10px] uppercase tracking-[0.22em] ${accentText}`}>{genre}</span>
                )}
                {isOwner && story.status === "in-progress" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/[0.08] px-2 py-0.5 text-[10px] text-amber">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
                    Currently writing
                  </span>
                )}
                {story.status === "complete" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/25 bg-sage/[0.08] px-2 py-0.5 text-[10px] text-sage">
                    <Bookmark size={10} />
                    Complete
                  </span>
                )}
              </div>

              <h3 className="font-display text-2xl font-semibold leading-tight text-paper sm:text-3xl">
                {story.title}
              </h3>

              {story.hook ? (
                <blockquote className="border-l-2 border-amber/30 pl-4 font-reading text-[15px] italic leading-relaxed text-paper/90">
                  &ldquo;{story.hook}&rdquo;
                </blockquote>
              ) : story.synopsis ? (
                <p className="text-[13px] leading-relaxed text-text-secondary line-clamp-3">
                  {story.synopsis}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-text-ghost">
                <span className="inline-flex items-center gap-1">
                  <Feather size={11} className="text-text-ghost" />
                  {formatNumber(story.totalWords)} words
                </span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen size={11} className="text-text-ghost" />
                  {story.chapterCount} {story.chapterCount === 1 ? "chapter" : "chapters"}
                </span>
                {story.sparkCount > 0 && (
                  <span className={`inline-flex items-center gap-1 ${accentText}`}>
                    <Sparkles size={11} />
                    {formatNumber(story.sparkCount)} {story.sparkCount === 1 ? "spark" : "sparks"}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <span className="inline-flex items-center gap-1 text-[12px] text-text-secondary transition-colors group-hover:text-amber">
                  Open the cover
                  <ChevronRight size={13} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.section>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-amber">{eyebrow}</p>
        <h2 className="mt-1 font-display text-xl text-paper sm:text-2xl">{title}</h2>
      </div>
    </div>
  );
}
