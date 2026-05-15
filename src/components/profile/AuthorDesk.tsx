"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Feather,
  BookOpen,
  Sparkles,
  Pencil,
  Library,
  Flame,
  Users,
  Droplet,
} from "lucide-react";
import { formatNumber } from "@/lib/format";

const GENRE_ACCENT: Record<string, { text: string; ring: string; tile: string; halo: string }> = {
  Fantasy:           { text: "text-amber",    ring: "border-amber/30",    tile: "bg-amber/[0.08]",    halo: "bg-amber/[0.18]" },
  "Science Fiction": { text: "text-lavender", ring: "border-lavender/30", tile: "bg-lavender/[0.08]", halo: "bg-lavender/[0.18]" },
  Romance:           { text: "text-rose",     ring: "border-rose/30",     tile: "bg-rose/[0.08]",     halo: "bg-rose/[0.18]" },
  Mystery:           { text: "text-violet",   ring: "border-violet/30",   tile: "bg-violet/[0.08]",   halo: "bg-violet/[0.18]" },
  Thriller:          { text: "text-rose",     ring: "border-rose/25",     tile: "bg-rose/[0.07]",     halo: "bg-rose/[0.16]" },
  Horror:            { text: "text-rose",     ring: "border-rose/30",     tile: "bg-rose/[0.08]",     halo: "bg-rose/[0.18]" },
  Adventure:         { text: "text-teal",     ring: "border-teal/30",     tile: "bg-teal/[0.08]",     halo: "bg-teal/[0.18]" },
  Contemporary:      { text: "text-sage",     ring: "border-sage/30",     tile: "bg-sage/[0.08]",     halo: "bg-sage/[0.18]" },
};

const DEFAULT_ACCENT = GENRE_ACCENT.Fantasy;

interface AuthorDeskProps {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
  genre: string | null;
  isOwner: boolean;
  userId: string;
  storyCount: number;
  totalWords: number;
  totalSparks: number;
  readingStreakDays?: number;
  readingStreakBest?: number;
  audienceCount?: number;
  inkDropsReceived?: number;
}

export default function AuthorDesk({
  displayName,
  avatarUrl,
  bio,
  role,
  createdAt,
  genre,
  isOwner,
  userId,
  storyCount,
  totalWords,
  totalSparks,
  readingStreakDays = 0,
  readingStreakBest = 0,
  audienceCount = 0,
  inkDropsReceived = 0,
}: AuthorDeskProps) {
  const accent = (genre && GENRE_ACCENT[genre]) || DEFAULT_ACCENT;
  const memberYear = new Date(createdAt).getFullYear();
  const memberLabel = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative mx-auto max-w-5xl px-5 pt-6 lg:px-8"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface/88 shadow-[var(--t-shadow-modal)] backdrop-blur-xl">
        {/* Lamp glow over the top */}
        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${accent.tile} to-transparent`} />
        <div className={`absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl opacity-70 ${accent.halo}`} />

        {/* Eyebrow strip */}
        <div className="relative flex items-center justify-between gap-3 px-6 pt-6 lg:px-10">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-elevated/70 text-amber">
              <Library size={13} />
            </span>
            <p className={`text-[10px] uppercase tracking-[0.28em] ${accent.text}`}>Author&apos;s desk</p>
          </div>
          {isOwner && (
            <Link
              href={`/profile/${userId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated/70 px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:text-paper"
            >
              <Pencil size={11} />
              Edit profile
            </Link>
          )}
        </div>

        <div className="relative grid gap-8 px-6 py-7 lg:grid-cols-[auto_1fr] lg:px-10 lg:py-9">
          {/* Framed portrait */}
          <div className="flex justify-center lg:block">
            <div className="relative">
              <div className={`absolute -inset-3 rounded-[1.5rem] border ${accent.ring} opacity-50`} />
              <div className={`absolute -inset-1 rounded-[1.1rem] border ${accent.ring}`} />
              <div className="relative h-32 w-32 overflow-hidden rounded-[1rem] border border-border bg-elevated shadow-[var(--t-shadow-card-hover)] sm:h-36 sm:w-36">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center ${accent.tile}`}>
                    <span className="font-display text-4xl text-paper/85 font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {/* Wax-seal dot */}
              <div className={`absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border ${accent.ring} ${accent.tile} ${accent.text}`}>
                <Feather size={12} />
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="min-w-0 text-center lg:text-left">
            <p className={`text-[10px] uppercase tracking-[0.22em] ${accent.text}`}>{role}</p>
            <h1 className="mt-1 font-display text-[clamp(2.25rem,6vw,3.75rem)] font-semibold leading-[1.02] text-paper">
              {displayName}
            </h1>

            <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated/70 px-2.5 py-1 text-[11px] text-text-secondary">
                <Feather size={11} className={accent.text} />
                Writing since {memberLabel}
              </span>
              {genre && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border ${accent.ring} ${accent.tile} px-2.5 py-1 text-[11px] ${accent.text}`}>
                  Most at home in {genre}
                </span>
              )}
            </div>

            {bio ? (
              <p className="mt-5 max-w-2xl font-reading text-[15px] italic leading-relaxed text-text-secondary">
                &ldquo;{bio}&rdquo;
              </p>
            ) : isOwner ? (
              <p className="mt-5 max-w-2xl font-reading text-[13px] italic text-text-ghost">
                A line of biography would warm the room.{" "}
                <Link href={`/profile/${userId}/edit`} className={`underline-offset-2 hover:underline ${accent.text}`}>
                  Add one
                </Link>
                .
              </p>
            ) : null}

            {/* Stat tiles */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <StatTile
                icon={<BookOpen size={13} />}
                value={storyCount === 0 ? "—" : String(storyCount)}
                label={storyCount === 1 ? "story" : "stories"}
                accent={accent}
              />
              <StatTile
                icon={<Feather size={13} />}
                value={totalWords > 0 ? formatNumber(totalWords) : "—"}
                label="words"
                accent={accent}
              />
              <StatTile
                icon={<Sparkles size={13} />}
                value={totalSparks > 0 ? formatNumber(totalSparks) : "—"}
                label={totalSparks === 1 ? "spark" : "sparks"}
                accent={accent}
              />
            </div>

            <IdentityRibbon
              isOwner={isOwner}
              readingStreakDays={readingStreakDays}
              readingStreakBest={readingStreakBest}
              audienceCount={audienceCount}
              inkDropsReceived={inkDropsReceived}
              accent={accent}
            />

            <p className="mt-5 font-mono text-[10px] tracking-wider text-text-ghost">
              Member of the library since {memberYear}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function IdentityRibbon({
  isOwner,
  readingStreakDays,
  readingStreakBest,
  audienceCount,
  inkDropsReceived,
  accent,
}: {
  isOwner: boolean;
  readingStreakDays: number;
  readingStreakBest: number;
  audienceCount: number;
  inkDropsReceived: number;
  accent: typeof DEFAULT_ACCENT;
}) {
  // For public viewers: hide chips with no meaningful value rather than
  // showing empty prompts. Owners see the prompts (sets a tone of "you
  // could do this").
  const showStreak = isOwner || readingStreakDays > 0;
  const showAudience = isOwner || audienceCount > 0;
  const showDrops = isOwner || inkDropsReceived > 0;

  if (!showStreak && !showAudience && !showDrops) return null;

  const streakLabel = readingStreakDays > 0
    ? `${readingStreakDays}-day reading streak`
    : "Begin a reading streak";
  const streakSub = readingStreakBest > readingStreakDays
    ? `Best: ${readingStreakBest}`
    : null;

  const audienceLabel = audienceCount > 0
    ? `${formatNumber(audienceCount)} ${audienceCount === 1 ? "reader" : "readers"}`
    : "No readers yet";

  const dropsLabel = inkDropsReceived > 0
    ? `${formatNumber(inkDropsReceived)} ink drops gifted`
    : "Awaiting first drop";

  return (
    <div className="mt-4 flex flex-wrap items-stretch gap-2">
      {showStreak && (
        <RibbonChip
          icon={<Flame size={11} />}
          label={streakLabel}
          sub={streakSub}
          accent={accent}
          muted={readingStreakDays === 0}
          href={isOwner && readingStreakDays === 0 ? "/browse" : undefined}
        />
      )}
      {showAudience && (
        <RibbonChip
          icon={<Users size={11} />}
          label={audienceLabel}
          accent={accent}
          muted={audienceCount === 0}
        />
      )}
      {showDrops && (
        <RibbonChip
          icon={<Droplet size={11} />}
          label={dropsLabel}
          accent={accent}
          muted={inkDropsReceived === 0}
        />
      )}
    </div>
  );
}

function RibbonChip({
  icon,
  label,
  sub,
  accent,
  muted,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string | null;
  accent: typeof DEFAULT_ACCENT;
  muted?: boolean;
  href?: string;
}) {
  const content = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        muted
          ? "border-border bg-elevated/50 text-text-ghost"
          : `${accent.ring} ${accent.tile} ${accent.text}`
      }`}
    >
      <span className={muted ? "text-text-ghost" : accent.text}>{icon}</span>
      <span>{label}</span>
      {sub && (
        <span className="ml-1 border-l border-border-subtle pl-1.5 text-text-ghost">{sub}</span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80">
        {content}
      </Link>
    );
  }
  return content;
}

function StatTile({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: typeof DEFAULT_ACCENT;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-elevated/55 px-3 py-3 text-center sm:text-left`}>
      <div className={`mb-1 inline-flex items-center gap-1.5 ${accent.text}`}>
        {icon}
        <span className="text-[9px] uppercase tracking-wider text-text-ghost">{label}</span>
      </div>
      <p className="font-display text-2xl font-semibold leading-none text-paper">{value}</p>
    </div>
  );
}
