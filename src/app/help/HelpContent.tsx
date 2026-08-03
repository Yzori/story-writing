"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import SiteFooter from "@/components/shared/SiteFooter";

/*
 * Help — the librarian’s desk.
 *
 * Grouped questions with plain answers. Groups follow a visitor’s life
 * on the platform: arriving, writing, reading and supporting, earning,
 * writing together, and leaving with your data.
 */

type Faq = { q: string; a: React.ReactNode };
type Group = { title: string; accent: string; faqs: Faq[] };

const GROUPS: Group[] = [
  {
    title: "Getting started",
    accent: "text-gold",
    faqs: [
      {
        q: "Do I need an account to try Quiloria?",
        a: (
          <>
            No. You can <Link href="/demo/try">write at the demo desk</Link> and
            read openly published stories in the{" "}
            <Link href="/browse">library</Link> without signing in. An account is
            needed to publish, follow, comment, or spend Ink Drops — and if you
            sign up after writing in the demo, your draft comes with you.
          </>
        ),
      },
      {
        q: "Is Quiloria free?",
        a: (
          <>
            Yes. The free plan includes unlimited stories (3 active at once), all
            five formats, publishing, and earning through Ink Drops. Paid plans add
            the AI assistant, advanced exports, and more —{" "}
            <Link href="/pricing">the pricing page</Link> has the whole table.
          </>
        ),
      },
      {
        q: "What story formats can I write?",
        a: "Five: novels, poetry, screenplays, webtoons, and illustrated stories. Each has its own editor built for that craft, and readers get a view designed for that format — verse stays verse, panels scroll like panels.",
      },
    ],
  },
  {
    title: "Writing & publishing",
    accent: "text-gold",
    faqs: [
      {
        q: "Who can see my drafts?",
        a: "Only you, plus any collaborators you’ve explicitly invited to that story. Drafts are private by default; nothing is visible to readers until you publish a chapter.",
      },
      {
        q: "Can I import existing work?",
        a: (
          <>
            Yes — DOCX import brings a manuscript in with formatting intact, from
            the <Link href="/create">new story flow</Link>. You can also export
            everything back out as PDF or DOCX at any time.
          </>
        ),
      },
      {
        q: "How does the AI assistant work?",
        a: "It’s stage crew, never the pen: it acts only when you invoke it on your own draft, and its suggestions enter your story only if you accept them. Your writing is never used to train AI models. Free accounts get a small lifetime taste; Pro and Premium plans include daily or unlimited use.",
      },
    ],
  },
  {
    title: "Reading & Ink Drops",
    accent: "text-teal",
    faqs: [
      {
        q: "What are Ink Drops?",
        a: "Quiloria’s currency for supporting creators. Refill your well once, then spend drops on gifts, chapter unlocks, Circle subscriptions, Crossroads votes, and commissions. Creators keep 70% of every drop spent on their work.",
      },
      {
        q: "Why are some chapters locked?",
        a: "Writers can gate individual chapters for a small drop price, offer bundles, or give their Circle subscribers early access. The writer sets the price; most of the story usually stays free.",
      },
      {
        q: "Can I get a refund on drops?",
        a: "Unspent drops are refundable within 14 days of purchase — email support. Drops you’ve already spent on a creator have been credited to that creator and can’t be clawed back.",
      },
      {
        q: "What is a Circle?",
        a: "A creator’s inner readership: a monthly subscription that supports them directly and can include perks like early access to new chapters. You can join or leave a Circle from the creator’s profile at any time.",
      },
    ],
  },
  {
    title: "Earning as a creator",
    accent: "text-copper",
    faqs: [
      {
        q: "How do I earn on Quiloria?",
        a: "Seven streams, one split: gifts, chapter unlocks, Circle subscriptions, commissions, Crossroads votes, live tips, and audience gold during adventures. You keep 70% of every drop, on every stream.",
      },
      {
        q: "When and how do I get paid?",
        a: (
          <>
            Earned drops accumulate in your creator balance. Once you cross the $25
            USD-equivalent threshold you can request a payout from the{" "}
            <Link href="/creator/earnings">Earnings page</Link>; payouts are
            processed weekly via Stripe Connect.
          </>
        ),
      },
      {
        q: "How do commissions work?",
        a: (
          <>
            You post an offering — cover art, editing, custom chapters, a dozen
            crafts — with your price and terms. A patron’s payment is held in
            escrow and released to you on delivery. Browse the{" "}
            <Link href="/commissions">Scriptorium</Link> to see it in action.
          </>
        ),
      },
    ],
  },
  {
    title: "Writing together",
    accent: "text-amethyst",
    faqs: [
      {
        q: "How do collaborations work?",
        a: "Invite people to your story’s Workshop with a real role — writer, illustrator, editor, or worldbuilder. Collaborators get agreements, a suggestions flow, and shared lore, so everyone knows what they’re contributing and what they’re owed.",
      },
      {
        q: "What are open calls?",
        a: "A story that needs hands posts a call — \"seeking an illustrator,\" \"seeking a co-writer\" — and writers respond with a pitch. It’s how unfinished stories find the people who finish them.",
      },
      {
        q: "What is an adventure?",
        a: (
          <>
            A live table: a Director and two to four writers improvise a story
            scene by scene in front of an audience, with raised hands and
            step-forward initiative instead of dice. The audience watches it being
            written — honestly, keystroke by keystroke — and what remains
            afterwards is a finished, readable story.{" "}
            <Link href="/adventures">Find a table</Link> or watch one first; the
            audience door needs no account.
          </>
        ),
      },
    ],
  },
  {
    title: "Account & data",
    accent: "text-sage",
    faqs: [
      {
        q: "How do I control emails and notifications?",
        a: (
          <>
            Every notification type — replies, follows, digests, push — has its own
            switch in <Link href="/settings">Settings</Link>, and every email
            carries an unsubscribe link.
          </>
        ),
      },
      {
        q: "Can I take my work and leave?",
        a: (
          <>
            Always. Export stories as DOCX or PDF, download your full data archive,
            or delete your account permanently — all self-serve from{" "}
            <Link href="/settings">Settings</Link>. Details in the{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </>
        ),
      },
      {
        q: "How do I report a story or a user?",
        a: "Every story, comment, and profile carries a flag control. Reports go to human moderators. For anything urgent, or anything the flag button doesn’t cover, email support directly.",
      },
    ],
  },
];

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-surface/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-surface/60 transition-colors"
      >
        <span className="text-[14px] font-medium text-paper">{faq.q}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-text-ghost transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 text-[13px] leading-relaxed text-text-secondary [&_a]:text-gold [&_a:hover]:text-gold-light [&_a]:transition-colors">
              {faq.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpContent() {
  return (
    <div className="min-h-screen bg-void flex flex-col">
      <main className="flex-1">
        {/* top padding clears the fixed h-14 navbar */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
          <header className="mb-12">
            <p className="text-[11px] uppercase tracking-[0.24em] text-gold/70 mb-3">
              The librarian&apos;s desk
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-paper">Help</h1>
            <p className="mt-6 font-reading text-[16px] leading-relaxed text-text">
              The questions visitors actually ask, answered plainly. If yours isn&apos;t
              here, a human reads{" "}
              <a
                href="mailto:support@quiloria.app"
                className="text-gold hover:text-gold-light transition-colors"
              >
                support@quiloria.app
              </a>
              .
            </p>
          </header>

          <div className="space-y-10">
            {GROUPS.map((group) => (
              <section key={group.title}>
                <h2 className={`text-[11px] uppercase tracking-[0.2em] ${group.accent} mb-3`}>
                  {group.title}
                </h2>
                <div className="space-y-2.5">
                  {group.faqs.map((faq) => (
                    <FaqItem key={faq.q} faq={faq} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
