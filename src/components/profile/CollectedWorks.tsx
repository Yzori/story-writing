"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, ChevronRight, Sparkles, Feather, PenLine } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface ShelfStory {
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

const GENRE_GRADIENT: Record<string, string> = {
  Fantasy: "from-amber/30 via-amber/10 to-transparent",
  "Science Fiction": "from-lavender/30 via-lavender/10 to-transparent",
  Romance: "from-rose/30 via-rose/10 to-transparent",
  Mystery: "from-violet/30 via-violet/10 to-transparent",
  Thriller: "from-rose/25 via-rose/10 to-transparent",
  Horror: "from-rose/30 via-rose/10 to-transparent",
  Adventure: "from-teal/25 via-teal/10 to-transparent",
  Contemporary: "from-sage/25 via-sage/10 to-transparent",
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

const STATUS_BADGE: Record<string, { label: string; dot: string; text: string }> = {
  draft: { label: "Draft", dot: "bg-text-ghost", text: "text-text-ghost" },
  "in-progress": { label: "In progress", dot: "bg-amber", text: "text-amber" },
  "on-hiatus": { label: "On hiatus", dot: "bg-lavender", text: "text-lavender" },
  complete: { label: "Complete", dot: "bg-sage", text: "text-sage" },
};

interface CollectedWorksProps {
  stories: ShelfStory[];
  isOwner: boolean;
  showDrafts?: boolean;
  /** Override section title. */
  label?: string;
  /** Override section eyebrow. */
  eyebrow?: string;
  /** Empty-state copy. */
  emptyText?: string;
  /** Empty-state CTA. */
  emptyLink?: { text: string; href: string };
  /** Visual variant for the section frame. */
  variant?: "default" | "nightstand";
}

export default function CollectedWorks({
  stories,
  isOwner,
  showDrafts = false,
  label = "Collected works",
  eyebrow = "The shelves",
  emptyText,
  emptyLink,
  variant = "default",
}: CollectedWorksProps) {
  const visible = stories.filter(
    (s) => s.status !== "draft" || (showDrafts && isOwner)
  );

  // Hide the section entirely if there's nothing meaningful to show and
  // there's no empty-state copy to display.
  if (visible.length === 0 && !emptyText) return null;

  const isNightstand = variant === "nightstand";
  const sectionFrame = isNightstand
    ? "border-amber/10 bg-ink/55"
    : "border-border bg-surface/82";
  const eyebrowColor = isNightstand ? "text-lavender" : "text-amber";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto mt-8 max-w-5xl px-5 lg:px-8"
    >
      <div className={`relative overflow-hidden rounded-[1.75rem] border ${sectionFrame} p-5 shadow-[var(--t-shadow-card)] backdrop-blur-xl sm:p-6 lg:p-7`}>
        {isNightstand && (
          <div className="absolute -left-10 top-0 h-32 w-32 rounded-full bg-lavender/[0.10] blur-3xl" aria-hidden />
        )}

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={`text-[10px] uppercase tracking-[0.22em] ${eyebrowColor}`}>{eyebrow}</p>
            <h2 className="mt-1 font-display text-xl text-paper sm:text-2xl">{label}</h2>
          </div>
          {visible.length > 3 && (
            <span className="text-[11px] text-text-ghost">{visible.length} {visible.length === 1 ? "title" : "titles"}</span>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-border bg-elevated/40 p-8 text-center">
            <p className="font-reading italic text-[13px] text-text-ghost">
              {emptyText}
            </p>
            {emptyLink && (
              <Link
                href={emptyLink.href}
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-amber transition-colors hover:text-amber-light"
              >
                {emptyLink.text}
                <ChevronRight size={12} />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((story, i) => (
              <ShelfCard key={story.id} story={story} index={i} isOwner={isOwner} />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

function ShelfCard({
  story,
  index,
  isOwner,
}: {
  story: ShelfStory;
  index: number;
  isOwner: boolean;
}) {
  const genre = story.genres[0];
  const gradient = (genre && GENRE_GRADIENT[genre]) || GENRE_GRADIENT.Fantasy;
  const accentText = (genre && GENRE_TEXT[genre]) || "text-amber";
  const status = STATUS_BADGE[story.status] ?? null;
  const href = story.status === "draft" && isOwner
    ? `/write/${story.id}`
    : `/story/${story.slug || story.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.04 * index, duration: 0.35 }}
    >
      <Link
        href={href}
        className="group relative block h-full overflow-hidden rounded-2xl border border-border bg-elevated/55 transition-all hover:-translate-y-0.5 hover:border-amber/30"
      >
        <div className={`relative h-24 bg-gradient-to-br ${gradient}`}>
          {story.status === "draft" && isOwner && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-void/55 px-2 py-0.5 text-[10px] text-text-ghost backdrop-blur">
              <PenLine size={10} />
              Draft
            </span>
          )}
        </div>

        <div className="space-y-2 p-4">
          {genre && (
            <p className={`text-[9px] uppercase tracking-[0.18em] ${accentText}`}>{genre}</p>
          )}
          <h3 className="font-display text-[15px] leading-snug text-paper line-clamp-2 group-hover:text-amber transition-colors">
            {story.title}
          </h3>
          {story.synopsis && (
            <p className="text-[11px] leading-relaxed text-text-secondary line-clamp-2">
              {story.synopsis}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[10px] text-text-ghost">
            <span className="inline-flex items-center gap-1">
              <Feather size={10} />
              {formatNumber(story.totalWords)}
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen size={10} />
              {story.chapterCount}
            </span>
            {story.sparkCount > 0 && (
              <span className={`inline-flex items-center gap-1 ${accentText}`}>
                <Sparkles size={10} />
                {story.sparkCount}
              </span>
            )}
            {status && (
              <span className={`ml-auto inline-flex items-center gap-1 ${status.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
