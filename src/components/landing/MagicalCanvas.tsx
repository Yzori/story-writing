"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useState, useMemo, useEffect, useCallback } from "react";

/* ════════════════════════════════════════
   TYPES & DATA
   ════════════════════════════════════════ */

type NodeId = "genesis" | "write" | "read" | "connect" | "explore";

interface StoryNode {
  id: NodeId;
  label: string;
  title: string;
  description: string;
  x: number;
  y: number;
  children: NodeId[];
  accent: string; // glow color
  icon: React.ReactNode;
}

const nodes: Record<NodeId, StoryNode> = {
  genesis: {
    id: "genesis",
    label: "Quiloria",
    title: "Every great story begins with a single word.",
    description:
      "A collaborative writing platform where writers, artists, and readers come together to craft stories that live and breathe.",
    x: 0,
    y: 0,
    children: ["write", "read", "connect"],
    accent: "212,165,116",
    icon: (
      <svg
        className="w-9 h-9"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <path
          d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z"
          fill="currentColor"
          opacity="0.7"
          stroke="none"
        />
        <path d="M7 28L5 29L4 27L7 28Z" fill="currentColor" stroke="none" />
        <circle
          cx="4.5"
          cy="28"
          r="1.2"
          fill="currentColor"
          stroke="none"
          opacity="0.6"
        />
      </svg>
    ),
  },
  write: {
    id: "write",
    label: "Write Together",
    title: "Branch your story like code.",
    description:
      "Co-author in real-time or async. Propose edits as merge requests, branch into alternate timelines, and maintain a full history of every narrative twist.",
    x: -32,
    y: -28,
    children: [],
    accent: "45,106,106",
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      >
        <path d="M12 2v7" strokeLinecap="round" />
        <path d="M12 9c-3 0-5 3-5 6v5" strokeLinecap="round" />
        <path d="M12 9c3 0 5 3 5 6v5" strokeLinecap="round" />
        <circle cx="12" cy="2" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="7" cy="20" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="17" cy="20" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  read: {
    id: "read",
    label: "Readers Decide",
    title: "Your audience shapes the plot.",
    description:
      "Embed polls and decision points. Readers vote on twists, character fates, and branching paths. The story becomes a living world governed by its community.",
    x: 34,
    y: -20,
    children: [],
    accent: "123,107,138",
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v4M12 16v4M4 12h4M16 12h4" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  connect: {
    id: "connect",
    label: "Connect Creatives",
    title: "Forge creative partnerships.",
    description:
      "Find your artist, editor, or worldbuilder. Post collaboration roles, join story jams, and build partnerships that bring your vision to life.",
    x: -10,
    y: 35,
    children: ["explore"],
    accent: "198,125,74",
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      >
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="8" r="3" />
        <path d="M4 19c0-3 2-5 4-5" strokeLinecap="round" />
        <path d="M20 19c0-3-2-5-4-5" strokeLinecap="round" />
        <path d="M12 13v4M10 15h4" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
  },
  explore: {
    id: "explore",
    label: "Explore Stories",
    title: "Dive into infinite worlds.",
    description:
      "Browse stories shaped by thousands of authors and millions of readers. Find your next obsession by mood, genre, or serendipity.",
    x: 30,
    y: 42,
    children: [],
    accent: "212,165,116",
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
};

/* ════════════════════════════════════════
   AMBIENT PARTICLES
   ════════════════════════════════════════ */

function Particles({
  parallaxX,
  parallaxY,
}: {
  parallaxX: ReturnType<typeof useMotionValue<number>>;
  parallaxY: ReturnType<typeof useMotionValue<number>>;
}) {
  const [particles] = useState(() =>
    Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      dur: Math.random() * 30 + 15,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.3 + 0.05,
      drift: Math.random() * 40 + 15,
    })),
  );

  return (
    <motion.div
      className="absolute inset-[-60px] pointer-events-none"
      style={{ x: parallaxX, y: parallaxY }}
      aria-hidden
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.size > 2 ? "var(--t-gold)" : "var(--t-text-secondary)",
          }}
          animate={{
            y: [0, -p.drift, 0],
            opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}

/* ════════════════════════════════════════
   FLOATING STORY WISPS (atmospheric)
   ════════════════════════════════════════ */

const storySnippets = [
  { title: "The Lighthouse at the Edge of Dreams", genre: "Fantasy" },
  { title: "Binary Stars", genre: "Sci-Fi" },
  { title: "Roots & Ruin", genre: "Literary" },
  { title: "The Cartographer's Daughter", genre: "Historical" },
];

const wispPositions: React.CSSProperties[] = [
  { top: "6%", left: "3%" },
  { top: "5%", right: "2%" },
  { bottom: "8%", left: "2%" },
  { bottom: "6%", right: "3%" },
];

function StoryWisp({
  snippet,
  position,
  index,
}: {
  snippet: (typeof storySnippets)[0];
  position: React.CSSProperties;
  index: number;
}) {
  return (
    <motion.div
      className="absolute hidden xl:block pointer-events-none z-[5]"
      style={position}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, delay: 3 + index * 0.4 }}
    >
      <motion.div
        animate={{
          y: [0, -8 - index * 3, 0],
          rotate: [-1 + index * 0.5, 1.5 - index * 0.3, -1 + index * 0.5],
        }}
        transition={{
          duration: 10 + index * 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-[160px] p-4 rounded-lg bg-cream/[0.015] border border-cream/[0.03]"
      >
        <span className="text-[0.55rem] text-amber/25 tracking-[0.2em] uppercase">
          {snippet.genre}
        </span>
        <p className="font-display text-[0.75rem] text-cream/20 mt-1.5 leading-snug">
          {snippet.title}
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════
   NODE COMPONENT
   ════════════════════════════════════════ */

function MapNode({
  node,
  isActive,
  onClick,
  mapScale,
}: {
  node: StoryNode;
  isActive: boolean;
  onClick: () => void;
  mapScale: number;
}) {
  const isGenesis = node.id === "genesis";
  const size = isGenesis ? (isActive ? 110 : 90) : isActive ? 80 : 56;

  return (
    <motion.div
      className="absolute z-10"
      style={{
        left: node.x * mapScale,
        top: node.y * mapScale,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 18, delay: isGenesis ? 0 : 0.15 }}
    >
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group"
        onClick={onClick}
      >
        {/* Outer glow ring */}
        {isActive && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: size + 40,
              height: size + 40,
              top: -(size + 40) / 2,
              left: -(size + 40) / 2,
              background: `radial-gradient(circle, rgba(${node.accent},0.12) 0%, transparent 70%)`,
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Pulse ring (inactive, revealed) */}
        {!isActive && (
          <motion.div
            className="absolute rounded-full border"
            style={{
              width: size + 12,
              height: size + 12,
              top: -(size + 12) / 2,
              left: -(size + 12) / 2,
              borderColor: `rgba(${node.accent},0.08)`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Node circle */}
        <motion.div
          className="rounded-full flex items-center justify-center border transition-all duration-500"
          style={{
            width: size,
            height: size,
            borderColor: isActive
              ? `rgba(${node.accent},0.6)`
              : `rgba(${node.accent},0.12)`,
            backgroundColor: isActive
              ? `rgba(${node.accent},0.12)`
              : "rgba(128,128,128,0.3)",
            boxShadow: isActive
              ? `0 0 50px rgba(${node.accent},0.25), inset 0 0 30px rgba(${node.accent},0.08)`
              : "none",
          }}
          whileHover={{
            borderColor: `rgba(${node.accent},0.5)`,
            backgroundColor: `rgba(${node.accent},0.08)`,
            boxShadow: `0 0 30px rgba(${node.accent},0.15)`,
          }}
          animate={
            isActive
              ? { scale: [1, 1.03, 1] }
              : {}
          }
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className="transition-colors duration-500"
            style={{
              color: isActive
                ? `rgba(${node.accent},1)`
                : `rgba(${node.accent},0.4)`,
            }}
          >
            {node.icon}
          </div>
        </motion.div>

        {/* Label */}
        <motion.span
          className="mt-3 font-display font-semibold tracking-wide whitespace-nowrap transition-all duration-500"
          style={{
            fontSize: isActive ? (isGenesis ? "1.1rem" : "0.9rem") : "0.75rem",
            color: isActive
              ? `rgba(${node.accent},0.9)`
              : "var(--t-text-ghost)",
          }}
        >
          {node.label}
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════
   MAIN CANVAS
   ════════════════════════════════════════ */

export default function MagicalCanvas() {
  const [activeNodeId, setActiveNodeId] = useState<NodeId>("genesis");
  const [revealedNodes, setRevealedNodes] = useState<Set<NodeId>>(
    new Set(["genesis"])
  );
  const [rawMouse, setRawMouse] = useState({ x: -999, y: -999 });
  const [hasMouse, setHasMouse] = useState(false);
  const [mapScale, setMapScale] = useState(14);

  // Mouse tracking for parallax
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const smoothMx = useSpring(mx, { stiffness: 25, damping: 20 });
  const smoothMy = useSpring(my, { stiffness: 25, damping: 20 });
  const pxFar = useTransform(smoothMx, [0, 1], [12, -12]);
  const pyFar = useTransform(smoothMy, [0, 1], [8, -8]);

  useEffect(() => {
    const update = () => {
      const s = Math.min(window.innerWidth, 1600) / 100;
      setMapScale(Math.max(s, 10));
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!hasMouse) setHasMouse(true);
      mx.set(e.clientX / window.innerWidth);
      my.set(e.clientY / window.innerHeight);
      setRawMouse({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my, hasMouse]);

  const handleNodeClick = useCallback(
    (id: NodeId) => {
      setActiveNodeId(id);
      setRevealedNodes((prev) => {
        const next = new Set(prev);
        next.add(id);
        nodes[id].children.forEach((c) => next.add(c));
        return next;
      });
    },
    []
  );

  const activeNode = nodes[activeNodeId];
  const cameraX = -(activeNode.x * mapScale);
  const cameraY = -(activeNode.y * mapScale);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-ink" />

      {/* Active-node-reactive gradient */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: `radial-gradient(ellipse 70% 55% at 50% 48%, rgba(${activeNode.accent},0.07) 0%, var(--t-void) 70%)`,
        }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,color-mix(in_srgb,var(--t-void)_90%,transparent)_100%)] pointer-events-none" />

      {/* Warm color washes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-[500px] h-[350px] bg-teal/[0.012] rounded-full blur-[140px]" />
        <div className="absolute bottom-[15%] right-[10%] w-[400px] h-[300px] bg-violet/[0.012] rounded-full blur-[120px]" />
      </div>

      {/* ── Mouse Candlelight ── */}
      {hasMouse && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <div
            className="absolute inset-0 transition-[background] duration-75"
            style={{
              background: `radial-gradient(circle 500px at ${rawMouse.x}px ${rawMouse.y}px, rgba(212,165,116,0.045), transparent 70%)`,
            }}
          />
          <div
            className="absolute inset-0 transition-[background] duration-75"
            style={{
              background: `radial-gradient(circle 140px at ${rawMouse.x}px ${rawMouse.y}px, rgba(232,196,154,0.03), transparent 70%)`,
            }}
          />
        </motion.div>
      )}

      {/* ── Particles ── */}
      <Particles parallaxX={pxFar} parallaxY={pyFar} />

      {/* ── Story Wisps (atmosphere) ── */}
      {storySnippets.map((s, i) => (
        <StoryWisp
          key={s.title}
          snippet={s}
          position={wispPositions[i]}
          index={i}
        />
      ))}

      {/* ══════ INTERACTIVE MAP ══════ */}
      <motion.div
        className="absolute top-[42%] left-1/2 w-0 h-0"
        animate={{ x: cameraX, y: cameraY }}
        transition={{ type: "spring", stiffness: 35, damping: 14, mass: 1.2 }}
      >
        {/* SVG Ink Trails */}
        <svg
          className="absolute top-[-2000px] left-[-2000px] w-[4000px] h-[4000px] pointer-events-none overflow-visible z-0"
          aria-hidden
        >
          <defs>
            <filter id="ink-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform="translate(2000, 2000)">
            {/* Base paths */}
            {Object.values(nodes).map((node) =>
              node.children.map((childId) => {
                if (!revealedNodes.has(childId)) return null;
                const child = nodes[childId];
                const x1 = node.x * mapScale;
                const y1 = node.y * mapScale;
                const x2 = child.x * mapScale;
                const y2 = child.y * mapScale;
                const cx = (x1 + x2) / 2 + (y2 - y1) * 0.25;
                const cy = (y1 + y2) / 2 - (x2 - x1) * 0.25;

                return (
                  <motion.path
                    key={`edge-${node.id}-${childId}`}
                    d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                    fill="none"
                    stroke={`rgba(${node.accent},0.15)`}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      duration: 1.8,
                      ease: "easeInOut",
                      delay: 0.3,
                    }}
                  />
                );
              })
            )}

            {/* Animated flowing light along active edges */}
            {Object.values(nodes).map((node) =>
              node.children.map((childId) => {
                if (!revealedNodes.has(childId)) return null;
                if (node.id !== activeNodeId && childId !== activeNodeId)
                  return null;

                const child = nodes[childId];
                const x1 = node.x * mapScale;
                const y1 = node.y * mapScale;
                const x2 = child.x * mapScale;
                const y2 = child.y * mapScale;
                const cx = (x1 + x2) / 2 + (y2 - y1) * 0.25;
                const cy = (y1 + y2) / 2 - (x2 - x1) * 0.25;

                return (
                  <motion.path
                    key={`flow-${node.id}-${childId}`}
                    d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                    fill="none"
                    stroke={`rgba(${activeNode.accent},0.5)`}
                    strokeWidth="2"
                    strokeLinecap="round"
                    filter="url(#ink-glow)"
                    initial={{ pathLength: 0.15, pathOffset: 0, opacity: 0 }}
                    animate={{
                      pathLength: 0.15,
                      pathOffset: [0, 1],
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 3.5,
                      ease: "linear",
                      repeat: Infinity,
                    }}
                  />
                );
              })
            )}
          </g>
        </svg>

        {/* Nodes */}
        {Object.values(nodes).map((node) => {
          if (!revealedNodes.has(node.id)) return null;
          return (
            <MapNode
              key={node.id}
              node={node}
              isActive={node.id === activeNodeId}
              onClick={() => handleNodeClick(node.id)}
              mapScale={mapScale}
            />
          );
        })}
      </motion.div>

      {/* ══════ TOP NAV ══════ */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-50 px-6 md:px-8 py-5 flex items-center justify-between pointer-events-none"
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <svg className="w-6 h-6 text-amber" viewBox="0 0 32 32" fill="none">
            <path
              d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z"
              fill="currentColor"
              opacity="0.85"
            />
            <path d="M7 28L5 29L4 27L7 28Z" fill="currentColor" />
          </svg>
          <span className="font-display text-base font-bold text-cream/70 tracking-[0.25em] uppercase">
            Quiloria
          </span>
        </div>

        <div className="flex items-center gap-6 pointer-events-auto">
          <button className="hidden md:block text-xs text-cream/20 hover:text-amber/60 transition-colors tracking-wide">
            About
          </button>
          <button className="text-xs px-4 py-1.5 rounded-full border border-cream/[0.06] text-cream/25 hover:text-amber hover:border-amber/25 transition-all duration-300">
            Sign In
          </button>
        </div>
      </motion.div>

      {/* ══════ DETAIL PANEL ══════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeNodeId}
          className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none"
          initial={{ opacity: 0, y: 40, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 25, filter: "blur(6px)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Fade gradient above panel */}
          <div className="h-24 bg-gradient-to-t from-ink/90 to-transparent" />

          <div className="bg-ink/90 backdrop-blur-sm pb-10 pt-2 px-6">
            <div className="max-w-xl mx-auto text-center">
              {/* Eyebrow */}
              {activeNodeId === "genesis" && (
                <motion.p
                  className="text-xs tracking-[0.3em] uppercase font-medium mb-4"
                  style={{ color: `rgba(${activeNode.accent},0.5)` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  A collaborative narrative engine
                </motion.p>
              )}

              {/* Title */}
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-cream leading-tight tracking-tight">
                {activeNode.title}
              </h2>

              {/* Description */}
              <p className="mt-3 text-sm md:text-base text-linen/40 leading-relaxed max-w-lg mx-auto">
                {activeNode.description}
              </p>

              {/* CTA */}
              <motion.div
                className="mt-6 flex items-center justify-center gap-3 pointer-events-auto"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <button
                  className="group relative px-7 py-2.5 rounded-full font-medium text-sm overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                  style={{
                    backgroundColor: `rgba(${activeNode.accent},0.12)`,
                    borderWidth: 1,
                    borderColor: `rgba(${activeNode.accent},0.25)`,
                    color: `rgba(${activeNode.accent},0.9)`,
                  }}
                >
                  <span className="relative z-10">
                    {activeNodeId === "genesis"
                      ? "Begin the Journey"
                      : `Explore ${activeNode.label}`}
                  </span>
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(circle at center, rgba(${activeNode.accent},0.15), transparent)`,
                    }}
                  />
                </button>

                {activeNodeId === "genesis" && (
                  <button className="px-7 py-2.5 rounded-full text-sm text-cream/30 border border-cream/[0.06] hover:text-cream/50 hover:border-cream/15 transition-all duration-300">
                    Explore Stories
                  </button>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ══════ HINT ══════ */}
      <motion.div
        className="absolute bottom-4 right-6 z-50 text-[0.6rem] text-linen/15 tracking-[0.3em] uppercase pointer-events-none hidden md:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1.5 }}
      >
        Click nodes to explore
      </motion.div>
    </div>
  );
}
