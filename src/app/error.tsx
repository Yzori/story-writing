"use client";

import Link from "next/link";

export default function Error({
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
          <circle cx="18" cy="18" r="14" />
          <path d="M18 11v8M18 23v1" />
        </svg>
      </div>
      <h1 className="font-display text-3xl text-paper font-semibold mb-3">
        Something went wrong
      </h1>
      <p className="text-text-secondary text-[14px] max-w-sm mb-8 leading-relaxed">
        An unexpected error occurred. Your work should be safe — try again or
        head back home.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="bg-amber text-void font-medium px-5 py-2.5 rounded-lg hover:bg-amber/90 transition-colors text-[13px]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="bg-surface border border-border text-paper font-medium px-5 py-2.5 rounded-lg hover:border-amber/30 transition-colors text-[13px]"
        >
          Go Home
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
