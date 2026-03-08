"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const CATEGORIES = [
  { id: "fantasy", label: "Fantasy", color: "#6366f1" },    // Indigo
  { id: "scifi", label: "Sci-Fi", color: "#06b6d4" },       // Cyan
  { id: "romance", label: "Romance", color: "#f43f5e" },    // Rose
  { id: "mystery", label: "Mystery", color: "#8b5cf6" },    // Violet
  { id: "thriller", label: "Thriller", color: "#ef4444" },  // Red
  { id: "historical", label: "Historical", color: "#d97706" }, // Amber
];

// Helper to generate a curved path for the magic flowing from writer to reader
function generateFlowPath(startX: number, startY: number, endX: number, endY: number) {
  const midY = (startY + endY) / 2;
  // create a wide natural sweeping curve
  const controlX = startX + (Math.random() * 200 - 100);
  return `M ${startX} ${startY} C ${controlX} ${startY + 50}, ${controlX} ${endY - 50}, ${endX} ${endY}`;
}

export default function InteractiveSplitLayout() {
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [particles, setParticles] = useState<{ id: number; path: string; delay: number; duration: number }[]>([]);
  const themeColor = activeCategory ? activeCategory.color : "#D4A574"; // Default amber

  useEffect(() => {
    // Generate particles that flow from the writer's desk down to the reader's book
    const newParticles = Array.from({ length: 40 }).map((_, i) => {
      // Start near the writer's desk (roughly 35% x, 30% y in the screen)
      const startX = window.innerWidth * 0.35 + (Math.random() * 80 - 40);
      const startY = window.innerHeight * 0.35;

      // End exactly at the reader's book (roughly 35% x, 75% y)
      const endX = window.innerWidth * 0.35 + (Math.random() * 100 - 50);
      const endY = window.innerHeight * 0.75 + (Math.random() * 40 - 20);

      return {
        id: i,
        path: generateFlowPath(startX, startY, endX, endY),
        delay: Math.random() * 8,
        duration: 3 + Math.random() * 4, // Gentle floating down
      };
    });

    setParticles(newParticles);

    const handleResize = () => {
      const refreshed = newParticles.map(p => ({
        ...p,
        path: generateFlowPath(
          window.innerWidth * 0.35 + (Math.random() * 80 - 40),
          window.innerHeight * 0.35,
          window.innerWidth * 0.35 + (Math.random() * 100 - 50),
          window.innerHeight * 0.75 + (Math.random() * 40 - 20)
        )
      }));
      setParticles(refreshed);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink font-body text-linen selection:bg-amber selection:text-ink relative">

      {/* Blueprint grid background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${themeColor} 1px, transparent 1px), linear-gradient(90deg, ${themeColor} 1px, transparent 1px)`, backgroundSize: '60px 60px' }}
      />

      {/* 
        ========================================================
        LEFT COLUMN
        ========================================================
      */}
      <div className="relative flex flex-col w-[70%] h-full border-r border-espresso/40 z-10 backdrop-blur-[2px]">

        {/* Interaction Layer (Magic flowing from Writer to Reader) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <svg className="w-full h-full">
            {particles.map((p) => (
              <g key={p.id}>
                {/* The streak / dust */}
                <motion.path
                  d={p.path}
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-colors duration-700 opacity-80"
                  initial={{ pathLength: 0, opacity: 0, pathOffset: 0 }}
                  animate={{
                    pathLength: [0, 0.2, 0],
                    opacity: [0, 0.9, 0],
                    pathOffset: [0, 1]
                  }}
                  transition={{
                    duration: p.duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: p.delay
                  }}
                  style={{ filter: `drop-shadow(0 0 12px ${themeColor})` }}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* 
          TOP HALF: The Writer (Person at modern desk + Magical Creatures)
        */}
        <div className="relative flex-1 border-b border-white/[0.05] flex flex-col items-center justify-center overflow-hidden">
          {/* Detailed Ambient Light behind the desk */}
          <motion.div
            className="absolute inset-0 opacity-20 transition-colors duration-700 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 45% 65%, ${themeColor}, transparent 55%), radial-gradient(circle at 55% 55%, rgba(255,255,255,0.05), transparent 40%)`
            }}
          />

          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.3em] text-linen/30 absolute top-12">The Creators</div>

          <div className="relative z-20 flex flex-col items-center justify-center w-full mt-[5vh]">

            {/* Highly Detailed Writer SVG Scene */}
            <svg width="600" height="400" viewBox="0 0 600 400" className="mx-auto drop-shadow-2xl overflow-visible">

              {/* --- Desk Environment --- */}
              {/* Background Window/Frame illusion */}
              <path d="M 50 100 L 550 100 L 550 350 L 50 350 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/5" />
              <path d="M 100 50 L 500 50 L 500 350 L 100 350 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/5" />

              {/* Desk Surface */}
              <path d="M 80 320 C 200 325, 400 325, 520 320 L 540 340 L 60 340 Z" fill="#1A1A1A" />
              <path d="M 80 320 C 200 325, 400 325, 520 320" stroke="currentColor" strokeWidth="3" className="text-white/20" strokeLinecap="round" />

              {/* Desk Legs */}
              <path d="M 120 340 L 110 400" stroke="currentColor" strokeWidth="6" className="text-white/10" strokeLinecap="round" />
              <path d="M 480 340 L 490 400" stroke="currentColor" strokeWidth="6" className="text-white/10" strokeLinecap="round" />

              {/* Desk Accessories */}
              {/* Coffee Mug */}
              <path d="M 150 315 L 150 290 C 150 285, 170 285, 170 290 L 170 315 Z" fill="#2A2A2A" />
              <path d="M 170 295 C 180 295, 180 310, 170 310" fill="none" stroke="#2A2A2A" strokeWidth="3" />
              {/* Steam */}
              <motion.path d="M 160 280 Q 155 260 165 240" fill="none" stroke="white" strokeWidth="1.5" className="opacity-10" animate={{ strokeDashoffset: [20, -20], opacity: [0, 0.2, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} strokeDasharray="5 5" />

              {/* Pen Holder / Tools */}
              <path d="M 440 318 L 435 270 L 465 270 L 460 318 Z" fill="#222" />
              <path d="M 445 270 L 440 240" stroke="#444" strokeWidth="2" />
              <path d="M 450 270 L 452 230" stroke="#555" strokeWidth="3" />
              <path d="M 458 270 L 465 245" stroke="#333" strokeWidth="2" />

              {/* Monitor / Canvas / Book */}
              {/* Glow behind canvas */}
              <motion.ellipse cx="300" cy="270" rx="100" ry="20" fill={themeColor} className="opacity-10 mix-blend-screen transition-colors duration-700" animate={{ opacity: [0.1, 0.15, 0.1] }} transition={{ duration: 4, repeat: Infinity }} />

              {/* Base of laptop/canvas */}
              <path d="M 230 315 L 380 315 L 400 325 L 210 325 Z" fill="#333" />
              {/* Screen / Open Book Pages */}
              <path d="M 240 315 L 220 220 C 260 215, 300 230, 300 230 C 300 230, 340 215, 380 220 L 360 315 Z" fill="#111" stroke={themeColor} strokeWidth="1" className="transition-colors duration-700 opacity-80" />
              {/* Screen Glow */}
              <path d="M 245 310 L 228 225 C 260 222, 298 235, 298 235 C 298 235, 335 222, 372 225 L 355 310 Z" fill={themeColor} className="transition-colors duration-700 opacity-10" />

              {/* --- The Creator Silhouette --- */}
              <g className="drop-shadow-2xl">
                {/* Head - Intently focused, slightly tilted */}
                <path d="M 210 160 C 210 140, 180 130, 160 145 C 145 155, 145 175, 160 190 C 180 205, 210 180, 210 160 Z" fill="#222" />
                {/* Headphones */}
                <path d="M 165 140 C 190 120, 220 140, 215 170" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" />
                <rect x="205" y="155" width="15" height="25" rx="5" fill="#111" transform="rotate(-15 210 165)" />

                {/* Torso - Leaning in */}
                <path d="M 160 190 C 180 195, 200 220, 195 260 C 190 320, 140 330, 90 340 C 70 340, 60 280, 70 250 C 80 220, 120 180, 160 190 Z" fill="#1A1A1A" />
                <path d="M 160 190 C 180 195, 200 220, 195 260 C 190 320, 140 330, 90 340 C 70 340, 60 280, 70 250 C 80 220, 120 180, 160 190 Z" fill="url(#gradient-torso)" />

                {/* Arm - Drawing/Typing */}
                <path d="M 180 210 C 220 220, 230 260, 250 280 C 260 290, 270 310, 260 320" fill="none" stroke="#151515" strokeWidth="20" strokeLinecap="round" />
                {/* Hand */}
                <circle cx="260" cy="320" r="10" fill="#222" />
              </g>

              {/* Define gradients */}
              <defs>
                <linearGradient id="gradient-torso" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#333" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#111" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* --- Magical Creatures / Imagination Bursting Out --- */}
              <g style={{ filter: `drop-shadow(0 0 15px ${themeColor})` }} className="opacity-90">

                {/* The main energy vortex emitting from the screen */}
                <motion.path
                  d="M 300 260 C 280 150, 450 100, 350 0 C 250 -100, 500 -150, 400 -250"
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="3"
                  strokeDasharray="10 20"
                  className="transition-colors duration-700 opacity-40"
                  initial={{ strokeDashoffset: 300 }}
                  animate={{ strokeDashoffset: -300 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
                <motion.path
                  d="M 300 260 C 350 180, 200 120, 280 20 C 360 -80, 150 -100, 250 -200"
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="1.5"
                  strokeDasharray="5 15"
                  className="transition-colors duration-700 opacity-60"
                  initial={{ strokeDashoffset: 200 }}
                  animate={{ strokeDashoffset: -200 }}
                  transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                />

                {/* Detailed Dragon / Serpentine Creature */}
                <motion.g
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.5, rotate: 0 }}
                  animate={{
                    x: [0, 80, 20, 100],
                    y: [0, -100, -200, -300],
                    opacity: [0, 1, 0.8, 0],
                    scale: [0.5, 1.2, 1.5, 1],
                    rotate: [-20, 10, -10, 20]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="transition-colors duration-700"
                >
                  <path d="M 320 200 Q 360 180 340 150 T 360 100" fill="none" stroke={themeColor} strokeWidth="4" strokeLinecap="round" className="opacity-80" />
                  <polygon points="360,100 350,110 370,115" fill={themeColor} />
                  {/* Wings */}
                  <path d="M 345 160 Q 380 140 370 120 Q 350 130 345 150 Z" fill={themeColor} className="opacity-60" />
                  <path d="M 335 155 Q 300 140 310 110 Q 330 130 338 145 Z" fill={themeColor} className="opacity-40" />
                </motion.g>

                {/* Majestic Bird / Phoenix */}
                <motion.g
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.5, rotate: -30 }}
                  animate={{
                    x: [0, -60, -20, -100],
                    y: [0, -120, -240, -320],
                    opacity: [0, 1, 0.9, 0],
                    scale: [0.3, 1.4, 1.8, 1.2],
                    rotate: [-30, 0, 20, 40]
                  }}
                  transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3.5 }}
                  fill={themeColor}
                  className="transition-colors duration-700"
                >
                  <path d="M 280 180 Q 250 160 270 140 Q 290 150 280 180 Z" />
                  {/* Wing Right */}
                  <path d="M 275 160 Q 320 140 340 110 Q 300 120 270 150 Z" className="opacity-80" />
                  {/* Wing Left */}
                  <path d="M 265 155 Q 220 130 190 100 Q 240 120 260 145 Z" className="opacity-60" />
                  {/* Tail */}
                  <path d="M 280 180 Q 290 220 310 240 Q 285 200 275 180 Z" className="opacity-50" />
                </motion.g>

                {/* Geometric / Sci-Fi Orbs (Floating Ideas) */}
                {[...Array(8)].map((_, i) => (
                  <motion.g
                    key={`orb-${i}`}
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{
                      x: (Math.random() * 200 - 100),
                      y: -(Math.random() * 300 + 100),
                      opacity: [0, 0.8, 0],
                      rotate: 360
                    }}
                    transition={{
                      duration: 4 + Math.random() * 4,
                      repeat: Infinity,
                      delay: Math.random() * 6,
                      ease: "easeOut"
                    }}
                  >
                    <circle cx={300} cy={250} r={2 + Math.random() * 4} fill={themeColor} className="transition-colors duration-700" />
                    <circle cx={300} cy={250} r={6 + Math.random() * 8} fill="none" stroke={themeColor} strokeWidth="1" className="transition-colors duration-700 opacity-40" />
                  </motion.g>
                ))}
              </g>
            </svg>

            <h2 className="font-display text-4xl text-white font-medium tracking-tight mt-2 drop-shadow-md z-30">
              Write the story.
            </h2>
          </div>
        </div>

        {/* 
          BOTTOM HALF: The Reader
        */}
        <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden pt-[5vh]">
          {/* Detailed Ambient glow reacting to particles landing */}
          <motion.div
            className="absolute bottom-[-100px] w-full h-[500px] opacity-15 transition-colors duration-700 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 80%, ${themeColor}, transparent 60%)`
            }}
          />

          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.3em] text-linen/30 z-30">The Audience</div>
          <h2 className="font-display text-4xl text-white font-medium tracking-tight mb-2 drop-shadow-md z-30">
            Watch it come alive.
          </h2>

          <div className="relative z-20 w-full flex-1 flex items-center justify-center">

            {/* Highly Detailed Reader SVG Scene */}
            <svg width="600" height="400" viewBox="0 0 600 400" className="absolute bottom-0 z-20 overflow-visible">

              {/* --- Living Room / Lounge Environment --- */}
              {/* Rug */}
              <ellipse cx="300" cy="360" rx="200" ry="30" fill="#111" />
              <ellipse cx="300" cy="360" rx="190" ry="25" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/5" strokeDasharray="5 5" />

              {/* Potted Plant */}
              <path d="M 120 340 L 100 280 L 140 280 Z" fill="#1A1A1A" />
              <path d="M 120 280 C 80 220, 60 250, 50 200 C 70 240, 100 250, 120 280 Z" fill="#222" />
              <path d="M 120 280 C 140 200, 160 220, 180 180 C 150 200, 130 240, 120 280 Z" fill="#181818" />

              {/* Floor Lamp */}
              <path d="M 500 350 L 500 100" stroke="#222" strokeWidth="6" strokeLinecap="round" />
              <path d="M 470 150 L 500 100 L 530 150 Z" fill="#1A1A1A" />
              {/* Lamp Glow */}
              <motion.polygon points="500,120 420,350 580,350" fill={themeColor} className="opacity-[0.03] mix-blend-screen transition-colors duration-700" animate={{ opacity: [0.03, 0.05, 0.03] }} transition={{ duration: 5, repeat: Infinity }} />

              {/* Modern Lounge Chair */}
              <path d="M 330 350 C 330 280, 380 260, 420 250 L 480 250 L 480 350 Z" fill="#1A1A1A" />
              <path d="M 420 250 C 420 150, 470 120, 520 120 L 520 350 Z" fill="#222" />
              {/* Chair Legs */}
              <path d="M 360 350 L 350 380" stroke="#444" strokeWidth="4" strokeLinecap="round" />
              <path d="M 450 350 L 460 380" stroke="#444" strokeWidth="4" strokeLinecap="round" />
              <path d="M 500 350 L 510 380" stroke="#444" strokeWidth="4" strokeLinecap="round" />

              {/* --- The Reader Silhouette --- */}
              <g className="drop-shadow-2xl">
                {/* Head - Relaxed, leaning back */}
                <circle cx="430" cy="110" r="28" fill="#111" />
                <path d="M 445 125 C 460 140, 470 160, 465 180 C 440 170, 420 150, 415 130 Z" fill="#0A0A0A" />

                {/* Torso - Lounging deeply */}
                <path d="M 465 180 C 460 220, 420 230, 390 240 C 350 250, 330 290, 340 330 L 480 330 Z" fill="#181818" />
                <path d="M 410 160 C 400 200, 370 220, 350 230 C 320 245, 310 280, 320 320 C 330 350, 490 350, 480 320 C 470 280, 460 240, 480 180 Z" fill="url(#gradient-reader)" />

                {/* Legs extended gracefully and crossed */}
                <path d="M 360 310 C 260 310, 200 340, 160 360" fill="none" stroke="#151515" strokeWidth="32" strokeLinecap="round" />
                <path d="M 380 330 C 280 330, 220 360, 180 380" fill="none" stroke="#111" strokeWidth="26" strokeLinecap="round" />

                {/* Arms resting, holding book */}
                <path d="M 420 190 C 380 200, 340 210, 310 230 C 300 240, 300 260, 320 270" fill="none" stroke="#1A1A1A" strokeWidth="18" strokeLinecap="round" />
              </g>

              {/* Gradient for Reader */}
              <defs>
                <linearGradient id="gradient-reader" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#222" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {/* --- The Magical Book --- */}
              <g className="transition-colors duration-700" style={{ filter: `drop-shadow(0 0 25px ${themeColor}90)` }}>
                {/* Glowing aura where the particles land (the book) */}
                <motion.ellipse
                  cx="290" cy="250" rx="90" ry="35"
                  fill={themeColor}
                  className="mix-blend-screen opacity-15 transition-colors duration-700"
                  animate={{ rx: [80, 100, 80], ry: [30, 40, 30], opacity: [0.1, 0.25, 0.1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Book Covers */}
                <path d="M 230 250 L 290 230 L 350 250 L 290 280 Z" fill={themeColor} className="opacity-40" />
                <path d="M 290 230 L 290 280" stroke={themeColor} strokeWidth="3" className="opacity-90" />
                <path d="M 350 250 L 290 280 L 230 250" fill="transparent" stroke={themeColor} strokeWidth="4" strokeLinejoin="round" />

                {/* Glowing Pages */}
                <path d="M 235 245 L 285 228 L 345 245 L 290 275 Z" fill="#FFF" className="opacity-80 mix-blend-screen" />
              </g>

              {/* --- Receiving the Magic (Impact & Reader Imagination) --- */}
              <g>
                {/* Concentric ripples on the book */}
                {[...Array(3)].map((_, i) => (
                  <motion.ellipse
                    key={`ripple-${i}`}
                    cx={290} cy={250}
                    fill="none"
                    stroke={themeColor}
                    strokeWidth="2"
                    className="transition-colors duration-700"
                    initial={{ rx: 30, ry: 10, opacity: 0 }}
                    animate={{ rx: [30, 150], ry: [10, 40], opacity: [0.8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
                  />
                ))}

                {/* Splashes of magic erupting from the pages */}
                {[...Array(12)].map((_, i) => (
                  <motion.circle
                    key={`splash-${i}`}
                    cx={290}
                    cy={250}
                    r={2 + Math.random() * 4}
                    fill={themeColor}
                    className="transition-colors duration-700"
                    initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                    animate={{
                      scale: [0, 1.5, 0],
                      opacity: [0, 1, 0],
                      x: (Math.random() * 120 - 60),
                      y: -(Math.random() * 100 + 20)
                    }}
                    transition={{ duration: 1.5 + Math.random(), repeat: Infinity, delay: Math.random() * 2, ease: "easeOut" }}
                  />
                ))}

                {/* Grand Ethereal Structures building around the reader (Castles, Cities, abstract shapes) */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.1, 0.9], y: [20, -50, -20] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ filter: `drop-shadow(0 0 20px ${themeColor})` }}
                  className="origin-bottom mix-blend-screen"
                >
                  {/* Magical Castle/Cityscape fading in and out */}
                  <path d="M 200 150 L 210 100 L 220 150 Z" fill={themeColor} className="opacity-30 transition-colors duration-700" />
                  <path d="M 230 140 L 240 70 L 250 140 Z" fill={themeColor} className="opacity-50 transition-colors duration-700" />
                  <path d="M 260 160 L 270 120 L 280 160 Z" fill={themeColor} className="opacity-20 transition-colors duration-700" />
                  <path d="M 240 70 L 240 250 L 210 250 L 210 100" fill="none" stroke={themeColor} strokeWidth="2" className="opacity-40" />

                  {/* Giant spectral eye / moon representing awe */}
                  <motion.ellipse cx="290" cy="80" rx="60" ry="20" fill="none" stroke={themeColor} strokeWidth="1" className="opacity-30" animate={{ rx: [50, 70, 50], ry: [15, 25, 15] }} transition={{ duration: 4, repeat: Infinity }} />
                  <motion.circle cx="290" cy="80" r="10" fill={themeColor} className="opacity-50" animate={{ r: [8, 12, 8] }} transition={{ duration: 2, repeat: Infinity }} />
                </motion.g>

                {/* Subtle glow reflecting on the reader's face */}
                <motion.circle cx="410" cy="140" r="40" fill={themeColor} className="mix-blend-screen opacity-10" animate={{ opacity: [0.05, 0.15, 0.05] }} transition={{ duration: 2, repeat: Infinity }} />
              </g>
            </svg>
          </div>
        </div>

      </div>

      {/* 
        ========================================================
        RIGHT COLUMN (Categories/Browse)
        ========================================================
      */}
      <div className="relative flex flex-col w-[30%] h-full bg-ink z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">

        {/* Header */}
        <div className="p-10 pb-6 flex justify-between items-center relative">
          <span className="font-display text-2xl font-bold tracking-[0.2em] text-white">
            INK<span className="text-white/40">WELL</span>
          </span>
          <button className="w-10 h-10 rounded-full border border-white/10 flex flex-col items-center justify-center gap-1.5 hover:border-white/30 transition-colors">
            <span className="w-4 h-px bg-white/70"></span>
            <span className="w-4 h-px bg-white/70"></span>
          </button>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto px-10 py-6 relative">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-linen/30 mb-8 flex items-center gap-4">
            <span className="w-8 h-px bg-linen/10"></span>
            Explore Modalities
            <span className="flex-1 h-px bg-linen/10"></span>
          </p>

          <nav className="flex flex-col gap-4">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory?.id === cat.id;

              return (
                <div
                  key={cat.id}
                  className="group relative cursor-pointer"
                  onMouseEnter={() => setActiveCategory(cat)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  <motion.div
                    className="relative px-6 py-5 rounded-xl border overflow-hidden"
                    animate={{
                      borderColor: isActive ? `${cat.color}50` : "rgba(255, 255, 255, 0.03)",
                      backgroundColor: isActive ? "rgba(255, 255, 255, 0.02)" : "transparent",
                      x: isActive ? 10 : 0
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  >
                    {/* Hover glow background inside card */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                      style={{ background: `radial-gradient(circle at right, ${cat.color} 0%, transparent 70%)` }}
                    />

                    <div className="relative z-10 flex justify-between items-center">
                      <span
                        className={`font-display text-2xl tracking-wide transition-colors duration-500 ${isActive ? "text-white" : "text-linen/50 group-hover:text-linen/80"
                          }`}
                      >
                        {cat.label}
                      </span>

                      {/* Animated abstract icon next to category */}
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{
                          scale: isActive ? 1 : 0,
                          rotate: isActive ? 0 : -90,
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.3"></circle>
                          <path d="M12 8l4 4-4 4M8 12h8"></path>
                        </svg>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-10 pt-6">
          <div className="p-6 rounded-xl border border-white/[0.03] bg-white/[0.01]">
            <p className="text-xs text-linen/40 leading-relaxed font-light">
              Hover over modalities to observe the <span className="text-white/70 font-medium">energy transfer</span>. Join the ecosystem where creators and audiences fuse.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
