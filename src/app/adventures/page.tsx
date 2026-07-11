"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PACE_LABELS, type AdventurePace } from "@/types/adventure";

interface MyAdventure {
  id: string;
  title: string;
  premise: string;
  genre: string;
  pace: AdventurePace;
  status: string;
  actNo: number;
  sceneNo: number;
  myRole: "director" | "writer";
}

/**
 * Your adventures. Slice 2 turns this page into the full playbill
 * board (open tables, quick match); for now it's your tables plus
 * the door to opening one.
 */
export default function AdventuresPage() {
  const [mine, setMine] = useState<MyAdventure[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/adventures")
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setMine(body.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setMine([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-void pb-24">
      <div className="max-w-[1120px] mx-auto px-6 pt-24">
        <div className="text-center max-w-[66ch] mx-auto">
          <h1 className="font-display font-medium text-paper text-[clamp(30px,4.4vw,46px)] [text-wrap:balance] mb-3 [text-shadow:0_0_44px_var(--color-gold-glow)]">
            Every story needs a table.
          </h1>
          <p className="text-[15px] text-text m-0">
            An adventure is written by a small cast — one{" "}
            <strong className="text-paper">Director</strong> who runs the
            world, two to four writers who each play a character. Bring
            friends by invite link, or open a table of your own.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 mt-11">
          {(mine ?? []).map((adventure) => (
            <Link
              key={adventure.id}
              href={`/adventures/${adventure.id}`}
              className="relative border border-border rounded-md bg-gradient-to-b from-elevated/40 to-ink/90 p-6 text-center flex flex-col gap-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-1 hover:border-gold/45 before:content-[''] before:absolute before:inset-[7px] before:border before:border-gold/20 before:rounded-[3px] before:pointer-events-none"
            >
              <div className="text-[10px] tracking-[0.3em] uppercase text-gold-dark capitalize">
                {adventure.genre}
              </div>
              <h2 className="font-display font-medium text-[22px] text-paper m-0 [text-wrap:balance]">
                {adventure.title}
              </h2>
              <div className="text-gold/55 text-[12px] tracking-[0.6em] indent-[0.6em]">
                ✦
              </div>
              <p className="font-reading italic text-[13.5px] text-text m-0 leading-relaxed line-clamp-3">
                {adventure.premise}
              </p>
              <div className="text-[12px] text-teal mt-auto">
                {PACE_LABELS[adventure.pace]}
              </div>
              <div className="text-[11px] tracking-[0.22em] uppercase text-gold-light font-bold border-t border-b border-gold/20 py-1.5">
                {adventure.status === "casting"
                  ? "Casting"
                  : adventure.status === "running"
                    ? `Act ${adventure.actNo} · you ${adventure.myRole === "director" ? "direct" : "write"}`
                    : "Finished"}
              </div>
            </Link>
          ))}

          <Link
            href="/adventures/new"
            className="relative border border-dashed border-border rounded-md bg-ink/40 p-6 text-center flex flex-col gap-3 justify-center transition-all hover:-translate-y-1 hover:border-gold/45 before:content-[''] before:absolute before:inset-[7px] before:border before:border-dashed before:border-gold/20 before:rounded-[3px] before:pointer-events-none"
          >
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-dark">
              Your premise here
            </div>
            <h2 className="font-display font-medium text-[22px] text-gold-light m-0">
              Open your own table
            </h2>
            <div className="text-gold/55 text-[12px] tracking-[0.6em] indent-[0.6em]">
              ✦
            </div>
            <p className="font-reading italic text-[13.5px] text-text m-0 leading-relaxed">
              Write a premise, set the pace, choose your seat. Invite friends
              by link — the board comes soon.
            </p>
          </Link>
        </div>

        {mine !== null && mine.length === 0 && (
          <p className="text-center text-[13px] text-text-ghost mt-10">
            No adventures yet — open a table and deal in your friends.
          </p>
        )}
      </div>
    </div>
  );
}
