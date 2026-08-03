"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PenLine, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { ApiStory } from "@/types/api";
import { useRoomParallax, ZoneLabel } from "./Room";

// Genre cloth — the bound colors of each shelf
const CLOTH: Record<string, { spine: string; edge: string; text: string }> = {
  Fantasy:           { spine: "bg-amber/[0.13]",    edge: "border-amber/40",    text: "text-amber" },
  "Science Fiction": { spine: "bg-lavender/[0.13]", edge: "border-lavender/40", text: "text-lavender" },
  Romance:           { spine: "bg-rose/[0.13]",     edge: "border-rose/40",     text: "text-rose" },
  Mystery:           { spine: "bg-violet/[0.13]",   edge: "border-violet/40",   text: "text-violet" },
  Thriller:          { spine: "bg-rose/[0.11]",     edge: "border-rose/35",     text: "text-rose" },
  Horror:            { spine: "bg-rose/[0.13]",     edge: "border-rose/40",     text: "text-rose" },
  Adventure:         { spine: "bg-teal/[0.13]",     edge: "border-teal/40",     text: "text-teal" },
  Contemporary:      { spine: "bg-sage/[0.13]",     edge: "border-sage/40",     text: "text-sage" },
};
const DEFAULT_CLOTH = CLOTH.Fantasy;

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h;
}

/** Thicker books hold more words. */
function spineWidth(words: number): number {
  if (words > 60_000) return 46;
  if (words > 20_000) return 40;
  if (words > 6_000) return 34;
  return 28;
}

function Spine({
  story,
  isOwner,
  index,
}: {
  story: ApiStory;
  isOwner: boolean;
  index: number;
}) {
  const h = hash(story.id);
  const isDraft = story.status === "draft";
  const cloth = (story.genres[0] && CLOTH[story.genres[0]]) || DEFAULT_CLOTH;
  const height = 128 + (h % 36); // 128–164px
  const width = spineWidth(story.totalWords);
  // Every shelf has one book left leaning against the rest.
  const lean = h % 7 === 3 ? -6 : 0;
  const href = isDraft && isOwner ? `/write/${story.id}` : `/story/${story.slug || story.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.45 }}
      style={{ rotate: lean }}
      className={lean ? "origin-bottom-left" : undefined}
    >
      <Link
        href={href}
        title={`${story.title} — ${formatNumber(story.totalWords)} words${isDraft ? " (unbound draft)" : ""}`}
        className={`group relative block overflow-hidden rounded-t-[3px] rounded-b-[2px] border-l-2 transition-transform duration-300 hover:-translate-y-2 ${
          isDraft
            ? "border-dashed border-border bg-elevated/45"
            : `${cloth.edge} ${cloth.spine}`
        }`}
        style={{ height, width }}
      >
        {/* Gilt bands top and bottom */}
        {!isDraft && (
          <>
            <span className="absolute inset-x-0 top-1.5 h-px bg-amber/30" />
            <span className="absolute inset-x-0 bottom-1.5 h-px bg-amber/30" />
          </>
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center px-1 [writing-mode:vertical-rl] font-display text-[11px] leading-none tracking-wide ${
            isDraft ? "text-text-ghost italic" : "text-paper/85"
          } truncate`}
          style={{ maxHeight: height - 16 }}
        >
          {story.title}
        </span>
        {isDraft && (
          <PenLine size={9} className="absolute bottom-2 left-1/2 -translate-x-1/2 text-text-ghost" />
        )}
      </Link>
    </motion.div>
  );
}

interface BookshelfProps {
  featured: ApiStory | null;
  stories: ApiStory[];
  isOwner: boolean;
}

/**
 * The left wall: published works as cloth-bound spines standing on shelf
 * rules, the most-sparked volume displayed face-out. Spine thickness is
 * word count; drafts (owner only) stand unbound and pale.
 */
export default function Bookshelf({ featured, stories, isOwner }: BookshelfProps) {
  const parallax = useRoomParallax(3);
  const cloth =
    (featured?.genres[0] && CLOTH[featured.genres[0]]) || DEFAULT_CLOTH;

  // Five-ish spines per shelf row.
  const rows: ApiStory[][] = [];
  for (let i = 0; i < stories.length; i += 5) rows.push(stories.slice(i, i + 5));

  const empty = !featured && stories.length === 0;

  return (
    <motion.div style={parallax} className="flex h-full flex-col">
      <ZoneLabel>The shelves</ZoneLabel>

      {empty ? (
        <div>
          <p className="font-reading text-[12px] italic leading-relaxed text-text-ghost">
            {isOwner
              ? "The shelves are empty. Begin a manuscript when you're ready."
              : "The shelves are bare, for now."}
          </p>
          {isOwner && (
            <Link
              href="/create"
              className="mt-2 inline-block text-[12px] text-gold hover:text-gold-light transition-colors"
            >
              Start writing →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Face-out featured volume */}
          {featured && (
            <div>
              <Link
                href={`/story/${featured.slug || featured.id}`}
                className="group relative block w-fit"
              >
                <div
                  className={`relative h-40 w-28 overflow-hidden rounded-[4px] border ${cloth.edge} shadow-[0_10px_24px_rgba(2,4,9,0.5)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-[-1deg]`}
                >
                  {featured.coverImageUrl ? (
                    <img
                      src={featured.coverImageUrl}
                      alt={featured.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className={`flex h-full w-full flex-col justify-between p-2.5 ${cloth.spine}`}>
                      <span className="h-px w-full bg-amber/30" />
                      <span className="font-display text-[12px] leading-snug text-paper">
                        {featured.title}
                      </span>
                      <span className="h-px w-full bg-amber/30" />
                    </div>
                  )}
                </div>
                {/* The stand */}
                <span className="mx-auto mt-1 block h-1 w-16 rounded-full bg-void/60" />
              </Link>
              <p className={`mt-2 flex items-center gap-1.5 text-[10px] ${cloth.text}`}>
                <Sparkles size={10} />
                On display
                {featured.sparkCount > 0 && (
                  <span className="text-text-ghost">· {formatNumber(featured.sparkCount)} sparks</span>
                )}
              </p>
            </div>
          )}

          {/* Shelf rows */}
          {rows.map((row, r) => (
            <div key={r}>
              <div className="flex items-end gap-1.5">
                {row.map((story, i) => (
                  <Spine key={story.id} story={story} isOwner={isOwner} index={r * 5 + i} />
                ))}
              </div>
              {/* The shelf board */}
              <div className="mt-0.5 h-[3px] rounded-full bg-gradient-to-r from-amber/20 via-amber/10 to-transparent" />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
