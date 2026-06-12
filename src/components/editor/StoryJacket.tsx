"use client";

/**
 * The Jacket — story details as a place, not a form.
 *
 * Third desk-object conversion. This is the book as the world will
 * hold it: the cover on the left (cloth binding with a gold-set title
 * until art arrives), and the jacket copy on the right — title, hook,
 * synopsis, genres, and the quiet pages inside the cover (dedication,
 * epigraph, foreword). Esc walks back to the desk.
 *
 * Text fields commit on blur (the old panel PATCHed every keystroke);
 * pills and toggles commit immediately. Monetization stayed behind —
 * it belongs to the Publish counter, not the jacket.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StoryMetadata, FrontMatter } from "@/types/editor";
import { GENRES, CONTENT_RATINGS, STORY_STATUSES } from "@/config/genres";
import { compressImage } from "@/client/images";

interface StoryJacketProps {
  storyTitle: string;
  metadata: StoryMetadata;
  frontMatter: FrontMatter;
  onUpdateTitle: (title: string) => void;
  onUpdateMetadata: (metadata: StoryMetadata) => void;
  onUpdateFrontMatter: (frontMatter: FrontMatter) => void;
  onBack: () => void;
}

export default function StoryJacket({
  storyTitle,
  metadata,
  frontMatter,
  onUpdateTitle,
  onUpdateMetadata,
  onUpdateFrontMatter,
  onBack,
}: StoryJacketProps) {
  const [titleDraft, setTitleDraft] = useState(storyTitle);
  const [dragging, setDragging] = useState(false);

  useEffect(() => setTitleDraft(storyTitle), [storyTitle]);

  // Esc walks back to the desk; blur a focused field first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.blur();
        return;
      }
      onBack();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onBack]);

  const update = (partial: Partial<StoryMetadata>) =>
    onUpdateMetadata({ ...metadata, ...partial });
  const updateFront = (partial: Partial<FrontMatter>) =>
    onUpdateFrontMatter({ ...frontMatter, ...partial });

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (next && next !== storyTitle) onUpdateTitle(next);
    else setTitleDraft(storyTitle);
  };

  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      // 900 matches the create/story-page cover paths.
      const dataUrl = await compressImage(file, 900, 0.8);
      update({ coverImageDataUrl: dataUrl });
    } catch {}
  };

  const toggleGenre = (genre: string) => {
    update({
      genres: metadata.genres.includes(genre)
        ? metadata.genres.filter((g) => g !== genre)
        : [...metadata.genres, genre],
    });
  };

  const fieldLabel = "mb-2 block text-[10px] uppercase tracking-[0.14em] text-text-ghost";
  const boxInput =
    "w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-ghost/60 focus:border-amber/30 transition-colors";

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col bg-void"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      role="dialog"
      aria-modal="true"
      aria-label="Story details — the jacket"
    >
      {/* lamp glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-amber/[0.07] blur-[130px]"
        aria-hidden
      />

      {/* top bar */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="group flex items-center gap-2 text-[12px] text-text-secondary transition-colors hover:text-amber"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5" aria-hidden>
            <path d="M19 12H5 M11 18l-6-6 6-6" />
          </svg>
          The desk
          <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-ghost">
            Esc
          </kbd>
        </button>
        <p className="text-[11px] uppercase tracking-[0.2em] text-text-ghost">The Jacket</p>
        <div className="w-24" aria-hidden />
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[980px] flex-col gap-12 px-8 py-12 lg:flex-row">
          {/* ── the book itself ── */}
          <div className="shrink-0 lg:sticky lg:top-12 lg:self-start">
            <label
              className={`group relative block aspect-[2/3] w-60 cursor-pointer overflow-hidden rounded-r-xl rounded-l-sm shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition-all ${
                dragging ? "ring-2 ring-amber/50" : ""
              }`}
              title="Set cover art"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void handleCoverFile(f);
              }}
            >
              {metadata.coverImageDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={metadata.coverImageDataUrl}
                  alt="Cover"
                  className="h-full w-full object-cover"
                />
              ) : (
                /* cloth binding until art arrives */
                <span className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-ink to-void px-6 text-center">
                  <span className="mb-4 h-px w-10 bg-amber/40" aria-hidden />
                  <span className="font-display text-[19px] font-semibold leading-snug text-amber/90">
                    {titleDraft || "Untitled"}
                  </span>
                  <span className="mt-4 h-px w-10 bg-amber/40" aria-hidden />
                </span>
              )}
              {/* spine hint */}
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-[6px] bg-gradient-to-r from-black/50 to-transparent"
                aria-hidden
              />
              <span className="absolute inset-0 flex items-end justify-center bg-void/55 pb-5 text-[10px] uppercase tracking-wider text-paper opacity-0 transition-opacity group-hover:opacity-100">
                {metadata.coverImageDataUrl ? "Replace cover" : "Add cover art"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleCoverFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {metadata.coverImageDataUrl && (
              <button
                type="button"
                onClick={() => update({ coverImageDataUrl: null })}
                className="mt-2 w-full text-center text-[11px] text-text-ghost transition-colors hover:text-rose"
              >
                Remove cover art
              </button>
            )}

            {/* status */}
            <div className="mt-6">
              <label className={fieldLabel}>Where it stands</label>
              <div className="flex flex-wrap gap-1.5">
                {STORY_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => update({ status: s.value })}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] transition-all ${
                      metadata.status === s.value
                        ? "border-amber/30 bg-amber/[0.06] text-amber"
                        : "border-border text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* rating */}
            <div className="mt-5">
              <label className={fieldLabel}>Comfort rating</label>
              <div className="flex flex-col gap-1">
                {CONTENT_RATINGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => update({ contentRating: r.value })}
                    title={r.description}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all ${
                      metadata.contentRating === r.value
                        ? "border-amber/30 bg-amber/[0.06] text-amber"
                        : "border-border text-text-ghost hover:text-text-secondary"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── the jacket copy ── */}
          <div className="min-w-0 flex-1">
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder="The title"
              className="w-full bg-transparent font-display text-[34px] font-semibold leading-tight text-paper outline-none placeholder:text-text-ghost/50"
              aria-label="Story title"
            />

            <label className={`mt-8 ${fieldLabel}`}>
              The hook
              <span className="ml-2 normal-case tracking-normal text-text-ghost/70">
                one or two sentences that make a stranger stop
              </span>
            </label>
            <textarea
              key={`hook-${storyTitle}`}
              defaultValue={metadata.hook}
              onBlur={(e) => {
                if (e.target.value !== metadata.hook) update({ hook: e.target.value });
              }}
              rows={2}
              placeholder="A cartographer maps a drowned city — and someone below is mapping back."
              className="w-full resize-none bg-transparent font-reading text-[16px] leading-relaxed text-text outline-none placeholder:text-text-ghost/50"
              aria-label="Hook"
            />

            <label className={`mt-8 ${fieldLabel}`}>
              The synopsis
              <span className="ml-2 normal-case tracking-normal text-text-ghost/70">
                the back of the jacket
              </span>
            </label>
            <textarea
              key={`synopsis-${storyTitle}`}
              defaultValue={metadata.synopsis}
              onBlur={(e) => {
                if (e.target.value !== metadata.synopsis) update({ synopsis: e.target.value });
              }}
              rows={7}
              placeholder="What promise does this story make to its reader?"
              className="w-full resize-none bg-transparent font-reading text-[14px] leading-[1.8] text-text outline-none placeholder:text-text-ghost/50"
              aria-label="Synopsis"
            />

            <label className={`mt-8 ${fieldLabel}`}>Genres</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((genre) => {
                const active = metadata.genres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                      active
                        ? "border-amber/30 bg-amber/10 text-amber"
                        : "border-border text-text-ghost hover:border-border-active hover:text-text-secondary"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>

            {/* inside the cover */}
            <div className="mt-12 border-t border-border pt-8">
              <p className="mb-6 text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                Inside the cover
              </p>

              <label className={fieldLabel}>Dedication</label>
              <input
                key={`dedication-${storyTitle}`}
                defaultValue={metadata.dedication}
                onBlur={(e) => {
                  if (e.target.value !== metadata.dedication)
                    update({ dedication: e.target.value });
                }}
                placeholder="For the ones still below."
                className={boxInput}
                aria-label="Dedication"
              />

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
                <div>
                  <label className={fieldLabel}>Epigraph</label>
                  <textarea
                    key={`epigraph-${storyTitle}`}
                    defaultValue={frontMatter.epigraph}
                    onBlur={(e) => {
                      if (e.target.value !== frontMatter.epigraph)
                        updateFront({ epigraph: e.target.value });
                    }}
                    rows={3}
                    placeholder="A borrowed line to open the book…"
                    className={`${boxInput} resize-none`}
                    aria-label="Epigraph"
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Attribution</label>
                  <input
                    key={`epattr-${storyTitle}`}
                    defaultValue={frontMatter.epigraphAttribution}
                    onBlur={(e) => {
                      if (e.target.value !== frontMatter.epigraphAttribution)
                        updateFront({ epigraphAttribution: e.target.value });
                    }}
                    placeholder="— who said it"
                    className={boxInput}
                    aria-label="Epigraph attribution"
                  />
                </div>
              </div>

              <label className={`mt-5 ${fieldLabel}`}>Foreword</label>
              <textarea
                key={`foreword-${storyTitle}`}
                defaultValue={frontMatter.foreword}
                onBlur={(e) => {
                  if (e.target.value !== frontMatter.foreword)
                    updateFront({ foreword: e.target.value });
                }}
                rows={4}
                placeholder="A word from you, before the story starts."
                className={`${boxInput} resize-none`}
                aria-label="Foreword"
              />

              <div className="mt-5 flex flex-wrap items-end gap-6">
                <div>
                  <label className={fieldLabel}>Language</label>
                  <input
                    key={`language-${storyTitle}`}
                    defaultValue={metadata.language}
                    onBlur={(e) => {
                      if (e.target.value !== metadata.language)
                        update({ language: e.target.value });
                    }}
                    className={`${boxInput} w-40`}
                    aria-label="Language"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 pb-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={frontMatter.showToc}
                    onClick={() => updateFront({ showToc: !frontMatter.showToc })}
                    className={`relative h-[18px] w-8 rounded-full transition-colors ${
                      frontMatter.showToc ? "bg-amber" : "bg-subtle"
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-void transition-transform ${
                        frontMatter.showToc ? "left-[16px]" : "left-[2px]"
                      }`}
                    />
                  </button>
                  <span className="text-[12px] text-text-secondary">
                    Show a table of contents to readers
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
