"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useSession, signOut, type SessionContextValue } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Compass,
  CreditCard,
  Droplet,
  Flame,
  Gauge,
  Library,
  LogIn,
  Megaphone,
  PenLine,
  Settings,
  Sparkles,
  User,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "@/components/editor/ThemeToggle";

// Surfaces where the global Navbar is fully suppressed (auth flows,
// onboarding, and full-screen demos). Adventure play/watch now render
// below the platform nav by default, with an in-session focus toggle
// for an immersive full-screen view.
const HIDE_NAVBAR_PATTERNS: RegExp[] = [
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/forgot-password(\/|$)/,
  /^\/reset-password(\/|$)/,
  /^\/welcome(\/|$)/,
  /^\/demo\//,
];

// Surfaces that need the full mobile viewport — top bar still shows,
// but the mobile bottom tab bar is suppressed so it doesn't clash with
// editor keyboard chrome or floating writer prompts.
const HIDE_BOTTOM_TAB_EXTRA: RegExp[] = [/^\/write\//];

export default function Navbar() {
  const pathname = usePathname();
  if (pathname && HIDE_NAVBAR_PATTERNS.some((re) => re.test(pathname))) {
    return null;
  }
  const hideBottomTab = Boolean(
    pathname && HIDE_BOTTOM_TAB_EXTRA.some((re) => re.test(pathname))
  );
  return <NavbarInner hideBottomTab={hideBottomTab} />;
}

type StreakState = {
  days: number;
  status: "active" | "at-risk" | "broken" | "none";
};

type Session = SessionContextValue["data"];

function NavbarInner({ hideBottomTab }: { hideBottomTab: boolean }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [youSheetOpen, setYouSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inkDropBalance, setInkDropBalance] = useState<number | null>(null);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { data: session, status: sessionStatus } = useSession();
  const isLoading = sessionStatus === "loading";
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Lock body scroll while the "You" sheet is open + Escape to close
  useEffect(() => {
    if (!youSheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setYouSheetOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [youSheetOpen]);

  // Tag <body> when the bottom tab is mounted so the responsive
  // padding-bottom rule in globals.css can keep page content above it.
  useEffect(() => {
    if (hideBottomTab) return;
    document.body.classList.add("with-bottom-tab");
    return () => document.body.classList.remove("with-bottom-tab");
  }, [hideBottomTab]);

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
    return () => {
      controller.abort();
      clearInterval(interval);
    };
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
    return () => {
      controller.abort();
      clearInterval(interval);
    };
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
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const profileHref = session?.user?.id ? `/profile/${session.user.id}` : "/login";
  const initial = session?.user?.name?.charAt(0)?.toUpperCase() || "?";

  const streakVisible = Boolean(
    streak && streak.days > 0 && (streak.status === "active" || streak.status === "at-risk")
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50">
        {/* Background — frosted glass (Apple-style: translucent + blur + saturate) */}
        <div className="absolute inset-0 bg-void/75 backdrop-blur-2xl backdrop-saturate-150" />
        {/* Bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />

        <div className="relative max-w-7xl mx-auto px-5 md:px-6 h-14 flex items-center justify-between gap-4">
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

          {/* Center: Search — inset brass frame (desktop only) */}
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

          {/* Right: Desktop nav links + user */}
          <div className="hidden md:flex items-center gap-0.5">
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
            {!session && (
              <Link
                href="/pricing"
                className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10"
              >
                Pricing
              </Link>
            )}
            {session && (
              <Link
                href="/dashboard"
                className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10 hover:shadow-none"
              >
                Dashboard
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

                <div className="scale-75 -mx-1">
                  <ThemeToggle />
                </div>

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

                {streakVisible && (
                  <Link
                    href="/read"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 ${
                      streak!.status === "at-risk"
                        ? "text-rose hover:bg-rose/10 hover:text-rose"
                        : "text-amber hover:bg-amber/10"
                    }`}
                    title={
                      streak!.status === "at-risk"
                        ? `${streak!.days}-day streak — read today to keep it alive`
                        : `${streak!.days}-day reading streak`
                    }
                  >
                    <span className="text-[11px]" aria-hidden>🔥</span>
                    <span className="text-[11px] tabular-nums font-medium">{streak!.days}</span>
                  </Link>
                )}

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
                          <div className="px-4 py-3.5 border-b border-border bg-gradient-to-r from-gold/[0.06] to-transparent">
                            <p className="text-paper text-[13px] font-display font-medium truncate">
                              {session?.user?.name || "Writer"}
                            </p>
                            <p className="text-text-tertiary text-[11px] truncate mt-0.5">
                              {session?.user?.email}
                            </p>
                          </div>
                          <div className="py-1.5">
                            <DropdownLink href={profileHref} onClick={() => setUserMenuOpen(false)} icon={(<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" /></svg>)}>Profile</DropdownLink>
                            <DropdownLink href={`/profile/${session?.user?.id}/edit`} onClick={() => setUserMenuOpen(false)} icon={(<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><circle cx="8" cy="8" r="6" /><path d="M8 5v6M5 8h6" /></svg>)}>Edit Profile</DropdownLink>
                            <DropdownLink href="/library" onClick={() => setUserMenuOpen(false)} icon={(<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><path d="M3 2h10v12H3z" /><path d="M6 2v12M10 2v12" /></svg>)}>Library</DropdownLink>
                            <DropdownLink href="/dashboard" onClick={() => setUserMenuOpen(false)} icon={(<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><rect x="2" y="2" width="5" height="5" /><rect x="9" y="2" width="5" height="5" /><rect x="2" y="9" width="5" height="5" /><rect x="9" y="9" width="5" height="5" /></svg>)}>Dashboard</DropdownLink>
                            <DropdownLink href="/commissions" onClick={() => setUserMenuOpen(false)} icon={(<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><path d="M3 3h10v10H3z" /><path d="M3 7h10M7 3v10" /></svg>)}>Commissions</DropdownLink>
                            <DropdownLink href="/creator/monetization" onClick={() => setUserMenuOpen(false)} icon={(<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><path d="M8 2v12M4 5h6a2 2 0 010 4H6a2 2 0 000 4h6" /></svg>)}>Monetization</DropdownLink>
                            <DropdownLink href="/creator/boost" onClick={() => setUserMenuOpen(false)} icon={(<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><path d="M8 2l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" /></svg>)}>Boost</DropdownLink>
                            <DropdownLink href="/pricing" onClick={() => setUserMenuOpen(false)} icon={(<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><path d="M2 6l6-4 6 4v8H2z" /><path d="M6 14V9h4v5" /></svg>)}>Pricing</DropdownLink>
                            <DropdownLink href="/settings" onClick={() => setUserMenuOpen(false)} icon={(<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" /></svg>)}>Settings</DropdownLink>
                          </div>
                          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border-active to-transparent" />
                          <div className="py-1.5">
                            <button
                              onClick={() => {
                                setUserMenuOpen(false);
                                signOut({ callbackUrl: "/" });
                              }}
                              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ruby/70 hover:text-ruby hover:bg-ruby/10 transition-all duration-200 w-full"
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M6 8h8" /></svg>
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
                  href="/demo/try"
                  className="text-text hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10 font-medium"
                >
                  Try editor
                </Link>
                <div className="scale-75 -mx-1">
                  <ThemeToggle />
                </div>
                <Link
                  href="/login"
                  className="text-text-secondary hover:text-paper transition-all duration-300 text-[13px] px-3 py-2 rounded-lg hover:bg-gold/10"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="relative font-display font-semibold px-5 py-1.5 rounded-full text-[13px] ml-1.5 transition-all duration-300 border border-gold/30 text-gold bg-gradient-to-b from-gold/15 to-gold/5 hover:from-gold/25 hover:to-gold/10 hover:border-gold/50 hover:text-paper"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Right: Mobile slim chrome — glanceable streak + bell + sign-up */}
          <div className="flex md:hidden items-center gap-1.5">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-[var(--t-card-bg)] border border-border animate-pulse" />
            ) : session ? (
              <>
                {streakVisible && (
                  <Link
                    href="/read"
                    aria-label={
                      streak!.status === "at-risk"
                        ? `${streak!.days}-day streak at risk — read today to keep it alive`
                        : `${streak!.days}-day reading streak`
                    }
                    className={`inline-flex h-8 items-center gap-1 rounded-full border px-2.5 transition-colors ${
                      streak!.status === "at-risk"
                        ? "border-rose/25 bg-rose/10 text-rose"
                        : "border-gold/25 bg-gold/10 text-gold"
                    }`}
                  >
                    <Flame size={11} strokeWidth={2.2} />
                    <span className="text-[11px] tabular-nums font-medium">{streak!.days}</span>
                  </Link>
                )}
                <Link
                  href="/notifications"
                  aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
                  className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/40 text-gold/80 transition-colors hover:border-gold/25 hover:bg-gold/10"
                >
                  <Bell size={15} strokeWidth={1.7} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-gradient-to-br from-gold to-copper shadow-[0_0_4px_var(--t-gold-soft)]" />
                  )}
                </Link>
              </>
            ) : (
              <>
                <div className="scale-[0.62] -mx-2">
                  <ThemeToggle />
                </div>
                <Link
                  href="/register"
                  className="inline-flex h-8 items-center rounded-full border border-gold/30 bg-gradient-to-b from-gold/15 to-gold/5 px-3.5 font-display text-[12px] font-semibold text-gold transition-colors hover:border-gold/50 hover:text-paper"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      {!hideBottomTab && (
        <MobileBottomTab
          signedIn={Boolean(session)}
          loading={isLoading}
          pathname={pathname}
          unreadCount={unreadCount}
          onOpenYou={() => setYouSheetOpen(true)}
          youActive={youSheetOpen}
        />
      )}

      {/* "You" bottom sheet (signed-in mobile secondary menu) */}
      <AnimatePresence>
        {youSheetOpen && session && (
          <YouSheet
            onClose={() => setYouSheetOpen(false)}
            session={session}
            profileHref={profileHref}
            initial={initial}
            pathname={pathname}
            streak={streak}
            inkDropBalance={inkDropBalance}
            unreadCount={unreadCount}
            onSignOut={() => {
              setYouSheetOpen(false);
              signOut({ callbackUrl: "/" });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function DropdownLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:text-paper hover:bg-gold/10 transition-all duration-200"
    >
      {icon}
      {children}
    </Link>
  );
}

// ============================================================
// Mobile bottom tab bar
// ============================================================

type LinkTab = {
  kind: "link";
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};
type YouTab = { kind: "you"; label: string; icon: LucideIcon };
type Tab = LinkTab | YouTab;

function MobileBottomTab({
  signedIn,
  loading,
  pathname,
  unreadCount,
  onOpenYou,
  youActive,
}: {
  signedIn: boolean;
  loading: boolean;
  pathname: string | null;
  unreadCount: number;
  onOpenYou: () => void;
  youActive: boolean;
}) {
  const tabs: Tab[] = signedIn
    ? [
        { kind: "link", href: "/read", label: "Read", icon: BookOpen },
        { kind: "link", href: "/browse", label: "Browse", icon: Compass },
        { kind: "link", href: "/create", label: "Write", icon: PenLine, primary: true },
        { kind: "you", label: "You", icon: User },
      ]
    : [
        { kind: "link", href: "/browse", label: "Browse", icon: Compass },
        { kind: "link", href: "/demo/try", label: "Try editor", icon: Sparkles, primary: true },
        { kind: "link", href: "/pricing", label: "Pricing", icon: CreditCard },
        { kind: "link", href: "/login", label: "Sign in", icon: LogIn },
      ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="absolute inset-0 bg-void/85 backdrop-blur-2xl backdrop-saturate-150" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="relative grid h-[58px] grid-cols-4">
        {loading
          ? null
          : tabs.map((tab, i) => {
              if (tab.kind === "you") {
                const Icon = tab.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={onOpenYou}
                    aria-label="Open profile menu"
                    aria-expanded={youActive}
                    className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                      youActive ? "text-gold" : "text-text-ghost active:text-gold"
                    }`}
                  >
                    {youActive && (
                      <span className="absolute top-1 h-[2px] w-7 rounded-full bg-gold/80 shadow-[0_0_6px_var(--t-gold-soft)]" />
                    )}
                    <span className="relative">
                      <Icon size={20} strokeWidth={youActive ? 2 : 1.8} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full bg-gradient-to-br from-gold to-copper shadow-[0_0_4px_var(--t-gold-soft)]" />
                      )}
                    </span>
                    <span className={`text-[10px] tracking-wide ${youActive ? "font-semibold" : "font-medium"}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              }

              const Icon = tab.icon;
              const active = pathname
                ? tab.href === pathname || (tab.href !== "/" && pathname.startsWith(`${tab.href}/`))
                : false;
              const primaryIdle = Boolean(tab.primary) && !active && !signedIn;

              return (
                <Link
                  key={i}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    active
                      ? "text-gold"
                      : primaryIdle
                        ? "text-gold/80 active:text-gold"
                        : "text-text-ghost active:text-gold"
                  }`}
                >
                  {active && (
                    <span className="absolute top-1 h-[2px] w-7 rounded-full bg-gold/80 shadow-[0_0_6px_var(--t-gold-soft)]" />
                  )}
                  <span className={`relative ${primaryIdle ? "drop-shadow-[0_0_5px_var(--t-gold-soft)]" : ""}`}>
                    <Icon size={20} strokeWidth={active || primaryIdle ? 2 : 1.8} />
                  </span>
                  <span className={`text-[10px] tracking-wide ${active || primaryIdle ? "font-semibold" : "font-medium"}`}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
      </div>
    </nav>
  );
}

// ============================================================
// "You" bottom sheet
// ============================================================

function YouSheet({
  onClose,
  session,
  profileHref,
  initial,
  pathname,
  streak,
  inkDropBalance,
  unreadCount,
  onSignOut,
}: {
  onClose: () => void;
  session: NonNullable<Session>;
  profileHref: string;
  initial: string;
  pathname: string | null;
  streak: StreakState | null;
  inkDropBalance: number | null;
  unreadCount: number;
  onSignOut: () => void;
}) {
  return (
    <>
      <motion.button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-40 bg-void/65 backdrop-blur-sm md:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Profile menu"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col overflow-hidden rounded-t-3xl border-t border-gold/20 bg-elevated/95 shadow-[var(--t-shadow-modal)] backdrop-blur-2xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Grab handle */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 items-center justify-center pt-2.5"
        >
          <span className="h-1 w-10 rounded-full bg-paper/20" />
        </button>

        {/* Identity header — gold-leaf wash + ornamental rule */}
        <div className="relative px-5 pb-4 pt-1">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-gold/[0.08] via-gold/[0.02] to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/25 via-gold/10 to-copper/10 font-display text-base font-bold text-gold shadow-[0_0_20px_var(--t-gold-soft)]">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[15px] font-medium text-paper">
                {session.user?.name || "Writer"}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-text-ghost">{session.user?.email}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface/40 text-text-ghost transition-colors hover:border-gold/25 hover:text-gold"
            >
              <X size={16} strokeWidth={1.7} />
            </button>
          </div>
          {(streak?.days || inkDropBalance !== null || unreadCount > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {streak && streak.days > 0 && (
                <Chip
                  icon={Flame}
                  label={`${streak.days} day streak`}
                  tone={streak.status === "at-risk" ? "danger" : "accent"}
                />
              )}
              {inkDropBalance !== null && (
                <Chip icon={Droplet} label={`${inkDropBalance} drops`} href="/settings/ink-drops" onClose={onClose} />
              )}
              {unreadCount > 0 && (
                <Chip
                  icon={Bell}
                  label={`${unreadCount > 9 ? "9+" : unreadCount} unread`}
                  href="/notifications"
                  onClose={onClose}
                />
              )}
            </div>
          )}
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <Section label="Library">
            <SheetLink href={profileHref} label="Profile" icon={User} onClose={onClose} pathname={pathname} />
            <SheetLink href="/library" label="Saved library" icon={Library} onClose={onClose} pathname={pathname} />
            <SheetLink href="/dashboard" label="Dashboard" icon={Gauge} onClose={onClose} pathname={pathname} />
            <SheetLink
              href="/notifications"
              label="Notifications"
              icon={Bell}
              onClose={onClose}
              pathname={pathname}
              badge={unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : undefined}
            />
          </Section>
          <Section label="Creator">
            <SheetLink href="/commissions" label="Commissions" icon={Megaphone} onClose={onClose} pathname={pathname} />
            <SheetLink href="/creator/monetization" label="Monetization" icon={Wallet} onClose={onClose} pathname={pathname} />
            <SheetLink href="/creator/boost" label="Boost" icon={Sparkles} onClose={onClose} pathname={pathname} />
          </Section>
          <Section label="Account">
            <SheetLink href="/settings" label="Settings" icon={Settings} onClose={onClose} pathname={pathname} />
            <SheetLink href="/pricing" label="Pricing" icon={CreditCard} onClose={onClose} pathname={pathname} />
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3">
          <button
            onClick={onSignOut}
            className="flex min-h-11 w-full items-center justify-center rounded-full border border-ruby/20 text-[14px] font-medium text-ruby/75 transition-colors hover:bg-ruby/10 hover:text-ruby"
          >
            Sign out
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-3">
      <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-ghost">{label}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function SheetLink({
  href,
  label,
  icon: Icon,
  onClose,
  pathname,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  onClose: () => void;
  pathname: string | null;
  badge?: string;
}) {
  const active = Boolean(
    pathname && (pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)))
  );

  return (
    <Link
      href={href}
      onClick={onClose}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-11 items-center justify-between rounded-xl px-3 transition-colors ${
        active ? "bg-gold/10 text-gold" : "text-text-secondary hover:bg-gold/10 hover:text-paper"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            active
              ? "bg-gold/15 text-gold"
              : "bg-paper/[0.04] text-text-ghost group-hover:bg-gold/15 group-hover:text-gold"
          }`}
        >
          <Icon size={15} strokeWidth={1.7} />
        </span>
        <span className={`truncate text-[14px] ${active ? "font-medium" : ""}`}>{label}</span>
      </span>
      <span className="ml-3 flex shrink-0 items-center gap-2">
        {badge && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold/90 px-1.5 text-[10px] font-bold text-void">
            {badge}
          </span>
        )}
        <ChevronRight
          size={15}
          className={active ? "text-gold/80" : "text-text-ghost/60 group-hover:text-gold/80"}
        />
      </span>
    </Link>
  );
}

function Chip({
  icon: Icon,
  label,
  tone = "neutral",
  href,
  onClose,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "neutral" | "accent" | "danger";
  href?: string;
  onClose?: () => void;
}) {
  const className = `inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors ${
    tone === "danger"
      ? "border-ruby/20 bg-ruby/10 text-ruby"
      : tone === "accent"
        ? "border-gold/20 bg-gold/10 text-gold"
        : "border-border bg-elevated/50 text-text-secondary"
  } ${href ? "hover:border-gold/30 hover:text-paper" : ""}`;

  const content = (
    <>
      <Icon size={12} strokeWidth={1.8} />
      <span className="whitespace-nowrap">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClose} className={className}>
        {content}
      </Link>
    );
  }
  return <span className={className}>{content}</span>;
}
