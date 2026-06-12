"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, PenLine, BookOpen, Mail, Users, Star, Swords, Sparkles, X, Coins } from "lucide-react";
import { useDashboardData, storyHref } from "@/components/dashboard-mockup/useDashboardData";
import { ConceptSwitcher } from "@/components/dashboard-mockup/ConceptSwitcher";
import { CoverArt, genrePalette, PhaseClock, phaseInfo, PHASES, hash, arand, CLOCK_FALLBACK } from "@/components/dashboard/studio-kit";
import { READING_DEMO } from "@/components/dashboard-mockup/demo-kit";
import { greeting, InkHeadline } from "@/components/dashboard-mockup/room-kit";
import { formatTimeAgo } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// "The Spillover" — the home itself. Writer world left (ember-gold, ink
// rising), reading world right (your chosen ink, story settling), the crossing
// between them carrying real events. This revision closes the gap list:
//   1. third selves — a live table SEIZES the crossing (rose seam, sword node);
//      earnings live in the drawer; a collaborator stands in your writing world
//   2. first-run — both worlds have designed empty states (preview toggle in
//      the header simulates a brand-new account)
//   3. real data — crossings are built from your actual notifications
//      (sparks/comments/follows + timestamps); WIP picks the hottest
//      non-campaign manuscript; fixtures only where infra doesn't exist yet
//      (live reading presence)
//   4. time & ceremony — the hour tints each world; the dragon constellation
//      IGNITES on a real milestone (50k words / 100 sparks); the morning
//      letter is back, assembled from what happened while you were away
//   5. practical — a utility drawer below the fold (shelf, campaigns, quick
//      links), tap-to-lean on touch, a horizontal crossing on mobile,
//      keyboard-reachable tooltips
//   6. ritual — "make it yours": air (alive/calm) + your reading ink
//      (amethyst/teal/rose), persisted
// Palette from docs/VIDEO_BRIEF.md. Reader presence illustrative (see demo-kit).
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 45_000;
const RITUAL_KEY = "quiloria-spillover-ritual";
const LETTER_KEY = "quiloria-spillover-letter";

// the video brief's exact palette
const MAHOG = "rgb(17,14,10)";
const GOLD = "200,150,60";
const GOLDL = "224,178,96";
const TEALV = "59,110,122";
const PARCH = "242,232,208";
const RUBY = "158,59,66";
const ROSE = "184,105,122";
const ROSEL = "214,150,164";
const P = (a: number) => `rgba(${PARCH},${a})`;

// your reading ink — the one personalization that changes the world's color
const READ_INKS = {
  amethyst: { ink: "126,94,158", light: "168,140,200", label: "Amethyst" },
  teal: { ink: TEALV, light: "118,170,182", label: "Teal" },
  rose: { ink: ROSE, light: ROSEL, label: "Rose" },
} as const;
type ReadInk = keyof typeof READ_INKS;
interface Ritual { air: "alive" | "calm"; readInk: ReadInk }

// illustrative — the real build would show the user's actual last paragraph
const LAST_LINES = [
  "Mira counted the lights along the harbor and found one",
  "missing — the one that mattered. She told herself she",
  "would not look back at the window, and looked anyway.",
  "Someone had lit the lamp she left cold for nine years.",
  "She was halfway over the railing when the bell",
];

interface Crossing { label: string; dir: "out" | "home"; tone: "gold" | "ink" | "rose"; top: number }

// ── a quiet hover/focus card; the world speaks only when touched ────────────
function Tip({ children, eyebrow, title, sub, cta, className = "" }: { children: React.ReactNode; eyebrow: string; title: string; sub: string; cta?: string; className?: string }) {
  return (
    <div className={`group/tip relative ${className}`}>
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-max max-w-[270px] -translate-x-1/2 translate-y-1 rounded-xl border border-white/12 bg-black/80 px-3.5 py-3 opacity-0 backdrop-blur-md transition-all duration-200 group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:translate-y-0 group-hover/tip:opacity-100">
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-amber">{eyebrow}</span>
        <h3 className="mt-0.5 font-display text-[15px] leading-tight text-paper">{title}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">{sub}</p>
        {cta && <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-amber">{cta}</span>}
      </div>
    </div>
  );
}

// ── each world's air has its own motion: ink rises to leave, story settles in ─
function WorldAir({ color, rise, off }: { color: string; rise: boolean; off: boolean }) {
  if (off) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => {
        const left = 8 + arand(hash(`air-${color}-x-${i}`)) * 84;
        const top = 18 + arand(hash(`air-${color}-y-${i}`)) * 64;
        const size = 2 + arand(hash(`air-${color}-s-${i}`)) * 2.5;
        const dur = 9 + arand(hash(`air-${color}-d-${i}`)) * 8;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, backgroundColor: `rgba(${color},0.85)`, boxShadow: `0 0 ${size * 3}px rgba(${color},0.55)` }}
            animate={{ y: rise ? [0, -90] : [0, 70], opacity: [0, 0.75, 0] }}
            transition={{ duration: dur, delay: arand(hash(`air-${color}-t-${i}`)) * 9, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

export default function Spillover() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const { loaded, error, allStories, liveCampaigns, notifs } = useDashboardData(POLL_MS);
  const firstName = session?.user?.name?.split(" ")[0];

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const clockNow = now ?? CLOCK_FALLBACK;
  const phaseKey = phaseInfo(clockNow).key;
  const phaseRgb = PHASES[phaseKey].rgb;

  // ── ritual: make the home yours (persisted) ──
  const [ritual, setRitual] = useState<Ritual>(() => {
    if (typeof window === "undefined") return { air: "alive", readInk: "amethyst" };
    try {
      const raw = localStorage.getItem(RITUAL_KEY);
      if (raw) return JSON.parse(raw) as Ritual;
    } catch {}
    return { air: "alive", readInk: "amethyst" };
  });
  useEffect(() => {
    try { localStorage.setItem(RITUAL_KEY, JSON.stringify(ritual)); } catch {}
  }, [ritual]);
  const [ritualOpen, setRitualOpen] = useState(false);
  const INK = READ_INKS[ritual.readInk].ink;
  const INKL = READ_INKS[ritual.readInk].light;
  const still = !!reduce || ritual.air === "calm"; // ambient motion off; meaning-motion stays

  // ── preview: see the home as a brand-new user would ──
  const [firstNight, setFirstNight] = useState(false);

  // ── real signals ──
  const manuscript = useMemo(() => {
    if (firstNight) return null;
    const m = allStories.filter((s) => s.writingMode !== "campaign");
    return m.length ? [...m].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] : null;
  }, [allStories, firstNight]);
  const manuscriptHref = manuscript ? storyHref(manuscript) : "/create";
  const liveTable = firstNight ? null : (liveCampaigns.find((c) => c.activeSession) ?? null);
  const yourMove = !!liveTable?.myCharacter && liveTable.activeSession!.activePlayerId === liveTable.myCharacter.id;
  const liveHref = liveTable ? `/campaign/${liveTable.id}/play/${liveTable.activeSession!.id}` : null;
  const unread = useMemo(() => (firstNight ? [] : notifs.filter((n) => !n.read)), [firstNight, notifs]);
  const comments = useMemo(() => unread.filter((n) => n.type === "comment"), [unread]);
  const totalWords = allStories.reduce((a, s) => a + (s.totalWords || 0), 0);
  const totalSparks = allStories.reduce((a, s) => a + (s.sparkCount || 0), 0);
  const hasRead = !firstNight; // live reading presence/progress isn't in this hook yet — demo data
  const cur = READING_DEMO.current;
  const readPct = Math.round((cur.chapter / cur.of) * 100);

  // the dragon only takes form when enough ink has crossed — a real milestone
  const dragonLit = !firstNight && (totalWords >= 50_000 || totalSparks >= 100);

  // ── the crossing carries real events; fixtures only where data is silent ──
  const crossings = useMemo<Crossing[]>(() => {
    const out: Crossing[] = [];
    if (liveTable) out.push({ label: `⚔ ${yourMove ? "your move at" : "the table is lit —"} ${liveTable.title}`, dir: "home", tone: "rose", top: 30 });
    if (manuscript && manuscript.chapterCount > 0) out.push({ label: `Chapter ${manuscript.chapterCount} → your readers`, dir: "out", tone: "gold", top: liveTable ? 50 : 26 });
    const emoji: Record<string, string> = { spark: "✨", comment: "💬", follow: "❤" };
    for (const n of unread) {
      if (out.length >= 3) break;
      if (!emoji[n.type]) continue;
      out.push({ label: `${emoji[n.type]} ${n.message.slice(0, 38)}${n.message.length > 38 ? "…" : ""} · ${formatTimeAgo(n.createdAt)}`, dir: "home", tone: "ink", top: 26 + out.length * 19 });
    }
    if (firstNight) return [{ label: "a story is crossing toward you", dir: "out", tone: "gold", top: 40 }];
    if (out.length < 3) {
      const fill: Crossing[] = [
        { label: "💔 came home from São Paulo", dir: "home", tone: "ink", top: 64 },
        { label: "✨ Berlin underlined a line", dir: "home", tone: "ink", top: 44 },
      ];
      for (const f of fill) { if (out.length >= 3) break; out.push(f); }
    }
    return out.slice(0, 3);
  }, [liveTable, yourMove, manuscript, unread, firstNight]);

  // ── the morning letter: what happened while you were away ──
  const [letterGone, setLetterGone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(LETTER_KEY) === new Date().toDateString(); } catch { return false; }
  });
  const dismissLetter = () => {
    setLetterGone(true);
    try { localStorage.setItem(LETTER_KEY, new Date().toDateString()); } catch {}
  };
  const letterSummary = useMemo(() => {
    if (firstNight) return null;
    const c = { spark: 0, comment: 0, follow: 0, chapter: 0 } as Record<string, number>;
    for (const n of unread) if (c[n.type] !== undefined) c[n.type]++;
    const parts: string[] = [];
    if (c.spark) parts.push(`${c.spark} spark${c.spark === 1 ? "" : "s"}`);
    if (c.comment) parts.push(`${c.comment} note${c.comment === 1 ? "" : "s"}`);
    if (c.follow) parts.push(`${c.follow} new follower${c.follow === 1 ? "" : "s"}`);
    if (c.chapter) parts.push(`${c.chapter} new chapter${c.chapter === 1 ? "" : "s"} to read`);
    return parts.length ? parts.join(" · ") : null;
  }, [unread, firstNight]);

  const [lean, setLean] = useState<"write" | "read" | null>(null);
  const hour = clockNow.getHours();
  const hotWorld: "write" | "read" = manuscript && !(hour >= 20 || hour < 5) ? "write" : "read";
  const writeShare = lean === "write" ? "58%" : lean === "read" ? "42%" : hotWorld === "write" ? "54%" : "46%";

  // a live table seizes the crossing: the seam burns rose
  const seamHi = liveTable ? ROSEL : GOLDL;
  const seamLo = liveTable ? ROSE : INK;
  const seamLoL = liveTable ? ROSEL : INKL;

  return (
    <div className="relative min-h-screen overflow-x-hidden text-text" style={{ backgroundColor: MAHOG }}>
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          style={{ background: `radial-gradient(120% 120% at 50% 45%, transparent 0%, ${MAHOG} 60%)` }}
        />
      )}

      {/* ── floating chrome, barely there ── */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-5 pt-5 sm:px-8">
        <div className="pointer-events-auto">
          <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest">Concepts</span>
          </Link>
          <div className="mt-2 origin-top-left scale-90 opacity-50 transition-opacity hover:opacity-100">
            <ConceptSwitcher current="spillover" />
          </div>
          <button
            type="button"
            onClick={() => setFirstNight((v) => !v)}
            className={`mt-1.5 rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-widest transition-colors ${firstNight ? "border-amber/50 bg-amber/15 text-amber" : "border-white/10 text-text-ghost hover:text-text-secondary"}`}
          >
            {firstNight ? "previewing: first night" : "preview first night"}
          </button>
        </div>
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* ── your ritual: make the home yours ── */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRitualOpen((v) => !v)}
              aria-expanded={ritualOpen}
              className="flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3.5 font-mono text-[10px] uppercase tracking-widest text-text-secondary backdrop-blur transition-colors hover:text-paper"
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: `rgb(${GOLDL})` }} />Your ritual
            </button>
            {ritualOpen && (
              <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 35 }} className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/12 bg-black/85 p-4 backdrop-blur-md">
                <label className="block font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">The air</label>
                <div className="mt-1.5 flex gap-1.5">
                  {(["alive", "calm"] as const).map((a) => (
                    <button key={a} type="button" onClick={() => setRitual((r) => ({ ...r, air: a }))} className={`rounded-lg border px-3 py-1.5 text-[11px] capitalize transition-all ${ritual.air === a ? "border-amber/40 bg-amber/10 text-amber" : "border-white/10 text-text-ghost hover:text-text-secondary"}`}>
                      {a}
                    </button>
                  ))}
                </div>
                <label className="mt-3.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">Your reading ink</label>
                <div className="mt-1.5 flex gap-2">
                  {(Object.keys(READ_INKS) as ReadInk[]).map((k) => (
                    <button key={k} type="button" onClick={() => setRitual((r) => ({ ...r, readInk: k }))} aria-label={READ_INKS[k].label} className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${ritual.readInk === k ? "border-white/50 scale-110" : "border-white/10 hover:border-white/25"}`}>
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: `rgb(${READ_INKS[k].ink})`, boxShadow: `0 0 8px rgba(${READ_INKS[k].ink},0.7)` }} />
                    </button>
                  ))}
                </div>
                <p className="mt-3 font-reading text-[11px] italic leading-snug text-text-ghost">The writing world keeps its candle. The reading world is yours to tint.</p>
              </motion.div>
            )}
          </div>
          {now && <PhaseClock now={now} />}
        </div>
      </header>

      {!loaded ? (
        <div className="flex min-h-screen items-center justify-center">
          <p className="animate-pulse font-reading text-xl italic text-text-secondary">The worlds are waking…</p>
        </div>
      ) : error ? (
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-reading text-2xl italic text-text-secondary">The crossing is dark right now — try again in a moment.</p>
        </div>
      ) : (
        <>
          <div className="relative flex min-h-screen flex-col md:flex-row">
            {/* a burning table tints the whole night */}
            {liveTable && <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]" style={{ background: `radial-gradient(80% 60% at 50% 50%, rgba(${ROSE},0.06), transparent 70%)` }} />}

            {/* ════ THE WRITING WORLD — ember-gold, ink rising ════ */}
            <motion.section
              className="relative flex min-h-[56vh] items-center justify-center overflow-hidden md:min-h-screen"
              animate={{ flexBasis: writeShare }}
              initial={false}
              transition={{ type: "spring", stiffness: 60, damping: 20 }}
              style={{ flexGrow: 0, flexShrink: 0, background: `radial-gradient(110% 90% at 35% 40%, rgba(${GOLD},0.16), transparent 60%), linear-gradient(105deg, rgb(28,20,11), ${MAHOG})` }}
              onMouseEnter={() => setLean("write")}
              onMouseLeave={() => setLean(null)}
              onTouchStart={() => setLean("write")}
            >
              {/* the hour lives in the light */}
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `rgba(${phaseRgb},0.04)` }} />
              <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-display italic leading-none" style={{ fontSize: "clamp(110px, 20vw, 260px)", color: `rgba(${GOLDL},${lean === "write" ? 0.08 : 0.05})`, transition: "color .5s" }}>
                Write
              </span>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                animate={still ? { opacity: 0.8 } : { opacity: hotWorld === "write" || lean === "write" ? [0.7, 1, 0.78] : [0.35, 0.55, 0.4] }}
                transition={still ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{ background: `radial-gradient(60% 50% at 42% 48%, rgba(${GOLD},0.2), transparent 65%)` }}
              />
              <WorldAir color={GOLDL} rise off={still} />

              <div className="relative z-10 flex flex-col items-center px-8 py-24">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: `rgba(${GOLDL},0.8)` }}>
                  <PenLine className="h-3.5 w-3.5" />The writing world
                </span>

                {manuscript ? (
                  <>
                    {/* the page, still warm — your actual last words */}
                    <Tip eyebrow="Still warm" title={manuscript.title} sub={`${manuscript.chapterCount > 0 ? `Chapter ${manuscript.chapterCount}` : "Chapter 1"} · ${(manuscript.totalWords || 0).toLocaleString()} words — you stopped mid-sentence`} cta="Pick up the pen →" className="mt-6">
                      <Link href={manuscriptHref} className="block">
                        <motion.div
                          className="w-[330px] max-w-[78vw] -rotate-1 rounded-[3px] px-7 py-6 shadow-2xl sm:w-[380px]"
                          whileHover={reduce ? undefined : { y: -4, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 22 }}
                          style={{ background: `linear-gradient(180deg, rgb(${PARCH}), rgb(224,210,182))`, boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 70px rgba(${GOLD},0.25)` }}
                        >
                          <p className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(98,74,46,0.75)" }}>
                            {manuscript.title.slice(0, 30)}{manuscript.chapterCount > 0 ? ` — chapter ${manuscript.chapterCount}` : ""}
                          </p>
                          <div className="mt-3 space-y-1.5">
                            {LAST_LINES.map((l, i) => (
                              <p key={i} className="font-reading text-[13.5px] leading-relaxed" style={{ color: "rgb(58,44,30)" }}>
                                {l}
                                {i === LAST_LINES.length - 1 && (
                                  <motion.span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px]" style={{ backgroundColor: "rgb(58,44,30)" }} animate={reduce ? {} : { opacity: [1, 0, 1] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} />
                                )}
                              </p>
                            ))}
                          </div>
                          <p className="mt-3 font-reading text-[11px] italic" style={{ color: "rgba(98,74,46,0.7)" }}>— the ink hasn&apos;t dried.</p>
                        </motion.div>
                      </Link>
                    </Tip>

                    <Link href={manuscriptHref} className="group mt-7 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-semibold transition-transform hover:scale-[1.03]" style={{ backgroundColor: `rgb(${GOLDL})`, color: "rgb(30,20,10)", boxShadow: `0 0 36px rgba(${GOLD},0.4)` }}>
                      <PenLine className="h-4 w-4" />Pick up the pen<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>

                    {/* what crossed over for you — and who stands at your desk */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                      <Tip eyebrow="Letters from across" title={comments.length > 0 ? `${comments.length} reader note${comments.length === 1 ? "" : "s"}` : "No new letters"} sub={comments.length > 0 ? (comments[0]?.message ?? "carried over while you were away") : "the crossing is quiet tonight"} cta={comments.length > 0 ? "Read them →" : undefined}>
                        <Link href="/notifications" className="flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium transition-all hover:scale-[1.03]" style={{ borderColor: `rgba(${GOLDL},0.3)`, backgroundColor: `rgba(${GOLD},0.08)`, color: `rgb(${GOLDL})` }}>
                          <Mail className="h-3.5 w-3.5" />
                          {comments.length > 0 ? `${comments.length} reader note${comments.length === 1 ? "" : "s"}` : "No new letters"}
                        </Link>
                      </Tip>
                      <Tip eyebrow="At your desk with you" title="Maya left 2 suggestions" sub="your collaborator works in this world too — her notes are on the manuscript" cta="Look them over →">
                        <Link href="/notifications" className="flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium transition-all hover:scale-[1.03]" style={{ borderColor: `rgba(${TEALV},0.45)`, backgroundColor: `rgba(${TEALV},0.1)`, color: "rgb(126,178,190)" }}>
                          <Users className="h-3.5 w-3.5" />2 suggestions
                        </Link>
                      </Tip>
                    </div>
                  </>
                ) : (
                  /* ── first night: the desk is bare, and that's an invitation ── */
                  <>
                    <Tip eyebrow="A clean page" title="Nothing here yet but candlelight" sub="every story begins with one honest sentence — the desk is already yours" cta="Light the candle →" className="mt-6">
                      <Link href="/create" className="block">
                        <motion.div
                          className="w-[330px] max-w-[78vw] -rotate-1 rounded-[3px] px-7 py-8 shadow-2xl sm:w-[380px]"
                          whileHover={reduce ? undefined : { y: -4, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 22 }}
                          style={{ background: `linear-gradient(180deg, rgb(${PARCH}), rgb(224,210,182))`, boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 56px rgba(${GOLD},0.18)` }}
                        >
                          <p className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(98,74,46,0.6)" }}>An unwritten story</p>
                          <p className="mt-4 font-reading text-[14px] italic leading-relaxed" style={{ color: "rgba(98,74,46,0.55)" }}>
                            Every story begins with one honest sentence.
                            <motion.span className="ml-1 inline-block h-[1em] w-[2px] translate-y-[2px]" style={{ backgroundColor: "rgba(58,44,30,0.7)" }} animate={reduce ? {} : { opacity: [1, 0, 1] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} />
                          </p>
                          <div className="mt-5 space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="h-px w-full" style={{ backgroundColor: "rgba(98,74,46,0.18)" }} />)}</div>
                        </motion.div>
                      </Link>
                    </Tip>
                    <Link href="/create" className="group mt-7 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-semibold transition-transform hover:scale-[1.03]" style={{ backgroundColor: `rgb(${GOLDL})`, color: "rgb(30,20,10)", boxShadow: `0 0 36px rgba(${GOLD},0.4)` }}>
                      <PenLine className="h-4 w-4" />Write your first line<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <p className="mt-6 font-reading text-[13px] italic text-text-ghost">No pressure. The reading world is already flowing for you. →</p>
                  </>
                )}
              </div>
            </motion.section>

            {/* ── the crossing on small screens: a horizontal band between worlds ── */}
            <div className="relative z-20 h-16 w-full overflow-hidden md:hidden" aria-hidden>
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: `linear-gradient(90deg, rgba(${seamHi},0), rgba(${seamHi},0.7) 30%, rgba(${seamLoL},0.7) 70%, rgba(${seamLoL},0))` }} />
              <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-sm" style={{ borderColor: `rgba(${seamHi},0.45)`, background: `radial-gradient(circle, rgba(${seamHi},0.2), transparent 70%)` }}>
                {liveTable ? <Swords className="h-4 w-4" style={{ color: `rgb(${ROSEL})` }} /> : <span className="font-display text-[15px]" style={{ color: `rgb(${seamHi})` }}>✶</span>}
              </div>
              {!still && crossings[0] && (
                <motion.span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-2.5 py-0.5 font-mono text-[9px] backdrop-blur-sm" style={{ color: crossings[0].tone === "gold" ? `rgb(${GOLDL})` : crossings[0].tone === "rose" ? `rgb(${ROSEL})` : `rgb(${INKL})` }} animate={{ x: ["-30vw", "70vw"], opacity: [0, 1, 1, 0] }} transition={{ duration: 9, repeat: Infinity, repeatDelay: 4, ease: "easeInOut", times: [0, 0.15, 0.85, 1] }}>
                  {crossings[0].label}
                </motion.span>
              )}
            </div>

            {/* ════ THE READING WORLD — your ink, story settling in ════ */}
            <section
              className="relative flex min-h-[56vh] flex-1 items-center justify-center overflow-hidden md:min-h-screen"
              style={{ background: `radial-gradient(110% 90% at 62% 42%, rgba(${INK},0.18), transparent 62%), linear-gradient(255deg, rgb(26,18,30), rgb(15,12,15))` }}
              onMouseEnter={() => setLean("read")}
              onMouseLeave={() => setLean(null)}
              onTouchStart={() => setLean("read")}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `rgba(${phaseRgb},0.04)` }} />
              <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-display italic leading-none" style={{ fontSize: "clamp(110px, 20vw, 260px)", color: `rgba(${INKL},${lean === "read" ? 0.09 : 0.06})`, transition: "color .5s" }}>
                Read
              </span>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                animate={still ? { opacity: 0.8 } : { opacity: hotWorld === "read" || lean === "read" ? [0.7, 1, 0.78] : [0.35, 0.55, 0.4] }}
                transition={still ? {} : { duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ background: `radial-gradient(60% 50% at 58% 50%, rgba(${INK},0.2), transparent 65%)` }}
              />
              <WorldAir color={INKL} rise={false} off={still} />

              <div className="relative z-10 flex flex-col items-center px-8 py-20">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: `rgba(${INKL},0.9)` }}>
                  <BookOpen className="h-3.5 w-3.5" />The reading world
                </span>

                {hasRead ? (
                  <>
                    {/* your book — the real cover, lit from behind */}
                    <Tip eyebrow="Your bookmark is holding the page" title={cur.title} sub={`by ${cur.author} · Ch. ${cur.chapter} of ${cur.of} — the lamp is on, the tea is warm`} cta="Slip back in →" className="mt-6">
                      <Link href="/read" className="relative block">
                        <motion.div
                          aria-hidden
                          className="absolute -inset-8 rounded-full"
                          style={{ background: `radial-gradient(circle, rgba(${INK},0.32), transparent 65%)` }}
                          animate={still ? { opacity: 0.8 } : { opacity: [0.55, 1, 0.65] }}
                          transition={still ? {} : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div whileHover={reduce ? undefined : { y: -5, rotate: 0.5 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="relative">
                          <CoverArt seed={cur.id} title={cur.title} palette={genrePalette(cur.genre)} className="h-[204px] w-[144px] rounded-xl shadow-2xl ring-1 ring-white/20" titleSize="text-sm" />
                          <span aria-hidden className="absolute -top-1.5 right-5 h-12 w-[8px]" style={{ backgroundColor: `rgb(${RUBY})`, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%)", boxShadow: `0 0 10px rgba(${RUBY},0.5)` }} />
                        </motion.div>
                      </Link>
                    </Tip>

                    <div className="mt-4 w-[200px]">
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: `rgb(${INKL})` }} initial={reduce ? false : { width: 0 }} animate={{ width: `${readPct}%` }} transition={{ duration: 1, delay: 0.4 }} />
                      </div>
                      <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-text-ghost">Ch. {cur.chapter} of {cur.of} · by {cur.author}</p>
                    </div>

                    <Link href="/read" className="group mt-5 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-semibold transition-transform hover:scale-[1.03]" style={{ backgroundColor: `rgb(${INKL})`, color: "rgb(24,16,30)", boxShadow: `0 0 36px rgba(${INK},0.45)` }}>
                      <BookOpen className="h-4 w-4" />Slip back in<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </>
                ) : (
                  <p className="mt-6 max-w-[300px] text-center font-reading text-[17px] italic leading-relaxed text-text-secondary">What shall we read first tonight? The crossing has already brought you these —</p>
                )}

                {/* ── tonight's arrivals — bigger and central on a first night ── */}
                <div className={hasRead ? "mt-8 flex flex-col items-center" : "mt-6 flex flex-col items-center"}>
                  <span className="font-mono text-[9px] uppercase tracking-[0.24em]" style={{ color: `rgba(${INKL},0.65)` }}>The crossing brought you tonight</span>
                  <div className="mt-3 flex items-end gap-3">
                    {READING_DEMO.shelf.map((b, i) => (
                      <Tip key={b.id} eyebrow={b.fresh > 0 ? `${b.fresh} new chapter${b.fresh === 1 ? "" : "s"} since you left` : "Picked for you tonight"} title={b.title} sub={`by ${b.author} — drifted over from a writer's desk`} cta="Open it →">
                        <Link href="/browse" className="block">
                          <motion.div
                            initial={reduce ? false : { opacity: 0, x: -36, rotate: -4 }}
                            animate={{ opacity: 1, x: 0, rotate: i % 2 ? 1.5 : -1.5 }}
                            transition={{ delay: 0.5 + i * 0.18, type: "spring", stiffness: 160, damping: 20 }}
                          >
                            <motion.div
                              animate={still ? {} : { y: [0, -4, 0] }}
                              transition={{ duration: 4 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                              whileHover={reduce ? undefined : { y: -6, rotate: 0, scale: 1.04 }}
                              className="relative"
                            >
                              <CoverArt seed={b.id} title={hasRead ? "" : b.title} palette={genrePalette(b.genre)} className={hasRead ? "h-[88px] w-[62px] rounded-lg shadow-xl ring-1 ring-white/15" : "h-[150px] w-[106px] rounded-xl shadow-2xl ring-1 ring-white/20"} titleSize="text-[10px]" />
                              {b.fresh > 0 && hasRead && (
                                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-bold" style={{ backgroundColor: `rgb(${GOLDL})`, color: "rgb(40,26,12)" }}>{b.fresh}</span>
                              )}
                            </motion.div>
                          </motion.div>
                        </Link>
                      </Tip>
                    ))}
                  </div>
                  <Link href="/browse" className="group mt-3.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors" style={{ color: `rgba(${INKL},0.7)` }}>
                    Wander the stacks<ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>

                {hasRead && (
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                    <Tip eyebrow="Reading beside you" title="11 readers are in Ch. 7 tonight" sub="you're not reading alone — their lamps are lit too (live presence: coming with the real data layer)">
                      <div className="flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium" style={{ borderColor: `rgba(${INKL},0.35)`, backgroundColor: `rgba(${INK},0.1)`, color: `rgb(${INKL})` }}>
                        <span className="flex items-center gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.span key={i} className="block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `rgb(${GOLDL})`, boxShadow: `0 0 6px rgba(${GOLDL},0.8)` }} animate={still ? { opacity: 0.7 } : { opacity: [0.3, 1, 0.3] }} transition={still ? {} : { duration: 2 + i * 0.7, repeat: Infinity, ease: "easeInOut" }} />
                          ))}
                        </span>
                        11 reading with you
                      </div>
                    </Tip>
                    <Tip eyebrow="Tucked between the pages" title="Iris starred your note ✦" sub="the author read your marginalia — and kept it" cta="See it →">
                      <Link href="/notifications" className="flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium transition-all hover:scale-[1.03]" style={{ borderColor: `rgba(${GOLDL},0.3)`, backgroundColor: `rgba(${GOLD},0.08)`, color: `rgb(${GOLDL})` }}>
                        <Star className="h-3.5 w-3.5" style={{ fill: `rgba(${GOLDL},0.6)` }} />Iris starred your note
                      </Link>
                    </Tip>
                  </div>
                )}
              </div>
            </section>

            {/* ── shared sky: stars + the dragon that only forms across both worlds ── */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[34vh]">
              <svg viewBox="0 0 1200 220" preserveAspectRatio="xMidYMin slice" className="h-full w-full" fill="none">
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.circle
                    key={i}
                    cx={20 + arand(hash(`sps-x-${i}`)) * 1160}
                    cy={14 + arand(hash(`sps-y-${i}`)) * 190}
                    r={0.7 + arand(hash(`sps-r-${i}`)) * 1.1}
                    fill={P(0.85)}
                    animate={still ? { opacity: 0.35 } : { opacity: [0.08, 0.6, 0.08] }}
                    transition={still ? {} : { duration: 2.5 + arand(hash(`sps-d-${i}`)) * 4, delay: arand(hash(`sps-t-${i}`)) * 5, repeat: Infinity, ease: "easeInOut" }}
                  />
                ))}
                {/* unlit: almost invisible. lit (a real milestone): the form resolves */}
                <motion.path
                  d="M 420 150 C 470 118 510 128 552 106 C 594 84 640 96 686 78 C 718 66 748 72 776 58 M 552 106 L 524 66 M 524 66 L 498 92 M 686 78 L 716 40 M 716 40 L 742 66"
                  stroke={dragonLit ? `rgba(${GOLDL},0.4)` : P(0.09)}
                  strokeWidth={dragonLit ? 1.4 : 1}
                  animate={dragonLit && !still ? { opacity: [0.6, 1, 0.7] } : {}}
                  transition={dragonLit && !still ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : {}}
                  style={dragonLit ? { filter: `drop-shadow(0 0 6px rgba(${GOLD},0.5))` } : undefined}
                />
                {[[420, 150], [486, 122], [552, 106], [620, 90], [686, 78], [776, 58], [524, 66], [498, 92], [716, 40], [742, 66]].map(([x, y], i) => (
                  <motion.circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={i === 5 ? (dragonLit ? 3 : 2.2) : dragonLit ? 2 : 1.4}
                    fill={i === 5 ? `rgb(${RUBY})` : dragonLit ? `rgb(${GOLDL})` : P(0.8)}
                    style={dragonLit ? { filter: `drop-shadow(0 0 5px ${i === 5 ? `rgba(${RUBY},0.9)` : `rgba(${GOLDL},0.8)`})` } : undefined}
                    animate={still ? { opacity: dragonLit ? 0.9 : 0.45 } : { opacity: dragonLit ? [0.7, 1, 0.7] : [0.2, 0.85, 0.2] }}
                    transition={still ? {} : { duration: 3 + arand(hash(`spd-${i}`)) * 3, delay: arand(hash(`spdt-${i}`)) * 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                ))}
              </svg>
            </div>
            {/* the dragon can be asked about */}
            <div className="absolute left-[44%] top-[4vh] z-30 hidden h-[14vh] w-[14%] md:block">
              <Tip
                eyebrow="In the stars"
                title={dragonLit ? "The dragon woke" : "Something is taking form"}
                sub={dragonLit ? `${totalWords >= 50_000 ? `${totalWords.toLocaleString()} words have crossed from your desk` : `${totalSparks.toLocaleString()} sparks have come home to you`} — it has your story's shape now` : "when enough ink crosses between your worlds, it becomes something alive"}
                className="h-full w-full"
              >
                <div className="h-full w-full" tabIndex={0} role="img" aria-label={dragonLit ? "The dragon constellation, lit by your milestone" : "A faint constellation, not yet formed"} />
              </Tip>
            </div>

            {/* ── THE CROSSING — desktop seam, seized by the table when one burns ── */}
            <div className="pointer-events-none absolute inset-y-0 z-20 hidden w-[440px] md:block" style={{ left: `calc(${writeShare} - 220px)`, transition: "left 0.6s cubic-bezier(0.3,0.7,0.4,1)" }}>
              <svg viewBox="0 0 180 1000" preserveAspectRatio="none" className="absolute left-1/2 h-full w-[180px] -translate-x-1/2" fill="none">
                <defs>
                  <linearGradient id="sp-seam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`rgba(${seamHi},0)`} />
                    <stop offset="18%" stopColor={`rgba(${seamHi},0.6)`} />
                    <stop offset="50%" stopColor={liveTable ? `rgba(${ROSE},0.55)` : `rgba(${GOLD},0.45)`} />
                    <stop offset="82%" stopColor={`rgba(${seamLo},0.6)`} />
                    <stop offset="100%" stopColor={`rgba(${seamLo},0)`} />
                  </linearGradient>
                </defs>
                <path d="M 90 0 C 60 180 120 320 84 500 C 52 660 124 820 90 1000" stroke="url(#sp-seam)" strokeWidth="18" opacity="0.15" style={{ filter: "blur(10px)" }} />
                <path d="M 90 0 C 60 180 120 320 84 500 C 52 660 124 820 90 1000" stroke="url(#sp-seam)" strokeWidth="2.5" opacity="0.8" />
                {!still && Array.from({ length: 18 }).map((_, i) => {
                  const d = 7 + arand(hash(`sp-d-${i}`)) * 8;
                  const begin = `${(-arand(hash(`sp-b-${i}`)) * d).toFixed(2)}s`;
                  const up = i % 3 === 0;
                  return (
                    <circle key={i} r={1.2 + arand(hash(`sp-r-${i}`)) * 1.6} fill={up ? `rgb(${seamLoL})` : `rgb(${seamHi})`} opacity="0.85">
                      <animateMotion dur={`${d.toFixed(2)}s`} repeatCount="indefinite" begin={begin} path="M 90 0 C 60 180 120 320 84 500 C 52 660 124 820 90 1000" keyPoints={up ? "1;0" : "0;1"} keyTimes="0;1" />
                      <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.88;1" dur={`${d.toFixed(2)}s`} repeatCount="indefinite" begin={begin} />
                    </circle>
                  );
                })}
              </svg>

              {/* the heart of the crossing — or the table, when one is burning */}
              <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {liveTable ? (
                  <Tip eyebrow={yourMove ? "Your move" : "Live · the table is lit"} title={liveTable.title} sub={yourMove ? "the table is holding its breath for you" : `${liveTable.playerCount} at the table — pull up a chair`} cta={yourMove ? "Take your turn →" : "Sit down →"}>
                    <Link href={liveHref!} className="block">
                      <motion.div
                        className="flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-sm"
                        style={{ borderColor: `rgba(${ROSEL},0.6)`, background: `radial-gradient(circle, rgba(${ROSE},0.32), transparent 70%)`, boxShadow: `0 0 40px rgba(${ROSE},0.5)` }}
                        animate={reduce ? {} : { scale: [1, 1.12, 1] }}
                        transition={reduce ? {} : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Swords className="h-5 w-5" style={{ color: `rgb(${ROSEL})` }} />
                      </motion.div>
                    </Link>
                  </Tip>
                ) : (
                  <Tip eyebrow="The crossing" title="Where your worlds touch" sub={`your words flow out to readers; their sparks come home — ${crossings.length} crossing${crossings.length === 1 ? "" : "s"} tonight`}>
                    <motion.div
                      className="flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-sm"
                      style={{ borderColor: `rgba(${GOLDL},0.45)`, background: `radial-gradient(circle, rgba(${GOLD},0.22), rgba(${INK},0.14) 70%, transparent)`, boxShadow: `0 0 30px rgba(${GOLD},0.35), 0 0 60px rgba(${INK},0.2)` }}
                      animate={still ? {} : { scale: [1, 1.07, 1] }}
                      transition={still ? {} : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                      tabIndex={0}
                    >
                      <span className="font-display text-[20px]" style={{ color: `rgb(${GOLDL})`, textShadow: `0 0 12px rgba(${GOLDL},0.9)` }}>✶</span>
                    </motion.div>
                  </Tip>
                )}
              </div>

              {/* named crossings — real events travelling between your worlds */}
              {!still && crossings.map((c, i) => {
                const out = c.dir === "out";
                const color = c.tone === "gold" ? GOLDL : c.tone === "rose" ? ROSEL : INKL;
                return (
                  <motion.div
                    key={`${c.label}-${i}`}
                    className="absolute left-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-3 py-1 font-mono text-[9.5px] backdrop-blur-sm"
                    style={{ top: `${c.top}%`, color: `rgb(${color})` }}
                    animate={{ x: out ? [-215, 95] : [95, -215], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 11 + i * 2.5, delay: i * 3.5, repeat: Infinity, repeatDelay: 5, ease: "easeInOut", times: [0, 0.18, 0.82, 1] }}
                  >
                    {!out && <span aria-hidden>←</span>}
                    {c.label}
                    {out && <span aria-hidden>→</span>}
                  </motion.div>
                );
              })}
            </div>

            {/* ── the greeting, floating in the shared sky ── */}
            <div className="pointer-events-none absolute inset-x-0 top-[12vh] z-30 hidden flex-col items-center px-6 text-center md:flex">
              <InkHeadline text={firstNight ? `Welcome${firstName ? `, ${firstName}` : ""}.` : `${greeting(clockNow)}${firstName ? `, ${firstName}` : ""}.`} reduce={reduce} />
              <motion.p className="mt-1.5 font-reading text-[15px] italic text-text-secondary" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.8 }}>
                {firstNight ? "Two worlds, and both of them are yours." : `${PHASES[phaseKey].mood} — both of your worlds are lit.`}
              </motion.p>
            </div>

            {/* ── the morning letter: what happened while you were away ── */}
            {!firstNight && !letterGone && letterSummary && (
              <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.7 }} className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
                <div className="flex items-center gap-2.5 rounded-full border border-white/12 bg-black/55 py-1.5 pl-4 pr-1.5 backdrop-blur-md">
                  <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: `rgb(${GOLDL})` }} />
                  <Link href="/notifications" className="font-mono text-[10px] text-text-secondary transition-colors hover:text-paper">
                    <span style={{ color: `rgb(${GOLDL})` }}>While you were away</span> — {letterSummary}
                  </Link>
                  <button type="button" onClick={dismissLetter} aria-label="Tuck the letter away" className="flex h-6 w-6 items-center justify-center rounded-full text-text-ghost transition-colors hover:bg-white/10 hover:text-paper">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── the drawer is one scroll below ── */}
            <motion.div aria-hidden className="pointer-events-none absolute bottom-1 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center md:flex" animate={still ? { opacity: 0.5 } : { y: [0, 4, 0], opacity: [0.4, 0.7, 0.4] }} transition={still ? {} : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
              <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-text-ghost">the desk drawer</span>
              <span className="text-text-ghost">⌄</span>
            </motion.div>
          </div>

          {/* ════ THE DESK DRAWER — the practical layer, one scroll away ════ */}
          <section className="relative border-t border-white/5" style={{ background: `linear-gradient(180deg, ${MAHOG}, rgb(13,11,8))` }}>
            <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
              <div className="flex items-center gap-3">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">The desk drawer</h2>
                <span className="h-px flex-1 bg-white/5" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">everything else, in its place</span>
              </div>

              {allStories.length > 0 && !firstNight ? (
                <div className="mt-7 grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-7">
                  {allStories.slice(0, 7).map((s) => {
                    const live = liveCampaigns.some((c) => c.id === s.id && c.activeSession);
                    const chip = s.writingMode === "campaign" ? (live ? { t: "Live", c: ROSE } : { t: "Campaign", c: "124,160,116" }) : s.status === "draft" ? { t: "Draft", c: GOLD } : { t: s.format, c: "208,136,88" };
                    return (
                      <motion.div key={s.id} whileHover={reduce ? undefined : { y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                        <Link href={storyHref(s)}>
                          <div className="relative">
                            <CoverArt seed={s.id} title={s.title} className="aspect-[3/4] rounded-xl shadow-lg ring-1 ring-white/10" titleSize="text-xs" image={s.coverImageUrl} />
                            <span className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-black" style={{ backgroundColor: `rgb(${chip.c})` }}>{chip.t}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between px-0.5 font-mono text-[9px] text-text-ghost">
                            <span>{s.chapterCount > 0 ? `${s.chapterCount} ch` : "draft"}</span>
                            <span>{(s.totalWords || 0).toLocaleString()}w</span>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-7 font-reading text-[15px] italic text-text-ghost">The drawer is empty — it fills as your worlds do.</p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-2.5">
                {[
                  { label: "Earnings", sub: "240 drops this week", href: "/creator/earnings", Icon: Coins, c: "208,136,88" },
                  { label: "Scriptorium", sub: "your commissions", href: "/scriptorium", Icon: Sparkles, c: ROSE },
                  { label: "Workshop", sub: "suggestions & lore", href: "/notifications", Icon: Users, c: "94,139,130" },
                  { label: "All letters", sub: `${unread.length} unread`, href: "/notifications", Icon: Mail, c: GOLD },
                  { label: "Wander the stacks", sub: "browse everything", href: "/browse", Icon: BookOpen, c: INK },
                ].map((l) => (
                  <Link key={l.label} href={l.href} className="flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-white/15">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `rgba(${l.c},0.14)`, color: `rgb(${l.c})` }}><l.Icon className="h-4 w-4" /></span>
                    <span>
                      <span className="block font-display text-[13.5px] leading-tight text-paper">{l.label}</span>
                      <span className="block font-mono text-[9px] uppercase tracking-wider text-text-ghost">{l.sub}</span>
                    </span>
                  </Link>
                ))}
              </div>

              <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                {totalWords.toLocaleString()} words · {totalSparks.toLocaleString()} sparks · {READING_DEMO.streak}-night reading streak
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
