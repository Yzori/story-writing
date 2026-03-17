"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const GENRE_ACCENT: Record<string, string> = {
  Fantasy: "text-amber",
  "Science Fiction": "text-lavender",
  Romance: "text-rose",
  Mystery: "text-violet",
  Thriller: "text-rose",
  Horror: "text-rose",
  Adventure: "text-teal",
  Contemporary: "text-sage",
};

interface HalfTitleProps {
  displayName: string;
  role: string;
  createdAt: string;
  genre: string | null;
  isOwner: boolean;
  userId: string;
}

export default function HalfTitle({
  displayName,
  role,
  createdAt,
  genre,
  isOwner,
  userId,
}: HalfTitleProps) {
  const accentClass = (genre && GENRE_ACCENT[genre]) || "text-amber";
  const year = new Date(createdAt).getFullYear();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 relative group"
    >
      <p
        className={`text-[10px] uppercase tracking-[0.25em] ${accentClass} mb-6`}
      >
        {role}
      </p>
      <h1 className="font-display text-[clamp(3rem,8vw,7rem)] text-paper font-semibold leading-[0.95] mb-6 max-w-4xl">
        {displayName}
      </h1>
      <p className="font-mono text-[11px] text-text-ghost tracking-wide">
        Writing since {year}
      </p>

      {isOwner && (
        <Link
          href={`/profile/${userId}/edit`}
          className="absolute top-1/2 right-8 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-text-ghost hover:text-paper"
          aria-label="Edit profile"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
          </svg>
        </Link>
      )}

      <div className="flourish w-48 mt-10" aria-hidden="true">
        <span className={`text-[14px] ${accentClass} opacity-40`}>&#10043;</span>
      </div>
    </motion.section>
  );
}
