"use client";

import { motion } from "framer-motion";

export interface ProgressClockData {
  id: string;
  name: string;
  segments: 4 | 6 | 8;
  filled: number; // 0 to segments
  type: "danger" | "progress" | "racing";
}

interface ProgressClockProps {
  clock: ProgressClockData;
  size?: number;
  interactive?: boolean;
  onToggleSegment?: (segmentIndex: number) => void;
  onDelete?: () => void;
}

const TYPE_COLORS = {
  danger: { fill: "rgba(244, 63, 94, 0.6)", stroke: "rgba(244, 63, 94, 0.3)", label: "text-rose/60", badge: "bg-rose/10 border-rose/20 text-rose/70" },
  progress: { fill: "rgba(200, 150, 60, 0.6)", stroke: "rgba(200, 150, 60, 0.3)", label: "text-amber/60", badge: "bg-amber/10 border-amber/20 text-amber/70" },
  racing: { fill: "rgba(99, 102, 241, 0.6)", stroke: "rgba(99, 102, 241, 0.3)", label: "text-indigo-400/60", badge: "bg-indigo-400/10 border-indigo-400/20 text-indigo-400/70" },
};

export default function ProgressClock({
  clock,
  size = 60,
  interactive = false,
  onToggleSegment,
  onDelete,
}: ProgressClockProps) {
  const { segments, filled, type } = clock;
  const colors = TYPE_COLORS[type];
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 3;

  // Build path for each segment (pie slice)
  function getSegmentPath(index: number): string {
    const anglePerSegment = (2 * Math.PI) / segments;
    const startAngle = index * anglePerSegment - Math.PI / 2;
    const endAngle = startAngle + anglePerSegment;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArc = anglePerSegment > Math.PI ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="flex flex-col items-center gap-1.5 group/clock relative">
      {/* Delete button — hover only, interactive mode */}
      {interactive && onDelete && (
        <button
          onClick={onDelete}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black border border-white/10 text-white/30 hover:text-rose hover:border-rose/30 flex items-center justify-center opacity-0 group-hover/clock:opacity-100 transition-all cursor-pointer z-10"
          title="Remove clock"
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={colors.stroke} strokeWidth="1.5" />

        {/* Segments */}
        {Array.from({ length: segments }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <motion.path
              key={i}
              d={getSegmentPath(i)}
              fill={isFilled ? colors.fill : "transparent"}
              stroke={colors.stroke}
              strokeWidth="1"
              initial={false}
              animate={{ fill: isFilled ? colors.fill : "rgba(255,255,255,0.02)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={interactive ? "cursor-pointer hover:opacity-80" : ""}
              onClick={() => {
                if (interactive && onToggleSegment) {
                  onToggleSegment(i);
                }
              }}
            />
          );
        })}

        {/* Segment divider lines from center to edge */}
        {Array.from({ length: segments }).map((_, i) => {
          const angle = (i * 2 * Math.PI) / segments - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          return (
            <line
              key={`line-${i}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="2" fill="rgba(255,255,255,0.1)" />
      </svg>

      {/* Name */}
      <span className={`text-[9px] uppercase tracking-wider font-display ${colors.label} text-center leading-tight max-w-[80px] truncate`}>
        {clock.name}
      </span>

      {/* Type badge */}
      <span className={`text-[7px] uppercase tracking-widest border rounded-full px-1.5 py-0.5 ${colors.badge}`}>
        {type}
      </span>
    </div>
  );
}
