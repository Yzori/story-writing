"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ─── Data ──────────────────────────────────────────────────────────────────

type Hall = "writing" | "visual" | "services";

interface OfferingMock {
  id: string;
  hall: Hall;
  craft: string;
  craftLabel: string;
  artist: string;
  artistInitial: string;
  title: string;
  excerpt: string;       // for writing-hall cards
  swatch?: string;       // for visual-hall thumbnails (gradient class)
  scope?: string[];      // for services-hall scope list
  priceFrom: number;     // drops
  delivery: string;
  completed: number;
}

const OFFERINGS: OfferingMock[] = [
  // — writing hall —
  {
    id: "w1",
    hall: "writing",
    craft: "custom-chapter",
    craftLabel: "Custom Chapter",
    artist: "Maren Holt",
    artistInitial: "M",
    title: "A chapter in your voice, with a hinge",
    excerpt:
      "I write the chapter you can't get to — a scene with a real turn, fitted to your style. Comes with a margin diary of what the chapter is doing.",
    priceFrom: 220,
    delivery: "7–10 days",
    completed: 18,
  },
  {
    id: "w2",
    hall: "writing",
    craft: "ghostwriting",
    craftLabel: "Ghostwriting",
    artist: "Rowan Vex",
    artistInitial: "R",
    title: "Serialized prose, 5k–8k words/week",
    excerpt:
      "Long-haul ghostwriting for serialized novels. I keep a continuity log so your voice stays yours even when the schedule slips.",
    priceFrom: 900,
    delivery: "weekly",
    completed: 41,
  },
  {
    id: "w3",
    hall: "writing",
    craft: "editing",
    craftLabel: "Editing",
    artist: "Iris Halloran",
    artistInitial: "I",
    title: "A line edit that doesn't flatten you",
    excerpt:
      "I work on the sentence level. Pacing, rhythm, dialogue tells. I will not iron the strange out of your prose — that's what readers came for.",
    priceFrom: 180,
    delivery: "5–7 days",
    completed: 62,
  },
  {
    id: "w4",
    hall: "writing",
    craft: "poetry",
    craftLabel: "Poetry",
    artist: "Calwen Tide",
    artistInitial: "C",
    title: "Poems for the inside of a story",
    excerpt:
      "Epigraphs, in-world songs, prophecies, the bit of verse a character keeps repeating. I write them so they sound like they came from your world, not mine.",
    priceFrom: 120,
    delivery: "4–6 days",
    completed: 27,
  },
  // — visual hall —
  {
    id: "v1",
    hall: "visual",
    craft: "cover-art",
    craftLabel: "Cover art",
    artist: "Brother Ash",
    artistInitial: "B",
    title: "Painterly covers · launch-ready",
    excerpt: "Final art + title treatment + spec crops for store, social, and a printable spine.",
    swatch: "from-rose/40 via-violet/30 to-burnt/30",
    priceFrom: 520,
    delivery: "14–18 days",
    completed: 33,
  },
  {
    id: "v2",
    hall: "visual",
    craft: "character-art",
    craftLabel: "Character art",
    artist: "Reka the Quiet",
    artistInitial: "R",
    title: "Cast lineups with outfit sheets",
    excerpt: "Portrait set for your protagonist + 3–5 supporting cast, with palette and silhouette guide.",
    swatch: "from-amber/40 via-copper/30 to-rose/20",
    priceFrom: 380,
    delivery: "12–15 days",
    completed: 24,
  },
  {
    id: "v3",
    hall: "visual",
    craft: "scene-illustration",
    craftLabel: "Scene art",
    artist: "Lior Vance",
    artistInitial: "L",
    title: "Interior chapter art · the pivotal beats",
    excerpt: "Single-scene illustrations for first kiss / fight / reveal. I read the chapter before sketching.",
    swatch: "from-teal/40 via-lavender/30 to-amber/20",
    priceFrom: 260,
    delivery: "10–12 days",
    completed: 19,
  },
  {
    id: "v4",
    hall: "visual",
    craft: "webtoon-panels",
    craftLabel: "Webtoon panels",
    artist: "Sade Park",
    artistInitial: "S",
    title: "Vertical-scroll panel packs",
    excerpt: "10–30 panels per episode, lettering included, designed for the prose-and-panels hybrid format.",
    swatch: "from-violet/40 via-rose/30 to-teal/20",
    priceFrom: 420,
    delivery: "per episode",
    completed: 12,
  },
  // — services hall —
  {
    id: "s1",
    hall: "services",
    craft: "worldbuilding",
    craftLabel: "Worldbuilding",
    artist: "Halvi Stark",
    artistInitial: "H",
    title: "A world that holds together",
    scope: ["Cosmology + magic logic", "Map (3 regions)", "5 cultures with a hinge of conflict"],
    excerpt: "",
    priceFrom: 340,
    delivery: "10–14 days",
    completed: 15,
  },
  {
    id: "s2",
    hall: "services",
    craft: "gm-for-hire",
    craftLabel: "GM for hire",
    artist: "Theon Halloran",
    artistInitial: "T",
    title: "I run your table",
    scope: ["8-session arc", "Voice acting + scene framing", "Session recaps in narrative prose"],
    excerpt: "",
    priceFrom: 680,
    delivery: "weekly",
    completed: 9,
  },
  {
    id: "s3",
    hall: "services",
    craft: "story-bible",
    craftLabel: "Story bible",
    artist: "Una Reed",
    artistInitial: "U",
    title: "The bible that survives your second draft",
    scope: ["Character continuity sheets", "Timeline + foreshadowing log", "Searchable index"],
    excerpt: "",
    priceFrom: 240,
    delivery: "8–10 days",
    completed: 21,
  },
];

interface PastArtist {
  id: string;
  artist: string;
  artistInitial: string;
  hall: Hall;
  craftLabel: string;
  delivered: string;       // e.g. "wrote the 5k bridge chapter"
  when: string;            // "2 weeks ago"
}

const PAST_ARTISTS: PastArtist[] = [
  { id: "p1", artist: "Maren Holt",      artistInitial: "M", hall: "writing",  craftLabel: "Custom Chapter",  delivered: "wrote the 5k bridge chapter",   when: "2 weeks ago" },
  { id: "p2", artist: "Brother Ash",     artistInitial: "B", hall: "visual",   craftLabel: "Cover Art",       delivered: "delivered the launch cover",     when: "3 months ago" },
  { id: "p3", artist: "Halvi Stark",     artistInitial: "H", hall: "services", craftLabel: "Worldbuilding",   delivered: "drafted the cosmology pack",     when: "5 months ago" },
  { id: "p4", artist: "Iris Halloran",   artistInitial: "I", hall: "writing",  craftLabel: "Editing",         delivered: "line-edited chapters 1–4",       when: "8 months ago" },
];

const HALLS: Array<{
  id: Hall;
  label: string;
  byline: string;
  body: string;
  tone: { text: string; border: string; soft: string };
  crafts: string[];
}> = [
  {
    id: "writing",
    label: "The Writing Hall",
    byline: "Words for hire — chapters, edits, ghostwriting, verse.",
    body:
      "Writers who know what a margin note is for. Custom chapters, line edits, ghostwriting, poetry, screenplay coverage.",
    tone: { text: "text-amber", border: "border-amber/30", soft: "bg-amber/[0.06]" },
    crafts: ["Custom Chapter", "Ghostwriting", "Editing", "Poetry", "Screenplay Coverage"],
  },
  {
    id: "visual",
    label: "The Visual Hall",
    byline: "Art that sits inside your story.",
    body:
      "Cover artists, character designers, webtoon panelists, and scene illustrators who read the chapter before they sketch.",
    tone: { text: "text-violet", border: "border-violet/30", soft: "bg-violet/[0.06]" },
    crafts: ["Cover Art", "Character Art", "Scene Illustration", "Webtoon Panels"],
  },
  {
    id: "services",
    label: "The Services Hall",
    byline: "Structure for the world behind the story.",
    body:
      "Worldbuilders, GMs for hire, story-bible keepers. The people who keep your map honest and your continuity standing.",
    tone: { text: "text-teal", border: "border-teal/30", soft: "bg-teal/[0.06]" },
    crafts: ["Worldbuilding", "GM for Hire", "Story Bible"],
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────

type Mode = "browse" | "brief";

export default function ScriptoriumMockup() {
  const [mode, setMode] = useState<Mode>("browse");
  const [filter, setFilter] = useState<Hall | "all">("all");
  const [query, setQuery] = useState("");

  // Brief mode state
  const [briefHall, setBriefHall] = useState<Hall | null>(null);
  const [briefCraft, setBriefCraft] = useState<string | null>(null);
  const [briefText, setBriefText] = useState("");
  const [briefBudget, setBriefBudget] = useState("");
  const [briefTimeline, setBriefTimeline] = useState<"flexible" | "soon" | "rush">("soon");
  const briefMatches = useMemo(() => {
    if (!briefHall) return [] as OfferingMock[];
    return OFFERINGS.filter((o) => {
      if (o.hall !== briefHall) return false;
      if (briefCraft && o.craftLabel !== briefCraft) return false;
      return true;
    }).slice(0, 3);
  }, [briefHall, briefCraft]);

  const filtered = useMemo(() => {
    return OFFERINGS.filter((o) => {
      if (filter !== "all" && o.hall !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          o.title.toLowerCase().includes(q) ||
          o.artist.toLowerCase().includes(q) ||
          o.craftLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filter, query]);

  return (
    <div className="min-h-screen bg-void text-text">
      {/* Mockup chrome */}
      <div className="border-b border-border-subtle bg-ink/30">
        <div className="mx-auto max-w-6xl px-6 py-2 text-[10px] uppercase tracking-[0.3em] text-text-ghost">
          Mockup · The Scriptorium
        </div>
      </div>

      {/* ─── Compact hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-amber/[0.05] blur-[140px]" />
        <div className="pointer-events-none absolute top-20 right-0 h-[320px] w-[320px] rounded-full bg-violet/[0.04] blur-[140px]" />

        <div className="relative mx-auto max-w-6xl px-6 pt-12 pb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">The Scriptorium</div>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-light leading-[1.05] text-paper sm:text-5xl">
            Hire a craft. <span className="text-amber italic">Or open your studio.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-secondary">
            Writers, illustrators, worldbuilders, and gamemasters who know what serialized stories need.
          </p>

          {/* Two-ways toggle */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-border-subtle bg-ink/40 p-1">
            <button
              onClick={() => setMode("browse")}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors ${
                mode === "browse" ? "bg-amber text-void" : "text-text-secondary hover:text-paper"
              }`}
            >
              Browse the halls
            </button>
            <button
              onClick={() => setMode("brief")}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors ${
                mode === "brief" ? "bg-amber text-void" : "text-text-secondary hover:text-paper"
              }`}
            >
              Post a brief
            </button>
          </div>

          {/* Search + filter row — browse mode only */}
          {mode === "browse" && (
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-xl">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-ghost" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="5" />
                <path d="M11 11l3 3" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by craft, artist, or what you need…"
                className="w-full rounded-full border border-border-subtle bg-ink/60 py-2.5 pl-10 pr-4 text-[13.5px] text-paper placeholder:text-text-ghost/60 outline-none focus:border-amber/30"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "writing", "visual", "services"] as const).map((id) => {
                const hall = HALLS.find((h) => h.id === id);
                const selected = filter === id;
                const tone = hall?.tone.text ?? "text-amber";
                return (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`rounded-full border px-3.5 py-1.5 text-[12.5px] capitalize transition-colors ${
                      selected
                        ? `border-amber/40 bg-amber/15 text-amber`
                        : "border-border-subtle bg-surface/40 text-text-secondary hover:border-amber/20"
                    }`}
                  >
                    {id === "all" ? "All halls" : id}
                    {id !== "all" && (
                      <span className={`ml-1.5 text-[10px] ${selected ? "text-amber/70" : tone}`}>
                        ●
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </section>

      {/* ─── Brief mode: composer + matches ──────────────────────────── */}
      {mode === "brief" && (
        <BriefComposer
          briefHall={briefHall}
          setBriefHall={(h) => {
            setBriefHall(h);
            setBriefCraft(null);
          }}
          briefCraft={briefCraft}
          setBriefCraft={setBriefCraft}
          briefText={briefText}
          setBriefText={setBriefText}
          briefBudget={briefBudget}
          setBriefBudget={setBriefBudget}
          briefTimeline={briefTimeline}
          setBriefTimeline={setBriefTimeline}
          matches={briefMatches}
        />
      )}

      {/* ─── Three illuminated halls ──────────────────────────────────── */}
      {mode === "browse" && (
      <section className="relative mx-auto max-w-6xl px-6 pb-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["writing", "visual", "services"] as const).map((id) => (
            <HallCard
              key={id}
              hall={id}
              illustration={
                id === "writing" ? <WritingHallSVG /> : id === "visual" ? <VisualHallSVG /> : <ServicesHallSVG />
              }
              shingleCount={OFFERINGS.filter((o) => o.hall === id).length}
              onEnter={() => setFilter(id)}
              active={filter === id}
            />
          ))}
        </div>
      </section>
      )}

      {/* ─── Artists you've worked with — only in browse mode ────────── */}
      {mode === "browse" && PAST_ARTISTS.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-8">
          <PastArtistsRail past={PAST_ARTISTS} />
        </section>
      )}

      {/* ─── Offerings board ──────────────────────────────────────────── */}
      {mode === "browse" && (
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-light text-paper">
            {filter === "all" ? "All offerings" : HALLS.find((h) => h.id === filter)?.label}
          </h2>
          <p className="text-[12px] italic text-text-ghost">
            {filtered.length} {filtered.length === 1 ? "shingle" : "shingles"} hung
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
            <p className="font-display text-[18px] text-paper">No shingles match.</p>
            <p className="mt-1 text-[12.5px] italic text-text-ghost">
              Clear the filters or post a brief and let the right craftsperson find you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((o) => (
              <OfferingCard key={o.id} offering={o} />
            ))}
          </div>
        )}
      </section>
      )}

      {/* ─── Quiet footer band: how-it-works + open studio ───────────── */}
      <section className="border-t border-border-subtle bg-ink/30">
        <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-1 gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-ghost">How a commission moves</div>
            <div className="mt-4 space-y-3">
              <FlowStep n="i" title="Brief" body="Post what you need, or pitch a craftsperson directly from their card." />
              <FlowStep n="ii" title="Quote" body="They quote in drops with a delivery window and revision count." />
              <FlowStep n="iii" title="Deliver" body="Files exchange through the platform. Drops release on your sign-off." />
            </div>
          </div>
          <div className="rounded-2xl border border-amber/20 bg-gradient-to-br from-amber/[0.08] to-transparent p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/80">For craftspeople</div>
            <h3 className="mt-2 font-display text-[22px] font-light text-paper">Open your studio.</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
              Hang a shingle. Set your craft, your price, your revision policy. Quiloria handles the brief, the escrow, and the delivery handoff.
            </p>
            <Link
              href="/scriptorium/offerings"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber px-4 py-2 text-[12.5px] font-semibold text-void shadow shadow-amber/15 transition-colors hover:bg-amber-light"
            >
              Hang a shingle
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Hall card ─────────────────────────────────────────────────────────────

function HallCard({
  hall,
  illustration,
  onEnter,
  active,
  shingleCount = 0,
}: {
  hall: Hall;
  illustration: React.ReactNode;
  onEnter: () => void;
  active: boolean;
  shingleCount?: number;
}) {
  const meta = HALLS.find((h) => h.id === hall)!;
  return (
    <button
      onClick={onEnter}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-surface to-ink/80 p-5 text-left transition-all hover:-translate-y-0.5 ${
        active ? `${meta.tone.border} shadow-lg` : "border-border-subtle hover:border-amber/20"
      }`}
    >
      {/* Soft hall-tinted ambient */}
      <div className={`pointer-events-none absolute -top-20 -right-10 h-44 w-44 rounded-full ${meta.tone.soft} blur-3xl`} />

      <div className="relative">
        <div className="mb-3 h-32 overflow-hidden rounded-xl border border-border-subtle bg-ink/40">
          {illustration}
        </div>
        <div className={`font-mono text-[9.5px] uppercase tracking-[0.22em] ${meta.tone.text}`}>{meta.byline}</div>
        <h3 className="mt-1 font-display text-[19px] font-light text-paper">{meta.label}</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-text-secondary line-clamp-2">{meta.body}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {meta.crafts.slice(0, 3).map((c) => (
            <span key={c} className="rounded-full bg-ink/40 border border-border-subtle px-2 py-0.5 text-[10.5px] text-text-ghost">
              {c}
            </span>
          ))}
          {meta.crafts.length > 3 && (
            <span className="text-[10.5px] italic text-text-ghost/80 self-center">+{meta.crafts.length - 3}</span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 text-[12px] ${meta.tone.text}`}>
            Enter the hall
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[10.5px] italic text-text-ghost">
            {shingleCount} shingle{shingleCount === 1 ? "" : "s"} hung
          </span>
        </div>
      </div>
    </button>
  );
}

function WaxSealIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.6 L9.5 5.8 L13.9 6 L10.5 8.8 L11.7 13.1 L8 10.7 L4.3 13.1 L5.5 8.8 L2.1 6 L6.5 5.8 Z" opacity="0.85" />
      <circle cx="8" cy="8" r="1.4" fill="#0F0D0B" opacity="0.55" />
    </svg>
  );
}

// ─── Offering card (craft-aware) ──────────────────────────────────────────

function OfferingCard({ offering }: { offering: OfferingMock }) {
  const hall = HALLS.find((h) => h.id === offering.hall)!;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface/60 transition-colors hover:border-amber/25">
      {/* Visual hall offerings get a thumbnail block */}
      {offering.hall === "visual" && offering.swatch && (
        <div className={`relative h-32 bg-gradient-to-br ${offering.swatch}`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.4))]" />
          <span className="absolute left-3 top-3 rounded-full bg-void/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-paper backdrop-blur">
            {offering.craftLabel}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Header (non-visual halls show craft label inline here) */}
        {offering.hall !== "visual" && (
          <span className={`mb-2 inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] ${hall.tone.text} ${hall.tone.border} ${hall.tone.soft}`}>
            {offering.craftLabel}
          </span>
        )}

        <h3 className="font-display text-[16.5px] font-medium leading-tight text-paper">{offering.title}</h3>

        {/* Body differs per hall */}
        {offering.hall === "services" && offering.scope ? (
          <ul className="mt-3 space-y-1.5">
            {offering.scope.map((s) => (
              <li key={s} className="flex items-start gap-2 text-[12.5px] text-text-secondary">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal/60" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-2.5 text-[12.5px] leading-relaxed text-text-secondary ${offering.hall === "writing" ? "italic font-reading" : ""} line-clamp-3`}>
            {offering.hall === "writing" ? `"${offering.excerpt}"` : offering.excerpt}
          </p>
        )}

        {/* Artist + completed strip */}
        <div className="mt-4 flex items-center gap-2.5 border-t border-border-subtle pt-3">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-display text-[11px] ${hall.tone.border} ${hall.tone.soft} ${hall.tone.text}`}>
            {offering.artistInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] text-paper">{offering.artist}</div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-text-ghost">
              <span>{offering.completed} commissions delivered</span>
              {offering.completed >= 10 && (
                <span title="Trusted craftsperson — 10+ delivered" className="text-amber/90">
                  <WaxSealIcon />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price + delivery + CTA */}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="font-display text-[18px] text-paper">
              <span className={hall.tone.text}>{offering.priceFrom}</span>
              <span className="ml-1 text-[12px] text-text-ghost">drops · from</span>
            </div>
            <div className="text-[11px] text-text-ghost">{offering.delivery}</div>
          </div>
          <button className="rounded-full border border-border-subtle bg-ink/40 px-3.5 py-1.5 text-[11.5px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber">
            Brief them →
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Artists you've worked with — horizontal rail ─────────────────────────

function PastArtistsRail({ past }: { past: PastArtist[] }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-ghost">
          Craftspeople you&apos;ve worked with
        </div>
        <Link href="#" className="text-[11.5px] text-text-ghost transition-colors hover:text-amber">
          See all relationships →
        </Link>
      </div>
      <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2 [scrollbar-width:thin]">
        {past.map((p) => {
          const hall = HALLS.find((h) => h.id === p.hall)!;
          return (
            <div
              key={p.id}
              className="group relative flex w-[280px] shrink-0 items-start gap-3 rounded-2xl border border-border-subtle bg-surface/50 p-4 transition-colors hover:border-amber/25"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-[14px] ${hall.tone.border} ${hall.tone.soft} ${hall.tone.text}`}>
                {p.artistInitial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[14px] text-paper">{p.artist}</div>
                <div className={`text-[10.5px] uppercase tracking-[0.12em] ${hall.tone.text}`}>{p.craftLabel}</div>
                <div className="mt-1.5 line-clamp-2 font-reading text-[12px] italic leading-snug text-text-secondary">
                  {p.delivered}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10.5px] text-text-ghost">{p.when}</span>
                  <button className="text-[11px] text-amber transition-colors hover:text-amber-light">
                    Hire again →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Brief composer (the "Post a brief" mode) ─────────────────────────────

function BriefComposer({
  briefHall,
  setBriefHall,
  briefCraft,
  setBriefCraft,
  briefText,
  setBriefText,
  briefBudget,
  setBriefBudget,
  briefTimeline,
  setBriefTimeline,
  matches,
}: {
  briefHall: Hall | null;
  setBriefHall: (h: Hall | null) => void;
  briefCraft: string | null;
  setBriefCraft: (c: string | null) => void;
  briefText: string;
  setBriefText: (s: string) => void;
  briefBudget: string;
  setBriefBudget: (s: string) => void;
  briefTimeline: "flexible" | "soon" | "rush";
  setBriefTimeline: (t: "flexible" | "soon" | "rush") => void;
  matches: OfferingMock[];
}) {
  const hallMeta = briefHall ? HALLS.find((h) => h.id === briefHall) : null;
  return (
    <section className="mx-auto max-w-6xl px-6 pb-12">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* — The brief — */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-amber/20 bg-gradient-to-br from-surface to-ink/80 p-6 shadow-xl shadow-void/30"
        >
          <div className="pointer-events-none absolute -top-20 -right-10 h-40 w-40 rounded-full bg-amber/[0.05] blur-3xl" />
          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">Brief the Scriptorium</div>
            <h2 className="mt-1 font-display text-[26px] font-light text-paper">
              Describe the scene you can&apos;t see yet.
            </h2>
            <p className="mt-1.5 text-[12.5px] italic text-text-ghost">
              Pick a craft, sketch the need, and craftspeople surface beside you.
            </p>

            {/* Step 1: hall */}
            <FieldLabel n="i" label="What craft do you need?" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["writing", "visual", "services"] as const).map((h) => {
                const meta = HALLS.find((x) => x.id === h)!;
                const selected = briefHall === h;
                return (
                  <button
                    key={h}
                    onClick={() => setBriefHall(h)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? `${meta.tone.border} ${meta.tone.soft}`
                        : "border-border-subtle bg-ink/40 hover:border-text-ghost/30"
                    }`}
                  >
                    <div className={`text-[12.5px] font-medium ${selected ? meta.tone.text : "text-paper"}`}>
                      {meta.label.replace("The ", "").replace(" Hall", "")}
                    </div>
                    <div className="mt-0.5 text-[10.5px] italic leading-tight text-text-ghost">
                      {meta.byline.split(" — ")[0] ?? meta.byline}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Step 2: craft (only after hall picked) */}
            {hallMeta && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <FieldLabel n="ii" label="Narrow the craft" optional />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setBriefCraft(null)}
                    className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                      briefCraft === null
                        ? `${hallMeta.tone.border} ${hallMeta.tone.soft} ${hallMeta.tone.text}`
                        : "border-border-subtle bg-ink/40 text-text-secondary hover:border-text-ghost/30"
                    }`}
                  >
                    Any
                  </button>
                  {hallMeta.crafts.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBriefCraft(c)}
                      className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                        briefCraft === c
                          ? `${hallMeta.tone.border} ${hallMeta.tone.soft} ${hallMeta.tone.text}`
                          : "border-border-subtle bg-ink/40 text-text-secondary hover:border-text-ghost/30"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: prose brief */}
            <FieldLabel n="iii" label="Tell them what you need" />
            <textarea
              value={briefText}
              onChange={(e) => setBriefText(e.target.value.slice(0, 800))}
              rows={4}
              placeholder="A character lineup for a five-person heist crew, set in late-Victorian London. I have a moodboard. Color palette is warm and bruised."
              className="mt-2 w-full resize-none rounded-xl border border-border-subtle bg-ink/40 px-4 py-3 font-reading text-[14px] leading-relaxed text-paper outline-none placeholder:text-text-ghost/50 focus:border-amber/30"
            />
            <div className="mt-1 text-right text-[10px] text-text-ghost/70">
              {briefText.length}/800
            </div>

            {/* Step 4: budget + timeline */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel n="iv" label="Budget" />
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-border-subtle bg-ink/40 px-3 py-2.5">
                  <input
                    value={briefBudget}
                    onChange={(e) => setBriefBudget(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                    placeholder="380"
                    className="flex-1 bg-transparent text-[14px] text-paper outline-none placeholder:text-text-ghost/50"
                  />
                  <span className="text-[12px] text-text-ghost">drops</span>
                </div>
              </div>
              <div>
                <FieldLabel n="v" label="When" />
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(["flexible", "soon", "rush"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBriefTimeline(t)}
                      className={`rounded-xl border px-2 py-2.5 text-[11.5px] capitalize transition-colors ${
                        briefTimeline === t
                          ? "border-amber/40 bg-amber/[0.08] text-amber"
                          : "border-border-subtle bg-ink/40 text-text-secondary hover:border-text-ghost/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              disabled={!briefHall || briefText.trim().length < 10}
              className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold transition-all ${
                briefHall && briefText.trim().length >= 10
                  ? "bg-amber text-void shadow-lg shadow-amber/15 hover:bg-amber-light"
                  : "cursor-not-allowed border border-border-subtle bg-ink/40 text-text-ghost"
              }`}
            >
              Send the brief
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 8h12M10 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="mt-3 text-center text-[10.5px] italic text-text-ghost">
              The brief goes to matching craftspeople. They quote back in drops with a delivery window.
            </p>
          </div>
        </motion.div>

        {/* — Matches rail — */}
        <div className="lg:sticky lg:top-8 self-start">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-ghost">
              {briefHall ? "Matching craftspeople" : "Waiting for a craft"}
            </div>
            {briefHall && matches.length > 0 && (
              <span className="text-[11px] italic text-text-ghost">{matches.length} ready to quote</span>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {!briefHall ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-border-subtle bg-surface/30 p-8 text-center"
              >
                <p className="font-display text-[15px] text-paper">Pick a craft to begin.</p>
                <p className="mt-1 text-[11.5px] italic text-text-ghost">
                  Matches appear here as you fill the brief.
                </p>
              </motion.div>
            ) : matches.length === 0 ? (
              <motion.div
                key="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-border-subtle bg-surface/40 p-8 text-center"
              >
                <p className="font-display text-[15px] text-paper">No exact matches yet.</p>
                <p className="mt-1 text-[11.5px] italic text-text-ghost">
                  Send the brief anyway — adjacent craftspeople will see it.
                </p>
              </motion.div>
            ) : (
              <motion.div key="list" className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {matches.map((m) => (
                  <MatchCard key={m.id} offering={m} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function FieldLabel({ n, label, optional }: { n: string; label: string; optional?: boolean }) {
  return (
    <div className="mt-5 flex items-baseline gap-2">
      <span className="font-display italic text-amber/70 text-[12.5px]">{n}.</span>
      <span className="text-[11px] uppercase tracking-[0.16em] text-text-ghost">{label}</span>
      {optional && <span className="text-[10px] italic text-text-ghost/70">optional</span>}
    </div>
  );
}

function MatchCard({ offering }: { offering: OfferingMock }) {
  const hall = HALLS.find((h) => h.id === offering.hall)!;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-surface/50 p-4 transition-colors hover:border-amber/25">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-[14px] ${hall.tone.border} ${hall.tone.soft} ${hall.tone.text}`}>
        {offering.artistInitial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-display text-[14.5px] text-paper">{offering.artist}</span>
          <span className={`shrink-0 text-[10.5px] uppercase tracking-[0.12em] ${hall.tone.text}`}>{offering.craftLabel}</span>
        </div>
        <div className="line-clamp-2 mt-1 text-[12px] italic leading-snug text-text-secondary">
          {offering.title}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-text-ghost">
            from {offering.priceFrom} drops · {offering.delivery}
          </span>
          <button className="text-[11px] text-amber transition-colors hover:text-amber-light">
            Quote me →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── How-it-works step ────────────────────────────────────────────────────

function FlowStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border-subtle bg-surface/40 p-4">
      <span className="font-display italic text-amber/70 text-[15px]">{n}.</span>
      <div className="min-w-0">
        <div className="font-display text-[14.5px] text-paper">{title}</div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{body}</div>
      </div>
    </div>
  );
}

// ─── Hall vignettes — small atmospheric SVGs ──────────────────────────────

function WritingHallSVG() {
  return (
    <svg viewBox="0 0 240 128" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="w-lamp" cx="35%" cy="40%" r="40%">
          <stop offset="0%" stopColor="#D4A843" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#D4A843" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="240" height="128" fill="#1a140d" />
      <rect x="0" y="0" width="240" height="128" fill="url(#w-lamp)" />
      {/* desk shadow */}
      <ellipse cx="120" cy="115" rx="110" ry="8" fill="#000" opacity="0.4" />
      {/* manuscript page */}
      <g transform="translate(60, 26) rotate(-3 60 40)">
        <rect x="2" y="3" width="120" height="90" fill="#000" opacity="0.4" rx="2" />
        <rect width="120" height="90" fill="#EDE8D8" rx="2" />
        <line x1="16" y1="0" x2="16" y2="90" stroke="#B8697A" strokeOpacity="0.4" strokeWidth="0.5" />
        <g stroke="#201813" strokeOpacity="0.75" strokeWidth="0.55" strokeLinecap="round">
          <line x1="22" y1="12" x2="92" y2="12" />
          <line x1="22" y1="22" x2="104" y2="22" />
          <line x1="22" y1="32" x2="86" y2="32" />
          <line x1="22" y1="42" x2="100" y2="42" />
          <line x1="22" y1="52" x2="72" y2="52" />
          <line x1="22" y1="62" x2="94" y2="62" />
          <line x1="22" y1="72" x2="58" y2="72" />
        </g>
      </g>
      {/* quill */}
      <g transform="translate(178, 70) rotate(-22)">
        <line x1="0" y1="0" x2="46" y2="-3" stroke="#A88030" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 6 -1.5 Q 18 -7 28 -8 Q 38 -8 46 -3" fill="#D4A843" fillOpacity="0.9" stroke="#A88030" strokeWidth="0.4" />
      </g>
      {/* ink pot */}
      <g transform="translate(196, 86)">
        <ellipse cx="0" cy="0" rx="9" ry="3" fill="#1C1B28" />
        <rect x="-7" y="-12" width="14" height="14" rx="1.5" fill="#3A3850" />
        <ellipse cx="0" cy="-12" rx="7" ry="2" fill="#1C1B28" />
      </g>
    </svg>
  );
}

function VisualHallSVG() {
  return (
    <svg viewBox="0 0 240 128" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="v-glow" cx="60%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="canvas-paint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B8697A" />
          <stop offset="50%" stopColor="#D4A843" />
          <stop offset="100%" stopColor="#5A8A9A" />
        </linearGradient>
      </defs>
      <rect width="240" height="128" fill="#1a140d" />
      <rect x="0" y="0" width="240" height="128" fill="url(#v-glow)" />
      {/* easel legs */}
      <line x1="100" y1="118" x2="86" y2="22" stroke="#5C4A30" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="156" y1="118" x2="170" y2="22" stroke="#5C4A30" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="60" x2="164" y2="60" stroke="#5C4A30" strokeWidth="2" strokeLinecap="round" />
      {/* canvas */}
      <rect x="76" y="20" width="104" height="80" fill="#EDE8D8" stroke="#A88030" strokeWidth="1.5" rx="1" />
      {/* painting in progress */}
      <rect x="80" y="24" width="96" height="50" fill="url(#canvas-paint)" opacity="0.6" />
      <path d="M 80 60 Q 110 40 140 55 T 176 50" stroke="#3A3850" strokeWidth="1.2" fill="none" opacity="0.7" />
      <circle cx="100" cy="44" r="6" fill="#EDE8D8" opacity="0.5" />
      {/* palette */}
      <g transform="translate(38, 90)">
        <ellipse cx="0" cy="0" rx="20" ry="11" fill="#7A5A3A" />
        <circle cx="-8" cy="-2" r="2.5" fill="#B8697A" />
        <circle cx="0" cy="2" r="2.5" fill="#D4A843" />
        <circle cx="8" cy="-2" r="2.5" fill="#5A8A9A" />
      </g>
      {/* brush */}
      <g transform="translate(200, 88) rotate(-30)">
        <rect x="0" y="-1.2" width="22" height="2.4" rx="0.5" fill="#5C4A30" />
        <rect x="22" y="-2" width="6" height="4" rx="0.6" fill="#A88030" />
        <path d="M 28 -1.5 L 36 -3 L 36 3 L 28 1.5 Z" fill="#3A3850" />
      </g>
    </svg>
  );
}

function ServicesHallSVG() {
  return (
    <svg viewBox="0 0 240 128" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="s-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5EB3B3" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#5EB3B3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="240" height="128" fill="#1a140d" />
      <rect x="0" y="0" width="240" height="128" fill="url(#s-glow)" />
      {/* unfurled map */}
      <g transform="translate(30, 30)">
        <rect x="2" y="3" width="140" height="76" fill="#000" opacity="0.4" rx="1.5" />
        <rect width="140" height="76" fill="#E6D9B8" rx="1.5" />
        {/* map content — coastlines */}
        <path d="M 12 22 Q 30 16 48 20 Q 64 14 80 22 Q 96 30 112 24 Q 122 22 128 28"
              stroke="#3A6B5A" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M 18 42 Q 34 38 50 44 Q 66 50 84 46 Q 100 42 118 48"
              stroke="#3A6B5A" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* islands */}
        <circle cx="40" cy="34" r="3" fill="#3A6B5A" opacity="0.5" />
        <circle cx="90" cy="36" r="2" fill="#3A6B5A" opacity="0.5" />
        {/* mountains */}
        <path d="M 60 60 L 66 50 L 72 60 Z" fill="#5C4A30" opacity="0.6" />
        <path d="M 70 64 L 80 48 L 90 64 Z" fill="#5C4A30" opacity="0.6" />
        {/* compass */}
        <g transform="translate(118, 60)">
          <circle r="8" fill="none" stroke="#A88030" strokeWidth="0.7" />
          <path d="M 0 -8 L 2 0 L 0 8 L -2 0 Z" fill="#A88030" />
          <path d="M -8 0 L 0 2 L 8 0 L 0 -2 Z" fill="#A88030" opacity="0.5" />
        </g>
        {/* roll edges */}
        <ellipse cx="0" cy="38" rx="4" ry="38" fill="#A88030" opacity="0.5" />
        <ellipse cx="140" cy="38" rx="4" ry="38" fill="#A88030" opacity="0.5" />
      </g>
      {/* d20 */}
      <g transform="translate(192, 80)">
        <polygon points="0,-15 13,-5 10,12 -10,12 -13,-5" fill="#3A3850" stroke="#A88030" strokeWidth="0.7" />
        <polygon points="0,-15 13,-5 0,2" fill="#5A5870" />
        <polygon points="0,-15 -13,-5 0,2" fill="#28263A" />
        <text x="0" y="4" fontFamily="serif" fontWeight="700" fontSize="9" fill="#D4A843" textAnchor="middle">20</text>
      </g>
    </svg>
  );
}
