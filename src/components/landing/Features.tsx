"use client";

import { motion } from "framer-motion";

const features = [
  {
    title: "Write Together",
    description:
      "Branch your story like code. Co-author in real-time or async, propose edits as merge requests, and maintain a full history of every narrative twist.",
    icon: (
      <svg
        className="w-10 h-10"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M20 4v12" strokeLinecap="round" />
        <path
          d="M20 16c-5 0-8 4-8 8v10"
          strokeLinecap="round"
        />
        <path
          d="M20 16c5 0 8 4 8 8v10"
          strokeLinecap="round"
        />
        <circle cx="20" cy="4" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="34" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="28" cy="34" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "Readers Shape the Story",
    description:
      "Embed polls and decision points in your chapters. Readers vote on plot twists, character fates, and branching paths. Your story becomes a living, breathing world.",
    icon: (
      <svg
        className="w-10 h-10"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M20 6v10M20 24v10M6 20h10M24 20h10"
          strokeLinecap="round"
        />
        <path
          d="M11 11l6 6M23 11l-6 6M11 29l6-6M23 29l-6 6"
          strokeLinecap="round"
          opacity="0.4"
        />
        <circle cx="20" cy="20" r="4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "Connect Creatives",
    description:
      "Find your artist, editor, or worldbuilder. Post roles, join story jams, and forge creative partnerships that bring visions to life across disciplines.",
    icon: (
      <svg
        className="w-10 h-10"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="15" cy="14" r="5" />
        <circle cx="25" cy="14" r="5" />
        <path
          d="M7 32c0-5 4-9 8-9h2"
          strokeLinecap="round"
        />
        <path
          d="M33 32c0-5-4-9-8-9h-2"
          strokeLinecap="round"
        />
        <path
          d="M20 23v6M17 26h6"
          strokeLinecap="round"
          strokeWidth="2"
          opacity="0.5"
        />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section id="explore" className="relative py-32 px-6">
      {/* Subtle section gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-charcoal/30 to-ink pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            A new kind of{" "}
            <span className="text-amber">writing platform</span>
          </h2>
          <p className="mt-5 text-linen/50 text-lg max-w-xl mx-auto leading-relaxed">
            Built for the way stories actually come to life — together,
            unpredictably, and beautifully.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group relative p-8 lg:p-10 rounded-2xl bg-walnut/40 border border-espresso/40 hover:border-amber/25 transition-all duration-700 hover:bg-walnut/60"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(ellipse_at_top,rgba(212,165,116,0.06),transparent_70%)]" />

              <div className="relative">
                <div className="text-linen/70 group-hover:text-amber transition-colors duration-500">
                  {feature.icon}
                </div>
                <h3 className="font-display text-2xl font-bold mt-7 mb-4">
                  {feature.title}
                </h3>
                <p className="text-linen/45 leading-relaxed text-[0.95rem]">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
