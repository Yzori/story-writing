"use client";

import Link from "next/link";

const MOCKS = [
  {
    href: "/dashboard-mockup/banner",
    emoji: "🖼️",
    name: "The Studio · Banner",
    tagline: "atmospheric banner + works row",
    blurb:
      "What you actually pictured: a general time-of-day room banner up top (greeting + clock + the single most-important action surfaced inside it so it's alive, not decorative), with your works as a row of equal covers below. Calmer, more conventional than work-as-hero.",
    accent: "from-sage/25 to-amber/15 border-sage/40",
  },
  {
    href: "/dashboard-mockup/canon",
    emoji: "★",
    name: "The Studio (canonical)",
    tagline: "one star, full cast",
    blurb:
      "The synthesis. Keeps the Studio's cinematic personality: one adaptive hero leads (writer / reader / live-table, whichever's hottest), and the other selves live as a characterful 'also alive' scenes strip — present and lively, but clearly the supporting cast. Hierarchy, not balance. No toggle, no rail.",
    accent: "from-amber/30 to-rose/15 border-amber/45",
  },
  {
    href: "/dashboard-mockup/mosaic",
    emoji: "🧩",
    name: "The Mosaic",
    tagline: "all heads at once",
    blurb:
      "The real attempt at holding every self on one screen. A living bento: each life is a module shaped to what it is (proud cover, pulsing live table, reading poster, faces tile), the hottest swells to the focal slot, quiet ones shrink to tiles. Priority by size + shape — no hiding, no toggle, no rail. Re-packs as heat shifts.",
    accent: "from-amber/25 via-rose/15 to-teal/15 border-paper/20",
  },
  {
    href: "/dashboard-mockup/coexist",
    emoji: "🎭",
    name: "Studio · Coexist",
    tagline: "adaptive hero, no toggle",
    blurb:
      "The recommended resolution to reader-vs-writer. No toggle: the hero leads with your center of gravity (live work → writing; mid-read → reading), the OTHER half is always a counterpart strip, and one self-ranking stream mixes making + reading. Zero hat-picking.",
    accent: "from-teal/25 to-violet/15 border-teal/40",
  },
  {
    href: "/dashboard-mockup/studio",
    emoji: "🎨",
    name: "The Studio",
    tagline: "pride · pulse · momentum",
    blurb:
      "The energetic swing. Your work as rich auto-generated cover art that colors the whole page, reader reactions pulsing up in real time, a momentum strip (streak / words / sparks) you can feel, and a live 'in your world' room. Alive even on a sparse account.",
    accent: "from-violet/25 to-rose/15 border-violet/40",
  },
  {
    href: "/dashboard-mockup/brief",
    emoji: "📖",
    name: "The Brief",
    tagline: "the studio talks back",
    blurb:
      "The synthesis. One self-ranking surface that never asks which hat you're wearing: a written headline that narrates your creative life + the single most important action pre-picked, a heat-ranked 'what's alive' stream across every role, and a quiet reach band. The room is tinted by whatever's hottest.",
    accent: "from-amber/25 to-rose/10 border-amber/40",
  },
  {
    href: "/dashboard-mockup/hybrid",
    emoji: "🗺️✶",
    name: "Realm × Clarity (hybrid)",
    tagline: "ambient skin, explicit controls",
    blurb:
      "The recommended direction. Keeps the Realm map as an atmospheric hero, but restores the current dashboard's clear bones: a Resume card, a works grid with status badges + a literal % charted meter, a live-tables list, and readable letters. Memorable and legible.",
    accent: "from-amber/25 to-sage/10 border-amber/35",
  },
  {
    href: "/dashboard-mockup/constellation",
    emoji: "⭐",
    name: "The Constellation",
    tagline: "Your Sky",
    blurb:
      "A pannable night sky. Each story is a constellation; chapters are stars wiring together as you write. Campaigns glow as nebulae; notifications streak in as shooting stars.",
    accent: "from-lavender/20 to-violet/10 border-lavender/25",
  },
  {
    href: "/dashboard-mockup/realm",
    emoji: "🗺️",
    name: "The Realm",
    tagline: "Cartographer's Table",
    blurb:
      "An illustrated world map where writing reveals the world. Word count drives fog-of-war; campaigns are settlements; notifications arrive as ravens landing on the map.",
    accent: "from-amber/20 to-copper/10 border-amber/25",
  },
  {
    href: "/dashboard-mockup/coldopen",
    emoji: "✍️",
    name: "Cold Open",
    tagline: "The words are the UI",
    blurb:
      "Severe editorial typography on near-black. The first line of your WIP types itself live. Stories as a numbered index; notifications as margin footnotes. No ornament.",
    accent: "from-paper/10 to-transparent border-border",
  },
];

export default function MockIndex() {
  return (
    <main className="min-h-dvh bg-void px-6 py-16 text-paper">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber">Design mockups</p>
        <h1 className="mt-2 font-display text-4xl text-paper">Dashboard, three new worlds</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
          Throwaway concepts wired to your real stories, campaigns, and notifications.
          Pick one to walk into it.
        </p>
        <div className="mt-10 grid gap-4">
          {MOCKS.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={`group rounded-3xl border bg-gradient-to-br p-6 transition-transform hover:-translate-y-1 ${m.accent}`}
            >
              <div className="flex items-baseline gap-3">
                <span className="text-2xl">{m.emoji}</span>
                <h2 className="font-display text-2xl text-paper">{m.name}</h2>
                <span className="text-xs uppercase tracking-[0.18em] text-text-ghost">{m.tagline}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{m.blurb}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
