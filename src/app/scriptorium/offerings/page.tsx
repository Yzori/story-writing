"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──

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

// ── Craft metadata ──

const CRAFT_GROUPS = [
  {
    label: "Writing",
    color: "text-gold",
    colorBg: "bg-gold/10",
    colorBorder: "border-gold/30",
    crafts: [
      { value: "custom-chapter" as CraftType, label: "Custom Chapter" },
      { value: "ghostwriting" as CraftType, label: "Ghostwriting" },
      { value: "poetry" as CraftType, label: "Poetry" },
      { value: "screenplay-coverage" as CraftType, label: "Screenplay Coverage" },
      { value: "editing" as CraftType, label: "Editing" },
    ],
  },
  {
    label: "Visual",
    color: "text-amethyst",
    colorBg: "bg-amethyst/10",
    colorBorder: "border-amethyst/30",
    crafts: [
      { value: "cover-art" as CraftType, label: "Cover Art" },
      { value: "character-art" as CraftType, label: "Character Art" },
      { value: "webtoon-panels" as CraftType, label: "Webtoon Panels" },
      { value: "scene-illustration" as CraftType, label: "Scene Illustration" },
    ],
  },
  {
    label: "Services",
    color: "text-teal",
    colorBg: "bg-teal/10",
    colorBorder: "border-teal/30",
    crafts: [
      { value: "worldbuilding" as CraftType, label: "Worldbuilding" },
      { value: "gm-for-hire" as CraftType, label: "GM for Hire" },
      { value: "story-bible" as CraftType, label: "Story Bible" },
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

function DropIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2c0 0-5 5.5-5 9a5 5 0 0010 0c0-3.5-5-9-5-9z" />
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

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8l3 3 7-7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <motion.svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <path d="M4 6l4 4 4-4" />
    </motion.svg>
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
      <div className="flex gap-4">
        <div className="h-4 w-20 rounded bg-surface" />
        <div className="h-4 w-16 rounded bg-surface" />
        <div className="h-4 w-18 rounded bg-surface" />
      </div>
    </div>
  );
}

// ── Spinner ──

function Spinner({ className = "" }: { className?: string }) {
  return (
    <motion.span
      className={`inline-block w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

// ── Create Offering Form ──

interface CreateFormData {
  craft: CraftType | "";
  title: string;
  description: string;
  priceMin: string;
  priceMax: string;
  deliveryDays: string;
  revisionRounds: string;
}

const INITIAL_FORM: CreateFormData = {
  craft: "",
  title: "",
  description: "",
  priceMin: "",
  priceMax: "",
  deliveryDays: "",
  revisionRounds: "2",
};

function CreateOfferingForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<CreateFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField<K extends keyof CreateFormData>(key: K, value: CreateFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
    if (success) setSuccess(false);
  }

  function validate(): string | null {
    if (!form.craft) return "Select a craft type.";
    if (form.title.length < 5 || form.title.length > 100) return "Title must be 5-100 characters.";
    if (form.description.length < 20 || form.description.length > 2000)
      return "Description must be 20-2000 characters.";
    const min = Number(form.priceMin);
    const max = Number(form.priceMax);
    if (!min || min < 50 || min > 1500) return "Minimum price must be 50-1500 drops.";
    if (!max || max < 50 || max > 1500) return "Maximum price must be 50-1500 drops.";
    if (min > max) return "Minimum price cannot exceed maximum price.";
    const days = Number(form.deliveryDays);
    if (!days || days < 1 || days > 30) return "Delivery days must be 1-30.";
    const rounds = Number(form.revisionRounds);
    if (!rounds || rounds < 1 || rounds > 5) return "Revision rounds must be 1-5.";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/scriptorium/offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craft: form.craft,
          title: form.title.trim(),
          description: form.description.trim(),
          priceMin: Number(form.priceMin),
          priceMax: Number(form.priceMax),
          deliveryDays: Number(form.deliveryDays),
          revisionRounds: Number(form.revisionRounds),
          portfolioUrls: [],
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to create offering.");
      }

      setSuccess(true);
      setForm(INITIAL_FORM);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border border-border bg-ink/50 p-6 mb-8">
        <h3 className="font-display text-lg text-paper mb-5">New Offering</h3>

        {/* Craft selector */}
        <div className="mb-5">
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-3">
            Craft
          </label>
          <div className="space-y-3">
            {CRAFT_GROUPS.map((group) => (
              <div key={group.label}>
                <span className="text-[10px] uppercase tracking-[0.12em] text-text-ghost block mb-1.5">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {group.crafts.map((craft) => {
                    const selected = form.craft === craft.value;
                    return (
                      <button
                        key={craft.value}
                        type="button"
                        onClick={() => updateField("craft", craft.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                          selected
                            ? `${group.colorBg} ${group.color} ${group.colorBorder}`
                            : "bg-transparent text-text-secondary border-border hover:text-text hover:border-text-ghost"
                        }`}
                      >
                        {craft.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            maxLength={100}
            placeholder="A compelling name for your service..."
            className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
          />
          <span className="text-text-ghost text-xs mt-1 block text-right">{form.title.length} / 100</span>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Describe what you offer, your process, and what clients can expect..."
            className="w-full rounded-lg border border-border bg-surface/50 px-4 py-3 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 resize-none transition-colors"
          />
          <span className="text-text-ghost text-xs mt-1 block text-right">{form.description.length} / 2000</span>
        </div>

        {/* Price range + delivery + revisions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
              Min Price (drops)
            </label>
            <input
              type="number"
              value={form.priceMin}
              onChange={(e) => updateField("priceMin", e.target.value)}
              min={50}
              max={1500}
              placeholder="50"
              className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
              Max Price (drops)
            </label>
            <input
              type="number"
              value={form.priceMax}
              onChange={(e) => updateField("priceMax", e.target.value)}
              min={50}
              max={1500}
              placeholder="500"
              className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
              Delivery Days
            </label>
            <input
              type="number"
              value={form.deliveryDays}
              onChange={(e) => updateField("deliveryDays", e.target.value)}
              min={1}
              max={30}
              placeholder="7"
              className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
              Revision Rounds
            </label>
            <input
              type="number"
              value={form.revisionRounds}
              onChange={(e) => updateField("revisionRounds", e.target.value)}
              min={1}
              max={5}
              placeholder="2"
              className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
            />
          </div>
        </div>

        {/* Error / Success */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              className="text-ruby text-sm mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.p>
          )}
          {success && (
            <motion.p
              key="success"
              className="text-sage text-sm mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Offering created successfully.
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Spinner />
                Creating...
              </>
            ) : (
              "Create Offering"
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ──

export default function MyOfferingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const userId = session?.user?.id;

  const fetchMyOfferings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scriptorium/offerings?limit=100");
      if (!res.ok) throw new Error("Failed to load offerings.");
      const data = await res.json();
      const all: Offering[] = data.offerings ?? [];
      setOfferings(all.filter((o) => o.artisan.id === userId));
    } catch {
      setError("Could not load your offerings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchMyOfferings();
  }, [userId, fetchMyOfferings]);

  const myOfferings = offerings;

  // Unauthenticated state
  if (sessionStatus === "unauthenticated") {
    return (
      <div className="relative min-h-screen">
        <div className="px-4 pt-12 pb-8 md:pt-16 text-center">
          <h1 className="font-display text-3xl md:text-4xl text-paper mb-3 tracking-tight">
            My Offerings
          </h1>
          <p className="text-text-secondary text-base max-w-lg mx-auto leading-relaxed">
            Sign in to manage your Scriptorium offerings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* ── Header ── */}
      <div className="relative px-4 pt-12 pb-8 md:pt-16 md:pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-3xl md:text-4xl text-paper mb-3 tracking-tight">
            My Offerings
          </h1>
          <p className="text-text-secondary text-base max-w-lg mx-auto leading-relaxed">
            Services you offer to fellow storytellers
          </p>
        </motion.div>

        {/* Decorative rule */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-border" />
          <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-border" />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pb-20 max-w-4xl mx-auto">
        {/* Toggle create form */}
        <motion.div
          className="mb-6 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-colors text-sm font-medium"
          >
            <PlusIcon />
            Create New Offering
            <ChevronIcon open={showForm} />
          </button>
        </motion.div>

        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <CreateOfferingForm
              onCreated={() => {
                fetchMyOfferings();
                setShowForm(false);
              }}
            />
          )}
        </AnimatePresence>

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 rounded-full bg-ink/50 border border-border flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ruby">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3" />
                <circle cx="8" cy="11" r="0.5" fill="currentColor" />
              </svg>
            </div>
            <p className="text-ruby text-sm mb-4">{error}</p>
            <button
              onClick={fetchMyOfferings}
              className="px-4 py-2 rounded-lg bg-ink/50 border border-border text-text-secondary text-sm hover:text-text transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        ) : myOfferings.length === 0 ? (
          /* Empty state */
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
            <h3 className="font-display text-xl text-paper mb-2">No offerings yet</h3>
            <p className="text-text-secondary text-sm max-w-sm mx-auto leading-relaxed">
              You haven&apos;t created any offerings. Share your craft with the guild
              by creating your first service above.
            </p>
          </motion.div>
        ) : (
          /* Offerings grid */
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.04 } },
            }}
          >
            {myOfferings.map((offering) => {
              const colors = CRAFT_COLOR_MAP[offering.craft];
              return (
                <motion.div
                  key={offering.id}
                  className="rounded-xl border border-border bg-ink/50 p-6 flex flex-col"
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Craft badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold mb-3 border ${colors.text} ${colors.bg} ${colors.border}`}
                  >
                    {craftLabel(offering.craft)}
                  </span>

                  {/* Title */}
                  <h3 className="font-display text-paper text-base mb-2 leading-snug">
                    {offering.title}
                  </h3>

                  {/* Description */}
                  <p className="text-text-secondary text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
                    {offering.description}
                  </p>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-ghost">
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
                      <span className="inline-flex items-center gap-1">
                        <CheckIcon />
                        <span className="text-text-secondary">{offering.completedCount} completed</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
