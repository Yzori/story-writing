"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Feather,
  Flame,
  BookOpen,
  Sparkles,
  Hammer,
  ChevronRight,
  Moon,
} from "lucide-react";
import { formatNumber, formatTimeAgo } from "@/lib/format";
import type { ApiStory } from "@/types/api";

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

interface NightstandStory {
  id: string;
  title: string;
  slug: string | null;
  authorName: string | null;
  chapterCount: number;
}

interface BackroomProps {
  userId: string;
  stories: ApiStory[];
  followedStories: NightstandStory[];
  insights: {
    sparksGiven: number;
    topReadingGenres: { genre: string; count: number }[];
    readingStreakDays: number;
    readingStreakBest: number;
  } | null;
  offeringsCount: number;
  offeringsCompleted: number;
  hasRosterProfile: boolean | null;
}

function Tile({
  span,
  eyebrow,
  delay,
  children,
}: {
  span: string;
  eyebrow: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay, duration: 0.45 }}
      className={`${span} flex min-w-0 flex-col rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur-xl`}
    >
      <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-text-ghost">{eyebrow}</p>
      <div className="min-h-0 flex-1">{children}</div>
    </motion.div>
  );
}

/**
 * The back room — the owner's private drawer behind the public study,
 * laid as a bento grid: current manuscript, nightstand, taste, streak,
 * studio. Dense and scannable; no full-width stacking.
 */
export default function OwnerBackroom({
  userId,
  stories,
  followedStories,
  insights,
  offeringsCount,
  offeringsCompleted,
  hasRosterProfile,
}: BackroomProps) {
  // The manuscript with wet ink: most recently touched, drafts first.
  const current =
    [...stories].sort((a, b) => {
      const draftBoost = (s: ApiStory) => (s.status === "draft" ? 1 : 0);
      return (
        draftBoost(b) - draftBoost(a) ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    })[0] ?? null;

  const topGenres = insights?.topReadingGenres ?? [];
  const maxGenre = Math.max(1, ...topGenres.map((g) => g.count));
  const publishedCount = stories.filter((s) => s.status === "published").length;

  return (
    <section className="relative mx-auto mt-10 max-w-6xl px-5 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.28em] text-text-ghost">
          Behind the desk — only you see this
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Wet ink — the manuscript in progress */}
        <Tile span="col-span-7" eyebrow="Wet ink — your manuscript in progress" delay={0}>
          {current ? (
            <div className="flex h-full flex-col">
              <h3 className="font-display text-xl font-semibold leading-snug text-paper">
                {current.title}
              </h3>
              <p className="mt-1.5 font-mono text-[11px] tracking-wider text-text-ghost">
                {current.status === "draft" ? "draft" : "published"} ·{" "}
                {formatNumber(Number(current.totalWords))} words · touched{" "}
                {formatTimeAgo(current.updatedAt)}
              </p>
              <div className="mt-auto pt-4">
                <Link
                  href={`/write/${current.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber px-4 py-1.5 text-[12px] font-semibold text-void transition-all hover:shadow-[0_0_18px_rgba(226,172,74,0.25)]"
                >
                  <Feather size={12} />
                  Continue writing
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <p className="font-reading text-[14px] italic text-text-secondary">
                No manuscript on the desk yet.
              </p>
              <div className="mt-auto pt-4">
                <Link
                  href="/create"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber px-4 py-1.5 text-[12px] font-semibold text-void transition-all hover:shadow-[0_0_18px_rgba(226,172,74,0.25)]"
                >
                  <Feather size={12} />
                  Begin one
                </Link>
              </div>
            </div>
          )}
        </Tile>

        {/* The nightstand — what you're reading */}
        <Tile span="col-span-5" eyebrow="On the nightstand" delay={0.05}>
          {followedStories.length > 0 ? (
            <ul className="space-y-2.5">
              {followedStories.slice(0, 3).map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/story/${s.slug || s.id}`}
                    className="group flex items-baseline justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-text transition-colors group-hover:text-amber">
                        {s.title}
                      </span>
                      <span className="block truncate text-[10px] text-text-ghost">
                        {s.authorName || "Unknown hand"} · {s.chapterCount}{" "}
                        {s.chapterCount === 1 ? "chapter" : "chapters"}
                      </span>
                    </span>
                    <Moon size={11} className="shrink-0 text-text-ghost transition-colors group-hover:text-amber" />
                  </Link>
                </li>
              ))}
              {followedStories.length > 3 && (
                <li className="text-[10px] italic text-text-ghost">
                  …and {followedStories.length - 3} more
                </li>
              )}
            </ul>
          ) : (
            <p className="font-reading text-[13px] italic text-text-ghost">
              The nightstand is empty.{" "}
              <Link href="/browse" className="text-amber underline-offset-2 hover:underline">
                Wander the stacks?
              </Link>
            </p>
          )}
        </Tile>

        {/* Reading taste */}
        <Tile span="col-span-4" eyebrow="Your taste in ink" delay={0.1}>
          {topGenres.length > 0 ? (
            <div className="space-y-2.5">
              {topGenres.map((g) => (
                <div key={g.genre}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className={`text-[11px] ${GENRE_TEXT[g.genre] || "text-text-secondary"}`}>
                      {g.genre}
                    </span>
                    <span className="font-mono text-[10px] text-text-ghost">{g.count}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-subtle">
                    <div
                      className="h-full rounded-full bg-amber/60"
                      style={{ width: `${Math.round((g.count / maxGenre) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 font-mono text-[10px] tracking-wider text-text-ghost">
                <Sparkles size={9} className="mr-1 inline text-amber" />
                {formatNumber(insights?.sparksGiven ?? 0)} sparks given
              </p>
            </div>
          ) : (
            <p className="font-reading text-[13px] italic text-text-ghost">
              Spark stories you love and your taste takes shape here.
            </p>
          )}
        </Tile>

        {/* Reading streak */}
        <Tile span="col-span-3" eyebrow="Reading streak" delay={0.15}>
          <div className="flex h-full flex-col items-start">
            <p className="flex items-baseline gap-2">
              <Flame size={16} className={`self-center ${(insights?.readingStreakDays ?? 0) > 0 ? "text-amber" : "text-text-ghost"}`} />
              <span className="font-display text-3xl font-semibold leading-none text-paper">
                {insights?.readingStreakDays ?? 0}
              </span>
              <span className="text-[11px] text-text-ghost">
                {(insights?.readingStreakDays ?? 0) === 1 ? "night" : "nights"} reading
              </span>
            </p>
            <p className="mt-auto pt-3 font-mono text-[10px] tracking-wider text-text-ghost">
              {(insights?.readingStreakDays ?? 0) === 0
                ? "the lamp waits to be lit"
                : (insights?.readingStreakBest ?? 0) > (insights?.readingStreakDays ?? 0)
                  ? `best: ${insights?.readingStreakBest}`
                  : "this is your best run"}
            </p>
          </div>
        </Tile>

        {/* The studio / roster */}
        <Tile span="col-span-5" eyebrow="Your studio" delay={0.2}>
          {offeringsCount > 0 ? (
            <div className="flex h-full flex-col">
              <p className="flex items-center gap-2 text-[13px] text-text">
                <Hammer size={13} className="text-amber" />
                {offeringsCount} {offeringsCount === 1 ? "craft" : "crafts"} on offer
                {offeringsCompleted > 0 && (
                  <span className="text-[10px] text-text-ghost">
                    · {offeringsCompleted} delivered
                  </span>
                )}
              </p>
              <div className="mt-auto pt-4">
                <Link
                  href="/scriptorium/studio"
                  className="inline-flex items-center gap-1 text-[11px] text-amber underline-offset-2 hover:underline"
                >
                  Tend the studio
                  <ChevronRight size={11} />
                </Link>
              </div>
            </div>
          ) : hasRosterProfile === false && publishedCount > 0 ? (
            <div className="flex h-full flex-col">
              <p className="text-[13px] leading-relaxed text-text-secondary">
                {publishedCount} published {publishedCount === 1 ? "story" : "stories"} and
                no card on the Roster — let collaborators find you.
              </p>
              <div className="mt-auto pt-4">
                <Link
                  href="/roster/setup"
                  className="inline-flex items-center gap-1 text-[11px] text-amber underline-offset-2 hover:underline"
                >
                  Post your card
                  <ChevronRight size={11} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <p className="flex items-center gap-2 text-[13px] text-text-secondary">
                <BookOpen size={13} className="text-text-ghost" />
                No commissions set out.
              </p>
              <div className="mt-auto pt-4">
                <Link
                  href="/scriptorium"
                  className="inline-flex items-center gap-1 text-[11px] text-amber underline-offset-2 hover:underline"
                >
                  Open a studio
                  <ChevronRight size={11} />
                </Link>
              </div>
            </div>
          )}
        </Tile>
      </div>
    </section>
  );
}
