"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, MapPin as MapPinIcon, X, Plus } from "lucide-react";

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
  currentPinId?: string | null;
  onAddPin: (pin: Omit<MapPin, "id">) => void;
  onRemovePin?: (pinId: string) => void;
  onSetCurrentPin?: (pinId: string) => void;
  onClose: () => void;
}

// ── Mood color system ────────────────────────────────────────

const MOOD_COLORS: Record<string, { bg: string; border: string; glow: string; text: string; pill: string; fill: string; stroke: string }> = {
  tense:       { bg: "bg-rose/80",         border: "border-rose/60",         glow: "shadow-[0_0_15px_rgba(225,29,72,0.6)]",   text: "text-rose",         pill: "bg-rose/20 text-rose",         fill: "#e11d48", stroke: "rgba(225,29,72,0.4)" },
  calm:        { bg: "bg-sage/80",         border: "border-sage/60",         glow: "shadow-[0_0_15px_rgba(130,176,132,0.6)]",  text: "text-sage",         pill: "bg-sage/20 text-sage",         fill: "#82b084", stroke: "rgba(130,176,132,0.4)" },
  ominous:     { bg: "bg-violet/80",       border: "border-violet/60",       glow: "shadow-[0_0_15px_rgba(139,92,246,0.6)]",   text: "text-violet",       pill: "bg-violet/20 text-violet",       fill: "#8b5cf6", stroke: "rgba(139,92,246,0.4)" },
  triumphant:  { bg: "bg-amber/80",        border: "border-amber/60",        glow: "shadow-[0_0_15px_rgba(217,119,6,0.6)]",   text: "text-amber",        pill: "bg-amber/20 text-amber",        fill: "#d97706", stroke: "rgba(217,119,6,0.4)" },
  melancholy:  { bg: "bg-indigo-400/80",   border: "border-indigo-400/60",   glow: "shadow-[0_0_15px_rgba(129,140,248,0.6)]",   text: "text-indigo-400",   pill: "bg-indigo-400/20 text-indigo-400",   fill: "#818cf8", stroke: "rgba(129,140,248,0.4)" },
  chaotic:     { bg: "bg-orange-500/80",   border: "border-orange-500/60",   glow: "shadow-[0_0_15px_rgba(249,115,22,0.6)]",   text: "text-orange-500",   pill: "bg-orange-500/20 text-orange-500",   fill: "#f97316", stroke: "rgba(249,115,22,0.4)" },
  mysterious:  { bg: "bg-cyan-400/80",     border: "border-cyan-400/60",     glow: "shadow-[0_0_15px_rgba(34,211,238,0.6)]",   text: "text-cyan-400",     pill: "bg-cyan-400/20 text-cyan-400",     fill: "#22d3ee", stroke: "rgba(34,211,238,0.4)" },
  romantic:    { bg: "bg-pink-400/80",     border: "border-pink-400/60",     glow: "shadow-[0_0_15px_rgba(244,114,182,0.6)]",  text: "text-pink-400",     pill: "bg-pink-400/20 text-pink-400",     fill: "#f472b6", stroke: "rgba(244,114,182,0.4)" },
};

const DEFAULT_PIN_STYLE = {
  bg: "bg-amber/80", // Gold-ish default
  border: "border-amber/60",
  glow: "shadow-[0_0_12px_rgba(212,175,55,0.4)]",
  text: "text-amber",
  pill: "bg-amber/20 text-amber",
  fill: "#d4af37",
  stroke: "rgba(212,175,55,0.4)"
};

function getMoodStyle(mood?: string) {
  if (!mood) return DEFAULT_PIN_STYLE;
  return MOOD_COLORS[mood] ?? DEFAULT_PIN_STYLE;
}

const MOODS = ["tense", "calm", "ominous", "triumphant", "melancholy", "chaotic", "mysterious", "romantic"] as const;

const MAP_REGIONS = [
  { label: "Shattered City", x: 48, y: 33, rotate: -8 },
  { label: "Ashen Causeway", x: 30, y: 72, rotate: -18 },
  { label: "Crown Depths", x: 70, y: 39, rotate: 9 },
  { label: "Whispering Warrens", x: 76, y: 70, rotate: -5 },
] as const;

const MAP_RUMORS = [
  "The Crown wakes where royal blood dried.",
  "Air moving below means a passage survived.",
  "The dead speak loudest near broken thrones.",
] as const;

// ── Background Cartography Grid ──────────────────────────────

function NauticalGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#78350f" strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <pattern id="rhumb" width="400" height="400" patternUnits="userSpaceOnUse">
          <circle cx="200" cy="200" r="180" fill="none" stroke="#78350f" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="20" y1="200" x2="380" y2="200" stroke="#78350f" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="200" y1="20" x2="200" y2="380" stroke="#78350f" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="72.7" y1="72.7" x2="327.3" y2="327.3" stroke="#78350f" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="72.7" y1="327.3" x2="327.3" y2="72.7" stroke="#78350f" strokeWidth="0.5" strokeOpacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <rect width="100%" height="100%" fill="url(#rhumb)" />
    </svg>
  );
}

function WorldCartography() {
  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none z-0" viewBox="0 0 1000 700" preserveAspectRatio="none">
      <defs>
        <filter id="mapInkBleed">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.5" />
        </filter>
        <pattern id="mapHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)">
          <path d="M0 0 L0 10" stroke="rgba(212,168,67,0.12)" strokeWidth="1" />
        </pattern>
      </defs>

      <g filter="url(#mapInkBleed)">
        <path
          d="M129 482 C176 426 223 404 298 421 C371 438 398 395 464 338 C539 273 629 250 719 281 C811 313 869 384 884 472 C798 464 737 493 675 541 C609 592 525 599 467 555 C394 500 312 522 238 565 C190 592 146 560 129 482Z"
          fill="rgba(212,168,67,0.055)"
          stroke="rgba(212,168,67,0.28)"
          strokeWidth="2"
        />
        <path
          d="M178 535 C246 493 326 466 419 508 C515 552 610 543 687 486 C755 435 810 416 873 424"
          fill="none"
          stroke="rgba(237,232,216,0.16)"
          strokeWidth="3"
          strokeDasharray="10 12"
          strokeLinecap="round"
        />
        <path
          d="M252 170 C303 220 333 269 339 319 C346 380 309 418 265 466"
          fill="none"
          stroke="rgba(58,110,122,0.22)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M252 170 C303 220 333 269 339 319 C346 380 309 418 265 466"
          fill="none"
          stroke="rgba(237,232,216,0.10)"
          strokeWidth="2"
          strokeDasharray="4 10"
          strokeLinecap="round"
        />
        <path
          d="M598 124 C626 170 646 227 646 285 C646 339 678 384 744 420"
          fill="none"
          stroke="rgba(225,29,72,0.16)"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <path
          d="M598 124 C626 170 646 227 646 285 C646 339 678 384 744 420"
          fill="none"
          stroke="rgba(225,29,72,0.26)"
          strokeWidth="2"
          strokeDasharray="12 8"
          strokeLinecap="round"
        />
      </g>

      <g opacity="0.54">
        {[
          [566, 240, 30], [598, 214, 26], [628, 246, 34], [655, 220, 24],
          [694, 260, 31], [718, 231, 22], [745, 278, 25],
        ].map(([x, y, size], index) => (
          <path
            key={`peak-${index}`}
            d={`M${x - size} ${y + size * 0.7} L${x} ${y - size} L${x + size} ${y + size * 0.7} M${x - size * 0.32} ${y + size * 0.2} L${x} ${y - size * 0.22} L${x + size * 0.32} ${y + size * 0.2}`}
            fill="rgba(15,14,19,0.22)"
            stroke="rgba(212,168,67,0.26)"
            strokeWidth="1.6"
          />
        ))}
      </g>

      <g opacity="0.5">
        {[
          [430, 292], [458, 278], [492, 292], [520, 274], [548, 296],
          [452, 336], [482, 325], [520, 342],
        ].map(([x, y], index) => (
          <g key={`ruin-${index}`} transform={`translate(${x} ${y}) rotate(${index % 2 ? 8 : -6})`}>
            <rect x="-8" y="-10" width="16" height="20" fill="rgba(15,14,19,0.32)" stroke="rgba(237,232,216,0.16)" />
            <path d="M-12 12 L12 12 M-4 -10 L-4 12 M5 -10 L5 12" stroke="rgba(212,168,67,0.18)" />
          </g>
        ))}
      </g>

      <g opacity="0.38">
        <path d="M155 608 C230 625 305 604 368 632" fill="none" stroke="rgba(237,232,216,0.18)" strokeWidth="1.5" strokeDasharray="4 7" />
        <path d="M721 561 C771 537 812 548 860 522" fill="none" stroke="rgba(237,232,216,0.16)" strokeWidth="1.5" strokeDasharray="4 7" />
        <path d="M107 355 C170 333 238 342 289 301" fill="none" stroke="rgba(237,232,216,0.13)" strokeWidth="1.5" strokeDasharray="4 7" />
      </g>

      <g>
        <ellipse cx="650" cy="342" rx="162" ry="104" fill="url(#mapHatch)" opacity="0.5" />
        <ellipse cx="650" cy="342" rx="162" ry="104" fill="none" stroke="rgba(225,29,72,0.18)" strokeWidth="1.5" strokeDasharray="8 9" />
        <ellipse cx="305" cy="460" rx="142" ry="84" fill="none" stroke="rgba(129,140,248,0.15)" strokeWidth="1.5" strokeDasharray="6 10" />
      </g>

      {MAP_REGIONS.map((region) => (
        <text
          key={region.label}
          x={region.x * 10}
          y={region.y * 7}
          transform={`rotate(${region.rotate} ${region.x * 10} ${region.y * 7})`}
          textAnchor="middle"
          fill="rgba(237,232,216,0.18)"
          fontSize="22"
          letterSpacing="7"
          fontFamily="serif"
        >
          {region.label.toUpperCase()}
        </text>
      ))}
    </svg>
  );
}

// ── Journey Path Drawer ──────────────────────────────────────

function JourneyPaths({ pins, canvasWidth, canvasHeight }: { pins: MapPin[], canvasWidth: number, canvasHeight: number }) {
  // Memoize SVG path — only recompute when pins or canvas size change
  const pathD = useMemo(() => {
    if (pins.length < 2 || canvasWidth === 0) return null;

    const points = pins.map(p => ({
      x: (p.x / 100) * canvasWidth,
      y: (p.y / 100) * canvasHeight
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const cx = (curr.x + next.x) / 2 - dy * 0.15;
      const cy = (curr.y + next.y) / 2 + dx * 0.15;
      d += ` Q ${cx} ${cy} ${next.x} ${next.y}`;
    }
    return d;
  }, [pins, canvasWidth, canvasHeight]);

  if (!pathD) return null;
  const travelDotStyle: React.CSSProperties & { offsetPath?: string } = {
    offsetPath: `path('${pathD}')`,
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}>
      {/* Background thicker glow line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="#1b120b"
        strokeWidth="10"
        strokeOpacity="0.42"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke="#f4ebd8"
        strokeWidth="4"
        strokeOpacity="0.28"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      {/* Dashed journey line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="#d4af37"
        strokeWidth="2.5"
        strokeDasharray="6 8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      {pins.map((pin, index) => (
        <text
          key={`route-step-${pin.id}`}
          x={(pin.x / 100) * canvasWidth + 20}
          y={(pin.y / 100) * canvasHeight - 18}
          fill="rgba(237,232,216,0.34)"
          fontSize="10"
          letterSpacing="2"
          fontFamily="monospace"
        >
          {String(index + 1).padStart(2, "0")}
        </text>
      ))}
      {/* Animated travel dot */}
      <motion.circle
        r="4"
        fill="#ffffff"
        className="drop-shadow-[0_0_8px_rgba(212,175,55,1)]"
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        style={travelDotStyle}
      />
    </svg>
  );
}

// ── Pin Creation Form ────────────────────────────────────────

function PinCreationForm({
  x,
  y,
  containerRect,
  canvasRect,
  scale,
  pan,
  onSubmit,
  onCancel,
}: {
  x: number;
  y: number;
  containerRect: DOMRect | null;
  canvasRect: DOMRect | null;
  scale: number;
  pan: { x: number; y: number };
  onSubmit: (data: { label: string; mood?: string; description?: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [mood, setMood] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");

  const formStyle: React.CSSProperties = {};
  if (containerRect && canvasRect) {
    // Calculate screen position based on canvas% + pan + zoom
    const pxX = ((x / 100) * canvasRect.width) * scale + pan.x;
    const pxY = ((y / 100) * canvasRect.height) * scale + pan.y;
    
    const formW = 280;
    const formH = 320;
    let left = pxX + 16;
    let top = pxY - 20;

    // Constrain to container bounds
    if (left + formW > containerRect.width) left = Math.max(8, pxX - formW - 16);
    if (top + formH > containerRect.height) top = Math.max(8, containerRect.height - formH - 8);
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
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
      className="absolute z-50 w-[280px] bg-surface/95 backdrop-blur-md border border-amber/30 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden"
      style={formStyle}
    >
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber/50 to-transparent" />
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber/80 font-bold flex items-center gap-1.5">
            <MapPinIcon size={12} />
            Mark Location
          </p>
          <button type="button" onClick={onCancel} className="text-text-tertiary hover:text-paper transition-colors cursor-pointer p-1">
            <X size={14} />
          </button>
        </div>

        {/* Label */}
        <div className="space-y-1">
           <input
             type="text"
             value={label}
             onChange={(e) => setLabel(e.target.value)}
             placeholder="e.g. The Sunken Temple"
             autoFocus
             className="w-full bg-black/40 border border-amber/20 rounded-md px-3 py-2 text-sm text-paper focus:outline-none focus:border-amber/60 font-serif shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] transition-colors placeholder:text-amber/30"
           />
        </div>

        {/* Mood selector */}
        <div>
          <p className="text-[9px] uppercase tracking-widest text-text-tertiary mb-2">Vibe / Danger Level</p>
          <div className="flex flex-wrap gap-1.5">
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
                      ? `${style.pill} border-current font-bold ring-2 ring-current ring-offset-1 ring-offset-[#1a1512]`
                      : "bg-subtle/30 text-text-tertiary border-border hover:border-border-active hover:bg-subtle/50"
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
          placeholder="Jot down notes, discoveries, or warnings..."
          rows={3}
          className="w-full bg-black/40 border border-amber/20 rounded-md px-3 py-2 text-xs text-paper/80 placeholder:text-amber/30 focus:outline-none focus:border-amber/60 resize-none font-serif shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] transition-colors leading-relaxed"
        />

        {/* Actions */}
        <button
          type="submit"
          disabled={!label.trim()}
          className="w-full bg-gradient-to-r from-amber/10 via-amber/20 to-amber/10 hover:via-amber/30 border border-amber/30 text-amber rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(212,175,55,0.1)]"
        >
          Etch into Map
        </button>
      </form>
    </motion.div>
  );
}

// ── Pin Tooltip (Torn Paper Style) ───────────────────────────

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
      initial={{ opacity: 0, y: 10, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, y: 10, rotate: 2 }}
      transition={{ duration: 0.2, type: "spring", stiffness: 400, damping: 25 }}
      className="absolute bottom-full left-1/2 z-40 mb-4 hidden -translate-x-1/2 origin-bottom pointer-events-auto sm:block"
    >
      <div className="relative bg-[#f4ebd8] text-[#2c241b] rounded-sm px-5 py-4 min-w-[180px] max-w-[260px] shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(0,0,0,0.05)] border border-[#d2c4a7]"
           style={{
             clipPath: "polygon(0% 2%, 100% 0%, 98% 98%, 2% 100%)", // slightly wonky torn edge look
             backgroundImage: "radial-gradient(#000000 0.5px, transparent 0.5px)",
             backgroundSize: "8px 8px",
             backgroundColor: "#f4ebd8"
           }}>
        
        {/* Subtle burnt edge effect inside */}
        <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(139,69,19,0.15)] pointer-events-none" />

        {/* Close button for GM */}
        {isGM && onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-red-800 hover:text-red-500 hover:bg-black/5 rounded transition-colors cursor-pointer z-10"
            title="Erase pin"
          >
            <X size={14} strokeWidth={3} />
          </button>
        )}

        {/* Label */}
        <p className="text-lg font-serif font-bold leading-tight mb-1 pr-4" style={{ filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.5))" }}>
          {pin.label}
        </p>

        {/* Ink splatter flair */}
        <div className="w-12 h-px bg-[#8b4513]/30 mb-3" />

        {/* Mood pill (like a wax stamp or strong ink) */}
        {pin.mood && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-bold text-paper border border-black/20 shadow-sm mb-2" style={{ backgroundColor: style.fill }}>
            <span className="w-1.5 h-1.5 rounded-full bg-subtle/300" />
            {pin.mood}
          </span>
        )}

        {/* Description in handwritten-ish serif */}
        {pin.description && (
          <p className="text-[13px] text-[#4a3f35] leading-relaxed font-serif italic" style={{ textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>
            &ldquo;{pin.description}&rdquo;
          </p>
        )}

        {/* Fold line decoration */}
        <div className="absolute right-4 bottom-0 w-8 h-8 border-l border-t border-[#d2c4a7] bg-gradient-to-tl from-black/5 to-transparent origin-bottom-right transform rotate-12 translate-y-3 translate-x-2 pointer-events-none" />
      </div>
      
      {/* Down arrow marker outside the paper */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1">
         <div className="w-2 h-2 bg-[#f4ebd8] rotate-45 transform -translate-y-1.5 shadow-md border-r border-b border-[#d2c4a7]" />
      </div>
    </motion.div>
  );
}

// ── Runic Map Marker Component ───────────────────────────────

function MapPinMarker({
  pin,
  isGM,
  isCurrent,
  isSelected,
  onSelect,
  onRemove,
}: {
  pin: MapPin;
  isGM: boolean;
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const style = getMoodStyle(pin.mood);
  const labelText = isCurrent ? "Here" : pin.label;

  return (
    <div
      data-pin
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isGM && onRemove) onRemove();
      }}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {(hovered || isSelected) && (
          <PinTooltip pin={pin} isGM={isGM} onRemove={onRemove} />
        )}
      </AnimatePresence>

      {/* Runic Marker SVG */}
      <motion.div
        initial={{ y: -50, opacity: 0, scale: 0.5 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 12, stiffness: 200, bounce: 0.5 }}
        className="relative cursor-pointer"
        whileHover={{ scale: 1.15, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        {isCurrent && (
          <motion.div
            className="absolute -inset-2 rounded-full border border-amber/70"
            initial={{ opacity: 0.4, scale: 0.9 }}
            animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.95, 1.18, 0.95] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <svg width="32" height="40" viewBox="0 0 32 40" className="drop-shadow-xl" style={{ filter: `drop-shadow(0 8px 6px ${style.stroke})` }}>
          {/* Subtle under-glow */}
           <circle cx="16" cy="36" r="8" fill={style.fill} opacity="0.2" filter="blur(4px)" className="animate-pulse" />
          {/* Main Pin Body */}
          <path 
            d="M16 2C8.268 2 2 8.268 2 16c0 6.643 10.388 20.315 13.064 23.63a3.5 3.5 0 0 0 5.872 0C23.612 36.315 30 22.643 30 16 30 8.268 23.732 2 16 2z" 
            fill="#1a1a1a"
            stroke={style.fill}
            strokeWidth="1.5"
          />
          {/* Inner details / Rune / Jewel */}
          <circle cx="16" cy="16" r="6" fill={style.fill} className="animate-pulse" style={{ animationDuration: '3s' }} />
          <path d="M16 8 L16 12 M16 20 L16 24 M10 16 L13 16 M19 16 L22 16" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* Embedded Label below pin */}
      <div
        className={`absolute left-1/2 top-full mt-1 max-w-[11rem] -translate-x-1/2 truncate rounded border bg-black/40 px-2 py-0.5 font-serif text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${style.border} ${style.text} transition-opacity duration-300 ${hovered ? 'opacity-0' : 'opacity-80'} ${isCurrent ? "" : "hidden sm:block"}`}
        style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
        title={labelText}
      >
        {labelText}
      </div>
    </div>
  );
}

// ── Main interactive LoreMap ─────────────────────────────────

export default function LoreMap({
  mapImage,
  pins,
  isGM,
  currentPinId,
  onAddPin,
  onRemovePin,
  onSetCurrentPin,
  onClose,
}: LoreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [creatingPin, setCreatingPin] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pinFormRects, setPinFormRects] = useState<{ container: DOMRect | null; canvas: DOMRect | null }>({
    container: null,
    canvas: null,
  });
  const [selectedPinId, setSelectedPinId] = useState<string | null>(currentPinId ?? pins[0]?.id ?? null);
  const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? null;
  const currentPin = pins.find((pin) => pin.id === currentPinId) ?? null;

  // Pan & Zoom state through framer-motion values
  const [isDragging, setIsDragging] = useState(false);
  
  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isGM) return;
      if (isDragging) return; // Ignore clicks if dragging
      // Don't trigger if clicking on existing pins or forms
      const target = e.target as HTMLElement;
      if (target.closest("[data-pin]") || target.closest("[data-pin-form]")) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPinFormRects({
        container: containerRef.current?.getBoundingClientRect() ?? null,
        canvas: rect,
      });
      setCreatingPin({ x, y });
    },
    [isGM, isDragging]
  );

  const handlePinSubmit = useCallback(
    (data: { label: string; mood?: string; description?: string }) => {
      if (!creatingPin) return;
      onAddPin({ x: creatingPin.x, y: creatingPin.y, ...data });
      setCreatingPin(null);
    },
    [creatingPin, onAddPin]
  );

  useEffect(() => {
    if (canvasRef.current) {
        setCanvasSize({
            width: canvasRef.current.offsetWidth,
            height: canvasRef.current.offsetHeight
        });
    }
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            setCanvasSize({
                width: entry.contentRect.width,
                height: entry.contentRect.height
            });
        }
    });
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex flex-col h-full bg-void" ref={containerRef}>
      {/* Floating Header UI */}
      <div className="absolute left-3 right-3 top-3 z-30 flex items-start justify-between gap-4 pointer-events-none sm:left-6 sm:right-6 sm:top-6">
         <div className="pointer-events-auto">
            <h2 className="font-display text-base uppercase tracking-[0.18em] text-amber drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-2xl sm:tracking-[0.3em]">
                Known World
            </h2>
            <div className="mt-1 h-0.5 w-12 bg-gradient-to-r from-amber to-transparent sm:w-16" />
            
            {/* Legend / Info */}
            <div className="mt-2 flex flex-col gap-2 sm:mt-4">
                <div className="hidden items-center gap-2 font-serif text-xs italic text-amber/70 drop-shadow-md sm:flex">
                   <div className="w-4 h-0.5 bg-amber" /> The party&apos;s trail
                </div>
                {currentPin && (
                  <div className="max-w-[190px] truncate rounded-full border border-amber/25 bg-black/50 px-2.5 py-1 text-[8px] uppercase tracking-widest text-amber backdrop-blur-sm sm:max-w-none sm:px-3 sm:py-1.5 sm:text-[10px]">
                    Current scene: {currentPin.label}
                  </div>
                )}
                {isGM && (
                   <div className="mt-2 hidden w-fit items-center gap-2 rounded-full border border-border-subtle bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-text-tertiary backdrop-blur-sm sm:flex">
                     <Plus size={12} className="text-amber" /> Click to map location
                   </div>
                )}
            </div>
         </div>

         <button 
           onClick={onClose} 
           className="pointer-events-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-black/60 text-text-secondary shadow-lg backdrop-blur-md transition-all hover:border-amber/50 hover:bg-amber/10 hover:text-amber sm:h-10 sm:w-10"
         >
           <X size={20} />
         </button>
      </div>

      {/* Location ledger */}
      <div className="absolute bottom-6 left-6 z-30 hidden w-[min(360px,calc(100%-3rem))] rounded-xl border border-border bg-black/55 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.65)] backdrop-blur-md sm:block">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber font-bold">Known Locations</p>
          <span className="rounded-full border border-border bg-subtle/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-text-secondary">
            {pins.length} marked
          </span>
        </div>
        <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(212,168,67,0.25)_transparent]">
          {pins.map((pin) => {
            const style = getMoodStyle(pin.mood);
            const isCurrent = pin.id === currentPinId;
            const isSelected = pin.id === selectedPinId;
            return (
              <button
                key={pin.id}
                type="button"
                onClick={() => setSelectedPinId(pin.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  isSelected ? "border-amber/35 bg-amber/10" : "border-border-subtle bg-subtle/10 hover:border-border hover:bg-subtle/20"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-paper">{pin.label}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-text-secondary">
                      {pin.description ?? "No notes yet."}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider ${isCurrent ? "bg-amber/20 text-amber" : style.pill}`}>
                    {isCurrent ? "Here" : pin.mood ?? "Known"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {selectedPin && isGM && onSetCurrentPin && selectedPin.id !== currentPinId && (
          <button
            type="button"
            onClick={() => {
              setSelectedPinId(selectedPin.id);
              onSetCurrentPin(selectedPin.id);
            }}
            className="mt-3 min-h-9 w-full rounded-lg border border-amber/25 bg-amber/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber transition-colors hover:bg-amber hover:text-black"
          >
            Set Current Scene Here
          </button>
        )}
      </div>

      {selectedPin && (
        <div className="absolute bottom-20 left-3 right-3 z-30 rounded-xl border border-border bg-black/65 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.65)] backdrop-blur-md sm:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] uppercase tracking-[0.18em] text-text-ghost">
                {selectedPin.id === currentPinId ? "Current Scene" : `${pins.length} Known Locations`}
              </p>
              <h3 className="mt-1 truncate text-[13px] font-medium text-paper">{selectedPin.label}</h3>
              <p className="mt-0.5 truncate font-serif text-[11px] italic text-text-secondary">
                {selectedPin.description ?? "No notes yet."}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] uppercase tracking-wider ${selectedPin.id === currentPinId ? "bg-amber/20 text-amber" : getMoodStyle(selectedPin.mood).pill}`}>
              {selectedPin.id === currentPinId ? "Here" : selectedPin.mood ?? "Known"}
            </span>
          </div>
          {isGM && onSetCurrentPin && selectedPin.id !== currentPinId && (
            <button
              type="button"
              onClick={() => onSetCurrentPin(selectedPin.id)}
              className="mt-2 min-h-8 w-full rounded-lg border border-amber/25 bg-amber/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-amber transition-colors hover:bg-amber hover:text-black"
            >
              Set Current Scene
            </button>
          )}
        </div>
      )}

      {selectedPin && (
        <div className="absolute bottom-6 right-6 z-30 hidden w-[min(330px,calc(100%-3rem))] rounded-xl border border-amber/20 bg-black/55 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.65)] backdrop-blur-md xl:block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.2em] text-text-secondary">
                {selectedPin.id === currentPinId ? "Current Scene" : "Mapped Location"}
              </p>
              <h3 className="mt-1 truncate font-display text-xl text-paper">{selectedPin.label}</h3>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] uppercase tracking-wider ${selectedPin.id === currentPinId ? "bg-amber/20 text-amber" : getMoodStyle(selectedPin.mood).pill}`}>
              {selectedPin.id === currentPinId ? "Here" : selectedPin.mood ?? "Known"}
            </span>
          </div>
          <p className="mt-3 font-serif text-[13px] italic leading-relaxed text-text">
            {selectedPin.description ?? "No table notes have been etched here yet."}
          </p>
          <div className="mt-4 border-t border-border-subtle pt-3">
            <p className="text-[9px] uppercase tracking-[0.2em] text-amber">Map Rumor</p>
            <p className="mt-2 font-serif text-[12px] leading-relaxed text-text-secondary">
              {MAP_RUMORS[Math.abs(selectedPin.label.length + Math.round(selectedPin.x)) % MAP_RUMORS.length]}
            </p>
          </div>
        </div>
      )}

      {/* Interactive Map Viewport */}
      <div className="flex-1 relative z-10 overflow-hidden cursor-grab active:cursor-grabbing">
         {/* Vignette/Fog of War - stationary overlay */}
         <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_70px_42px_rgba(10,8,6,0.9)] sm:shadow-[inset_0_0_150px_100px_rgba(10,8,6,0.95)]" />
         
         {/* Draggable/Zoomable Canvas */}
         <motion.div
           ref={canvasRef}
           className="relative h-full w-full origin-center"
           drag
           dragConstraints={containerRef}
           dragElastic={0.1}
           onDragStart={() => setIsDragging(true)}
           onDragEnd={() => { 
                // Small delay to prevent drag release from counting as a click
                setTimeout(() => setIsDragging(false), 100);
           }}
           whileTap={{ cursor: "grabbing" }}
           onClick={handleMapClick}
         >
           
            {/* The Parchment Background */}
            <div className="absolute inset-0" 
                 style={{
                   background: `
                     radial-gradient(ellipse at 40% 30%, rgba(212, 175, 55, 0.15) 0%, transparent 60%),
                     radial-gradient(ellipse at 70% 80%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
                     linear-gradient(135deg, #1c1510 0%, #15100c 40%, #0d0a08 100%)
                   `,
                 }}
            >
               {/* Noise Texture */}
               <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                      backgroundSize: "200px 200px",
                    }}
               />
               <NauticalGrid />
               <WorldCartography />
               {mapImage && (
                 <img
                   src={mapImage}
                   alt="World Map Base"
                   className="absolute inset-0 w-full h-full object-contain opacity-40 mix-blend-luminosity pointer-events-none"
                   draggable={false}
                 />
               )}
            </div>

            {/* Journey Paths (drawn below pins) */}
            <JourneyPaths pins={pins} canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} />

            {/* Map Pins */}
            {pins.map((pin) => (
              <MapPinMarker
                key={pin.id}
                pin={pin}
                isGM={isGM}
                isCurrent={pin.id === currentPinId}
                isSelected={pin.id === selectedPinId}
                onSelect={() => setSelectedPinId(pin.id)}
                onRemove={isGM && onRemovePin ? () => onRemovePin(pin.id) : undefined}
              />
            ))}

            {/* Pin creation form wrapper */}
            <AnimatePresence>
              {creatingPin && (
                <div data-pin-form className="absolute inset-0 pointer-events-none">
                  {/* Needs to be pointer-events-none on wrapper so clicks pass through to map, but auto on form */}
                  <div className="pointer-events-auto w-full h-full">
                    <PinCreationForm
                      x={creatingPin.x}
                      y={creatingPin.y}
                      containerRect={pinFormRects.container}
                      canvasRect={pinFormRects.canvas}
                      scale={1} // Assuming 1 for now unless implementing wheel zoom
                      pan={{x: 0, y: 0}} // Framer motion drag handles actual transform of element, so relative coords are local!
                      onSubmit={handlePinSubmit}
                      onCancel={() => setCreatingPin(null)}
                    />
                  </div>
                </div>
              )}
            </AnimatePresence>
         </motion.div>
         
         {/* Decorative Compass Overlay (fixed relative to viewport) */}
         <div className="absolute bottom-8 right-8 z-20 hidden pointer-events-none opacity-[0.15] sm:block">
            <motion.div
               animate={{ rotate: 360 }}
               transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
               className="relative"
            >
               <Compass size={180} strokeWidth={0.5} className="text-amber" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-24 bg-gradient-to-b from-amber to-transparent rounded-full shadow-[0_0_10px_#d4af37]" />
               </div>
            </motion.div>
         </div>
      </div>
    </div>
  );
}
