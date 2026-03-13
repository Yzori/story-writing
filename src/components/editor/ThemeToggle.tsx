"use client";

import { useState, useEffect } from "react";
import { Theme, setTheme, getStoredTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const [current, setCurrent] = useState<Theme>("dark");

  useEffect(() => {
    const stored = getStoredTheme();
    setCurrent(stored);
    setTheme(stored);
  }, []);

  const toggle = () => {
    const next: Theme = current === "dark" ? "light" : "dark";
    setCurrent(next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-subtle/50 transition-colors cursor-pointer"
      title={current === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {current === "dark" ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="7" cy="7" r="3" />
          <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.75 2.75l1.06 1.06M10.19 10.19l1.06 1.06M2.75 11.25l1.06-1.06M10.19 3.81l1.06-1.06" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M12.5 7.5a5.5 5.5 0 1 1-6-6 4.5 4.5 0 0 0 6 6z" />
        </svg>
      )}
    </button>
  );
}
