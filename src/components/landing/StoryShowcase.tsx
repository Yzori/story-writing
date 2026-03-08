"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

const stories = [
  {
    title: "The Lighthouse at the Edge of Dreams",
    author: "Elena Voss",
    genres: ["Fantasy", "Mystery"],
    snippet:
      "In a town where dreams wash ashore like driftwood, one keeper tends the light that guides them home...",
    readers: "2.3k",
    gradient: "from-teal/80 via-teal/40 to-charcoal",
    live: true,
    collaborators: 3,
  },
  {
    title: "Roots & Ruin",
    author: "Marcus Chen",
    genres: ["Literary Fiction"],
    snippet:
      "Three generations of silence break when a letter arrives from a grandmother presumed dead...",
    readers: "1.8k",
    gradient: "from-violet/70 via-violet/30 to-charcoal",
    live: false,
    collaborators: 1,
  },
  {
    title: "Binary Stars",
    author: "Aisha Patel & James Liu",
    genres: ["Sci-Fi", "Romance"],
    snippet:
      "Two astronauts, separated by light-years, discover their missions were never what they seemed...",
    readers: "4.1k",
    gradient: "from-amber/70 via-burnt/40 to-charcoal",
    live: true,
    collaborators: 2,
  },
  {
    title: "The Cartographer's Daughter",
    author: "Sophie Blackwood",
    genres: ["Historical", "Fantasy"],
    snippet:
      "She inherited her father's maps, but the territories they charted don't exist on any known continent...",
    readers: "3.6k",
    gradient: "from-burnt/70 via-amber-dark/40 to-charcoal",
    live: true,
    collaborators: 4,
  },
];

function BookCard({
  story,
  index,
}: {
  story: (typeof stories)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rawRotateX = useTransform(mouseY, [0, 1], [10, -10]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-10, 10]);
  const rotateX = useSpring(rawRotateX, { stiffness: 200, damping: 25 });
  const rotateY = useSpring(rawRotateY, { stiffness: 200, damping: 25 });

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: index * 0.12 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className="group cursor-pointer flex-shrink-0"
    >
      <div className="relative h-[440px] w-[290px] rounded-xl overflow-hidden shadow-2xl shadow-ink/90 transition-shadow duration-500 group-hover:shadow-ink/50 group-hover:shadow-3xl">
        {/* Spine */}
        <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-black/50 via-black/20 to-transparent z-20" />

        {/* Page edges (right side) */}
        <div className="absolute right-0 top-3 bottom-3 w-[3px] z-20 flex flex-col gap-[1px]">
          <div className="flex-1 bg-parchment/15 rounded-r-sm" />
          <div className="flex-1 bg-parchment/10 rounded-r-sm" />
          <div className="flex-1 bg-parchment/15 rounded-r-sm" />
        </div>

        {/* Cover gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${story.gradient}`}
        />

        {/* Cover texture */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />

        {/* Dark overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-7">
          {/* Top area */}
          <div className="flex items-start justify-between">
            <div className="flex flex-wrap gap-1.5">
              {story.genres.map((g) => (
                <span
                  key={g}
                  className="text-[0.65rem] px-2.5 py-1 rounded-full bg-cream/10 text-cream/60 backdrop-blur-sm font-medium tracking-wide uppercase"
                >
                  {g}
                </span>
              ))}
            </div>
            {story.live && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="w-1.5 h-1.5 bg-amber rounded-full animate-pulse" />
                <span className="text-[0.65rem] text-amber font-medium tracking-wide">
                  LIVE
                </span>
              </div>
            )}
          </div>

          {/* Bottom area */}
          <div>
            <h3 className="font-display text-[1.35rem] font-bold leading-snug mb-2">
              {story.title}
            </h3>
            <p className="text-sm text-cream/50 mb-4">by {story.author}</p>
            <p className="text-[0.8rem] text-cream/35 leading-relaxed italic line-clamp-2">
              &ldquo;{story.snippet}&rdquo;
            </p>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-cream/8">
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 text-cream/30"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 3C4.5 3 1.7 5.5 1 8c.7 2.5 3.5 5 7 5s6.3-2.5 7-5c-.7-2.5-3.5-5-7-5zm0 8a3 3 0 110-6 3 3 0 010 6z" />
                  <circle cx="8" cy="8" r="1.5" />
                </svg>
                <span className="text-xs text-cream/35">
                  {story.readers} readers
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 text-cream/30"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 2a3 3 0 100 6 3 3 0 000-6zM3 12c0-2 2-3.5 5-3.5s5 1.5 5 3.5v1H3v-1z" />
                </svg>
                <span className="text-xs text-cream/35">
                  {story.collaborators} writer
                  {story.collaborators > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function StoryShowcase() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            Stories being written{" "}
            <span className="text-amber italic">right now</span>
          </h2>
          <p className="mt-5 text-linen/50 text-lg">
            Dive into worlds still taking shape.
          </p>
        </motion.div>

        <div
          className="flex flex-wrap justify-center gap-8 lg:gap-10"
          style={{ perspective: "1200px" }}
        >
          {stories.map((story, i) => (
            <BookCard key={story.title} story={story} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
