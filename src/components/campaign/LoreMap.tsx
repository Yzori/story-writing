"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ────────────────────────────────────────────────────

export interface MapPin {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  label: string;
  mood?: string;
  description?: string;
  sceneBreakId?: string;
}

interface LoreMapProps {
  mapImage: string | null;
  pins: MapPin[];
  isGM: boolean;
  onAddPin: (pin: Omit<MapPin, "id">) => void;
  onRemovePin?: (pinId: string) => void;
  onClose: () => void;
}

// ── Mood color system ────────────────────────────────────────

const MOOD_COLORS: Record<string, { bg: string; border: string; glow: string; text: string; pill: string }> = {
  tense:       { bg: "bg-rose/80",         border: "border-rose/60",         glow: "shadow-[0_0_12px_rgba(225,29,72,0.4)]",   text: "text-rose",         pill: "bg-rose/20 text-rose" },
  calm:        { bg: "bg-sage/80",         border: "border-sage/60",         glow: "shadow-[0_0_12px_rgba(130,176,132,0.4)]",  text: "text-sage",         pill: "bg-sage/20 text-sage" },
  ominous:     { bg: "bg-violet/80",       border: "border-violet/60",       glow: "shadow-[0_0_12px_rgba(139,92,246,0.4)]",   text: "text-violet",       pill: "bg-violet/20 text-violet" },
  triumphant:  { bg: "bg-amber/80",        border: "border-amber/60",        glow: "shadow-[0_0_12px_rgba(200,150,60,0.4)]",   text: "text-amber",        pill: "bg-amber/20 text-amber" },
  melancholy:  { bg: "bg-indigo-400/80",   border: "border-indigo-400/60",   glow: "shadow-[0_0_12px_rgba(99,102,241,0.4)]",   text: "text-indigo-400",   pill: "bg-indigo-400/20 text-indigo-400" },
  chaotic:     { bg: "bg-orange-400/80",   border: "border-orange-400/60",   glow: "shadow-[0_0_12px_rgba(251,146,60,0.4)]",   text: "text-orange-400",   pill: "bg-orange-400/20 text-orange-400" },
  mysterious:  { bg: "bg-cyan-400/80",     border: "border-cyan-400/60",     glow: "shadow-[0_0_12px_rgba(34,211,238,0.4)]",   text: "text-cyan-400",     pill: "bg-cyan-400/20 text-cyan-400" },
  romantic:    { bg: "bg-pink-400/80",     border: "border-pink-400/60",     glow: "shadow-[0_0_12px_rgba(244,114,182,0.4)]",  text: "text-pink-400",     pill: "bg-pink-400/20 text-pink-400" },
};

const DEFAULT_PIN_STYLE = {
  bg: "bg-white/60",
  border: "border-white/40",
  glow: "shadow-[0_0_8px_rgba(255,255,255,0.2)]",
  text: "text-white/80",
  pill: "bg-white/10 text-white/60",
};

function getMoodStyle(mood?: string) {
  if (!mood) return DEFAULT_PIN_STYLE;
  return MOOD_COLORS[mood] ?? DEFAULT_PIN_STYLE;
}

const MOODS = ["tense", "calm", "ominous", "triumphant", "melancholy", "chaotic", "mysterious", "romantic"] as const;

// ── Pin Creation Form ────────────────────────────────────────

function PinCreationForm({
  x,
  y,
  containerRect,
  onSubmit,
  onCancel,
}: {
  x: number;
  y: number;
  containerRect: DOMRect | null;
  onSubmit: (data: { label: string; mood?: string; description?: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [mood, setMood] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");

  // Position the form card near the click, but keep it within bounds
  const formStyle: React.CSSProperties = {};
  if (containerRect) {
    const pxX = (x / 100) * containerRect.width;
    const pxY = (y / 100) * containerRect.height;
    const formW = 280;
    const formH = 320;
    let left = pxX + 16;
    let top = pxY - 20;
    if (left + formW > containerRect.width) left = pxX - formW - 16;
    if (top + formH > containerRect.height) top = containerRect.height - formH - 8;
    if (top < 8) top = 8;
    if (left < 8) left = 8;
    formStyle.left = left;
    formStyle.top = top;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSubmit({ label: label.trim(), mood, description: description.trim() || undefined });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="absolute z-30 w-[280px] bg-[#1a1410] border border-amber/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden"
      style={formStyle}
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-amber/60 font-bold">Place a Pin</p>

        {/* Label */}
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="The Sunken Temple"
          autoFocus
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-amber/30 font-serif"
        />

        {/* Mood selector */}
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1.5">Mood (optional)</p>
          <div className="flex flex-wrap gap-1">
            {MOODS.map((m) => {
              const style = MOOD_COLORS[m];
              const isSelected = mood === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(isSelected ? undefined : m)}
                  className={`px-2 py-0.5 rounded-full text-[10px] capitalize border transition-all cursor-pointer ${
                    isSelected
                      ? `${style.pill} border-current font-bold`
                      : "bg-white/5 text-white/40 border-white/5 hover:border-white/20"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Where the party first encountered..."
          rows={2}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber/30 resize-none font-serif"
        />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!label.trim()}
            className="flex-1 bg-amber/10 hover:bg-amber/20 border border-amber/20 text-amber rounded-lg py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Place Pin
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 rounded-lg text-[11px] transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ── Pin Tooltip ──────────────────────────────────────────────

function PinTooltip({
  pin,
  isGM,
  onRemove,
}: {
  pin: MapPin;
  isGM: boolean;
  onRemove?: () => void;
}) {
  const style = getMoodStyle(pin.mood);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-20 pointer-events-auto"
    >
      <div className="relative bg-[#1a1410]/95 border border-amber/15 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-md px-4 py-3 min-w-[160px] max-w-[240px]">
        {/* Close button for GM */}
        {isGM && onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose/20 border border-rose/30 flex items-center justify-center text-rose hover:bg-rose/40 transition-colors cursor-pointer"
            title="Remove pin"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Label */}
        <p className="text-sm font-serif font-bold text-white/90 leading-tight">{pin.label}</p>

        {/* Mood pill */}
        {pin.mood && (
          <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${style.pill}`}>
            {pin.mood}
          </span>
        )}

        {/* Description */}
        {pin.description && (
          <p className="mt-1.5 text-[11px] text-white/40 leading-relaxed font-serif italic">
            {pin.description}
          </p>
        )}

        {/* Arrow pointing down */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-amber/15" />
      </div>
    </motion.div>
  );
}

// ── Map Pin Component ────────────────────────────────────────

function MapPinMarker({
  pin,
  isGM,
  onRemove,
}: {
  pin: MapPin;
  isGM: boolean;
  onRemove?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const style = getMoodStyle(pin.mood);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (isGM && onRemove) onRemove();
      }}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <PinTooltip pin={pin} isGM={isGM} onRemove={onRemove} />
        )}
      </AnimatePresence>

      {/* Diamond marker */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 300 }}
        className={`w-3.5 h-3.5 rotate-45 rounded-sm cursor-pointer border ${style.bg} ${style.border} ${style.glow} transition-all hover:scale-125`}
      />

      {/* Label below pin */}
      <p className={`absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-serif tracking-wide ${style.text} opacity-70 pointer-events-none`}>
        {pin.label}
      </p>
    </div>
  );
}

// ── Main LoreMap Component ───────────────────────────────────

export default function LoreMap({
  mapImage,
  pins,
  isGM,
  onAddPin,
  onRemovePin,
  onClose,
}: LoreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [creatingPin, setCreatingPin] = useState<{ x: number; y: number } | null>(null);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isGM) return;
      // Don't trigger if clicking on existing pins or forms
      const target = e.target as HTMLElement;
      if (target.closest("[data-pin]") || target.closest("[data-pin-form]")) return;

      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setCreatingPin({ x, y });
    },
    [isGM]
  );

  const handlePinSubmit = useCallback(
    (data: { label: string; mood?: string; description?: string }) => {
      if (!creatingPin) return;
      onAddPin({ x: creatingPin.x, y: creatingPin.y, ...data });
      setCreatingPin(null);
    },
    [creatingPin, onAddPin]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 relative z-10 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-sm">
        <h2 className="text-xl font-display text-amber/90 tracking-widest uppercase">World Map</h2>
        <button onClick={onClose} className="text-white/40 hover:text-white cursor-pointer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* GM hint */}
      {isGM && (
        <div className="px-6 py-2 border-b border-white/5 bg-black/20">
          <p className="text-[10px] text-amber/40 tracking-wide">
            Click anywhere on the map to place a pin. Right-click a pin to remove it.
          </p>
        </div>
      )}

      {/* Map Canvas */}
      <div className="flex-1 relative z-10 p-4 overflow-hidden">
        <div
          ref={mapRef}
          className={`relative w-full h-full rounded-xl overflow-hidden ${isGM ? "cursor-crosshair" : "cursor-default"}`}
          onClick={handleMapClick}
        >
          {/* Background: image or parchment gradient */}
          {mapImage ? (
            <img
              src={mapImage}
              alt="World Map"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse at 30% 20%, rgba(180, 140, 80, 0.12) 0%, transparent 60%),
                  radial-gradient(ellipse at 70% 80%, rgba(160, 120, 60, 0.08) 0%, transparent 50%),
                  radial-gradient(ellipse at 50% 50%, rgba(140, 100, 50, 0.06) 0%, transparent 70%),
                  linear-gradient(175deg, #1a150e 0%, #16120c 30%, #130f09 60%, #100d08 100%)
                `,
              }}
            >
              {/* Parchment texture overlay: subtle noise effect */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                  backgroundSize: "256px 256px",
                }}
              />
              {/* Compass decoration in corner */}
              <div className="absolute bottom-6 right-6 opacity-[0.08]">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-amber">
                  <circle cx="32" cy="32" r="28" />
                  <circle cx="32" cy="32" r="20" />
                  <line x1="32" y1="2" x2="32" y2="62" />
                  <line x1="2" y1="32" x2="62" y2="32" />
                  <line x1="10" y1="10" x2="54" y2="54" />
                  <line x1="54" y1="10" x2="10" y2="54" />
                  <text x="32" y="10" textAnchor="middle" fill="currentColor" fontSize="6" fontFamily="serif" stroke="none">N</text>
                  <text x="32" y="58" textAnchor="middle" fill="currentColor" fontSize="6" fontFamily="serif" stroke="none">S</text>
                  <text x="8" y="34" textAnchor="middle" fill="currentColor" fontSize="6" fontFamily="serif" stroke="none">W</text>
                  <text x="56" y="34" textAnchor="middle" fill="currentColor" fontSize="6" fontFamily="serif" stroke="none">E</text>
                </svg>
              </div>
              {/* "Uncharted territory" text when no pins */}
              {pins.length === 0 && !creatingPin && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber/20">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <p className="font-serif italic text-white/20 text-sm">
                    {isGM ? "Click to place your first pin" : "No locations marked yet"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pins */}
          {pins.map((pin) => (
            <MapPinMarker
              key={pin.id}
              pin={pin}
              isGM={isGM}
              onRemove={isGM && onRemovePin ? () => onRemovePin(pin.id) : undefined}
            />
          ))}

          {/* Pin creation form */}
          <AnimatePresence>
            {creatingPin && (
              <div data-pin-form>
                <PinCreationForm
                  x={creatingPin.x}
                  y={creatingPin.y}
                  containerRect={mapRef.current?.getBoundingClientRect() ?? null}
                  onSubmit={handlePinSubmit}
                  onCancel={() => setCreatingPin(null)}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
