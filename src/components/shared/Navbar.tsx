"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "@/components/editor/ThemeToggle";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inkDropBalance, setInkDropBalance] = useState<number | null>(null);
  const [streak, setStreak] = useState<{ days: number; status: "active" | "at-risk" | "broken" | "none" } | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { data: session, status: sessionStatus } = useSession();
  const isLoading = sessionStatus === "loading";
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    if (!session?.user?.id) return;
    const controller = new AbortController();
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notifications", { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          setUnreadCount(json?.data?.unreadCount ?? 0);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [session?.user?.id]);

  // Fetch Ink Drop balance
  useEffect(() => {
    if (!session?.user?.id) return;
    const controller = new AbortController();
    async function fetchBalance() {
      try {
        const res = await fetch("/api/user/ink-drops", { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          setInkDropBalance(json?.balance ?? null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    fetchBalance();
    const interval = setInterval(fetchBalance, 60000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [session?.user?.id]);

  // Fetch reading streak (refresh every 5 min — streaks change at most once a day)
  useEffect(() => {
    if (!session?.user?.id) return;
    const controller = new AbortController();
    async function fetchStreak() {
      try {
        const res = await fetch("/api/user/streak", { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          if (json?.data) setStreak({ days: json.data.days, status: json.data.status });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    fetchStreak();
    const interval = setInterval(fetchStreak, 5 * 60_000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [session?.user?.id]);

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
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Background — frosted glass (Apple-style: translucent + blur + saturate) */}
      <div className="absolute inset-0 bg-void/75 backdrop-blur-2xl backdrop-saturate-150" />
      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />

      <div className="relative max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo — brass plate feel */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="relative">
            <svg
              className="w-6 h-6 text-gold transition-all duration-500 group-hover:rotate-[-12deg] group-hover:scale-110 drop-shadow-[0_0_3px_var(--t-gold-glow)]"
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
            {/* Warm lantern glow on hover */}
            <div className="absolute -inset-3 bg-gold/8 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          <span
            className="font-display text-lg font-bold tracking-wide transition-all duration-500 group-hover:drop-shadow-[0_0_6px_var(--t-gold-glow)]"
            style={{
              background: "linear-gradient(180deg, var(--t-paper) 0%, var(--t-gold) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Quiloria
          </span>
        </Link>

        {/* Center: Search — inset brass frame */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-auto relative">
          <div
            className={`w-full flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all duration-300 border ${
              searchFocused
                ? "border-gold/20 bg-surface/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                : "border-border bg-surface/50 shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)]"
            }`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={`flex-shrink-0 transition-colors duration-300 ${searchFocused ? "text-gold/60" : "text-text-ghost"}`}
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              type="text"
              placeholder="Search stories, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[13px] text-text outline-none placeholder:text-text-ghost/60 w-full font-body"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </form>

        {/* Right: Nav links + user */}
        <div className="hidden md:flex items-center gap-0.5">
          {/* Nav links — lantern-lit hover */}
          {session && (
            <Link
              href="/dashboard"
              className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10 hover:shadow-none"
            >
              Dashboard
            </Link>
          )}
          {session && (
            <Link
              href="/read"
              className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10 hover:shadow-none"
            >
              Read
            </Link>
          )}
          <Link
            href="/browse"
            className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10 hover:shadow-none"
          >
            Browse
          </Link>
          <Link
            href="/pricing"
            className="text-gold hover:text-gold/80 transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10 font-medium"
          >
            Pricing
          </Link>
          {session && (
            <Link
              href="/library"
              className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10 hover:shadow-none"
            >
              Library
            </Link>
          )}
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-[var(--t-card-bg)] border border-border animate-pulse" />
          ) : session ? (
            <>
              <Link
                href="/create"
                className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10 hover:shadow-none"
              >
                Write
              </Link>

              {/* Theme toggle */}
              <div className="scale-75 -mx-1">
                <ThemeToggle />
              </div>

              {/* Notifications — ember badge */}
              <Link
                href="/notifications"
                className="relative p-2 rounded-lg text-text-ghost hover:text-gold/80 hover:bg-gold/10 transition-all duration-300"
                aria-label="Notifications"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6a4 4 0 018 0c0 4 2 5 2 5H2s2-1 2-5z" />
                  <path d="M6.5 13a1.5 1.5 0 003 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-gold to-copper shadow-[0_0_4px_var(--t-gold-soft)] animate-pulse" />
                )}
              </Link>

              {/* Reading streak — shown when active or at-risk */}
              {streak && streak.days > 0 && (streak.status === "active" || streak.status === "at-risk") && (
                <Link
                  href="/read"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 ${
                    streak.status === "at-risk"
                      ? "text-rose hover:bg-rose/10 hover:text-rose"
                      : "text-amber hover:bg-amber/10"
                  }`}
                  title={
                    streak.status === "at-risk"
                      ? `${streak.days}-day streak — read today to keep it alive`
                      : `${streak.days}-day reading streak`
                  }
                >
                  <span className="text-[11px]" aria-hidden>
                    🔥
                  </span>
                  <span className="text-[11px] tabular-nums font-medium">{streak.days}</span>
                </Link>
              )}

              {/* Ink Drop balance */}
              {inkDropBalance !== null && (
                <Link
                  href="/settings/ink-drops"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-text-ghost hover:text-gold hover:bg-gold/10 transition-all duration-300"
                  title="Ink Drops"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold/60">
                    <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
                  </svg>
                  <span className="text-[11px] tabular-nums font-medium">{inkDropBalance}</span>
                </Link>
              )}

              {/* User menu — wax seal button */}
              <div className="relative ml-1.5" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-8 h-8 rounded-full border transition-all duration-300 flex items-center justify-center text-[12px] font-display font-bold bg-gradient-to-br from-gold/20 via-gold/10 to-copper/10 border-gold/20 text-gold hover:border-gold/40 hover:shadow-none hover:from-gold/25 hover:to-copper/15"
                >
                  {initial}
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scaleY: 0.92 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: 8, scaleY: 0.92 }}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      style={{ transformOrigin: "top center" }}
                      className="absolute right-0 top-11 w-52 overflow-hidden z-50 rounded-lg border border-border-active shadow-[var(--t-shadow-modal)]"
                    >
                      <div className="bg-elevated">

                        {/* User identity header */}
                        <div className="px-4 py-3.5 border-b border-border bg-gradient-to-r from-gold/[0.06] to-transparent">
                          <p className="text-paper text-[13px] font-display font-medium truncate">
                            {session?.user?.name || "Writer"}
                          </p>
                          <p className="text-text-tertiary text-[11px] truncate mt-0.5">
                            {session?.user?.email}
                          </p>
                        </div>
                        {/* Menu links */}
                        <div className="py-1.5">
                          <Link
                            href={profileHref}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:text-paper hover:bg-gold/10 transition-all duration-200"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
                              <circle cx="8" cy="5" r="3" />
                              <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                            </svg>
                            Profile
                          </Link>
                          <Link
                            href={`/profile/${session?.user?.id}/edit`}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:text-paper hover:bg-gold/10 transition-all duration-200"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
                              <circle cx="8" cy="8" r="6" />
                              <path d="M8 5v6M5 8h6" />
                            </svg>
                            Edit Profile
                          </Link>
                          <Link
                            href="/dashboard"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:text-paper hover:bg-gold/10 transition-all duration-200"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
                              <rect x="2" y="2" width="5" height="5" />
                              <rect x="9" y="2" width="5" height="5" />
                              <rect x="2" y="9" width="5" height="5" />
                              <rect x="9" y="9" width="5" height="5" />
                            </svg>
                            Dashboard
                          </Link>
                          <Link
                            href="/scriptorium"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:text-paper hover:bg-gold/10 transition-all duration-200"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
                              <path d="M3 3h10v10H3z" />
                              <path d="M3 7h10M7 3v10" />
                            </svg>
                            Commissions
                          </Link>
                          <Link
                            href="/creator/circle"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:text-paper hover:bg-gold/10 transition-all duration-200"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
                              <circle cx="8" cy="8" r="6" />
                              <circle cx="8" cy="8" r="2.5" />
                            </svg>
                            Subscribers
                          </Link>
                          <Link
                            href="/creator/boost"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:text-paper hover:bg-gold/10 transition-all duration-200"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
                              <path d="M8 2l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" />
                            </svg>
                            Boost
                          </Link>
                          <Link
                            href="/creator/earnings"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:text-paper hover:bg-gold/10 transition-all duration-200"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
                              <path d="M8 2C8 2 4 6 4 9a4 4 0 008 0c0-3-4-7-4-7z" />
                            </svg>
                            Earnings
                          </Link>
                          <Link
                            href="/settings"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:text-paper hover:bg-gold/10 transition-all duration-200"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
                              <circle cx="8" cy="8" r="2.5" />
                              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" />
                            </svg>
                            Settings
                          </Link>
                        </div>
                        {/* Ornamental divider */}
                        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border-active to-transparent" />
                        <div className="py-1.5">
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              signOut({ callbackUrl: "/" });
                            }}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ruby/70 hover:text-ruby hover:bg-ruby/10 transition-all duration-200 w-full"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
                              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M6 8h8" />
                            </svg>
                            Sign out
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10"
              >
                Log in
              </Link>
              {/* Gold-leaf invitation button */}
              <Link
                href="/register"
                className="relative font-display font-semibold px-5 py-1.5 rounded-md text-[13px] ml-1.5 transition-all duration-300 border border-gold/30 text-gold bg-gradient-to-b from-gold/15 to-gold/5 hover:from-gold/25 hover:to-gold/10 hover:border-gold/50 hover:shadow-none hover:text-paper"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger — ornate lines */}
        <button
          className="md:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-px bg-gold/70 transition-all duration-300 ${
              mobileOpen ? "rotate-45 translate-y-[3.5px]" : ""
            }`}
          />
          <span
            className={`block w-5 h-px bg-gold/70 transition-all duration-300 ${
              mobileOpen ? "-rotate-45 -translate-y-[3.5px]" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu — secret library drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="relative md:hidden overflow-hidden"
          >
            {/* Drawer background */}
            <div className="absolute inset-0 bg-surface/98 backdrop-blur-xl" />
            {/* Top border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-border" />

            <div className="relative px-6 py-5 flex flex-col gap-1">
              {/* Mobile search — inset brass frame */}
              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-4 border border-border bg-surface/60 shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)]"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold/40">
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M10.5 10.5L14 14" />
                </svg>
                <input
                  type="text"
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[13px] text-text outline-none placeholder:text-text-ghost/60 w-full"
                />
              </form>

              {/* Primary nav — matches desktop: Dashboard · Read · Browse · Library · Write */}
              {session && (
                <Link
                  href="/dashboard"
                  className="text-paper hover:text-gold transition-all duration-300 text-[15px] font-display py-2.5 hover:pl-1"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {session && (
                <Link
                  href="/read"
                  className="text-paper hover:text-gold transition-all duration-300 text-[15px] font-display py-2.5 hover:pl-1"
                  onClick={() => setMobileOpen(false)}
                >
                  Read
                </Link>
              )}
              <Link
                href="/browse"
                className="text-paper hover:text-gold transition-all duration-300 text-[15px] font-display py-2.5 hover:pl-1"
                onClick={() => setMobileOpen(false)}
              >
                Browse
              </Link>
              <Link
                href="/pricing"
                className="text-gold hover:text-gold/80 transition-all duration-300 text-[15px] font-display py-2.5 hover:pl-1 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Pricing
              </Link>
              {session && (
                <Link
                  href="/library"
                  className="text-paper hover:text-gold transition-all duration-300 text-[15px] font-display py-2.5 hover:pl-1"
                  onClick={() => setMobileOpen(false)}
                >
                  Library
                </Link>
              )}
              {session && (
                <Link
                  href="/create"
                  className="text-paper hover:text-gold transition-all duration-300 text-[15px] font-display py-2.5 hover:pl-1"
                  onClick={() => setMobileOpen(false)}
                >
                  Write
                </Link>
              )}
              {session ? (
                <>
                  <div className="my-1.5 h-px bg-gradient-to-r from-border-active via-border to-transparent" />
                  {/* Secondary links — utilities, matching desktop user menu */}
                  <Link
                    href="/scriptorium"
                    className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] py-2 hover:pl-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    Commissions
                  </Link>
                  <Link
                    href="/creator/boost"
                    className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] py-2 hover:pl-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    Boost
                  </Link>
                  <Link
                    href="/creator/circle"
                    className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] py-2 hover:pl-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    Subscribers
                  </Link>
                  <Link
                    href="/creator/earnings"
                    className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] py-2 hover:pl-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    Earnings
                  </Link>
                  <Link
                    href="/notifications"
                    className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] py-2 hover:pl-1 flex items-center gap-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Notifications
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-gold to-copper text-void text-[10px] font-bold flex items-center justify-center shadow-[0_0_4px_var(--t-gold-soft)]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <div className="my-1.5 h-px bg-gradient-to-r from-border-active via-border to-transparent" />
                  <Link
                    href={profileHref}
                    className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] py-2 hover:pl-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] py-2 hover:pl-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    Settings
                  </Link>
                  <div className="my-1.5 h-px bg-gradient-to-r from-border-active via-border to-transparent" />
                  <button
                    onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="text-ruby/60 hover:text-ruby transition-all duration-300 text-[13px] py-2 text-left hover:pl-1"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center font-display font-semibold text-gold border border-gold/25 bg-gradient-to-b from-gold/12 to-gold/4 rounded-md py-2.5 text-[14px] hover:text-paper hover:border-gold/40 transition-all duration-300 mb-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign up
                  </Link>
                  <Link
                    href="/login"
                    className="text-text-secondary hover:text-paper transition-all duration-300 text-[14px] py-2.5 hover:pl-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log in
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
