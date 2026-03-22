"use client";

import Link from "next/link";

export default function SettingsError({
  error,
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
          <circle cx="18" cy="18" r="6" />
          <path d="M18 2v4M18 30v4M2 18h4M30 18h4M6.3 6.3l2.8 2.8M26.9 26.9l2.8 2.8M6.3 29.7l2.8-2.8M26.9 9.1l2.8-2.8" />
        </svg>
      </div>
      <h1 className="font-display text-3xl text-paper font-semibold mb-3">
        Couldn&apos;t load settings
      </h1>
      <p className="text-text-secondary text-[14px] max-w-sm mb-8 leading-relaxed">
        Something went wrong while loading your settings. Please try again.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="bg-amber text-void font-medium px-5 py-2.5 rounded-lg hover:bg-amber/90 transition-colors text-[13px]"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="bg-surface border border-border text-paper font-medium px-5 py-2.5 rounded-lg hover:border-amber/30 transition-colors text-[13px]"
        >
          Back to Desk
        </Link>
      </div>
      {error.digest && (
        <p className="text-text-ghost text-[11px] mt-6">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
