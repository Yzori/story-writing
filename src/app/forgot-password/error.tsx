"use client";

import Link from "next/link";

export default function ForgotPasswordError({
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
          <rect x="8" y="14" width="20" height="16" rx="2" />
          <path d="M12 14v-4a6 6 0 0 1 12 0v4" />
          <path d="M16 23h4M18 21v4" />
        </svg>
      </div>
      <h1 className="font-display text-3xl text-paper font-semibold mb-3">
        Something went wrong
      </h1>
      <p className="text-text-secondary text-[14px] max-w-sm mb-8 leading-relaxed">
        We couldn&apos;t load the password recovery page. Please try again.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="bg-amber text-void font-medium px-5 py-2.5 rounded-lg hover:bg-amber/90 transition-colors text-[13px]"
        >
          Try again
        </button>
        <Link
          href="/login"
          className="bg-surface border border-border text-paper font-medium px-5 py-2.5 rounded-lg hover:border-amber/30 transition-colors text-[13px]"
        >
          Back to Login
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
