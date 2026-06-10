"use client";

// THE NIGHT ATLAS — browse concept 04
// The library, seen from above. Every story on Quiloria is charted as a star
// on an astronomer's plate: constellations instead of categories, brightness
// is sparks, and a flickering star is still being written. Click a light to
// read its card; wander by constellation; search dims the rest of the sky.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { byId, type MockStory } from "../_data";

const SKY_W = 1000;
const SKY_H = 562;
const PAPER = "#F3ECDD"; // warm starlight — SVG literal, matches text-paper

type ConstKey = "crown" | "lantern" | "meridian" | "hearth";

const CONSTELLATIONS: {
  key: ConstKey;
  name: string;
  tagline: string;
  rgb: string;
  storyIds: number[];
  lines: [number, number][];
  label: { x: number; y: number };
}[] = [
  {
    key: "crown",
    name: "The Ashen Crown",
    tagline: "Myth, magic, and crowns that remember.",
    rgb: "212,168,67",
    storyIds: [1, 4, 9],
    lines: [
      [9, 1],
      [1, 4],
    ],
    label: { x: 138, y: 56 },
  },
  {
    key: "lantern",
    name: "The Hollow Lantern",
    tagline: "Something is wrong, and you'll want to know what.",
    rgb: "123,162,138",
    storyIds: [3, 10, 12],
    lines: [
      [3, 10],
      [10, 12],
      [12, 3],
    ],
    label: { x: 642, y: 62 },
  },
  {
    key: "meridian",
    name: "The Neon Meridian",
    tagline: "Futures bright enough to burn.",
    rgb: "107,165,165",
    storyIds: [2, 5, 11],
    lines: [
      [5, 2],
      [2, 11],
    ],
    label: { x: 726, y: 508 },
  },
  {
    key: "hearth",
    name: "The Hearthlight",
    tagline: "Love, ache, and ordinary magic.",
    rgb: "184,105,122",
    storyIds: [6, 7, 8],
    lines: [
      [7, 6],
      [6, 8],
    ],
    label: { x: 142, y: 532 },
  },
];

// Hand-charted positions — each constellation owns a quadrant of the plate.
const POS: Record<number, { x: number; y: number }> = {
  1: { x: 185, y: 150 },
  4: { x: 300, y: 92 },
  9: { x: 252, y: 228 },
  3: { x: 705, y: 108 },
  10: { x: 795, y: 188 },
  12: { x: 688, y: 252 },
  2: { x: 775, y: 402 },
  5: { x: 872, y: 330 },
  11: { x: 662, y: 458 },
  6: { x: 198, y: 418 },
  7: { x: 318, y: 368 },
  8: { x: 262, y: 482 },
};

const ALL_RATINGS = ["All Ages", "Teen+", "Mature"] as const;

const constOf = (id: number) => CONSTELLATIONS.find((c) => c.storyIds.includes(id))!;
const starRadius = (sparks: number) => 2.5 + Math.sqrt(sparks) / 4.2;

// Deterministic PRN for the background dust so SSR and client agree.
function prn(n: number) {
  let t = n + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export default function NightAtlas() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focus, setFocus] = useState<ConstKey | null>(null);
  const [query, setQuery] = useState("");
  const [ratings, setRatings] = useState<Set<string>>(new Set(ALL_RATINGS));
  const [meteor, setMeteor] = useState<{ id: number; x: number; y: number } | null>(null);

  const dust = useMemo(
    () =>
      Array.from({ length: 130 }, (_, i) => ({
        x: prn(i * 4) * SKY_W,
        y: prn(i * 4 + 1) * SKY_H,
        r: 0.35 + prn(i * 4 + 2) * 0.85,
        o: 0.1 + prn(i * 4 + 3) * 0.3,
      })),
    []
  );

  // A meteor crosses the plate every so often.
  useEffect(() => {
    const t = setInterval(() => {
      setMeteor({
        id: Date.now(),
        x: 120 + Math.random() * 580,
        y: 50 + Math.random() * 170,
      });
    }, 9000);
    return () => clearInterval(t);
  }, []);

  // Esc clears search → selection → focus, in that order.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (query) setQuery("");
      else if (selectedId) setSelectedId(null);
      else setFocus(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query, selectedId]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return null;
    const ids = new Set<number>();
    for (const c of CONSTELLATIONS)
      for (const id of c.storyIds) {
        const s = byId(id);
        if (
          s.title.toLowerCase().includes(q) ||
          s.author.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q) ||
          s.format.toLowerCase().includes(q)
        )
          ids.add(id);
      }
    return ids;
  }, [q]);

  const isDim = (s: MockStory) =>
    (matches !== null && !matches.has(s.id)) ||
    (focus !== null && constOf(s.id).key !== focus) ||
    !ratings.has(s.rating);

  const labelShown = (id: number) =>
    hoveredId === id ||
    selectedId === id ||
    (matches !== null && matches.has(id)) ||
    (focus !== null && constOf(id).key === focus);

  const focusTransform = useMemo(() => {
    if (!focus) return { x: 0, y: 0, scale: 1 };
    const c = CONSTELLATIONS.find((k) => k.key === focus)!;
    const cx = c.storyIds.reduce((a, id) => a + POS[id].x, 0) / c.storyIds.length;
    const cy = c.storyIds.reduce((a, id) => a + POS[id].y, 0) / c.storyIds.length;
    const s = 1.7;
    return { x: SKY_W / 2 - s * cx, y: SKY_H / 2 - s * cy, scale: s };
  }, [focus]);

  const selected = selectedId ? byId(selectedId) : null;
  const selectedConst = selectedId ? constOf(selectedId) : null;

  const toggleRating = (r: string) =>
    setRatings((prev) => {
      const next = new Set(prev);
      if (next.has(r)) {
        if (next.size > 1) next.delete(r);
      } else next.add(r);
      return next;
    });

  const submitSearch = () => {
    if (matches && matches.size > 0) setSelectedId([...matches][0]);
  };

  return (
    <main className="relative h-screen select-none overflow-hidden bg-void text-text">
      {/* Nebulae — one faint wash of colour per constellation quadrant */}
      {CONSTELLATIONS.map((c) => {
        const cx = c.storyIds.reduce((a, id) => a + POS[id].x, 0) / c.storyIds.length;
        const cy = c.storyIds.reduce((a, id) => a + POS[id].y, 0) / c.storyIds.length;
        return (
          <div
            key={c.key}
            className="pointer-events-none absolute h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-700"
            style={{
              left: `${(cx / SKY_W) * 100}%`,
              top: `${(cy / SKY_H) * 100}%`,
              background: `radial-gradient(circle, rgba(${c.rgb},${focus === c.key ? 0.14 : 0.07}), transparent 70%)`,
            }}
          />
        );
      })}

      {/* The plate */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${SKY_W} ${SKY_H}`}
        preserveAspectRatio="xMidYMid slice"
        onClick={() => setSelectedId(null)}
      >
        <defs>
          {CONSTELLATIONS.map((c) => (
            <radialGradient key={c.key} id={`glow-${c.key}`}>
              <stop offset="0%" stopColor={`rgba(${c.rgb},0.85)`} />
              <stop offset="35%" stopColor={`rgba(${c.rgb},0.25)`} />
              <stop offset="100%" stopColor={`rgba(${c.rgb},0)`} />
            </radialGradient>
          ))}
          <linearGradient id="meteor-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="-60" y2="-20">
            <stop offset="0%" stopColor={PAPER} stopOpacity="0.9" />
            <stop offset="100%" stopColor={PAPER} stopOpacity="0" />
          </linearGradient>
        </defs>

        <g
          style={{
            transform: `translate(${focusTransform.x}px, ${focusTransform.y}px) scale(${focusTransform.scale})`,
            transformOrigin: "0 0",
            transition: "transform 0.9s cubic-bezier(0.25, 0.8, 0.3, 1)",
          }}
        >
          {/* Background dust */}
          {dust.map((d, i) =>
            i % 9 === 0 ? (
              <motion.circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={d.r}
                fill={PAPER}
                animate={{ opacity: [d.o, Math.min(d.o * 2.4, 0.7), d.o] }}
                transition={{ repeat: Infinity, duration: 3 + (i % 5), ease: "easeInOut" }}
              />
            ) : (
              <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={PAPER} opacity={d.o} />
            )
          )}

          {/* Graticule — the astronomer's curved guide lines */}
          <g stroke={`rgba(243,236,221,0.05)`} fill="none" strokeDasharray="2 7">
            <path d="M -40 156 Q 500 96 1040 156" />
            <path d="M -40 386 Q 500 444 1040 386" />
            <path d="M 498 -20 Q 462 281 498 582" />
          </g>

          {/* Constellations */}
          {CONSTELLATIONS.map((c) => {
            const active = focus === c.key;
            const constDimmed = focus !== null && !active;
            return (
              <g key={c.key} opacity={constDimmed ? 0.18 : 1} style={{ transition: "opacity 0.5s" }}>
                {/* connect-lines */}
                {c.lines.map(([a, b]) => (
                  <motion.line
                    key={`${a}-${b}`}
                    x1={POS[a].x}
                    y1={POS[a].y}
                    x2={POS[b].x}
                    y2={POS[b].y}
                    stroke={`rgba(${c.rgb},0.5)`}
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    initial={false}
                    animate={{ opacity: active ? 0.9 : 0.32, pathLength: 1 }}
                    transition={{ duration: 0.6 }}
                  />
                ))}
                {/* constellation name, set into the sky */}
                <text
                  x={c.label.x}
                  y={c.label.y}
                  className="font-display"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.3em",
                    fill: `rgba(${c.rgb},${active ? 0.85 : 0.42})`,
                    textTransform: "uppercase",
                    transition: "fill 0.5s",
                  }}
                >
                  {c.name.toUpperCase()}
                </text>

                {/* stars */}
                {c.storyIds.map((id, idx) => {
                  const s = byId(id);
                  const p = POS[id];
                  const r = starRadius(s.sparks);
                  const dim = isDim(s);
                  return (
                    <g
                      key={id}
                      transform={`translate(${p.x} ${p.y})`}
                      className="cursor-pointer"
                      opacity={dim ? 0.1 : 1}
                      style={{ transition: "opacity 0.4s" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(id);
                      }}
                      onMouseEnter={() => setHoveredId(id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* glow — flickers if the story is still being written */}
                      {s.status === "Ongoing" ? (
                        <motion.circle
                          r={r * 4}
                          fill={`url(#glow-${c.key})`}
                          animate={{ opacity: [0.45, 1, 0.45] }}
                          transition={{ repeat: Infinity, duration: 2.6 + idx * 0.5, ease: "easeInOut" }}
                        />
                      ) : (
                        <circle r={r * 4} fill={`url(#glow-${c.key})`} opacity={0.75} />
                      )}
                      {/* flare for the most-loved stars */}
                      {s.sparks > 250 && (
                        <path
                          d={`M ${-r * 2.8} 0 H ${r * 2.8} M 0 ${-r * 2.8} V ${r * 2.8}`}
                          stroke={PAPER}
                          strokeWidth={0.6}
                          opacity={0.5}
                          strokeLinecap="round"
                        />
                      )}
                      {/* core */}
                      <circle r={r} fill={PAPER} />
                      <circle r={r * 0.45} fill="#FFFDF7" />
                      {/* selection ring */}
                      {selectedId === id && (
                        <motion.circle
                          r={r + 8}
                          fill="none"
                          stroke={`rgba(${c.rgb},0.9)`}
                          strokeWidth={1}
                          strokeDasharray="2 6"
                          strokeLinecap="round"
                          animate={{ strokeDashoffset: [0, -64] }}
                          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                        />
                      )}
                      {/* hit area */}
                      <circle r={Math.max(r + 12, 16)} fill="transparent" />
                      {/* label */}
                      <AnimatePresence>
                        {labelShown(id) && !dim && (
                          <motion.g
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 3 }}
                            transition={{ duration: 0.18 }}
                          >
                            <text
                              x={r + 9}
                              y={-4}
                              className="font-display"
                              style={{ fontSize: 13 / focusTransform.scale, fontStyle: "italic", fill: PAPER }}
                            >
                              {s.title}
                            </text>
                            <text
                              x={r + 9}
                              y={focus ? 5 : 9}
                              style={{
                                fontSize: 8 / focusTransform.scale,
                                letterSpacing: "0.1em",
                                fill: "rgba(243,236,221,0.55)",
                              }}
                            >
                              {s.author.toUpperCase()} · {s.format.toUpperCase()} · ✦ {s.sparks}
                            </text>
                          </motion.g>
                        )}
                      </AnimatePresence>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Meteor */}
          <AnimatePresence>
            {meteor && (
              <motion.g
                key={meteor.id}
                initial={{ x: meteor.x, y: meteor.y, opacity: 0 }}
                animate={{ x: meteor.x + 240, y: meteor.y + 80, opacity: [0, 0.9, 0] }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                onAnimationComplete={() => setMeteor(null)}
              >
                <line x1={0} y1={0} x2={-60} y2={-20} stroke="url(#meteor-grad)" strokeWidth={1.4} strokeLinecap="round" />
              </motion.g>
            )}
          </AnimatePresence>
        </g>
      </svg>

      {/* Plate frame */}
      <div className="pointer-events-none absolute inset-3 rounded-sm border border-paper/[0.07]" />
      {[
        "left-3 top-3 border-l border-t",
        "right-3 top-3 border-r border-t",
        "left-3 bottom-3 border-l border-b",
        "right-3 bottom-3 border-r border-b",
      ].map((pos) => (
        <div key={pos} className={`pointer-events-none absolute h-5 w-5 border-amber/40 ${pos}`} />
      ))}

      {/* Cartouche */}
      <header className="absolute left-7 top-[76px] z-20 max-w-[320px]">
        <Link
          href="/mockup-browse-concepts"
          className="text-[11px] text-text-ghost transition-colors hover:text-amber"
        >
          ← All concepts
        </Link>
        <h1 className="mt-2 font-display text-[30px] leading-none text-paper">The Night Atlas</h1>
        <p className="mt-2 text-[11.5px] leading-relaxed text-text-secondary">
          Plate IV — every story, charted as a star.{" "}
          <span className="text-amber">Brightness is sparks.</span> A flickering star is still
          being written.
        </p>
      </header>

      {/* Spyglass */}
      <div className="absolute right-7 top-[76px] z-20">
        <div className="group flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-2 backdrop-blur-md transition-colors focus-within:border-amber/30">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-text-ghost">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            placeholder="Search the sky…"
            className="w-32 bg-transparent text-[12px] text-text outline-none transition-all placeholder:text-text-ghost focus:w-48"
          />
        </div>
        {matches !== null && (
          <p className="mt-1.5 pr-1 text-right text-[10px] text-text-ghost">
            {matches.size === 0 ? "Nothing in this sky — yet." : `${matches.size} light${matches.size === 1 ? "" : "s"} found`}
          </p>
        )}
      </div>

      {/* Compass rose */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        className="absolute bottom-20 right-7 z-10 hidden opacity-25 md:block"
        fill="none"
        stroke={PAPER}
      >
        <circle cx="32" cy="32" r="22" strokeWidth="0.6" />
        <path d="M32 6 L35 29 L58 32 L35 35 L32 58 L29 35 L6 32 L29 29 Z" strokeWidth="0.7" />
        <text x="32" y="4" textAnchor="middle" style={{ fontSize: 7, fill: PAPER, stroke: "none" }}>
          N
        </text>
      </svg>

      {/* Caption */}
      <p className="absolute bottom-7 left-7 z-10 hidden max-w-[230px] text-[10.5px] italic leading-relaxed text-text-ghost lg:block">
        Click a light. Wander by constellation. The sky rearranges nightly.
      </p>

      {/* Chart legend */}
      <nav className="absolute bottom-5 left-1/2 z-20 flex max-w-[94vw] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-full border border-border bg-surface/70 px-2.5 py-2 backdrop-blur-md">
        <button
          onClick={() => setFocus(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] transition-all ${
            focus === null ? "bg-amber/[0.08] text-amber" : "text-text-ghost hover:text-text-secondary"
          }`}
        >
          Whole sky
        </button>
        <span className="h-4 w-px shrink-0 bg-border" />
        {CONSTELLATIONS.map((c) => (
          <button
            key={c.key}
            onClick={() => setFocus(focus === c.key ? null : c.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-all ${
              focus === c.key ? "text-paper" : "text-text-ghost hover:text-text-secondary"
            }`}
            style={focus === c.key ? { background: `rgba(${c.rgb},0.12)` } : undefined}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: `rgb(${c.rgb})` }} />
            {c.name}
          </button>
        ))}
        <span className="h-4 w-px shrink-0 bg-border" />
        {ALL_RATINGS.map((r) => (
          <button
            key={r}
            onClick={() => toggleRating(r)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] transition-all ${
              ratings.has(r)
                ? "border-amber/30 bg-amber/[0.04] text-amber"
                : "border-border text-text-ghost hover:text-text-secondary"
            }`}
          >
            {r}
          </button>
        ))}
      </nav>

      {/* Focused-constellation tagline */}
      <AnimatePresence>
        {focus && (
          <motion.p
            key={focus}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="pointer-events-none absolute bottom-[72px] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-[12px] italic text-text-secondary"
          >
            {CONSTELLATIONS.find((c) => c.key === focus)!.tagline}
          </motion.p>
        )}
      </AnimatePresence>

      {/* The astronomer's card */}
      <AnimatePresence>
        {selected && selectedConst && (
          <motion.aside
            key={selected.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-y-auto rounded-2xl border border-border bg-surface/95 backdrop-blur-xl md:inset-x-auto md:bottom-6 md:right-6 md:top-[76px] md:max-h-none md:w-[372px]"
          >
            <div className="relative h-40 overflow-hidden rounded-t-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.cover} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
              <button
                onClick={() => setSelectedId(null)}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-void/60 text-text-secondary backdrop-blur transition-colors hover:text-paper"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
                </svg>
              </button>
              <span
                className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px]"
                style={{ background: `rgba(${selectedConst.rgb},0.16)`, color: `rgb(${selectedConst.rgb})` }}
              >
                <span className="h-1 w-1 rounded-full" style={{ background: `rgb(${selectedConst.rgb})` }} />
                {selectedConst.name}
              </span>
            </div>

            <div className="px-5 pb-5 pt-4">
              <h2 className="font-display text-[24px] leading-tight text-paper">{selected.title}</h2>
              <p className="mt-0.5 text-[12px] text-text-secondary">
                by {selected.author}
                {selected.status === "Ongoing" && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-amber">
                    <motion.span
                      className="h-1 w-1 rounded-full bg-amber"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                    still being written
                  </span>
                )}
              </p>

              <p className="mt-3 text-[13px] leading-relaxed text-text">{selected.hook}</p>

              <blockquote
                className="font-reading mt-4 border-l-2 pl-3 text-[13px] italic leading-relaxed text-text-secondary"
                style={{ borderColor: `rgba(${selectedConst.rgb},0.5)` }}
              >
                {selected.opening}
              </blockquote>

              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-text-ghost">
                {selected.format} · {selected.chapters} ch · {selected.readTime} · {selected.rating} ·{" "}
                <span className="text-amber">✦ {selected.sparks}</span>
              </p>

              <div className="mt-5 flex gap-2">
                <button className="flex-1 rounded-full bg-amber py-2.5 text-[13px] font-medium text-void transition-all hover:brightness-110">
                  Begin reading
                </button>
                <button
                  onClick={() => setFocus(selectedConst.key)}
                  className="rounded-full border border-border px-4 py-2.5 text-[12px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
                >
                  Its neighbors
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}
