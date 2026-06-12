"use client";

/*
 * The reader's invitation — shown to anonymous visitors at the end of a
 * chapter, never as a wall. Their place is already kept in localStorage
 * (see lib/anon-reader.ts); registering imports it, so the card promises
 * only what the code delivers. Gate placement per the conversion research:
 * after the value, framed as keeping something the reader already owns.
 */

import Link from "next/link";
import { BookmarkCheck } from "lucide-react";

export default function KeepYourPlaceCard({ slug, chapterId }: { slug: string; chapterId: string }) {
  const here = `/story/${slug}/read/${chapterId}`;
  return (
    <div className="mx-auto mt-10 max-w-3xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gold/[0.05] p-6 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(224,169,62,0.14), transparent 65%)" }}
        />
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <BookmarkCheck className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg text-paper">The ink is keeping your place.</p>
            <p className="mt-1 font-reading text-[13.5px] italic leading-relaxed text-text-secondary">
              Write yourself in and it follows you — this page, this story, every world you wander next.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`/register?intent=read&from=${encodeURIComponent(here)}`}
                className="rounded-full bg-gold px-5 py-2 text-[12.5px] font-semibold text-on-gold transition-all hover:bg-gold-light"
              >
                keep my place →
              </Link>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(here)}`}
                className="text-[12px] text-text-secondary transition-colors hover:text-paper"
              >
                I have a name here — return
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
