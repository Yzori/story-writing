"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "12,000+", label: "Writers" },
  { value: "3,400", label: "Stories in progress" },
  { value: "850", label: "Collaborations" },
];

export default function Community() {
  return (
    <section className="relative py-36 px-6 overflow-hidden">
      {/* Layered warm background */}
      <div className="absolute inset-0 bg-gradient-to-br from-walnut via-charcoal to-ink" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />

      {/* Warm glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber/[0.06] rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-burnt/[0.04] rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.h2
          className="font-display text-4xl md:text-6xl lg:text-7xl font-bold"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Pull up a chair
        </motion.h2>

        <motion.p
          className="mt-6 text-lg md:text-xl text-linen/50 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          Join a growing community of writers, artists, and readers who believe
          the best stories are the ones we create together.
        </motion.p>

        {/* Stats */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-12 sm:gap-16 mt-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          {stats.map((stat, i) => (
            <div key={stat.label} className="relative">
              <div className="font-display text-4xl md:text-5xl font-bold text-amber">
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-linen/40 tracking-wide">
                {stat.label}
              </div>
              {/* Divider (not on last) */}
              {i < stats.length - 1 && (
                <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -right-8 sm:-right-8 w-px h-12 bg-espresso/60" />
              )}
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.45 }}
        >
          <a
            href="/register"
            className="group relative inline-block px-10 py-4 bg-amber text-ink font-semibold rounded-full text-lg transition-all duration-300 hover:bg-amber-light hover:shadow-2xl hover:shadow-amber/25 hover:scale-[1.04] overflow-hidden"
          >
            <span className="relative z-10">Join the Story</span>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-light via-amber to-burnt opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </a>
          <p className="mt-5 text-sm text-linen/25">
            Free forever. No credit card needed.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
