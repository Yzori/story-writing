"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        relative flex items-center justify-center w-12 h-12 rounded-full 
        border border-border-subtle/50 backdrop-blur-md overflow-hidden 
        transition-colors duration-500 focus:outline-none focus:ring-2 focus:ring-amber/50
        ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle Theme"
    >
      <motion.div
        className="absolute inset-0 opacity-40 mix-blend-screen"
        animate={{
          background: isDark
            ? "radial-gradient(circle at center, rgba(167, 139, 250, 0.4) 0%, transparent 70%)" 
            : "radial-gradient(circle at center, rgba(198, 154, 71, 0.4) 0%, transparent 70%)" 
        }}
        transition={{ duration: 0.5 }}
      />
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <motion.div
          initial={false}
          animate={{
            opacity: isDark ? 0 : 1,
            scale: isDark ? 0.5 : 1,
            rotate: isDark ? -90 : 0,
          }}
          transition={{ duration: 0.5, ease: "anticipate" }}
          className="absolute text-amber drop-shadow-[0_0_8px_rgba(198,154,71,0.6)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            opacity: isDark ? 1 : 0,
            scale: isDark ? 1 : 0.5,
            rotate: isDark ? 0 : 90,
          }}
          transition={{ duration: 0.5, ease: "anticipate" }}
          className="absolute text-paper drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" fill="currentColor" fillOpacity="0.2" />
             <path d="M19 3v4" strokeWidth="1" opacity="0.5" />
             <path d="M21 5h-4" strokeWidth="1" opacity="0.5" />
          </svg>
        </motion.div>
      </div>
    </motion.button>
  );
}
