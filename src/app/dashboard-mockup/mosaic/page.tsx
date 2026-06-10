"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, PenLine, Swords, BookOpen, MessageSquareText, Users, Heart, Flame, Coins } from "lucide-react";
import { useDashboardData, storyHref } from "@/components/dashboard-mockup/useDashboardData";
import {
  CoverArt,
  PhaseClock,
  phaseInfo,
  PHASES,
  Sparkline,
  paletteFor,
  genrePalette,
  hexToRgb,
  READER_ACCENT,
  CLOCK_FALLBACK,
} from "@/components/dashboard/studio-kit";
import { genSeries, READING_DEMO } from "@/components/dashboard-mockup/demo-kit";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// "The Mosaic" — ALL HEADS AT ONCE.
// Every life is a module on one screen, shaped to what it is. The hottest swells
// to the focal slot; quiet ones shrink to tiles. Priority is carried by SIZE and
// SHAPE, not by hiding, sorting, or making the user switch. Re-packs as heat
// shifts. Reading / collab / creator data is illustrative (no rows in DB yet).
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;
const daysSince = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 999 : Math.floor((Date.now() - t) / 86_400_000);
};

type Size = "wide" | "tall" | "normal";
type Kind = "wip" | "table" | "reading" | "notes" | "follows" | "collab" | "creator" | "momentum" | "cold";
interface Tile {
  key: string;
  kind: Kind;
  heat: number;
  size: Size;
  accent: string;
  // payload
  story?: ApiStory;
  href: string;
  title?: string;
  extra?: Record<string, unknown>;
}

const HERO_KINDS: Kind[] = ["wip", "table", "reading"];

export default function MosaicMock() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const data = useDashboardData(POLL_MS);
  const { loaded, error, allStories, activeStory, activeHref, liveCampaigns, notifs } = data;
  const firstName = session?.user?.name?.split(" ")[0];

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const clockNow = now ?? CLOCK_FALLBACK;
  const phaseKey = phaseInfo(clockNow).key;
  const phaseRgb = PHASES[phaseKey].rgb;

  const wordSeries = useMemo(() => genSeries(activeStory?.id ?? "seed", 14), [activeStory?.id]);

  const tiles = useMemo<Tile[]>(() => {
    if (!loaded || error) return [];
    const out: Tile[] = [];

    // — live tables (GM/player): hottest when a session is open —
    for (const c of liveCampaigns) {
      if (!c.activeSession) continue;
      const yourMove = !!c.myCharacter && c.activeSession.activePlayerId === c.myCharacter.id;
      out.push({
        key: `table-${c.id}`,
        kind: "table",
        heat: yourMove ? 100 : 78,
        size: "wide",
        accent: "184,105,122",
        href: `/campaign/${c.id}/play/${c.activeSession.id}`,
        title: c.title,
        extra: { players: c.playerCount, yourMove, gm: c.role === "gm" || c.role === "both", character: c.myCharacter?.name },
      });
    }

    // — active manuscript (writer pride) —
    if (activeStory && activeStory.writingMode !== "campaign") {
      const fresh = daysSince(activeStory.updatedAt) <= 7;
      out.push({ key: `wip-${activeStory.id}`, kind: "wip", heat: fresh ? 74 : 58, size: "wide", accent: hexToRgb(paletteFor(activeStory.id)[2]), href: activeHref, story: activeStory });
    }

    // — readers waiting (writer obligation) —
    const comments = notifs.filter((n) => n.type === "comment" && !n.read);
    if (comments.length) out.push({ key: "notes", kind: "notes", heat: 66, size: "normal", accent: "224,164,88", href: comments[0].href || "/notifications", title: `${comments.length} reader note${comments.length === 1 ? "" : "s"}`, extra: { msg: comments[0].message } });

    // — continue reading (reader) — illustrative —
    const cur = READING_DEMO.current;
    out.push({ key: "reading", kind: "reading", heat: 60, size: "tall", accent: READER_ACCENT, href: "/read", title: cur.title, extra: { author: cur.author, genre: cur.genre, chapter: cur.chapter, of: cur.of } });

    // — collaboration (collaborator) — illustrative —
    out.push({ key: "collab", kind: "collab", heat: 54, size: "normal", accent: "94,139,130", href: "/notifications", title: "2 suggestions to review", extra: { on: activeStory?.title ?? "your story" } });

    // — from writers you follow (reader) — illustrative —
    out.push({ key: "follows", kind: "follows", heat: 48, size: "wide", accent: "154,122,208", href: "/read", extra: { items: READING_DEMO.follows.slice(0, 2) } });

    // — creator pulse — sparks real, drops illustrative —
    const sparks = allStories.reduce((a, s) => a + (s.sparkCount || 0), 0);
    out.push({ key: "creator", kind: "creator", heat: 44, size: "normal", accent: "208,136,88", href: "/creator/earnings", title: `${sparks} sparks`, extra: { drops: 240 } });

    // — momentum / streak —
    out.push({ key: "momentum", kind: "momentum", heat: 40, size: "normal", accent: "138,176,158", href: "/read", title: `${READING_DEMO.streak}-day streak` });

    // — cold drafts —
    for (const s of allStories.slice(0, 6)) {
      if (s.id === activeStory?.id || s.writingMode === "campaign") continue;
      if (s.status === "draft") out.push({ key: `cold-${s.id}`, kind: "cold", heat: 30 - Math.min(daysSince(s.updatedAt), 20) * 0.3, size: "normal", accent: "154,122,208", href: storyHref(s), story: s });
    }

    return out.sort((a, b) => b.heat - a.heat);
  }, [loaded, error, liveCampaigns, activeStory, activeHref, notifs, allStories]);

  const heroKey = tiles.find((t) => HERO_KINDS.includes(t.kind))?.key ?? null;
  const focusAccent = tiles[0]?.accent ?? "224,164,88";

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-text">
      <motion.div aria-hidden className="pointer-events-none fixed inset-0 -z-10" animate={reduce ? { opacity: 1 } : { opacity: [0.85, 1, 0.85] }} transition={reduce ? {} : { duration: 7, repeat: Infinity, ease: "easeInOut" }} style={{ background: `radial-gradient(130% 80% at 12% -5%, rgba(${focusAccent},0.2), transparent 55%), radial-gradient(120% 80% at 92% 8%, rgba(${focusAccent},0.09), transparent 50%)` }} />
      <motion.div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[440px]" animate={{ background: `linear-gradient(to bottom, rgba(${phaseRgb},0.12), rgba(${phaseRgb},0.03) 45%, transparent 72%)` }} transition={{ duration: 1.4 }} />

      <div className="mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest">Concepts</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden font-display text-lg text-paper sm:block">{firstName ? `${firstName}'s Studio` : "Your Studio"}</span>
            {now && <PhaseClock now={now} />}
          </div>
        </header>

        <p className="mt-6 font-reading text-lg italic text-text-secondary">All your worlds at once — sized by what&apos;s alive.</p>

        {!loaded ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className={`animate-pulse rounded-2xl bg-elevated/50 ${i === 0 ? "col-span-2 row-span-2 h-[260px]" : "h-[120px]"}`} />)}
          </div>
        ) : error ? (
          <p className="mt-10 font-reading text-2xl italic text-text-secondary">The studio is dark right now — try again in a moment.</p>
        ) : (
          <div className="mt-5 grid auto-rows-[120px] grid-cols-2 gap-3 [grid-auto-flow:dense] sm:auto-rows-[132px] sm:grid-cols-4">
            <AnimatePresence initial={false}>
              {tiles.map((t) => (
                <TileCard key={t.key} tile={t} hero={t.key === heroKey} reduce={reduce} phaseKey={phaseKey} wordSeries={wordSeries} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function spanClass(size: Size, hero: boolean) {
  if (hero) return "col-span-2 row-span-2";
  if (size === "wide") return "col-span-2";
  if (size === "tall") return "row-span-2";
  return "";
}

const FLOATS = [{ e: "😮", l: "gasped" }, { e: "🔥", l: "needs more" }, { e: "✨", l: "inspired" }];

function TileCard({ tile, hero, reduce, phaseKey, wordSeries }: { tile: Tile; hero: boolean; reduce: boolean | null; phaseKey: keyof typeof PHASES; wordSeries: number[] }) {
  const a = tile.accent;
  const base = `group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 transition-transform hover:-translate-y-0.5 ${spanClass(tile.size, hero)}`;
  const tintStyle = { backgroundColor: `rgba(${a},0.06)`, boxShadow: `inset 0 1px 0 rgba(${a},0.12)` } as const;

  const motionProps = {
    layout: true,
    initial: reduce ? false : { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { layout: { type: "spring" as const, stiffness: 460, damping: 38 }, duration: 0.4 },
  };

  // ── shaped per life ──
  switch (tile.kind) {
    case "wip": {
      const s = tile.story!;
      return (
        <motion.div {...motionProps} className={base}>
          <Link href={tile.href} className="absolute inset-0">
            <CoverArt seed={s.id} title="" className="h-full w-full" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,8,12,0.15), rgba(8,8,12,0.85))" }} />
            {hero && !reduce && (
              <div className="pointer-events-none absolute right-3 top-3 w-36">
                {FLOATS.map((r, i) => (
                  <motion.div key={i} className="absolute right-0 flex items-center gap-1 whitespace-nowrap rounded-full bg-black/35 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm" initial={{ y: 160, opacity: 0 }} animate={{ y: 0, opacity: [0, 1, 1, 0] }} transition={{ duration: 6, delay: i * 1.7, repeat: Infinity, times: [0, 0.15, 0.8, 1] }}>
                    <span>{r.e}</span><span>{r.l}</span>
                  </motion.div>
                ))}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/70">Your desk · {PHASES[phaseKey].label}</span>
              <h3 className={`mt-1 font-display leading-tight text-white drop-shadow ${hero ? "text-3xl sm:text-4xl" : "text-lg"}`}>{s.title}</h3>
              <p className="mt-0.5 font-mono text-[10px] text-white/70">{s.chapterCount > 0 ? `Chapter ${s.chapterCount}` : "Chapter 1"} · {(s.totalWords || 0).toLocaleString()} words</p>
              {hero && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-black" style={{ backgroundColor: `rgb(${a})` }}><PenLine className="h-4 w-4" />Resume writing<ArrowRight className="h-3.5 w-3.5" /></span>
              )}
            </div>
          </Link>
        </motion.div>
      );
    }
    case "table": {
      const e = tile.extra as { players: number; yourMove: boolean; gm: boolean; character?: string };
      return (
        <motion.div {...motionProps} className={base} style={{ backgroundColor: "rgba(20,10,14,0.6)", boxShadow: `inset 0 0 0 1px rgba(${a},0.3)` }}>
          <Link href={tile.href} className="flex h-full flex-col justify-between p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: `rgb(${a})` }}>
                <span className="relative flex h-2 w-2">
                  <motion.span className="absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: `rgb(${a})` }} animate={reduce ? {} : { opacity: [1, 0.2, 1], scale: [1, 2, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: `rgb(${a})` }} />
                </span>
                {e.yourMove ? "Your move" : "Table in session"}
              </span>
              <Swords className="h-4 w-4" style={{ color: `rgb(${a})` }} />
            </div>
            <div>
              <h3 className={`font-display leading-tight text-paper ${hero ? "text-3xl sm:text-4xl" : "text-lg"}`}>{tile.title}</h3>
              <p className="mt-0.5 text-[12px] text-text-secondary">{e.yourMove ? `${e.character} is waiting on your turn` : e.gm ? `You're GMing · ${e.players} at the table` : `${e.players} at the table`}</p>
              {hero && <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-black" style={{ backgroundColor: `rgb(${a})` }}>{e.yourMove ? "Take your turn" : "Enter the table"}<ArrowRight className="h-3.5 w-3.5" /></span>}
            </div>
          </Link>
        </motion.div>
      );
    }
    case "reading": {
      const e = tile.extra as { author: string; genre: string; chapter: number; of: number };
      const pal = genrePalette(e.genre);
      const pct = Math.round((e.chapter / e.of) * 100);
      return (
        <motion.div {...motionProps} className={base}>
          <Link href={tile.href} className="absolute inset-0">
            <CoverArt seed="rd-salt-year" title="" className="h-full w-full" palette={pal} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,8,12,0.1), rgba(8,8,12,0.88))" }} />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/70"><BookOpen className="h-3 w-3" />Continue reading</span>
              <h3 className="mt-1 font-display text-lg leading-tight text-white drop-shadow">{tile.title}</h3>
              <p className="mt-0.5 font-mono text-[10px] text-white/70">{e.author} · Ch. {e.chapter}/{e.of}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: `rgb(${a})` }} initial={reduce ? false : { width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }} />
              </div>
            </div>
          </Link>
        </motion.div>
      );
    }
    case "notes": {
      const e = tile.extra as { msg: string };
      return (
        <motion.div {...motionProps} className={base} style={tintStyle}>
          <Link href={tile.href} className="flex h-full flex-col justify-between p-4">
            <MessageSquareText className="h-4 w-4" style={{ color: `rgb(${a})` }} />
            <div>
              <h3 className="font-display text-base text-paper">{tile.title}</h3>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-text-secondary">{e.msg}</p>
            </div>
          </Link>
        </motion.div>
      );
    }
    case "collab": {
      const e = tile.extra as { on: string };
      return (
        <motion.div {...motionProps} className={base} style={tintStyle}>
          <Link href={tile.href} className="flex h-full flex-col justify-between p-4">
            <Users className="h-4 w-4" style={{ color: `rgb(${a})` }} />
            <div>
              <h3 className="font-display text-base text-paper">{tile.title}</h3>
              <p className="mt-0.5 truncate text-[11px] text-text-secondary">on {e.on}</p>
            </div>
          </Link>
        </motion.div>
      );
    }
    case "follows": {
      const e = tile.extra as { items: { id: string; emoji: string; who: string; text: string }[] };
      return (
        <motion.div {...motionProps} className={base} style={tintStyle}>
          <Link href={tile.href} className="flex h-full flex-col justify-center gap-1.5 p-4">
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: `rgb(${a})` }}><Heart className="h-3 w-3" />From writers you follow</span>
            {e.items.map((f) => (
              <p key={f.id} className="truncate text-[12px] text-text-secondary"><span className="text-paper">{f.who}</span> {f.text}</p>
            ))}
          </Link>
        </motion.div>
      );
    }
    case "creator": {
      const e = tile.extra as { drops: number };
      return (
        <motion.div {...motionProps} className={base} style={tintStyle}>
          <Link href={tile.href} className="flex h-full flex-col justify-between p-4">
            <Coins className="h-4 w-4" style={{ color: `rgb(${a})` }} />
            <div>
              <h3 className="font-display text-xl text-paper">{tile.title}</h3>
              <p className="mt-0.5 text-[11px] text-text-secondary">▲ {e.drops} drops this week</p>
            </div>
          </Link>
        </motion.div>
      );
    }
    case "momentum":
      return (
        <motion.div {...motionProps} className={base} style={tintStyle}>
          <Link href={tile.href} className="flex h-full flex-col justify-between p-4">
            <Flame className="h-4 w-4" style={{ color: `rgb(${a})` }} />
            <div>
              <h3 className="font-display text-base text-paper">{tile.title}</h3>
              <div className="mt-1"><Sparkline data={wordSeries} color={a} reduce={reduce} /></div>
            </div>
          </Link>
        </motion.div>
      );
    case "cold": {
      const s = tile.story!;
      return (
        <motion.div {...motionProps} className={base}>
          <Link href={tile.href} className="absolute inset-0">
            <CoverArt seed={s.id} title="" className="h-full w-full" />
            <div className="absolute inset-0 bg-black/55 backdrop-grayscale" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <span className="font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color: `rgb(${a})` }}>Cold draft</span>
              <h3 className="font-display text-sm leading-tight text-white/90">{s.title}</h3>
              <p className="font-mono text-[9px] text-white/50">{(s.totalWords || 0).toLocaleString()}w · untouched</p>
            </div>
          </Link>
        </motion.div>
      );
    }
    default:
      return null;
  }
}
