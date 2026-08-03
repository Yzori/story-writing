// ─────────────────────────────────────────────────────────────────────────────
// The circling stroke — one sweep of a pen around the writer's last line.
// A stroked SVG path can't taper, and taper is what separates ink from
// geometry: the pen lands thin, presses through the curve, and lifts to a
// hair at the tail. So the stroke is built as a *filled* ribbon: sample a
// wobbly, slightly overlapping ellipse, offset each sample along its normal
// by half the pen width at that instant, and close outer edge against inner.
//
// Deterministic on purpose (fixed harmonics, no randomness): the same stroke
// renders on server and client, and the tests can pin its bounds.
// ─────────────────────────────────────────────────────────────────────────────

export interface InkStrokeOptions {
  /** center of the sweep, in viewBox units */
  cx?: number;
  cy?: number;
  /** ellipse radii the pen roughly follows */
  rx?: number;
  ry?: number;
  /** tilt of the whole gesture, radians */
  tilt?: number;
  /** how far the pen travels; >1 overlaps its own landing like a real circle */
  turns?: number;
  /** samples along the sweep — more is smoother, 120 is plenty at this size */
  samples?: number;
  /** pen width at full press / at landing and lift */
  wMax?: number;
  wMin?: number;
}

export interface InkStroke {
  /** the closed, tapered ribbon — render with fill, never stroke */
  fill: string;
  /** the centerline — stroke this inside a mask to reveal the ribbon pen-wise */
  guide: string;
  /** where the pen lifted, for placing spatter near the tail */
  tail: { x: number; y: number };
}

const TAU = Math.PI * 2;

export function inkStroke({
  cx = 100,
  cy = 100,
  rx = 86,
  ry = 68,
  tilt = -0.14,
  turns = 1.06,
  samples = 120,
  wMax = 3.6,
  wMin = 0.35,
}: InkStrokeOptions = {}): InkStroke {
  const pts: [number, number][] = [];
  const widths: number[] = [];
  const start = -1.95; // the pen lands upper-left, sweeps clockwise

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const theta = start + t * turns * TAU;
    // hand wobble: two slow harmonics, plus an outward drift so the tail
    // passes outside its own landing instead of colliding with it
    const wobble = 2.6 * Math.sin(TAU * 2.15 * t + 1.7) + 1.6 * Math.sin(TAU * 3.9 * t + 0.55);
    const drift = 5.5 * t * t * t;
    const ex = (rx + wobble + drift) * Math.cos(theta);
    const ey = (ry + wobble * 0.8 + drift) * Math.sin(theta);
    pts.push([
      cx + ex * Math.cos(tilt) - ey * Math.sin(tilt),
      cy + ex * Math.sin(tilt) + ey * Math.cos(tilt),
    ]);
    // pressure: thin landing, full press through the middle, hairline lift —
    // with a slight tremor so the width never reads as machined
    const press = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.9)), 0.75);
    const tremor = 1 + 0.16 * Math.sin(TAU * 5.3 * t + 2.2);
    widths.push(wMin + (wMax - wMin) * press * tremor);
  }

  const outer: [number, number][] = [];
  const inner: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[Math.min(samples, i + 1)];
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = widths[i] / 2;
    outer.push([pts[i][0] + nx * half, pts[i][1] + ny * half]);
    inner.push([pts[i][0] - nx * half, pts[i][1] - ny * half]);
  }

  const pt = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  const fill = `M${outer.map(pt).join("L")}L${[...inner].reverse().map(pt).join("L")}Z`;
  const guide = `M${pts.map(pt).join("L")}`;
  const tailPoint = pts[pts.length - 1];

  return { fill, guide, tail: { x: tailPoint[0], y: tailPoint[1] } };
}
