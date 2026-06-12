"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Pencil,
  Feather,
  Compass,
  Check,
  ArrowRight,
} from "lucide-react";

interface ThresholdProps {
  hasBio: boolean;
  hasAvatar: boolean;
  hasStory: boolean;
  hasFollowing: boolean;
  userId: string;
}

interface Step {
  id: string;
  done: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

export default function Threshold({
  hasBio,
  hasAvatar,
  hasStory,
  hasFollowing,
  userId,
}: ThresholdProps) {
  const steps: Step[] = [
    {
      id: "portrait",
      done: hasBio && hasAvatar,
      icon: <Pencil size={14} />,
      title: "Compose your portrait",
      description: hasBio && hasAvatar
        ? "Your name, picture, and a line of biography are in place."
        : !hasAvatar && !hasBio
          ? "A portrait and a line of biography give the room a soul."
          : !hasAvatar
            ? "A portrait still waits to be hung."
            : "A line of biography would complete the frame.",
      ctaLabel: hasBio && hasAvatar ? "Edit profile" : "Add the missing piece",
      href: `/profile/${userId}/edit`,
    },
    {
      id: "manuscript",
      done: hasStory,
      icon: <Feather size={14} />,
      title: "Open your first manuscript",
      description: hasStory
        ? "You have begun. The shelves are no longer empty."
        : "A blank page is patient. Begin a story when the first sentence finds you.",
      ctaLabel: hasStory ? "Continue writing" : "Begin a story",
      href: hasStory ? "/dashboard" : "/create",
    },
    {
      id: "wander",
      done: hasFollowing,
      icon: <Compass size={14} />,
      title: "Wander the stacks",
      description: hasFollowing
        ? "You have stories on the nightstand. Read on."
        : "Find a story by another hand. Spark it. Follow it. Let it teach you.",
      ctaLabel: hasFollowing ? "Open the nightstand" : "Browse the library",
      href: "/browse",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  const progress = Math.round((completed / steps.length) * 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
      className="relative mx-auto mt-8 max-w-6xl px-5 lg:px-8"
    >
      <div className="relative overflow-hidden rounded-[1.75rem] border border-amber/25 bg-surface/85 p-6 shadow-[var(--t-shadow-card)] backdrop-blur-xl sm:p-8">
        {/* Lamp glow */}
        <div className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-amber/[0.12] blur-3xl" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" aria-hidden />

        <div className="relative">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 inline-flex items-center gap-2">
              <span className="h-px w-8 bg-amber/40" aria-hidden />
              <span className="text-amber" aria-hidden>❋</span>
              <span className="h-px w-8 bg-amber/40" aria-hidden />
            </div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-amber">
              The Threshold
            </p>
            <h2 className="mt-2 font-display text-2xl text-paper sm:text-3xl">
              Your first quiet hour at Quiloria
            </h2>
            <p className="mt-2 max-w-xl font-reading text-[14px] italic leading-relaxed text-text-secondary">
              Three small rituals to settle into the library. No rush — the lamp
              stays lit.
            </p>

            {/* Progress bar */}
            <div className="mt-5 w-full max-w-sm">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-text-ghost">
                <span>{completed} of {steps.length} complete</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-elevated">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber/70 to-amber"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                />
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                className={`relative overflow-hidden rounded-xl border p-4 transition-colors ${
                  step.done
                    ? "border-sage/25 bg-sage/[0.05]"
                    : "border-border bg-elevated/40 hover:border-amber/30 hover:bg-elevated/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${
                      step.done
                        ? "border-sage/30 bg-sage/[0.1] text-sage"
                        : "border-amber/25 bg-amber/[0.06] text-amber"
                    }`}
                  >
                    {step.done ? <Check size={14} /> : step.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-semibold text-paper">
                      {step.title}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                      {step.description}
                    </p>
                  </div>
                </div>

                <Link
                  href={step.href}
                  className={`mt-3 inline-flex items-center gap-1 text-[12px] transition-colors ${
                    step.done
                      ? "text-text-ghost hover:text-sage"
                      : "text-amber hover:text-amber-light"
                  }`}
                >
                  {step.ctaLabel}
                  <ArrowRight size={11} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
