"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { PlayerCharacter, SessionRosterEntry } from "@/types/campaign";
import { getPlayerColor } from "@/types/campaign";

// ── Lobby Theme Data ────────────────────────────────────────────

export const LOBBY_THEMES = [
  { key: "campfire", label: "Campfire", description: "A crackling fire under open stars", image: "/lobby/campfire.png", particles: true },
  { key: "tavern", label: "Tavern", description: "A warm inn filled with murmured stories", image: "/lobby/tavern.png", particles: false },
  { key: "ruins", label: "Ruins", description: "Crumbling stone and forgotten echoes", image: "/lobby/ruins.png", particles: false },
  { key: "spaceship", label: "Spaceship", description: "The hum of engines in the void", image: "/lobby/spaceship.png", particles: false },
  { key: "dungeon", label: "Dungeon", description: "Torchlit corridors deep underground", image: "/lobby/dungeon.png", particles: true },
  { key: "ship", label: "Ship Deck", description: "Salt spray and creaking timber", image: "/lobby/ship.png", particles: false },
  { key: "last-launch", label: "Last Launch", description: "The final journey into the unknown", image: "/lobby/last-launch.png", particles: true },
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
  roster?: SessionRosterEntry[];
  allCharacters?: PlayerCharacter[];
  onUpdateRoster?: (characterIds: string[]) => void;
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
      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl bg-subtle/20 border backdrop-blur-sm transition-opacity ${
        isActive
          ? "border-border"
          : "border-border-subtle opacity-40"
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
            isActive ? "border-border-active bg-subtle/50" : "border-border-subtle bg-subtle/30"
          } ${colorClass}`}
        >
          {initial}
        </div>
      </div>

      {/* Name */}
      <span className={`text-sm font-bold ${isActive ? "text-paper" : "text-text-tertiary"}`}>
        {character.name}
      </span>

      {/* Traits */}
      {character.traits && (
        <span className="text-[10px] text-text-tertiary text-center leading-tight">
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
      className="flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-border"
      style={{ minWidth: 120 }}
    >
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost">
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        </svg>
      </div>
      <span className="text-[11px] text-text-ghost font-serif italic">Awaiting...</span>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────

// ── Roster Toggle Card (GM only) ─────────────────────────────

function RosterToggleCard({
  character,
  isPresent,
  isIntroduced,
  onToggle,
  allUserIds,
  index,
}: {
  character: PlayerCharacter;
  isPresent: boolean;
  isIntroduced: boolean;
  onToggle: () => void;
  allUserIds: string[];
  index: number;
}) {
  const colorClass = getPlayerColor(character.userId, allUserIds);
  const initial = character.name.charAt(0).toUpperCase();
  const playerName = character.user?.displayName ?? "Player";

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
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
      onClick={onToggle}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-sm transition-all cursor-pointer ${
        isPresent
          ? "bg-subtle/30 border-2 border-border"
          : "bg-subtle/20 border-2 border-dashed border-border opacity-40"
      }`}
      style={{ minWidth: 180 }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {isPresent && (
          <motion.div
            className="absolute -inset-0.5 rounded-full"
            style={{ boxShadow: `0 0 10px ${glowColor}` }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-display font-bold border-2 ${
            isPresent ? "border-border-active bg-subtle/50" : "border-border-subtle bg-subtle/30"
          } ${colorClass}`}
        >
          {initial}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col items-start min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold truncate ${isPresent ? "text-paper" : "text-text-tertiary"}`}>
            {character.name}
          </span>
          {isIntroduced && (
            <span className="text-[8px] uppercase tracking-wider bg-amber/20 text-amber border border-amber/30 rounded-full px-1.5 py-0.5 font-bold">
              New
            </span>
          )}
        </div>
        <span className={`text-[10px] ${isPresent ? "text-text-tertiary" : "text-text-ghost"}`}>
          {playerName}
        </span>
      </div>

      {/* Toggle indicator */}
      <div className="ml-auto shrink-0">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isPresent
            ? "border-emerald-400/50 bg-emerald-400/20"
            : "border-border bg-transparent"
        }`}>
          {isPresent && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 rounded-full bg-emerald-400"
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}

export default function SessionLobby({
  lobbyTheme,
  sessionTitle,
  sessionOpening,
  previousEpilogue,
  previousMood,
  characters,
  isGM,
  onBeginSession,
  roster = [],
  allCharacters,
  onUpdateRoster,
}: SessionLobbyProps) {
  const theme = LOBBY_THEMES.find((t) => t.key === lobbyTheme) ?? LOBBY_THEMES[0];
  const activeCharacters = characters.filter((c) => c.status === "active");
  const allUserIds = activeCharacters.map((c) => c.userId);

  // For GM roster management: use allCharacters (all active in campaign) if provided
  const rosterCandidates = (allCharacters ?? characters).filter((c) => c.status === "active");
  const rosterCandidateUserIds = rosterCandidates.map((c) => c.userId);

  // Build a set of present/introduced character IDs from roster
  const presentCharIds = useMemo(() => {
    const ids = new Set<string>();
    roster.forEach((r) => {
      if (r.status === "present" || r.status === "introduced") ids.add(r.characterId);
    });
    return ids;
  }, [roster]);

  const introducedCharIds = useMemo(() => {
    const ids = new Set<string>();
    roster.forEach((r) => {
      if (r.status === "introduced") ids.add(r.characterId);
    });
    return ids;
  }, [roster]);

  const handleToggleCharacter = (characterId: string) => {
    if (!onUpdateRoster) return;
    const currentPresent = rosterCandidates
      .filter((c) => presentCharIds.has(c.id))
      .map((c) => c.id);

    if (currentPresent.includes(characterId)) {
      onUpdateRoster(currentPresent.filter((id) => id !== characterId));
    } else {
      onUpdateRoster([...currentPresent, characterId]);
    }
  };

  // Characters to show in the party circle (players see only present)
  const displayCharacters = roster.length > 0
    ? characters.filter((c) => presentCharIds.has(c.id))
    : characters;

  // Show a couple of empty slots if fewer than 4 characters
  const emptySlotCount = Math.max(0, 4 - displayCharacters.length);

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
              <span className="text-[9px] uppercase tracking-[0.25em] text-text-ghost font-display block mb-3">
                Previously...
              </span>
              <p className="text-text-ghost font-serif italic text-sm leading-relaxed">
                {previousEpilogue.length > 250
                  ? previousEpilogue.slice(0, 250).trimEnd() + "..."
                  : previousEpilogue}
              </p>
              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-text-ghost/30 to-transparent mx-auto mt-4" />
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
            className="font-display text-3xl sm:text-4xl text-paper text-center mb-3"
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
            {displayCharacters.map((char, i) => (
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
            className="text-[11px] text-text-ghost mb-10 tracking-wide"
          >
            {displayCharacters.filter((c) => c.status === "active").length} of {displayCharacters.length + emptySlotCount} gathered
          </motion.p>

          {/* GM Roster Management */}
          {isGM && roster.length > 0 && onUpdateRoster && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mb-10 w-full max-w-lg"
            >
              <p className="text-[11px] text-text-tertiary font-serif italic text-center mb-4">
                Who&rsquo;s at the table tonight?
              </p>
              <div className="flex flex-col gap-2">
                {rosterCandidates.map((char, i) => (
                  <RosterToggleCard
                    key={char.id}
                    character={char}
                    isPresent={presentCharIds.has(char.id)}
                    isIntroduced={introducedCharIds.has(char.id)}
                    onToggle={() => handleToggleCharacter(char.id)}
                    allUserIds={rosterCandidateUserIds}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Opening narration preview */}
          {sessionOpening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
              className="mb-10 max-w-lg text-center"
            >
              <p className="text-text-tertiary font-serif italic text-sm leading-relaxed">
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
              <span className="text-[10px] text-text-ghost">
                {sessionOpening
                  ? "Your opening narration will play as a cinematic moment."
                  : "Your players are waiting."}
              </span>
            </motion.div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="font-serif italic text-text-tertiary text-sm"
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
