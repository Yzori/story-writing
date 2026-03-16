"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useAnimation, useMotionValue } from "framer-motion";
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
  onAddPin: (pin: Omit<MapPin, "id">) => void;
  onRemovePin?: (pinId: string) => void;
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
  bg: "bg-[#d4af37]/80", // Gold-ish default
  border: "border-[#d4af37]/60",
  glow: "shadow-[0_0_12px_rgba(212,175,55,0.4)]",
  text: "text-[#d4af37]",
  pill: "bg-[#d4af37]/20 text-[#d4af37]",
  fill: "#d4af37",
  stroke: "rgba(212,175,55,0.4)"
};

function getMoodStyle(mood?: string) {
  if (!mood) return DEFAULT_PIN_STYLE;
  return MOOD_COLORS[mood] ?? DEFAULT_PIN_STYLE;
}

const MOODS = ["tense", "calm", "ominous", "triumphant", "melancholy", "chaotic", "mysterious", "romantic"] as const;

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

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}>
      {/* Background thicker glow line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="#78350f"
        strokeWidth="6"
        strokeOpacity="0.2"
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
      {/* Animated travel dot */}
      <motion.circle
        r="4"
        fill="#ffffff"
        className="drop-shadow-[0_0_8px_rgba(212,175,55,1)]"
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        style={{ offsetPath: `path('${pathD}')` } as any}
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
      className="absolute z-50 w-[280px] bg-[#1a1512]/95 backdrop-blur-md border border-[#d4af37]/30 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden"
      style={formStyle}
    >
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]/80 font-bold flex items-center gap-1.5">
            <MapPinIcon size={12} />
            Mark Location
          </p>
          <button type="button" onClick={onCancel} className="text-white/30 hover:text-white transition-colors cursor-pointer p-1">
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
             className="w-full bg-black/40 border border-[#d4af37]/20 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]/60 font-serif shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] transition-colors placeholder:text-[#d4af37]/30"
           />
        </div>

        {/* Mood selector */}
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2">Vibe / Danger Level</p>
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
                      : "bg-white/5 text-white/40 border-white/10 hover:border-white/30 hover:bg-white/10"
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
          className="w-full bg-black/40 border border-[#d4af37]/20 rounded-md px-3 py-2 text-xs text-white/80 placeholder:text-[#d4af37]/30 focus:outline-none focus:border-[#d4af37]/60 resize-none font-serif shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] transition-colors leading-relaxed"
        />

        {/* Actions */}
        <button
          type="submit"
          disabled={!label.trim()}
          className="w-full bg-gradient-to-r from-[#d4af37]/10 via-[#d4af37]/20 to-[#d4af37]/10 hover:via-[#d4af37]/30 border border-[#d4af37]/30 text-[#d4af37] rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(212,175,55,0.1)]"
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
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-40 pointer-events-auto origin-bottom"
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
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-bold text-white border border-black/20 shadow-sm mb-2`} style={{ backgroundColor: style.fill }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            {pin.mood}
          </span>
        )}

        {/* Description in handwritten-ish serif */}
        {pin.description && (
          <p className="text-[13px] text-[#4a3f35] leading-relaxed font-serif italic" style={{ textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>
            "{pin.description}"
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
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isGM && onRemove) onRemove();
      }}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
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
      <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded backdrop-blur-sm bg-black/40 border ${style.border} whitespace-nowrap text-[10px] uppercase tracking-widest font-serif font-bold ${style.text} transition-opacity duration-300 ${hovered ? 'opacity-0' : 'opacity-80'}`} style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
        {pin.label}
      </div>
    </div>
  );
}

// ── Main interactive LoreMap ─────────────────────────────────

export default function LoreMap({
  mapImage,
  pins,
  isGM,
  onAddPin,
  onRemovePin,
  onClose,
}: LoreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [creatingPin, setCreatingPin] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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
        for (let entry of entries) {
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
    <div className="flex flex-col h-full bg-[#0a0806]" ref={containerRef}>
      {/* Floating Header UI */}
      <div className="absolute top-6 left-6 right-6 z-30 flex justify-between items-start pointer-events-none">
         <div className="pointer-events-auto">
            <h2 className="text-2xl font-display text-[#d4af37] tracking-[0.3em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Known World
            </h2>
            <div className="h-0.5 w-16 bg-gradient-to-r from-[#d4af37] to-transparent mt-1" />
            
            {/* Legend / Info */}
            <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-serif text-[#d4af37]/70 italic drop-shadow-md">
                   <div className="w-4 h-0.5 bg-[#d4af37]" /> The party's trail
                </div>
                {isGM && (
                   <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5 w-fit mt-2">
                     <Plus size={12} className="text-[#d4af37]" /> Click to map location
                   </div>
                )}
            </div>
         </div>

         <button 
           onClick={onClose} 
           className="pointer-events-auto w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:border-[#d4af37]/50 hover:bg-[#d4af37]/10 flex items-center justify-center text-white/50 hover:text-[#d4af37] transition-all cursor-pointer shadow-lg"
         >
           <X size={20} />
         </button>
      </div>

      {/* Interactive Map Viewport */}
      <div className="flex-1 relative z-10 overflow-hidden cursor-grab active:cursor-grabbing">
         {/* Vignette/Fog of War - stationary overlay */}
         <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_150px_100px_rgba(10,8,6,0.95)]" />
         
         {/* Draggable/Zoomable Canvas */}
         <motion.div
           ref={canvasRef}
           className="relative w-[150vw] h-[150vh] origin-center -translate-x-[25vw] -translate-y-[25vh]" // Make canvas larger than viewport to pan around
           drag
           dragConstraints={containerRef}
           dragElastic={0.1}
           onDragStart={() => setIsDragging(true)}
           onDragEnd={(e, i) => { 
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
                      containerRect={containerRef.current?.getBoundingClientRect() ?? null}
                      canvasRect={canvasRef.current?.getBoundingClientRect() ?? null}
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
         <div className="absolute bottom-8 right-8 z-30 pointer-events-none opacity-[0.15]">
            <motion.div
               animate={{ rotate: 360 }}
               transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
               className="relative"
            >
               <Compass size={180} strokeWidth={0.5} className="text-[#d4af37]" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-24 bg-gradient-to-b from-[#d4af37] to-transparent rounded-full shadow-[0_0_10px_#d4af37]" />
               </div>
            </motion.div>
         </div>
      </div>
    </div>
  );
}

