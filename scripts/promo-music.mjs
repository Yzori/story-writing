// Synthesizes the promo soundtrack: ~58s of subtle cozy-fantasy underscore.
// Warm pad swells + harp plucks in D major pentatonic + sparse music-box
// highs, soft stereo echo, gentle fade in/out. Outputs 44.1kHz 16-bit WAV.
//
//   node scripts/promo-music.mjs /path/to/out.wav

import { writeFileSync } from "node:fs";

const SR = 44100;
const DUR = 58;
const N = SR * DUR;
const L = new Float64Array(N);
const R = new Float64Array(N);

// deterministic rng so re-renders are identical
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260610);

const NOTE = (() => {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const table = {};
  for (let oct = 1; oct <= 7; oct++) {
    names.forEach((n, i) => {
      const midi = 12 * (oct + 1) + i;
      table[`${n}${oct}`] = 440 * Math.pow(2, (midi - 69) / 12);
    });
  }
  return table;
})();

// ── pad: slow detuned swells, one per chord ─────────────────────────────────
const CHORDS = [
  { t: 0,     notes: ["D2", "D3", "F#3", "A3"] },
  { t: 7.25,  notes: ["G2", "G3", "B3", "D4"] },
  { t: 14.5,  notes: ["B2", "B3", "D4", "F#4"] },
  { t: 21.75, notes: ["A2", "A3", "C#4", "E4"] },
  { t: 29,    notes: ["D2", "D3", "F#3", "A3"] },
  { t: 36.25, notes: ["G2", "G3", "B3", "D4"] },
  { t: 43.5,  notes: ["B2", "B3", "D4", "F#4"] },
  { t: 50.75, notes: ["A2", "A3", "C#4", "E4"] },
];
const CHORD_LEN = 7.25;

function padEnv(t, len) {
  const atk = 2.6, rel = 2.6;
  if (t < 0 || t > len + rel) return 0;
  if (t < atk) return (1 - Math.cos((Math.PI * t) / atk)) / 2;
  if (t > len) return Math.max(0, (1 - (t - len) / rel)) ** 2;
  return 1;
}

for (const ch of CHORDS) {
  const start = Math.floor(ch.t * SR);
  const span = Math.floor((CHORD_LEN + 3) * SR);
  for (const [ni, name] of ch.notes.entries()) {
    const f = NOTE[name];
    const amp = (ni === 0 ? 0.062 : 0.04) / ch.notes.length * 4;
    const det = 1 + (rand() - 0.5) * 0.003;
    const phase1 = rand() * Math.PI * 2, phase2 = rand() * Math.PI * 2;
    for (let i = 0; i < span && start + i < N; i++) {
      const t = i / SR;
      const e = padEnv(t, CHORD_LEN);
      if (e === 0) continue;
      const vib = 1 + 0.0012 * Math.sin(2 * Math.PI * 0.18 * t + phase1);
      const s =
        Math.sin(2 * Math.PI * f * vib * t + phase1) * 0.8 +
        Math.sin(2 * Math.PI * f * det * t + phase2) * 0.55 +
        Math.sin(2 * Math.PI * f * 2 * t + phase1) * 0.12;
      const v = s * e * amp;
      L[start + i] += v * 0.95;
      R[start + i] += v * 1.05;
    }
  }
}

// ── harp plucks: lilting arpeggios over each chord ──────────────────────────
function pluck(t0, name, amp, pan) {
  const f = NOTE[name];
  const start = Math.floor(t0 * SR);
  const span = Math.floor(2.6 * SR);
  const lg = (1 - pan) / 2, rg = (1 + pan) / 2;
  for (let i = 0; i < span && start + i < N; i++) {
    const t = i / SR;
    const a = Math.min(1, t / 0.004); // soft pick transient
    const s =
      Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.6) +
      Math.sin(2 * Math.PI * f * 2 * t) * 0.45 * Math.exp(-t * 4.4) +
      Math.sin(2 * Math.PI * f * 3 * t) * 0.16 * Math.exp(-t * 6.5) +
      Math.sin(2 * Math.PI * f * 4.01 * t) * 0.06 * Math.exp(-t * 9);
    const v = s * a * amp;
    L[start + i] += v * lg;
    R[start + i] += v * rg;
  }
}

// arpeggio tones per chord (D major pentatonic colors, mid register)
const ARPS = {
  0: ["D3", "A3", "D4", "F#4", "A4", "B4", "A4", "F#4"],
  1: ["G3", "D4", "G4", "B4", "D5", "B4", "A4", "G4"],
  2: ["B3", "F#4", "B4", "D5", "F#4", "E4", "D4", "B3"],
  3: ["A3", "E4", "A4", "C#5", "E5", "C#5", "B4", "A4"],
};
const EIGHTH = CHORD_LEN / 16; // ~0.45s — a gentle 6/8 lilt
for (const [ci, ch] of CHORDS.entries()) {
  const tones = ARPS[ci % 4];
  for (let step = 0; step < 16; step++) {
    // sparse: skip some off-beats so it breathes
    if (step % 2 === 1 && rand() < 0.6) continue;
    if (rand() < 0.12) continue;
    const t0 = ch.t + step * EIGHTH + (rand() - 0.5) * 0.02;
    const tone = tones[step % tones.length];
    const amp = 0.115 * (step % 4 === 0 ? 1 : 0.7) * (0.85 + rand() * 0.3);
    pluck(t0, tone, amp, (rand() - 0.5) * 0.9);
  }
}

// ── music box: sparse high sparkles, very quiet ─────────────────────────────
const SPARKLE_TONES = ["D5", "E5", "F#5", "A5", "B5", "D6"];
let st = 3.5;
while (st < DUR - 6) {
  const tone = SPARKLE_TONES[Math.floor(rand() * SPARKLE_TONES.length)];
  const f = NOTE[tone];
  const start = Math.floor(st * SR);
  const span = Math.floor(3 * SR);
  const pan = (rand() - 0.5) * 0.8;
  const lg = (1 - pan) / 2, rg = (1 + pan) / 2;
  for (let i = 0; i < span && start + i < N; i++) {
    const t = i / SR;
    const s = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 1.7) + Math.sin(2 * Math.PI * f * 3 * t) * 0.1 * Math.exp(-t * 4);
    const v = s * Math.min(1, t / 0.003) * 0.055;
    L[start + i] += v * lg;
    R[start + i] += v * rg;
  }
  st += 2.8 + rand() * 3.4;
}

// ── stereo echo: 340ms cross-feedback, adds the "stone hall" air ────────────
const ds = Math.floor(0.34 * SR);
const FB = 0.32, MIX = 0.28;
for (let i = ds; i < N; i++) {
  L[i] += R[i - ds] * FB * MIX;
  R[i] += L[i - ds] * FB * MIX;
}

// ── master: fades + normalize ───────────────────────────────────────────────
// quick fade-in and a 0.9 peak: "subtle" means it sits under narration-less
// visuals, not that it's barely audible
const FADE_IN = 1.2 * SR, FADE_OUT = 5 * SR;
for (let i = 0; i < N; i++) {
  let g = 1;
  if (i < FADE_IN) g = i / FADE_IN;
  if (i > N - FADE_OUT) g *= ((N - i) / FADE_OUT) ** 1.3;
  L[i] *= g;
  R[i] *= g;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.9 / peak;

// ── write 16-bit stereo WAV ─────────────────────────────────────────────────
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write("WAVE", 8);
hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
hdr.write("data", 36); hdr.writeUInt32LE(data.length, 40);

const out = process.argv[2] ?? "promo-music.wav";
writeFileSync(out, Buffer.concat([hdr, data]));
console.log(`wrote ${out} — ${DUR}s, peak normalized to 0.9`);
