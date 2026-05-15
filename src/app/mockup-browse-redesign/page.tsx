"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

type Story = {
  id: number;
  title: string;
  author: string;
  hook: string;
  genre: string;
  format: string;
  status: "Complete" | "Ongoing" | "New";
  rating: "All Ages" | "Teen+" | "Mature";
  readTime: string;
  chapters: number;
  sparks: number;
  cover: string;
  sponsored?: boolean;
  sponsorLine?: string;
};

const STORIES: Story[] = [
  {
    id: 1,
    title: "The Obsidian Crown",
    author: "Kaelen Thorne",
    hook: "A rebel archivist inherits a crown that remembers every betrayal committed in its name.",
    genre: "Fantasy",
    format: "Novel",
    status: "Ongoing",
    rating: "Teen+",
    readTime: "6h 10m",
    chapters: 24,
    sparks: 312,
    cover: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=900&auto=format&fit=crop",
    sponsored: true,
    sponsorLine: "Featured by Iron Quill Press",
  },
  {
    id: 2,
    title: "Neon Grifters",
    author: "Cyborg2088",
    hook: "A blacklisted neural architect takes one last impossible job under the city.",
    genre: "Cyberpunk",
    format: "Serial",
    status: "Complete",
    rating: "Mature",
    readTime: "4h 30m",
    chapters: 18,
    sparks: 189,
    cover: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=900&auto=format&fit=crop",
    sponsored: true,
    sponsorLine: "Sponsored opening-week placement",
  },
  {
    id: 3,
    title: "Whispering Pines",
    author: "GM Sarah",
    hook: "A small mountain town loses one person every Sunday. The forest keeps careful records.",
    genre: "Mystery",
    format: "Adventure",
    status: "New",
    rating: "Teen+",
    readTime: "1h 45m",
    chapters: 3,
    sparks: 55,
    cover: "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "Salt & Ruin",
    author: "Maren Holt",
    hook: "A cursed cartographer maps coastlines that appear only to people with something to lose.",
    genre: "Fantasy",
    format: "Novel",
    status: "Complete",
    rating: "Teen+",
    readTime: "5h 25m",
    chapters: 21,
    sparks: 247,
    cover: "https://images.unsplash.com/photo-1518063319782-b7d6052dc345?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 5,
    title: "The Hollow Depths",
    author: "Abysswalker",
    hook: "A deep-sea mining colony goes dark, and the rescue crew finds prayers carved into steel.",
    genre: "Science Fiction",
    format: "Adventure",
    status: "Ongoing",
    rating: "Mature",
    readTime: "2h 20m",
    chapters: 8,
    sparks: 134,
    cover: "https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 6,
    title: "The Moonlit Ordinary",
    author: "Anika Vale",
    hook: "A bakery, a broken telescope, and the quiet ache of choosing a life that fits.",
    genre: "Slice of Life",
    format: "Novel",
    status: "Complete",
    rating: "All Ages",
    readTime: "2h 05m",
    chapters: 12,
    sparks: 421,
    cover: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=900&auto=format&fit=crop",
  },
];

const QUICK_FILTERS = ["For You", "Rising", "Complete", "Short Reads", "Adventures", "New"];
const GENRES = ["All", "Fantasy", "Science Fiction", "Mystery", "Cyberpunk", "Slice of Life"];
const FORMATS = ["All", "Novel", "Serial", "Adventure"];

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h12M2 12h12" />
      <circle cx="6" cy="4" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
    </svg>
  );
}

function ShelfHeader({ label, action }: { label: string; action?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">Curated Shelf</p>
        <h2 className="font-display text-[22px] text-paper leading-tight">{label}</h2>
      </div>
      {action && (
        <button className="text-[12px] text-amber hover:text-paper transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}

function StoryListCard({ story, compact = false }: { story: Story; compact?: boolean }) {
  return (
    <article className="group bg-surface/70 border border-border rounded-lg overflow-hidden hover:border-amber/25 hover:bg-elevated/70 transition-all">
      <div className="flex gap-4 p-3">
        <div className={`${compact ? "w-16" : "w-20"} aspect-[2/3] rounded-md overflow-hidden bg-elevated flex-shrink-0 relative`}>
          <Image
            src={story.cover}
            alt=""
            fill
            sizes={compact ? "64px" : "80px"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {story.sponsored && (
              <span className="px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20 text-[10px] font-medium uppercase tracking-[0.1em]">
                Sponsored
              </span>
            )}
            <span className="text-[10px] uppercase tracking-[0.1em] text-text-ghost">{story.format}</span>
          </div>

          <h3 className="font-display text-[17px] text-paper leading-snug group-hover:text-amber transition-colors">
            {story.title}
          </h3>
          <p className="text-[12px] text-text-secondary mt-0.5">by {story.author}</p>

          {!compact && (
            <p className="text-[13px] text-text-secondary leading-relaxed mt-2 line-clamp-2">
              {story.hook}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 text-[11px] text-text-tertiary">
            <span className="text-text-secondary">{story.genre}</span>
            <span className="text-text-ghost">·</span>
            <span>{story.status}</span>
            <span className="text-text-ghost">·</span>
            <span>{story.readTime}</span>
            <span className="text-text-ghost">·</span>
            <span className="inline-flex items-center gap-1 text-amber/80"><SparkIcon />{story.sparks}</span>
          </div>

          {story.sponsorLine && (
            <p className="mt-2 text-[11px] text-text-ghost">{story.sponsorLine}</p>
          )}
        </div>
      </div>
    </article>
  );
}

function SponsoredHero({ story }: { story: Story }) {
  return (
    <Link href="/story/obsidian-crown" className="block group">
      <article className="relative min-h-[310px] overflow-hidden rounded-lg border border-amber/20 bg-surface">
        <Image
          src={story.cover}
          alt=""
          fill
          sizes="(min-width: 1280px) 760px, 100vw"
          className="object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-void/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />

        <div className="relative z-10 flex min-h-[310px] max-w-2xl flex-col justify-end p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber text-void text-[10px] font-semibold uppercase tracking-[0.12em]">
              Sponsored
            </span>
            <span className="px-2.5 py-1 rounded-full bg-void/70 border border-border text-text-secondary text-[10px] uppercase tracking-[0.12em]">
              Top Placement
            </span>
          </div>
          <h2 className="font-display text-[34px] sm:text-[42px] leading-[1.02] text-paper max-w-xl">
            {story.title}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-text-secondary max-w-xl">
            {story.hook}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] text-text-secondary">
            <span>by {story.author}</span>
            <span className="text-text-ghost">·</span>
            <span>{story.genre}</span>
            <span className="text-text-ghost">·</span>
            <span>{story.readTime}</span>
            <span className="inline-flex items-center gap-1 text-amber"><SparkIcon />{story.sparks}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function BrowseRedesignMockup() {
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("For You");
  const [genre, setGenre] = useState("All");
  const [format, setFormat] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState("Recommended");

  const filteredStories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return STORIES.filter((story) => {
      const matchesQuery = !needle || [story.title, story.author, story.hook, story.genre].join(" ").toLowerCase().includes(needle);
      const matchesGenre = genre === "All" || story.genre === genre;
      const matchesFormat = format === "All" || story.format === format;
      const matchesQuick = quickFilter === "For You"
        || (quickFilter === "Complete" && story.status === "Complete")
        || (quickFilter === "Adventures" && story.format === "Adventure")
        || (quickFilter === "New" && story.status === "New")
        || quickFilter === "Rising"
        || quickFilter === "Short Reads";
      return matchesQuery && matchesGenre && matchesFormat && matchesQuick;
    }).sort((a, b) => sort === "Most Sparked" ? b.sparks - a.sparks : a.id - b.id);
  }, [format, genre, query, quickFilter, sort]);

  const sponsoredStories = STORIES.filter((story) => story.sponsored);
  const organicStories = filteredStories.filter((story) => !story.sponsored);
  const hasActiveDiscovery = !query && genre === "All" && format === "All" && quickFilter === "For You";

  return (
    <main className="min-h-screen bg-void text-text pt-20 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="mb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-2">Reader Marketplace</p>
              <h1 className="font-display text-[34px] sm:text-[44px] leading-tight text-paper">Browse Stories</h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-secondary">
                A cleaner discovery surface with featured launches, organic shelves, and fast filtering for readers who already know what they want.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface/70 p-5 w-full lg:w-[360px]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">Featured Reads</p>
              <h2 className="font-display text-[22px] leading-tight text-paper">Promoted stories, clearly labeled</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                Sponsored launches can appear above organic shelves, but reader filters and comfort ratings still apply.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-amber/20 bg-amber/[0.06] px-3 py-1.5 text-[11px] text-amber">
                  Sponsored label
                </span>
                <span className="rounded-full border border-border bg-elevated px-3 py-1.5 text-[11px] text-text-secondary">
                  Filter-safe placement
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="sticky top-14 z-30 -mx-4 mb-7 border-y border-border bg-void/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost"><SearchIcon /></div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stories, authors, worlds..."
                className="w-full rounded-lg border border-border bg-surface px-9 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setQuickFilter(filter)}
                  className={`whitespace-nowrap rounded-lg border px-3 py-2 text-[12px] transition-all ${
                    quickFilter === filter
                      ? "border-amber/30 bg-amber/[0.06] text-amber"
                      : "border-border bg-surface text-text-secondary hover:text-paper"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-text-secondary hover:text-paper transition-colors lg:hidden"
            >
              <SlidersIcon />
              Filters
            </button>
          </div>
        </section>

        <div className="grid gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <AnimatePresence>
            {(showFilters || true) && (
              <motion.aside
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className={`${showFilters ? "block" : "hidden"} h-fit rounded-lg border border-border bg-surface/70 p-4 lg:sticky lg:top-32 lg:block`}
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="font-display text-[17px] text-paper">Filters</h2>
                  <button className="text-[12px] text-amber hover:text-paper transition-colors" onClick={() => { setGenre("All"); setFormat("All"); setQuickFilter("For You"); }}>
                    Reset
                  </button>
                </div>

                <div className="mt-5 space-y-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">Genre</label>
                    <div className="space-y-1">
                      {GENRES.map((item) => (
                        <button
                          key={item}
                          onClick={() => setGenre(item)}
                          className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[12px] transition-colors ${
                            genre === item ? "bg-amber/[0.06] text-amber" : "text-text-secondary hover:bg-elevated hover:text-paper"
                          }`}
                        >
                          <span>{item}</span>
                          <span className="text-[10px] text-text-ghost">{item === "All" ? STORIES.length : STORIES.filter((story) => story.genre === item).length}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FORMATS.map((item) => (
                        <button
                          key={item}
                          onClick={() => setFormat(item)}
                          className={`rounded-lg border px-2 py-2 text-[12px] transition-all ${
                            format === item
                              ? "border-amber/30 bg-amber/[0.06] text-amber"
                              : "border-border text-text-secondary hover:text-paper"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">Placement Rules</label>
                    <div className="rounded-lg bg-elevated p-3 text-[12px] leading-relaxed text-text-secondary">
                      Sponsored cards are labeled, capped at two top spots, and never appear inside reader safety filters they do not match.
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <div className="min-w-0 space-y-8">
            {hasActiveDiscovery && (
              <>
                <section className="space-y-4">
                  <ShelfHeader label="Sponsored Openings" action="Advertise here" />
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.7fr)]">
                    <SponsoredHero story={sponsoredStories[0]} />
                    <div className="space-y-3">
                      {sponsoredStories.slice(1).map((story) => (
                        <StoryListCard key={story.id} story={story} compact />
                      ))}
                      <div className="rounded-lg border border-dashed border-border bg-surface/40 p-4">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">Available Slot</p>
                        <p className="font-display text-[17px] text-paper">Promoted shelf card</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                          Reserve for launches, paid boosts, publisher campaigns, or creator self-promotion.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <ShelfHeader label="Rising Without Promotion" action="See all" />
                  <div className="grid gap-3 md:grid-cols-2">
                    {STORIES.filter((story) => !story.sponsored).slice(0, 4).map((story) => (
                      <StoryListCard key={story.id} story={story} />
                    ))}
                  </div>
                </section>
              </>
            )}

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">Results</p>
                  <h2 className="font-display text-[22px] text-paper">
                    {filteredStories.length} matching {filteredStories.length === 1 ? "story" : "stories"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {["Recommended", "Most Sparked", "Newest"].map((item) => (
                    <button
                      key={item}
                      onClick={() => setSort(item)}
                      className={`rounded-lg px-3 py-2 text-[11px] transition-all ${
                        sort === item ? "bg-elevated text-paper" : "text-text-ghost hover:text-text-secondary"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {filteredStories.map((story) => (
                  <StoryListCard key={story.id} story={story} />
                ))}
              </div>

              {organicStories.length > 0 && (
                <div className="rounded-lg border border-border bg-surface/50 p-4 text-[12px] leading-relaxed text-text-secondary">
                  Organic ranking starts after the sponsored cap. Paid cards are visually labeled and included in result counts only when they match the reader&apos;s active filters.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
