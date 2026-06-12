"use client";

/**
 * The Counter — publishing as a place.
 *
 * Final desk-object conversion. Publishing was smeared across three
 * surfaces (the per-chapter publish dialog, the monetization panel,
 * the gating settings bolted onto story details); the counter is the
 * story's back office in one room: visibility at the top, the ledger
 * of chapters with their gates and live states, the gate settings,
 * and a quiet income strip at the bottom. Esc walks back to the desk.
 *
 * Publishing a chapter hands off to the existing publish dialog
 * (flush-then-PATCH, follower notify, share link) — that ceremony is
 * good; it just deserved a better doorway.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { TIER_PRICES } from "@/lib/constants";

type MonetizationModel = "free" | "freemium" | "gated";
type GatingTier = "standard" | "extended" | "premium";

interface CounterChapter {
  id: string;
  title: string;
  wordCount: number;
  status: "draft" | "published";
}

interface PublishCounterProps {
  storyId: string;
  storyTitle: string;
  storySlug: string | null;
  isPublic: boolean;
  chapters: CounterChapter[];
  unit: { singular: string; plural: string };
  onTogglePublic: () => void;
  onPublishChapter: (id: string, title: string) => void;
  onUnpublishChapter: (id: string) => void;
  /** True while the publish dialog floats above the counter — Esc then belongs to the dialog. */
  holdEsc: boolean;
  onBack: () => void;
}

const MODELS: Array<{ value: MonetizationModel; label: string; hint: string }> = [
  { value: "free", label: "Free", hint: "Every chapter free to read" },
  { value: "freemium", label: "Freemium", hint: "First chapters free, the rest unlock" },
  { value: "gated", label: "Gated", hint: "Every chapter unlocks with drops" },
];

const TIERS: Array<{ value: GatingTier; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "extended", label: "Extended" },
  { value: "premium", label: "Premium" },
];

interface GateConfig {
  monetizationModel: MonetizationModel;
  freeChapterCount: number;
  defaultGatingTier: GatingTier;
}

export default function PublishCounter({
  storyId,
  storyTitle,
  storySlug,
  isPublic,
  chapters,
  unit,
  onTogglePublic,
  onPublishChapter,
  onUnpublishChapter,
  holdEsc,
  onBack,
}: PublishCounterProps) {
  const [gate, setGate] = useState<GateConfig>({
    monetizationModel: "free",
    freeChapterCount: 5,
    defaultGatingTier: "standard",
  });
  const [gateDirty, setGateDirty] = useState(false);
  const [gateSaving, setGateSaving] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [earned, setEarned] = useState(0);
  const [circle, setCircle] = useState<{
    isActive: boolean;
    subscriberCount: number;
    monthlyIncome: number;
  } | null>(null);
  const [takeDownId, setTakeDownId] = useState<string | null>(null);

  // Load gate config + income facts
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/stories/${storyId}/monetization`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/creator/circle`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([mon, cir]) => {
        if (cancelled) return;
        if (mon) {
          setGate({
            monetizationModel: mon.monetizationModel ?? "free",
            freeChapterCount: mon.freeChapterCount ?? 5,
            defaultGatingTier: mon.defaultGatingTier ?? "standard",
          });
          setEarned(mon.stats?.creatorRevenue ?? 0);
        }
        if (cir?.circle) {
          setCircle({
            isActive: !!cir.circle.isActive,
            subscriberCount: Number(cir.subscriberCount ?? 0),
            monthlyIncome: Number(cir.monthlyIncome ?? 0),
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  // Esc walks back to the desk — unless the publish dialog is open
  // above the counter, in which case Esc is the dialog's to handle.
  useEffect(() => {
    if (holdEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onBack();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [holdEsc, onBack]);

  const updateGate = (partial: Partial<GateConfig>) => {
    setGate((prev) => ({ ...prev, ...partial }));
    setGateDirty(true);
    setGateError(null);
  };

  const saveGate = useCallback(async () => {
    setGateSaving(true);
    setGateError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/monetization`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gate),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error?.message ?? (typeof data?.error === "string" ? data.error : "Couldn't save the gate settings")
        );
      }
      setGateDirty(false);
    } catch (err) {
      setGateError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setGateSaving(false);
    }
  }, [storyId, gate]);

  // What a reader pays for chapter #i under the current settings.
  const gateFor = (index: number): string => {
    if (gate.monetizationModel === "free") return "Free";
    if (gate.monetizationModel === "freemium" && index < gate.freeChapterCount) return "Free";
    return `${TIER_PRICES[gate.defaultGatingTier] ?? 15} drops`;
  };

  const liveCount = chapters.filter((c) => c.status === "published").length;

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col bg-void"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      role="dialog"
      aria-modal="true"
      aria-label="Publishing — the counter"
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
        <p className="text-[11px] uppercase tracking-[0.2em] text-text-ghost">
          The Counter
          <span className="ml-2 normal-case tracking-normal text-text-ghost/70">{storyTitle}</span>
        </p>
        <div className="w-24" aria-hidden />
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-8 py-10">
          {/* ── visibility ── */}
          <section className="flex items-center justify-between gap-6 rounded-2xl border border-border bg-ink/50 px-6 py-5">
            <div className="flex items-center gap-4">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  isPublic ? "bg-sage shadow-[0_0_12px_rgba(120,160,120,0.7)]" : "bg-text-ghost/40"
                }`}
                aria-hidden
              />
              <div>
                <p className="text-[15px] font-medium text-paper">
                  {isPublic ? "This story is public" : "This story is private"}
                </p>
                <p className="mt-0.5 text-[12px] text-text-ghost">
                  {isPublic
                    ? "Readers can find it in the stacks. Published chapters are live."
                    : "Only you and collaborators can see it. Publish chapters now — they go live the moment you open the doors."}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {isPublic && storySlug && (
                <Link
                  href={`/story/${storySlug}`}
                  className="text-[12px] text-text-secondary transition-colors hover:text-amber"
                >
                  View story page →
                </Link>
              )}
              <button
                type="button"
                onClick={onTogglePublic}
                className={`rounded-lg border px-3.5 py-2 text-[12px] transition-colors ${
                  isPublic
                    ? "border-border text-text-secondary hover:border-rose/30 hover:text-rose"
                    : "border-sage/30 bg-sage/[0.06] text-sage hover:bg-sage/10"
                }`}
              >
                {isPublic ? "Make private" : "Open the doors"}
              </button>
            </div>
          </section>

          {/* ── the ledger ── */}
          <section className="mt-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                The ledger
              </h2>
              <p className="font-mono text-[11px] text-text-ghost">
                {liveCount}/{chapters.length} live
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border">
              {chapters.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-4 px-5 py-3.5 ${
                    i > 0 ? "border-t border-border/60" : ""
                  } ${c.status === "published" ? "" : "bg-ink/30"}`}
                >
                  <span className="w-6 shrink-0 font-mono text-[10px] text-text-ghost">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-paper">
                    {c.title || "Untitled"}
                  </span>
                  <span className="hidden w-20 shrink-0 text-right font-mono text-[10px] text-text-ghost sm:block">
                    {formatNumber(c.wordCount)} w
                  </span>
                  <span
                    className={`w-16 shrink-0 text-right font-mono text-[10px] ${
                      gateFor(i) === "Free" ? "text-text-ghost" : "text-amber/90"
                    }`}
                  >
                    {gateFor(i)}
                  </span>
                  <span className="flex w-32 shrink-0 items-center justify-end">
                    {c.status === "published" ? (
                      takeDownId === c.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTakeDownId(null);
                            onUnpublishChapter(c.id);
                          }}
                          onBlur={() => setTakeDownId(null)}
                          className="rounded-lg border border-rose/30 bg-rose/[0.06] px-2.5 py-1 text-[11px] text-rose transition-colors hover:bg-rose/10"
                        >
                          Really take down?
                        </button>
                      ) : (
                        <span className="group/live flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTakeDownId(c.id)}
                            className="text-[10px] text-text-ghost/0 transition-colors hover:!text-rose group-hover/live:text-text-ghost"
                            title="Take this chapter down"
                          >
                            take down
                          </button>
                          <span className="flex items-center gap-1.5 text-[11px] text-sage">
                            <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden />
                            Live
                          </span>
                        </span>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={c.wordCount < 100}
                        onClick={() => onPublishChapter(c.id, c.title)}
                        title={
                          c.wordCount < 100
                            ? `Write at least 100 words to publish this ${unit.singular.toLowerCase()}`
                            : `Publish this ${unit.singular.toLowerCase()}`
                        }
                        className="rounded-lg border border-sage/30 px-2.5 py-1 text-[11px] text-sage transition-colors hover:bg-sage/10 disabled:cursor-not-allowed disabled:border-border disabled:text-text-ghost/50"
                      >
                        {c.wordCount < 100 ? `${c.wordCount}/100 words` : "Publish"}
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── the gate ── */}
          <section className="mt-10">
            <h2 className="mb-3 text-[10px] uppercase tracking-[0.16em] text-text-ghost">
              The gate
            </h2>
            <div className="rounded-2xl border border-border bg-ink/30 p-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => updateGate({ monetizationModel: m.value })}
                    className={`rounded-xl border px-3.5 py-3 text-left transition-all ${
                      gate.monetizationModel === m.value
                        ? "border-amber/30 bg-amber/[0.06]"
                        : "border-border hover:border-border-active"
                    }`}
                  >
                    <span
                      className={`block text-[13px] ${
                        gate.monetizationModel === m.value ? "text-amber" : "text-paper"
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-text-ghost">
                      {m.hint}
                    </span>
                  </button>
                ))}
              </div>

              {gate.monetizationModel === "freemium" && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[12px] text-text-secondary">
                    First
                  </span>
                  <div className="flex items-center rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() =>
                        updateGate({ freeChapterCount: Math.max(3, gate.freeChapterCount - 1) })
                      }
                      className="px-2.5 py-1 text-text-ghost transition-colors hover:text-paper"
                      aria-label="Fewer free chapters"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono text-[13px] text-paper">
                      {gate.freeChapterCount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateGate({ freeChapterCount: Math.min(50, gate.freeChapterCount + 1) })
                      }
                      className="px-2.5 py-1 text-text-ghost transition-colors hover:text-paper"
                      aria-label="More free chapters"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[12px] text-text-secondary">
                    {unit.plural.toLowerCase()} free, the rest gated
                    <span className="ml-1.5 text-text-ghost">(3 minimum — readers need a taste)</span>
                  </span>
                </div>
              )}

              {gate.monetizationModel !== "free" && (
                <div className="mt-4">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                    Unlock price
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TIERS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => updateGate({ defaultGatingTier: t.value })}
                        className={`rounded-lg border px-3 py-1.5 text-[12px] transition-all ${
                          gate.defaultGatingTier === t.value
                            ? "border-amber/30 bg-amber/[0.06] text-amber"
                            : "border-border text-text-ghost hover:text-text-secondary"
                        }`}
                      >
                        {t.label}
                        <span className="ml-1.5 font-mono text-[10px] opacity-70">
                          {TIER_PRICES[t.value]} drops
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
                <p className="text-[11px] text-text-ghost">
                  {!isPublic
                    ? "The gate matters once the story is public."
                    : gateDirty
                      ? "Unsaved changes."
                      : "Readers refill their well to pass the gate."}
                </p>
                <button
                  type="button"
                  onClick={() => void saveGate()}
                  disabled={!gateDirty || gateSaving}
                  className="rounded-lg border border-amber/30 bg-amber/[0.06] px-3.5 py-1.5 text-[12px] text-amber transition-colors hover:bg-amber/10 disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-text-ghost/50"
                >
                  {gateSaving ? "Saving…" : "Save the gate"}
                </button>
              </div>
              {gateError && (
                <p className="mt-2 text-[11px] text-rose">{gateError}</p>
              )}
            </div>
          </section>

          {/* ── income strip ── */}
          <section className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-ink/20 px-5 py-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                  Earned from this story
                </p>
                <p className="mt-0.5 font-mono text-[14px] text-amber">
                  {formatNumber(earned)} drops
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                  The Circle
                </p>
                <p className="mt-0.5 text-[12px] text-text-secondary">
                  {circle?.isActive
                    ? `${formatNumber(circle.subscriberCount)} confidant${circle.subscriberCount === 1 ? "" : "s"} · ~${formatNumber(circle.monthlyIncome)} drops/mo`
                    : "Not set up yet"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[12px]">
              <Link href="/creator/circle" className="text-text-secondary transition-colors hover:text-amber">
                {circle ? "Manage Circle" : "Set up Circle"} →
              </Link>
              <Link href="/creator/earnings" className="text-text-secondary transition-colors hover:text-amber">
                Earnings →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
