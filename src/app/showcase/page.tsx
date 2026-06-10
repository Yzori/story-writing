"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import StoryCard from "@/components/shared/StoryCard";

interface StaffPickStory {
  id: string;
  pickId: string;
  curatorNote: string;
  pickedBy: string;
  title: string;
  format: string;
  synopsis: string | null;
  hook: string | null;
  coverImageUrl: string | null;
  genres: string[];
  contentRating: string;
  slug: string | null;
  authorName: string | null;
  chapterCount: number;
  totalWords: number;
  sparkCount: number;
}

const FORMAT_GROUPS: { key: string; label: string; tagline: string }[] = [
  { key: "novel", label: "Novels", tagline: "Long-form fiction, chapter by chapter" },
  { key: "poetry", label: "Poetry", tagline: "Verse, stanza, and the spaces between" },
  { key: "screenplay", label: "Screenplays", tagline: "Stories built from scenes and dialogue" },
  { key: "webtoon", label: "Webtoons", tagline: "Vertical-scroll comics" },
  { key: "illustrated", label: "Illustrated", tagline: "Words and art, woven together" },
];

export default function ShowcasePage() {
  const [picks, setPicks] = useState<StaffPickStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff-picks")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setPicks(json?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group picks by format, preserving curator order within each.
  const byFormat = useMemo(() => {
    const map = new Map<string, StaffPickStory[]>();
    for (const p of picks) {
      const list = map.get(p.format) ?? [];
      list.push(p);
      map.set(p.format, list);
    }
    return map;
  }, [picks]);

  return (
    <main className="min-h-screen bg-void">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-amber/[0.04] blur-[150px]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] uppercase tracking-[0.2em] text-amber/70 mb-3"
          >
            Curator&apos;s Showcase
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl text-paper font-medium tracking-tight mb-4"
          >
            Stories worth your evening
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
          >
            Hand-picked work across every format we publish. No algorithm — just stories the team actually loved.
          </motion.p>
        </div>
      </section>

      {/* Format sections */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-amber/20 border-t-amber rounded-full animate-spin" />
          </div>
        ) : picks.length === 0 ? (
          <EmptyState />
        ) : (
          FORMAT_GROUPS.map((group) => {
            const items = byFormat.get(group.key) ?? [];
            if (items.length === 0) return null;
            return (
              <FormatSection
                key={group.key}
                label={group.label}
                tagline={group.tagline}
                stories={items.slice(0, 3)}
                browseHref={`/browse?format=${group.key}`}
              />
            );
          })
        )}

        {/* Adventure / Campaign — outside the format list */}
        {!loading &&
          (() => {
            const adventures = picks.filter((p) => (p as { writingMode?: string }).writingMode === "campaign");
            if (adventures.length === 0) return null;
            return (
              <FormatSection
                label="Adventures"
                tagline="GM-led collaborative storytelling"
                stories={adventures.slice(0, 3)}
                browseHref="/browse?format=campaign"
              />
            );
          })()}

        {/* Footer CTA */}
        {!loading && picks.length > 0 && (
          <div className="text-center pt-8 border-t border-border-subtle">
            <h2 className="font-display text-2xl text-paper mb-3">Found something you love?</h2>
            <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
              Free to read, free to write. Sign up to follow authors, comment, and start your own story.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register?intent=read"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber text-void font-semibold text-sm hover:bg-amber-light transition-all shadow-lg shadow-amber/15"
              >
                Sign up free
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-text-secondary hover:text-paper hover:border-border-active text-sm transition-all"
              >
                Browse all stories
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function FormatSection({
  label,
  tagline,
  stories,
  browseHref,
}: {
  label: string;
  tagline: string;
  stories: StaffPickStory[];
  browseHref: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-paper">{label}</h2>
          <p className="text-text-ghost text-[13px] mt-1">{tagline}</p>
        </div>
        <Link
          href={browseHref}
          className="inline-flex items-center gap-1.5 text-[12px] text-amber hover:text-amber-light transition-colors"
        >
          Browse more {label.toLowerCase()}
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stories.map((story) => (
          <div key={story.pickId} className="space-y-3">
            <StoryCard
              title={story.title}
              author={story.authorName ?? undefined}
              genres={story.genres}
              wordCount={story.totalWords || 0}
              chapterCount={story.chapterCount || 0}
              sparkCount={story.sparkCount || 0}
              contentRating={story.contentRating}
              slug={story.slug ?? story.id}
              coverUrl={story.coverImageUrl ?? undefined}
              format={story.format}
              excerpt={story.synopsis ?? undefined}
              hook={story.hook ?? undefined}
            />
            {story.curatorNote && (
              <div className="px-3 py-2 rounded-lg border border-amber/15 bg-amber/[0.03]">
                <p className="text-[10px] uppercase tracking-[0.14em] text-amber/70 mb-1">
                  {story.pickedBy ? `Picked by ${story.pickedBy}` : "Curator's note"}
                </p>
                <p className="text-[12px] text-text-secondary leading-relaxed italic font-reading">
                  &quot;{story.curatorNote}&quot;
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber/60">
          <path d="M8 1l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" />
        </svg>
      </div>
      <h2 className="font-display text-xl text-paper mb-2">The shelves are still being curated</h2>
      <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
        Staff picks are coming soon. In the meantime, browse what the community is reading.
      </p>
      <Link
        href="/browse"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber text-void font-semibold text-sm hover:bg-amber-light transition-all"
      >
        Browse all stories
      </Link>
    </div>
  );
}
