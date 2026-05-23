"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PATHS = [
  {
    id: "write",
    title: "Write",
    description: "Step into the study and put the first line on the page",
    href: "/create",
    instant: true,
    accent: "amber",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-amber">
        {/* Quill pen */}
        <path d="M28 4C23 8 19 13 15 19C11 25 9 29 8 32L6 33L5 31C6 28 9 21 13 15C17 9 23 5 28 4Z" />
        <circle cx="6.5" cy="32" r="1.5" fill="currentColor" opacity="0.5" />
        <path d="M21 9l5-3" strokeDasharray="2 2" opacity="0.4" />
        {/* Sparkle */}
        <path d="M27 13l0.8 2.2 2.2 0.8-2.2 0.8-0.8 2.2-0.8-2.2-2.2-0.8 2.2-0.8z" fill="currentColor" stroke="none" opacity="0.35" />
      </svg>
    ),
  },
  {
    id: "read",
    title: "Read",
    description: "Find a shelf, a lamp, and a story that opens somewhere else",
    href: "/read",
    accent: "lavender",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-lavender">
        {/* Open book */}
        <path d="M5 8C5 8 9 6 18 6s13 2 13 2v20s-5-2-13-2-13 2-13 2V8z" />
        <path d="M18 6v20" />
        {/* Page lines */}
        <path d="M9 12h6M9 16h5M9 20h4" opacity="0.3" />
        <path d="M21 12h6M21 16h5M21 20h4" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "collaborate",
    title: "Collaborate",
    description: "Gather at the long table and build a world with other hands",
    href: "/roster",
    accent: "teal",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-teal">
        {/* Two quills crossed */}
        <path d="M24 5C20 8 17 12 14 17C11 22 9 26 8 28L7 29L6 28C7 25 9 20 12 15C15 10 20 6 24 5Z" />
        <path d="M12 5C16 8 19 12 22 17C25 22 27 26 28 28L29 29L30 28C29 25 27 20 24 15C21 10 16 6 12 5Z" />
        {/* Connection spark */}
        <path d="M18 20l0.6 1.8 1.8 0.6-1.8 0.6-0.6 1.8-0.6-1.8-1.8-0.6 1.8-0.6z" fill="currentColor" stroke="none" opacity="0.4" />
      </svg>
    ),
  },
] as const;

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.4,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export default function WelcomeContent({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleInstantStart = async () => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled story",
          format: "novel",
          writingMode: "solo",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.data?.id) {
        setCreateError(json.error?.message || "Couldn't start a new story");
        setCreating(false);
        return;
      }
      router.push(`/write/${json.data.id}`);
    } catch {
      setCreateError("Network error — please try again");
      setCreating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-amber/[0.04] blur-[150px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[400px] h-[300px] rounded-full bg-lavender/[0.03] blur-[120px]" />
        <div className="absolute bottom-[15%] right-[15%] w-[350px] h-[350px] rounded-full bg-teal/[0.03] blur-[120px]" />
      </div>

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="text-center mb-14 relative z-10"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="font-display text-[11px] uppercase tracking-[0.25em] text-text-ghost mb-4"
        >
          The lamp is lit
        </motion.p>
        <h1 className="font-display text-4xl sm:text-5xl text-paper font-semibold tracking-tight mb-4">
          Welcome to Quiloria,{" "}
          <span className="text-amber italic">{firstName}</span>
        </h1>
        <p className="text-text-secondary text-[15px] max-w-md mx-auto leading-relaxed">
          Which door brought you here?
        </p>
      </motion.div>

      {/* Path cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl relative z-10"
      >
        {PATHS.map((path) => {
          const isInstantWrite = path.id === "write" && (path as { instant?: boolean }).instant;
          const cardInner = (
            <motion.div
              whileHover={{ scale: creating && isInstantWrite ? 1 : 1.03, y: creating && isInstantWrite ? 0 : -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative rounded-2xl p-6 flex flex-col items-center text-center bg-surface/50 backdrop-blur-xl border border-border/50 overflow-hidden transition-shadow duration-500 h-full"
              style={{ boxShadow: "0 0 0 rgba(0,0,0,0)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 40px var(--color-${path.accent}/0.12), 0 0 60px var(--color-${path.accent}/0.06)`;
                e.currentTarget.style.borderColor = `var(--color-${path.accent}/0.3)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 0 rgba(0,0,0,0)";
                e.currentTarget.style.borderColor = "";
              }}
            >
              {/* Hover glow overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 30%, var(--color-${path.accent}/0.08) 0%, transparent 70%)`,
                }}
              />

              {/* Icon container */}
              <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border border-border/50 group-hover:border-transparent transition-colors duration-300"
                  style={{
                    background: `radial-gradient(circle, var(--color-${path.accent}/0.08) 0%, transparent 70%)`,
                  }}
                />
                <div className="relative z-10 group-hover:scale-110 transition-transform duration-300">
                  {path.icon}
                </div>
              </div>

              {/* Text */}
              <h2 className={`font-display text-lg text-paper font-semibold mb-2 group-hover:text-${path.accent} transition-colors duration-300`}>
                {path.title}
              </h2>
              <p className="text-text-secondary text-[13px] leading-relaxed">
                {path.description}
              </p>

              {/* Arrow indicator (or spinner when creating) */}
              <div className="mt-5 flex items-center justify-center w-8 h-8 rounded-full border border-border/50 group-hover:border-transparent group-hover:bg-white/5 transition-all duration-300">
                {isInstantWrite && creating ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-text-ghost group-hover:text-paper group-hover:translate-x-0.5 transition-all duration-300"
                  >
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                )}
              </div>
            </motion.div>
          );

          return (
            <motion.div key={path.id} variants={cardVariants}>
              {isInstantWrite ? (
                <button
                  type="button"
                  onClick={handleInstantStart}
                  disabled={creating}
                  className="block group w-full text-left disabled:cursor-wait"
                  aria-label="Start writing your first chapter now"
                >
                  {cardInner}
                </button>
              ) : (
                <Link href={path.href} className="block group">
                  {cardInner}
                </Link>
              )}
              {isInstantWrite && (
                <div className="mt-2 text-center">
                  <Link
                    href="/create"
                    className="text-[11px] text-text-ghost hover:text-amber transition-colors"
                  >
                    Or set up details first →
                  </Link>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Inline error if create fails */}
      {createError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-[12px] text-rose relative z-10"
          role="status"
        >
          {createError}
        </motion.p>
      )}

      {/* Skip link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-10 relative z-10"
      >
        <Link
          href="/dashboard"
          className="text-text-ghost text-[13px] hover:text-text-secondary transition-colors duration-200 font-body"
        >
          Skip for now
        </Link>
      </motion.div>

      {/* Decorative flourish */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-ghost/30 font-display text-sm"
      >
        &#10087;
      </motion.div>
    </div>
  );
}
