"use client";

import { motion } from "framer-motion";
import BookSpine from "./BookSpine";

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

interface BookshelfProps {
  stories: Story[];
  isOwner: boolean;
  label?: string;
  emptyText?: string;
  emptyLink?: { text: string; href: string };
  showDrafts?: boolean;
  variant?: "default" | "nightstand";
}

export default function Bookshelf({
  stories,
  isOwner,
  label = "Collected Works",
  emptyText = "More volumes forthcoming...",
  emptyLink,
  showDrafts = false,
  variant = "default",
}: BookshelfProps) {
  const visible = stories.filter(
    (s) => s.status !== "draft" || (showDrafts && isOwner)
  );

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.55, duration: 0.6 }}
      className={`max-w-3xl mx-auto px-6 mb-16 ${
        variant === "nightstand" ? "border-l-2 border-paper/10 pl-8" : ""
      }`}
    >
      <p className="section-label mb-8">{label}</p>

      {visible.length > 0 ? (
        <>
          <div className="flex items-end gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {visible.map((story, i) => (
              <BookSpine
                key={story.id}
                story={story}
                isDraft={story.status === "draft"}
                index={i}
              />
            ))}
          </div>
          {/* Shelf line */}
          <div className="h-px bg-border mt-1 shadow-sm" />
        </>
      ) : (
        <div className="py-12 text-center">
          <p className="font-reading italic text-text-ghost text-[13px]">
            {emptyText}
          </p>
          {emptyLink && (
            <a
              href={emptyLink.href}
              className="text-amber text-[12px] mt-3 inline-block hover:text-amber-light transition-colors"
            >
              {emptyLink.text} &rarr;
            </a>
          )}
        </div>
      )}
    </motion.section>
  );
}
