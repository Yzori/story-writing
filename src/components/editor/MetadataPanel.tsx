"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { StoryMetadata } from "@/types/editor";
import { GENRES, CONTENT_RATINGS, STORY_STATUSES } from "@/config/genres";
import { compressImage } from "@/client/images";

type MonetizationModel = "free" | "freemium" | "gated";
type GatingTier = "standard" | "extended" | "premium";

interface MonetizationConfig {
  monetizationModel: MonetizationModel;
  freeChapterCount: number;
  defaultGatingTier: GatingTier;
}

const GATING_TIERS: { value: GatingTier; label: string; inkDrops: number }[] = [
  { value: "standard", label: "Standard", inkDrops: 15 },
  { value: "extended", label: "Extended", inkDrops: 30 },
  { value: "premium", label: "Premium", inkDrops: 50 },
];

interface MetadataPanelProps {
  metadata: StoryMetadata;
  storyTitle: string;
  storyId: string;
  isPublic: boolean;
  onUpdate: (metadata: StoryMetadata) => void;
  onClose: () => void;
}

export default function MetadataPanel({
  metadata,
  storyTitle,
  storyId,
  isPublic,
  onUpdate,
  onClose,
}: MetadataPanelProps) {
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monetization state
  const [monetization, setMonetization] = useState<MonetizationConfig>({
    monetizationModel: "free",
    freeChapterCount: 5,
    defaultGatingTier: "standard",
  });
  const [monetizationLoading, setMonetizationLoading] = useState(false);
  const [monetizationSaving, setMonetizationSaving] = useState(false);
  const [monetizationDirty, setMonetizationDirty] = useState(false);
  const [monetizationError, setMonetizationError] = useState<string | null>(null);

  // Fetch monetization config when panel opens for a public story
  useEffect(() => {
    if (!isPublic || !storyId) return;
    let cancelled = false;
    setMonetizationLoading(true);
    fetch(`/api/stories/${storyId}/monetization`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load monetization settings");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setMonetization({
          monetizationModel: data.monetizationModel ?? "free",
          freeChapterCount: data.freeChapterCount ?? 5,
          defaultGatingTier: data.defaultGatingTier ?? "standard",
        });
      })
      .catch(() => {
        // Endpoint may not exist yet — keep defaults
      })
      .finally(() => {
        if (!cancelled) setMonetizationLoading(false);
      });
    return () => { cancelled = true; };
  }, [isPublic, storyId]);

  const updateMonetization = useCallback(
    (partial: Partial<MonetizationConfig>) => {
      setMonetization((prev) => ({ ...prev, ...partial }));
      setMonetizationDirty(true);
      setMonetizationError(null);
    },
    []
  );

  const saveMonetization = useCallback(async () => {
    setMonetizationSaving(true);
    setMonetizationError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/monetization`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(monetization),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save monetization settings");
      }
      setMonetizationDirty(false);
    } catch (err) {
      setMonetizationError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setMonetizationSaving(false);
    }
  }, [storyId, monetization]);

  const update = (partial: Partial<StoryMetadata>) => {
    onUpdate({ ...metadata, ...partial });
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImage(file, 600, 0.75);
      update({ coverImageDataUrl: dataUrl });
    } catch (err) {
      console.error("Failed to process cover image:", err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const filteredGenres = GENRES.filter(
    (g) =>
      g.toLowerCase().includes(genreSearch.toLowerCase()) &&
      !metadata.genres.includes(g)
  );

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 360, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col"
    >
      <div className="min-w-[360px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-paper">Story Details</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Cover Image */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Cover Art
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
              }}
              className="hidden"
            />

            {metadata.coverImageDataUrl ? (
              <div className="relative group">
                <img
                  src={metadata.coverImageDataUrl}
                  alt={`Cover for ${storyTitle}`}
                  className="w-full aspect-[2/3] object-cover rounded-lg border border-border"
                />
                <div className="absolute inset-0 bg-void/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-elevated border border-border text-[11px] text-text-secondary hover:text-paper transition-colors"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => update({ coverImageDataUrl: null })}
                    className="px-3 py-1.5 rounded-lg bg-elevated border border-border text-[11px] text-rose hover:text-paper transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full aspect-[2/3] rounded-lg border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? "border-amber bg-amber/[0.04]"
                    : "border-border hover:border-text-ghost"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center text-text-ghost">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="14" height="14" rx="2" />
                    <circle cx="7.5" cy="7.5" r="1.5" />
                    <path d="M17 13l-3.5-3.5a1 1 0 0 0-1.4 0L5 17" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[12px] text-text-secondary">
                    Drop cover image here
                  </p>
                  <p className="text-[10px] text-text-ghost mt-0.5">
                    or click to browse
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Synopsis */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Synopsis
            </label>
            <textarea
              value={metadata.synopsis}
              onChange={(e) => update({ synopsis: e.target.value })}
              placeholder="What is your story about?"
              rows={4}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
            />
          </section>

          {/* Genres */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Genres
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {metadata.genres.map((genre) => (
                <span
                  key={genre}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber/10 text-amber text-[11px]"
                >
                  {genre}
                  <button
                    onClick={() =>
                      update({
                        genres: metadata.genres.filter((g) => g !== genre),
                      })
                    }
                    className="hover:text-paper transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="3" y1="3" x2="7" y2="7" />
                      <line x1="7" y1="3" x2="3" y2="7" />
                    </svg>
                  </button>
                </span>
              ))}
              <button
                onClick={() => setShowGenrePicker((v) => !v)}
                className="px-2.5 py-1 rounded-full border border-dashed border-border text-[11px] text-text-ghost hover:text-text-secondary hover:border-text-ghost transition-colors"
              >
                + Add genre
              </button>
            </div>

            {showGenrePicker && (
              <div className="bg-elevated border border-border-active rounded-lg p-2 mt-1">
                <input
                  autoFocus
                  value={genreSearch}
                  onChange={(e) => setGenreSearch(e.target.value)}
                  placeholder="Search genres..."
                  className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors mb-2"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowGenrePicker(false);
                      setGenreSearch("");
                    }
                    if (e.key === "Enter" && genreSearch.trim() && filteredGenres.length > 0) {
                      update({ genres: [...metadata.genres, filteredGenres[0]] });
                      setGenreSearch("");
                    }
                  }}
                />
                <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                  {filteredGenres.slice(0, 12).map((genre) => (
                    <button
                      key={genre}
                      onClick={() => {
                        update({ genres: [...metadata.genres, genre] });
                        setGenreSearch("");
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] text-text-secondary hover:text-paper hover:bg-subtle/50 transition-colors"
                    >
                      {genre}
                    </button>
                  ))}
                  {filteredGenres.length === 0 && genreSearch && (
                    <button
                      onClick={() => {
                        update({ genres: [...metadata.genres, genreSearch.trim()] });
                        setGenreSearch("");
                        setShowGenrePicker(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] text-amber hover:bg-subtle/50 transition-colors"
                    >
                      Add &quot;{genreSearch.trim()}&quot; as custom genre
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Content Rating */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Content Rating
            </label>
            <div className="space-y-1">
              {CONTENT_RATINGS.map((rating) => (
                <button
                  key={rating.value}
                  onClick={() => update({ contentRating: rating.value })}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                    metadata.contentRating === rating.value
                      ? "border-amber/30 bg-amber/[0.04]"
                      : "border-transparent hover:bg-subtle/30"
                  }`}
                >
                  <span className={`text-[12px] font-medium ${
                    metadata.contentRating === rating.value ? "text-amber" : "text-text-secondary"
                  }`}>
                    {rating.label}
                  </span>
                  <span className="text-[11px] text-text-ghost ml-2">
                    {rating.description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Status */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Story Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STORY_STATUSES.map((status) => (
                <button
                  key={status.value}
                  onClick={() => update({ status: status.value })}
                  className={`px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                    metadata.status === status.value
                      ? "border-amber/30 bg-amber/[0.04] text-amber"
                      : "border-border text-text-ghost hover:text-text-secondary"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </section>

          {/* Dedication */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Dedication
            </label>
            <textarea
              value={metadata.dedication}
              onChange={(e) => update({ dedication: e.target.value })}
              placeholder="For those who..."
              rows={2}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none italic"
            />
          </section>

          {/* Language */}
          <section>
            <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
              Language
            </label>
            <input
              value={metadata.language}
              onChange={(e) => update({ language: e.target.value })}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
            />
          </section>

          {/* ── Monetization ─────────────────────────────────── */}
          {isPublic && (
            <section className="rounded-xl border border-border bg-ink p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost block">
                  Monetization
                </label>
                {monetizationLoading && (
                  <span className="text-[10px] text-text-ghost animate-pulse">Loading...</span>
                )}
              </div>

              {/* Model selector */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-text-secondary block">Access Model</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { value: "free", label: "Free" },
                      { value: "freemium", label: "Freemium" },
                      { value: "gated", label: "Gated" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateMonetization({ monetizationModel: opt.value })}
                      className={`px-2 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                        monetization.monetizationModel === opt.value
                          ? "border-gold/40 bg-gold/[0.06] text-gold"
                          : "border-border text-text-ghost hover:text-text-secondary hover:border-text-ghost"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-ghost leading-relaxed mt-1">
                  {monetization.monetizationModel === "free" &&
                    "All chapters are free to read."}
                  {monetization.monetizationModel === "freemium" &&
                    "Early chapters are free; later ones cost Ink Drops."}
                  {monetization.monetizationModel === "gated" &&
                    "All chapters cost Ink Drops to unlock."}
                </p>
              </div>

              {/* Free chapter count — only for freemium */}
              {monetization.monetizationModel === "freemium" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">Free Chapters</span>
                    <span className="text-[12px] text-gold font-medium tabular-nums">
                      {monetization.freeChapterCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={50}
                    value={monetization.freeChapterCount}
                    onChange={(e) =>
                      updateMonetization({ freeChapterCount: Number(e.target.value) })
                    }
                    className="w-full h-1 bg-surface rounded-full appearance-none cursor-pointer accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-void [&::-webkit-slider-thumb]:shadow-sm"
                  />
                  <div className="flex justify-between text-[9px] text-text-ghost">
                    <span>3</span>
                    <span>50</span>
                  </div>
                </div>
              )}

              {/* Default gating tier — for freemium + gated */}
              {monetization.monetizationModel !== "free" && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-text-secondary block">Default Unlock Price</span>
                  <div className="space-y-1">
                    {GATING_TIERS.map((tier) => (
                      <button
                        key={tier.value}
                        onClick={() => updateMonetization({ defaultGatingTier: tier.value })}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                          monetization.defaultGatingTier === tier.value
                            ? "border-gold/30 bg-gold/[0.04]"
                            : "border-transparent hover:bg-surface/50"
                        }`}
                      >
                        <span
                          className={`text-[12px] font-medium ${
                            monetization.defaultGatingTier === tier.value
                              ? "text-gold"
                              : "text-text-secondary"
                          }`}
                        >
                          {tier.label}
                        </span>
                        <span className="text-[11px] text-text-ghost">
                          {tier.inkDrops} Ink Drops
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {monetizationError && (
                <p className="text-[11px] text-rose">{monetizationError}</p>
              )}

              {/* Save button */}
              <button
                onClick={saveMonetization}
                disabled={!monetizationDirty || monetizationSaving}
                className={`w-full py-2 rounded-lg text-[12px] font-medium transition-all ${
                  monetizationDirty && !monetizationSaving
                    ? "bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20"
                    : "bg-surface text-text-ghost border border-border cursor-not-allowed"
                }`}
              >
                {monetizationSaving ? "Saving..." : monetizationDirty ? "Save Monetization" : "Saved"}
              </button>
            </section>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
