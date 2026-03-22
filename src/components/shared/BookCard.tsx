"use client";

import Image from "next/image";
import Link from "next/link";

// ── Genre accent mapping ──
const GENRE_ACCENTS: Record<string, { gradient: string; text: string }> = {
  Fantasy: { gradient: "from-amber/60 via-amber/20 to-void", text: "text-amber" },
  "Science Fiction": { gradient: "from-lavender/60 via-lavender/20 to-void", text: "text-lavender" },
  Romance: { gradient: "from-rose/60 via-rose/20 to-void", text: "text-rose" },
  Mystery: { gradient: "from-violet/60 via-violet/20 to-void", text: "text-violet" },
  Thriller: { gradient: "from-rose/50 via-rose/15 to-void", text: "text-rose" },
  Horror: { gradient: "from-red-900/60 via-red-900/20 to-void", text: "text-red-400" },
  "Literary Fiction": { gradient: "from-sage/60 via-sage/20 to-void", text: "text-sage" },
  "Historical Fiction": { gradient: "from-copper/60 via-copper/20 to-void", text: "text-copper" },
  Adventure: { gradient: "from-teal/60 via-teal/20 to-void", text: "text-teal" },
  "Young Adult": { gradient: "from-lavender/50 via-lavender/15 to-void", text: "text-lavender" },
  Contemporary: { gradient: "from-sage/50 via-sage/15 to-void", text: "text-sage" },
  Dystopian: { gradient: "from-rose/50 via-rose/15 to-void", text: "text-rose" },
  "Urban Fantasy": { gradient: "from-amber/50 via-amber/15 to-void", text: "text-amber" },
  "Dark Fantasy": { gradient: "from-rose/60 via-rose/20 to-void", text: "text-rose" },
  Paranormal: { gradient: "from-violet/50 via-violet/15 to-void", text: "text-violet" },
  Crime: { gradient: "from-rose/50 via-rose/15 to-void", text: "text-rose" },
  Humor: { gradient: "from-sage/50 via-sage/15 to-void", text: "text-sage" },
  Drama: { gradient: "from-copper/50 via-copper/15 to-void", text: "text-copper" },
  "Slice of Life": { gradient: "from-sage/50 via-sage/15 to-void", text: "text-sage" },
  Action: { gradient: "from-burnt/60 via-burnt/20 to-void", text: "text-burnt" },
  "Magical Realism": { gradient: "from-amber/50 via-amber/15 to-void", text: "text-amber" },
  Mythology: { gradient: "from-amber/60 via-amber/20 to-void", text: "text-amber" },
  Steampunk: { gradient: "from-copper/60 via-copper/20 to-void", text: "text-copper" },
  Cyberpunk: { gradient: "from-lavender/60 via-lavender/20 to-void", text: "text-lavender" },
  Wuxia: { gradient: "from-amber/50 via-amber/15 to-void", text: "text-amber" },
  Isekai: { gradient: "from-lavender/50 via-lavender/15 to-void", text: "text-lavender" },
  LitRPG: { gradient: "from-teal/60 via-teal/20 to-void", text: "text-teal" },
  Poetry: { gradient: "from-sage/60 via-sage/20 to-void", text: "text-sage" },
  Memoir: { gradient: "from-copper/50 via-copper/15 to-void", text: "text-copper" },
  Fanfiction: { gradient: "from-violet/50 via-violet/15 to-void", text: "text-violet" },
};

const DEFAULT_ACCENT = { gradient: "from-amber/50 via-amber/15 to-void", text: "text-amber" };

function formatWordCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

interface BookCardProps {
  title: string;
  author?: string;
  coverUrl?: string;
  genres: string[];
  synopsis?: string;
  wordCount: number;
  chapterCount: number;
  sparkCount?: number;
  slug: string;
  href?: string;
}

export default function BookCard({
  title,
  author,
  coverUrl,
  genres,
  synopsis,
  wordCount,
  chapterCount,
  sparkCount,
  slug,
  href,
}: BookCardProps) {
  const linkHref = href || `/story/${slug}`;
  const primaryGenre = genres[0] || "Fantasy";
  const accent = GENRE_ACCENTS[primaryGenre] || DEFAULT_ACCENT;
  const displaySynopsis = synopsis || "A story waiting to be discovered. Open the cover and begin reading...";

  return (
    <Link href={linkHref} className="group pb-8 [perspective:1500px] cursor-pointer flex justify-center">
      <div className="relative w-full aspect-[2/3] max-w-[280px] shadow-xl transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.05] group-hover:z-50 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.3)]">

        {/* ── 1. The Book Base (Pages + Back Cover) ── */}
        <div className="absolute inset-0 rounded-r-2xl rounded-l-sm border-y border-r border-border shadow-[inset_10px_0_20px_rgba(0,0,0,0.15)] overflow-hidden bg-surface">
          {/* Inner spine shadow */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/30 via-black/10 to-transparent z-10 pointer-events-none" />

          {/* Page Content */}
          <div className="relative h-full flex flex-col p-6 pl-8">
            <p className={`text-[10px] uppercase tracking-[0.2em] mb-2 font-display ${accent.text}`}>Chapter One</p>
            <div className="w-12 h-px bg-border mb-5" />

            <p className="text-[13px] text-paper/80 leading-[1.8] font-reading flex-1">
              <span className={`float-left text-4xl leading-7 pr-1.5 pt-1.5 font-display ${accent.text}`}>
                {displaySynopsis.charAt(0)}
              </span>
              {displaySynopsis.substring(1)}
            </p>

            <div className="mt-auto pt-4 border-t border-border-subtle pb-1">
              <div className="flex items-center justify-between text-[11px] text-text-ghost font-medium">
                <div className="flex items-center gap-2">
                  <span>{formatWordCount(wordCount)} wds</span>
                  <span>{chapterCount} chs</span>
                </div>
                {sparkCount !== undefined && sparkCount > 0 && (
                  <span className={`flex items-center gap-1 ${accent.text}`}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                    </svg>
                    {sparkCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. The Hardcover (Front Flips Open) ── */}
        <div
          className="absolute inset-0 origin-left transition-transform duration-[800ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(-155deg)]"
        >
          {/* FRONT of the Cover */}
          <div className="absolute inset-0 bg-neutral-900 rounded-r-2xl rounded-l-sm overflow-hidden [backface-visibility:hidden] border-y border-r border-border border-l-[3px] border-l-black/20 shadow-[2px_0_15px_rgba(0,0,0,0.2)]">
            {/* Cover Art — image or gradient */}
            {coverUrl ? (
              <Image src={coverUrl} alt={title} fill sizes="200px" className="object-cover" unoptimized />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${accent.gradient}`} />
            )}

            {/* The Spine Crease */}
            <div className="absolute left-[2px] top-0 bottom-0 w-3 border-l border-r border-black/20 bg-gradient-to-r from-black/40 via-transparent to-black/20" />

            {/* Vignette */}
            <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.4)] pointer-events-none" />

            {/* Cover content — always light text since covers are dark/image-backed */}
            <div className="relative h-full flex flex-col justify-end p-6 z-10">
              <div className="mb-auto mt-4 ml-4">
                <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] text-white font-medium uppercase tracking-wider border border-white/20 shadow-xl">
                  {primaryGenre}
                </span>
              </div>

              <div className="ml-4">
                <h3 className="font-display text-white text-xl font-bold leading-[1.1] mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  {title}
                </h3>
                <div className="w-8 h-[2px] bg-white/40 mb-2 shadow-xl" />
                {author && (
                  <p className="text-white/80 text-[12px] font-medium tracking-wide uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    {author}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* BACK of the Cover (Inside Endpaper) */}
          <div
            className="absolute inset-0 rounded-l-2xl rounded-r-sm overflow-hidden [backface-visibility:hidden] border-y border-l border-border border-r border-void/50"
            style={{ transform: "rotateY(180deg)" }}
          >
            <div className="absolute inset-0 bg-surface" />
            {/* Inner spine shadow */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-void/90 via-void/40 to-transparent" />
            {/* Faint quill watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── 3. Drop Shadow ── */}
        <div className="absolute -bottom-4 left-4 right-2 h-6 bg-void/60 blur-[20px] rounded-full opacity-30 group-hover:opacity-70 group-hover:scale-95 transition-all duration-700 -z-10" />
      </div>
    </Link>
  );
}
