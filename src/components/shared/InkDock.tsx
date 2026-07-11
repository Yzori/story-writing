"use client";

/*
 * The Ink Dock — Quiloria's global navigation.
 *
 * One floating pill, two gravities: top of the room on desktop, bottom
 * within thumb-reach on mobile. The IA mirrors the homepage's two doors
 * — Read and Write — with an ink stroke that slides under the active
 * door (shared layout animation). The long tail of destinations lives
 * in the Quill palette (⌘K), not here.
 */

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Compass,
  Droplet,
  Flame,
  Gauge,
  Library,
  LogOut,
  Drama,
  PenLine,
  Search,
  Settings,
  Sparkles,
  Tent,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "@/components/editor/ThemeToggle";
import { QuillRingMark } from "@/components/shared/BrandLogo";

type Door = "read" | "write";
type Flyout = Door | "you" | null;

const READ_ROUTES = [/^\/read/, /^\/browse/, /^\/library/, /^\/story\//, /^\/showcase/];
const WRITE_ROUTES = [/^\/dashboard/, /^\/create/, /^\/write\//, /^\/jams/, /^\/creator\//, /^\/commissions/, /^\/adventures/];

function activeDoor(pathname: string | null): Door | null {
  if (!pathname) return null;
  if (READ_ROUTES.some((re) => re.test(pathname))) return "read";
  if (WRITE_ROUTES.some((re) => re.test(pathname))) return "write";
  return null;
}

interface FlyoutLink {
  href: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
}

const READ_LINKS: FlyoutLink[] = [
  { href: "/read", label: "For You", hint: "tonight's picks", icon: BookOpen },
  { href: "/browse", label: "The Stacks", hint: "browse everything", icon: Compass },
  { href: "/library", label: "My Library", hint: "saved & in progress", icon: Library },
];

const WRITE_LINKS: FlyoutLink[] = [
  { href: "/dashboard", label: "The Studio", hint: "your desk", icon: Gauge },
  { href: "/create", label: "Begin a story", hint: "blank page", icon: PenLine },
  { href: "/adventures", label: "Adventures", hint: "find a table", icon: Drama },
  { href: "/jams", label: "Story Jams", icon: Tent },
];

const TRADE_LINKS: FlyoutLink[] = [
  { href: "/creator/monetization", label: "Earnings", icon: Wallet },
  { href: "/commissions", label: "Commissions", icon: Sparkles },
];

interface Props {
  signedIn: boolean;
  loading: boolean;
  displayName: string | null;
  initial: string;
  profileHref: string;
  unreadCount: number;
  inkDropBalance: number | null;
  streakDays: number | null;
  onOpenPalette: () => void;
  onSignOut: () => void;
}

export default function InkDock({
  signedIn,
  loading,
  displayName,
  initial,
  profileHref,
  unreadCount,
  inkDropBalance,
  streakDays,
  onOpenPalette,
  onSignOut,
}: Props) {
  const pathname = usePathname();
  const door = activeDoor(pathname);
  const [flyout, setFlyout] = useState<Flyout>(null);
  const [hidden, setHidden] = useState(false);
  const dockRef = useRef<HTMLElement>(null);
  const lastY = useRef(0);

  // Close flyouts on outside interaction and route change.
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) setFlyout(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  useEffect(() => setFlyout(null), [pathname]);

  // The dock breathes with attention: recede on scroll-down, return on
  // scroll-up. Never while a flyout is open.
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;
      if (flyout) return;
      if (y < 80) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
      } else if (delta < -6) {
        setHidden(false);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [flyout]);

  const toggle = (which: Flyout) => setFlyout((f) => (f === which ? null : which));

  return (
    <nav
      ref={dockRef}
      aria-label="Primary"
      className={`fixed z-50 transition-transform duration-500 ease-out max-md:bottom-3 max-md:inset-x-3 max-md:flex max-md:justify-center md:top-3 md:left-1/2 md:-translate-x-1/2 ${
        hidden
          ? "max-md:translate-y-[130%] md:!-translate-x-1/2 md:!-translate-y-[180%]"
          : ""
      }`}
    >
      <div className="relative">
        {/* the pill */}
        <div className="flex items-center gap-0.5 md:gap-1 rounded-full border border-gold/15 bg-ink/85 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_14px_44px_rgba(0,0,0,0.55)] pl-2.5 pr-2 py-1.5">
          <Link
            href="/"
            aria-label="Quiloria — home"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-paper/90 hover:text-gold transition-colors shrink-0"
          >
            <QuillRingMark className="w-6 h-6" />
          </Link>

          <div className="w-px h-5 bg-border mx-0.5 md:mx-1" aria-hidden />

          {loading ? (
            <div className="w-24 h-8" aria-hidden />
          ) : signedIn ? (
            <>
              {/* the two doors */}
              <DoorButton
                label="Read"
                active={door === "read"}
                open={flyout === "read"}
                onClick={() => toggle("read")}
              />
              <DoorButton
                label="Write"
                active={door === "write"}
                open={flyout === "write"}
                onClick={() => toggle("write")}
              />

              <div className="w-px h-5 bg-border mx-0.5 md:mx-1" aria-hidden />

              {/* the quill — summon anything */}
              <button
                onClick={onOpenPalette}
                aria-label="Open the Quill — search and quick actions"
                className="inline-flex items-center gap-2 h-8 px-2.5 rounded-full text-text-secondary hover:text-paper hover:bg-paper/[0.05] transition-colors"
              >
                <Search size={15} strokeWidth={1.6} />
                <kbd className="hidden md:inline text-[9px] uppercase tracking-[0.12em] text-text-ghost border border-border rounded px-1 py-px">
                  ⌘K
                </kbd>
              </button>

              <Link
                href="/notifications"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
                className="relative inline-flex items-center justify-center w-8 h-8 rounded-full text-text-secondary hover:text-paper hover:bg-paper/[0.05] transition-colors"
              >
                <Bell size={15} strokeWidth={1.6} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-gold text-on-gold text-[8px] font-bold inline-flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => toggle("you")}
                aria-label="Open your menu"
                aria-expanded={flyout === "you"}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-[11px] font-semibold transition-colors ${
                  flyout === "you"
                    ? "border-gold/50 bg-gold/15 text-gold-light"
                    : "border-gold/25 bg-gold/[0.08] text-gold hover:border-gold/45"
                }`}
              >
                {initial}
              </button>
            </>
          ) : (
            <>
              <DockLink href="/browse" label="The Stacks" />
              <DockLink href="/pricing" label="Pricing" />
              <button
                onClick={onOpenPalette}
                aria-label="Open the Quill — search"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-text-secondary hover:text-paper hover:bg-paper/[0.05] transition-colors"
              >
                <Search size={15} strokeWidth={1.6} />
              </button>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center h-8 px-3 rounded-full text-[12.5px] text-text-secondary hover:text-paper transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center h-8 px-3.5 rounded-full bg-gold text-on-gold text-[12.5px] font-semibold hover:bg-gold-light transition-colors"
              >
                pick up the quill
              </Link>
            </>
          )}
        </div>

        {/* ── flyouts — below the dock on desktop, above it on mobile ── */}
        <AnimatePresence>
          {flyout === "read" && (
            <FlyoutPanel side="left" onNavigate={() => setFlyout(null)} links={READ_LINKS} />
          )}
          {flyout === "write" && (
            <FlyoutPanel
              side="left"
              onNavigate={() => setFlyout(null)}
              links={WRITE_LINKS}
              trade={TRADE_LINKS}
            />
          )}
          {flyout === "you" && (
            <motion.div
              key="you"
              className="absolute right-0 w-64 max-md:bottom-full max-md:mb-3 md:top-full md:mt-3"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            >
              <div className="rounded-2xl border border-gold/15 bg-ink/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
                <div className="px-4 pt-3.5 pb-3 border-b border-border">
                  <p className="text-[13px] text-paper font-medium truncate">{displayName ?? "You"}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Link
                      href="/settings/ink-drops"
                      onClick={() => setFlyout(null)}
                      className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full border border-gold/25 bg-gold/[0.06] text-gold text-[10.5px] hover:border-gold/45 transition-colors"
                    >
                      <Droplet size={11} strokeWidth={1.7} />
                      {inkDropBalance ?? "—"} drops
                    </Link>
                    {streakDays != null && streakDays > 0 && (
                      <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full border border-copper/30 bg-copper/[0.08] text-copper text-[10.5px]">
                        <Flame size={11} strokeWidth={1.7} />
                        {streakDays}-day streak
                      </span>
                    )}
                  </div>
                </div>
                <div className="py-1.5">
                  <YouLink href={profileHref} label="Profile" icon={User} onClick={() => setFlyout(null)} />
                  <YouLink href="/settings" label="Settings" icon={Settings} onClick={() => setFlyout(null)} />
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-[12.5px] text-text-secondary">Midnight / Vellum</span>
                    <ThemeToggle />
                  </div>
                </div>
                <div className="border-t border-border py-1.5">
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-text-secondary hover:text-ruby hover:bg-ruby/[0.05] transition-colors"
                  >
                    <LogOut size={13} strokeWidth={1.6} className="opacity-70" />
                    Close the book for tonight
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

// A door button — the ink stroke slides between the two via layoutId.
function DoorButton({
  label,
  active,
  open,
  onClick,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className={`relative inline-flex items-center h-8 px-3 md:px-3.5 rounded-full text-[12.5px] md:text-[13px] transition-colors ${
        active || open ? "text-gold-light" : "text-text-secondary hover:text-paper"
      }`}
    >
      {label}
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        className={`ml-1.5 opacity-50 transition-transform duration-300 ${open ? "max-md:rotate-0 md:rotate-180" : "max-md:rotate-180"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M1.5 3l2.5 2.5L6.5 3" />
      </svg>
      {active && (
        <motion.span
          layoutId="dock-ink"
          className="absolute bottom-0.5 left-3 right-3 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
          aria-hidden
        />
      )}
    </button>
  );
}

function DockLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center h-8 px-3 rounded-full text-[12.5px] md:text-[13px] text-text-secondary hover:text-paper transition-colors"
    >
      {label}
    </Link>
  );
}

function FlyoutPanel({
  side,
  links,
  trade,
  onNavigate,
}: {
  side: "left" | "right";
  links: FlyoutLink[];
  trade?: FlyoutLink[];
  onNavigate: () => void;
}) {
  return (
    <motion.div
      className={`absolute w-72 max-md:bottom-full max-md:mb-3 md:top-full md:mt-3 ${side === "left" ? "left-0 max-md:left-1/2 max-md:-translate-x-1/2" : "right-0"}`}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    >
      <div className="rounded-2xl border border-gold/15 bg-ink/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] py-1.5">
        {links.map((link) => (
          <YouLink key={link.href} {...link} onClick={onNavigate} />
        ))}
        {trade && (
          <>
            <p className="px-4 pt-2.5 pb-1 text-[9px] uppercase tracking-[0.26em] text-text-ghost border-t border-border mt-1.5">
              The trade
            </p>
            {trade.map((link) => (
              <YouLink key={link.href} {...link} onClick={onNavigate} />
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}

function YouLink({
  href,
  label,
  hint,
  icon: Icon,
  onClick,
}: FlyoutLink & { onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-text-secondary hover:text-paper hover:bg-paper/[0.04] transition-colors"
    >
      <Icon size={13} strokeWidth={1.6} className="opacity-60 shrink-0" />
      <span className="flex-1 whitespace-nowrap">{label}</span>
      {hint && <span className="whitespace-nowrap text-[9.5px] uppercase tracking-[0.12em] text-text-ghost">{hint}</span>}
    </Link>
  );
}
