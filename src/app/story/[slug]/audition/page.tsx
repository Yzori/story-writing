"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import type { ApiStoryData } from "@/types/api";

// ─── Archetypes ──────────────────────────────────────────────────────────────

const CHARACTER_PORTRAIT_MAX_BYTES = 180_000;
const CHARACTER_PORTRAIT_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ARCHETYPES = [
  { id: "catalyst", label: "Catalyst", hint: "Starts scenes, asks dangerous questions, makes things happen." },
  { id: "anchor", label: "Anchor", hint: "Gives the group loyalty, warmth, or moral gravity." },
  { id: "wildcard", label: "Wildcard", hint: "Brings surprise, mischief, or unstable choices." },
  { id: "seeker", label: "Seeker", hint: "Chases clues, truths, mysteries, and hidden meanings." },
  { id: "shield", label: "Shield", hint: "Protects others, absorbs pressure, stands in the doorway." },
  { id: "tempter", label: "Tempter", hint: "Offers shortcuts, bargains, beauty, or bad ideas." },
  { id: "outsider", label: "Outsider", hint: "Sees what everyone else has learned to ignore." },
  { id: "witness", label: "Witness", hint: "Notices, remembers, and makes quiet moments matter." },
];

const PLAYER_CADENCE_OPTIONS = [
  { label: "Occasional", value: "When I'm called", hint: "I can answer when the scene needs me." },
  { label: "Inspired", value: "When inspired", hint: "I bring strong bursts, not a clock." },
  { label: "Weekly", value: "Weekly", hint: "I can reliably post each week." },
  { label: "Twice weekly", value: "Twice a week", hint: "I like a table with momentum." },
  { label: "High activity", value: "Whenever the door opens", hint: "I am ready when the room moves." },
];

const HUES = [
  "from-amber/40 via-amber/15 to-transparent",
  "from-teal/40 to-teal/5",
  "from-sage/40 to-sage/5",
  "from-rose/40 to-rose/5",
  "from-violet/40 to-violet/5",
  "from-lavender/40 to-lavender/5",
  "from-copper/40 to-copper/5",
  "from-burnt/40 to-burnt/5",
];

function hueFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

const DEFAULT_PROMPT =
  "Write the moment we first meet your character. Where are they? What are they doing? What do they want — and what stops them from getting it?";

// ─── Voice fingerprint ───────────────────────────────────────────────────────

function analyseVoice(text: string) {
  const trimmed = text.trim();
  const words = trimmed.length ? trimmed.split(/\s+/) : [];
  const wordCount = words.length;
  const sentences = trimmed.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const sentenceCount = sentences.length || 1;
  const avgLen = wordCount / sentenceCount;
  const cadence = avgLen < 9 ? "Clipped" : avgLen < 16 ? "Measured" : "Long-breathed";

  const lower = trimmed.toLowerCase();
  const dark = (lower.match(/\b(rain|cold|blood|knife|ash|grief|silence|dark|gone|burn|smoke|shadow)\b/g) || []).length;
  const light = (lower.match(/\b(warm|gold|laugh|home|hope|sun|kind|bloom|soft|light)\b/g) || []).length;
  const mood = dark === light ? "Balanced" : dark > light ? "Shadowed" : "Lit";

  const adverbs = (lower.match(/\b\w+ly\b/g) || []).length;
  const restraint = adverbs <= 1 ? "Restrained" : adverbs <= 3 ? "Textured" : "Ornate";

  return { wordCount, cadence, mood, restraint };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CampaignCharacter {
  id: string;
  name: string;
  description?: string | null;
  userId: string;
}

interface ApplicationRecord {
  id: string;
  status: string;
  createdAt: string;
  characterName?: string | null;
  characterArchetype?: string | null;
  characterKnownFor?: string | null;
  characterPortrait?: string | null;
  playerCadence?: string | null;
  playerSpotlight?: string | null;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AuditionPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const slug = params.slug as string;

  const [story, setStory] = useState<ApiStoryData | null>(null);
  const [characters, setCharacters] = useState<CampaignCharacter[]>([]);
  const [castSealed, setCastSealed] = useState(false);
  const [existingApplication, setExistingApplication] = useState<ApplicationRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [oneLine, setOneLine] = useState("");
  const [archetype, setArchetype] = useState<string | null>(null);
  const [characterPortrait, setCharacterPortrait] = useState("");
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [glimpse, setGlimpse] = useState("");
  const [cadence, setCadence] = useState(2);
  const [spotlight, setSpotlight] = useState<"driver" | "reactor" | "fades">("reactor");
  const [proudLink, setProudLink] = useState("");

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Accordion state — which of the 4 acts is currently expanded
  const [openSection, setOpenSection] = useState<number | null>(1);
  const toggleSection = (n: number) => setOpenSection((prev) => (prev === n ? null : n));
  const advanceTo = (n: number) => setOpenSection(n);

  const voice = useMemo(() => analyseVoice(glimpse), [glimpse]);
  const archetypeData = ARCHETYPES.find((a) => a.id === archetype) ?? null;
  const ready = name.trim() && oneLine.trim() && glimpse.trim().length >= 80;

  const cadenceLabel = PLAYER_CADENCE_OPTIONS[cadence].value;
  const cadenceShort = PLAYER_CADENCE_OPTIONS[cadence].label;
  const spotlightLabel = { driver: "Drives scenes", reactor: "Shines in reactions", fades: "Fades in and out" }[spotlight];
  const requiredStepStates = [Boolean(name.trim()), Boolean(oneLine.trim()), glimpse.trim().length >= 80, true];
  const completion = requiredStepStates.filter(Boolean).length;

  // Per-section completion + collapsed summary line
  const sectionComplete: Record<number, boolean> = {
    1: Boolean(name.trim() && oneLine.trim()),
    2: glimpse.trim().length >= 80,
    3: true, // defaults exist
    4: false,
  };
  const archetypeShort = ARCHETYPES.find((a) => a.id === archetype)?.label;
  const sectionSummary: Record<number, string | null> = {
    1: name.trim() && archetypeShort ? `${name.trim()} · ${archetypeShort}` : name.trim() ? name.trim() : null,
    2: voice.wordCount > 0 ? `${voice.wordCount} words · ${voice.cadence} · ${voice.mood}` : null,
    3: `${cadenceShort} · ${spotlightLabel}`,
    4: null,
  };

  // ── Fetch story + state ─────────────────────────────────────────────────
  const currentUserId = session?.user?.id;

  function handlePortraitFile(file: File | null) {
    setPortraitError(null);
    if (!file) return;
    if (!CHARACTER_PORTRAIT_TYPES.includes(file.type)) {
      setPortraitError("Use a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > CHARACTER_PORTRAIT_MAX_BYTES) {
      setPortraitError("Keep portraits under 180KB for now.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCharacterPortrait(reader.result);
      }
    };
    reader.onerror = () => setPortraitError("Could not read that image.");
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const storyRes = await fetch(`/api/stories/by-slug/${slug}`);
        const storyJson = await storyRes.json();
        if (!storyRes.ok) {
          if (!cancelled) setLoadError(storyJson.error?.message || "Story not found");
          return;
        }
        const s: ApiStoryData = storyJson.data;
        if (cancelled) return;
        setStory(s);

        if (s.writingMode !== "campaign") {
          router.replace(`/story/${slug}`);
          return;
        }

        // Pull characters + existing application in parallel (auth-gated; ignore failures)
        const [charRes, appRes] = await Promise.all([
          fetch(`/api/stories/${s.id}/campaign/characters`).catch(() => null),
          currentUserId
            ? fetch(`/api/stories/${s.id}/campaign/applications`).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (charRes?.ok) {
          const j = await charRes.json();
          if (!cancelled) setCharacters(Array.isArray(j.data) ? j.data : []);
        } else if (charRes && charRes.status === 403) {
          if (!cancelled) setCastSealed(true);
        }
        if (appRes?.ok && currentUserId) {
          const j = await appRes.json();
          const list: Array<ApplicationRecord & { userId: string }> = Array.isArray(j.data) ? j.data : [];
          const mine = list.find((a) => a.userId === currentUserId);
          if (mine && !cancelled) setExistingApplication(mine);
        }
      } catch {
        if (!cancelled) setLoadError("Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (sessionStatus !== "loading") load();
    return () => {
      cancelled = true;
    };
  }, [slug, currentUserId, sessionStatus, router]);

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!story || !ready || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const optionalRoleLine = archetypeData ? `**What they bring:** ${archetypeData.label} — ${archetypeData.hint}` : null;
    const pitch = [
      `**Character:** ${name.trim()}`,
      `**Known for:** ${oneLine.trim()}`,
      optionalRoleLine,
      characterPortrait ? `**Character portrait:** attached` : null,
      ``,
      `**A first glimpse**`,
      glimpse.trim(),
      ``,
      `**The Contract**`,
      `Cadence: ${cadenceLabel}`,
      `Spotlight: ${spotlightLabel}`,
      proudLink.trim() ? `Reference: ${proudLink.trim()}` : null,
    ]
      .filter((x) => x !== null)
      .join("\n")
      .slice(0, 5000);

    try {
      const res = await fetch(`/api/stories/${story.id}/campaign/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch,
          characterName: name.trim(),
          characterArchetype: archetypeData?.label ?? undefined,
          characterKnownFor: oneLine.trim(),
          characterPortrait: characterPortrait || undefined,
          firstGlimpse: glimpse.trim(),
          playerCadence: cadenceLabel,
          playerSpotlight: spotlight,
          writingSampleUrl: proudLink.trim() || undefined,
          voiceCadence: voice.cadence,
          voiceMood: voice.mood,
          voiceRestraint: voice.restraint,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message || "Failed to send join request");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong");
      setSubmitting(false);
    }
  }

  // ── Loading / Auth / Error gates ─────────────────────────────────────────

  if (loading || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !story) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-2xl text-paper mb-2">Story not found</h2>
        <p className="text-text-secondary text-[13px] mb-6">{loadError}</p>
        <Link href="/browse" className="text-amber hover:text-amber-light text-[13px]">Browse stories</Link>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <GateMessage
        title="Sign in to join"
        message="Join requests are tied to your Quiloria profile so the GM can read your other work."
        primary={{ href: `/login?from=/story/${slug}/audition`, label: "Sign in" }}
        secondary={{ href: `/story/${slug}`, label: "Back to the story" }}
      />
    );
  }

  if (story.userId === session.user.id) {
    return (
      <GateMessage
        title="You're running this one"
        message="GMs don't apply to join their own campaigns."
        primary={{ href: `/campaign/${story.id}`, label: "Open campaign" }}
        secondary={{ href: `/story/${slug}`, label: "Back to the story" }}
      />
    );
  }

  if (characters.some((c) => c.userId === session.user!.id)) {
    return (
      <GateMessage
        title="You're already in this one"
        message="Your character is at the table."
        primary={{ href: `/campaign/${story.id}`, label: "Open campaign" }}
        secondary={{ href: `/story/${slug}`, label: "Back to the story" }}
      />
    );
  }

  if (existingApplication) {
    return (
      <ApplicationStatusScreen
        application={existingApplication}
        storyTitle={story.title}
        storySlug={slug}
        storyId={story.id}
        gmName={story.author?.displayName || "The Storyteller"}
      />
    );
  }

  // ── Real data → mockup-shape data ────────────────────────────────────────

  const hook = story.hook?.trim() || story.synopsis?.trim() || "A new chapter waits, and a chair is open.";
  const gmName = story.author?.displayName || "The Storyteller";
  const tone = (story.genres || []).slice(0, 5);
  const seatTotal = story.campaignSeats || Math.max(5, characters.length + 2);
  const seatTaken = characters.length;
  const emptyCount = Math.max(0, seatTotal - seatTaken);
  const auditionPrompt = story.campaignAuditionPrompt?.trim() || DEFAULT_PROMPT;
  const tableCadence = story.campaignCadence?.trim() || "Cadence set by the GM";

  // ── Full-page submitted state ────────────────────────────────────────────

  if (submitted) {
    return <SubmittedState storyTitle={story.title} slug={slug} gmName={gmName} />;
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-void text-text">
      <section className="relative overflow-hidden border-b border-border-subtle bg-gradient-to-b from-ink via-void to-void">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.05),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col justify-center"
          >
            <div className="mb-8 inline-flex w-fit items-center gap-3 rounded-full border border-amber/20 bg-amber/[0.04] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/80">
                Open table
              </span>
            </div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.34em] text-text-ghost">
              You are stepping into
            </p>
            <h1 className="max-w-3xl font-display text-[42px] font-light leading-[0.98] text-paper sm:text-[68px] lg:text-[82px]">
              {story.title}
            </h1>
            <blockquote className="mt-7 max-w-2xl border-l border-amber/30 pl-5 font-reading text-[19px] italic leading-relaxed text-text-secondary">
              &ldquo;{hook}&rdquo;
            </blockquote>
            <div className="mt-8 flex flex-wrap gap-2">
              {tone.map((t) => (
                <span key={t} className="rounded-full border border-amber/15 bg-amber/[0.05] px-3 py-1 text-[11px] capitalize text-amber/90">
                  {t}
                </span>
              ))}
              <span className="rounded-full border border-border bg-surface/60 px-3 py-1 text-[11px] text-text-secondary">
                {seatTaken} / {seatTotal} seats filled
              </span>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#audition"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber px-6 py-3 text-[13px] font-semibold text-void shadow-lg shadow-amber/15 transition-colors hover:bg-amber-light sm:w-auto"
              >
                Start join request
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <Link href="/browse" className="w-full text-center text-[13px] text-text-ghost transition-colors hover:text-text-secondary sm:w-auto">
                Browse other stories
              </Link>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="self-center rounded-2xl border border-border bg-surface/72 p-5 shadow-2xl shadow-void/40 backdrop-blur"
          >
            <div className="flex items-start gap-4 border-b border-border-subtle pb-5">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber/25 bg-amber/[0.08] font-display text-xl text-amber">
                {story.author?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={story.author.avatarUrl} alt={gmName} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  gmName.charAt(0)
                )}
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">Game master</p>
                <p className="mt-1 font-display text-[18px] text-paper">{gmName}</p>
                <Link href={`/profile/${story.author?.id ?? ""}`} className="text-[12px] text-text-ghost transition-colors hover:text-amber">
                  View profile
                </Link>
              </div>
            </div>

            <div className="space-y-5 py-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">Table cadence</p>
                <p className="mt-1 text-[13px] text-text-secondary">{tableCadence}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">Current cast</p>
                {castSealed ? (
                  <p className="mt-1 font-reading text-[13px] italic text-text-ghost">Names are sealed until you&apos;re at the table.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {characters.slice(0, 4).map((c) => (
                      <div key={c.id} className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-full border border-border-subtle bg-gradient-to-br ${hueFor(c.id)}`} />
                        <span className="truncate text-[12.5px] text-text-secondary">{c.name || "Unnamed"}</span>
                      </div>
                    ))}
                    {Array.from({ length: Math.min(emptyCount, 3) }).map((_, i) => (
                      <div key={`empty-${i}`} className="flex items-center gap-2.5 text-text-ghost">
                        <div className="h-8 w-8 rounded-full border border-dashed border-amber/30" />
                        <span className="text-[12px] italic">empty chair</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <a
              href="#audition"
              className="block rounded-xl border border-border-subtle bg-ink/40 p-4 text-center transition-colors hover:border-amber/30"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">When you&apos;re ready</p>
              <p className="mt-1 font-display text-[14px] italic text-amber">{gmName} has set a scene below.</p>
            </a>
          </motion.aside>
        </div>
      </section>

      <section id="audition" className="relative overflow-hidden border-b border-border-subtle bg-void">
        {/* Progressive illumination: the room warms as the request fills. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.10),transparent_55%)]"
          animate={{ opacity: Math.min(1, completion / 4) }}
          transition={{ duration: 0.6 }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-1/2 h-[440px] w-[640px] -translate-x-1/2 rounded-full bg-amber/[0.05] blur-[140px]"
          animate={{ opacity: Math.min(1, completion / 4) * 0.9 + 0.1 }}
          transition={{ duration: 0.6 }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 pb-24 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-14">
          <div className="space-y-8">
            <header className="rounded-2xl border border-border bg-surface/50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-amber/80">Join request</p>
                  <h2 className="mt-2 font-display text-[28px] font-light text-paper sm:text-[32px]">Introduce your character.</h2>
                </div>
                <div className="rounded-full border border-border bg-ink/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                  {completion} / 4 steps ready
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {["Name", "Line", "Scene", "Play"].map((label, index) => (
                  <div key={label} className="h-1.5 overflow-hidden rounded-full bg-ink">
                    <div className={`h-full rounded-full transition-all ${requiredStepStates[index] ? "bg-amber" : "bg-border"}`} />
                  </div>
                ))}
              </div>
            </header>

            <AuditionCard
              index="I"
              title="Character Concept"
              subtitle="A name, a line, a story function."
              open={openSection === 1}
              onToggle={() => toggleSection(1)}
              complete={sectionComplete[1]}
              summary={sectionSummary[1]}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldShell label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 60))}
                    placeholder="...a name spoken in firelight"
                    className="w-full bg-transparent font-display text-[18px] text-paper outline-none placeholder:text-text-ghost/60"
                  />
                </FieldShell>
                <FieldShell label="Known for">
                  <input
                    value={oneLine}
                    onChange={(e) => setOneLine(e.target.value.slice(0, 90))}
                    placeholder="an ex-priest who still hears gods"
                    className="w-full bg-transparent font-reading text-[14px] italic text-paper outline-none placeholder:text-text-ghost/60"
                  />
                </FieldShell>
              </div>

              <div className="mt-5 rounded-2xl border border-border-subtle bg-ink/40 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber/20 bg-amber/[0.06] font-display text-2xl text-amber">
                    {characterPortrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={characterPortrait} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      (name || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-baseline gap-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-text-ghost">Character portrait</span>
                      <span className="text-[10.5px] italic text-text-ghost">Optional</span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-text-ghost">
                      A story-specific avatar for this character. It will not replace your profile image.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center rounded-full border border-amber/25 bg-amber/[0.06] px-3.5 py-1.5 text-[12px] text-amber transition-colors hover:bg-amber/15">
                        Upload image
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(event) => handlePortraitFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                      {characterPortrait && (
                        <button
                          type="button"
                          onClick={() => {
                            setCharacterPortrait("");
                            setPortraitError(null);
                          }}
                          className="rounded-full border border-border-subtle px-3.5 py-1.5 text-[12px] text-text-ghost transition-colors hover:text-text-secondary"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {portraitError && <p className="mt-2 text-[11px] text-rose">{portraitError}</p>}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-text-ghost">What they bring</span>
                  <span className="text-[10.5px] italic text-text-ghost">Optional</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ARCHETYPES.map((a) => {
                    const selected = archetype === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setArchetype(selected ? null : a.id)}
                        title={a.hint}
                        className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-all ${
                          selected
                            ? "border-amber/40 bg-amber/15 text-amber"
                            : "border-border-subtle bg-surface/40 text-text-secondary hover:border-amber/20 hover:text-paper"
                        }`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
                {archetypeData && (
                  <motion.p
                    key={archetypeData.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-[12px] italic text-text-ghost"
                  >
                    {archetypeData.hint}
                  </motion.p>
                )}
              </div>
              <ContinueButton onClick={() => advanceTo(2)} />
            </AuditionCard>

            <AuditionCard
              index="II"
              title="First Scene"
              subtitle="Answer the GM in character."
              open={openSection === 2}
              onToggle={() => toggleSection(2)}
              complete={sectionComplete[2]}
              summary={sectionSummary[2]}
            >
              <div className="mb-4 rounded-xl border border-amber/15 bg-amber/[0.04] p-4">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber/20 bg-amber/[0.08] font-display text-[12px] text-amber">
                    {gmName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber/80">GM&apos;s note</p>
                    <p className="text-[12px] text-text-ghost">{gmName}</p>
                  </div>
                </div>
                <p className="font-reading text-[14.5px] italic leading-relaxed text-text">
                  &ldquo;{auditionPrompt}&rdquo;
                </p>
              </div>

              <div className="rounded-2xl border border-border-subtle bg-ink/60 transition-colors focus-within:border-amber/30">
                <textarea
                  value={glimpse}
                  onChange={(e) => setGlimpse(e.target.value.slice(0, 1500))}
                  rows={9}
                  placeholder="Start anywhere. Mid-sentence is welcome."
                  className="w-full resize-none bg-transparent px-5 py-4 font-reading text-[15px] leading-[1.75] text-paper outline-none placeholder:text-text-ghost/50"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-5 py-3 text-[11px]">
                  <div className="flex flex-wrap items-center gap-4 text-text-ghost">
                    <FingerprintPill label="Words" value={String(voice.wordCount)} />
                    <FingerprintPill label="Cadence" value={voice.cadence} />
                    <FingerprintPill label="Mood" value={voice.mood} />
                    <FingerprintPill label="Touch" value={voice.restraint} />
                  </div>
                  <div className={voice.wordCount >= 80 ? "text-sage" : "text-text-ghost"}>
                    {voice.wordCount >= 80 ? "enough to read for voice" : `${Math.max(0, 80 - voice.wordCount)} more words`}
                  </div>
                </div>
              </div>
              <ContinueButton onClick={() => advanceTo(3)} />
            </AuditionCard>

            <AuditionCard
              index="III"
              title="Availability & Play Style"
              subtitle="How you write with other players."
              open={openSection === 3}
              onToggle={() => toggleSection(3)}
              complete={sectionComplete[3]}
              summary={sectionSummary[3]}
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] text-text-secondary">How often you can write</span>
                  <span className="text-[12px] text-amber">{cadenceLabel}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-5">
                  {PLAYER_CADENCE_OPTIONS.map((option, index) => {
                    const selected = cadence === index;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCadence(index)}
                        className={`rounded-xl border px-3 py-3 text-left transition-all ${
                          selected
                            ? "border-amber/40 bg-amber/[0.08]"
                            : "border-border-subtle bg-surface/40 hover:border-amber/20"
                        }`}
                      >
                        <div className={`text-[12px] font-medium ${selected ? "text-amber" : "text-paper"}`}>{option.label}</div>
                        <div className="mt-1 text-[10.5px] leading-snug text-text-ghost">{option.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-[12px] text-text-secondary">Where you shine</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { id: "driver", label: "I drive scenes", hint: "I'll start the trouble." },
                    { id: "reactor", label: "I shine in reactions", hint: "Throw the dice, I'll catch." },
                    { id: "fades", label: "I fade in and out", hint: "Some weeks loud, some weeks quiet." },
                  ].map((opt) => {
                    const selected = spotlight === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSpotlight(opt.id as typeof spotlight)}
                        className={`rounded-xl border px-3.5 py-3 text-left transition ${
                          selected
                            ? "border-amber/40 bg-amber/[0.08]"
                            : "border-border-subtle bg-surface/40 hover:border-amber/20"
                        }`}
                      >
                        <div className={`mb-0.5 text-[12.5px] ${selected ? "text-amber" : "text-paper"}`}>{opt.label}</div>
                        <div className="text-[10.5px] italic leading-snug text-text-ghost">{opt.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <FieldShell label="Something you've written, if you want" hint="Optional. A link to a chapter, a poem, anywhere.">
                  <input
                    value={proudLink}
                    onChange={(e) => setProudLink(e.target.value.slice(0, 500))}
                    placeholder="https://..."
                    className="w-full bg-transparent text-[13px] text-paper outline-none placeholder:text-text-ghost/60"
                  />
                </FieldShell>
              </div>
              <ContinueButton label="Review & send" onClick={() => advanceTo(4)} />
            </AuditionCard>

            <AuditionCard
              index="IV"
              title="Review & Send"
              subtitle={`Send your request to ${gmName}.`}
              open={openSection === 4}
              onToggle={() => toggleSection(4)}
              complete={sectionComplete[4]}
              summary={null}
            >
              <p className="mb-5 text-[13.5px] leading-relaxed text-text-secondary">
                {ready ? (
                  <>
                    The preview{" "}
                    <span className="hidden lg:inline">on the right</span>
                    <span className="lg:hidden">below</span>{" "}
                    is what {gmName} will receive. Revise anything above before sending.
                  </>
                ) : (
                  <>
                    {4 - completion} more {completion === 3 ? "step" : "steps"} before you can send. Name, concept line, first scene, and play style.
                  </>
                )}
              </p>

              {/* Mobile-only inline preview; the right rail is hidden on small screens. */}
              <div className="mb-5 lg:hidden">
                <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-text-ghost">GM preview</div>
                <DossierCard
                  name={name}
                  oneLine={oneLine}
                  archetype={archetypeData?.label ?? null}
                  portrait={characterPortrait || null}
                  glimpse={glimpse}
                  cadence={cadenceLabel}
                  spotlight={spotlight}
                  voice={voice}
                  ready={!!ready}
                  completion={completion}
                />
              </div>

              {submitError && (
                <p className="mb-3 text-center text-[12px] text-rose">{submitError}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!ready || submitting}
                className={`w-full rounded-full px-6 py-3.5 text-[13.5px] font-semibold transition-all ${
                  ready && !submitting
                    ? "bg-amber text-void shadow-lg shadow-amber/20 hover:bg-amber-light"
                    : "cursor-not-allowed border border-border-subtle bg-surface/60 text-text-ghost"
                }`}
              >
                {submitting ? "Sending..." : ready ? `Send to ${gmName}` : "Finish request"}
              </button>

              <p className="mt-3 text-center text-[10.5px] italic leading-relaxed text-text-ghost">
                The GM may share your request with the current cast.<br />
                Requests can&apos;t be edited or withdrawn once sent.
              </p>
            </AuditionCard>
          </div>

          <aside className="hidden self-start lg:sticky lg:top-8 lg:block">
            <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-text-ghost">GM preview</div>
            <DossierCard
              name={name}
              oneLine={oneLine}
              archetype={archetypeData?.label ?? null}
              portrait={characterPortrait || null}
              glimpse={glimpse}
              cadence={cadenceLabel}
              spotlight={spotlight}
              voice={voice}
              ready={!!ready}
              completion={completion}
            />
            <p className="mt-3 text-center text-[10.5px] italic leading-relaxed text-text-ghost">
              This is what the GM receives.
            </p>
          </aside>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-void/92 px-4 py-3 shadow-2xl shadow-void/50 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-text-ghost">
                <span>Join request</span>
                <span>{completion} / 4 ready</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink">
                <div
                  className="h-full rounded-full bg-amber transition-all"
                  style={{ width: `${(completion / 4) * 100}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => advanceTo(4)}
              className="shrink-0 rounded-full bg-amber px-4 py-2 text-[12px] font-semibold text-void transition-colors hover:bg-amber-light"
            >
              Review
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GateMessage({
  title,
  message,
  primary,
  secondary,
}: {
  title: string;
  message: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <h2 className="font-display text-2xl text-paper mb-2">{title}</h2>
      <p className="text-text-secondary text-[13px] mb-6">{message}</p>
      <div className="flex items-center justify-center gap-4">
        {primary && (
          <Link
            href={primary.href}
            className="px-5 py-2.5 bg-amber text-void font-semibold text-[13px] rounded-full hover:bg-amber-light transition-colors"
          >
            {primary.label}
          </Link>
        )}
        {secondary && (
          <Link href={secondary.href} className="text-text-secondary text-[13px] hover:text-amber transition-colors">
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}

function ApplicationStatusScreen({
  application,
  storyTitle,
  storySlug,
  storyId,
  gmName,
}: {
  application: ApplicationRecord;
  storyTitle: string;
  storySlug: string;
  storyId: string;
  gmName: string;
}) {
  const statusCopy: Record<string, {
    eyebrow: string;
    title: string;
    message: string;
    accent: string;
    next: string;
  }> = {
    pending: {
      eyebrow: "Request received",
      title: "Your join request is with the GM.",
      message: `${gmName} can now read your character preview and decide whether to bring you into the table.`,
      accent: "text-amber border-amber/25 bg-amber/[0.08]",
      next: "Waiting for GM review",
    },
    voting: {
      eyebrow: "Cast review",
      title: "Your request is being discussed.",
      message: "The current table has been invited to weigh in. You will be notified when the GM makes the call.",
      accent: "text-lavender border-lavender/25 bg-lavender/[0.08]",
      next: "Waiting for the table",
    },
    approved: {
      eyebrow: "Welcome in",
      title: "You have been accepted.",
      message: "Your character has a seat at the table. You can now open the campaign and join the story.",
      accent: "text-sage border-sage/25 bg-sage/[0.08]",
      next: "Ready to enter",
    },
    declined: {
      eyebrow: "Request closed",
      title: "This table passed for now.",
      message: "This request was not accepted. You can keep exploring other open stories when you are ready.",
      accent: "text-rose border-rose/25 bg-rose/[0.08]",
      next: "Decision made",
    },
  };
  const copy = statusCopy[application.status] ?? statusCopy.pending;
  const submitted = new Date(application.createdAt);
  const submittedLabel = Number.isNaN(submitted.getTime())
    ? "Recently"
    : submitted.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const spotlightLabel = application.playerSpotlight
    ? { driver: "Drives scenes", reactor: "Shines in reactions", fades: "Fades in and out" }[application.playerSpotlight] ?? application.playerSpotlight
    : null;
  const progress = application.status === "approved" || application.status === "declined" ? 3 : application.status === "voting" ? 2 : 1;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-void px-4 py-10 text-text sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface/75 to-ink/55 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.7)]"
      >
        <div className="relative border-b border-border-subtle px-5 py-7 sm:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.10),transparent_58%)]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className={`mb-4 inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${copy.accent}`}>
                {copy.eyebrow}
              </div>
              <h1 className="font-display text-[34px] font-light leading-tight text-paper sm:text-[46px]">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-xl font-reading text-[15px] leading-relaxed text-text-secondary">
                {copy.message}
              </p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-ink/45 p-4 sm:w-56">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">Story</p>
              <p className="mt-1 font-display text-[18px] leading-tight text-paper">{storyTitle}</p>
              <p className="mt-3 text-[12px] text-text-ghost">Sent {submittedLabel}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-border-subtle bg-ink/35 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">Where it stands</p>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${copy.accent}`}>
                  {application.status}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Sent", "Reviewed", "Decision"].map((label, index) => {
                  const complete = progress > index;
                  return (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface/35 p-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                        complete ? "border-amber/30 bg-amber/10 text-amber" : "border-border-subtle text-text-ghost"
                      }`}>
                        {complete ? (
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3.5 8.5 6.5 11.5 12.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <p className="text-[12px] text-paper">{label}</p>
                        <p className="text-[10.5px] text-text-ghost">{index === progress - 1 ? copy.next : complete ? "Complete" : "Upcoming"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(application.characterName || application.characterKnownFor || application.characterArchetype || application.characterPortrait) && (
              <div className="rounded-2xl border border-border-subtle bg-ink/35 p-4">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">Your character preview</p>
                <div className="flex items-start gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber/25 bg-amber/[0.06] font-display text-2xl text-amber">
                    {application.characterPortrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={application.characterPortrait} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      (application.characterName || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-[22px] leading-tight text-paper">
                        {application.characterName || "Unnamed"}
                      </h2>
                      {application.characterArchetype && (
                        <span className="rounded-full border border-amber/20 bg-amber/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-amber">
                          {application.characterArchetype}
                        </span>
                      )}
                    </div>
                    {application.characterKnownFor && (
                      <p className="mt-2 font-reading text-[14px] italic leading-relaxed text-text-secondary">
                        &ldquo;{application.characterKnownFor}&rdquo;
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {application.playerCadence && <Pill>{application.playerCadence}</Pill>}
                      {spotlightLabel && <Pill>{spotlightLabel}</Pill>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            {application.status === "approved" ? (
              <Link
                href={`/campaign/${storyId}`}
                className="block rounded-full bg-amber px-5 py-3 text-center text-[13px] font-semibold text-void transition-colors hover:bg-amber-light"
              >
                Open campaign
              </Link>
            ) : (
              <Link
                href={`/story/${storySlug}`}
                className="block rounded-full bg-amber px-5 py-3 text-center text-[13px] font-semibold text-void transition-colors hover:bg-amber-light"
              >
                Back to the story
              </Link>
            )}
            <Link
              href="/browse"
              className="block rounded-full border border-border-subtle px-5 py-3 text-center text-[13px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
            >
              Browse open stories
            </Link>
            <p className="px-2 text-center text-[11px] leading-relaxed text-text-ghost">
              Requests can&apos;t be edited or withdrawn once sent — the GM sees yours exactly as you wrote it.
            </p>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

function AuditionCard({
  index,
  title,
  subtitle,
  children,
  open,
  onToggle,
  complete,
  summary,
}: {
  index: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  complete: boolean;
  summary?: string | null;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.22 }}
      className={`overflow-hidden rounded-2xl border bg-surface/58 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.65)] transition-colors ${
        open ? "border-amber/25" : complete ? "border-sage/15" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface/30 sm:px-6 sm:py-5"
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-display text-[13px] italic transition-colors ${
            complete
              ? "border-sage/30 bg-sage/10 text-sage"
              : open
                ? "border-amber/30 bg-amber/[0.08] text-amber"
                : "border-border-subtle bg-ink/40 text-text-ghost"
          }`}
        >
          {complete ? (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3.5 8.5 6.5 11.5 12.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            index
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[19px] font-light text-paper sm:text-[21px]">{title}</h3>
          {open ? (
            <p className="mt-0.5 text-[12px] italic text-text-ghost">{subtitle}</p>
          ) : summary ? (
            <p className="mt-0.5 line-clamp-1 text-[12.5px] text-text-secondary">{summary}</p>
          ) : (
            <p className="mt-0.5 text-[12px] italic text-text-ghost">{subtitle}</p>
          )}
        </div>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="shrink-0 text-text-ghost"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-subtle px-5 pb-6 pt-5 sm:px-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function ContinueButton({ label = "Continue", onClick }: { label?: string; onClick: () => void }) {
  return (
    <div className="mt-6 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/[0.06] px-4 py-2 text-[12.5px] text-amber transition-colors hover:bg-amber/15"
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost mb-2">{label}</div>
      <div className="rounded-xl border border-border-subtle bg-ink/60 px-4 py-3 focus-within:border-amber/30 transition-colors">
        {children}
      </div>
      {hint && <div className="text-[10.5px] text-text-ghost/80 italic mt-1.5">{hint}</div>}
    </label>
  );
}

function FingerprintPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[9.5px] uppercase tracking-[0.14em] text-text-ghost/70">{label}</span>
      <span className="text-text-secondary text-[11.5px]">{value}</span>
    </span>
  );
}

function DossierCard({
  name,
  oneLine,
  archetype,
  portrait,
  glimpse,
  cadence,
  spotlight,
  voice,
  ready,
  completion = 0,
}: {
  name: string;
  oneLine: string;
  archetype: string | null;
  portrait: string | null;
  glimpse: string;
  cadence: string;
  spotlight: "driver" | "reactor" | "fades";
  voice: ReturnType<typeof analyseVoice>;
  ready: boolean;
  completion?: number;
}) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const spotlightLabel = {
    driver: "Drives scenes",
    reactor: "Shines in reactions",
    fades: "Fades in and out",
  }[spotlight];
  const warmth = Math.min(1, completion / 4);

  return (
    <motion.div
      animate={{
        borderColor: ready ? "rgba(251, 191, 36, 0.4)" : `rgba(251, 191, 36, ${0.08 + warmth * 0.2})`,
        boxShadow: `0 0 ${20 + warmth * 60}px ${-20 + warmth * 8}px rgba(251, 191, 36, ${0.04 + warmth * 0.18})`,
      }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl bg-gradient-to-b from-surface to-ink/80 border p-5 overflow-hidden"
    >
      <motion.div
        aria-hidden
        animate={{ opacity: 0.3 + warmth * 0.6 }}
        transition={{ duration: 0.5 }}
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/60 to-transparent"
      />

      <div className="flex items-start gap-4 mb-4">
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber/30 via-amber/10 to-transparent border border-amber/25 flex items-center justify-center text-amber font-display text-2xl shrink-0 overflow-hidden">
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost mb-1">Character Preview</div>
          <div className={`font-display text-[19px] leading-tight ${name ? "text-paper" : "text-text-ghost italic"}`}>
            {name || "Unnamed"}
          </div>
          {archetype && (
            <div className="mt-1 inline-block text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20">
              {archetype}
            </div>
          )}
        </div>
      </div>

      <p className={`font-reading italic text-[13.5px] leading-snug mb-4 ${oneLine ? "text-text-secondary" : "text-text-ghost/60"}`}>
        {oneLine ? `"${oneLine}"` : "…known for what?"}
      </p>

      <div className="border-t border-border-subtle pt-3 mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost mb-1.5">First glimpse</div>
        <p className={`font-reading text-[12.5px] leading-relaxed ${glimpse ? "text-text" : "text-text-ghost/60 italic"}`}>
          {glimpse
            ? glimpse.length > 220
              ? glimpse.slice(0, 220).trim() + "…"
              : glimpse
            : "the door opens, and…"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-subtle">
        <Pill>{cadence}</Pill>
        <Pill>{spotlightLabel}</Pill>
        {voice.wordCount > 0 && <Pill>{voice.cadence} · {voice.mood}</Pill>}
      </div>
    </motion.div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-surface/80 border border-border-subtle text-text-secondary">
      {children}
    </span>
  );
}

function SubmittedState({
  storyTitle,
  slug,
  gmName,
}: {
  storyTitle: string;
  slug: string;
  gmName: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      {/* Ambient illumination — the table has lit */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4 }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.10),transparent_60%)]"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.1 }}
        className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/[0.08] blur-[160px]"
      />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
          className="mb-6"
        >
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber/[0.12] blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-amber/30 bg-gradient-to-br from-amber/15 to-amber/[0.04] text-amber">
              {/* Wax-seal-ish flourish */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 L14 9 L20 9 L15 13 L17 19 L12 15.5 L7 19 L9 13 L4 9 L10 9 Z" />
              </svg>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-amber/80"
        >
          Request sent
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.55 }}
          className="font-display text-[40px] font-light leading-tight text-paper sm:text-[48px]"
        >
          Join request sent.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.55 }}
          className="mt-5 max-w-sm font-reading text-[15px] leading-relaxed text-text-secondary"
        >
          {gmName} will read your request from the campaign table and respond when the room is ready for you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.55 }}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface/40 px-3.5 py-1.5 text-[11.5px] text-text-ghost"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 7v6h10V7M2 5l6 4 6-4M2 5l6-3 6 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          You&apos;ll be notified when they answer
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.55 }}
          className="mt-10 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href={`/story/${slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber px-6 py-3 text-[13px] font-semibold text-void shadow-lg shadow-amber/20 transition-colors hover:bg-amber-light"
          >
            ← Back to {storyTitle}
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle bg-surface/40 px-6 py-3 text-[13px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
          >
            Browse other tables
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-10 text-[10.5px] italic text-text-ghost/80"
        >
          Requests can&apos;t be edited or withdrawn once sent.
        </motion.p>
      </div>
    </div>
  );
}
