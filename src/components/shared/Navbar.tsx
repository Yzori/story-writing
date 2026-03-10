"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = useSession();
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileOpen(false);
    }
  };

  const profileHref = session?.user?.id
    ? `/profile/${session.user.id}`
    : "/login";
  const initial = session?.user?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-xl border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <svg
            className="w-6 h-6 text-amber transition-transform duration-300 group-hover:rotate-[-12deg]"
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z"
              fill="currentColor"
              opacity="0.85"
            />
            <path
              d="M26 3C26 3 27 4 26 6C25 8 22 12 18 16"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              opacity="0.5"
            />
            <path d="M7 28L5 29L4 27L7 28Z" fill="currentColor" />
            <circle cx="4.5" cy="28" r="1" fill="currentColor" opacity="0.6" />
          </svg>
          <span className="font-display text-lg font-bold text-paper tracking-wide">
            Inkwell
          </span>
        </Link>

        {/* Center: Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-auto relative">
          <div
            className={`w-full flex items-center gap-2 bg-elevated border rounded-lg px-3 py-2 transition-colors ${
              searchFocused ? "border-amber/30" : "border-border"
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-text-ghost flex-shrink-0"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              type="text"
              placeholder="Search stories, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[13px] text-text outline-none placeholder:text-text-ghost w-full"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </form>

        {/* Right: Nav links + user */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/browse"
            className="text-text-secondary hover:text-paper transition-colors text-[13px] px-3 py-2 rounded-lg hover:bg-elevated"
          >
            Browse
          </Link>
          {session ? (
            <>
              <Link
                href="/create"
                className="text-text-secondary hover:text-paper transition-colors text-[13px] px-3 py-2 rounded-lg hover:bg-elevated"
              >
                Create
              </Link>
              <Link
                href="/dashboard"
                className="text-text-secondary hover:text-paper transition-colors text-[13px] px-3 py-2 rounded-lg hover:bg-elevated"
              >
                My Desk
              </Link>

              {/* Avatar */}
              <Link
                href={profileHref}
                className="ml-2 w-8 h-8 rounded-full bg-amber/20 border border-border hover:border-amber/30 transition-colors flex items-center justify-center text-amber text-[12px] font-medium"
              >
                {initial}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-text-secondary hover:text-paper transition-colors text-[13px] px-3 py-2 rounded-lg hover:bg-elevated"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="bg-amber text-void font-medium px-4 py-1.5 rounded-lg hover:bg-amber/90 transition-colors text-[13px] ml-1"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-px bg-paper transition-all duration-300 ${
              mobileOpen ? "rotate-45 translate-y-[3.5px]" : ""
            }`}
          />
          <span
            className={`block w-5 h-px bg-paper transition-all duration-300 ${
              mobileOpen ? "-rotate-45 -translate-y-[3.5px]" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface border-t border-border overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {/* Mobile search */}
              <form onSubmit={handleSearch} className="flex items-center gap-2 bg-elevated border border-border rounded-lg px-3 py-2.5 mb-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-text-ghost"
                >
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M10.5 10.5L14 14" />
                </svg>
                <input
                  type="text"
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[13px] text-text outline-none placeholder:text-text-ghost w-full"
                />
              </form>
              <Link
                href="/browse"
                className="text-text-secondary hover:text-paper transition-colors text-[14px] py-2"
                onClick={() => setMobileOpen(false)}
              >
                Browse
              </Link>
              {session ? (
                <>
                  <Link
                    href="/create"
                    className="text-text-secondary hover:text-paper transition-colors text-[14px] py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Create
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-text-secondary hover:text-paper transition-colors text-[14px] py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    My Desk
                  </Link>
                  <Link
                    href={profileHref}
                    className="text-text-secondary hover:text-paper transition-colors text-[14px] py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-text-secondary hover:text-paper transition-colors text-[14px] py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="text-amber hover:text-amber/80 transition-colors text-[14px] py-2 font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
