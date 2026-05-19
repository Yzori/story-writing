"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Feather, BookOpen, ArrowRight, Clock } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { ApiStory } from "@/types/api";

interface InQuiloriaProps {
  stories: ApiStory[];
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InQuiloria({ stories }: InQuiloriaProps) {
  // Pick the most-recently-updated draft or in-progress story.
  const candidates = stories.filter(
    (s) => s.status === "draft" || s.status === "in-progress"
  );
  if (candidates.length === 0) return null;

  const active = [...candidates].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0];

  const editHref = `/write/${active.id}`;
  const status = active.status === "draft" ? "Draft" : "In progress";
  const statusColor =
    active.status === "draft"
      ? "text-text-secondary border-border bg-elevated/60"
      : "text-amber border-amber/30 bg-amber/[0.07]";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto mt-8 max-w-5xl px-5 lg:px-8"
    >
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber">
            The work in hand
          </p>
          <h2 className="mt-1 font-display text-xl text-paper sm:text-2xl">
            In Quiloria
          </h2>
        </div>
      </div>

      <Link href={editHref} className="group block">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-amber/20 bg-surface/82 backdrop-blur-xl shadow-[var(--t-shadow-card)] transition-all hover:-translate-y-0.5 hover:border-amber/40">
          {/* Lampglow */}
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-amber/[0.12] blur-3xl" aria-hidden />
          {/* Ink drip on the left margin */}
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber/60 via-amber/30 to-transparent" aria-hidden />

          <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7">
            {/* Quill icon block */}
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-amber/25 bg-amber/[0.06] text-amber sm:h-16 sm:w-16">
              <Feather size={22} />
            </div>

            {/* Body */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusColor}`}
                >
                  {active.status === "in-progress" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
                  )}
                  {status}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-text-ghost">
                  <Clock size={11} />
                  Last touched {formatRelative(active.updatedAt)}
                </span>
              </div>

              <h3 className="mt-2 font-display text-xl font-semibold leading-tight text-paper transition-colors group-hover:text-amber sm:text-2xl">
                {active.title || "Untitled manuscript"}
              </h3>

              {active.synopsis ? (
                <p className="mt-1 text-[13px] leading-relaxed text-text-secondary line-clamp-2">
                  {active.synopsis}
                </p>
              ) : (
                <p className="mt-1 font-reading text-[13px] italic text-text-ghost">
                  Not yet a synopsis. The page is patient.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-text-ghost">
                <span className="inline-flex items-center gap-1">
                  <Feather size={11} />
                  {formatNumber(active.totalWords)} {active.totalWords === 1 ? "word" : "words"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen size={11} />
                  {active.chapterCount} {active.chapterCount === 1 ? "chapter" : "chapters"}
                </span>
                {candidates.length > 1 && (
                  <span className="text-text-ghost">
                    +{candidates.length - 1} more in progress
                  </span>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-shrink-0 items-center gap-2 self-stretch sm:self-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/[0.06] px-4 py-2 text-[12px] font-medium text-amber transition-colors group-hover:border-amber/45 group-hover:bg-amber/[0.12]">
                Return to the page
                <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.section>
  );
}
