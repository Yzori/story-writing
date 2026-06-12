"use client";

import { motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Isometric island kit for the landing experience — deliberately in the bright,
// glossy, toy-diorama style of the user's reference (per explicit request, a
// one-off departure from the night-silhouette direction): saturated grass tops,
// thick cake-slice bases with rocky undersides, cream-walled buildings with
// vivid roofs, glints, and a populated, *alive* feel. True 30° projection,
// three-tone face shading, light from the upper left.
// ─────────────────────────────────────────────────────────────────────────────

const S = 30; // px per grid unit
const px = (x: number, y: number) => +((x - y) * 0.866 * S).toFixed(1);
const py = (x: number, y: number, z: number) => +(((x + y) * 0.5 - z) * S).toFixed(1);
const P3 = (arr: [number, number, number][]) => arr.map(([x, y, z]) => `${px(x, y)},${py(x, y, z)}`).join(" ");

const ERX = (r: number) => 1.2247 * r * S;
const ERY = (r: number) => 0.7071 * r * S;
const TAU = Math.PI * 2;

// ── primitives ───────────────────────────────────────────────────────────────

function Box({
  x, y, z = 0, w, d, h, top, left, right,
}: {
  x: number; y: number; z?: number; w: number; d: number; h: number; top: string; left: string; right: string;
}) {
  return (
    <g>
      <polygon points={P3([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={left} />
      <polygon points={P3([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={right} />
      <polygon points={P3([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={top} />
    </g>
  );
}

function Gable({
  x, y, z, w, d, rh, front, gable, ridge,
}: {
  x: number; y: number; z: number; w: number; d: number; rh: number; front: string; gable: string; ridge: string;
}) {
  return (
    <g>
      <polygon points={P3([[x, y, z], [x + w, y, z], [x + w, y + d / 2, z + rh], [x, y + d / 2, z + rh]])} fill={ridge} />
      <polygon points={P3([[x, y + d, z], [x + w, y + d, z], [x + w, y + d / 2, z + rh], [x, y + d / 2, z + rh]])} fill={front} />
      <polygon points={P3([[x + w, y, z], [x + w, y + d, z], [x + w, y + d / 2, z + rh]])} fill={gable} />
    </g>
  );
}

function Cyl({
  x, y, z = 0, r, h, side, top,
}: {
  x: number; y: number; z?: number; r: number; h: number; side: string; top: string;
}) {
  const cx = px(x, y);
  const yT = py(x, y, z + h);
  const yB = py(x, y, z);
  const rx = ERX(r);
  const ry = ERY(r);
  return (
    <g>
      <path d={`M ${cx - rx} ${yT} L ${cx - rx} ${yB} Q ${cx} ${yB + ry * 1.9} ${cx + rx} ${yB} L ${cx + rx} ${yT} Z`} fill={side} />
      <ellipse cx={cx} cy={yT} rx={rx} ry={ry} fill={top} />
    </g>
  );
}

function Dome({ x, y, z, r, hd, fill, shine }: { x: number; y: number; z: number; r: number; hd: number; fill: string; shine?: boolean }) {
  const cx = px(x, y);
  const yB = py(x, y, z);
  const rx = ERX(r);
  return (
    <g>
      <path d={`M ${cx - rx} ${yB} C ${cx - rx} ${yB - hd * S * 1.45}, ${cx + rx} ${yB - hd * S * 1.45}, ${cx + rx} ${yB} Q ${cx} ${yB + ERY(r) * 1.6} ${cx - rx} ${yB} Z`} fill={fill} />
      {shine && (
        <path
          d={`M ${cx - rx * 0.62} ${yB - hd * S * 0.42} C ${cx - rx * 0.6} ${yB - hd * S * 0.92}, ${cx - rx * 0.05} ${yB - hd * S * 1.06}, ${cx + rx * 0.16} ${yB - hd * S * 0.98}`}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function Tree({ x, y, h = 2, r = 0.7, light, dark, trunk }: { x: number; y: number; h?: number; r?: number; light: string; dark: string; trunk: string }) {
  const ax = px(x, y);
  const yTop = py(x, y, h);
  const yBase = py(x, y, 0.3);
  const rw = r * S;
  return (
    <g>
      <rect x={ax - 2} y={yBase - 2} width={4} height={11} fill={trunk} />
      <polygon points={`${ax},${yTop} ${ax - rw},${yBase} ${ax},${yBase + r * 0.45 * S}`} fill={light} />
      <polygon points={`${ax},${yTop} ${ax + rw},${yBase} ${ax},${yBase + r * 0.45 * S}`} fill={dark} />
      <polygon points={`${ax},${yTop + h * S * 0.22} ${ax - rw * 0.6},${yBase - h * S * 0.38} ${ax},${yBase - h * S * 0.38 + r * 0.4 * S} ${ax + rw * 0.6},${yBase - h * S * 0.38}`} fill={light} opacity={0.5} />
    </g>
  );
}

// puffy round-canopy tree (blossom / leafy)
function PuffTree({ x, y, h = 1.5, r = 0.85, light, dark, trunk }: { x: number; y: number; h?: number; r?: number; light: string; dark: string; trunk: string }) {
  const ax = px(x, y);
  const yC = py(x, y, h);
  return (
    <g>
      <rect x={ax - 2.2} y={py(x, y, 0.2) - 4} width={4.4} height={14} fill={trunk} />
      <circle cx={ax + r * S * 0.28} cy={yC + 4} r={r * S * 0.8} fill={dark} />
      <circle cx={ax - r * S * 0.2} cy={yC} r={r * S * 0.85} fill={light} />
      <circle cx={ax - r * S * 0.5} cy={yC - r * S * 0.3} r={r * S * 0.4} fill="rgba(255,255,255,0.35)" />
    </g>
  );
}

function Bush({ x, y, r = 0.55, light, dark }: { x: number; y: number; r?: number; light: string; dark: string }) {
  const ax = px(x, y);
  const ay = py(x, y, 0.18);
  return (
    <g>
      <ellipse cx={ax + r * S * 0.4} cy={ay + 2} rx={r * S * 0.75} ry={r * S * 0.5} fill={dark} />
      <ellipse cx={ax - r * S * 0.25} cy={ay} rx={r * S * 0.8} ry={r * S * 0.55} fill={light} />
    </g>
  );
}

function Flower({ x, y, color }: { x: number; y: number; color: string }) {
  const ax = px(x, y);
  const ay = py(x, y, 0.12);
  return (
    <g>
      <circle cx={ax} cy={ay} r={2.6} fill={color} />
      <circle cx={ax} cy={ay} r={1} fill="#fff8e1" />
    </g>
  );
}

function Win({ face, x, y, z, w, h, pane, frame }: { face: "y" | "x"; x: number; y: number; z: number; w: number; h: number; pane: string; frame: string }) {
  const grow = 0.09;
  const fq: [number, number, number][] =
    face === "y"
      ? [[x - grow, y, z - grow], [x + w + grow, y, z - grow], [x + w + grow, y, z + h + grow], [x - grow, y, z + h + grow]]
      : [[x, y - grow, z - grow], [x, y + w + grow, z - grow], [x, y + w + grow, z + h + grow], [x, y - grow, z + h + grow]];
  const quad: [number, number, number][] =
    face === "y"
      ? [[x, y, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h]]
      : [[x, y, z], [x, y + w, z], [x, y + w, z + h], [x, y, z + h]];
  const cx = face === "y" ? px(x + w / 2, y) : px(x, y + w / 2);
  const cy = face === "y" ? py(x + w / 2, y, z + h / 2) : py(x, y + w / 2, z + h / 2);
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={w * S * 1.9} ry={h * S * 1.4} fill="rgba(255,213,79,0.22)" />
      <polygon points={P3(fq)} fill={frame} />
      <polygon points={P3(quad)} fill={pane} />
    </g>
  );
}

function Pool({ x, y, r, fill, opacity = 1 }: { x: number; y: number; r: number; fill: string; opacity?: number }) {
  return <ellipse cx={px(x, y)} cy={py(x, y, 0)} rx={ERX(r)} ry={ERY(r)} fill={fill} opacity={opacity} />;
}

function Pond({ x, y, r, deep, lite, rim }: { x: number; y: number; r: number; deep: string; lite: string; rim: string }) {
  return (
    <g>
      <Pool x={x} y={y} r={r + 0.18} fill={rim} />
      <Pool x={x} y={y} r={r} fill={deep} />
      <Pool x={x - r * 0.25} y={y - r * 0.3} r={r * 0.55} fill={lite} opacity={0.8} />
      <ellipse cx={px(x - r * 0.4, y - r * 0.45)} cy={py(x - r * 0.4, y - r * 0.45, 0)} rx={r * 11} ry={r * 4} fill="rgba(255,255,255,0.65)" transform={`rotate(-18 ${px(x - r * 0.4, y - r * 0.45)} ${py(x - r * 0.4, y - r * 0.45, 0)})`} />
    </g>
  );
}

function Lantern({ x, y, h = 1.7, post, glow, bulb }: { x: number; y: number; h?: number; post: string; glow: string; bulb: string }) {
  const ax = px(x, y);
  const yB = py(x, y, 0);
  const yT = py(x, y, h);
  return (
    <g>
      <Pool x={x} y={y} r={1.0} fill={glow} opacity={0.5} />
      <rect x={ax - 1.8} y={yT} width={3.6} height={yB - yT} fill={post} rx={1.5} />
      <circle cx={ax} cy={yT - 4} r={10} fill={glow} opacity={0.55} />
      <circle cx={ax} cy={yT - 4} r={3.8} fill={bulb} />
    </g>
  );
}

// a stack of giant tomes — leather covers with a cream page band
function Books({ x, y, covers }: { x: number; y: number; covers: [string, string][] }) {
  return (
    <g>
      {covers.map(([top, side], i) => {
        const bx = x + (i % 2) * 0.16;
        const by = y + (i % 3) * 0.1;
        const bz = i * 0.46;
        const w = 1.6 - i * 0.07;
        return (
          <g key={i}>
            <Box x={bx} y={by} z={bz} w={w} d={1.15} h={0.09} top={side} left={side} right={side} />
            <Box x={bx + 0.04} y={by + 0.04} z={bz + 0.09} w={w - 0.08} d={1.07} h={0.26} top="#f7edd2" left="#efe0bb" right="#e3d0a4" />
            <Box x={bx} y={by} z={bz + 0.35} w={w} d={1.15} h={0.11} top={top} left={side} right={side} />
          </g>
        );
      })}
    </g>
  );
}

function Fence({ posts, rail, post }: { posts: [number, number][]; rail: string; post: string }) {
  return (
    <g>
      <path
        d={posts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${px(x, y)} ${py(x, y, 0.62)}`).join(" ")}
        fill="none"
        stroke={rail}
        strokeWidth="2.5"
      />
      {posts.map(([x, y], i) => (
        <rect key={i} x={px(x, y) - 1.8} y={py(x, y, 0.8)} width={3.6} height={0.8 * S * 0.55} fill={post} rx={1.5} />
      ))}
    </g>
  );
}

// the island slab: grass top, cliff skirt, jagged under-rocks, soft drop shadow
function Slab({
  hp, t, top, rim, skirt, rocks, rockDark, shadowId,
}: {
  hp: [number, number][]; t: number; top: string; rim: string; skirt: string; rocks: string; rockDark: string; shadowId: string;
}) {
  const li = hp.reduce((m, p, i) => (px(p[0], p[1]) < px(hp[m][0], hp[m][1]) ? i : m), 0);
  const ri = hp.reduce((m, p, i) => (px(p[0], p[1]) > px(hp[m][0], hp[m][1]) ? i : m), 0);
  const front = li <= ri ? hp.slice(li, ri + 1) : [...hp.slice(li), ...hp.slice(0, ri + 1)];
  const topPts = hp.map(([x, y]) => `${px(x, y)},${py(x, y, 0)}`).join(" ");
  const skirtPts = [
    ...front.map(([x, y]) => `${px(x, y)},${py(x, y, 0)}`),
    ...[...front].reverse().map(([x, y]) => `${px(x, y)},${py(x, y, -t)}`),
  ].join(" ");
  const a = front[Math.floor(front.length * 0.25)];
  const b = front[Math.floor(front.length * 0.5)];
  const c = front[Math.floor(front.length * 0.75)];
  return (
    <g>
      <ellipse cx={px(b[0], b[1] - 2)} cy={py(b[0], b[1] - 2, -t - 3.6)} rx={ERX(6.2)} ry={ERY(3.2)} fill="rgba(0,0,0,0.4)" filter={`url(#${shadowId})`} />
      <polygon
        points={`${px(a[0] - 0.6, a[1])},${py(a[0] - 0.6, a[1], -t + 0.2)} ${px(b[0], b[1])},${py(b[0], b[1], -t + 0.1)} ${px((a[0] + b[0]) / 2 + 0.5, (a[1] + b[1]) / 2)},${py((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, -t - 1.7)}`}
        fill={rocks}
      />
      <polygon
        points={`${px(b[0], b[1])},${py(b[0], b[1], -t + 0.1)} ${px(c[0] + 0.6, c[1])},${py(c[0] + 0.6, c[1], -t + 0.2)} ${px((b[0] + c[0]) / 2 + 0.3, (b[1] + c[1]) / 2)},${py((b[0] + c[0]) / 2, (b[1] + c[1]) / 2, -t - 2.3)}`}
        fill={rockDark}
      />
      <polygon
        points={`${px(b[0] - 1.3, b[1])},${py(b[0] - 1.3, b[1], -t + 0.1)} ${px(b[0] + 1.7, b[1])},${py(b[0] + 1.7, b[1], -t + 0.1)} ${px(b[0] + 0.2, b[1])},${py(b[0] + 0.2, b[1], -t - 3.1)}`}
        fill={rocks}
      />
      <polygon points={skirtPts} fill={skirt} />
      <polygon points={topPts} fill={top} stroke={rim} strokeWidth="2.2" strokeLinejoin="round" />
    </g>
  );
}

function RockMote({ x, y, size = 1, top, skirt, shadowId, float = 0 }: { x: number; y: number; size?: number; top: string; skirt: string; shadowId: string; float?: number }) {
  const hp: [number, number][] = [
    [x, y + 0.9 * size], [x + 0.9 * size, y + 1.5 * size], [x + 1.9 * size, y + 1.2 * size],
    [x + 2.2 * size, y + 0.3 * size], [x + 1.3 * size, y - 0.3 * size], [x + 0.3 * size, y],
  ];
  return (
    <motion.g animate={{ y: [0, -8 - float * 4, 0] }} transition={{ duration: 7 + float * 2.4, repeat: Infinity, ease: "easeInOut", delay: float }}>
      <Slab hp={hp} t={0.7 * size} top={top} rim="transparent" skirt={skirt} rocks={skirt} rockDark={skirt} shadowId={shadowId} />
    </motion.g>
  );
}

// ── creatures ────────────────────────────────────────────────────────────────

function orbit(cx: number, cy: number, rx: number, ry: number, n = 13) {
  const ts = Array.from({ length: n }, (_, i) => i / (n - 1));
  return {
    xs: ts.map((t) => +(cx + rx * Math.cos(TAU * t)).toFixed(1)),
    ys: ts.map((t) => +(cy + ry * Math.sin(TAU * t)).toFixed(1)),
  };
}

// a small fantasy dragon circling the island
function Dragon({ cx, cy, rx, ry, body, belly, wing, dur = 19 }: { cx: number; cy: number; rx: number; ry: number; body: string; belly: string; wing: string; dur?: number }) {
  const o = orbit(cx, cy, rx, ry);
  return (
    <motion.g animate={{ x: o.xs, y: o.ys }} transition={{ duration: dur, repeat: Infinity, ease: "linear" }}>
      <motion.g animate={{ rotate: [-6, 7, -6] }} transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}>
        {/* wings flap behind the body */}
        <motion.path
          d="M -2,-2 C -10,-14 -22,-16 -30,-12 C -20,-8 -12,-4 -4,0 Z"
          fill={wing}
          animate={{ scaleY: [1, 0.45, 1], y: [0, -2.5, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "-2px", originY: "0px" } as React.CSSProperties}
        />
        <motion.path
          d="M 4,-2 C 10,-15 20,-19 30,-16 C 22,-9 14,-4 6,0 Z"
          fill={wing}
          animate={{ scaleY: [1, 0.45, 1], y: [0, -2.5, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.06 }}
          style={{ originX: "4px", originY: "0px" } as React.CSSProperties}
        />
        {/* tail, body, head */}
        <path d="M -2,2 C -12,4 -18,9 -26,17 C -16,13 -8,8 -1,5 Z" fill={body} />
        <ellipse cx={2} cy={2} rx={9.5} ry={5.2} fill={body} />
        <ellipse cx={3} cy={4.4} rx={6.5} ry={2.6} fill={belly} />
        <circle cx={11.5} cy={-1.5} r={4.4} fill={body} />
        <circle cx={13.4} cy={-2.6} r={1.1} fill="#1d1430" />
        <path d="M 9,-5 L 10.5,-9 L 12.5,-5.4 Z" fill={belly} />
      </motion.g>
    </motion.g>
  );
}

function Butterfly({ x, y, color, delay = 0 }: { x: number; y: number; color: string; delay?: number }) {
  return (
    <motion.g
      animate={{ x: [0, 16, 4, -10, 0], y: [0, -14, -26, -10, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <motion.g animate={{ scaleX: [1, 0.25, 1] }} transition={{ duration: 0.42, repeat: Infinity, ease: "easeInOut", delay }} style={{ originX: `${x}px`, originY: `${y}px` } as React.CSSProperties}>
        <ellipse cx={x - 3} cy={y} rx={3.2} ry={4.4} fill={color} />
        <ellipse cx={x + 3} cy={y} rx={3.2} ry={4.4} fill={color} />
      </motion.g>
      <rect x={x - 0.8} y={y - 4} width={1.6} height={8} rx={0.8} fill="#3a2a48" />
    </motion.g>
  );
}

function GlideBird({ y, color, dur, delay = 0, flip = false }: { y: number; color: string; dur: number; delay?: number; flip?: boolean }) {
  return (
    <motion.g animate={{ x: flip ? [560, -560] : [-560, 560], y: [0, -18, 6, 0] }} transition={{ duration: dur, repeat: Infinity, ease: "linear", delay }}>
      <motion.path
        d={`M -7,${y} Q 0,${y - 7} 7,${y} Q 0,${y - 3} -7,${y}`}
        fill={color}
        animate={{ scaleY: [1, 0.6, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ originY: `${y}px` } as React.CSSProperties}
      />
    </motion.g>
  );
}

function Fireflies({ spots, color }: { spots: [number, number][]; color: string }) {
  return (
    <g>
      {spots.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={px(x, y)}
          cy={py(x, y, 0.9)}
          r={2.2}
          fill={color}
          animate={{ opacity: [0.15, 1, 0.15], y: [0, -10 - i * 3, 0] }}
          transition={{ duration: 3.4 + i * 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
        />
      ))}
    </g>
  );
}

// ── creature overlay for raster island art ──────────────────────────────────
// When the island is a painted PNG (the target style), this transparent SVG
// floats above it and carries the living layer: dragon, butterflies, birds,
// drifting pages, sparkles. Coordinates are raw viewBox units (1000×620).

function Sparkle({ x, y, color, delay = 0 }: { x: number; y: number; color: string; delay?: number }) {
  return (
    <motion.path
      d={`M ${x} ${y - 7} Q ${x + 1.6} ${y - 1.6} ${x + 7} ${y} Q ${x + 1.6} ${y + 1.6} ${x} ${y + 7} Q ${x - 1.6} ${y + 1.6} ${x - 7} ${y} Q ${x - 1.6} ${y - 1.6} ${x} ${y - 7} Z`}
      fill={color}
      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.15, 0.5] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay }}
      style={{ originX: `${x}px`, originY: `${y}px` } as React.CSSProperties}
    />
  );
}

export function CreatureOverlay({ world }: { world: "writer" | "reader" }) {
  return (
    <svg viewBox="0 0 1000 620" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {world === "reader" ? (
        <>
          <Dragon cx={500} cy={148} rx={238} ry={50} body="#e05a60" belly="#ffcf9e" wing="#f2876f" />
          <g transform="translate(500,300)">
            <GlideBird y={-160} color="#fdf6e3" dur={30} />
            <GlideBird y={-225} color="#cdb1ff" dur={38} delay={6} flip />
          </g>
          <Butterfly x={295} y={390} color="#ffd54f" />
          <Butterfly x={700} y={355} color="#ff8fab" delay={1.3} />
          <Butterfly x={520} y={440} color="#7fd8ff" delay={2.6} />
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.g
              key={i}
              animate={{ y: [0, -95 - i * 16], x: [0, (i % 2 ? -1 : 1) * 26], rotate: [0, (i % 2 ? -1 : 1) * 22], opacity: [0, 0.9, 0] }}
              transition={{ duration: 10 + i * 1.8, delay: i * 2.1, repeat: Infinity, ease: "linear" }}
            >
              <path d={`M ${430 + i * 36},300 l 8,-3.4 l 8,3.4 l 0,2.2 l -8,-3 l -8,3 Z`} fill={["#cdb1ff", "#7fd8ff", "#ffd54f", "#ff8fab", "#8ee8c8"][i]} />
            </motion.g>
          ))}
          <Sparkle x={330} y={250} color="#cdb1ff" />
          <Sparkle x={660} y={210} color="#7fd8ff" delay={0.9} />
          <Sparkle x={560} y={330} color="#fdf6e3" delay={1.8} />
        </>
      ) : (
        <>
          <g transform="translate(500,300)">
            <GlideBird y={-175} color="#fdf6e3" dur={26} />
          </g>
          {[0, 1, 2, 3].map((i) => (
            <motion.rect
              key={i}
              x={560 + i * 22}
              y={290}
              width="8"
              height="11"
              rx="1"
              fill="rgba(253,246,227,0.85)"
              animate={{ y: [0, -120 - i * 20], x: [0, (i % 2 ? -1 : 1) * 20], rotate: [0, (i % 2 ? -1 : 1) * 36], opacity: [0, 0.85, 0] }}
              transition={{ duration: 9 + i * 2.2, delay: i * 2.4, repeat: Infinity, ease: "linear" }}
            />
          ))}
          <Sparkle x={350} y={260} color="#ffe082" />
          <Sparkle x={640} y={230} color="#ffd54f" delay={1.1} />
          <Sparkle x={470} y={340} color="#fff3c9" delay={2.0} />
        </>
      )}
    </svg>
  );
}

// ── shared island footprint ──────────────────────────────────────────────────

const ISLE: [number, number][] = [
  [1.5, 7.5], [2.5, 9.5], [4.5, 11], [7.5, 11.8], [10.5, 11], [13, 9.5], [14.8, 7.2],
  [15.5, 4.8], [14.6, 2.6], [12.5, 1.2], [9.5, 0.5], [6.5, 0.8], [3.8, 2], [2, 4.5],
];

// ── the writer's isle ────────────────────────────────────────────────────────

export function WriterIsle() {
  return (
    <svg viewBox="0 0 1000 620" className="h-auto w-full" aria-hidden>
      <defs>
        <filter id="wi-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <linearGradient id="wi-grass" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#aede5e" />
          <stop offset="1" stopColor="#74b83c" />
        </linearGradient>
        <linearGradient id="wi-cliff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a06b3f" />
          <stop offset="1" stopColor="#754a27" />
        </linearGradient>
      </defs>
      <g transform="translate(435,118)">
        <RockMote x={-7.5} y={2} top="#9ed455" skirt="#7c5230" shadowId="wi-soft" float={0.4} />
        <RockMote x={16.5} y={-3} size={1.3} top="#9ed455" skirt="#7c5230" shadowId="wi-soft" float={1.1} />

        <motion.g animate={{ y: [0, -9, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>
          <Slab
            hp={ISLE}
            t={1.8}
            top="url(#wi-grass)"
            rim="#d6f09b"
            skirt="url(#wi-cliff)"
            rocks="#6b4226"
            rockDark="#553118"
            shadowId="wi-soft"
          />

          {/* mown lighter patch + stone path */}
          <Pool x={8.6} y={4.6} r={3.2} fill="rgba(255,255,240,0.14)" />
          {[[7.1, 5.6], [7.9, 5.15], [8.7, 4.7], [9.5, 4.25], [10.3, 3.8]].map(([sx, sy], i) => (
            <Pool key={i} x={sx} y={sy} r={0.34} fill={i % 2 ? "#e8d4a4" : "#d9c08f"} />
          ))}

          {/* the ink pond — bright water with a white glint */}
          <Pond x={5.4} y={8.9} r={1.5} deep="#3fb9d8" lite="#7fdbeb" rim="#d6f09b" />

          {/* flowers + bushes scattered like the reference */}
          <Flower x={3.4} y={6.6} color="#ff8fab" />
          <Flower x={4.1} y={7.3} color="#ffd54f" />
          <Flower x={11.9} y={8.2} color="#ff8fab" />
          <Flower x={12.6} y={7.4} color="#ffd54f" />
          <Flower x={7.2} y={9.6} color="#ff6f61" />
          <Bush x={6.8} y={2.2} light="#69c16b" dark="#4a9e4f" />
          <Bush x={13.4} y={8.4} light="#69c16b" dark="#4a9e4f" />

          {/* back grove */}
          <Tree x={4.4} y={1.9} h={2.5} r={0.66} light="#5cb85c" dark="#3e8e41" trunk="#754a27" />
          <Tree x={5.9} y={1.2} h={2.0} r={0.55} light="#5cb85c" dark="#3e8e41" trunk="#754a27" />
          <Tree x={13.7} y={5.5} h={2.2} r={0.58} light="#5cb85c" dark="#3e8e41" trunk="#754a27" />

          {/* fence along the front-left meadow */}
          <Fence posts={[[2.6, 6.2], [3.3, 7.4], [4.2, 8.5]]} rail="#e8d4a4" post="#c9a86b" />

          {/* the writing hall — cream walls, barn-red roof */}
          <g>
            <Pool x={5} y={7} r={2} fill="rgba(0,0,0,0.18)" />
            <Box x={3.2} y={4.4} w={3.6} d={2.8} h={1.5} top="#f4e6c4" left="#f4e6c4" right="#dcc59a" />
            <Gable x={3.0} y={4.2} z={1.45} w={4.0} d={3.2} rh={1.3} front="#d9484f" gable="#b23440" ridge="#ef6f68" />
            <Box x={3.7} y={4.7} z={2.35} w={0.45} d={0.45} h={0.9} top="#dcc59a" left="#f4e6c4" right="#c9ab7e" />
            <Box x={3.62} y={4.62} z={3.25} w={0.61} d={0.61} h={0.12} top="#b23440" left="#9e2a37" right="#8a2430" />
            <Win face="y" x={3.7} y={7.2} z={0.45} w={0.55} h={0.8} pane="#ffd54f" frame="#fdf6e3" />
            <Win face="y" x={5.7} y={7.2} z={0.45} w={0.55} h={0.8} pane="#ffd54f" frame="#fdf6e3" />
            <polygon points={P3([[4.65, 7.2, 0], [5.35, 7.2, 0], [5.35, 7.2, 1.1], [4.65, 7.2, 1.1]])} fill="#8a5a32" />
            <polygon points={P3([[4.72, 7.2, 0], [5.28, 7.2, 0], [5.28, 7.2, 1.02], [4.72, 7.2, 1.02]])} fill="#6b4226" />
            {/* chimney smoke */}
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                cx={px(3.93, 4.93) + i * 2}
                cy={py(3.93, 4.93, 3.5)}
                r={3 + i * 1.4}
                fill="rgba(255,255,255,0.3)"
                animate={{ y: [0, -26 - i * 10], x: [0, 6 + i * 4], opacity: [0, 0.5, 0] }}
                transition={{ duration: 5 + i * 1.5, delay: i * 1.6, repeat: Infinity, ease: "linear" }}
              />
            ))}
          </g>

          {/* the guild tower + observatory */}
          <g>
            <Pool x={11.6} y={2.7} r={1.8} fill="rgba(0,0,0,0.18)" />
            <Box x={10.5} y={1.6} w={2.2} d={2.2} h={3.7} top="#efe0bd" left="#efe0bd" right="#d2b78a" />
            <Box x={10.3} y={1.4} z={2.45} w={2.6} d={2.6} h={0.28} top="#c9a86b" left="#b08e54" right="#9a7a45" />
            <Win face="y" x={11.1} y={3.8} z={0.95} w={0.55} h={0.85} pane="#ffd54f" frame="#fdf6e3" />
            <Win face="y" x={11.1} y={3.8} z={2.95} w={0.55} h={0.85} pane="#ffd54f" frame="#fdf6e3" />
            <Win face="x" x={12.7} y={2.25} z={1.9} w={0.55} h={0.85} pane="#ffd54f" frame="#fdf6e3" />
            <Cyl x={11.6} y={2.7} z={3.7} r={1.05} h={0.6} side="#5a4d8c" top="#6f60a8" />
            <Dome x={11.6} y={2.7} z={4.3} r={1.05} hd={1.0} fill="#9678cc" shine />
            <rect x={px(11.6, 2.7) - 2.4} y={py(11.6, 2.7, 4.3) - 1.0 * S * 1.0} width={4.8} height={1.0 * S * 0.85} fill="#ffd54f" rx={2.4} />
            <circle cx={px(11.6, 2.7)} cy={py(11.6, 2.7, 5.7)} r={3.2} fill="#ffe082" />
            <circle cx={px(11.6, 2.7)} cy={py(11.6, 2.7, 5.7)} r={9} fill="rgba(255,213,79,0.3)" />
          </g>

          {/* the tome stack + standing quill */}
          <g>
            <Pool x={9.4} y={7.1} r={1.35} fill="rgba(0,0,0,0.16)" />
            <Books x={8.6} y={6.4} covers={[["#e05a60", "#b23440"], ["#3fb9d8", "#2a8aa6"], ["#9678cc", "#6d4f9e"]]} />
            <g transform={`translate(${px(9.5, 7.05)},${py(9.5, 7.05, 1.5)}) rotate(-10)`}>
              <path d="M 0,0 L 0,-36" stroke="#e8b54a" strokeWidth="2" />
              <path d="M 0,-13 C -8,-23 -8,-34 -1,-45 C 7,-36 7,-23 0,-13 Z" fill="#ffd54f" />
              <path d="M 0,-13 C -4,-21 -4,-32 -1,-43" fill="none" stroke="#fff3c9" strokeWidth="1.4" />
            </g>
          </g>

          <Lantern x={12.7} y={6.4} post="#754a27" glow="rgba(255,213,79,0.4)" bulb="#ffe082" />
          <Lantern x={3.0} y={3.5} h={1.4} post="#754a27" glow="rgba(255,213,79,0.4)" bulb="#ffe082" />

          <Fireflies spots={[[12.2, 7.4], [11.4, 8.6], [4.6, 9.8], [6.4, 8.2], [13.4, 4.4]]} color="#ffe082" />
        </motion.g>

        {/* loose pages drifting up past the tower */}
        {[0, 1, 2, 3].map((i) => (
          <motion.rect
            key={i}
            x={px(11.6, 2.7) - 30 + i * 20}
            y={py(11.6, 2.7, 3)}
            width="8"
            height="11"
            rx="1"
            fill="rgba(253,246,227,0.85)"
            animate={{ y: [0, -120 - i * 20], x: [0, (i % 2 ? -1 : 1) * 20], rotate: [0, (i % 2 ? -1 : 1) * 36], opacity: [0, 0.85, 0] }}
            transition={{ duration: 9 + i * 2.2, delay: i * 2.4, repeat: Infinity, ease: "linear" }}
          />
        ))}

        {/* a passing songbird */}
        <GlideBird y={-130} color="#fdf6e3" dur={26} />
      </g>
    </svg>
  );
}

// ── the reader's isle — a world coming alive ─────────────────────────────────

export function ReaderIsle() {
  const domeX = px(10.2, 3.6);
  const domeY = py(10.2, 3.6, 2.3);
  return (
    <svg viewBox="0 0 1000 620" className="h-auto w-full" aria-hidden>
      <defs>
        <filter id="ri-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <linearGradient id="ri-grass" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#8de0c8" />
          <stop offset="1" stopColor="#4fb89c" />
        </linearGradient>
        <linearGradient id="ri-cliff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8265b8" />
          <stop offset="1" stopColor="#5d4488" />
        </linearGradient>
        <linearGradient id="ri-dome" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#b094e0" />
          <stop offset="1" stopColor="#7456ab" />
        </linearGradient>
      </defs>
      <g transform="translate(435,118)">
        {/* a striped airship crossing the night */}
        <motion.g animate={{ x: [-560, 560] }} transition={{ duration: 64, repeat: Infinity, ease: "linear" }}>
          <ellipse cx={0} cy={-150} rx={38} ry={13} fill="#e05a60" />
          <path d="M -38,-150 A 38,13 0 0 1 38,-150 L 38,-150 A 38,5 0 0 0 -38,-150 Z" fill="#fdf6e3" />
          <ellipse cx={0} cy={-150} rx={38} ry={13} fill="none" stroke="#b23440" strokeWidth="1" opacity="0.4" />
          <path d="M -9,-136 L 9,-136 L 6,-127 L -6,-127 Z" fill="#8a5a32" />
          <circle cx={8} cy={-131} r={1.8} fill="#ffe082" />
        </motion.g>

        <RockMote x={-7.5} y={2} top="#7fd3b8" skirt="#5d4488" shadowId="ri-soft" float={0.4} />
        <RockMote x={16.5} y={-3} size={1.3} top="#7fd3b8" skirt="#5d4488" shadowId="ri-soft" float={1.1} />

        <motion.g animate={{ y: [0, -9, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}>
          <Slab
            hp={ISLE}
            t={1.8}
            top="url(#ri-grass)"
            rim="#c8f5e2"
            skirt="url(#ri-cliff)"
            rocks="#4e3a75"
            rockDark="#3c2c5c"
            shadowId="ri-soft"
          />

          <Pool x={9.4} y={5.2} r={3} fill="rgba(255,255,255,0.12)" />
          {[[6.6, 6.3], [7.4, 5.8], [8.2, 5.3], [9, 4.85]].map(([sx, sy], i) => (
            <Pool key={i} x={sx} y={sy} r={0.32} fill={i % 2 ? "#e3d3f5" : "#cdbbe8"} />
          ))}

          {/* the moon pond */}
          <Pond x={4.9} y={9} r={1.55} deep="#4aa6e8" lite="#8ed1f5" rim="#c8f5e2" />

          {/* glow-flowers and mushrooms */}
          <Flower x={3.5} y={6.8} color="#ff8fab" />
          <Flower x={6.9} y={9.8} color="#7fd8ff" />
          <Flower x={12.3} y={8} color="#ffd54f" />
          <Flower x={12.9} y={7.1} color="#ff8fab" />
          <g>
            {([[3.2, 5.4], [11.8, 8.9], [13.6, 6.7]] as [number, number][]).map(([mx, my], i) => (
              <g key={i}>
                <circle cx={px(mx, my)} cy={py(mx, my, 0.32)} r={7} fill="rgba(255,143,171,0.25)" />
                <rect x={px(mx, my) - 1.6} y={py(mx, my, 0.3)} width={3.2} height={7} fill="#f7edd2" rx={1.4} />
                <path d={`M ${px(mx, my) - 6.4} ${py(mx, my, 0.3)} Q ${px(mx, my)} ${py(mx, my, 0.78)} ${px(mx, my) + 6.4} ${py(mx, my, 0.3)} Z`} fill={i % 2 ? "#ff8fab" : "#7fd8ff"} />
              </g>
            ))}
          </g>

          {/* groves: teal pines + one blossom tree */}
          <Tree x={3.6} y={1.7} h={2.4} r={0.62} light="#4fc3a1" dark="#359a7e" trunk="#5d4488" />
          <Tree x={2.6} y={3.4} h={1.9} r={0.52} light="#4fc3a1" dark="#359a7e" trunk="#5d4488" />
          <Tree x={13.9} y={5.9} h={2.1} r={0.56} light="#4fc3a1" dark="#359a7e" trunk="#5d4488" />
          <PuffTree x={6.5} y={2.0} h={1.7} r={0.95} light="#f2a3c4" dark="#d97fa8" trunk="#8a5a32" />

          {/* the guild hall — cream walls, teal roof */}
          <g>
            <Pool x={4.6} y={6.4} r={1.8} fill="rgba(0,0,0,0.18)" />
            <Box x={3.1} y={4.8} w={3.0} d={2.3} h={1.35} top="#f2e9ff" left="#f2e9ff" right="#d8cbf0" />
            <Gable x={2.9} y={4.6} z={1.3} w={3.4} d={2.7} rh={1.1} front="#2fa7b8" gable="#22808d" ridge="#56c4d4" />
            <Win face="y" x={3.6} y={7.1} z={0.4} w={0.5} h={0.75} pane="#ffd54f" frame="#fdf6e3" />
            <Win face="y" x={5.1} y={7.1} z={0.4} w={0.5} h={0.75} pane="#ffd54f" frame="#fdf6e3" />
          </g>

          {/* the great library */}
          <g>
            <Pool x={10.2} y={3.6} r={2.6} fill="rgba(0,0,0,0.2)" />
            <Cyl x={10.2} y={3.6} r={2.35} h={2.3} side="#e7dbf7" top="#cdbbe8" />
            <path d={`M ${domeX - ERX(2.35)} ${py(10.2, 3.6, 0)} L ${domeX - ERX(2.35)} ${domeY} M ${domeX + ERX(2.35)} ${py(10.2, 3.6, 0)} L ${domeX + ERX(2.35)} ${domeY}`} stroke="#b6a3d8" strokeWidth="2" />
            {[-0.66, -0.24, 0.24, 0.66].map((f) => {
              const wx = domeX + ERX(2.35) * f;
              const wy = py(10.2, 3.6, 0) + ERY(2.35) * 1.55 * Math.sqrt(Math.max(0, 1 - f * f)) - 34;
              return (
                <g key={f}>
                  <ellipse cx={wx} cy={wy + 9} rx={12} ry={15} fill="rgba(255,213,79,0.22)" />
                  <path d={`M ${wx - 5.5} ${wy + 18} L ${wx - 5.5} ${wy + 4} Q ${wx} ${wy - 5} ${wx + 5.5} ${wy + 4} L ${wx + 5.5} ${wy + 18} Z`} fill="#fdf6e3" />
                  <path d={`M ${wx - 4} ${wy + 18} L ${wx - 4} ${wy + 4.6} Q ${wx} ${wy - 2.6} ${wx + 4} ${wy + 4.6} L ${wx + 4} ${wy + 18} Z`} fill="#ffd54f" />
                </g>
              );
            })}
            <path
              d={`M ${domeX - 10} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92} L ${domeX - 10} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92 - 21} Q ${domeX} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92 - 32} ${domeX + 10} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92 - 21} L ${domeX + 10} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92} Z`}
              fill="#8a5a32"
            />
            <path
              d={`M ${domeX - 7.5} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92} L ${domeX - 7.5} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92 - 19} Q ${domeX} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92 - 28} ${domeX + 7.5} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92 - 19} L ${domeX + 7.5} ${py(10.2, 3.6, 0) + ERY(2.35) * 0.92} Z`}
              fill="#ffe082"
            />
            <Dome x={10.2} y={3.6} z={2.3} r={2.35} hd={1.6} fill="url(#ri-dome)" shine />
            <path d={`M ${domeX} ${py(10.2, 3.6, 3.9)} L ${domeX} ${py(10.2, 3.6, 4.6)}`} stroke="#e8b54a" strokeWidth="2" />
            <motion.path
              d={`M ${domeX} ${py(10.2, 3.6, 4.6)} L ${domeX + 14} ${py(10.2, 3.6, 4.6) + 3} L ${domeX} ${py(10.2, 3.6, 4.6) + 6} Z`}
              fill="#2fa7b8"
              animate={{ scaleX: [1, 0.82, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{ originX: `${domeX}px`, originY: `${py(10.2, 3.6, 4.6)}px` } as React.CSSProperties}
            />
            <circle cx={domeX} cy={py(10.2, 3.6, 4.72)} r={3} fill="#ffe082" />
          </g>

          {/* twin tome stacks */}
          <g>
            <Pool x={8.7} y={7.9} r={1.3} fill="rgba(0,0,0,0.16)" />
            <Books x={8} y={7.3} covers={[["#9678cc", "#6d4f9e"], ["#e05a60", "#b23440"], ["#2fa7b8", "#22808d"]]} />
            <Books x={10.6} y={8.2} covers={[["#2fa7b8", "#22808d"], ["#ffd54f", "#d4a93a"]]} />
          </g>

          {/* lantern string across the meadow */}
          <g>
            <Lantern x={6.6} y={8.7} h={1.5} post="#5d4488" glow="rgba(255,213,79,0.4)" bulb="#ffe082" />
            <Lantern x={12.9} y={5.2} h={1.9} post="#5d4488" glow="rgba(168,140,200,0.45)" bulb="#cdb1ff" />
            <path d={`M ${px(6.6, 8.7)} ${py(6.6, 8.7, 1.5) - 4} Q ${px(9.8, 7)} ${py(9.8, 7, 0.6)} ${px(12.9, 5.2)} ${py(12.9, 5.2, 1.9) - 4}`} fill="none" stroke="rgba(253,246,227,0.5)" strokeWidth="1.4" />
            {[0.25, 0.5, 0.75].map((t, i) => {
              const lx = px(6.6, 8.7) * (1 - t) * (1 - t) + 2 * (1 - t) * t * px(9.8, 7) + t * t * px(12.9, 5.2);
              const ly = (py(6.6, 8.7, 1.5) - 4) * (1 - t) * (1 - t) + 2 * (1 - t) * t * py(9.8, 7, 0.6) + t * t * (py(12.9, 5.2, 1.9) - 4);
              return (
                <motion.circle
                  key={t}
                  cx={lx}
                  cy={ly + 4}
                  r={3}
                  fill={["#ffe082", "#7fd8ff", "#ff8fab"][i]}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                />
              );
            })}
          </g>

          <Fireflies spots={[[5.6, 10.2], [12.2, 8.6], [3.4, 7.8], [13.8, 4.2]]} color="#cdb1ff" />

          {/* butterflies among the flowers */}
          <Butterfly x={px(3.8, 7)} y={py(3.8, 7, 1)} color="#ffd54f" />
          <Butterfly x={px(12.5, 7.6)} y={py(12.5, 7.6, 0.9)} color="#ff8fab" delay={1.3} />
          <Butterfly x={px(7, 10)} y={py(7, 10, 0.8)} color="#7fd8ff" delay={2.6} />
        </motion.g>

        {/* the resident dragon, circling the library */}
        <Dragon cx={domeX} cy={domeY - 95} rx={215} ry={42} body="#e05a60" belly="#ffcf9e" wing="#f2876f" />

        {/* books in flight around the dome */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.g
            key={i}
            animate={{ y: [0, -95 - i * 16], x: [0, (i % 2 ? -1 : 1) * 26], rotate: [0, (i % 2 ? -1 : 1) * 22], opacity: [0, 0.9, 0] }}
            transition={{ duration: 10 + i * 1.8, delay: i * 2.1, repeat: Infinity, ease: "linear" }}
          >
            <path
              d={`M ${domeX - 70 + i * 34},${py(10.2, 3.6, 2.6)} l 8,-3.4 l 8,3.4 l 0,2.2 l -8,-3 l -8,3 Z`}
              fill={["#cdb1ff", "#7fd8ff", "#ffd54f", "#ff8fab", "#8ee8c8"][i]}
            />
          </motion.g>
        ))}

        {/* passing night-birds */}
        <GlideBird y={-100} color="#fdf6e3" dur={30} />
        <GlideBird y={-180} color="#cdb1ff" dur={38} delay={6} flip />
      </g>
    </svg>
  );
}
