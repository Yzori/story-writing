"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GENRES } from "@/config/genres";

type ReadLength = "quick" | "short" | "medium" | "long" | "any";
type Comfort = "everyone" | "teen" | "mature" | "explicit";

const POPULAR_GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Thriller",
  "Horror",
  "Literary Fiction",
  "Adventure",
  "Historical Fiction",
  "Contemporary",
  "Young Adult",
  "Dark Fantasy",
];

const READ_LENGTHS: { key: ReadLength; label: string; hint: string }[] = [
  { key: "quick", label: "Quick reads", hint: "Under 5 minutes — flash fiction, poetry" },
  { key: "short", label: "Short stories", hint: "5–20 minutes — single-sitting fiction" },
  { key: "medium", label: "Novelettes", hint: "20–90 minutes — meaty single chapters" },
  { key: "long", label: "Long-form", hint: "Hours, multi-chapter epics, serialized work" },
  { key: "any", label: "No preference", hint: "Show me everything" },
];

const COMFORT_OPTIONS: { key: Comfort; label: string; hint: string }[] = [
  { key: "everyone", label: "All ages", hint: "Family-friendly only" },
  { key: "teen", label: "Teen+", hint: "PG-13 territory" },
  { key: "mature", label: "Mature", hint: "Adult themes, content warnings respected" },
  { key: "explicit", label: "Show everything", hint: "Including 18+ content" },
];

export default function ReaderPreferencesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || "/read";

  const [step, setStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [readLength, setReadLength] = useState<ReadLength>("any");
  const [comfort, setComfort] = useState<Comfort>("teen");
  const [genreSearch, setGenreSearch] = useState("");
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredGenres = useMemo(() => {
    if (genreSearch) return GENRES.filter((g) => g.toLowerCase().includes(genreSearch.toLowerCase()));
    return showAllGenres ? GENRES : POPULAR_GENRES;
  }, [genreSearch, showAllGenres]);

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length >= 8 ? prev : [...prev, g],
    );
  };

  const submit = async (skip = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const body = skip
        ? { markOnboarded: true }
        : {
            preferredGenres: selectedGenres,
            preferredReadLength: readLength,
            comfortRating: comfort,
            markOnboarded: true,
          };
      await fetch("/api/users/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // Best-effort — even on failure we let the user through.
    } finally {
      router.push(next);
    }
  };

  // Auto-skip if the user is already onboarded (e.g., revisits this URL).
  useEffect(() => {
    fetch("/api/users/me/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.onboardedAt) router.replace(next);
      })
      .catch(() => {});
  }, [router, next]);

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber/[0.04] blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step ? "w-8 bg-amber" : i < step ? "w-4 bg-amber/40" : "w-4 bg-border"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="genres"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber/70 text-center mb-3">
                Step 1 of 3
              </p>
              <h1 className="font-display text-3xl sm:text-4xl text-paper text-center mb-3">
                What do you read?
              </h1>
              <p className="text-text-secondary text-[14px] text-center max-w-md mx-auto mb-8 leading-relaxed">
                Pick a few genres you love. We&apos;ll prime your For You feed. Up to 8.
              </p>

              <input
                type="text"
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                placeholder="Search genres…"
                className="w-full bg-elevated/80 border border-border rounded-xl px-4 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/40 focus-visible:ring-2 focus-visible:ring-amber/40 focus-visible:ring-offset-2 focus-visible:ring-offset-void mb-4"
              />

              <div className="flex flex-wrap gap-2 mb-4">
                {filteredGenres.map((g) => {
                  const selected = selectedGenres.includes(g);
                  const disabled = !selected && selectedGenres.length >= 8;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGenre(g)}
                      disabled={disabled}
                      className={`px-3.5 py-2 rounded-full text-[12px] font-medium transition-all ${
                        selected
                          ? "bg-amber text-void shadow-sm shadow-amber/20"
                          : disabled
                            ? "bg-elevated/40 text-text-ghost cursor-not-allowed"
                            : "bg-elevated text-text-secondary hover:text-paper hover:bg-elevated/80"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>

              {!genreSearch && !showAllGenres && (
                <button
                  type="button"
                  onClick={() => setShowAllGenres(true)}
                  className="text-[12px] text-amber hover:text-amber-light transition-colors mb-6"
                >
                  Show all {GENRES.length} genres →
                </button>
              )}

              <div className="flex items-center justify-between mt-8">
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={submitting}
                  className="text-[12px] text-text-ghost hover:text-text-secondary transition-colors"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-full bg-amber text-void font-semibold text-sm hover:bg-amber-light transition-all shadow-lg shadow-amber/15"
                >
                  {selectedGenres.length === 0 ? "Skip genres →" : `Next (${selectedGenres.length}/8)`}
                </button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="length"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber/70 text-center mb-3">
                Step 2 of 3
              </p>
              <h1 className="font-display text-3xl sm:text-4xl text-paper text-center mb-3">
                How long do you usually read?
              </h1>
              <p className="text-text-secondary text-[14px] text-center max-w-md mx-auto mb-8 leading-relaxed">
                We&apos;ll prioritize stories that fit your time. You can always change this.
              </p>

              <div className="space-y-2">
                {READ_LENGTHS.map((opt) => {
                  const selected = readLength === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setReadLength(opt.key)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                        selected
                          ? "border-amber/40 bg-amber/[0.06]"
                          : "border-border hover:border-border-active hover:bg-subtle/30"
                      }`}
                    >
                      <p className={`text-[14px] font-medium ${selected ? "text-amber" : "text-paper"}`}>
                        {opt.label}
                      </p>
                      <p className="text-[12px] text-text-ghost mt-0.5">{opt.hint}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="text-[12px] text-text-ghost hover:text-text-secondary transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-full bg-amber text-void font-semibold text-sm hover:bg-amber-light transition-all shadow-lg shadow-amber/15"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="comfort"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber/70 text-center mb-3">
                Step 3 of 3
              </p>
              <h1 className="font-display text-3xl sm:text-4xl text-paper text-center mb-3">
                What comfort level?
              </h1>
              <p className="text-text-secondary text-[14px] text-center max-w-md mx-auto mb-8 leading-relaxed">
                Stories above your threshold are hidden by default. Private — only you see this.
              </p>

              <div className="space-y-2">
                {COMFORT_OPTIONS.map((opt) => {
                  const selected = comfort === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setComfort(opt.key)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                        selected
                          ? "border-amber/40 bg-amber/[0.06]"
                          : "border-border hover:border-border-active hover:bg-subtle/30"
                      }`}
                    >
                      <p className={`text-[14px] font-medium ${selected ? "text-amber" : "text-paper"}`}>
                        {opt.label}
                      </p>
                      <p className="text-[12px] text-text-ghost mt-0.5">{opt.hint}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[12px] text-text-ghost hover:text-text-secondary transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-amber text-void font-semibold text-sm hover:bg-amber-light transition-all disabled:opacity-50 shadow-lg shadow-amber/15"
                >
                  {submitting ? "Saving…" : "Show me stories"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer skip */}
        {step !== 0 && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="text-[11px] text-text-ghost hover:text-text-secondary transition-colors"
            >
              Skip the rest
            </button>
          </div>
        )}

        {/* Tiny brand mark at the top of the page */}
        <Link
          href="/"
          className="absolute top-6 left-6 inline-flex items-center gap-2 text-text-ghost hover:text-paper transition-colors"
        >
          <svg className="w-4 h-4 text-amber" viewBox="0 0 32 32" fill="none">
            <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" fill="currentColor" opacity="0.85" />
          </svg>
          <span className="font-display text-[11px] font-bold tracking-wide hidden sm:inline">Quiloria</span>
        </Link>
      </div>
    </div>
  );
}
