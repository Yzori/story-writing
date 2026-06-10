"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { storyHref, type MockCampaign } from "@/components/dashboard-mockup/useDashboardData";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Shared cartographic map renderer for the Realm concept + the Realm/clarity
// hybrid. Inline SVG parchment map. Deterministic placement (string-hash, no
// Math.random in the render path). Throwaway design-mockup support module.
// ─────────────────────────────────────────────────────────────────────────────

export const VB_W = 1000;
export const VB_H = 620;

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function hrand(seed: string): number {
  return (hashStr(seed) % 100000) / 100000;
}

export function relativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const chartedPct = (words: number) => Math.round(clamp01((words || 0) / 20000) * 100);

function blobPath(cx: number, cy: number, r: number, seed: string): string {
  const pts = 9;
  const coords: [number, number][] = [];
  for (let i = 0; i < pts; i++) {
    const ang = (i / pts) * Math.PI * 2;
    const wobble = 0.66 + hrand(`${seed}:${i}`) * 0.55;
    const rr = r * wobble;
    coords.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
  }
  let d = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  for (let i = 0; i < pts; i++) {
    const p0 = coords[i];
    const p1 = coords[(i + 1) % pts];
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;
    d += ` Q ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return d + " Z";
}

export function layoutRegions(stories: ApiStory[]) {
  const cols = 3;
  const cellW = (VB_W - 200) / cols;
  const cellH = 168;
  return stories.slice(0, 9).map((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jx = (hrand(`${s.id}:x`) - 0.5) * 64;
    const jy = (hrand(`${s.id}:y`) - 0.5) * 48;
    const cx = 150 + col * cellW + jx;
    const cy = 150 + row * cellH + jy;
    const revealed = clamp01((s.totalWords || 0) / 20000);
    const r = 54 + revealed * 40 + (hrand(`${s.id}:r`) - 0.5) * 14;
    return { story: s, cx, cy, r, revealed, seed: s.id };
  });
}

export function layoutSettlements(camps: MockCampaign[]) {
  return camps.slice(0, 4).map((c, i) => {
    const x = 200 + i * 200 + (hrand(`${c.id}:sx`) - 0.5) * 50;
    const y = 510 + (hrand(`${c.id}:sy`) - 0.5) * 30;
    return { camp: c, x, y };
  });
}

export function RealmMap({
  regions,
  settlements,
  activeId,
  dispatchCount,
  reduce,
  isEmpty,
}: {
  regions: ReturnType<typeof layoutRegions>;
  settlements: ReturnType<typeof layoutSettlements>;
  activeId: string | null;
  dispatchCount: number;
  reduce: boolean | null;
  isEmpty: boolean;
}) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block h-full w-full" role="img" aria-label="A map of your realm">
      <defs>
        <radialGradient id="r-parch" cx="42%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#EFE9D9" />
          <stop offset="55%" stopColor="#E4D9BC" />
          <stop offset="100%" stopColor="#D2C29C" />
        </radialGradient>
        <radialGradient id="r-sea" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#C9BC97" />
          <stop offset="100%" stopColor="#BCAC82" />
        </radialGradient>
        <linearGradient id="r-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D8C99E" />
          <stop offset="100%" stopColor="#C7B384" />
        </linearGradient>
        <linearGradient id="r-land-active" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E7CF8E" />
          <stop offset="100%" stopColor="#D4B560" />
        </linearGradient>
        <radialGradient id="r-fog" cx="50%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#F2ECDC" stopOpacity="0.05" />
          <stop offset="70%" stopColor="#E9E1CB" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#DcD2B6" stopOpacity="0.96" />
        </radialGradient>
        <filter id="r-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={2} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={6} />
        </filter>
        <filter id="r-paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.2  0 0 0 0.05 0" />
        </filter>
        <filter id="r-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#r-sea)" />
      <rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#r-parch)" opacity={0.55} />
      <rect x={0} y={0} width={VB_W} height={VB_H} filter="url(#r-paper-grain)" opacity={0.5} />

      <g stroke="#A88030" strokeOpacity={0.1} strokeWidth={1}>
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i} x1={0} y1={20 + i * 44} x2={VB_W} y2={20 + i * 44} />
        ))}
      </g>

      <rect x={16} y={16} width={VB_W - 32} height={VB_H - 32} rx={10} fill="none" stroke="#7A5C32" strokeWidth={2.5} strokeOpacity={0.6} />
      <rect x={24} y={24} width={VB_W - 48} height={VB_H - 48} rx={8} fill="none" stroke="#7A5C32" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="2 6" />

      <g opacity={0.5} transform="translate(862,92)">
        <SeaSerpent />
        <text x={-14} y={64} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={13} fill="#7A5C32" fillOpacity={0.7}>
          here be dragons
        </text>
      </g>

      {isEmpty && <UnchartedMarker reduce={reduce} />}

      {regions.map((reg, i) => (
        <Region key={reg.story.id} reg={reg} active={reg.story.id === activeId} index={i} reduce={reduce} />
      ))}

      {settlements.map((s) => (
        <Settlement key={s.camp.id} s={s} />
      ))}

      {!reduce &&
        Array.from({ length: Math.max(1, Math.min(3, dispatchCount || 1)) }).map((_, i) => <Raven key={i} index={i} />)}
      {reduce &&
        dispatchCount > 0 &&
        Array.from({ length: Math.min(3, dispatchCount) }).map((_, i) => (
          <g key={i} transform={`translate(${120 + i * 60}, ${70 + i * 18})`} opacity={0.7}>
            <RavenGlyph />
          </g>
        ))}

      <CompassRose reduce={reduce} />
    </svg>
  );
}

function Region({
  reg,
  active,
  index,
  reduce,
}: {
  reg: ReturnType<typeof layoutRegions>[number];
  active: boolean;
  index: number;
  reduce: boolean | null;
}) {
  const { story, cx, cy, r, revealed, seed } = reg;
  const path = useMemo(() => blobPath(cx, cy, r, seed), [cx, cy, r, seed]);
  const fogOpacity = 0.92 - revealed * 0.86;
  const pct = Math.round(revealed * 100);
  const clipId = `clip-${index}`;

  return (
    <motion.g
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: reduce ? 0 : 0.06 * index, duration: 0.5 }}
      style={{ cursor: "pointer" }}
    >
      <Link href={storyHref(story)}>
        <g>
          <path d={path} fill="#000" opacity={0.12} transform="translate(4,5)" filter="url(#r-soft)" />
          <path d={path} fill={active ? "url(#r-land-active)" : "url(#r-land)"} stroke="#7A5C32" strokeWidth={active ? 2.4 : 1.6} strokeOpacity={0.85} filter="url(#r-rough)" />
          <path d={path} fill="none" stroke="#A88030" strokeWidth={1} strokeOpacity={0.45} transform="scale(0.93)" style={{ transformOrigin: `${cx}px ${cy}px` }} />

          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
          <g clipPath={`url(#${clipId})`} opacity={0.55 + revealed * 0.45}>
            {revealed > 0.18 && (
              <g stroke="#7A5C32" strokeOpacity={0.5} fill="none" strokeWidth={1.1}>
                {Array.from({ length: Math.round(revealed * 5) + 1 }).map((_, k) => {
                  const mx = cx - r * 0.4 + hrand(`${seed}:m${k}`) * r * 0.8;
                  const my = cy - r * 0.35 + hrand(`${seed}:my${k}`) * r * 0.5;
                  return <path key={k} d={`M ${mx - 7} ${my + 6} L ${mx} ${my - 5} L ${mx + 7} ${my + 6}`} />;
                })}
              </g>
            )}
            {revealed > 0.4 && (
              <path d={`M ${cx - r * 0.5} ${cy + r * 0.1} Q ${cx} ${cy + r * 0.4} ${cx + r * 0.55} ${cy - r * 0.1}`} fill="none" stroke="#6E8B86" strokeOpacity={0.5} strokeWidth={2} />
            )}
            {revealed > 0.55 && <circle cx={cx + r * 0.2} cy={cy + r * 0.2} r={3} fill="#7A5C32" fillOpacity={0.7} />}
          </g>

          {fogOpacity > 0.08 && <path d={path} fill="url(#r-fog)" opacity={fogOpacity} style={{ pointerEvents: "none" }} />}

          {active && (
            <motion.path
              d={path}
              fill="none"
              stroke="#E7CF8E"
              strokeWidth={3}
              strokeOpacity={0.9}
              animate={reduce ? {} : { strokeOpacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              transform="scale(1.08)"
              filter="url(#r-soft)"
            />
          )}

          <text x={cx} y={cy + r + 16} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={active ? 17 : 14} fill="#5C4423" opacity={0.35 + revealed * 0.65} style={{ letterSpacing: "0.5px" }}>
            {story.title}
          </text>
          <text x={cx} y={cy + r + 30} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={8.5} fill="#7A5C32" opacity={0.6} style={{ letterSpacing: "1px" }}>
            {(story.totalWords || 0).toLocaleString()}w · {pct}% charted
          </text>
        </g>
      </Link>

      {active && (
        <g transform={`translate(${cx + r * 0.55}, ${cy - r * 0.7})`} style={{ pointerEvents: "none" }}>
          <motion.g animate={reduce ? {} : { y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
            <path d="M0 0 C -8 -16 -8 -26 0 -30 C 8 -26 8 -16 0 0 Z" fill="#B8442E" stroke="#5C2114" strokeWidth={1.2} />
            <circle cx={0} cy={-21} r={4} fill="#EFE9D9" />
          </motion.g>
          <text x={6} y={-34} fontFamily="ui-monospace, monospace" fontSize={8} fill="#5C2114" fontWeight={700} style={{ letterSpacing: "1px" }}>
            YOU ARE HERE
          </text>
        </g>
      )}
    </motion.g>
  );
}

function Settlement({ s }: { s: ReturnType<typeof layoutSettlements>[number] }) {
  const { camp, x, y } = s;
  const inSession = !!camp.activeSession;
  const href = inSession ? `/campaign/${camp.id}/play/${camp.activeSession!.id}` : `/campaign/${camp.id}`;
  const pips = Math.max(1, Math.min(6, camp.playerCount || 1));

  return (
    <g style={{ cursor: "pointer" }}>
      <Link href={href}>
        <g>
          <g stroke="#5C4423" strokeWidth={1.4} fill="#C7B384">
            <rect x={x - 14} y={y - 18} width={28} height={20} rx={1.5} />
            <rect x={x - 18} y={y - 28} width={9} height={30} rx={1} />
            <rect x={x + 9} y={y - 28} width={9} height={30} rx={1} />
            <path d={`M ${x - 18} ${y - 28} l 0 -4 l 3 0 l 0 4 m 3 0 l 0 -4 l 3 0 l 0 4`} fill="none" />
          </g>
          <path d={`M ${x - 4} ${y + 2} l 0 -8 a 4 4 0 0 1 8 0 l 0 8 Z`} fill="#5C4423" />

          {Array.from({ length: pips }).map((_, i) => {
            const bx = x - (pips - 1) * 5 + i * 10;
            return (
              <g key={i}>
                <line x1={bx} y1={y - 34} x2={bx} y2={y - 22} stroke="#5C4423" strokeWidth={1} />
                <path d={`M ${bx} ${y - 34} l 8 2 l -8 3 Z`} fill={inSession ? "#5E8B82" : "#A88030"} stroke="#5C4423" strokeWidth={0.5} />
              </g>
            );
          })}

          {inSession && (
            <motion.circle cx={x} cy={y - 10} r={30} fill="#5E8B82" opacity={0.18} animate={{ opacity: [0.1, 0.28, 0.1], r: [26, 34, 26] }} transition={{ duration: 2.6, repeat: Infinity }} />
          )}

          <text x={x} y={y + 20} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={13} fill="#5C4423">
            {camp.title}
          </text>
          {inSession ? (
            <text x={x} y={y + 33} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={8} fill="#3F6B62" fontWeight={700} style={{ letterSpacing: "1px" }}>
              ● TABLE IN SESSION
            </text>
          ) : (
            <text x={x} y={y + 33} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={8} fill="#7A5C32" style={{ letterSpacing: "1px" }}>
              {camp.playerCount} at the table
            </text>
          )}
        </g>
      </Link>
    </g>
  );
}

function UnchartedMarker({ reduce }: { reduce: boolean | null }) {
  const cx = VB_W / 2;
  const cy = VB_H / 2 - 10;
  return (
    <g>
      <rect x={28} y={28} width={VB_W - 56} height={VB_H - 56} rx={8} fill="url(#r-fog)" opacity={0.7} />
      <motion.circle cx={cx} cy={cy} r={50} fill="#E7CF8E" opacity={0.2} animate={reduce ? {} : { opacity: [0.12, 0.3, 0.12], r: [44, 56, 44] }} transition={{ duration: 3, repeat: Infinity }} />
      <g transform={`translate(${cx}, ${cy})`}>
        <path d="M0 0 C -11 -22 -11 -36 0 -42 C 11 -36 11 -22 0 0 Z" fill="#A88030" stroke="#5C4423" strokeWidth={1.5} />
        <circle cx={0} cy={-29} r={6} fill="#EFE9D9" />
      </g>
      <text x={cx} y={cy + 30} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={18} fill="#5C4423">
        terra incognita
      </text>
      <text x={cx} y={cy + 50} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={9} fill="#7A5C32" style={{ letterSpacing: "2px" }}>
        NO LANDS CHARTED YET
      </text>
    </g>
  );
}

function Raven({ index }: { index: number }) {
  const startX = 60 + index * 30;
  const startY = 50 + index * 24;
  return (
    <motion.g
      initial={{ x: startX, y: startY, opacity: 0 }}
      animate={{
        x: [startX, startX + 180 + index * 40, startX + 340 + index * 30],
        y: [startY, startY + 60, startY + 30 + index * 40],
        opacity: [0, 1, 0],
      }}
      transition={{ duration: 6 + index, repeat: Infinity, delay: index * 2.2, ease: "easeInOut", times: [0, 0.5, 1] }}
    >
      <RavenGlyph />
    </motion.g>
  );
}

function RavenGlyph() {
  return (
    <motion.g animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "center" }}>
      <path d="M -10 0 Q -4 -6 0 0 Q 4 -6 10 0" fill="none" stroke="#2B2018" strokeWidth={2.4} strokeLinecap="round" />
      <rect x={-3} y={1} width={6} height={4} rx={0.5} fill="#EDE3CB" stroke="#7A5C32" strokeWidth={0.6} />
    </motion.g>
  );
}

function CompassRose({ reduce }: { reduce: boolean | null }) {
  const cx = 905;
  const cy = 520;
  return (
    <g opacity={0.85}>
      <circle cx={cx} cy={cy} r={42} fill="#EFE9D9" fillOpacity={0.35} stroke="#7A5C32" strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={32} fill="none" stroke="#A88030" strokeWidth={0.8} strokeDasharray="1 4" />
      <motion.g animate={reduce ? {} : { rotate: [0, 360] }} transition={{ duration: 90, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <path d={`M ${cx} ${cy - 34} L ${cx + 6} ${cy} L ${cx} ${cy + 34} L ${cx - 6} ${cy} Z`} fill="#B8442E" stroke="#5C2114" strokeWidth={0.6} />
        <path d={`M ${cx - 34} ${cy} L ${cx} ${cy - 6} L ${cx + 34} ${cy} L ${cx} ${cy + 6} Z`} fill="#A88030" stroke="#5C4423" strokeWidth={0.6} />
      </motion.g>
      <text x={cx} y={cy - 46} textAnchor="middle" fontFamily="serif" fontSize={11} fill="#5C2114" fontWeight={700}>
        N
      </text>
    </g>
  );
}

function SeaSerpent() {
  return (
    <g stroke="#7A5C32" strokeWidth={2} fill="none" strokeLinecap="round">
      <path d="M -40 20 Q -28 0 -16 20 Q -4 40 8 20 Q 20 0 32 18" />
      <path d="M 32 18 q 8 -2 12 -10 q -10 2 -8 10" fill="#7A5C32" fillOpacity={0.5} />
      <circle cx={36} cy={10} r={1.5} fill="#7A5C32" />
    </g>
  );
}

export function LoadingMap({ reduce }: { reduce: boolean | null }) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block h-full w-full">
      <rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#r-load-parch)" />
      <defs>
        <radialGradient id="r-load-parch" cx="45%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#E4D9BC" />
          <stop offset="100%" stopColor="#C7B384" />
        </radialGradient>
      </defs>
      <g stroke="#7A5C32" strokeOpacity={0.12} strokeWidth={1}>
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 80} y1={0} x2={(i + 1) * 80} y2={VB_H} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(i + 1) * 70} x2={VB_W} y2={(i + 1) * 70} />
        ))}
      </g>
      {[0, 1, 2].map((i) => (
        <motion.line
          key={i}
          x1={120 + i * 60}
          y1={120 + i * 90}
          x2={420 + i * 80}
          y2={260 + i * 70}
          stroke="#A88030"
          strokeWidth={2}
          strokeDasharray="6 8"
          animate={reduce ? {} : { strokeDashoffset: [0, -28], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
      <text x={VB_W / 2} y={VB_H / 2} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={20} fill="#5C4423" opacity={0.7}>
        unrolling the map…
      </text>
    </svg>
  );
}

export function TornMap() {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block h-full w-full">
      <rect x={0} y={0} width={VB_W} height={VB_H} fill="#D2C29C" />
      <path
        d={`M 0 ${VB_H / 2 - 40} L 200 ${VB_H / 2 + 20} L 400 ${VB_H / 2 - 30} L 620 ${VB_H / 2 + 40} L ${VB_W} ${VB_H / 2 - 10} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
        fill="#1a140c"
        opacity={0.25}
      />
      <text x={VB_W / 2} y={VB_H / 2 - 70} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={22} fill="#5C4423">
        the map is torn here
      </text>
      <text x={VB_W / 2} y={VB_H / 2 - 46} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={10} fill="#7A5C32" style={{ letterSpacing: "2px" }}>
        THESE LANDS COULD NOT BE RECOVERED
      </text>
    </svg>
  );
}
