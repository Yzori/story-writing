"use client";

import Link from "next/link";

export default function StoryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center text-center px-6">
      <div className="w-20 h-20 rounded-full bg-rose/5 border border-border flex items-center justify-center mb-6">
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          className="text-rose/50"
        >
          <rect x="6" y="4" width="24" height="28" rx="2" />
          <path d="M12 12h12M12 18h8" />
          <circle cx="24" cy="24" r="6" fill="#0F0D0B" />
          <path d="M24 21v4M24 27v.5" />
        </svg>
      </div>
      <h1 className="font-display text-3xl text-paper font-semibold mb-3">
        Couldn&apos;t load this story
      </h1>
      <p className="text-text-secondary text-[14px] max-w-sm mb-8 leading-relaxed">
        Something went wrong while loading the story. It may be temporarily unavailable.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="bg-amber text-void font-medium px-5 py-2.5 rounded-lg hover:bg-amber/90 transition-colors text-[13px]"
        >
          Try again
        </button>
        <Link
          href="/browse"
          className="bg-surface border border-border text-paper font-medium px-5 py-2.5 rounded-lg hover:border-amber/30 transition-colors text-[13px]"
        >
          Browse Stories
        </Link>
      </div>
    </div>
  );
}
