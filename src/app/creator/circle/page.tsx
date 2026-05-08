"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Circle {
  id: string;
  creatorId: string;
  isActive: boolean;
  confidantPrice: number;
  confidantDescription: string;
  earlyAccessDays: number;
  createdAt: string;
  updatedAt: string;
}

interface Subscriber {
  id: string;
  tier: string;
  status: string;
  startedAt: string;
  renewalDate: string;
  priceAtSubscription: number;
  reader: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

type PageState = "loading" | "error" | "ready";
type WizardStep = 1 | 2 | 3 | 4;

interface WizardForm {
  price: number;
  earlyAccessDays: number;
  description: string;
}

const DEFAULT_FORM: WizardForm = {
  price: 300,
  earlyAccessDays: 3,
  description: "",
};

const PRICE_OPTIONS = [300, 400, 500, 600, 700, 800];
const EARLY_ACCESS_OPTIONS = [1, 2, 3, 5, 7];
const STEP_LABELS = ["Price", "Early Access", "Your Note", "Preview"];

const DROPS_TO_USD = 0.83 / 100;

function dropsToUsd(drops: number): string {
  return (drops * DROPS_TO_USD).toFixed(2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

// ── Icons ──────────────────────────────────────────────────────────────────────

function QuillIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return <div className={`animate-spin rounded-full border-2 border-current/30 border-t-current ${className}`} />;
}

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {STEP_LABELS.map((label, idx) => {
        const step = (idx + 1) as WizardStep;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "border-gold bg-gold/15 text-gold"
                    : isDone
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-border bg-surface text-text-ghost"
                }`}
              >
                {isDone ? <CheckIcon className="h-3.5 w-3.5" /> : step}
              </div>
              <span
                className={`font-body text-xs ${isActive ? "inline" : "hidden sm:inline"} ${
                  isActive ? "text-paper" : isDone ? "text-text-secondary" : "text-text-ghost"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div className={`h-px w-3 sm:w-6 transition-colors ${isDone ? "bg-gold/40" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step: Price ────────────────────────────────────────────────────────────────

function StepPrice({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
      <h2 className="font-display text-2xl font-semibold text-paper">Set your monthly price</h2>
      <p className="mt-2 font-body text-sm text-text-secondary">
        This is what readers pay each month to become a Confidant. You keep 70%.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PRICE_OPTIONS.map((p) => {
          const selected = p === value;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                selected
                  ? "border-gold/50 bg-gold/5 ring-1 ring-gold/30"
                  : "border-border bg-ink/40 hover:border-gold/30 hover:bg-ink/70"
              }`}
            >
              <div className="flex items-baseline gap-1">
                <span className={`font-display text-2xl font-bold ${selected ? "text-gold" : "text-paper"}`}>{p}</span>
                <span className="font-body text-xs text-text-ghost">drops</span>
              </div>
              <div className="mt-1 font-body text-[11px] text-text-ghost">
                ~${dropsToUsd(p)}/mo · keep ~{Math.round(p * 0.7)} drops
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-5 font-body text-xs text-text-ghost">
        Most creators start at 300 drops — a sweet spot that keeps the door open for new readers.
      </p>
    </motion.div>
  );
}

// ── Step: Early Access ─────────────────────────────────────────────────────────

function StepEarlyAccess({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
      <h2 className="font-display text-2xl font-semibold text-paper">How early do Confidants read?</h2>
      <p className="mt-2 font-body text-sm text-text-secondary">
        Members see new chapters this many days before they&apos;re public.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {EARLY_ACCESS_OPTIONS.map((days) => {
          const selected = days === value;
          return (
            <button
              key={days}
              type="button"
              onClick={() => onChange(days)}
              className={`rounded-xl border px-5 py-3 font-body text-sm transition-all ${
                selected
                  ? "border-gold/50 bg-gold/5 text-gold ring-1 ring-gold/30"
                  : "border-border bg-ink/40 text-text-secondary hover:border-gold/30 hover:text-paper"
              }`}
            >
              <div className="font-display text-xl font-bold">{days}d</div>
              <div className="mt-0.5 text-[11px] text-text-ghost">
                {days === 1 ? "One day" : `${days} days`} early
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-border/60 bg-ink/30 p-4">
        <p className="font-body text-xs leading-relaxed text-text-ghost">
          <span className="text-paper">Tip:</span> 3 days is the most popular window — long enough
          to feel meaningful, short enough that non-members don&apos;t fall behind.
        </p>
      </div>
    </motion.div>
  );
}

// ── Step: Note ─────────────────────────────────────────────────────────────────

function StepNote({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const near = value.length > 400;
  const over = value.length >= 500;
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
      <h2 className="font-display text-2xl font-semibold text-paper">Write a note to readers</h2>
      <p className="mt-2 font-body text-sm text-text-secondary">
        Tell them what joining your Circle means to you. This appears on your Circle card.
      </p>

      <div className="mt-6">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 500))}
          rows={5}
          placeholder="Becoming a Confidant means you believe in this story as much as I do. You'll read new chapters first, see the scraps behind the scenes, and have my gratitude on every page..."
          className={`w-full resize-none rounded-xl border bg-surface px-4 py-3 font-body text-sm leading-relaxed text-paper placeholder:text-text-ghost focus:outline-none focus:ring-1 ${
            over
              ? "border-rose/50 focus:border-rose/50 focus:ring-rose/20"
              : "border-border focus:border-gold/40 focus:ring-gold/20"
          }`}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="font-body text-[11px] text-text-ghost">Optional — you can leave this blank.</span>
          <span
            className={`font-body text-[11px] ${
              over ? "text-rose-400" : near ? "text-amber-400" : "text-text-ghost"
            }`}
          >
            {value.length}/500
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Preview Card (mirrors CircleCard reader view) ──────────────────────────────

function CirclePreviewCard({
  creatorName,
  form,
}: {
  creatorName: string;
  form: WizardForm;
}) {
  const perks = [
    `Early chapter access (${form.earlyAccessDays} day${form.earlyAccessDays > 1 ? "s" : ""} early)`,
    "Confidant badge on comments",
    "Private discussions with the creator",
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-gold/20 bg-ink/60 p-6">
      <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-b from-gold/5 to-transparent" />

      <div className="relative">
        <h3 className="font-display text-lg text-paper">Join {creatorName}&apos;s Circle</h3>

        <div className="mt-4 flex items-center gap-2">
          <QuillIcon className="h-4 w-4 text-gold" />
          <span className="font-display text-sm text-gold">Confidant</span>
        </div>

        {form.description && (
          <p className="mt-2 font-body text-sm leading-relaxed text-text-secondary">
            {form.description}
          </p>
        )}

        <div className="mt-4">
          <span className="font-display text-2xl font-semibold text-paper">{form.price}</span>
          <span className="ml-1.5 font-body text-sm text-text-ghost">drops/month</span>
          <span className="ml-2 font-body text-xs text-text-ghost">
            (~${dropsToUsd(form.price)} USD)
          </span>
        </div>

        <ul className="mt-4 space-y-2.5">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2 font-body text-sm text-text-secondary">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 w-full rounded-lg bg-gold px-4 py-2.5 text-center font-body text-sm font-medium text-void">
          Join the Circle
        </div>
      </div>
    </div>
  );
}

// ── Step: Preview ──────────────────────────────────────────────────────────────

function StepPreview({
  creatorName,
  form,
}: {
  creatorName: string;
  form: WizardForm;
}) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
      <h2 className="font-display text-2xl font-semibold text-paper">Here&apos;s how it looks</h2>
      <p className="mt-2 font-body text-sm text-text-secondary">
        This is exactly what readers will see on your story pages.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <CirclePreviewCard creatorName={creatorName} form={form} />

        <div className="rounded-xl border border-border bg-ink/40 p-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
            Your setup
          </span>
          <dl className="mt-3 space-y-3 font-body text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-text-ghost">Monthly price</dt>
              <dd className="text-paper">
                {form.price} drops <span className="text-text-ghost">(~${dropsToUsd(form.price)})</span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-text-ghost">Your share (70%)</dt>
              <dd className="text-sage">{Math.round(form.price * 0.7)} drops / sub</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-text-ghost">Early access</dt>
              <dd className="text-paper">
                {form.earlyAccessDays} day{form.earlyAccessDays > 1 ? "s" : ""}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-text-ghost">Personal note</dt>
              <dd className="text-paper">{form.description ? `${form.description.length} chars` : "None"}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="font-body text-[11px] leading-relaxed text-text-ghost">
              You can change any of these later. Existing subscribers keep the price they signed up at.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Wizard ─────────────────────────────────────────────────────────────────────

function CircleWizard({
  initial,
  creatorName,
  isEdit,
  onCancel,
  onSave,
  saving,
  saveError,
}: {
  initial: WizardForm;
  creatorName: string;
  isEdit: boolean;
  onCancel: (() => void) | null;
  onSave: (form: WizardForm) => void;
  saving: boolean;
  saveError: string | null;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<WizardForm>(initial);

  const next = () => setStep((s) => (s < 4 ? ((s + 1) as WizardStep) : s));
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s));

  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-ink/40 p-6 sm:p-8"
    >
      <StepIndicator current={step} />

      <AnimatePresence mode="wait">
        <motion.div key={step}>
          {step === 1 && (
            <StepPrice value={form.price} onChange={(price) => setForm((f) => ({ ...f, price }))} />
          )}
          {step === 2 && (
            <StepEarlyAccess
              value={form.earlyAccessDays}
              onChange={(earlyAccessDays) => setForm((f) => ({ ...f, earlyAccessDays }))}
            />
          )}
          {step === 3 && (
            <StepNote
              value={form.description}
              onChange={(description) => setForm((f) => ({ ...f, description }))}
            />
          )}
          {step === 4 && <StepPreview creatorName={creatorName} form={form} />}
        </motion.div>
      </AnimatePresence>

      {saveError && (
        <p className="mt-4 font-body text-sm text-rose-400">{saveError}</p>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-5">
        <div className="flex items-center gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-4 py-2 font-body text-sm text-text-secondary transition-colors hover:text-paper disabled:opacity-50"
            >
              <ArrowLeftIcon />
              Back
            </button>
          ) : isEdit && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-border bg-transparent px-4 py-2 font-body text-sm text-text-secondary transition-colors hover:text-paper disabled:opacity-50"
            >
              Cancel
            </button>
          ) : (
            <span />
          )}
        </div>

        {step < 4 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-5 py-2 font-body text-sm font-medium text-void transition-all hover:bg-gold/90"
          >
            Continue
            <ArrowRightIcon />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-2.5 font-body text-sm font-medium text-void transition-all hover:bg-gold/90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Spinner className="h-3.5 w-3.5 text-void" />
                {isEdit ? "Saving..." : "Activating..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Open the Circle"
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CreatorCirclePage() {
  const { data: session, status: sessionStatus } = useSession();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [circle, setCircle] = useState<Circle | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  const [isActive, setIsActive] = useState(false);
  const [editing, setEditing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const creatorName = session?.user?.name || "your";

  const fetchCircleData = useCallback(async () => {
    try {
      const [circleRes, subsRes] = await Promise.all([
        fetch("/api/creator/circle"),
        fetch("/api/creator/circle/subscribers"),
      ]);

      if (!circleRes.ok) throw new Error("Failed to load circle data");

      const circleData = await circleRes.json();
      setCircle(circleData.circle);
      setSubscriberCount(circleData.subscriberCount);
      setMonthlyIncome(circleData.monthlyIncome);

      if (circleData.circle) {
        setIsActive(circleData.circle.isActive);
      }

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubscribers(subsData.subscribers || []);
      }

      setPageState("ready");
    } catch {
      setPageState("error");
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) return;
    fetchCircleData();
  }, [session, sessionStatus, fetchCircleData]);

  const saveWizard = async (form: WizardForm) => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/creator/circle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: true,
          confidantPrice: form.price,
          confidantDescription: form.description,
          earlyAccessDays: form.earlyAccessDays,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save changes");
      }

      const data = await res.json();
      setCircle(data.circle);
      setIsActive(true);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!circle) return;
    const nextActive = !isActive;
    setIsActive(nextActive);
    try {
      const res = await fetch("/api/creator/circle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: nextActive,
          confidantPrice: circle.confidantPrice,
          confidantDescription: circle.confidantDescription,
          earlyAccessDays: circle.earlyAccessDays,
        }),
      });
      if (!res.ok) {
        setIsActive(!nextActive);
        return;
      }
      const data = await res.json();
      setCircle(data.circle);
    } catch {
      setIsActive(!nextActive);
    }
  };

  // ── Render guards ──

  if (sessionStatus === "loading" || pageState === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-gold" />
          <p className="font-body text-sm text-text-ghost">Loading your Circle...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl text-paper">Sign in to manage your Circle</p>
          <p className="mt-2 font-body text-sm text-text-secondary">
            You need to be logged in to access creator tools.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl text-paper">Something went wrong</p>
          <p className="mt-2 font-body text-sm text-text-secondary">
            We could not load your Circle data.
          </p>
          <button
            onClick={() => {
              setPageState("loading");
              fetchCircleData();
            }}
            className="mt-4 rounded-lg bg-gold/10 px-4 py-2 font-body text-sm text-gold transition-colors hover:bg-gold/20"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const creatorShare = Math.round(monthlyIncome * 0.7);
  const showWizard = !circle || editing;

  const wizardInitial: WizardForm = circle
    ? {
        price: circle.confidantPrice,
        earlyAccessDays: circle.earlyAccessDays,
        description: circle.confidantDescription || "",
      }
    : DEFAULT_FORM;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl font-bold text-paper sm:text-4xl">
          The <span className="text-gold">Circle</span>
        </h1>
        <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-text-secondary">
          Your inner circle of devoted readers. Offer them early access to new chapters,
          behind-the-scenes glimpses, and a deeper connection to your stories.
        </p>
      </motion.div>

      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mt-6 rounded-lg border border-sage/30 bg-sage/10 px-4 py-2.5 font-body text-sm text-sage"
        >
          Your Circle is live. Readers can now join from any of your story pages.
        </motion.div>
      )}

      <div className="mt-8">
        {showWizard ? (
          <CircleWizard
            initial={wizardInitial}
            creatorName={creatorName}
            isEdit={!!circle}
            onCancel={circle ? () => setEditing(false) : null}
            onSave={saveWizard}
            saving={saving}
            saveError={saveError}
          />
        ) : (
          <>
            {/* Status + Edit */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="flex flex-col gap-4 rounded-xl border border-border bg-ink/50 p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
                  <QuillIcon className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <p className="font-display text-base text-paper">
                    {isActive ? "Your Circle is open" : "Your Circle is closed"}
                  </p>
                  <p className="mt-0.5 font-body text-xs text-text-ghost">
                    {circle?.confidantPrice} drops/month · {circle?.earlyAccessDays} day
                    {(circle?.earlyAccessDays ?? 0) > 1 ? "s" : ""} early access
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleActive}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    isActive ? "bg-gold" : "bg-surface"
                  }`}
                  aria-label={isActive ? "Close Circle to new members" : "Open Circle to new members"}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform ${
                      isActive ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-border bg-transparent px-4 py-2 font-body text-sm text-text-secondary transition-colors hover:border-gold/40 hover:text-paper"
                >
                  Edit setup
                </button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              <div className="rounded-xl border border-border bg-ink/50 p-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                  Subscribers
                </span>
                <p className="mt-2 font-display text-2xl font-bold text-paper">
                  {subscriberCount}
                </p>
                <p className="mt-0.5 font-body text-xs text-text-ghost">
                  {subscriberCount === 1 ? "reader" : "readers"} in your Circle
                </p>
              </div>

              <div className="rounded-xl border border-border bg-ink/50 p-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                  Monthly Income
                </span>
                <p className="mt-2 font-display text-2xl font-bold text-gold">
                  {monthlyIncome.toLocaleString()}
                  <span className="ml-1 text-base font-normal text-text-secondary">drops</span>
                </p>
                <p className="mt-0.5 font-body text-xs text-text-ghost">
                  ~${dropsToUsd(monthlyIncome)} this month
                </p>
              </div>

              <div className="rounded-xl border border-border bg-ink/50 p-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                  Your Share
                </span>
                <p className="mt-2 font-display text-2xl font-bold text-sage">
                  {creatorShare.toLocaleString()}
                  <span className="ml-1 text-base font-normal text-text-secondary">drops</span>
                </p>
                <p className="mt-0.5 font-body text-xs text-text-ghost">
                  70% creator share (~${dropsToUsd(creatorShare)})
                </p>
              </div>
            </motion.div>

            {/* Members */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mt-6 rounded-xl border border-border bg-ink/50 p-6"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                Members
              </span>

              {subscribers.length === 0 ? (
                <div className="mt-6 pb-2 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
                    </svg>
                  </div>
                  <p className="font-body text-sm text-text-secondary">No members yet</p>
                  <p className="mt-1 font-body text-xs text-text-ghost">
                    When readers join your Circle, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {subscribers.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-4 rounded-lg bg-surface/50 px-4 py-3"
                    >
                      <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-elevated">
                        {sub.reader.avatarUrl ? (
                          <Image
                            src={sub.reader.avatarUrl}
                            alt={sub.reader.displayName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-display text-sm font-semibold text-text-ghost">
                            {sub.reader.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-medium text-paper">
                          {sub.reader.displayName}
                        </p>
                        <p className="font-body text-xs text-text-ghost">
                          Joined {formatDate(sub.startedAt)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3 shrink-0">
                        <span className="rounded-full bg-gold/10 px-2.5 py-0.5 font-body text-[11px] sm:text-xs font-medium text-gold">
                          {sub.tier === "confidant" ? "Confidant" : sub.tier}
                        </span>
                        <span className="font-body text-[10px] sm:text-xs text-text-ghost whitespace-nowrap">
                          Renews {formatDate(sub.renewalDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
