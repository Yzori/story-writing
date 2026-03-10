"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "Explore", href: "/browse" },
  { label: "Write", href: "/create" },
  { label: "My Desk", href: "/dashboard" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
        <a href="/" className="flex items-center gap-2.5 group">
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
            Inkwell
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-linen/70 hover:text-amber transition-colors duration-300 text-sm tracking-wide"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="ml-4 px-5 py-2 rounded-full border border-amber/30 text-amber hover:bg-amber hover:text-ink transition-all duration-300 text-sm font-medium"
          >
            Sign In
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-px bg-cream transition-all duration-300 ${
              mobileOpen ? "rotate-45 translate-y-[3.5px]" : ""
            }`}
          />
          <span
            className={`block w-5 h-px bg-cream transition-all duration-300 ${
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
            className="md:hidden bg-charcoal/95 backdrop-blur-xl border-t border-espresso/50 overflow-hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-linen/70 hover:text-amber transition-colors text-base"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/login"
                className="mt-2 px-5 py-2.5 rounded-full border border-amber/30 text-amber text-center hover:bg-amber hover:text-ink transition-all text-sm font-medium"
              >
                Sign In
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
