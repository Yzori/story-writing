"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Clock3, CheckCircle2, ChevronRight, Hammer } from "lucide-react";

interface ProfileOffering {
  id: string;
  craft: string;
  title: string;
  description: string;
  priceMin: number;
  priceMax: number;
  deliveryDays: number;
  completedCount: number;
}

const CRAFT_LABELS: Record<string, string> = {
  "custom-chapter": "Custom Chapter",
  ghostwriting: "Ghostwriting",
  poetry: "Poetry",
  "screenplay-coverage": "Screenplay Coverage",
  editing: "Editing",
  "cover-art": "Cover Art",
  "character-art": "Character Art",
  "webtoon-panels": "Webtoon Panels",
  "scene-illustration": "Scene Illustration",
  worldbuilding: "Worldbuilding",
  "gm-for-hire": "GM for Hire",
  "story-bible": "Story Bible",
};

const CRAFT_COLORS: Record<string, { text: string; tile: string; ring: string }> = {
  "custom-chapter":      { text: "text-amber",    tile: "bg-amber/[0.08]",    ring: "border-amber/25" },
  ghostwriting:          { text: "text-amber",    tile: "bg-amber/[0.08]",    ring: "border-amber/25" },
  poetry:                { text: "text-amber",    tile: "bg-amber/[0.08]",    ring: "border-amber/25" },
  "screenplay-coverage": { text: "text-amber",    tile: "bg-amber/[0.08]",    ring: "border-amber/25" },
  editing:               { text: "text-amber",    tile: "bg-amber/[0.08]",    ring: "border-amber/25" },
  "cover-art":           { text: "text-lavender", tile: "bg-lavender/[0.08]", ring: "border-lavender/25" },
  "character-art":       { text: "text-lavender", tile: "bg-lavender/[0.08]", ring: "border-lavender/25" },
  "webtoon-panels":      { text: "text-lavender", tile: "bg-lavender/[0.08]", ring: "border-lavender/25" },
  "scene-illustration":  { text: "text-lavender", tile: "bg-lavender/[0.08]", ring: "border-lavender/25" },
  worldbuilding:         { text: "text-teal",     tile: "bg-teal/[0.08]",     ring: "border-teal/25" },
  "gm-for-hire":         { text: "text-teal",     tile: "bg-teal/[0.08]",     ring: "border-teal/25" },
  "story-bible":         { text: "text-teal",     tile: "bg-teal/[0.08]",     ring: "border-teal/25" },
};

function craftColor(craft: string) {
  return CRAFT_COLORS[craft] ?? { text: "text-text-secondary", tile: "bg-elevated/40", ring: "border-border" };
}

interface StudioRailProps {
  offerings: ProfileOffering[];
  isOwner: boolean;
}

export default function StudioRail({ offerings, isOwner }: StudioRailProps) {
  if (offerings.length === 0 && !isOwner) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto mt-8 max-w-5xl px-5 lg:px-8"
    >
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-surface/82 p-5 shadow-[var(--t-shadow-card)] backdrop-blur-xl sm:p-6 lg:p-7">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber/[0.08] blur-3xl" aria-hidden />

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber/25 bg-amber/[0.08] text-amber">
              <Hammer size={14} />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-amber">The studio</p>
              <h2 className="mt-1 font-display text-xl text-paper sm:text-2xl">Commission a craft</h2>
            </div>
          </div>
          {isOwner && offerings.length > 0 && (
            <Link
              href="/commissions/offerings"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated/70 px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:text-paper"
            >
              Manage offerings
              <ChevronRight size={11} />
            </Link>
          )}
        </div>

        {offerings.length === 0 ? (
          <div className="rounded-2xl border border-border bg-elevated/40 p-8 text-center">
            <p className="text-[13px] text-text-secondary">
              {isOwner
                ? "Nothing on the workbench yet."
                : "This writer hasn't opened the studio to commissions."}
            </p>
            {isOwner && (
              <Link
                href="/commissions/offerings"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/[0.08] px-4 py-1.5 text-[12px] font-medium text-amber transition-colors hover:bg-amber/[0.14]"
              >
                List your first offering
                <ChevronRight size={12} />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {offerings.map((offering, i) => {
              const color = craftColor(offering.craft);
              return (
                <motion.div
                  key={offering.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.04 * i, duration: 0.35 }}
                >
                  <Link
                    href="/commissions"
                    className="group block h-full rounded-2xl border border-border bg-elevated/55 p-4 transition-all hover:-translate-y-0.5 hover:border-amber/30"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] font-semibold ${color.text} ${color.tile} ${color.ring}`}>
                        {CRAFT_LABELS[offering.craft] ?? offering.craft}
                      </span>
                      {offering.completedCount >= 10 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber/25 bg-amber/[0.08] px-2 py-0.5 text-[10px] font-medium text-amber">
                          <Sparkles size={9} />
                          Master Artisan
                        </span>
                      ) : offering.completedCount >= 5 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber/20 bg-amber/[0.05] px-2 py-0.5 text-[10px] font-medium text-amber/80">
                          <Sparkles size={9} />
                          Trusted Artisan
                        </span>
                      ) : null}
                    </div>

                    <h3 className="font-display text-[15px] leading-snug text-paper group-hover:text-amber transition-colors">
                      {offering.title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-ghost">
                      <span className="font-medium text-text-secondary">
                        {offering.priceMin === offering.priceMax
                          ? `${offering.priceMin} drops`
                          : `${offering.priceMin}–${offering.priceMax} drops`}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={10} />
                        ~{offering.deliveryDays}d
                      </span>
                      {offering.completedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-sage">
                          <CheckCircle2 size={10} />
                          {offering.completedCount} completed
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
