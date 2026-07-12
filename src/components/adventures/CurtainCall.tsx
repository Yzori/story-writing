"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { inkFor } from "@/components/adventures/ink";
import type { AdventureInk } from "@/types/adventure";

interface CurtainData {
  status: "finished" | "abandoned";
  title: string;
  book: { slug: string | null; chapters: number };
  credits: Array<{
    role: "director" | "writer";
    userName: string;
    characterName: string;
    inkColor: AdventureInk;
    words: number;
  }>;
  stats: {
    acts: number;
    scenes: number;
    passages: number;
    words: number;
    nights: number;
    sparks: number;
    readers: number;
    backings: number;
    creditedReaders: number;
  };
}

/**
 * The curtain call — the closure the table was promised. When the
 * Director closes the book (or the table goes quiet), the house
 * lights come up on a theater-program finale: credits, the run's
 * numbers, and the finished book waiting to be opened. Typography
 * and light only; the moment is the ornament.
 */
export default function CurtainCall({ adventureId }: { adventureId: string }) {
  const [data, setData] = useState<CurtainData | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/adventures/${adventureId}/curtain`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body?.data) setData(body.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [adventureId]);

  if (!data) return null;

  const finished = data.status === "finished";
  const at = (t: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.7, delay: reduce ? 0 : t },
  });
  const creditsStart = 1.15;
  const afterCredits = creditsStart + data.credits.length * 0.15 + 0.25;

  const statItems: Array<[number, string]> = [
    [data.stats.acts, data.stats.acts === 1 ? "act" : "acts"],
    [data.stats.scenes, data.stats.scenes === 1 ? "scene" : "scenes"],
    [data.stats.words, "words"],
    [data.stats.nights, data.stats.nights === 1 ? "night at the table" : "nights at the table"],
    [data.stats.sparks, "sparks"],
    [data.stats.readers, data.stats.readers === 1 ? "reader" : "readers"],
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-b from-elevated/60 to-ink/95 shadow-[0_26px_64px_rgba(0,0,0,0.5)] px-6 py-10 sm:px-10 sm:py-12 mb-6 text-center font-body">
      {/* the house lights come up */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(600px_260px_at_50%_-10%,var(--color-gold-glow),transparent_70%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 2.2 }}
      />

      <motion.p
        {...at(0.1)}
        className="relative m-0 text-[11px] uppercase tracking-[0.3em] text-gold-dark"
      >
        Curtain call
      </motion.p>

      <motion.h2
        {...at(0.4)}
        className="relative mt-3 mb-0 font-display font-medium text-paper text-[clamp(26px,4vw,38px)] [text-wrap:balance]"
      >
        {finished ? "The book closes." : "The table goes quiet."}
      </motion.h2>

      <motion.p
        {...at(0.75)}
        className="relative mt-3 mb-0 font-reading italic text-[17px] text-text-secondary [text-wrap:balance]"
      >
        {finished
          ? `“${data.title}” is a finished book now — written live, credited to the whole table.`
          : `What was written of “${data.title}” is kept — compiled and credited to everyone who played.`}
      </motion.p>

      {/* the program: who played */}
      <div className="relative mt-8 space-y-2">
        {data.credits.map((credit, i) => {
          const ink =
            credit.role === "director"
              ? inkFor("amber")
              : inkFor(credit.inkColor);
          return (
            <motion.p
              key={`${credit.userName}-${i}`}
              {...at(creditsStart + i * 0.15)}
              className="m-0 flex items-baseline justify-center gap-2.5 text-[15px]"
            >
              <span
                aria-hidden
                className={`w-[7px] h-[7px] rounded-full flex-none self-center ${ink.dot}`}
              />
              <span className="font-semibold text-paper">{credit.userName}</span>
              <span className="font-reading italic text-text-secondary">
                {credit.role === "director"
                  ? "the Director"
                  : credit.characterName
                    ? `as ${credit.characterName}`
                    : "a writer"}
              </span>
            </motion.p>
          );
        })}
      </div>

      {/* the run's numbers, engraved */}
      <motion.div
        {...at(afterCredits)}
        className="relative mt-9 flex flex-wrap items-baseline justify-center gap-x-10 gap-y-5"
      >
        {statItems
          .filter(([n]) => n > 0)
          .map(([n, label]) => (
            <div key={label}>
              <p className="m-0 font-display text-[26px] text-paper tabular-nums">
                {n.toLocaleString()}
              </p>
              <p className="m-0 mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-text-ghost">
                {label}
              </p>
            </div>
          ))}
      </motion.div>

      {data.stats.creditedReaders > 0 && (
        <motion.p
          {...at(afterCredits + 0.2)}
          className="relative mt-5 mb-0 text-[12.5px] text-lavender"
        >
          ✦ {data.stats.creditedReaders}{" "}
          {data.stats.creditedReaders === 1
            ? "reader suggestion was"
            : "reader suggestions were"}{" "}
          written into the story, credited.
        </motion.p>
      )}

      <motion.div
        {...at(afterCredits + 0.4)}
        className="relative mt-9 flex flex-wrap items-center justify-center gap-3"
      >
        {data.book.slug && data.book.chapters > 0 && (
          <Link
            href={`/story/${data.book.slug}`}
            className="font-semibold text-[14px] rounded-[11px] px-5 py-2.5 bg-gold border border-gold text-on-gold hover:bg-gold-light transition-colors"
          >
            Open the book
          </Link>
        )}
        <Link
          href="/adventures"
          className="font-semibold text-[14px] rounded-[11px] px-5 py-2.5 bg-surface border border-border text-paper hover:border-gold transition-colors"
        >
          Find another table
        </Link>
      </motion.div>
    </section>
  );
}
