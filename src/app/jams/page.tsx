"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Jam {
  id: string;
  title: string;
  description: string;
  theme: string;
  bannerUrl: string | null;
  submissionStartsAt: string;
  submissionEndsAt: string;
  votingStartsAt: string;
  votingEndsAt: string;
  wordCountMin: number | null;
  wordCountMax: number | null;
  liveStatus: string;
  entryCount: number;
  creatorName: string | null;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  upcoming: { label: "Coming Soon", className: "text-lavender bg-lavender/10 border-lavender/20" },
  open: { label: "Accepting Entries", className: "text-sage bg-sage/10 border-sage/20" },
  voting: { label: "Voting Open", className: "text-amber bg-amber/10 border-amber/20" },
  ended: { label: "Ended", className: "text-text-ghost bg-elevated/50 border-border/50" },
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function JamsPage() {
  const [jams, setJams] = useState<Jam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jams")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.data && setJams(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = jams.filter((j) => j.liveStatus === "open" || j.liveStatus === "voting");
  const upcoming = jams.filter((j) => j.liveStatus === "upcoming");
  const ended = jams.filter((j) => j.liveStatus === "ended");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-10">
          <h1 className="font-display text-3xl text-paper font-bold">Story Jams</h1>
          <p className="text-text-secondary text-sm mt-2">
            Time-boxed creative events — write to a theme, submit your story, and let the community vote
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-amber/20 border-t-amber rounded-full animate-spin" />
          </div>
        ) : jams.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber/40">
                <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
              </svg>
            </div>
            <p className="text-paper font-display text-lg mb-2">No jams on the board tonight</p>
            <p className="text-text-ghost text-sm max-w-md mx-auto mb-6">
              Story jams are timed community prompts — when one opens, entries
              and votes happen right here. Meanwhile, the shelves are open.
            </p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber text-void font-semibold text-sm hover:bg-amber-light transition-all"
            >
              Browse stories
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <JamSection title="Active Jams" jams={active} />
            )}
            {upcoming.length > 0 && (
              <JamSection title="Upcoming" jams={upcoming} />
            )}
            {ended.length > 0 && (
              <JamSection title="Past Jams" jams={ended} />
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

function JamSection({ title, jams }: { title: string; jams: Jam[] }) {
  return (
    <div className="mb-12">
      <h2 className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold mb-4">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {jams.map((jam, i) => {
          const statusStyle = STATUS_STYLES[jam.liveStatus] || STATUS_STYLES.upcoming;
          return (
            <motion.div
              key={jam.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                href={`/jams/${jam.id}`}
                className="block card-page p-5 hover:border-gold/20 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-display text-lg text-paper font-semibold group-hover:text-amber transition-colors">
                    {jam.title}
                  </h3>
                  <span className={`shrink-0 px-2 py-0.5 text-[9px] uppercase tracking-wider border rounded-full ${statusStyle.className}`}>
                    {statusStyle.label}
                  </span>
                </div>

                <p className="text-xs text-text-secondary mb-3 italic">
                  Theme: {jam.theme}
                </p>

                <p className="text-sm text-text line-clamp-2 mb-4">
                  {jam.description}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-text-ghost">
                  <span>{jam.entryCount} {jam.entryCount === 1 ? "entry" : "entries"}</span>
                  {jam.liveStatus === "open" && (
                    <span>Closes {formatDate(jam.submissionEndsAt)}</span>
                  )}
                  {jam.liveStatus === "voting" && (
                    <span>Voting ends {formatDate(jam.votingEndsAt)}</span>
                  )}
                  {jam.wordCountMin || jam.wordCountMax ? (
                    <span>
                      {jam.wordCountMin ? `${jam.wordCountMin}` : "0"}–{jam.wordCountMax ? `${jam.wordCountMax}` : "∞"} words
                    </span>
                  ) : null}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
