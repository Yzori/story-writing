"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";

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

const GENRE_BG: Record<string, string> = {
  Fantasy: "bg-amber/[0.08] border-amber/25",
  "Science Fiction": "bg-lavender/[0.08] border-lavender/25",
  Romance: "bg-rose/[0.08] border-rose/25",
  Mystery: "bg-violet/[0.08] border-violet/25",
  Thriller: "bg-rose/[0.07] border-rose/22",
  Horror: "bg-rose/[0.08] border-rose/25",
  Adventure: "bg-teal/[0.08] border-teal/25",
  Contemporary: "bg-sage/[0.08] border-sage/25",
};

interface SparkedStory {
  storyId: string;
  title: string;
  slug: string | null;
  sparkedAt: string;
}

interface ReadingTasteProps {
  isOwner: boolean;
  sparksGiven: number;
  topGenres: { genre: string; count: number }[];
  recentSparks: SparkedStory[];
  ownerName?: string;
}

export default function ReadingTaste({
  isOwner,
  sparksGiven,
  topGenres,
  recentSparks,
  ownerName,
}: ReadingTasteProps) {
  if (sparksGiven === 0) return null;

  const subjectName = isOwner ? "you" : ownerName ?? "this writer";
  const verb = isOwner ? "have lit" : "has lit";
  const totalLabel = `${subjectName} ${verb} ${sparksGiven} ${sparksGiven === 1 ? "spark" : "sparks"}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto mt-8 max-w-5xl px-5 lg:px-8"
    >
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber">
            From the marginalia
          </p>
          <h2 className="mt-1 font-display text-xl text-paper sm:text-2xl">
            {isOwner ? "What you've been loving" : "Reading taste"}
          </h2>
        </div>
        <p className="hidden text-[11px] text-text-ghost sm:block">{totalLabel}</p>
      </div>

      <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-surface/82 p-6 backdrop-blur-xl shadow-[var(--t-shadow-card)]">
        <div className="absolute -left-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-amber/[0.08] blur-3xl" aria-hidden />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* Top genres column */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-ghost">
              Favorite shelves
            </p>
            <div className="mt-3 space-y-2">
              {topGenres.length === 0 ? (
                <p className="text-[13px] italic text-text-ghost">
                  Sparks not yet sorted by shelf.
                </p>
              ) : (
                topGenres.map((g) => {
                  const text = GENRE_TEXT[g.genre] ?? "text-amber";
                  const bg = GENRE_BG[g.genre] ?? "bg-amber/[0.08] border-amber/25";
                  const max = topGenres[0].count;
                  const pct = Math.max(15, Math.round((g.count / max) * 100));
                  return (
                    <div
                      key={g.genre}
                      className={`relative overflow-hidden rounded-xl border ${bg} px-3.5 py-2.5`}
                    >
                      <div
                        className={`absolute inset-y-0 left-0 ${bg.split(" ")[0]} opacity-40`}
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                      <div className="relative flex items-center justify-between">
                        <span className={`text-[13px] font-medium ${text}`}>
                          {g.genre}
                        </span>
                        <span className="font-mono text-[11px] text-text-ghost">
                          {g.count}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent sparks column */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-ghost">
              Recently sparked
            </p>
            <div className="mt-3 space-y-1.5">
              {recentSparks.length === 0 ? (
                <p className="text-[13px] italic text-text-ghost">
                  No public sparks to show.
                </p>
              ) : (
                recentSparks.map((s) => (
                  <Link
                    key={s.storyId}
                    href={`/story/${s.slug || s.storyId}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-elevated/40"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Sparkles size={11} className="flex-shrink-0 text-amber" />
                      <span className="truncate text-[13px] text-paper transition-colors group-hover:text-amber">
                        {s.title}
                      </span>
                    </div>
                    <ChevronRight
                      size={12}
                      className="flex-shrink-0 text-text-ghost opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                ))
              )}
            </div>
            <p className="mt-3 sm:hidden text-[11px] text-text-ghost">{totalLabel}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
