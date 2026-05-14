"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const featuredStories = [
  {
    title: "The Glass Orchard",
    author: "Mira Vale",
    image: "/solo_story_mode.png",
    genre: "Fantasy",
    format: "Serial",
    readTime: "11 min",
    activity: "2.4k sparks",
    accentClass: "bg-amber/15 text-amber",
    excerpt:
      "A botanist finds fruit that remembers every hand that has ever held it.",
  },
  {
    title: "Signal Beneath the Ice",
    author: "Jon Aster",
    image: "/coop_story_mode.png",
    genre: "Sci-Fi",
    format: "Co-op",
    readTime: "8 min",
    activity: "Live draft",
    accentClass: "bg-teal/15 text-teal",
    excerpt:
      "Two crews decode the same distress call from opposite ends of a frozen moon.",
  },
  {
    title: "Crown of Ash",
    author: "Nelle Rowan",
    image: "/adventure_mode.png",
    genre: "Adventure",
    format: "Session",
    readTime: "Live",
    activity: "413 watching",
    accentClass: "bg-lavender/15 text-lavender",
    excerpt:
      "The party has one vote left before the city chooses its next monster.",
  },
];

const pulseItems = [
  { label: "Sparks", value: "18.2k", color: "text-amber" },
  { label: "Comments", value: "4.7k", color: "text-teal" },
  { label: "Live rooms", value: "23", color: "text-lavender" },
  { label: "Published", value: "312", color: "text-sage" },
];

const feedItems = [
  {
    type: "New chapter",
    title: "The City Learns Your Name",
    meta: "Fantasy · 6 min read",
    color: "bg-amber",
  },
  {
    type: "Reader vote",
    title: "Choose the next suspect",
    meta: "Mystery · closes in 2h",
    color: "bg-teal",
  },
  {
    type: "Creator drop",
    title: "Behind the map of Crown of Ash",
    meta: "Supporter-only · 9 images",
    color: "bg-lavender",
  },
];

function AccentDot({ color }: { color: string }) {
  return <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden />;
}

export default function ModernProofPage() {
  return (
    <main className="min-h-screen bg-void text-paper">
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--t-gold-glow),transparent_38%)]" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-teal/10 blur-3xl" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex h-14 items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber" viewBox="0 0 32 32" fill="none">
                <path
                  d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z"
                  fill="currentColor"
                  opacity="0.9"
                />
              </svg>
              <span className="font-display text-[18px] font-semibold tracking-wide">
                Quiloria
              </span>
            </Link>

            <div className="hidden items-center gap-1 rounded-full border border-border bg-surface/50 p-1 md:flex">
              {["For You", "Live", "Genres", "Creators"].map((item, index) => (
                <button
                  key={item}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors ${
                    index === 0
                      ? "bg-paper text-void"
                      : "text-text-secondary hover:bg-elevated hover:text-paper"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/demo/try"
                className="hidden rounded-full border border-border-active px-4 py-2 text-[12px] font-semibold text-text hover:border-teal/40 hover:text-paper sm:inline-flex"
              >
                Try editor
              </Link>
              <Link
                href="/register?intent=read"
                className="rounded-full bg-amber px-4 py-2 text-[12px] font-bold text-void shadow-lg shadow-amber/10 transition-colors hover:bg-amber-light"
              >
                Join free
              </Link>
            </div>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:py-6">
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal/10 px-3 py-1.5 text-[12px] font-medium text-teal">
                <AccentDot color="bg-teal" />
                Social discovery mode concept
              </div>
              <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-normal text-paper sm:text-6xl lg:text-7xl">
                Stories that move as fast as your feed.
              </h1>
              <p className="mt-5 max-w-lg text-[16px] leading-7 text-text-secondary">
                A sharper Quiloria surface for discovery: brighter content,
                clearer actions, and distinct color roles for reading, live
                collaboration, creator support, and writing.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demo/try"
                  className="inline-flex items-center justify-center rounded-full bg-amber px-6 py-3 text-[14px] font-bold text-void shadow-xl shadow-amber/10 transition-transform hover:scale-[1.02]"
                >
                  Start writing free
                </Link>
                <Link
                  href="/browse"
                  className="inline-flex items-center justify-center rounded-full border border-border-active bg-surface/40 px-6 py-3 text-[14px] font-semibold text-paper transition-colors hover:border-teal/40 hover:bg-teal/10"
                >
                  Explore stories
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {pulseItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border bg-surface/45 px-4 py-3"
                  >
                    <div className={`font-display text-[24px] font-semibold ${item.color}`}>
                      {item.value}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-text-ghost">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[32px] border border-border-subtle bg-surface/20 blur-2xl" />
              <div className="relative grid gap-4 md:grid-cols-[1fr_0.82fr]">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                  className="overflow-hidden rounded-2xl border border-border-active bg-ink shadow-modal"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={featuredStories[0].image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 42vw, 100vw"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-void via-void/25 to-transparent" />
                    <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                      <span className="rounded-full bg-void/70 px-3 py-1 text-[11px] font-semibold text-amber backdrop-blur">
                        Trending now
                      </span>
                      <span className="rounded-full bg-rose px-3 py-1 text-[11px] font-bold text-paper">
                        Live reactions
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-amber/15 px-2.5 py-1 text-[11px] font-semibold text-amber">
                          Fantasy
                        </span>
                        <span className="rounded-full bg-teal/15 px-2.5 py-1 text-[11px] font-semibold text-teal">
                          11 min
                        </span>
                      </div>
                      <h2 className="font-display text-4xl font-semibold leading-none">
                        The Glass Orchard
                      </h2>
                      <p className="mt-3 text-[13px] leading-5 text-text">
                        A botanist finds fruit that remembers every hand that
                        has ever held it.
                      </p>
                      <div className="mt-5 flex items-center gap-2">
                        <button className="rounded-full bg-paper px-4 py-2 text-[12px] font-bold text-void">
                          Read now
                        </button>
                        <button className="rounded-full border border-border-active px-4 py-2 text-[12px] font-semibold text-paper">
                          Follow
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-border bg-surface/60 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-display text-[20px] font-semibold">Live pulse</h2>
                      <span className="rounded-full bg-teal/15 px-2.5 py-1 text-[11px] font-semibold text-teal">
                        23 rooms
                      </span>
                    </div>
                    <div className="space-y-3">
                      {feedItems.map((item) => (
                        <div
                          key={item.title}
                          className="flex gap-3 rounded-xl border border-border-subtle bg-ink/50 p-3"
                        >
                          <AccentDot color={item.color} />
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                              {item.type}
                            </div>
                            <div className="mt-1 truncate text-[13px] font-semibold text-paper">
                              {item.title}
                            </div>
                            <div className="mt-0.5 text-[12px] text-text-secondary">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-lavender/25 bg-lavender/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavender text-void">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-paper">Reader choice is open</p>
                        <p className="text-[12px] text-text-secondary">Vote on the next plot turn.</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-paper px-3 py-2 text-[12px] font-bold text-void">
                        Betrayal
                      </button>
                      <button className="rounded-xl border border-lavender/30 px-3 py-2 text-[12px] font-bold text-lavender">
                        Alliance
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-ghost">
              Content first
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">Swipe-speed story cards</h2>
          </div>
          <Link href="/browse" className="text-[13px] font-semibold text-teal hover:text-paper">
            Browse all
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featuredStories.map((story) => (
            <article
              key={story.title}
              className="group overflow-hidden rounded-2xl border border-border bg-surface/50 transition-colors hover:border-border-active"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={story.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void/80 to-transparent" />
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${story.accentClass}`}>
                    {story.genre}
                  </span>
                  <span className="rounded-full bg-void/70 px-2.5 py-1 text-[11px] font-semibold text-paper">
                    {story.format}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-[22px] font-semibold leading-tight">
                      {story.title}
                    </h3>
                    <p className="mt-1 text-[12px] text-text-secondary">by {story.author}</p>
                  </div>
                  <button className="rounded-full border border-border p-2 text-text-secondary transition-colors hover:border-rose/40 hover:bg-rose/10 hover:text-rose">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 13s-5-3-5-7a3 3 0 015-2 3 3 0 015 2c0 4-5 7-5 7z" />
                    </svg>
                  </button>
                </div>
                <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-text">
                  {story.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-[12px] text-text-secondary">
                  <span>{story.readTime}</span>
                  <span>{story.activity}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
