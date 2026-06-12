"use client";

import { motion } from "framer-motion";
import { ArrowRight, Feather, Flame, SlidersHorizontal } from "lucide-react";
import { formatNumber } from "@/lib/format";

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

interface CoverStory {
  title: string;
  coverImageUrl: string | null;
  genre: string | null;
}

interface ProfileCoverProps {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  genre: string | null;
  /** The writer's chosen cover work — null means portrait. */
  coverStory: CoverStory | null;
  storyCount: number;
  totalWords: number;
  audienceCount: number;
  candleCount: number;
  isOwner: boolean;
  userId: string;
  onArrange: () => void;
  onEnter: () => void;
}

/**
 * The cover: the profile's first screen is a poster, not a page. One huge
 * lamplit disc — the writer's portrait, or the work they chose to front
 * the study — their name in display type, a single line in their voice,
 * and one way in.
 */
export default function ProfileCover({
  displayName,
  avatarUrl,
  bio,
  role,
  genre,
  coverStory,
  storyCount,
  totalWords,
  audienceCount,
  candleCount,
  isOwner,
  userId,
  onArrange,
  onEnter,
}: ProfileCoverProps) {
  const accentText = (genre && GENRE_TEXT[genre]) || "text-amber";
  const discImage = coverStory ? coverStory.coverImageUrl : avatarUrl;

  const statParts: string[] = [];
  if (storyCount > 0) statParts.push(`${storyCount} ${storyCount === 1 ? "story" : "stories"}`);
  if (totalWords > 0) statParts.push(`${formatNumber(totalWords)} words`);
  if (audienceCount > 0) statParts.push(`${formatNumber(audienceCount)} ${audienceCount === 1 ? "reader" : "readers"}`);

  // The cover line: the bio's first sentence, in the writer's own hand.
  const tagline = bio
    ? (bio.match(/^[^.!?]+[.!?]?/)?.[0] ?? bio).trim()
    : null;

  return (
    <section className="relative flex min-h-[92svh] flex-col overflow-hidden">
      {/* The one key to the room, top right */}
      {isOwner && (
        <div className="absolute right-5 top-5 z-20 lg:right-10 lg:top-8">
          <button
            onClick={onArrange}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/[0.05] px-3 py-1.5 text-[11px] text-amber backdrop-blur-xl transition-colors hover:bg-amber/10"
          >
            <SlidersHorizontal size={11} />
            Arrange the study
          </button>
        </div>
      )}

      {/* Candles burning, a small mark */}
      {candleCount > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute left-5 top-6 z-20 flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-amber/80 lg:left-10 lg:top-9"
        >
          <Flame size={11} />
          {candleCount} {candleCount === 1 ? "candle" : "candles"} burning
        </motion.p>
      )}

      {/* The disc — a full moon of lamplight */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center lg:justify-end lg:pr-[12vw]">
        {/* opacity-only entrance — scale transforms leave the raster layer
            cached at sub-resolution, permanently blurring the art */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 0.8, 0.3, 1] }}
          className="relative -mt-[6svh] aspect-square w-[min(74vw,58svh)] lg:w-[min(44vw,72svh)]"
        >
          {/* Halo */}
          <motion.div
            aria-hidden
            className="absolute -inset-10 rounded-full bg-amber/[0.10] blur-3xl"
            animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.04, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Gold rim */}
          <div className="absolute -inset-2 rounded-full border border-amber/20" />
          <div className="absolute inset-0 overflow-hidden rounded-full border border-amber/30 bg-elevated shadow-[0_0_80px_rgba(226,172,74,0.12)]">
            {discImage ? (
              <img
                src={discImage}
                alt={coverStory ? coverStory.title : displayName}
                className="h-full w-full object-cover"
              />
            ) : coverStory ? (
              /* A work without art fronts the disc as a cloth binding */
              <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-[radial-gradient(circle_at_38%_30%,rgba(226,172,74,0.14),transparent_62%)] px-[14%] text-center">
                <span className="h-px w-2/3 bg-amber/30" />
                <span className="font-display text-[clamp(1.6rem,3.2vw,2.8rem)] font-semibold leading-tight text-paper">
                  {coverStory.title}
                </span>
                <span className="h-px w-2/3 bg-amber/30" />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_38%_30%,rgba(226,172,74,0.16),transparent_60%)]">
                <span className="font-display text-[clamp(6rem,18vw,13rem)] font-semibold text-paper/80">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* Lamplight falls across the disc; the far edge keeps its shadow */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(226,172,74,0.10),transparent_55%)]" />
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_35%,transparent_62%,rgba(2,4,9,0.4)_100%)]" />
          </div>

          {/* When a work fronts the cover, the writer rides along as a
              medallion at the disc's lower rim — the hand behind the book */}
          {coverStory && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6, ease: [0.22, 0.8, 0.3, 1] }}
              className="absolute bottom-[10%] right-[-2%] h-[19%] w-[19%]"
            >
              <div className="absolute -inset-1 rounded-full border border-amber/25" />
              <div className="relative h-full w-full overflow-hidden rounded-full border border-amber/40 bg-elevated shadow-[0_10px_30px_rgba(2,4,9,0.6)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_38%_30%,rgba(226,172,74,0.18),transparent_65%)]">
                    <span className="font-display text-[clamp(1.4rem,3vw,2.6rem)] font-semibold text-paper/85">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {coverStory && (
            <p className="absolute -bottom-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tracking-[0.18em] text-text-ghost lg:block">
              from <span className="text-text-secondary">{coverStory.title}</span>
            </p>
          )}
        </motion.div>
      </div>

      {/* Name block, lower left */}
      <div className="relative z-10 mt-auto px-6 pb-[16svh] lg:px-12 lg:pb-24">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.34em] ${accentText}`}
        >
          <Feather size={11} />
          The study of
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.8, ease: [0.22, 0.8, 0.3, 1] }}
          className="mt-3 max-w-[12ch] font-display text-[clamp(3rem,9vw,7.5rem)] font-semibold leading-[0.95] tracking-tight text-paper"
        >
          {displayName}
        </motion.h1>
        {tagline && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.8 }}
            className="mt-5 max-w-md font-reading text-[15px] italic leading-relaxed text-text-secondary"
          >
            &ldquo;{tagline}&rdquo;
          </motion.p>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-4 font-mono text-[11px] tracking-wider text-text-ghost"
        >
          <span className="capitalize">{role}</span>
          {genre ? ` · most at home in ${genre}` : ""}
          {statParts.length > 0 ? `  ·  ${statParts.join(" · ")}` : ""}
        </motion.p>
      </div>

      {/* The way in, lower right */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.05, duration: 0.8 }}
        onClick={onEnter}
        className="group absolute bottom-[7svh] right-6 z-10 flex items-center gap-3 lg:bottom-16 lg:right-12"
      >
        <span className="text-[11px] uppercase tracking-[0.26em] text-text-secondary transition-colors group-hover:text-paper">
          {isOwner ? "Step inside" : "View the full study"}
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-amber/30 bg-amber/[0.06] text-amber transition-all group-hover:bg-amber group-hover:text-void group-hover:shadow-[0_0_22px_rgba(226,172,74,0.35)]">
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </motion.button>

      {/* Floor shadow into the room */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-void/70 to-transparent" />
    </section>
  );
}
