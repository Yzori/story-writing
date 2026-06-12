"use client";

/*
 * The lamp switch — Quiloria's theme toggle.
 *
 * A slip of sky in a pill: at Midnight the flame-knob glows at the right
 * end under three slow-twinkling stars; in Vellum a porcelain knob with a
 * small bronze sun rests at the left on a white track. Spring slide,
 * soft flame bloom, no generic sun/moon icon-swap.
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { type Theme, setTheme, getStoredTheme, THEME_CHANGE_EVENT } from "@/client/theme";

// Star field on the night side of the track (knob sits right when dark).
const STARS = [
  { left: 9, top: 7, size: 3, delay: 0 },
  { left: 16, top: 15, size: 2, delay: 1.3 },
  { left: 22, top: 8, size: 2, delay: 2.1 },
];

export default function ThemeToggle() {
  const [current, setCurrent] = useState<Theme>("dark");

  // Sync from storage after mount (SSR renders dark), then stay in sync
  // with every other lamp in the app — dock, reader, the Quill palette.
  useEffect(() => {
    setCurrent(getStoredTheme());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<Theme>).detail;
      if (detail === "dark" || detail === "light") setCurrent(detail);
    };
    window.addEventListener(THEME_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  }, []);

  const isDark = current === "dark";
  // setTheme dispatches THEME_CHANGE_EVENT, which round-trips into setCurrent.
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Turn the lamp — toggle dark and light theme"
      onClick={toggleTheme}
      whileTap={{ scale: 0.94 }}
      className="relative inline-flex w-[46px] h-[26px] shrink-0 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
    >
      {/* Track — midnight sky / vellum paper */}
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full"
        initial={false}
        animate={{
          background: isDark
            ? "linear-gradient(160deg, #0A0D18 10%, #18223C 90%)"
            : "linear-gradient(160deg, #FFFFFF 10%, #ECE9E0 90%)",
          boxShadow: isDark
            ? "inset 0 1px 3px rgba(2, 4, 9, 0.6), inset 0 0 0 1px rgba(240, 199, 108, 0.22)"
            : "inset 0 1px 3px rgba(27, 34, 48, 0.10), inset 0 0 0 1px rgba(27, 34, 48, 0.14)",
        }}
        transition={{ duration: 0.45 }}
      />

      {/* Stars — fade in at night, gone by day */}
      {STARS.map((star, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-[#F2EDDD]"
          style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
          initial={false}
          animate={
            isDark
              ? { opacity: [0.3, 0.9, 0.3], scale: 1 }
              : { opacity: 0, scale: 0.4 }
          }
          transition={
            isDark
              ? { duration: 3.4, repeat: Infinity, delay: star.delay, ease: "easeInOut" }
              : { duration: 0.25 }
          }
        />
      ))}

      {/* Knob — flame at night, porcelain sun by day */}
      <motion.span
        aria-hidden
        className="absolute top-[3px] left-[3px] w-5 h-5 rounded-full flex items-center justify-center"
        initial={false}
        animate={{
          x: isDark ? 20 : 0,
          background: isDark
            ? "radial-gradient(circle at 35% 30%, #F6D88A 0%, #E2AC4A 55%, #C18F33 100%)"
            : "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F2EFE7 100%)",
          boxShadow: isDark
            ? "0 0 10px rgba(226, 172, 74, 0.55), 0 0 22px rgba(226, 172, 74, 0.25), 0 1px 2px rgba(2, 4, 9, 0.5)"
            : "0 0 0 1px rgba(27, 34, 48, 0.12), 0 1px 3px rgba(27, 34, 48, 0.20)",
        }}
        transition={{ type: "spring", stiffness: 520, damping: 32 }}
      >
        {/* flame silhouette */}
        <motion.svg
          width="9"
          height="12"
          viewBox="0 0 10 13"
          className="absolute"
          initial={false}
          animate={{ opacity: isDark ? 0.9 : 0, scale: isDark ? 1 : 0.4 }}
          transition={{ duration: 0.3 }}
        >
          <path
            d="M5 0.5 C5 0.5 9 5.2 9 8.2 A4 4 0 1 1 1 8.2 C1 5.2 5 0.5 5 0.5 Z"
            fill="#7A4F0F"
          />
          <path
            d="M5 4.5 C5 4.5 7.1 7.2 7.1 8.8 A2.1 2.1 0 1 1 2.9 8.8 C2.9 7.2 5 4.5 5 4.5 Z"
            fill="#F6D88A"
          />
        </motion.svg>
        {/* bronze sun */}
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="absolute"
          initial={false}
          animate={{ opacity: isDark ? 0 : 1, scale: isDark ? 0.4 : 1, rotate: isDark ? -60 : 0 }}
          transition={{ duration: 0.35 }}
        >
          <circle cx="6" cy="6" r="2.1" fill="#8A6512" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={6 + Math.cos(a) * 3.4}
                y1={6 + Math.sin(a) * 3.4}
                x2={6 + Math.cos(a) * 4.9}
                y2={6 + Math.sin(a) * 4.9}
                stroke="#8A6512"
                strokeWidth="1"
                strokeLinecap="round"
              />
            );
          })}
        </motion.svg>
      </motion.span>
    </motion.button>
  );
}
