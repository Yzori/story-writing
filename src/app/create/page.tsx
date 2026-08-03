"use client";

import { useState, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction, FormEvent, RefObject, PointerEvent as ReactPointerEvent } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { GENRES, CONTENT_RATINGS } from "@/config/genres";
import Image from "next/image";
import { compressImage } from "@/client/images";
import FormatPreview from "@/components/create/FormatPreview";

// ── Format options (shared by solo + co-op) ─────────────────

const FORMATS = [
  { id: "novel", label: "Novel", desc: "Long-form fiction", icon: "M4 2h12a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm2 4v0h8M6 10v0h8M6 14v0h5", soon: false },
  { id: "webtoon", label: "Webtoon", desc: "Vertical scroll comics", icon: "M4 3h16v18H4zM4 9h16M4 15h16", soon: false },
  { id: "poetry", label: "Poetry", desc: "Verse and stanza", icon: "M6 4v0h4M5 8v0h6M7 12v0h3M4 16v0h8M6 20v0h5", soon: false },
  { id: "illustrated", label: "Illustrated", desc: "Art-driven narrative", icon: "M3 3h18v18H3zM3 17l5-5 3.5 3.5 2.5-2.5L21 20M9 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z", soon: false },
  { id: "screenplay", label: "Screenplay", desc: "Script format", icon: "M7 2h10l4 4v14a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2zm2 8h6M9 12h6M9 16h4", soon: false },
];

const POPULAR_GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Mystery", "Thriller",
  "Horror", "Literary Fiction", "Dark Fantasy",
];

// Static per-mode class strings. Tailwind only sees class names that appear as
// literal substrings in the source — dynamic `bg-${x}/10` template literals
// get stripped at build time, so we hand-roll the three combinations here.
// Inline CSS uses `color-mix(...)` instead of `var(--color-X/0.08)` because
// the slash-opacity syntax is Tailwind sugar, not valid CSS inside var().
type AccentKey = "violet" | "teal" | "amber";

const ACCENT: Record<AccentKey, {
  ambientBg: string;
  ambientGlow: string;
  dragRing: string;
  bookGenrePill: string;
  inputFocus: string;
  synopsisFocus: string;
  formatSelected: string;
  formatGlow: string;
  formatTextActive: string;
  formatDescActive: string;
  selectedGenrePill: string;
  genrePillHover: string;
  genreToggleHover: string;
  ratingSelected: string;
  ratingDescActive: string;
  submitBg: string;
  submitHoverShadow: string;
}> = {
  violet: {
    ambientBg: "radial-gradient(ellipse 60% 50% at 50% 35%, color-mix(in srgb, var(--color-violet) 8%, transparent) 0%, transparent 70%)",
    ambientGlow: "0 0 140px color-mix(in srgb, var(--color-violet) 10%, transparent), 0 0 60px color-mix(in srgb, var(--color-violet) 5%, transparent)",
    dragRing: "ring-2 ring-violet/50 ring-inset",
    bookGenrePill: "bg-violet/15 border border-violet/20 text-violet",
    inputFocus: "focus:border-violet/30",
    synopsisFocus: "focus:border-violet/25",
    formatSelected: "bg-violet/10 border-violet/30",
    formatGlow: "0 0 20px color-mix(in srgb, var(--color-violet) 8%, transparent)",
    formatTextActive: "text-violet",
    formatDescActive: "text-violet/50",
    selectedGenrePill: "bg-violet/10 border-violet/20 text-violet",
    genrePillHover: "hover:border-violet/30 hover:text-violet hover:bg-violet/[0.04]",
    genreToggleHover: "hover:text-violet",
    ratingSelected: "bg-violet/10 border-violet/30 text-violet",
    ratingDescActive: "text-violet/60",
    submitBg: "bg-violet text-void",
    submitHoverShadow: "0 0 30px color-mix(in srgb, var(--color-violet) 25%, transparent)",
  },
  teal: {
    ambientBg: "radial-gradient(ellipse 60% 50% at 50% 35%, color-mix(in srgb, var(--color-teal) 8%, transparent) 0%, transparent 70%)",
    ambientGlow: "0 0 140px color-mix(in srgb, var(--color-teal) 10%, transparent), 0 0 60px color-mix(in srgb, var(--color-teal) 5%, transparent)",
    dragRing: "ring-2 ring-teal/50 ring-inset",
    bookGenrePill: "bg-teal/15 border border-teal/20 text-teal",
    inputFocus: "focus:border-teal/30",
    synopsisFocus: "focus:border-teal/25",
    formatSelected: "bg-teal/10 border-teal/30",
    formatGlow: "0 0 20px color-mix(in srgb, var(--color-teal) 8%, transparent)",
    formatTextActive: "text-teal",
    formatDescActive: "text-teal/50",
    selectedGenrePill: "bg-teal/10 border-teal/20 text-teal",
    genrePillHover: "hover:border-teal/30 hover:text-teal hover:bg-teal/[0.04]",
    genreToggleHover: "hover:text-teal",
    ratingSelected: "bg-teal/10 border-teal/30 text-teal",
    ratingDescActive: "text-teal/60",
    submitBg: "bg-teal text-void",
    submitHoverShadow: "0 0 30px color-mix(in srgb, var(--color-teal) 25%, transparent)",
  },
  amber: {
    ambientBg: "radial-gradient(ellipse 60% 50% at 50% 35%, color-mix(in srgb, var(--color-amber) 8%, transparent) 0%, transparent 70%)",
    ambientGlow: "0 0 140px color-mix(in srgb, var(--color-amber) 10%, transparent), 0 0 60px color-mix(in srgb, var(--color-amber) 5%, transparent)",
    dragRing: "ring-2 ring-amber/50 ring-inset",
    bookGenrePill: "bg-amber/15 border border-amber/20 text-amber",
    inputFocus: "focus:border-amber/30",
    synopsisFocus: "focus:border-amber/25",
    formatSelected: "bg-amber/10 border-amber/30",
    formatGlow: "0 0 20px color-mix(in srgb, var(--color-amber) 8%, transparent)",
    formatTextActive: "text-amber",
    formatDescActive: "text-amber/50",
    selectedGenrePill: "bg-amber/10 border-amber/20 text-amber",
    genrePillHover: "hover:border-amber/30 hover:text-amber hover:bg-amber/[0.04]",
    genreToggleHover: "hover:text-amber",
    ratingSelected: "bg-amber/10 border-amber/30 text-amber",
    ratingDescActive: "text-amber/60",
    submitBg: "bg-amber text-void",
    submitHoverShadow: "0 0 30px color-mix(in srgb, var(--color-amber) 25%, transparent)",
  },
};

// ── Main component ──────────────────────────────────────────

type WritingMode = "solo" | "co-op" | "campaign" | null;

export default function CreatePage() {
  const router = useRouter();
  const [writingMode, setWritingMode] = useState<WritingMode>(null);

  // Allow deep-linking straight into a mode's setup form, e.g. /create?mode=co-op
  // (the Collaborate door on /welcome relies on this). The mode is applied after
  // mount so server and client render identically — a brief flash of the mode
  // picker on deep links is acceptable.
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    // Adventures got a from-scratch home: the old campaign charter is
    // unlinked, deep links included.
    if (mode === "campaign") {
      router.replace("/adventures/new");
      return;
    }
    if (mode === "solo" || mode === "co-op") setWritingMode(mode);
  }, [router]);

  // Story details state
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("novel");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [synopsis, setSynopsis] = useState("");
  const [adventureInvitation, setAdventureInvitation] = useState("");
  const [campaignCadence, setCampaignCadence] = useState("One scene per week");
  const [campaignAuditionPrompt, setCampaignAuditionPrompt] = useState(
    "Write the moment we first meet your character. Where are they? What are they doing? What do they want, and what stops them from getting it?"
  );
  const [charterSeats, setCharterSeats] = useState(6);
  const [charterTone, setCharterTone] = useState({
    mood: 62,
    scale: 45,
    influence: 35,
  });
  const [contentRating, setContentRating] = useState("everyone");
  const [contentNotes, setContentNotes] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genreSearch, setGenreSearch] = useState("");
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [seekingRoles, setSeekingRoles] = useState<string[]>([]);
  const [showColophon, setShowColophon] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const filteredGenres = genreSearch
    ? GENRES.filter((g) => g.toLowerCase().includes(genreSearch.toLowerCase()))
    : showAllGenres
    ? GENRES
    : POPULAR_GENRES;

  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImage(file, 900, 0.8);
      setCoverPreview(dataUrl);
    } catch {}
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length >= 5
        ? prev
        : [...prev, genre]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          format,
          writingMode,
          genres: selectedGenres,
          synopsis: synopsis || undefined,
          hook: writingMode === "campaign" && adventureInvitation ? adventureInvitation : undefined,
          campaignSeats: writingMode === "campaign" ? charterSeats : undefined,
          campaignToneMood: writingMode === "campaign" ? charterTone.mood : undefined,
          campaignToneScale: writingMode === "campaign" ? charterTone.scale : undefined,
          campaignToneInfluence: writingMode === "campaign" ? charterTone.influence : undefined,
          campaignCadence: writingMode === "campaign" ? campaignCadence : undefined,
          campaignAuditionPrompt: writingMode === "campaign" ? campaignAuditionPrompt : undefined,
          contentRating,
          contentNotes: contentNotes.length > 0 ? contentNotes : undefined,
          coverImageUrl: coverPreview || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const details = json.error?.details?.fieldErrors
          ? Object.entries(json.error.details.fieldErrors)
              .flatMap(([field, messages]) =>
                Array.isArray(messages) ? messages.map((message) => `${field}: ${message}`) : []
              )
              .join(" ")
          : "";
        setError([json.error?.message, details].filter(Boolean).join(" — ") || "Failed to create story");
        return;
      }

      if (writingMode === "campaign") {
        router.push(`/campaign/${json.data.id}`);
      } else if (writingMode === "co-op") {
        // Co-op stories need team setup first — redirect to the workshop. The
        // roles picked on the notice ride along so workshop setup can pre-seed
        // the open-call (consumed there as a follow-up; harmless if ignored).
        const slug = json.data.slug || json.data.id;
        const seeking = seekingRoles.length ? `&seeking=${seekingRoles.join(",")}` : "";
        router.push(`/story/${slug}/workshop?setup=true${seeking}`);
      } else if (format === "webtoon") {
        // Webtoon has its own full-bleed studio rather than the prose cockpit.
        router.push(`/write/${json.data.id}/webtoon`);
      } else {
        router.push(`/write/${json.data.id}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 1: Mode selection ──────────────────────────────────

  if (!writingMode) {
    return (
      <ModeSelection
        onSelect={(mode) => {
          if (mode === "campaign") {
            router.push("/adventures/new");
            return;
          }
          setWritingMode(mode);
        }}
      />
    );
  }

  // ── Step 2: Story details ───────────────────────────────────

  const isCampaign = writingMode === "campaign";
  const modeData = MODES.find((m) => m.id === writingMode)!;

  if (isCampaign) {
    return (
      <CampaignCharterCreate
        title={title}
        setTitle={setTitle}
        synopsis={synopsis}
        setSynopsis={setSynopsis}
        selectedGenres={selectedGenres}
        toggleGenre={toggleGenre}
        contentRating={contentRating}
        setContentRating={setContentRating}
        contentNotes={contentNotes}
        setContentNotes={setContentNotes}
        adventureInvitation={adventureInvitation}
        setAdventureInvitation={setAdventureInvitation}
        campaignCadence={campaignCadence}
        setCampaignCadence={setCampaignCadence}
        campaignAuditionPrompt={campaignAuditionPrompt}
        setCampaignAuditionPrompt={setCampaignAuditionPrompt}
        charterSeats={charterSeats}
        setCharterSeats={setCharterSeats}
        charterTone={charterTone}
        setCharterTone={setCharterTone}
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={handleSubmit}
        onBack={() => setWritingMode(null)}
      />
    );
  }

  const draftProps: StoryDraftProps = {
    title, setTitle,
    format, setFormat,
    synopsis, setSynopsis,
    selectedGenres, toggleGenre,
    genreSearch, setGenreSearch,
    showAllGenres, setShowAllGenres,
    filteredGenres,
    contentRating, setContentRating,
    contentNotes, setContentNotes,
    coverPreview, setCoverPreview,
    isDragging, setIsDragging,
    handleCoverFile, coverInputRef,
    seekingRoles, setSeekingRoles,
    showColophon, setShowColophon,
    isSubmitting, error,
    onSubmit: handleSubmit,
    onBack: () => setWritingMode(null),
    modeData,
  };

  return writingMode === "co-op" ? (
    <CoopNotice {...draftProps} />
  ) : (
    <SoloTitlePage {...draftProps} />
  );
}

function CampaignCharterCreate({
  title,
  setTitle,
  synopsis,
  setSynopsis,
  selectedGenres,
  toggleGenre,
  contentRating,
  setContentRating,
  contentNotes,
  setContentNotes,
  adventureInvitation,
  setAdventureInvitation,
  campaignCadence,
  setCampaignCadence,
  campaignAuditionPrompt,
  setCampaignAuditionPrompt,
  charterSeats,
  setCharterSeats,
  charterTone,
  setCharterTone,
  isSubmitting,
  error,
  onSubmit,
  onBack,
}: {
  title: string;
  setTitle: (value: string) => void;
  synopsis: string;
  setSynopsis: (value: string) => void;
  selectedGenres: string[];
  toggleGenre: (genre: string) => void;
  contentRating: string;
  setContentRating: (value: string) => void;
  contentNotes: string[];
  setContentNotes: React.Dispatch<React.SetStateAction<string[]>>;
  adventureInvitation: string;
  setAdventureInvitation: (value: string) => void;
  campaignCadence: string;
  setCampaignCadence: (value: string) => void;
  campaignAuditionPrompt: string;
  setCampaignAuditionPrompt: (value: string) => void;
  charterSeats: number;
  setCharterSeats: (value: number) => void;
  charterTone: {
    mood: number;
    scale: number;
    influence: number;
  };
  setCharterTone: React.Dispatch<React.SetStateAction<{
    mood: number;
    scale: number;
    influence: number;
  }>>;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  const [showAllSignals, setShowAllSignals] = useState(false);
  const signalChoices = showAllSignals ? GENRES : POPULAR_GENRES;
  const previewTitle = title.trim() || "Untitled Adventure";
  const previewPremise =
    synopsis.trim() ||
    "A quiet town has begun finding doors in places that were solid yesterday. Behind each one is a road no map admits to knowing.";
  const previewInvitation =
    adventureInvitation.trim() ||
    "Bring a character with a debt, a loyal companion, or a reason to fear what waits below ordinary ground. The first session opens after dusk.";
  const rating = CONTENT_RATINGS.find((item) => item.value === contentRating) ?? CONTENT_RATINGS[0];
  const filledSeats = 0;
  const toneSummary = summarizeCharterTone(charterTone);

  return (
    <main className="relative min-h-screen overflow-hidden bg-void text-paper">
      <div className="pointer-events-none fixed inset-0">
        <Image
          src="/adventure_mode.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.06] saturate-[0.55] blur-[2px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,var(--t-gold-glow)_0%,transparent_45%)]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 55%, transparent 30%, color-mix(in srgb, var(--t-void) 88%, transparent) 100%)",
          }}
        />
        <CharterGrain />
      </div>

      <form onSubmit={onSubmit} className="relative z-10 mx-auto max-w-[1320px] px-6 pt-24 pb-24 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-10">
          <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">
            <button type="button" onClick={onBack} className="transition-colors hover:text-text">
              Write
            </button>
            <CharterPip />
            <span>Adventures</span>
            <CharterPip />
            <span className="text-gold/85">Draft charter</span>
          </nav>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Draft
            </span>
            <button
              type="button"
              onClick={onBack}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost transition-colors hover:text-text"
            >
              Change mode
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          <article className="relative">
            <div className="relative rounded-[18px] border border-gold/[0.12] bg-gradient-to-br from-surface/85 via-surface/72 to-elevated/88 p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75)] backdrop-blur-2xl sm:p-12">
              <CharterCorner className="absolute left-3 top-3" />
              <CharterCorner className="absolute right-3 top-3 -scale-x-100" />
              <CharterCorner className="absolute left-3 bottom-3 -scale-y-100" />
              <CharterCorner className="absolute right-3 bottom-3 -scale-100" />

              <section className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.36em] text-gold/65">
                  An Adventure Charter
                </p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className="h-px w-20 bg-gradient-to-r from-transparent to-gold/40" />
                  <CharterFleuron size={14} />
                  <span className="h-px w-20 bg-gradient-to-l from-transparent to-gold/40" />
                </div>
                <input
                  aria-label="Adventure title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="The Door Under Bellweather Hill"
                  required
                  className="mt-5 w-full appearance-none border-0 !bg-transparent text-center font-display text-[40px] font-medium leading-[1.05] tracking-[-0.005em] text-text outline-none placeholder:text-text-ghost/60 focus:ring-0 sm:text-[56px]"
                />
                <div className="mt-6 inline-flex items-center gap-2.5 text-[12px]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                    chartered by
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/25 via-gold/10 to-copper/10 font-display text-[10px] font-bold text-gold">
                    Y
                  </span>
                  <span className="font-display text-[14px] italic text-text">You</span>
                </div>
              </section>

              <CharterDivider />

              <CharterSection index="I" label="Premise" hint="The first thing applicants read">
                <textarea
                  aria-label="Adventure premise"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="A quiet town has begun finding doors in places that were solid yesterday..."
                  className="block w-full resize-none rounded-md border border-gold/[0.08] bg-surface/40 px-5 py-5 font-reading text-[20px] leading-[1.55] text-text outline-none transition-colors placeholder:text-text-ghost focus:border-gold/30"
                  rows={5}
                />
                <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  {synopsis.trim().split(/\s+/).filter(Boolean).length} / 240 words
                </p>
              </CharterSection>

              <CharterDivider />

              <CharterSection index="II" label="Story Direction">
                <div className="space-y-6">
                  <CharterToneSlider
                    label="Bright wonder"
                    rightLabel="Haunted dread"
                    value={charterTone.mood}
                    onChange={(value) => setCharterTone((prev) => ({ ...prev, mood: value }))}
                  />
                  <CharterToneSlider
                    label="Personal stakes"
                    rightLabel="Epic stakes"
                    value={charterTone.scale}
                    onChange={(value) => setCharterTone((prev) => ({ ...prev, scale: value }))}
                  />
                  <CharterToneSlider
                    label="GM-led"
                    rightLabel="Audience-shaped"
                    value={charterTone.influence}
                    onChange={(value) => setCharterTone((prev) => ({ ...prev, influence: value }))}
                  />
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                    Setting signals
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                    {selectedGenres.length}/5
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {signalChoices.map((genre, index) => {
                    const selected = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        disabled={!selected && selectedGenres.length >= 5}
                        className={`relative rounded-md border px-3 py-1 font-body text-[12px] tracking-wide transition-colors ${
                          selected || (selectedGenres.length === 0 && index === 0)
                            ? "border-gold/30 bg-gradient-to-b from-gold/15 to-transparent text-paper"
                            : selectedGenres.length >= 5
                            ? "cursor-not-allowed border-border/50 bg-surface/20 text-text-ghost/50"
                            : "border-border bg-surface/40 text-text-secondary hover:border-gold/30 hover:text-paper"
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowAllSignals((value) => !value)}
                    className="rounded-md border border-dashed border-border/70 px-3 py-1 font-body text-[12px] text-text-ghost transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    {showAllSignals ? "show popular" : "+ add signal"}
                  </button>
                </div>

                <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  Seats available
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[2, 3, 4, 5, 6].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setCharterSeats(count)}
                      className={`rounded-md border px-3 py-1.5 font-body text-[12px] transition-colors ${
                        charterSeats === count
                          ? "border-gold/35 bg-gold/[0.08] text-gold"
                          : "border-border bg-surface/40 text-text-secondary hover:border-gold/30 hover:text-paper"
                      }`}
                    >
                      {count} seats
                    </button>
                  ))}
                </div>
              </CharterSection>

              <CharterDivider />

              <CharterSection index="III" label="Reader Guidance">
                <div className="grid gap-7 sm:grid-cols-[1fr_1fr]">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                      Rating
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {CONTENT_RATINGS.map((item) => {
                        const active = item.value === contentRating;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setContentRating(item.value)}
                            className={`relative rounded-md border px-2 py-2 font-body text-[11px] transition-colors ${
                              active
                                ? "border-gold/40 bg-gradient-to-b from-gold/[0.18] to-gold/[0.04] text-paper shadow-[0_0_18px_rgba(212,175,55,0.18)]"
                                : "border-border bg-surface/40 text-text-secondary hover:border-border-active"
                            }`}
                          >
                            {item.label}
                            {active && (
                              <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                      Content notes
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["Violence", "Gore", "Sexual Content", "Strong Language", "Self-Harm", "Substance Use", "Abuse", "Horror", "Death", "Discrimination"].map((note) => {
                        const active = contentNotes.includes(note);
                        return (
                          <button
                            key={note}
                            type="button"
                            onClick={() =>
                              setContentNotes((prev) =>
                                prev.includes(note)
                                  ? prev.filter((item) => item !== note)
                                  : prev.length >= 10
                                  ? prev
                                  : [...prev, note]
                              )
                            }
                            className={`rounded-full border px-2.5 py-1 font-body text-[11px] transition-colors ${
                              active
                                ? "border-gold/30 bg-gold/[0.08] text-gold"
                                : "border-border bg-elevated/60 text-text-secondary hover:border-gold/40 hover:text-gold"
                            }`}
                          >
                            {note}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CharterSection>

              <CharterDivider />

              <CharterSection index="IV" label="Opening Invitation" hint="First words at the table">
                <blockquote className="relative rounded-md border border-gold/[0.14] bg-gradient-to-br from-surface/55 to-elevated/45 px-7 py-7">
                  <span className="pointer-events-none absolute -top-3 left-4 font-display text-[44px] leading-none text-gold/40">
                    “
                  </span>
                  <textarea
                    aria-label="Opening invitation"
                    value={adventureInvitation}
                    onChange={(e) => setAdventureInvitation(e.target.value)}
                    maxLength={280}
                    placeholder="Bring a character with a debt, a loyal companion, or a reason to fear what waits below ordinary ground. The first session opens after dusk."
                    rows={3}
                    className="block w-full resize-none bg-transparent font-reading text-[17px] italic leading-[1.6] text-text outline-none placeholder:text-text-ghost"
                  />
                  <span className="pointer-events-none absolute -bottom-8 right-4 font-display text-[44px] leading-none text-gold/40">
                    ”
                  </span>
                </blockquote>
                <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  {adventureInvitation.length}/280
                </p>
              </CharterSection>

              <CharterDivider />

              <CharterSection index="V" label="Audition Brief" hint="What applicants answer before they join">
                <div className="grid gap-5">
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                      Table cadence
                    </span>
                    <input
                      value={campaignCadence}
                      onChange={(e) => setCampaignCadence(e.target.value.slice(0, 160))}
                      placeholder="One scene per week · Sundays"
                      className="mt-2 block w-full rounded-md border border-gold/[0.08] bg-surface/40 px-4 py-3 font-body text-[13px] text-text outline-none transition-colors placeholder:text-text-ghost focus:border-gold/30"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                      Character prompt
                    </span>
                    <textarea
                      value={campaignAuditionPrompt}
                      onChange={(e) => setCampaignAuditionPrompt(e.target.value.slice(0, 1000))}
                      placeholder="Set the scene applicants should answer in character."
                      rows={4}
                      className="mt-2 block w-full resize-none rounded-md border border-gold/[0.08] bg-surface/40 px-4 py-3 font-reading text-[15px] leading-relaxed text-text outline-none transition-colors placeholder:text-text-ghost focus:border-gold/30"
                    />
                    <span className="mt-2 block text-right font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                      {campaignAuditionPrompt.length}/1000
                    </span>
                  </label>
                </div>
              </CharterSection>

              {error && (
                <div className="mt-8 rounded-md border border-rose/25 bg-rose/10 px-4 py-3 font-body text-[13px] text-rose">
                  {error}
                </div>
              )}

              <div className="my-10 flex items-center justify-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/30" />
                <CharterFleuron size={20} />
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/30" />
              </div>

              <div className="flex flex-col items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative flex items-center gap-4 rounded-full border border-gold/40 bg-gradient-to-b from-gold/22 via-gold/12 to-copper/12 px-7 py-3.5 font-display text-[15px] font-semibold text-gold shadow-[0_0_40px_rgba(212,175,55,0.22)] transition-all hover:border-gold/70 hover:text-paper hover:shadow-[0_0_60px_rgba(212,175,55,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CharterWaxSeal />
                  <span>{isSubmitting ? "Sealing..." : "Seal & open the table"}</span>
                  <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-gold/70 group-hover:text-paper/80 sm:inline">
                    creates adventure
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="font-body text-[12px] text-text-ghost transition-colors hover:text-text"
                >
                  Save as draft later · change mode
                </button>
              </div>
            </div>
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">
                  <CharterFleuron size={10} />
                  What applicants see
                </p>
              </div>

              <div className="relative rounded-2xl border border-gold/15 bg-gradient-to-br from-elevated/92 to-surface/88 p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
                <div className="relative overflow-hidden rounded-xl">
                  <div className="relative aspect-[5/4]">
                    <Image
                      src="/adventure_mode.png"
                      alt=""
                      fill
                      sizes="420px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-elevated via-elevated/30 to-transparent" />
                    <div className="absolute right-3 top-3">
                      <CharterWaxSeal />
                    </div>
                  </div>
                  <div className="absolute inset-x-4 bottom-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold/80">
                      An adventure by you
                    </p>
                    <h3 className="mt-1 font-display text-[24px] leading-[0.98] text-paper">
                      {previewTitle}
                    </h3>
                  </div>
                </div>

                <p className="mt-4 px-2 font-reading text-[13px] leading-[1.55] text-text-secondary">
                  {previewPremise.length > 160 ? previewPremise.slice(0, 160) + "..." : previewPremise}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5 px-2">
                  {(selectedGenres.length > 0 ? selectedGenres : ["Fantasy", "Mystery", "Dark Fantasy"]).slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-border bg-surface/50 px-2 py-0.5 font-body text-[10px] text-text-secondary"
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-lg border border-gold/[0.12] bg-void/30 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: charterSeats }).map((_, index) => (
                      <CharterLantern key={index} lit={index < filledSeats} />
                    ))}
                  </div>
                  <div className="ml-auto text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                      Seats
                    </p>
                    <p className="font-display text-[14px] text-paper">
                      {filledSeats} of {charterSeats}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-text-ghost">
                  {rating.label}
                  {contentNotes.slice(0, 3).map((note) => ` · ${note.toLowerCase()}`)}
                </p>
                <p className="mt-3 border-t border-border pt-3 text-center font-body text-[12px] leading-relaxed text-text-secondary">
                  {previewInvitation}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-elevated/70 p-5 backdrop-blur-xl">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                  Charter pulse
                </p>
                <div className="mt-4 space-y-3.5">
                  <CharterPulseRow label="Status" value="Drafting" accent />
                  <CharterPulseRow label="Tone" value={toneSummary} />
                  <CharterPulseRow label="Seats" value={`${charterSeats} open`} />
                  <CharterPulseRow label="First table" value="created after seal" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}

function CharterSection({
  index,
  label,
  hint,
  children,
}: {
  index: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-display text-[14px] tracking-[0.2em] text-gold/60">{index}</span>
        <h2 className="font-display text-[19px] tracking-tight text-paper">{label}</h2>
        {hint && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
            · {hint}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function CharterDivider() {
  return <div className="mt-9 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />;
}

function CharterPip() {
  return <span className="h-0.5 w-0.5 rounded-full bg-text-ghost/50" />;
}

function CharterFleuron({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-gold/70">
      <path
        d="M12 3v6M12 15v6M3 12h6M15 12h6"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <path
        d="M7.8 7.8l2 2M14.2 14.2l2 2M14.2 9.8l2-2M9.8 14.2l-2 2"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function CharterCorner({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={`text-gold/30 ${className}`}
      aria-hidden
    >
      <path
        d="M2 2h7M2 2v7M2 9c4.5 0 7-2.5 7-7"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CharterToneSlider({
  label,
  rightLabel,
  value,
  onChange,
}: {
  label: string;
  rightLabel: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
        <span>{label}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="relative mt-2 h-5">
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-gold/25 via-border to-gold/25" />
        <div
          className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-gold/60 bg-gradient-to-br from-gold to-copper shadow-[0_0_10px_rgba(212,175,55,0.55)]"
          style={{ left: `calc(${value}% - 6px)` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={`${label} to ${rightLabel}`}
          className="absolute inset-0 h-5 w-full cursor-pointer appearance-none bg-transparent opacity-0"
        />
      </div>
    </div>
  );
}

function summarizeCharterTone({
  mood,
  scale,
  influence,
}: {
  mood: number;
  scale: number;
  influence: number;
}) {
  const moodLabel = mood >= 60 ? "haunted" : mood <= 40 ? "wondrous" : "balanced";
  const scaleLabel = scale >= 60 ? "epic" : scale <= 40 ? "intimate" : "wide-ranging";
  const influenceLabel =
    influence >= 60 ? "audience-shaped" : influence <= 40 ? "GM-led" : "shared direction";
  return `${moodLabel}, ${scaleLabel}, ${influenceLabel}`;
}

function CharterLantern({ lit }: { lit: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full transition-all ${
        lit
          ? "bg-gradient-to-br from-gold to-copper shadow-[0_0_8px_rgba(212,175,55,0.6)]"
          : "border border-border bg-elevated"
      }`}
    />
  );
}

function CharterWaxSeal() {
  return (
    <span className="relative inline-flex h-8 w-8 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-ruby/80 via-ruby/55 to-copper/55 shadow-[0_0_12px_rgba(178,34,52,0.45),inset_-2px_-2px_4px_rgba(0,0,0,0.4),inset_2px_2px_4px_rgba(255,255,255,0.12)]" />
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        className="relative text-paper/90"
        aria-hidden
      >
        <path d="M12 3l2.4 5.2 5.6.6-4.2 3.8 1.3 5.5L12 15.5 6.9 18.1l1.3-5.5L4 8.8l5.6-.6z" fill="currentColor" opacity="0.9" />
      </svg>
    </span>
  );
}

function CharterPulseRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
        {label}
      </span>
      <span className={`font-body text-[12px] ${accent ? "font-semibold text-gold" : "text-text"}`}>
        {value}
      </span>
    </div>
  );
}

function CharterGrain() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.028] mix-blend-overlay"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <filter id="create-charter-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#create-charter-grain)" />
    </svg>
  );
}

// ── Mode Selection (Step 1) — Card Panels ─────────────────

const MODES = [
  {
    id: "solo" as WritingMode,
    title: "Solo Story",
    subtitle: "The Study",
    description: "A quiet room. A desk by the window. The page waits for the impossible to show itself.",
    features: ["Rich novel editor", "Private characters & world notes", "Export anywhere"],
    image: "/solo_story_mode.png",
    color: "amber",
    glowColor: "bg-amber/30",
    borderColor: "border-amber/40",
    textColor: "text-amber",
  },
  {
    id: "co-op" as WritingMode,
    title: "Co-op Story",
    subtitle: "The Workshop",
    description: "A long table. Marked-up maps. A world made sturdier because more than one hand knows its roads.",
    features: ["Invite collaborators", "Shared lore book", "Agreements & credit"],
    image: "/coop_story_mode.png",
    color: "teal",
    glowColor: "bg-teal/30",
    borderColor: "border-teal/40",
    textColor: "text-teal",
  },
  {
    id: "campaign" as WritingMode,
    title: "Adventure",
    subtitle: "The Table",
    description: "A small cast around one table: a Director runs the world, writers play its people, an audience reads it live.",
    features: ["One Director, 2\u20134 writers", "Spotlight turns, raised hands", "Compiles into a finished novel"],
    badge: "New",
    image: "/adventure_mode.png",
    color: "violet",
    glowColor: "bg-violet/30",
    borderColor: "border-violet/40",
    textColor: "text-violet",
  },
];

function ModeSelection({
  onSelect,
}: {
  onSelect: (mode: WritingMode) => void;
}) {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<WritingMode>(null);

  const handleSelect = (mode: WritingMode) => {
    setSelectedMode(mode);
    setTimeout(() => onSelect(mode), 1000);
  };

  return (
    <div className="create-mode-selection min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-void">
      {/* Dynamic Ambient Background — blurs with enough weight to register in light mode */}
      <div className="create-mode-ambient absolute inset-0 overflow-hidden pointer-events-none">
        <div className="create-mode-ambient-violet absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet/8 blur-[120px]" />
        <div className="create-mode-ambient-amber absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-amber/10 blur-[120px]" />
        <div className="create-mode-ambient-teal absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-teal/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: selectedMode ? 0 : 1,
          y: selectedMode ? -40 : 0,
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-12 relative z-10"
      >
        <p className="font-display text-[12px] uppercase tracking-[0.25em] text-text-ghost mb-4">
          Choose a threshold
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-paper font-medium tracking-tight">
          Where does the story open?
        </h1>
      </motion.div>

      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-[700px] relative z-10">
        {MODES.map((mode) => {
          const isHovered = hoveredMode === mode.id;
          const isSelected = selectedMode === mode.id;
          const isOtherSelected = selectedMode !== null && !isSelected;

          return (
            <motion.button
              key={mode.id}
              layout
              initial={{ opacity: 0, y: 40 }}
              animate={{
                opacity: isOtherSelected ? 0 : 1,
                y: isOtherSelected ? 20 : 0,
                flex: isSelected ? 3 : isHovered ? 1.5 : 1,
                scale: isSelected ? 1.02 : 1,
              }}
              transition={{
                opacity: { duration: 0.4 },
                y: { duration: 0.6, ease: "easeOut" },
                flex: { type: "spring", stiffness: 200, damping: 25 },
                scale: { duration: 0.6, ease: "backOut" },
                layout: { type: "spring", stiffness: 200, damping: 25 },
              }}
              onMouseEnter={() => !selectedMode && setHoveredMode(mode.id)}
              onMouseLeave={() => !selectedMode && setHoveredMode(null)}
              onClick={() => !selectedMode && handleSelect(mode.id)}
              disabled={!!selectedMode}
              className={`create-mode-card relative overflow-hidden group border border-border bg-surface focus:outline-none transition-all duration-500 cursor-pointer shadow-card ${
                isHovered && !selectedMode ? `shadow-card-hover ` + mode.borderColor : ""
              } ${isSelected ? `shadow-card-hover ` + mode.borderColor : ""}`}
            >
              {/* Background Image Container */}
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                <motion.img
                  src={mode.image}
                  alt={mode.title}
                  animate={{ scale: isHovered || isSelected ? 1.05 : 1 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className={`w-full h-full object-cover ${
                    isHovered || isSelected ? "card-image-active" : "card-image-dim"
                  }`}
                />

                {/* Vignette & Gradients — fade into the card's own surface color so light mode looks clean */}
                <div className="create-mode-card-fade-bottom absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent opacity-95" />
                <div className="create-mode-card-fade-top absolute inset-0 bg-gradient-to-b from-surface/40 via-transparent to-transparent opacity-60" />

                {/* Selection Glow Flash */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.4, 0] }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className={`absolute inset-0 ${mode.glowColor} mix-blend-overlay`}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Content Overlay */}
              <div className="create-mode-card-content absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end h-full">

                {/* Top Badge Overlay */}
                <div className="absolute top-6 left-6 flex justify-between w-[calc(100%-3rem)]">
                  {mode.badge && (
                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-bold rounded-full bg-surface/80 backdrop-blur-md border border-${mode.color}/30 ${mode.textColor} shadow-sm`}>
                      {mode.badge}
                    </span>
                  )}
                </div>

                <div className="relative z-20 w-full flex flex-col items-start text-left">
                  <motion.p
                    animate={{
                      color: isHovered || isSelected ? `var(--color-${mode.color})` : "var(--color-text-ghost)"
                    }}
                    className={`create-mode-card-subtitle text-[12px] font-semibold uppercase tracking-[0.15em] mb-2 transition-colors duration-300 ${mode.textColor}`}
                  >
                    {mode.subtitle}
                  </motion.p>

                  <motion.h2
                    layout="position"
                    className="create-mode-card-title font-body text-[30px] sm:text-[34px] font-semibold leading-[1.08] text-paper mb-3"
                  >
                    {mode.title}
                  </motion.h2>

                  <p className="text-text-secondary text-[14px] leading-relaxed font-body">
                    {mode.description}
                  </p>

                  <AnimatePresence>
                    {(isHovered || isSelected) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: 10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-full overflow-hidden"
                      >
                        <div className="pt-5 border-t border-border mt-5">
                          <ul className="space-y-3">
                            {mode.features.map((feat, i) => (
                              <motion.li
                                key={feat}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 + 0.1 }}
                                className="flex items-center gap-3 text-text text-[13px] font-medium"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full bg-${mode.color} shadow-[0_0_8px_currentColor]`} />
                                {feat}
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        {/* Selected State Arrow Indicator */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.5 }}
                              className="mt-8 flex justify-end w-full"
                            >
                              <div className={`w-10 h-10 rounded-full bg-${mode.color}/20 border border-${mode.color}/50 flex items-center justify-center text-${mode.color} backdrop-blur-md`}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M4 10h12M12 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        animate={{ opacity: selectedMode ? 0 : 1, y: selectedMode ? 20 : 0 }}
        className="mt-10 text-center relative z-10 h-6"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={hoveredMode ?? "default"}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="text-text-ghost text-[13px] italic font-body max-w-md mx-auto"
          >
            {hoveredMode === "solo"
              ? "Perfect for novels, short stories, poetry, and screenplays."
              : hoveredMode === "co-op"
              ? "Best for shared universes, anthology projects, and collaborative writing teams."
              : hoveredMode === "campaign"
              ? "Think a TTRPG meets collaborative fiction. You become the Game Master."
              : "Decide how you want to weave your next tale."}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Import existing manuscript */}
      <ImportEntry disabled={!!selectedMode} />
    </div>
  );
}

function ImportEntry({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File) => {
    if (importing) return;
    setError(null);
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("We only support .docx for now.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. 10 MB max.");
      return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/stories/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.data?.id) {
        setError(json.error?.message || "Import failed.");
        setImporting(false);
        return;
      }
      router.push(`/write/${json.data.id}`);
    } catch {
      setError("Network error. Try again.");
      setImporting(false);
    }
  };

  if (disabled) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-center"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="text-[12px] text-text-ghost hover:text-amber transition-colors disabled:opacity-50 inline-flex items-center gap-2"
      >
        {importing ? (
          <>
            <span className="w-3 h-3 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
            Importing your manuscript…
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 11V3M8 3l-3 3M8 3l3 3" />
              <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2" />
            </svg>
            Or import a .docx manuscript
          </>
        )}
      </button>
      {error && <p className="text-[11px] text-rose mt-2">{error}</p>}
    </motion.div>
  );
}



// ── Step 2: Solo title page + Co-op notice ──────────────────
// Solo and co-op diverge here. Solo is a private threshold — you inscribe the
// manuscript's title page and the book on the left reshapes to the format you
// pick. Co-op is a public artifact — a notice pinned to the workshop, with a
// "what collaborators see" preview, mirroring the campaign Charter's logic.
// Both keep the canonical gold accent and reuse the create-details-* classes so
// Vellum (light) theming carries over for free.

type StoryDraftProps = {
  title: string;
  setTitle: (value: string) => void;
  format: string;
  setFormat: (value: string) => void;
  synopsis: string;
  setSynopsis: (value: string) => void;
  selectedGenres: string[];
  toggleGenre: (genre: string) => void;
  genreSearch: string;
  setGenreSearch: (value: string) => void;
  showAllGenres: boolean;
  setShowAllGenres: Dispatch<SetStateAction<boolean>>;
  filteredGenres: readonly string[];
  contentRating: string;
  setContentRating: (value: string) => void;
  contentNotes: string[];
  setContentNotes: Dispatch<SetStateAction<string[]>>;
  coverPreview: string | null;
  setCoverPreview: (value: string | null) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  handleCoverFile: (file: File) => void;
  coverInputRef: RefObject<HTMLInputElement | null>;
  seekingRoles: string[];
  setSeekingRoles: Dispatch<SetStateAction<string[]>>;
  showColophon: boolean;
  setShowColophon: Dispatch<SetStateAction<boolean>>;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
  modeData: (typeof MODES)[number];
};

// The hero move: format reshapes the physical book. Widths are tuned so every
// silhouette lands at a comparable height and fits a phone column.
const BOOK_SHAPES: Record<string, { w: number; h: number; kind: string }> = {
  novel: { w: 300, h: 450, kind: "A Novel" },
  webtoon: { w: 210, h: 498, kind: "A Webtoon" },
  poetry: { w: 296, h: 396, kind: "A Verse Collection" },
  screenplay: { w: 300, h: 398, kind: "A Screenplay" },
  illustrated: { w: 342, h: 428, kind: "An Illustrated Tale" },
};

const COOP_ROLES = [
  { id: "writer", label: "Writer" },
  { id: "illustrator", label: "Illustrator" },
  { id: "editor", label: "Editor" },
  { id: "worldbuilder", label: "Worldbuilder" },
] as const;

// Role colors are the canonical ones (writer=amber, illustrator=lavender,
// editor=teal, worldbuilder=sage). Hand-rolled so Tailwind sees the literals.
const ROLE_STYLE: Record<string, { active: string; dot: string; chip: string }> = {
  writer: { active: "border-amber/40 bg-amber/10 text-amber", dot: "bg-amber", chip: "border-amber/25 bg-amber/10 text-amber" },
  illustrator: { active: "border-lavender/40 bg-lavender/10 text-lavender", dot: "bg-lavender", chip: "border-lavender/25 bg-lavender/10 text-lavender" },
  editor: { active: "border-teal/40 bg-teal/10 text-teal", dot: "bg-teal", chip: "border-teal/25 bg-teal/10 text-teal" },
  worldbuilder: { active: "border-sage/40 bg-sage/10 text-sage", dot: "bg-sage", chip: "border-sage/25 bg-sage/10 text-sage" },
};

const CONTENT_NOTE_OPTIONS = [
  "Violence", "Gore", "Sexual Content", "Strong Language", "Self-Harm",
  "Substance Use", "Abuse", "Horror", "Death", "Discrimination",
];

// Shared atmospheric frame: backdrop, paper wash, back button, the form.
function DraftShell({
  modeImage,
  onSubmit,
  onBack,
  children,
}: {
  modeImage: string;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="create-details relative min-h-screen overflow-x-hidden bg-void">
      <div className="create-details-backdrop pointer-events-none fixed inset-0">
        <Image src={modeImage} alt="" fill sizes="100vw" priority className="create-details-backdrop-image object-cover" />
        <div className="absolute inset-0" style={{ background: ACCENT.amber.ambientBg }} />
        <div className="create-details-paper-wash absolute inset-0" />
      </div>

      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        onClick={onBack}
        className="group fixed left-6 top-6 z-50 cursor-pointer"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated/80 px-3.5 py-2 font-body text-[12px] text-text-secondary shadow-elevated backdrop-blur-xl transition-all hover:border-border-active hover:text-paper">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back
        </span>
      </motion.button>

      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10"
      >
        {children}
      </motion.form>
    </div>
  );
}

// Format-specific ornament drawn over the cover art (image overlay → fixed
// white, theme-independent for legibility).
function OrnamentMarks({ format }: { format: string }) {
  if (format === "screenplay") {
    return (
      <div className="absolute left-2 top-0 flex h-full flex-col justify-center gap-7">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full border border-white/40 bg-black/40" />
        ))}
      </div>
    );
  }
  if (format === "webtoon") {
    return (
      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1" />
        <div className="h-px bg-white/25" />
        <div className="flex-1" />
        <div className="h-px bg-white/25" />
        <div className="flex-1" />
      </div>
    );
  }
  if (format === "poetry") {
    return <div className="absolute right-5 top-0 h-full w-px bg-white/30" />;
  }
  if (format === "illustrated") {
    return <div className="absolute inset-3 border border-white/25" />;
  }
  return null;
}

// (3) Ornament crossfades when the binding changes — keyed by format so
// AnimatePresence swaps the old marks for the new as the book reshapes.
function BookOrnament({ format }: { format: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={format}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="pointer-events-none absolute inset-0 z-20"
      >
        <OrnamentMarks format={format} />
      </motion.div>
    </AnimatePresence>
  );
}

// The cover that morphs with the chosen format. Doubles as the cover uploader.
function ReshapingBook({
  format,
  title,
  modeImage,
  coverPreview,
  setCoverPreview,
  isDragging,
  setIsDragging,
  handleCoverFile,
  coverInputRef,
  scale = 1,
  tilt = false,
}: {
  format: string;
  title: string;
  modeImage: string;
  coverPreview: string | null;
  setCoverPreview: (value: string | null) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  handleCoverFile: (file: File) => void;
  coverInputRef: RefObject<HTMLInputElement | null>;
  scale?: number;
  tilt?: boolean;
}) {
  const shape = BOOK_SHAPES[format] ?? BOOK_SHAPES.novel;
  const w = Math.round(shape.w * scale);
  const h = Math.round(shape.h * scale);

  // (1) Pointer parallax — the book tilts toward the cursor like an object on
  // the desk. (3) Flex — a quick wobble layered on top whenever the binding
  // changes. Both ride rotateX/rotateY springs; the flex is summed into rotateY.
  const tiltX = useSpring(0, { stiffness: 150, damping: 18 });
  const tiltY = useSpring(0, { stiffness: 150, damping: 18 });
  const flexY = useSpring(0, { stiffness: 130, damping: 8 });
  const rotateY = useTransform([tiltY, flexY], ([a, b]) => (a as number) + (b as number));

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    flexY.set(7);
    const t = setTimeout(() => flexY.set(0), 80);
    return () => clearTimeout(t);
  }, [format, flexY]);

  const handleMove = tilt
    ? (e: ReactPointerEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 9);
        tiltX.set(((e.clientY - r.top) / r.height - 0.5) * -9);
      }
    : undefined;
  const handleLeave = tilt ? () => { tiltX.set(0); tiltY.set(0); } : undefined;

  return (
    <>
      <input
        type="file"
        ref={coverInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleCoverFile(f);
        }}
      />
      <div style={{ perspective: 1200 }} onPointerMove={handleMove} onPointerLeave={handleLeave}>
      <motion.div
        animate={{ width: w, height: h }}
        transition={{ type: "spring", stiffness: 210, damping: 26 }}
        style={{ width: w, height: h, rotateX: tiltX, rotateY, transformStyle: "preserve-3d" }}
        className="create-details-book group relative overflow-hidden rounded-l-sm rounded-r-xl border border-border shadow-elevated"
      >
        {/* spine */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-30 h-full w-[7px]"
          style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--t-paper) 18%, transparent), transparent 60%)" }}
        />
        <div
          onClick={() => coverInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleCoverFile(f);
          }}
          className={`absolute inset-0 cursor-pointer ${isDragging ? "ring-2 ring-amber/50 ring-inset" : ""}`}
        >
          <Image
            src={coverPreview || modeImage}
            alt=""
            fill
            sizes="360px"
            unoptimized={!!coverPreview}
            className={coverPreview ? "object-cover" : "create-details-cover-image object-cover"}
          />
          <BookOrnament format={format} />

          {/* live title typeset on the cover */}
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-5 pt-14">
            <p className="line-clamp-3 font-display text-[18px] leading-tight text-white">
              {title.trim() || "Untitled"}
            </p>
            <p className="mt-1 font-body text-[9px] uppercase tracking-[0.22em] text-white/55">by you</p>
          </div>

          {!coverPreview && (
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded-full bg-black/65 px-3 py-1.5 text-[11px] text-white backdrop-blur-md">
                Click to add cover art
              </span>
            </div>
          )}
          {coverPreview && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCoverPreview(null); }}
              className="absolute right-2 top-2 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-opacity hover:bg-rose hover:text-void group-hover:opacity-100"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          )}
        </div>
      </motion.div>
      </div>
    </>
  );
}

// The inline "what kind of book is this" selector — picks reshape the book.
function FormatKindRow({ format, setFormat }: { format: string; setFormat: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2.5">
      {FORMATS.map((f) => {
        const on = format === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => setFormat(f.id)}
            className={`relative cursor-pointer font-display text-[15px] transition-colors ${on ? "text-amber" : "text-text-secondary hover:text-paper"}`}
          >
            {f.label}
            {on && <motion.span layoutId="create-fmt-underline" className="absolute -bottom-1.5 left-0 right-0 h-px bg-amber/70" />}
          </button>
        );
      })}
    </div>
  );
}

// Format is written into the story at creation and never changes after — the
// picker is silent about that, so this says it once, quietly.
function FormatPermanenceNote({ className = "" }: { className?: string }) {
  return (
    <p className={`font-body text-[11px] text-text-ghost ${className}`}>
      A story keeps its format once it&apos;s begun — pick the shape that fits.
    </p>
  );
}

// Genres + rating + content notes. The "catalog" data, shared by both layouts —
// tucked into a colophon for solo, shown inline for co-op.
function ColophonControls({
  selectedGenres, toggleGenre, genreSearch, setGenreSearch,
  showAllGenres, setShowAllGenres, filteredGenres,
  contentRating, setContentRating, contentNotes, setContentNotes,
}: {
  selectedGenres: string[];
  toggleGenre: (genre: string) => void;
  genreSearch: string;
  setGenreSearch: (value: string) => void;
  showAllGenres: boolean;
  setShowAllGenres: Dispatch<SetStateAction<boolean>>;
  filteredGenres: readonly string[];
  contentRating: string;
  setContentRating: (value: string) => void;
  contentNotes: string[];
  setContentNotes: Dispatch<SetStateAction<string[]>>;
}) {
  return (
    <div className="space-y-7">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">Genres</p>
          <span className="font-body text-[11px] text-text-tertiary">{selectedGenres.length}/5</span>
        </div>

        <AnimatePresence>
          {selectedGenres.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex flex-wrap gap-1.5 overflow-hidden"
            >
              {selectedGenres.map((genre) => (
                <motion.span
                  key={genre}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="inline-flex items-center gap-1 rounded-full border border-amber/20 bg-amber/10 px-2.5 py-1 font-body text-[11px] text-amber"
                >
                  {genre}
                  <button type="button" onClick={() => toggleGenre(genre)} className="ml-0.5 cursor-pointer transition-colors hover:text-paper">
                    ×
                  </button>
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative mb-3">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost">
            <circle cx="6.5" cy="6.5" r="5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            type="text"
            value={genreSearch}
            onChange={(e) => { setGenreSearch(e.target.value); if (e.target.value) setShowAllGenres(true); }}
            placeholder="Search genres…"
            className="w-full rounded-md border border-border bg-transparent py-2 pl-9 pr-3 font-body text-[13px] text-text outline-none transition-colors placeholder:text-text-secondary/50 focus:border-amber/25"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filteredGenres.filter((g) => !selectedGenres.includes(g)).map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => toggleGenre(genre)}
              disabled={selectedGenres.length >= 5}
              className={`cursor-pointer rounded-full border px-3 py-1.5 font-body text-[12px] transition-all ${
                selectedGenres.length >= 5
                  ? "border-border-subtle text-text-tertiary/50"
                  : "border-border text-text-secondary hover:border-amber/30 hover:bg-amber/[0.04] hover:text-amber"
              }`}
            >
              {genre}
            </button>
          ))}
          {filteredGenres.filter((g) => !selectedGenres.includes(g)).length === 0 && genreSearch && (
            <p className="py-1 font-body text-[12px] italic text-text-ghost/50">No genres match &ldquo;{genreSearch}&rdquo;</p>
          )}
        </div>

        {!genreSearch && (
          <button
            type="button"
            onClick={() => setShowAllGenres(!showAllGenres)}
            className="mt-2.5 cursor-pointer font-body text-[11px] text-text-ghost transition-colors hover:text-amber"
          >
            {showAllGenres ? "Show less" : `Browse all ${GENRES.length} genres →`}
          </button>
        )}
      </div>

      <div>
        <p className="mb-3 font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">Content Rating</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONTENT_RATINGS.map((rating) => {
            const on = contentRating === rating.value;
            return (
              <button
                key={rating.value}
                type="button"
                onClick={() => setContentRating(rating.value)}
                className={`flex cursor-pointer flex-col items-start rounded-md border px-3.5 py-3 font-body text-[12px] transition-all ${
                  on ? "border-amber/30 bg-amber/10 text-amber" : "border-border bg-transparent text-text-secondary hover:border-border-active hover:bg-elevated/50"
                }`}
              >
                <span className="font-medium">{rating.label}</span>
                <span className={`mt-0.5 text-[10px] ${on ? "text-amber/60" : "text-text-tertiary"}`}>{rating.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">Content Notes</p>
        <p className="mb-3 font-body text-[11px] text-text-ghost">Help readers make informed choices</p>
        <div className="flex flex-wrap gap-2">
          {CONTENT_NOTE_OPTIONS.map((note) => {
            const on = contentNotes.includes(note);
            return (
              <button
                key={note}
                type="button"
                onClick={() =>
                  setContentNotes((prev) =>
                    prev.includes(note) ? prev.filter((n) => n !== note) : prev.length >= 10 ? prev : [...prev, note]
                  )
                }
                className={`cursor-pointer rounded-full border px-2.5 py-1 font-body text-[11px] transition-all ${
                  on ? "border-amber/20 bg-amber/10 text-amber" : "border-border text-text-secondary hover:border-border-active hover:bg-elevated"
                }`}
              >
                {note}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SubmitArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8h9M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Solo: the title page ────────────────────────────────────
function SoloTitlePage(props: StoryDraftProps) {
  const {
    title, setTitle, format, setFormat, synopsis, setSynopsis,
    selectedGenres, toggleGenre, genreSearch, setGenreSearch,
    showAllGenres, setShowAllGenres, filteredGenres,
    contentRating, setContentRating, contentNotes, setContentNotes,
    coverPreview, setCoverPreview, isDragging, setIsDragging,
    handleCoverFile, coverInputRef, showColophon, setShowColophon,
    isSubmitting, error, onSubmit, onBack, modeData,
  } = props;

  const shape = BOOK_SHAPES[format] ?? BOOK_SHAPES.novel;
  const ratingLabel = CONTENT_RATINGS.find((r) => r.value === contentRating)?.label;

  return (
    <DraftShell modeImage={modeData.image} onSubmit={onSubmit} onBack={onBack}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 pb-24 pt-20 lg:flex-row lg:items-start lg:gap-20 lg:px-8">
        {/* the book — reshapes to format */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex shrink-0 flex-col items-center gap-3 lg:sticky lg:top-24"
        >
          <ReshapingBook
            format={format}
            title={title}
            modeImage={modeData.image}
            coverPreview={coverPreview}
            setCoverPreview={setCoverPreview}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            handleCoverFile={handleCoverFile}
            coverInputRef={coverInputRef}
            tilt
          />
          <p className="font-body text-[11px] italic text-text-ghost">click the cover to add art</p>
          <FormatPreview format={format} className="mt-1" />
        </motion.div>

        {/* the title page */}
        <div className="create-details-form-panel create-details-dossier relative w-full rounded-lg border border-border bg-surface/90 px-7 py-9 shadow-elevated backdrop-blur-xl sm:px-10 sm:py-11 lg:max-w-xl">
          <div className="absolute inset-x-0 top-0 h-px rounded-t-lg bg-gradient-to-r from-transparent via-border-active to-transparent" />

          <p className="mb-5 font-body text-[10px] uppercase tracking-[0.2em] text-amber/75">{modeData.subtitle}</p>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            required
            className="create-details-title-input w-full border-0 border-b border-border bg-transparent pb-3 font-display text-[38px] leading-[1.05] text-paper outline-none transition-colors placeholder:text-text-secondary/40 focus:border-amber/40 sm:text-[44px]"
          />
          <p className="mt-4 font-body text-[12.5px] text-text-secondary">
            <span className="italic text-amber/85">{shape.kind}</span> · by you
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center gap-2 rounded-xl border border-rose/25 bg-rose/5 px-4 py-3 text-[13px] text-rose"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                <circle cx="7" cy="7" r="6" />
                <path d="M7 4v3M7 9v.5" />
              </svg>
              {error}
            </motion.div>
          )}

          <div className="mt-8">
            <p className="mb-3.5 font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">What shape does it take?</p>
            <FormatKindRow format={format} setFormat={setFormat} />
            <p className="mt-3 font-body text-[11px] text-text-ghost">
              {FORMATS.find((f) => f.id === format)?.desc} — opens its own editor.
            </p>
            <FormatPermanenceNote className="mt-1.5" />
          </div>

          <div className="mt-9">
            <p className="mb-3 font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">
              The logline <span className="ml-1 normal-case tracking-normal text-text-tertiary">— what draws a reader in</span>
            </p>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="One line, set like the words on a dust jacket…"
              className="w-full resize-none border-l-2 border-amber/30 bg-transparent py-1 pl-4 font-reading text-[18px] italic leading-[1.6] text-text outline-none transition-colors placeholder:text-text-ghost/60 focus:border-amber/60"
            />
            <p className="mt-1.5 text-right font-body text-[11px] text-text-ghost">{synopsis.length}/500</p>
          </div>

          {/* colophon — optional catalog data, tucked away */}
          <div className="mt-9 border-t border-border pt-6">
            <button
              type="button"
              onClick={() => setShowColophon((v) => !v)}
              className="flex w-full cursor-pointer items-center gap-2 font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost transition-colors hover:text-amber"
            >
              <svg
                width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                className="transition-transform"
                style={{ transform: showColophon ? "rotate(90deg)" : "none" }}
              >
                <path d="M6 3l5 5-5 5" />
              </svg>
              Catalog details
              <span className="ml-1 normal-case tracking-normal text-text-tertiary">— genres, rating, content notes (optional)</span>
            </button>

            <AnimatePresence initial={false}>
              {showColophon && (
                <motion.div
                  key="colophon"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6">
                    <ColophonControls
                      selectedGenres={selectedGenres}
                      toggleGenre={toggleGenre}
                      genreSearch={genreSearch}
                      setGenreSearch={setGenreSearch}
                      showAllGenres={showAllGenres}
                      setShowAllGenres={setShowAllGenres}
                      filteredGenres={filteredGenres}
                      contentRating={contentRating}
                      setContentRating={setContentRating}
                      contentNotes={contentNotes}
                      setContentNotes={setContentNotes}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showColophon && (selectedGenres.length > 0 || (contentRating && contentRating !== "everyone")) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedGenres.slice(0, 4).map((g) => (
                  <span key={g} className="rounded-full border border-amber/20 bg-amber/10 px-2 py-0.5 font-body text-[10px] text-amber">{g}</span>
                ))}
                {contentRating && contentRating !== "everyone" && (
                  <span className="rounded-full border border-border bg-elevated px-2 py-0.5 font-body text-[10px] text-text-secondary">{ratingLabel}</span>
                )}
              </div>
            )}
          </div>

          <div className="mt-10 flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-md bg-amber px-7 py-3 font-body text-[13px] font-semibold text-void transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center gap-2.5">
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void" />
                ) : (
                  <SubmitArrow />
                )}
                {isSubmitting ? "Opening…" : "Open the manuscript"}
              </span>
            </button>
            <button
              type="button"
              onClick={onBack}
              className="cursor-pointer font-body text-[13px] text-text-ghost transition-colors hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </DraftShell>
  );
}

// ── Co-op: the notice to the workshop ───────────────────────
function CoopNotice(props: StoryDraftProps) {
  const {
    title, setTitle, format, setFormat, synopsis, setSynopsis,
    selectedGenres, toggleGenre, genreSearch, setGenreSearch,
    showAllGenres, setShowAllGenres, filteredGenres,
    contentRating, setContentRating, contentNotes, setContentNotes,
    coverPreview, setCoverPreview, isDragging, setIsDragging,
    handleCoverFile, coverInputRef, seekingRoles, setSeekingRoles,
    isSubmitting, error, onSubmit, onBack, modeData,
  } = props;

  const formatLabel = FORMATS.find((f) => f.id === format)?.label.toLowerCase() ?? "story";
  const ratingLabel = CONTENT_RATINGS.find((r) => r.value === contentRating)?.label;
  const pitchExcerpt = synopsis.trim()
    ? synopsis.trim().length > 180 ? synopsis.trim().slice(0, 180) + "…" : synopsis.trim()
    : "Your pitch will appear here as you write it — the first thing a collaborator reads.";

  const toggleRole = (id: string) =>
    setSeekingRoles((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  return (
    <DraftShell modeImage={modeData.image} onSubmit={onSubmit} onBack={onBack}>
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-20 lg:px-8">
        <header className="mb-9">
          <p className="mb-2 font-body text-[10px] uppercase tracking-[0.2em] text-amber/75">{modeData.subtitle}</p>
          <h2 className="font-display text-[30px] leading-tight text-paper">Pin a notice to the board</h2>
          <p className="mt-2 max-w-lg font-body text-[13px] italic leading-relaxed text-text-secondary">{modeData.description}</p>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* the notice */}
          <div className="create-details-form-panel create-details-dossier relative rounded-lg border border-border bg-surface/90 px-6 py-8 shadow-elevated backdrop-blur-xl sm:px-9">
            <div className="absolute inset-x-0 top-0 h-px rounded-t-lg bg-gradient-to-r from-transparent via-border-active to-transparent" />

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled collaboration"
              required
              className="create-details-title-input w-full border-0 border-b border-border bg-transparent pb-3 font-display text-[30px] leading-tight text-paper outline-none transition-colors placeholder:text-text-secondary/40 focus:border-amber/40 sm:text-[34px]"
            />
            <p className="mt-3 font-body text-[12.5px] text-text-secondary">
              <span className="italic text-amber/85">A shared {formatLabel}</span> · seeking collaborators
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center gap-2 rounded-xl border border-rose/25 bg-rose/5 px-4 py-3 text-[13px] text-rose"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                  <circle cx="7" cy="7" r="6" />
                  <path d="M7 4v3M7 9v.5" />
                </svg>
                {error}
              </motion.div>
            )}

            <div className="mt-8">
              <p className="mb-3 font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                The pitch <span className="ml-1 normal-case tracking-normal text-text-tertiary">— why should someone join you?</span>
              </p>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={4}
                placeholder="Set the stage and the ambition. What's the world, and what do you need help building?"
                className="w-full resize-none rounded-lg border border-border bg-elevated/40 px-4 py-3 font-body text-[14px] leading-relaxed text-text outline-none transition-colors placeholder:text-text-secondary/50 focus:border-amber/30"
              />
              <p className="mt-1.5 text-right font-body text-[11px] text-text-ghost">{synopsis.length}/500</p>
            </div>

            <div className="mt-8">
              <p className="mb-3 font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">Roles you&apos;re hoping to fill</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {COOP_ROLES.map((role) => {
                  const on = seekingRoles.includes(role.id);
                  const st = ROLE_STYLE[role.id];
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border px-3 py-3.5 transition-all ${
                        on ? st.active : "border-border bg-elevated/50 text-text-secondary hover:border-border-active"
                      }`}
                    >
                      <motion.span
                        key={on ? "on" : "off"}
                        initial={{ scale: 0.3 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 520, damping: 14 }}
                        style={on ? { boxShadow: "0 0 10px currentColor" } : undefined}
                        className={`h-2 w-2 rounded-full ${on ? st.dot : "bg-text-ghost"}`}
                      />
                      <span className="font-body text-[12px] font-medium">{role.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <p className="mb-3 font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">Format</p>
              <FormatKindRow format={format} setFormat={setFormat} />
              <FormatPermanenceNote className="mt-3" />
            </div>

            <div className="mt-8 border-t border-border pt-7">
              <p className="mb-4 font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">Catalog &amp; guidance</p>
              <ColophonControls
                selectedGenres={selectedGenres}
                toggleGenre={toggleGenre}
                genreSearch={genreSearch}
                setGenreSearch={setGenreSearch}
                showAllGenres={showAllGenres}
                setShowAllGenres={setShowAllGenres}
                filteredGenres={filteredGenres}
                contentRating={contentRating}
                setContentRating={setContentRating}
                contentNotes={contentNotes}
                setContentNotes={setContentNotes}
              />
            </div>

            <p className="mt-9 border-l-2 border-amber/25 pl-3.5 font-body text-[12px] leading-relaxed text-text-secondary">
              Writing opens once a collaborator accepts. Until then, the workshop is where you plan, post the call, and talk it through.
            </p>

            <div className="mt-5 flex items-center gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-md bg-amber px-7 py-3 font-body text-[13px] font-semibold text-void transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void" />
                ) : (
                  <SubmitArrow />
                )}
                {isSubmitting ? "Opening…" : "Open the workshop"}
              </button>
              <button
                type="button"
                onClick={onBack}
                className="cursor-pointer font-body text-[13px] text-text-ghost transition-colors hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* what collaborators see */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              What collaborators see
            </p>
            <div className="rounded-2xl border border-border bg-elevated/80 p-4 shadow-elevated backdrop-blur-xl">
              <div className="flex justify-center pb-4 pt-1">
                <ReshapingBook
                  format={format}
                  title={title}
                  modeImage={modeData.image}
                  coverPreview={coverPreview}
                  setCoverPreview={setCoverPreview}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  handleCoverFile={handleCoverFile}
                  coverInputRef={coverInputRef}
                  scale={0.6}
                />
              </div>

              <h3 className="font-display text-[20px] leading-tight text-paper">{title.trim() || "Untitled collaboration"}</h3>
              <p className="mt-2 font-body text-[12.5px] leading-relaxed text-text-secondary">{pitchExcerpt}</p>

              <AnimatePresence>
                {seekingRoles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">seeking</p>
                    <div className="flex flex-wrap gap-1.5">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {seekingRoles.map((id) => {
                          const role = COOP_ROLES.find((r) => r.id === id);
                          const st = ROLE_STYLE[id];
                          return (
                            <motion.span
                              key={id}
                              layout
                              initial={{ opacity: 0, x: -18, scale: 0.6 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.6 }}
                              transition={{ type: "spring", stiffness: 420, damping: 26 }}
                              className={`rounded-full border px-2 py-0.5 font-body text-[10px] ${st.chip}`}
                            >
                              {role?.label}
                            </motion.span>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {selectedGenres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedGenres.slice(0, 4).map((g) => (
                    <span key={g} className="rounded-full border border-border bg-surface/50 px-2 py-0.5 font-body text-[10px] text-text-secondary">{g}</span>
                  ))}
                </div>
              )}

              {contentRating && contentRating !== "everyone" && (
                <p className="mt-3 border-t border-border pt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">
                  {ratingLabel}
                  {contentNotes.slice(0, 3).map((n) => ` · ${n.toLowerCase()}`).join("")}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </DraftShell>
  );
}
