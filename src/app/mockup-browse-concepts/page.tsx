"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const CONCEPTS = [
  {
    href: "/mockup-browse-concepts/reading-room",
    name: "The Reading Room",
    tagline: "A cinematic descent through a candlelit library.",
    detail: "No sidebar, no filter bar. Scroll down through halls where covers hang like framed portraits. Filters are summoned on demand (press / or ⌘K).",
    accent: "212,168,67",
  },
  {
    href: "/mockup-browse-concepts/tonights-page",
    name: "Tonight's Page",
    tagline: "A reading ritual, not a catalog.",
    detail: "One story set aside for you, shown large with its real opening lines as type. \"Not tonight?\" deals the next. Full stacks wait below for breadth.",
    accent: "184,105,122",
  },
  {
    href: "/mockup-browse-concepts/atrium",
    name: "Mood-first Atrium",
    tagline: "Discovery by feeling, not metadata.",
    detail: "\"What do you want to feel tonight?\" Pick a mood and the shelves assemble around it. Genre and length demote to quiet refinements.",
    accent: "155,142,196",
  },
  {
    href: "/mockup-browse-concepts/night-atlas",
    name: "The Night Atlas",
    tagline: "The library, seen from above — at night.",
    detail: "Every story is a star on an astronomer's plate. Constellations instead of categories; brightness is sparks; a flickering star is still being written. Click a light to read its card.",
    accent: "107,165,165",
  },
  {
    href: "/mockup-browse-concepts/hearth",
    name: "The Hearth",
    tagline: "A fire built into the shelves.",
    detail: "The fireplace wall of the bookstore is the browse surface: an animated fire in the hearth, firelight flickering across a wall of pullable book spines, tonight's picks on the mantel, a cat in the armchair.",
    accent: "224,142,60",
  },
  {
    href: "/mockup-browse-concepts/bookshop",
    name: "The Lamplight Bookshop",
    tagline: "A warm little shop, open late.",
    detail: "Familiar bookshop browsing — window display, tables of new stock, shelves by feeling, handwritten staff-pick cards — with rain on the glass and a cat on the last shelf. Cozy and instantly usable.",
    accent: "212,168,67",
  },
  {
    href: "/mockup-browse-concepts/living-library",
    name: "The Living Library",
    tagline: "Sunlight in the stacks — the only daylight concept.",
    detail: "Warm wood shelves, soft paper, dust in a window beam. Themed cases (Being Written Right Now, Cozy Evening Reads, Adventure Rooms behind real doors, Hidden Gems in the dim end), a reading nook with a page left open, and every book opens to its actual first lines.",
    accent: "168,91,34",
  },
];

export default function ConceptIndex() {
  return (
    <main className="min-h-screen bg-void px-4 py-20 text-text sm:px-6">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[50vh] bg-[radial-gradient(ellipse_at_50%_-10%,rgba(212,168,67,0.10),transparent_65%)]" />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-3 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-text-ghost">
          <span className="h-px w-8 bg-amber/40" />
          Browse · concept mockups
        </div>
        <h1 className="font-display text-[38px] leading-tight text-paper sm:text-[48px]">Seven ways to wander</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-secondary">
          Seven browse paradigms built from scratch — each abandons the filter-grid entirely.
          Open one, then tell me which feels right (or which pieces to graft together).
        </p>

        <div className="mt-10 space-y-4">
          {CONCEPTS.map((c, i) => (
            <motion.div key={c.href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Link
                href={c.href}
                className="group relative block overflow-hidden rounded-2xl border border-border bg-surface/60 p-6 transition-all hover:border-amber/30 sm:p-8"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
                  style={{ background: `rgba(${c.accent},0.5)` }}
                />
                <div className="relative flex items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-[12px] text-amber/60">0{i + 1}</span>
                      <h2 className="font-display text-[26px] text-paper sm:text-[30px]">{c.name}</h2>
                    </div>
                    <p className="mt-1 text-[14px] italic text-text-secondary">{c.tagline}</p>
                    <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-text-secondary">{c.detail}</p>
                  </div>
                  <span className="mt-1 grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-border text-text-secondary transition-all group-hover:border-amber/40 group-hover:text-amber">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/40 p-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">Side quest</p>
          <Link href="/mockup-browse-concepts/filter-styles" className="group mt-1.5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-[18px] text-paper group-hover:text-amber">Filter-style lab</h3>
              <p className="mt-0.5 text-[13px] text-text-secondary">Four ways to apply filters on Tonight&apos;s Page — popover toolbar, refine drawer, compact rail, smart chips. Flip between them live.</p>
            </div>
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-border text-text-secondary transition-all group-hover:border-amber/40 group-hover:text-amber">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </Link>
        </div>

        <p className="mt-8 text-[12px] text-text-ghost">
          Sample data only — covers from Unsplash, copy written to feel like the platform. Not wired to the DB.
        </p>
      </div>
    </main>
  );
}
