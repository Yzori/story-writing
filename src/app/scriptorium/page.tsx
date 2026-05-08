"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

// ── Types ──

interface Artisan {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Offering {
  id: string;
  craft: CraftType;
  title: string;
  description: string;
  priceMin: number;
  priceMax: number;
  deliveryDays: number;
  revisionRounds: number;
  completedCount: number;
  portfolioUrls: string[];
  artisan: Artisan;
}

interface UserStory {
  id: string;
  title: string;
}

type CraftType =
  | "custom-chapter"
  | "cover-art"
  | "character-art"
  | "editing"
  | "poetry"
  | "worldbuilding"
  | "gm-for-hire"
  | "webtoon-panels"
  | "screenplay-coverage"
  | "scene-illustration"
  | "ghostwriting"
  | "story-bible";

// ── Craft metadata ──

const CRAFT_GROUPS = [
  {
    label: "Writing",
    color: "text-gold",
    colorBg: "bg-gold/10",
    colorBorder: "border-gold/30",
    crafts: [
      { value: "custom-chapter" as CraftType, label: "Custom Chapter", icon: ChapterIcon },
      { value: "ghostwriting" as CraftType, label: "Ghostwriting", icon: GhostwriteIcon },
      { value: "poetry" as CraftType, label: "Poetry", icon: PoetryIcon },
      { value: "screenplay-coverage" as CraftType, label: "Screenplay Coverage", icon: ScreenplayIcon },
      { value: "editing" as CraftType, label: "Editing", icon: EditingIcon },
    ],
  },
  {
    label: "Visual",
    color: "text-amethyst",
    colorBg: "bg-amethyst/10",
    colorBorder: "border-amethyst/30",
    crafts: [
      { value: "cover-art" as CraftType, label: "Cover Art", icon: CoverArtIcon },
      { value: "character-art" as CraftType, label: "Character Art", icon: CharacterIcon },
      { value: "webtoon-panels" as CraftType, label: "Webtoon Panels", icon: WebtoonIcon },
      { value: "scene-illustration" as CraftType, label: "Scene Illustration", icon: IllustrationIcon },
    ],
  },
  {
    label: "Services",
    color: "text-teal",
    colorBg: "bg-teal/10",
    colorBorder: "border-teal/30",
    crafts: [
      { value: "worldbuilding" as CraftType, label: "Worldbuilding", icon: WorldbuildIcon },
      { value: "gm-for-hire" as CraftType, label: "GM for Hire", icon: GMIcon },
      { value: "story-bible" as CraftType, label: "Story Bible", icon: BibleIcon },
    ],
  },
];

const CRAFT_COLOR_MAP: Record<CraftType, { text: string; bg: string; border: string }> = {
  "custom-chapter": { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  ghostwriting: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  poetry: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  "screenplay-coverage": { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  editing: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  "cover-art": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  "character-art": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  "webtoon-panels": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  "scene-illustration": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  worldbuilding: { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30" },
  "gm-for-hire": { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30" },
  "story-bible": { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30" },
};

function craftLabel(craft: CraftType): string {
  const all = CRAFT_GROUPS.flatMap((g) => g.crafts);
  return all.find((c) => c.value === craft)?.label ?? craft;
}

// ── SVG Icons ──

function ChapterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2h5v12H2z" />
      <path d="M7 3h5v12H7z" />
      <path d="M12 1h2v12h-2z" />
    </svg>
  );
}

function GhostwriteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2C5 2 3 5 3 8v4l2-1 1.5 2L8 12l1.5 1L11 11l2 1V8c0-3-2-6-5-6z" />
      <circle cx="6" cy="7" r="0.8" fill="currentColor" />
      <circle cx="10" cy="7" r="0.8" fill="currentColor" />
    </svg>
  );
}

function PoetryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3h10M3 6h7M3 9h9M3 12h5" />
    </svg>
  );
}

function ScreenplayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="1" width="12" height="14" rx="1" />
      <path d="M5 5h6M5 8h4M5 11h5" />
    </svg>
  );
}

function EditingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11 2l3 3-9 9H2v-3z" />
      <path d="M9 4l3 3" />
    </svg>
  );
}

function CoverArtIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="1" width="12" height="14" rx="2" />
      <path d="M2 10l4-3 3 2 3-4 2 3" />
      <circle cx="5.5" cy="5" r="1.5" />
    </svg>
  );
}

function CharacterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5" r="3" />
      <path d="M3 14c0-3 2-5 5-5s5 2 5 5" />
    </svg>
  );
}

function WebtoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="1" width="10" height="4" rx="1" />
      <rect x="3" y="6" width="10" height="4" rx="1" />
      <rect x="3" y="11" width="10" height="4" rx="1" />
    </svg>
  );
}

function IllustrationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2" width="14" height="12" rx="2" />
      <path d="M1 11l4-4 3 3 2-2 5 5" />
    </svg>
  );
}

function WorldbuildIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <ellipse cx="8" cy="8" rx="3" ry="6" />
      <path d="M2 8h12" />
    </svg>
  );
}

function GMIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12l2-4 3 2 3-6 2 8" />
      <circle cx="8" cy="3" r="1.5" />
    </svg>
  );
}

function BibleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 3l6 2.5L14 3v9l-6 2.5L2 12V3z" />
      <path d="M8 5.5V14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8l3 3 7-7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8a6 6 0 0111-3M14 8a6 6 0 01-11 3" />
      <path d="M13 2v4h-4M3 14v-4h4" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2c0 0-5 5.5-5 9a5 5 0 0010 0c0-3.5-5-9-5-9z" />
    </svg>
  );
}

// ── Ambient particles ──

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const PARTICLE_SEED = seededRandom(777);
const INK_MOTES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: PARTICLE_SEED() * 100,
  startY: 15 + PARTICLE_SEED() * 70,
  size: 1 + PARTICLE_SEED() * 2,
  duration: 12 + PARTICLE_SEED() * 18,
  delay: PARTICLE_SEED() * 10,
  drift: (PARTICLE_SEED() - 0.5) * 25,
  opacity: 0.08 + PARTICLE_SEED() * 0.18,
}));

function InkMotes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {INK_MOTES.map((m) => (
        <motion.div
          key={m.id}
          className="absolute rounded-full bg-gold"
          style={{
            width: m.size,
            height: m.size,
            left: `${m.x}%`,
            filter: m.size > 2 ? "blur(0.5px)" : "none",
          }}
          initial={{ y: `${m.startY}vh`, opacity: 0 }}
          animate={{
            y: `${m.startY - 25}vh`,
            x: [0, m.drift, 0],
            opacity: [0, m.opacity, 0],
          }}
          transition={{
            duration: m.duration,
            repeat: Infinity,
            delay: m.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Skeleton card ──

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-ink/50 p-6 animate-pulse">
      <div className="h-5 w-24 rounded bg-surface mb-4" />
      <div className="h-6 w-3/4 rounded bg-surface mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-2/3 rounded bg-surface" />
      </div>
      <div className="flex gap-4 mb-4">
        <div className="h-4 w-20 rounded bg-surface" />
        <div className="h-4 w-16 rounded bg-surface" />
        <div className="h-4 w-18 rounded bg-surface" />
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <div className="w-8 h-8 rounded-full bg-surface" />
        <div className="h-4 w-24 rounded bg-surface" />
      </div>
    </div>
  );
}

// ── Commission request modal ──

function CommissionModal({
  offering,
  onClose,
}: {
  offering: Offering;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [brief, setBrief] = useState("");
  const [storyId, setStoryId] = useState("");
  const [stories, setStories] = useState<UserStory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/stories?mine=true&limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.stories) setStories(data.stories);
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit() {
    if (brief.length < 20) {
      setError("Your brief must be at least 20 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, string> = { offeringId: offering.id, brief };
      if (storyId) body.storyId = storyId;
      const res = await fetch("/api/scriptorium/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to submit commission request.");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-void/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <motion.div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl rounded-b-none sm:rounded-b-xl border border-border bg-ink p-5 sm:p-6 shadow-2xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
      >
        {success ? (
          <div className="text-center py-8">
            <motion.div
              className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <svg width="28" height="28" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold">
                <path d="M3 8l3 3 7-7" />
              </svg>
            </motion.div>
            <h3 className="font-display text-lg text-paper mb-2">Request Sent</h3>
            <p className="text-text-secondary text-sm mb-6">
              The artisan will review your brief and respond soon.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="font-display text-lg text-paper mb-1">{offering.title}</h3>
              <p className="text-text-secondary text-sm">
                Commission from {offering.artisan.displayName}
              </p>
            </div>

            <div className="mb-4">
              <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
                Your Brief
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                maxLength={3000}
                rows={6}
                placeholder="Describe what you need -- the more detail you provide, the better the artisan can serve your vision..."
                className="w-full rounded-lg border border-border bg-surface/50 px-4 py-3 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 resize-none transition-colors"
              />
              <div className="flex justify-between mt-1.5">
                {brief.length < 20 && brief.length > 0 && (
                  <span className="text-ruby text-xs">At least 20 characters required</span>
                )}
                <span className="text-text-ghost text-xs ml-auto">{brief.length} / 3000</span>
              </div>
            </div>

            {stories.length > 0 && (
              <div className="mb-5">
                <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
                  Link to a Story (optional)
                </label>
                <select
                  value={storyId}
                  onChange={(e) => setStoryId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
                >
                  <option value="">None</option>
                  {stories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <motion.p
                className="text-ruby text-sm mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-text-secondary hover:text-text text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || brief.length < 20}
                className="px-5 py-2 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <motion.span
                      className="inline-block w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Sending...
                  </>
                ) : (
                  "Send Request"
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Main page ──

const PAGE_LIMIT = 20;

export default function ScriptoriumPage() {
  const { data: session } = useSession();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCraft, setActiveCraft] = useState<CraftType | null>(null);
  const [modalOffering, setModalOffering] = useState<Offering | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchOfferings = useCallback(
    async (craft: CraftType | null, offset: number, append: boolean) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({ limit: String(PAGE_LIMIT), offset: String(offset) });
        if (craft) params.set("craft", craft);
        const res = await fetch(`/api/scriptorium/offerings?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setOfferings((prev) => (append ? [...prev, ...data.offerings] : data.offerings));
        setTotal(data.total);
      } catch {
        if (!append) setOfferings([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchOfferings(activeCraft, 0, false);
  }, [activeCraft, fetchOfferings]);

  function handleCraftFilter(craft: CraftType | null) {
    setActiveCraft(craft);
  }

  function handleLoadMore() {
    fetchOfferings(activeCraft, offerings.length, true);
  }

  const hasMore = offerings.length < total;

  return (
    <div className="relative min-h-screen">
      <InkMotes />

      {/* ── Header ── */}
      <div className="relative px-4 pt-12 pb-8 md:pt-16 md:pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-paper mb-3 tracking-tight">
            The Scriptorium
          </h1>
          <p className="text-text-secondary text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Commission original work from fellow storytellers
          </p>
          {session && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link
                href="/scriptorium/offerings"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gold/25 bg-gold/10 text-gold text-[13px] font-medium hover:bg-gold/20 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 3v10M3 8h10" />
                </svg>
                My Offerings
              </Link>
            </div>
          )}
        </motion.div>

        {/* Decorative rule */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-border" />
          <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-border" />
        </div>
      </div>

      {/* ── Craft filter bar ── */}
      <div className="px-4 pb-8 max-w-6xl mx-auto">
        <motion.div
          ref={filterRef}
          className="overflow-x-auto scrollbar-hide pb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* All button */}
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() => handleCraftFilter(null)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                activeCraft === null
                  ? "bg-gold/15 text-gold border-gold/40 shadow-[0_0_12px_rgba(200,150,60,0.1)]"
                  : "bg-transparent text-text-secondary border-border hover:text-text hover:border-text-ghost"
              }`}
            >
              All Crafts
            </button>
          </div>

          {CRAFT_GROUPS.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <span className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-2">
                {group.crafts.map((craft) => {
                  const isActive = activeCraft === craft.value;
                  const Icon = craft.icon;
                  return (
                    <button
                      key={craft.value}
                      onClick={() => handleCraftFilter(craft.value)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                        isActive
                          ? `${group.colorBg} ${group.color} ${group.colorBorder} shadow-sm`
                          : "bg-transparent text-text-secondary border-border hover:text-text hover:border-text-ghost"
                      }`}
                    >
                      <span className={isActive ? group.color : "text-text-ghost"}>
                        <Icon />
                      </span>
                      {craft.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Offerings grid ── */}
      <div className="px-4 pb-20 max-w-6xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : offerings.length === 0 ? (
          /* ── Empty state ── */
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-20 h-20 rounded-full bg-ink/50 border border-border flex items-center justify-center mx-auto mb-5">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-ghost">
                <path d="M2 3l6 2.5L14 3v9l-6 2.5L2 12V3z" />
                <path d="M8 5.5V14" />
              </svg>
            </div>
            <h3 className="font-display text-xl text-paper mb-2">
              No offerings yet
            </h3>
            <p className="text-text-secondary text-sm max-w-sm mx-auto leading-relaxed">
              The desks of the Scriptorium sit empty for now. Artisans will soon
              hang their shingles and offer their craft to the guild.
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04 } },
              }}
            >
              {offerings.map((offering) => {
                const colors = CRAFT_COLOR_MAP[offering.craft];
                return (
                  <motion.div
                    key={offering.id}
                    className="rounded-xl border border-border bg-ink/50 p-6 flex flex-col hover:border-text-ghost/30 transition-colors group"
                    variants={{
                      hidden: { opacity: 0, y: 14 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.35 }}
                  >
                    {/* Craft badge + trust badge */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold border ${colors.text} ${colors.bg} ${colors.border}`}
                      >
                        {craftLabel(offering.craft)}
                      </span>
                      {offering.completedCount >= 10 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gold/10 text-gold border border-gold/25">
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" stroke="none">
                            <path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12.2 3.7 14.5l.8-4.8L1 6.3l4.8-.8z" />
                          </svg>
                          Master Artisan
                        </span>
                      ) : offering.completedCount >= 5 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber/8 text-amber border border-amber/20">
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" stroke="none">
                            <path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12.2 3.7 14.5l.8-4.8L1 6.3l4.8-.8z" />
                          </svg>
                          Trusted Artisan
                        </span>
                      ) : null}
                    </div>

                    {/* Title */}
                    <h3 className="font-display text-paper text-base mb-2 leading-snug">
                      {offering.title}
                    </h3>

                    {/* Description */}
                    <p className="text-text-secondary text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
                      {offering.description}
                    </p>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-ghost mb-4">
                      <span className="inline-flex items-center gap-1">
                        <DropIcon />
                        <span className="text-text-secondary">
                          {offering.priceMin === offering.priceMax
                            ? `${offering.priceMin} drops`
                            : `${offering.priceMin} -- ${offering.priceMax} drops`}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon />
                        <span className="text-text-secondary">~{offering.deliveryDays} days</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <RefreshIcon />
                        <span className="text-text-secondary">{offering.revisionRounds} rounds</span>
                      </span>
                      {offering.completedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-sage">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 8l3 3 7-7" />
                          </svg>
                          <span className="font-medium">{offering.completedCount} completed</span>
                        </span>
                      )}
                    </div>

                    {/* Artisan + CTA */}
                    <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {offering.artisan.avatarUrl ? (
                          <Image
                            src={offering.artisan.avatarUrl}
                            alt={offering.artisan.displayName}
                            width={28}
                            height={28}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-text-ghost text-xs font-medium">
                            {offering.artisan.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-text truncate">
                          {offering.artisan.displayName}
                        </span>
                      </div>

                      <button
                        onClick={() => setModalOffering(offering)}
                        className="shrink-0 px-3.5 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/30 text-xs font-medium hover:bg-gold/20 transition-colors"
                      >
                        Request Commission
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-lg bg-ink/50 border border-border text-text-secondary text-sm font-medium hover:text-text hover:border-text-ghost transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <motion.span
                        className="inline-block w-3.5 h-3.5 border-2 border-text-ghost/30 border-t-text-secondary rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Commission modal ── */}
      <AnimatePresence>
        {modalOffering && (
          <CommissionModal
            offering={modalOffering}
            onClose={() => setModalOffering(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
