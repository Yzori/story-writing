"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { formatTimeAgo } from "@/lib/format";
import type { StudioSnapshot } from "@/types/studio";
import { readingHref } from "@/components/dashboard/beats/types";
import { CoverArt } from "@/components/dashboard/studio-kit";
import { Eyebrow, GlassCard, InkRing, Jacket, Panel, Tile, rise } from "@/components/dashboard/glass/kit";

// ─────────────────────────────────────────────────────────────────────────────
// Read — the same geometry, the roles flipped. The hero is the book you're
// inside (ribbon bookmark, "continue" first); suggestions are the shelf's
// offer, never the throne. Bookmarks arrive from /api/reading-progress after
// paint — the snapshot already carries the hero, so nothing blocks on it.
// ─────────────────────────────────────────────────────────────────────────────

interface BookmarkRow {
  storyId: string;
  chapterId: string;
  scrollPercent: number;
  updatedAt: string;
  storyTitle: string;
  storySlug: string | null;
  storyCoverUrl: string | null;
  chapterTitle: string;
  chapterSortOrder: number;
  authorName: string | null;
}

export default function ReadTab({ snapshot }: { snapshot: StudioSnapshot }) {
  const reduce = useReducedMotion();
  const s = snapshot.signals;
  const current = s.continueReading;

  const [bookmarks, setBookmarks] = useState<BookmarkRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/reading-progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.data) setBookmarks(j.data as BookmarkRow[]);
      })
      .catch(() => {
        if (alive) setBookmarks([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const newChapters = s.follows.filter((f) => f.kind === "chapter");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr] lg:gap-6">
      {/* ── HERO: the book you're inside ── */}
      <motion.div className="relative flex min-h-[380px] items-start" {...rise(reduce, 0.05)}>
        {current ? (
          <>
            <InkRing
              quote={`“${current.chapterTitle}”`}
              quoteFrom={`Where you stopped · ${Math.round(current.scrollPercent)}% read`}
              reduce={reduce}
            />
            <Jacket
              seed={current.storyTitle}
              title={current.storyTitle}
              image={current.coverImageUrl}
              ribbon
              className="z-[2] -mt-14 ml-3 w-[clamp(170px,19vw,230px)] sm:ml-8"
            />
            <Link
              href={readingHref(current)}
              className="group absolute bottom-0 left-2 z-[3] inline-flex items-center gap-2.5 rounded-full bg-gold-fill px-5 py-3 text-[14px] font-semibold text-on-gold shadow-[0_8px_30px_rgba(226,172,74,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(226,172,74,0.5)] sm:left-8"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
              Continue Chapter {current.chapterNumber}
            </Link>
          </>
        ) : (
          <div className="flex w-full flex-col items-start justify-center gap-4 py-10">
            <InkRing
              quote="“The library is open all night.”"
              quoteFrom="Nothing on the nightstand yet"
              reduce={reduce}
            />
            <Link
              href="/read"
              className="z-[3] inline-flex items-center gap-2.5 rounded-full bg-gold-fill px-5 py-3 text-[14px] font-semibold text-on-gold shadow-[0_8px_30px_rgba(226,172,74,0.35)] transition-transform hover:-translate-y-0.5"
            >
              Find tonight&rsquo;s page
            </Link>
          </div>
        )}
      </motion.div>

      {/* ── THE READING + suggestions ── */}
      <motion.div className="flex flex-col gap-3.5" {...rise(reduce, 0.12)}>
        {current && (
          <div>
            <h2 className="font-display text-2xl leading-tight text-paper sm:text-3xl">{current.storyTitle}</h2>
            <p className="mt-1.5 text-[13px] text-text-secondary">
              {current.author && (
                <>
                  by <span className="font-semibold text-amber">{current.author}</span> ·{" "}
                </>
              )}
              chapter {current.chapterNumber}
              {current.totalChapters > 0 && ` of ${current.totalChapters}`}
            </p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2.5">
          <Tile gold label="Evening streak" value={String(s.readingStreak)} n={s.readingStreak} />
          <Tile
            label="In progress"
            value={bookmarks ? String(bookmarks.length) : "…"}
            n={bookmarks ? bookmarks.length : undefined}
          />
          <Tile label="New chapters" value={String(newChapters.length)} n={newChapters.length} sub="from followed" />
        </div>

        <Eyebrow className="mt-1 px-1">For you tonight</Eyebrow>
        {s.follows.length === 0 ? (
          <GlassCard
            href="/read"
            coverSeed="tonights-page"
            title="Let the shelf pick"
            meta="A story chosen for you, one chapter at a time"
            cta="Open"
          />
        ) : (
          <>
            {s.follows.slice(0, 3).map((f, i) => (
              <GlassCard
                key={`${f.storyId}-${i}`}
                href={f.slug ? `/story/${f.slug}` : "#"}
                coverSeed={f.storyTitle}
                title={f.kind === "chapter" ? f.storyTitle : `${f.author ?? f.storyTitle} wrote an update`}
                meta={
                  f.kind === "chapter"
                    ? `New: “${f.title}”${f.author ? ` · ${f.author}` : ""}`
                    : `“${f.title}” · ${formatTimeAgo(f.createdAt)}`
                }
                cta={f.kind === "chapter" ? "Read" : "Open"}
              />
            ))}
          </>
        )}
      </motion.div>

      {/* ── YOUR BOOKMARKS ── */}
      <motion.div className="lg:col-span-2" {...rise(reduce, 0.2)}>
        <Panel title="Your bookmarks" moreHref="/library" moreLabel="The whole shelf">
          {bookmarks === null ? (
            <div className="space-y-2 py-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-elevated/45" />
              ))}
            </div>
          ) : bookmarks.length === 0 ? (
            <p className="py-4 text-[13px] text-text-secondary">
              No bookmarks yet — open any story and your place keeps itself.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {["Opened", "Story", "Your bookmark", "Progress"].map((h) => (
                      <th key={h} className="px-2.5 pb-2.5 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-text-ghost">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookmarks.slice(0, 6).map((b, i) => (
                    <tr key={`${b.storyId}-${b.chapterId}`} className={i % 2 === 0 ? "bg-elevated/45" : ""}>
                      <td className="rounded-l-lg px-2.5 py-2.5 text-text-secondary">{formatTimeAgo(b.updatedAt)}</td>
                      <td className="px-2.5 py-2.5 font-medium text-paper">
                        <Link
                          href={b.storySlug ? `/story/${b.storySlug}/read/${b.chapterId}` : "#"}
                          className="flex items-center gap-2.5 hover:text-amber"
                        >
                          <CoverArt seed={b.storyTitle} title="" image={b.storyCoverUrl} className="h-5 w-3.5 shrink-0 rounded-[2px_3px_3px_2px] border border-border-active" />
                          <span className="truncate">{b.storyTitle}</span>
                          {b.authorName && <span className="truncate text-[11px] font-normal text-text-ghost">{b.authorName}</span>}
                        </Link>
                      </td>
                      <td className="px-2.5 py-2.5 text-text-secondary">
                        {b.chapterSortOrder} · {b.chapterTitle}
                      </td>
                      <td className="rounded-r-lg px-2.5 py-2.5 font-mono text-[12px] text-amber">
                        {Math.round(b.scrollPercent)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </motion.div>
    </div>
  );
}
