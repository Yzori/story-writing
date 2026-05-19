"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { BookOpen, Compass, Gauge, PenLine, Sparkles, type LucideIcon } from "lucide-react";

const NAV_LINKS = [
  { label: "Explore", href: "/browse", icon: Compass },
  { label: "Write", href: "/create", icon: PenLine },
  { label: "My Desk", href: "/dashboard", icon: Gauge },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-ink/80 backdrop-blur-xl shadow-lg shadow-ink/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg
            className="w-7 h-7 text-amber transition-transform duration-300 group-hover:rotate-[-12deg]"
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
          <span className="font-display text-xl font-bold text-cream tracking-wide">
            Quiloria
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-linen/70 hover:text-amber transition-colors duration-300 text-sm tracking-wide"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-4 px-5 py-2 rounded-full border border-amber/30 text-amber hover:bg-amber hover:text-ink transition-all duration-300 text-sm font-medium"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden relative flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-full border border-amber/20 bg-ink/35 text-amber transition-colors hover:bg-amber/10"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="landing-mobile-menu"
        >
          <span
            className={`block h-px w-[18px] bg-current transition-all duration-300 ${
              mobileOpen ? "translate-y-1 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-px w-[18px] bg-current transition-all duration-300 ${
              mobileOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-px w-[18px] bg-current transition-all duration-300 ${
              mobileOpen ? "-translate-y-1 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 top-[72px] z-40 bg-ink/65 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              id="landing-mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              className="fixed right-0 top-[72px] z-50 flex h-[calc(100dvh-72px)] w-full max-w-[420px] flex-col overflow-hidden border-l border-amber/15 bg-charcoal/98 shadow-2xl shadow-ink/60 backdrop-blur-2xl md:hidden"
            >
              <div className="border-b border-espresso/60 px-6 py-5">
                <p className="font-display text-xl font-semibold text-cream">Quiloria</p>
                <p className="mt-1 text-sm leading-relaxed text-linen/60">A place to read, write, and gather around stories.</p>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-1">
                  {NAV_LINKS.map((link) => (
                    <LandingMobileLink
                      key={link.label}
                      href={link.href}
                      label={link.label}
                      icon={link.icon}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                  <LandingMobileLink
                    href="/read"
                    label="Start reading"
                    icon={BookOpen}
                    onClick={() => setMobileOpen(false)}
                  />
                  <LandingMobileLink
                    href="/demo/try"
                    label="Try editor"
                    icon={Sparkles}
                    badge="Free"
                    featured
                    onClick={() => setMobileOpen(false)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-espresso/60 px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <Link
                  href="/login"
                  className="flex min-h-11 items-center justify-center rounded-full border border-amber/25 text-sm font-medium text-amber transition-colors hover:bg-amber/10"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="flex min-h-11 items-center justify-center rounded-full bg-amber text-sm font-semibold text-ink transition-colors hover:bg-cream"
                  onClick={() => setMobileOpen(false)}
                >
                  Join
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function LandingMobileLink({
  href,
  label,
  icon: Icon,
  onClick,
  featured = false,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  featured?: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-12 items-center justify-between rounded-xl px-4 font-display text-lg transition-colors ${
        featured
          ? "border border-amber/25 bg-amber/12 text-amber hover:border-amber/45 hover:text-cream"
          : "text-cream hover:bg-amber/10 hover:text-amber"
      }`}
      onClick={onClick}
    >
      <span className="flex items-center gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
          featured ? "bg-amber/15 text-amber" : "bg-cream/[0.04] text-linen/55 group-hover:text-amber"
        }`}>
          <Icon size={16} strokeWidth={1.7} />
        </span>
        <span>{label}</span>
      </span>
      {badge && (
        <span className="rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
          {badge}
        </span>
      )}
    </Link>
  );
}
