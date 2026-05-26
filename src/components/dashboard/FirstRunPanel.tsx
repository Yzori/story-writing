"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PenLine, BookOpen, Dices, Check, X, Sparkles, ArrowRight } from "lucide-react";
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
    cta: "Start writing",
    icon: PenLine,
  },
  {
    id: "read",
    accent: "lavender",
    title: "Find your next read",
    description: "A library tuned to what you love — browse, spark, and follow along.",
    href: "/read",
    cta: "Open the library",
    icon: BookOpen,
    markRead: true,
  },
  {
    id: "table",
    accent: "sage",
    title: "See a live table",
    description: "Watch a story played out turn by turn — dice, maps, and all.",
    href: "/demo-adventure",
    cta: "Step inside",
    icon: Dices,
  },
];

// Tailwind needs literal class names — map accents to static strings.
const ACCENT_CLASSES: Record<Accent, { icon: string; hover: string; cta: string }> = {
  amber: {
    icon: "border-amber/25 bg-amber/10 text-amber",
    hover: "hover:border-amber/40",
    cta: "text-amber",
  },
  lavender: {
    icon: "border-lavender/25 bg-lavender/10 text-lavender",
    hover: "hover:border-lavender/40",
    cta: "text-lavender",
  },
  sage: {
    icon: "border-sage/25 bg-sage/10 text-sage",
    hover: "hover:border-sage/40",
    cta: "text-sage",
  },
};

interface ChecklistItem {
  label: string;
  done: boolean;
}

export default function FirstRunPanel({
  firstName,
  onDismiss,
}: {
  firstName?: string;
  onDismiss: () => void;
}) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
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
      .catch(() => {});
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] border border-border bg-surface/88 p-6 shadow-[var(--t-shadow-modal)] backdrop-blur-xl lg:p-8"
    >
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber/[0.08] to-transparent" />

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss getting started"
        className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-elevated/70 text-text-ghost transition-colors hover:text-paper"
      >
        <X size={14} />
      </button>

      <div className="relative">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber">Getting started</p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-paper md:text-5xl">
          Welcome{firstName ? `, ${firstName}` : ""}. Here&apos;s where to begin.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary">
          Three ways into Quiloria. Pick one — you can always wander to the others later.
        </p>

        {/* Action cards */}
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const classes = ACCENT_CLASSES[action.accent];
            return (
              <Link
                key={action.id}
                href={action.href}
                onClick={action.markRead ? handleMarkRead : undefined}
                className={`group flex h-full flex-col rounded-2xl border border-border bg-elevated/65 p-5 transition-colors ${classes.hover}`}
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${classes.icon}`}
                >
                  <Icon size={19} />
                </span>
                <h3 className="mt-4 font-display text-lg text-paper">{action.title}</h3>
                <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-text-secondary">
                  {action.description}
                </p>
                <span
                  className={`mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium ${classes.cta}`}
                >
                  {action.cta}
                  <ArrowRight
                    size={13}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            );
          })}
        </div>

        {/* First-steps checklist */}
        <div className="mt-7 rounded-2xl border border-border bg-elevated/40 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber" />
              <p className="font-display text-base text-paper">First steps</p>
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em] text-text-ghost">
              {doneCount}/{checklist.length} done
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                    item.done
                      ? "border-sage/40 bg-sage/15 text-sage"
                      : "border-border bg-surface/60 text-transparent"
                  }`}
                >
                  <Check size={12} />
                </span>
                <span
                  className={`text-[13px] ${
                    item.done ? "text-text-secondary line-through" : "text-paper"
                  }`}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* New-word legend — defines the vocabulary the cards above just used.
            Lives outside the clickable cards so the tooltip buttons are valid. */}
        <p className="mt-5 text-[12px] leading-relaxed text-text-ghost">
          New here? A{" "}
          <GlossaryTerm id="spark" className="text-text-secondary" /> shows a story moved you, a{" "}
          <GlossaryTerm id="liveTable" className="text-text-secondary" /> is an Adventure played
          turn by turn, and a{" "}
          <GlossaryTerm id="coOp" className="text-text-secondary" /> story is written with others.
        </p>
      </div>
    </motion.div>
  );
}
