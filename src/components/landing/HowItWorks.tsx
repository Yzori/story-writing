"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Write",
    description:
      "Start a story solo or set up a collaborative project. Define your terms, your genre, your world — then put pen to paper.",
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M22 4l6 6-16 16H6v-6L22 4z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M18 8l6 6" strokeLinecap="round" />
        <path d="M6 26h20" strokeLinecap="round" opacity="0.3" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Collaborate",
    description:
      "Invite co-authors, branch your narrative, let readers vote on the plot. Stories grow richer with more voices.",
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="16" cy="6" r="3" />
        <circle cx="7" cy="26" r="3" />
        <circle cx="25" cy="26" r="3" />
        <path d="M16 9v6M16 15l-7 8M16 15l7 8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Share",
    description:
      "Publish chapters as they're written. Grow your audience, connect with artists, and watch your story find its people.",
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M4 20c0-6.627 5.373-12 12-12s12 5.373 12 12"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M8 20c0-4.418 3.582-8 8-8s8 3.582 8 8"
          strokeLinecap="round"
          opacity="0.6"
        />
        <circle cx="16" cy="20" r="3" fill="currentColor" stroke="none" />
        <path d="M16 23v5" strokeLinecap="round" strokeWidth="2" />
        <path d="M13 26l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-walnut/20 to-ink pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            How it works
          </h2>
          <p className="mt-5 text-linen/50 text-lg">
            From first draft to shared universe, in three steps.
          </p>
        </motion.div>

        <div className="relative grid md:grid-cols-3 gap-16 md:gap-8">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-[3.5rem] left-[20%] right-[20%] h-px">
            <motion.div
              className="h-full bg-gradient-to-r from-amber/40 via-espresso to-amber/40"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.5, ease: "easeInOut" }}
              style={{ transformOrigin: "left" }}
            />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.2 }}
              className="text-center relative"
            >
              {/* Circle icon */}
              <div className="w-28 h-28 mx-auto rounded-full bg-walnut/60 border border-espresso/60 flex items-center justify-center text-amber relative z-10 shadow-lg shadow-ink/50">
                {step.icon}
              </div>

              {/* Step number */}
              <span className="inline-block mt-6 text-xs text-amber/50 font-mono tracking-[0.3em]">
                {step.number}
              </span>

              {/* Title */}
              <h3 className="font-display text-2xl font-bold mt-2 mb-4">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-linen/40 leading-relaxed text-[0.95rem] max-w-xs mx-auto">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
