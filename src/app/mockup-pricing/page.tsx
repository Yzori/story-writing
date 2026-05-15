"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

// ── Data ────────────────────────────────────────────────────

type Interval = "monthly" | "yearly";

interface Tier {
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  cta: { label: string; href: string };
  popular?: boolean;
}

const TIERS: Tier[] = [
  {
    name: "Apprentice",
    tagline: "for getting started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Unlimited stories, three open at a time",
      "Write in any of five formats — novel, poetry, screenplay, webtoon, illustrated",
      "The clean writing canvas, autosave that respects drafts",
      "Seven days of version history",
      "Story Bible for your first ten characters",
      "Publish to readers and see how stories land",
      "Earn Ink Drops when readers love your work",
    ],
    cta: { label: "Sign up — free", href: "/register" },
  },
  {
    name: "Author",
    tagline: "for writers who mean it",
    monthlyPrice: 9.99,
    yearlyPrice: 8.29,
    popular: true,
    features: [
      "A writing companion that helps you find the next sentence — fifty conversations a day",
      "Deep reader stats — who arrives, who returns, who finishes",
      "Unlimited version history. Nothing ever lost.",
      "Export your work to PDF, EPUB, or DOCX",
      "Co-write live with up to three collaborators",
      "Reader polls and reactions, on every chapter",
      "Priority support from a real human",
    ],
    cta: { label: "Become an Author", href: "/register" },
  },
  {
    name: "Master",
    tagline: "for working professionals",
    monthlyPrice: 29.99,
    yearlyPrice: 24.99,
    features: [
      "Unlimited writing companion — whenever you're stuck",
      "Catches plot holes and timeline slips before your readers do",
      "Spots when a chapter loses pace or a character drifts",
      "Full writers' rooms with unlimited co-authors",
      "Track changes and a proper revision mode",
      "Your own author site, hosted on Quiloria",
      "Access to commissions and editorial work",
      "An account manager who knows your work",
    ],
    cta: { label: "Become a Master", href: "/register" },
  },
];

interface ComparisonRow {
  category: string;
  feature: string;
  apprentice: string | boolean;
  author: string | boolean;
  master: string | boolean;
}

const COMPARISON: ComparisonRow[] = [
  { category: "Writing", feature: "Active stories at a time", apprentice: "Three", author: "Unlimited", master: "Unlimited" },
  { category: "Writing", feature: "Story formats", apprentice: "All five", author: "All five", master: "All five" },
  { category: "Writing", feature: "Version history", apprentice: "Seven days", author: "Unlimited", master: "Unlimited" },
  { category: "Writing", feature: "Track changes & revisions", apprentice: false, author: false, master: true },
  { category: "Writing companion", feature: "AI conversations", apprentice: false, author: "Fifty a day", master: "Unlimited" },
  { category: "Writing companion", feature: "Catches plot holes", apprentice: false, author: false, master: true },
  { category: "Writing companion", feature: "Pacing & arc analysis", apprentice: false, author: false, master: true },
  { category: "Together", feature: "Co-authors", apprentice: "One", author: "Three", master: "Unlimited" },
  { category: "Together", feature: "Reader polls", apprentice: true, author: true, master: true },
  { category: "Together", feature: "Live writers' rooms", apprentice: false, author: true, master: true },
  { category: "Publishing", feature: "Publish to readers", apprentice: true, author: true, master: true },
  { category: "Publishing", feature: "Export PDF / EPUB / DOCX", apprentice: false, author: true, master: true },
  { category: "Publishing", feature: "Custom author site", apprentice: false, author: false, master: true },
  { category: "Publishing", feature: "Commissions marketplace", apprentice: false, author: false, master: true },
  { category: "Earning", feature: "Ink Drops (reader tips)", apprentice: true, author: true, master: true },
  { category: "Earning", feature: "Reader subscriptions", apprentice: false, author: true, master: true },
  { category: "Earning", feature: "Chapter unlocks", apprentice: false, author: true, master: true },
  { category: "Earning", feature: "Writer keeps", apprentice: "92¢ / $1", author: "92¢ / $1", master: "92¢ / $1" },
  { category: "Support", feature: "Help from the team", apprentice: "Email", author: "Priority", master: "Priority" },
  { category: "Support", feature: "Account manager", apprentice: false, author: false, master: true },
];

const FAQ = [
  {
    q: "What happens to my stories if I downgrade?",
    a: "They stay with you, exactly as they were. We just pause access to features your new tier doesn't cover — your writing, drafts, history, and readers all remain.",
  },
  {
    q: "Can I cancel any time?",
    a: "Any time. No questions, no retention scripts. Your tier stays active until the end of the period you've already paid for.",
  },
  {
    q: "What are Ink Drops?",
    a: "Ink Drops are how readers say thanks. A reader can drop a few alongside a chapter they loved; you receive 92¢ of every dollar's worth. They&apos;re built in — no plugins, no payout middlemen between you and your audience.",
  },
  {
    q: "What if I hit my AI conversation limit?",
    a: "You can wait until the next day, or buy a small top-up of additional conversations. You'll never be silently cut off mid-sentence.",
  },
  {
    q: "Can co-authors be on different tiers?",
    a: "Yes. Each writer brings their own tier to the room. If one collaborator is on Master, the whole room gets the Master tools; everyone else just shows up and writes.",
  },
  {
    q: "Is reading paid?",
    a: "No. Reading is always free. Quiloria is paid by writers for the tools they use; readers never need a subscription to browse the library.",
  },
];

// ── Decorative helpers (from homepage v2) ──────────────────

function BrassCorners() {
  return (
    <>
      <div className="absolute top-0 left-0 w-6 h-6 z-10 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-gold/55">
          <path d="M0 6V0h6" stroke="currentColor" strokeWidth="1.25" />
          <path d="M0 0l4 4" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-6 h-6 z-10 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-gold/55">
          <path d="M24 6V0h-6" stroke="currentColor" strokeWidth="1.25" />
          <path d="M24 0l-4 4" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-6 h-6 z-10 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-gold/55">
          <path d="M0 18v6h6" stroke="currentColor" strokeWidth="1.25" />
          <path d="M0 24l4-4" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-6 h-6 z-10 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-gold/55">
          <path d="M24 18v6h-6" stroke="currentColor" strokeWidth="1.25" />
          <path d="M24 24l-4-4" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </div>
    </>
  );
}

function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none opacity-[0.075] bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20baseFrequency%3D%220.02%200.85%22%20numOctaves%3D%223%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')] bg-repeat bg-[length:256px_256px]"
    />
  );
}

function CandlelightAtmosphere() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse 75% 65% at top left, rgba(232, 190, 94, 0.20) 0%, transparent 65%), radial-gradient(ellipse 90% 80% at bottom right, rgba(8, 5, 2, 0.32) 0%, transparent 60%)",
      }}
    />
  );
}

// ── Hero ────────────────────────────────────────────────────

function Hero({ interval, onIntervalChange }: { interval: Interval; onIntervalChange: (v: Interval) => void }) {
  return (
    <section className="relative pt-32 md:pt-40 pb-10 md:pb-12 px-6 text-center">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200,150,60,0.06) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <motion.p
        className="relative font-display italic text-text-tertiary text-[13px] mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        Three keys to the library
      </motion.p>
      <motion.h1
        className="relative font-display text-paper text-5xl md:text-[64px] leading-[1.05] tracking-tight font-medium max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        From first draft <span className="text-gold italic">to finished book</span>.
      </motion.h1>
      <motion.p
        className="relative mt-6 text-text-secondary text-base md:text-lg max-w-xl mx-auto font-reading italic leading-relaxed"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15 }}
      >
        Three tiers, all free to try. Switch any time — your stories stay with you regardless.
      </motion.p>

      {/* Monthly / yearly toggle */}
      <motion.div
        className="relative mt-10 inline-flex items-center gap-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <button
          type="button"
          onClick={() => onIntervalChange("monthly")}
          className={`font-display italic text-[14px] transition-colors ${
            interval === "monthly" ? "text-paper" : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={interval === "yearly"}
          aria-label="Toggle billing interval"
          onClick={() => onIntervalChange(interval === "monthly" ? "yearly" : "monthly")}
          className="relative w-12 h-6 rounded-full border border-gold/40 bg-[rgba(46,32,20,0.94)] transition-colors hover:border-gold/60"
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-gold transition-all duration-300 ${
              interval === "yearly" ? "left-[26px]" : "left-1"
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => onIntervalChange("yearly")}
          className={`font-display italic text-[14px] transition-colors flex items-center gap-2 ${
            interval === "yearly" ? "text-paper" : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          Yearly
          <span className="font-display italic text-gold/85 text-[12px] not-italic">save 17%</span>
        </button>
      </motion.div>
    </section>
  );
}

// ── Tier column (no card chrome) ───────────────────────────
// Three columns of typography on the same dark void, divided by
// faint vertical gold rails. No boxes, no fills, no borders around
// individual tiers. Featured tier highlighted by typography + a
// small fleuron + gold underline, not by a container.

function TierColumn({
  tier,
  interval,
  position,
}: {
  tier: Tier;
  interval: Interval;
  position: "first" | "middle" | "last";
}) {
  const price = interval === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;
  const isPopular = tier.popular;

  return (
    <div
      className={`relative px-6 md:px-8 py-2 h-full flex flex-col ${
        position !== "first" ? "md:border-l md:border-l-gold/15" : ""
      }`}
    >
      {/* Subtle warm glow concentrated behind the popular column */}
      {isPopular && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at center top, rgba(212, 168, 67, 0.07) 0%, transparent 70%)",
          }}
          aria-hidden
        />
      )}

      <div className="relative h-full flex flex-col">
        {isPopular && (
          <p className="font-display italic text-gold/85 text-[11px] tracking-wide mb-2.5 flex items-center gap-1.5">
            <span aria-hidden>❦</span>
            most chosen
          </p>
        )}

        <div className="mb-6">
          <h3
            className={`font-display italic text-paper font-medium leading-tight mb-2 ${
              isPopular ? "text-[36px]" : "text-[30px]"
            }`}
          >
            {tier.name}
          </h3>
          {isPopular && <div className="w-10 h-px bg-gold/55 mb-3" />}
          <p className="font-display italic text-text-secondary text-[13px]">{tier.tagline}</p>
        </div>

        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="font-display text-paper text-[52px] font-medium leading-none">
            ${price === 0 ? "0" : price.toFixed(2)}
          </span>
          {price > 0 && (
            <span className="font-display italic text-text-secondary text-[14px]">/month</span>
          )}
          {price === 0 && (
            <span className="font-display italic text-text-secondary text-[14px]">forever</span>
          )}
        </div>

        {interval === "yearly" && price > 0 && (
          <p className="font-display italic text-gold/70 text-[11px] mb-6">
            ${(price * 12).toFixed(2)} billed yearly
          </p>
        )}
        {!(interval === "yearly" && price > 0) && <div className="mb-6" />}

        <ul className="space-y-3 mb-8 flex-1">
          {tier.features.map((f, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[13.5px] font-reading italic text-text leading-[1.55]"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                className="text-gold/65 flex-shrink-0 mt-[5px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div>
          {isPopular ? (
            <Link
              href={tier.cta.href}
              className="block text-center py-3 px-6 bg-gold text-black hover:bg-gold-light transition-all duration-300 font-display italic text-[14px] shadow-[var(--t-shadow-card-hover)]"
            >
              {tier.cta.label}
            </Link>
          ) : (
            <Link
              href={tier.cta.href}
              className={`group/cta inline-flex items-center gap-1.5 font-display italic text-[14.5px] transition-colors duration-300 ${
                tier.monthlyPrice === 0
                  ? "text-paper hover:text-gold"
                  : "text-gold hover:text-paper"
              }`}
            >
              {tier.cta.label}
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="transition-transform duration-300 group-hover/cta:translate-x-1"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function PricingSection({ interval }: { interval: Interval }) {
  return (
    <section className="relative px-6 pb-16 md:pb-24">
      {/* Subtle warm wash across the entire pricing area */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 bottom-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at center top, rgba(212, 168, 67, 0.04) 0%, transparent 65%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
        >
          {TIERS.map((tier, i) => (
            <TierColumn
              key={tier.name}
              tier={tier}
              interval={interval}
              position={i === 0 ? "first" : i === TIERS.length - 1 ? "last" : "middle"}
            />
          ))}
        </motion.div>

        {/* Reader-side note */}
        <motion.p
          className="text-center mt-16 font-reading italic text-text-tertiary text-[13.5px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Reading is always free.{" "}
          <Link href="/browse" className="text-gold hover:text-gold-light transition-colors not-italic">
            Browse the library →
          </Link>
        </motion.p>
      </div>
    </section>
  );
}

// ── Comparison table ────────────────────────────────────────

function ComparisonValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className="text-gold/80 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (value === false) {
    return <span className="text-text-tertiary/50">—</span>;
  }
  return <span className="font-reading italic text-text text-[13px]">{value}</span>;
}

function ComparisonTable() {
  // Group rows by category
  const grouped = COMPARISON.reduce((acc, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push(row);
    return acc;
  }, {} as Record<string, ComparisonRow[]>);

  return (
    <section className="relative px-6 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <p className="font-display italic text-text-tertiary text-[13px] mb-3">side by side</p>
          <h2 className="font-display text-paper text-3xl sm:text-4xl italic leading-tight">
            What&apos;s in each tier
          </h2>
        </motion.div>

        <motion.div
          className="overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gold/25">
                <th className="text-left pb-4 pr-4 font-display italic text-text-tertiary text-[11px] uppercase tracking-[0.18em]">
                  Feature
                </th>
                <th className="text-center pb-4 px-4 font-display italic text-paper text-[14px]">
                  Apprentice
                </th>
                <th className="text-center pb-4 px-4 font-display italic text-gold text-[14px]">
                  Author
                </th>
                <th className="text-center pb-4 pl-4 font-display italic text-paper text-[14px]">
                  Master
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).flatMap(([category, rows]) => [
                <tr key={`${category}-header`}>
                  <td
                    colSpan={4}
                    className="pt-7 pb-3 font-display italic text-gold/80 text-[12px] tracking-wide"
                  >
                    {category}
                  </td>
                </tr>,
                ...rows.map((row, i) => (
                  <tr key={`${category}-row-${i}`} className="border-b border-gold/10">
                    <td className="py-3.5 pr-4 font-reading italic text-text text-[13.5px]">
                      {row.feature}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <ComparisonValue value={row.apprentice} />
                    </td>
                    <td className="py-3.5 px-4 text-center bg-gold/[0.02]">
                      <ComparisonValue value={row.author} />
                    </td>
                    <td className="py-3.5 pl-4 text-center">
                      <ComparisonValue value={row.master} />
                    </td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

// ── FAQ ─────────────────────────────────────────────────────

function FaqSection() {
  return (
    <section className="relative px-6 py-16 md:py-20">
      <div className="max-w-2xl mx-auto">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <p className="font-display italic text-text-tertiary text-[13px] mb-3">before you sign</p>
          <h2 className="font-display text-paper text-3xl sm:text-4xl italic leading-tight">
            Questions writers ask
          </h2>
        </motion.div>

        <motion.div
          className="space-y-1"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          {FAQ.map((item, i) => (
            <details key={i} className="group border-b border-gold/15">
              <summary className="cursor-pointer flex items-center justify-between py-5 list-none">
                <span className="font-display italic text-paper text-[16px]">{item.q}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-gold/60 flex-shrink-0 transition-transform duration-300 group-open:rotate-180 ml-4"
                >
                  <path d="M3 6l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="pb-5 pr-8 font-reading italic text-text text-[14px] leading-[1.7]">
                {item.a}
              </p>
            </details>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Final CTA ───────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="relative px-6 py-20 md:py-32 text-center">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200,150,60,0.06) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative max-w-2xl mx-auto">
        <motion.h2
          className="font-display text-paper text-4xl sm:text-5xl italic leading-tight"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Start writing for free.
        </motion.h2>
        <motion.p
          className="mt-5 text-text-secondary text-base md:text-lg font-reading italic leading-relaxed"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          Three tiers. No card required to begin. Switch up when you're ready, switch back when you're not.
        </motion.p>
        <motion.div
          className="mt-9 flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gold text-black font-body font-semibold text-sm tracking-wide hover:bg-gold-light transition-all duration-300"
          >
            Sign up — free
          </Link>
          <Link
            href="/demo/try"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border-active text-text font-body font-medium text-sm tracking-wide hover:text-paper hover:border-gold/30 transition-all duration-300"
          >
            Try the editor first
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ── Mockup badge ────────────────────────────────────────────

function MockupBadge() {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-full bg-elevated/95 backdrop-blur-md border border-gold/25 shadow-[var(--t-shadow-modal)]">
      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
      <span className="text-[11px] text-text-secondary font-body">Mockup · Pricing</span>
      <Link
        href="/pricing"
        className="text-[11px] text-gold hover:text-gold-light transition-colors font-body underline-offset-2 hover:underline"
      >
        Live pricing
      </Link>
      <span className="text-text-tertiary text-[11px]" aria-hidden>
        ·
      </span>
      <Link
        href="/mockup-homepage-v2"
        className="text-[11px] text-text-secondary hover:text-paper transition-colors font-body"
      >
        Homepage v2
      </Link>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function MockupPricing() {
  const [interval, setInterval] = useState<Interval>("monthly");

  return (
    <main className="bg-void min-h-screen overflow-x-hidden font-body text-text">
      <Hero interval={interval} onIntervalChange={setInterval} />
      <PricingSection interval={interval} />
      <ComparisonTable />
      <FaqSection />
      <FinalCTA />
      <MockupBadge />
    </main>
  );
}
