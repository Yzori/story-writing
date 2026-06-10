"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Sparkles, Plus, Telescope, Users, MessageCircle } from "lucide-react";
import {
  useDashboardData,
  storyHref,
  type MockCampaign,
  type MockNotification,
} from "@/components/dashboard-mockup/useDashboardData";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ The Constellation — Your Sky
// A pannable night-sky dashboard mockup. Stories are constellations, campaigns
// are nebulae, notifications are shooting stars. Throwaway design concept.
// ─────────────────────────────────────────────────────────────────────────────

// Deterministic string hash → 32-bit unsigned int. No Math.random anywhere.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A small seeded PRNG (mulberry32) seeded from a string, so a single id yields
// a stable stream of values for star placement.
function seededStream(seedStr: string) {
  let a = hash(seedStr);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function relativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

const NOTIF_GLYPH: Record<string, string> = {
  comment: "✦",
  spark: "✶",
  follow: "✷",
  chapter: "✧",
  update: "✦",
};

// ── Constellation geometry ───────────────────────────────────────────────────
interface StarNode {
  x: number; // percent of constellation box (0..100)
  y: number;
  size: number; // px
  twinkle: number; // 0..1 phase
}

interface Placed {
  story: ApiStory;
  cx: number; // canvas %, 0..100
  cy: number;
  scale: number; // overall constellation scale 0.6..1
  nodes: StarNode[];
  links: [number, number][];
  isActive: boolean;
}

function buildNodes(seedStr: string, count: number): { nodes: StarNode[]; links: [number, number][] } {
  const rnd = seededStream(seedStr + "::nodes");
  const nodes: StarNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: 12 + rnd() * 76,
      y: 12 + rnd() * 76,
      size: 2 + rnd() * 4,
      twinkle: rnd(),
    });
  }
  // Build a connected-ish path: nearest-neighbour chain plus one or two extra
  // links so it reads as a constellation rather than a polyline.
  const links: [number, number][] = [];
  const used = new Set<number>([0]);
  let current = 0;
  while (used.size < nodes.length) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < nodes.length; j++) {
      if (used.has(j)) continue;
      const dx = nodes[current].x - nodes[j].x;
      const dy = nodes[current].y - nodes[j].y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best === -1) break;
    links.push([current, best]);
    used.add(best);
    current = best;
  }
  if (nodes.length > 3) {
    const r = seededStream(seedStr + "::extra");
    links.push([0, Math.min(nodes.length - 1, 2 + Math.floor(r() * (nodes.length - 2)))]);
  }
  return { nodes, links };
}

export default function ConstellationSkyPage() {
  const reduce = useReducedMotion();
  const { loaded, error, allStories, activeStory, activeHref, notifs, liveCampaigns, unreadComments } =
    useDashboardData();

  // Non-campaign stories become constellations; campaigns are nebulae (drawn
  // separately) so we never double-draw.
  const constellationStories = useMemo(
    () => allStories.filter((s) => s.writingMode !== "campaign"),
    [allStories],
  );

  // Deterministic placement. The active story is pulled toward centre and given
  // the largest scale; everything else is scattered on a seeded grid-with-jitter
  // to avoid heavy overlap.
  const placed = useMemo<Placed[]>(() => {
    const out: Placed[] = [];
    const others = constellationStories.filter((s) => s.id !== activeStory?.id);

    if (activeStory && activeStory.writingMode !== "campaign") {
      const count = Math.max(3, Math.min(9, activeStory.chapterCount || 3));
      out.push({
        story: activeStory,
        cx: 50,
        cy: 46,
        scale: 1,
        isActive: true,
        ...buildNodes(activeStory.id, count),
      });
    }

    // Scatter others around the canvas, biased to the edges, away from centre.
    const slots = [
      { x: 18, y: 22 },
      { x: 80, y: 24 },
      { x: 16, y: 68 },
      { x: 82, y: 70 },
      { x: 50, y: 14 },
      { x: 26, y: 46 },
      { x: 74, y: 50 },
      { x: 50, y: 82 },
      { x: 88, y: 46 },
      { x: 12, y: 44 },
    ];
    others.forEach((s, i) => {
      const slot = slots[i % slots.length];
      const j = seededStream(s.id + "::pos");
      const cx = Math.max(8, Math.min(92, slot.x + (j() - 0.5) * 12));
      const cy = Math.max(10, Math.min(88, slot.y + (j() - 0.5) * 12));
      const count = Math.max(3, Math.min(9, s.chapterCount || 3));
      out.push({
        story: s,
        cx,
        cy,
        scale: 0.62 + Math.min(0.22, (s.chapterCount || 0) * 0.02),
        isActive: false,
        ...buildNodes(s.id, count),
      });
    });
    return out;
  }, [constellationStories, activeStory]);

  // Nebula placement for campaigns — soft clouds, edge-biased.
  const nebulae = useMemo(() => {
    const slots = [
      { x: 30, y: 78, hue: "lavender" },
      { x: 72, y: 80, hue: "violet" },
      { x: 64, y: 18, hue: "teal" },
      { x: 22, y: 30, hue: "rose" },
    ];
    return liveCampaigns.map((c, i) => {
      const slot = slots[i % slots.length];
      const j = seededStream(c.id + "::neb");
      return {
        camp: c,
        cx: Math.max(12, Math.min(88, slot.x + (j() - 0.5) * 14)),
        cy: Math.max(14, Math.min(86, slot.y + (j() - 0.5) * 14)),
        hue: slot.hue,
        size: 220 + Math.min(160, (c.playerCount || 1) * 36),
      };
    });
  }, [liveCampaigns]);

  // Background field of faint distant stars — capped, deterministic.
  const bgStars = useMemo(() => {
    const rnd = seededStream("quiloria-sky-field");
    return Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: rnd() * 100,
      y: rnd() * 100,
      size: 0.6 + rnd() * 1.8,
      delay: rnd() * 6,
      dur: 3 + rnd() * 5,
      bright: 0.2 + rnd() * 0.5,
    }));
  }, []);

  // Shooting stars sourced from latest notifications (cap 4).
  const meteors = useMemo(() => notifs.slice(0, 4), [notifs]);
  const recentMeteors = useMemo(() => notifs.slice(0, 3), [notifs]);

  const isEmpty = loaded && constellationStories.length === 0 && liveCampaigns.length === 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-void text-text">
      {/* Deep-space gradient wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, rgba(72,61,139,0.18), transparent 60%)," +
            "radial-gradient(90% 80% at 80% 100%, rgba(139,92,246,0.10), transparent 60%)," +
            "radial-gradient(80% 70% at 12% 70%, rgba(56,178,172,0.08), transparent 60%)",
        }}
      />
      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(130% 100% at 50% 45%, transparent 55%, rgba(0,0,0,0.6))" }}
      />

      {/* ── Background star field ── */}
      <div className="pointer-events-none absolute inset-0">
        {bgStars.map((s) => (
          <motion.span
            key={s.id}
            className="absolute rounded-full bg-paper"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              opacity: s.bright,
            }}
            animate={reduce ? undefined : { opacity: [s.bright, s.bright * 0.25, s.bright] }}
            transition={reduce ? undefined : { duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ── Comet arc (streak / momentum flourish) ── */}
      {!reduce && (
        <motion.div
          className="pointer-events-none absolute h-[2px] w-40 rounded-full"
          style={{
            top: "8%",
            left: "-12%",
            background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.0), rgba(245,158,11,0.9))",
            filter: "drop-shadow(0 0 8px rgba(245,158,11,0.7))",
            rotate: "18deg",
          }}
          animate={{ x: ["0vw", "130vw"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 9, repeat: Infinity, repeatDelay: 11, ease: "easeIn" }}
        />
      )}

      {/* ── Shooting stars from notifications ── */}
      {!reduce &&
        meteors.map((m, i) => (
          <motion.div
            key={m.id}
            className="pointer-events-none absolute h-[2px] w-24 rounded-full"
            style={{
              top: `${14 + i * 16}%`,
              left: "-10%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95))",
              filter: "drop-shadow(0 0 6px rgba(199,210,254,0.9))",
              rotate: "24deg",
            }}
            animate={{ x: ["0vw", "120vw"], y: ["0vh", "60vh"], opacity: [0, 1, 0] }}
            transition={{
              duration: 2.4,
              delay: 1.5 + i * 3.5,
              repeat: Infinity,
              repeatDelay: 9,
              ease: "easeIn",
            }}
          />
        ))}

      {/* ── The pannable sky stage (subtle drift parallax) ── */}
      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { x: [0, -14, 0, 12, 0], y: [0, 8, 0, -6, 0] }}
        transition={reduce ? undefined : { duration: 60, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Nebulae (campaigns) */}
        {nebulae.map(({ camp, cx, cy, hue, size }, i) => (
          <NebulaCloud key={camp.id} camp={camp} cx={cx} cy={cy} hue={hue} size={size} index={i} reduce={!!reduce} />
        ))}

        {/* Constellations (stories) */}
        {placed.map((p) => (
          <Constellation key={p.story.id} p={p} reduce={!!reduce} activeHref={activeHref} />
        ))}
      </motion.div>

      {/* ── Empty sky → north star CTA ── */}
      {isEmpty && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center">
          <motion.div
            className="relative mb-8"
            animate={reduce ? undefined : { scale: [1, 1.12, 1] }}
            transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="absolute -inset-16 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(245,158,11,0.45), transparent 70%)" }}
            />
            <Sparkles className="relative h-12 w-12 text-amber" strokeWidth={1.2} />
          </motion.div>
          <h2 className="font-display text-3xl text-paper">Your sky is dark — for now</h2>
          <p className="mt-3 max-w-sm font-reading italic text-text-secondary">
            Every story you begin becomes a constellation. Light the first one.
          </p>
          <Link
            href="/create"
            className="group mt-8 inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-6 py-3 font-medium text-amber transition hover:bg-amber/20"
          >
            <Plus className="h-4 w-4" />
            Chart your first story
          </Link>
        </div>
      )}

      {/* ── Loading: "the sky is still forming…" ── */}
      {!loaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <div className="flex gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-paper"
                animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }}
                transition={reduce ? undefined : { duration: 1.6, delay: i * 0.18, repeat: Infinity }}
              />
            ))}
          </div>
          <p className="mt-5 font-reading italic text-text-ghost">the sky is still forming…</p>
        </div>
      )}

      {/* ── Header ── */}
      <header className="relative z-30 flex items-start justify-between px-6 pt-6 sm:px-10 sm:pt-8">
        <div>
          <Link
            href="/dashboard-mockup"
            className="inline-flex items-center gap-1.5 text-sm text-text-ghost transition hover:text-text-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <h1 className="mt-2 flex items-center gap-2 font-display text-3xl text-paper sm:text-4xl">
            <Telescope className="h-6 w-6 text-lavender" strokeWidth={1.4} />
            Your Sky
          </h1>
          <p className="mt-1 max-w-xs font-reading text-sm italic text-text-secondary">
            Each story a constellation. Each campaign a nebula. Drift among your work.
          </p>
        </div>

        {/* Resume-writing control (hero shortcut) */}
        {loaded && activeStory && (
          <Link
            href={activeHref}
            className="group hidden items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 py-2 text-sm text-amber backdrop-blur-sm transition hover:bg-amber/20 sm:inline-flex"
          >
            <Sparkles className="h-4 w-4" />
            Resume {truncate(activeStory.title, 22)}
          </Link>
        )}
      </header>

      {/* ── Recent meteors gutter (latest notifications) ── */}
      {loaded && (recentMeteors.length > 0 || error) && (
        <div className="absolute bottom-6 left-6 z-30 w-72 max-w-[calc(100vw-3rem)] sm:left-10">
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-text-ghost">
            <span className="text-amber">✦</span> recent meteors
          </div>
          <div className="space-y-1.5 rounded-2xl border border-border-subtle bg-ink/60 p-3 backdrop-blur-md">
            {error && recentMeteors.length === 0 && (
              <p className="text-sm text-rose/80">A cloud passed over the sky — couldn’t read all signals.</p>
            )}
            {recentMeteors.map((n: MockNotification) => (
              <Link
                key={n.id}
                href={n.href || "#"}
                className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-elevated/60"
              >
                <span className={`mt-0.5 shrink-0 ${n.read ? "text-text-ghost" : "text-amber"}`}>
                  {NOTIF_GLYPH[n.type] ?? "✦"}
                </span>
                <span className="min-w-0 flex-1 truncate text-text-secondary">{n.message}</span>
                <span className="shrink-0 font-mono text-[11px] text-text-ghost">
                  {relativeShort(n.createdAt)}
                </span>
              </Link>
            ))}
            {unreadComments > 0 && (
              <div className="flex items-center gap-1.5 px-2 pt-1 font-mono text-[11px] text-teal/80">
                <MessageCircle className="h-3 w-3" />
                {unreadComments} unread {unreadComments === 1 ? "reply" : "replies"} drifting in
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// ── Constellation component ──────────────────────────────────────────────────
function Constellation({
  p,
  reduce,
  activeHref,
}: {
  p: Placed;
  reduce: boolean;
  activeHref: string;
}) {
  const href = p.isActive ? activeHref : storyHref(p.story);
  const accent = p.isActive ? "245,158,11" : "199,210,254"; // amber : starlight-indigo
  const boxSize = p.isActive ? 280 : 180;

  return (
    <Link
      href={href}
      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${p.cx}%`, top: `${p.cy}%`, width: boxSize, height: boxSize }}
      aria-label={`Open ${p.story.title}`}
    >
      {/* Hero glow for the active constellation */}
      {p.isActive && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.30), transparent 70%)" }}
          animate={reduce ? undefined : { opacity: [0.55, 1, 0.55], scale: [0.95, 1.06, 0.95] }}
          transition={reduce ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        {/* Igniting lines — draw themselves on load */}
        {p.links.map(([a, b], i) => {
          const na = p.nodes[a];
          const nb = p.nodes[b];
          return (
            <motion.line
              key={i}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke={`rgba(${accent},${p.isActive ? 0.5 : 0.3})`}
              strokeWidth={p.isActive ? 0.5 : 0.35}
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={
                reduce
                  ? undefined
                  : { duration: 1.1, delay: 0.2 + i * 0.12, ease: "easeInOut" }
              }
            />
          );
        })}
        {/* Stars */}
        {p.nodes.map((n, i) => (
          <g key={i}>
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={(n.size / 10) * (p.isActive ? 1.25 : 1)}
              fill="#FBFAF7"
              initial={reduce ? false : { opacity: 0, scale: 0 }}
              animate={
                reduce
                  ? { opacity: 1 }
                  : { opacity: [0.7, 1, 0.7], scale: 1 }
              }
              transition={
                reduce
                  ? undefined
                  : {
                      opacity: { duration: 2.4 + n.twinkle * 2, repeat: Infinity, ease: "easeInOut" },
                      scale: { duration: 0.6, delay: 0.3 + i * 0.08 },
                    }
              }
              style={{ filter: `drop-shadow(0 0 ${p.isActive ? 3 : 1.6}px rgba(${accent},0.9))` }}
            />
          </g>
        ))}
      </svg>

      {/* Title label */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
        style={{ top: p.isActive ? "calc(100% - 14px)" : "calc(100% - 26px)" }}
      >
        <div
          className={`font-display leading-tight transition ${
            p.isActive ? "text-lg text-paper sm:text-xl" : "text-sm text-text-secondary group-hover:text-paper"
          }`}
          style={p.isActive ? { textShadow: "0 0 18px rgba(245,158,11,0.45)" } : undefined}
        >
          {truncate(p.story.title, p.isActive ? 32 : 24)}
        </div>
        <div className="mt-0.5 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-wider text-text-ghost">
          {p.isActive && <span className="text-amber">active wip</span>}
          <span>{p.story.chapterCount} ch</span>
          {p.story.sparkCount > 0 && <span className="text-rose/70">✶ {p.story.sparkCount}</span>}
        </div>
      </div>
    </Link>
  );
}

// ── Nebula (campaign) component ──────────────────────────────────────────────
function NebulaCloud({
  camp,
  cx,
  cy,
  hue,
  size,
  index,
  reduce,
}: {
  camp: MockCampaign;
  cx: number;
  cy: number;
  hue: string;
  size: number;
  index: number;
  reduce: boolean;
}) {
  const rgb: Record<string, string> = {
    lavender: "167,139,250",
    violet: "139,92,246",
    teal: "45,212,191",
    rose: "244,114,182",
  };
  const c = rgb[hue] ?? rgb.lavender;

  return (
    <Link
      href={`/campaign/${camp.id}`}
      className="group absolute z-[5] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${cx}%`, top: `${cy}%`, width: size, height: size }}
      aria-label={`Open campaign ${camp.title}`}
    >
      {/* Layered soft clouds */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, rgba(${c},0.32), transparent 68%)` }}
        animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.7, 0.95, 0.7] }}
        transition={reduce ? undefined : { duration: 9 + index * 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-[18%] rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, rgba(${c},0.4), transparent 60%)` }}
      />
      <div
        className="absolute inset-[38%] rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, rgba(255,255,255,0.18), transparent 65%)` }}
      />

      {/* Label */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div
          className="font-display text-base text-paper transition group-hover:text-white"
          style={{ textShadow: `0 0 16px rgba(${c},0.7)` }}
        >
          {truncate(camp.title, 22)}
        </div>
        <div className="mt-1 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
          <Users className="h-3 w-3" />
          {camp.activeSession ? `${camp.playerCount} at the table` : `${camp.playerCount} players`}
        </div>
        {camp.activeSession && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-sage/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-sage">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-sage"
              animate={reduce ? undefined : { opacity: [1, 0.3, 1] }}
              transition={reduce ? undefined : { duration: 1.8, repeat: Infinity }}
            />
            live session
          </div>
        )}
      </div>
    </Link>
  );
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
