"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PenLine, BookOpen, Armchair, Check } from "lucide-react";
import GlossaryTerm from "@/components/shared/GlossaryTerm";

const READ_FLAG_KEY = "quiloria-firstrun-read";

type Accent = "amber" | "lavender" | "sage";

const ACTIONS: {
  id: string;
  accent: Accent;
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof PenLine;
  markRead?: boolean;
}[] = [
  {
    id: "write",
    accent: "amber",
    title: "Write your first chapter",
    description: "Open a blank page and put the first line down. No setup required.",
    href: "/create",
    cta: "start writing",
    icon: PenLine,
  },
  {
    id: "read",
    accent: "lavender",
    title: "Find your next read",
    description: "A library tuned to what you love — browse, spark, and follow along.",
    href: "/read",
    cta: "open the library",
    icon: BookOpen,
    markRead: true,
  },
  {
    id: "table",
    accent: "sage",
    title: "See a live table",
    description: "Watch a story written turn by turn — the pen passing from hand to hand.",
    href: "/adventures",
    cta: "step inside",
    icon: Armchair,
  },
];

// Tailwind needs literal class names — map accents to static strings.
const ACCENT_CLASSES: Record<Accent, { icon: string; cta: string }> = {
  amber: { icon: "text-amber", cta: "text-amber group-hover:text-gold-light" },
  lavender: { icon: "text-lavender", cta: "text-lavender group-hover:text-paper" },
  sage: { icon: "text-sage", cta: "text-sage group-hover:text-paper" },
};

interface ChecklistItem {
  label: string;
  done: boolean;
}

// The first night in the studio — set in the page's own grammar: typography
// and hairlines of light, never a card inside a card. (The boxed onboarding
// panel died with the banner dashboard; see page.tsx header note.)
export default function FirstRunPanel({
  firstName,
  onDismiss,
}: {
  firstName?: string;
  onDismiss: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [preferencesError, setPreferencesError] = useState(false);
  // Local "opened a story to read" flag — read lazily so it's SSR-safe and
  // doesn't trip the no-setState-in-effect rule.
  const [openedAStory] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(READ_FLAG_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Pull onboarding state (reading taste) so the checklist reflects real
  // progress without needing a new column.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) setOnboarded(!!json?.data?.onboardedAt);
      })
      .catch(() => {
        if (!cancelled) {
          setPreferencesError(true);
          setOnboarded(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMarkRead = () => {
    try {
      localStorage.setItem(READ_FLAG_KEY, "1");
    } catch {}
  };

  const checklist: ChecklistItem[] = [
    { label: "Set your reading taste", done: !!onboarded },
    { label: "Start your first story", done: false },
    { label: "Open a story to read", done: openedAStory },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : undefined}
      className="relative"
    >
      {/* eyebrow + hairline, in the section grammar of the page below */}
      <div className="flex items-baseline gap-3">
        <p className="font-body text-[10px] uppercase tracking-[0.32em] text-amber/80">Getting started</p>
        <span aria-hidden className="h-px flex-1 self-center bg-gradient-to-r from-amber/25 to-transparent" />
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss getting started"
          className="text-[10px] uppercase tracking-[0.16em] text-text-ghost transition-colors hover:text-paper"
        >
          dismiss ×
        </button>
      </div>

      <h2 className="mt-6 max-w-2xl font-display text-3xl leading-tight text-paper md:text-4xl">
        Welcome{firstName ? `, ${firstName}` : ""}. Here&apos;s where to begin.
      </h2>
      <p className="mt-3 max-w-xl font-reading text-[15px] italic leading-relaxed text-text-secondary">
        Three ways in. Pick one — you can always wander to the others later.
      </p>

      {/* three doors — columns of type separated by hairlines, no cards */}
      <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const classes = ACCENT_CLASSES[action.accent];
          return (
            <Link
              key={action.id}
              href={action.href}
              onClick={action.markRead ? handleMarkRead : undefined}
              className="group flex flex-col sm:px-7 sm:first:pl-0 sm:last:pr-0"
            >
              <Icon size={18} strokeWidth={1.5} className={classes.icon} aria-hidden />
              <h3 className="mt-3 font-display text-lg text-paper">{action.title}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-text-secondary">{action.description}</p>
              <span className={`mt-4 font-display text-[15px] italic transition-colors ${classes.cta}`}>
                {action.cta}
                <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* first steps — one engraved row beneath a hairline, not a card */}
      <div className="mt-10 border-t border-border pt-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-text-ghost">
            First steps · {doneCount}/{checklist.length}
          </p>
          {checklist.map((item) => (
            <span key={item.label} className="flex items-center gap-2">
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                  item.done ? "border-sage/50 bg-sage/15 text-sage" : "border-border text-transparent"
                }`}
                aria-hidden
              >
                <Check size={10} />
              </span>
              <span className={`text-[13px] ${item.done ? "text-text-ghost line-through" : "text-text-secondary"}`}>
                {item.label}
              </span>
            </span>
          ))}
        </div>
        {preferencesError && (
          <p className="mt-3 text-[11px] text-text-ghost">Couldn&apos;t check reading taste yet.</p>
        )}
      </div>

      {/* New-word legend — defines the vocabulary the doors above just used.
          Lives outside the clickable links so the tooltip buttons are valid. */}
      <p className="mt-6 text-[12px] leading-relaxed text-text-ghost">
        New here? A{" "}
        <GlossaryTerm id="spark" className="text-text-secondary" /> shows a story moved you, a{" "}
        <GlossaryTerm id="liveTable" className="text-text-secondary" /> is an Adventure played
        turn by turn, and a{" "}
        <GlossaryTerm id="coOp" className="text-text-secondary" /> story is written with others.
      </p>
    </motion.div>
  );
}
