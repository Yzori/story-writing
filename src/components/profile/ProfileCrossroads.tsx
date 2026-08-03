"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Signpost, Droplet } from "lucide-react";

export interface ProfilePoll {
  id: string;
  storyId: string;
  storyTitle: string;
  storySlug: string | null;
  question: string;
  closesAt: string | null;
  grandTotal: number;
  options: {
    label: string;
    totalDrops: number;
    voterCount: number;
    percentage: number;
    userDrops: number;
  }[];
}

interface ProfileCrossroadsProps {
  polls: ProfilePoll[];
  ownerName: string;
  isOwner: boolean;
  signedIn: boolean;
  onRefresh: () => void;
}

const VOTE_AMOUNTS = [5, 15, 30, 60];

/**
 * The writer's open crossroads, surfaced at the study door — visitors weigh
 * in on where the tales turn next by casting ink drops.
 */
export default function ProfileCrossroads({
  polls,
  ownerName,
  isOwner,
  signedIn,
  onRefresh,
}: ProfileCrossroadsProps) {
  if (polls.length === 0) {
    // Visitors see nothing; the owner learns the surface exists.
    if (!isOwner) return null;
    return (
      <section id="crossroads" className="relative mx-auto mt-16 max-w-3xl scroll-mt-24 px-5 lg:px-8">
        <p className="text-center font-reading text-[12px] italic leading-relaxed text-text-ghost">
          No crossroads open. When a tale reaches a fork, set one out from the
          story&apos;s page — visitors will cast ink on the turning here.
        </p>
      </section>
    );
  }

  return (
    <section id="crossroads" className="relative mx-auto mt-16 max-w-3xl scroll-mt-24 px-5 lg:px-8">
      <div className="mb-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-amber">The crossroads</p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-paper">
          Where the tales turn
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-text-ghost">
          {isOwner
            ? "Your open crossroads, set out where every visitor can weigh in."
            : `${ownerName} has left these choices open. Cast ink to tip the scales.`}
        </p>
      </div>

      <div className="space-y-5">
        {polls.map((poll, i) => (
          <PollCard
            key={poll.id}
            poll={poll}
            isOwner={isOwner}
            signedIn={signedIn}
            index={i}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </section>
  );
}

export function PollCard({
  poll,
  isOwner,
  signedIn,
  index,
  onRefresh,
}: {
  poll: ProfilePoll;
  isOwner: boolean;
  signedIn: boolean;
  index: number;
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(VOTE_AMOUNTS[0]);
  const [casting, setCasting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canVote = signedIn && !isOwner;

  const castVote = async () => {
    if (selected === null || casting) return;
    setCasting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/stories/${poll.storyId}/crossroads/${poll.id}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionIndex: selected, amount }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "The ink wouldn't take.");
      } else {
        setSelected(null);
        onRefresh();
      }
    } catch {
      setError("The ink wouldn't take.");
    } finally {
      setCasting(false);
    }
  };

  const closesLabel = poll.closesAt
    ? new Date(poll.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(index * 0.08, 0.24), duration: 0.5 }}
      className="overflow-hidden rounded-[1.5rem] border border-border bg-surface/80 backdrop-blur-xl"
    >
      <div className="px-6 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-text-ghost">
            <Signpost size={11} className="text-amber" />
            From{" "}
            {poll.storySlug ? (
              <Link
                href={`/story/${poll.storySlug}`}
                className="text-text-secondary transition-colors hover:text-amber"
              >
                {poll.storyTitle}
              </Link>
            ) : (
              <span className="text-text-secondary">{poll.storyTitle}</span>
            )}
          </p>
          {closesLabel && (
            <span className="font-mono text-[10px] text-text-ghost">closes {closesLabel}</span>
          )}
        </div>
        <h3 className="mt-2 font-display text-[19px] font-semibold leading-snug text-paper">
          {poll.question}
        </h3>
      </div>

      <div className="space-y-2 px-6 py-4">
        {poll.options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => canVote && setSelected(isSelected ? null : i)}
              disabled={!canVote}
              className={`relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-left transition-all ${
                isSelected
                  ? "border-amber/40 bg-amber/[0.05]"
                  : "border-border hover:border-border-active"
              } ${canVote ? "cursor-pointer" : "cursor-default"}`}
            >
              {/* Standing ink */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber/[0.10] to-amber/[0.03] transition-[width] duration-700"
                style={{ width: `${opt.percentage}%` }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <span className={`text-[13px] ${isSelected ? "text-amber" : "text-text"}`}>
                  {opt.label}
                </span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-text-ghost">
                  {opt.userDrops > 0 && (
                    <span className="flex items-center gap-0.5 text-amber">
                      <Droplet size={9} />
                      {opt.userDrops} yours
                    </span>
                  )}
                  <span>{opt.percentage}%</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-6 py-3">
        <span className="font-mono text-[10px] tracking-wider text-text-ghost">
          {poll.grandTotal > 0 ? `${poll.grandTotal} drops cast` : "No ink cast yet"}
        </span>

        {canVote && selected !== null ? (
          <div className="flex items-center gap-2">
            {VOTE_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className={`rounded-lg border px-2 py-1 text-[11px] transition-all ${
                  amount === amt
                    ? "border-amber/30 bg-amber/[0.06] text-amber"
                    : "border-border text-text-ghost hover:text-text-secondary"
                }`}
              >
                {amt}
              </button>
            ))}
            <button
              onClick={castVote}
              disabled={casting}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber px-3.5 py-1.5 text-[11px] font-semibold text-void transition-all hover:shadow-[0_0_14px_rgba(226,172,74,0.22)] disabled:opacity-40"
            >
              <Droplet size={11} />
              {casting ? "Casting…" : `Cast ${amount} drops`}
            </button>
          </div>
        ) : !signedIn ? (
          <Link href="/login" className="text-[11px] text-amber underline-offset-2 hover:underline">
            Sign in to cast ink
          </Link>
        ) : isOwner ? (
          <span className="text-[11px] italic text-text-ghost">Visitors can cast ink here</span>
        ) : (
          <span className="text-[11px] text-text-ghost">Choose a path to cast ink</span>
        )}
      </div>

      {error && <p className="px-6 pb-3 text-right text-[11px] text-rose">{error}</p>}
    </motion.article>
  );
}
