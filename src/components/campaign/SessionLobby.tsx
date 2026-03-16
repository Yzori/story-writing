"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { PlayerCharacter } from "./types";
import { getPlayerColor } from "./types";

// ── Lobby Theme Data ────────────────────────────────────────────

export const LOBBY_THEMES = [
  { key: "campfire", label: "Campfire", image: "/lobby/campfire.png", particles: true },
  { key: "tavern", label: "Tavern", image: "/lobby/tavern.png", particles: false },
  { key: "ruins", label: "Ruins", image: "/lobby/ruins.png", particles: false },
  { key: "spaceship", label: "Spaceship", image: "/lobby/spaceship.png", particles: false },
  { key: "dungeon", label: "Dungeon", image: "/lobby/dungeon.png", particles: true },
  { key: "ship", label: "Ship Deck", image: "/lobby/ship.png", particles: false },
  { key: "last-launch", label: "Last Launch", image: "/lobby/last-launch.png", particles: true },
] as const;

export type LobbyThemeKey = (typeof LOBBY_THEMES)[number]["key"];

// ── Props ───────────────────────────────────────────────────────

interface SessionLobbyProps {
  lobbyTheme: string;
  sessionTitle: string;
  sessionOpening: string | null;
  previousEpilogue?: string | null;
  previousMood?: string | null;
  characters: PlayerCharacter[];
  isGM: boolean;
  onBeginSession: () => void;
}

// ── Rising Embers (ambient particles) ───────────────────────────

function RisingEmbers() {
  const embers = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${(i * 5.7 + 3) % 100}%`,
        delay: `${(i * 0.45) % 4}s`,
        duration: `${6 + (i % 5) * 1.2}s`,
        size: 2 + (i % 3) * 0.8,
        opacity: 0.2 + (i % 4) * 0.08,
        drift: (i % 2 === 0 ? -1 : 1) * (8 + (i % 3) * 6),
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {embers.map((e) => (
        <div
          key={e.id}
          className="absolute rounded-full"
          style={{
            left: e.left,
            bottom: "-8px",
            width: `${e.size}px`,
            height: `${e.size}px`,
            backgroundColor: `rgba(220, 170, 60, ${e.opacity})`,
            boxShadow: `0 0 ${e.size * 2}px rgba(220, 170, 60, ${e.opacity * 0.6})`,
            animation: `lobbyEmberRise ${e.duration} ${e.delay} linear infinite`,
            ["--ember-drift" as string]: `${e.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes lobbyEmberRise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          8% { opacity: 1; }
          85% { opacity: 0.6; }
          100% { transform: translateY(-100vh) translateX(var(--ember-drift, 0px)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Character Card ──────────────────────────────────────────────

function CharacterCard({
  character,
  index,
  allUserIds,
}: {
  character: PlayerCharacter;
  index: number;
  allUserIds: string[];
}) {
  const colorClass = getPlayerColor(character.userId, allUserIds);
  const initial = character.name.charAt(0).toUpperCase();
  const isActive = character.status === "active";

  // Extract the raw color from the class for the glow
  const colorMap: Record<string, string> = {
    "text-rose": "rgba(244, 63, 94, 0.4)",
    "text-indigo-400": "rgba(129, 140, 248, 0.4)",
    "text-emerald-400": "rgba(52, 211, 153, 0.4)",
    "text-violet-400": "rgba(167, 139, 250, 0.4)",
    "text-cyan-400": "rgba(34, 211, 238, 0.4)",
    "text-orange-400": "rgba(251, 146, 60, 0.4)",
    "text-pink-400": "rgba(244, 114, 182, 0.4)",
    "text-lime-400": "rgba(163, 230, 53, 0.4)",
  };
  const glowColor = colorMap[colorClass] ?? "rgba(220, 170, 60, 0.4)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: 0.4 + index * 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.03] border backdrop-blur-sm transition-opacity ${
        isActive
          ? "border-white/10"
          : "border-white/5 opacity-40"
      }`}
      style={{ minWidth: 120 }}
    >
      {/* Avatar circle with glow */}
      <div className="relative">
        {isActive && (
          <motion.div
            className="absolute -inset-1 rounded-full"
            style={{ boxShadow: `0 0 12px ${glowColor}` }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-display font-bold border-2 ${
            isActive ? "border-white/20 bg-white/10" : "border-white/5 bg-white/5"
          } ${colorClass}`}
        >
          {initial}
        </div>
      </div>

      {/* Name */}
      <span className={`text-sm font-bold ${isActive ? "text-white/90" : "text-white/40"}`}>
        {character.name}
      </span>

      {/* Traits */}
      {character.traits && (
        <span className="text-[10px] text-white/30 text-center leading-tight">
          {character.traits}
        </span>
      )}
    </motion.div>
  );
}

// ── Empty Slot ──────────────────────────────────────────────────

function EmptySlot({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
      className="flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-white/10"
      style={{ minWidth: 120 }}
    >
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/15">
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        </svg>
      </div>
      <span className="text-[11px] text-white/20 font-serif italic">Awaiting...</span>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function SessionLobby({
  lobbyTheme,
  sessionTitle,
  sessionOpening,
  previousEpilogue,
  previousMood,
  characters,
  isGM,
  onBeginSession,
}: SessionLobbyProps) {
  const theme = LOBBY_THEMES.find((t) => t.key === lobbyTheme) ?? LOBBY_THEMES[0];
  const activeCharacters = characters.filter((c) => c.status === "active");
  const allUserIds = activeCharacters.map((c) => c.userId);

  // Show a couple of empty slots if fewer than 4 characters
  const emptySlotCount = Math.max(0, 4 - characters.length);

  return (
    <div className="absolute inset-0 z-50 overflow-hidden">
      {/* Layer 1 — Background Image */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${theme.image})`,
            animation: "lobbySlowZoom 30s ease-in-out infinite alternate",
          }}
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />

        {/* Previous session mood tint */}
        {previousMood && (() => {
          const moodTints: Record<string, string> = {
            tense: "rgba(244,63,94,0.06)",
            ominous: "rgba(139,92,246,0.08)",
            triumphant: "rgba(200,150,60,0.06)",
            melancholy: "rgba(99,102,241,0.07)",
            chaotic: "rgba(251,146,60,0.06)",
            mysterious: "rgba(34,211,238,0.06)",
            romantic: "rgba(236,72,153,0.06)",
          };
          const tint = moodTints[previousMood];
          return tint ? <div className="absolute inset-0 transition-all duration-[3000ms]" style={{ backgroundColor: tint }} /> : null;
        })()}
      </div>

      {/* Layer 3 — Ambient Particles (rendered behind content but above background) */}
      {theme.particles && <RisingEmbers />}

      {/* Layer 2 — Content */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="max-w-2xl w-full px-6 flex flex-col items-center">

          {/* "Previously on..." recap from last session */}
          {previousEpilogue && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
              className="mb-8 max-w-lg text-center"
            >
              <span className="text-[9px] uppercase tracking-[0.25em] text-white/20 font-display block mb-3">
                Previously...
              </span>
              <p className="text-white/25 font-serif italic text-sm leading-relaxed">
                {previousEpilogue.length > 250
                  ? previousEpilogue.slice(0, 250).trimEnd() + "..."
                  : previousEpilogue}
              </p>
              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto mt-4" />
            </motion.div>
          )}

          {/* Gathering label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: previousEpilogue ? 0.6 : 0.2 }}
            className="mb-6"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-amber/50 font-display">
              Gathering...
            </span>
          </motion.div>

          {/* Session title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-3xl sm:text-4xl text-white/90 text-center mb-3"
          >
            {sessionTitle}
          </motion.h1>

          {/* Amber gradient line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="w-32 h-[1px] bg-gradient-to-r from-transparent via-amber/50 to-transparent mb-10"
          />

          {/* Party Circle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-3 mb-4"
          >
            {characters.map((char, i) => (
              <CharacterCard
                key={char.id}
                character={char}
                index={i}
                allUserIds={allUserIds}
              />
            ))}
            {Array.from({ length: emptySlotCount }, (_, i) => (
              <EmptySlot key={`empty-${i}`} index={i} />
            ))}
          </motion.div>

          {/* Gathered counter */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="text-[11px] text-white/25 mb-10 tracking-wide"
          >
            {activeCharacters.length} of {characters.length + emptySlotCount} gathered
          </motion.p>

          {/* Opening narration preview */}
          {sessionOpening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
              className="mb-10 max-w-lg text-center"
            >
              <p className="text-white/30 font-serif italic text-sm leading-relaxed">
                <span className="text-amber/30 text-lg mr-1">&ldquo;</span>
                {sessionOpening.length > 180
                  ? sessionOpening.slice(0, 180).trimEnd() + "..."
                  : sessionOpening}
                <span className="text-amber/30 text-lg ml-1">&rdquo;</span>
              </p>
            </motion.div>
          )}

          {/* GM: Begin Session button */}
          {isGM ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-3"
            >
              <motion.button
                onClick={onBeginSession}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative bg-gradient-to-r from-amber/80 to-amber hover:from-amber hover:to-amber/80 text-black font-display text-[12px] uppercase tracking-[0.25em] px-10 py-3.5 rounded-full transition-all cursor-pointer"
                style={{
                  animation: "lobbyButtonGlow 2.5s ease-in-out infinite",
                }}
              >
                Begin the Story
              </motion.button>
              <span className="text-[10px] text-white/20">
                Your players are waiting.
              </span>
            </motion.div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="font-serif italic text-white/30 text-sm"
            >
              Waiting for the GM to begin...
            </motion.p>
          )}
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes lobbySlowZoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
        @keyframes lobbyButtonGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(220, 170, 60, 0.15), 0 0 40px rgba(220, 170, 60, 0.05); }
          50% { box-shadow: 0 0 25px rgba(220, 170, 60, 0.35), 0 0 60px rgba(220, 170, 60, 0.12); }
        }
      `}</style>
    </div>
  );
}
