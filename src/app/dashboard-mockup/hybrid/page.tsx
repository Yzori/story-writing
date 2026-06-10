"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Feather,
  MapPin,
  BookOpen,
  Map as MapIcon,
  Compass,
  ChevronRight,
} from "lucide-react";
import {
  useDashboardData,
  storyHref,
  type MockNotification,
  type MockCampaign,
} from "@/components/dashboard-mockup/useDashboardData";
import {
  RealmMap,
  LoadingMap,
  TornMap,
  layoutRegions,
  layoutSettlements,
  relativeShort,
  chartedPct,
} from "@/components/dashboard-mockup/realm-map";
import type { ApiStory } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// 🗺️✶ Realm × Clarity hybrid.
// The map is the atmospheric HERO (sets mood, gives a spatial overview, marks
// "you are here"). But every fact the user needs to act stays LITERAL and
// scannable in panels below: a Resume card, a works grid with status badges +
// a "% charted" progress meter, a live-tables list, and readable letters.
// Principle: ambient skin, explicit controls — never decode a glyph for a number.
// ─────────────────────────────────────────────────────────────────────────────

const NOTIF_LABELS: Record<string, string> = {
  comment: "a margin note",
  spark: "a spark",
  follow: "a new reader",
  chapter: "a new chapter",
  update: "an update",
};

function storyKind(s: ApiStory): { label: string; cls: string } {
  if (s.writingMode === "campaign") return { label: "Campaign", cls: "bg-sage/15 text-sage border-sage/30" };
  if (s.format === "webtoon") return { label: "Webtoon", cls: "bg-lavender/15 text-lavender border-lavender/30" };
  if (s.status === "draft") return { label: "Draft", cls: "bg-amber/15 text-amber border-amber/30" };
  if (s.status === "published") return { label: "Published", cls: "bg-teal/15 text-teal border-teal/30" };
  return { label: "Writing", cls: "bg-copper/15 text-copper border-copper/30" };
}

export default function HybridDashboardMockup() {
  const reduce = useReducedMotion();
  const { data: session } = useSession();
  const { loaded, error, allStories, activeStory, activeHref, notifs, liveCampaigns, unreadComments } =
    useDashboardData();

  const firstName = session?.user?.name?.split(" ")[0];

  const regionStories = useMemo(() => allStories.filter((s) => s.writingMode !== "campaign"), [allStories]);
  const regions = useMemo(() => layoutRegions(regionStories), [regionStories]);
  const settlements = useMemo(() => layoutSettlements(liveCampaigns), [liveCampaigns]);
  const dispatches = useMemo(() => notifs.slice(0, 4), [notifs]);
  const isEmpty = loaded && !error && allStories.length === 0;

  return (
    <div className="min-h-screen bg-void text-text">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_25%_15%,rgba(168,128,48,0.12),transparent_55%),radial-gradient(circle_at_85%_95%,rgba(122,92,50,0.14),transparent_60%)]" />

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-20">
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard-mockup" className="flex items-center gap-1.5 text-sm text-text-ghost transition-colors hover:text-text">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-mono text-[11px] uppercase tracking-widest">Concepts</span>
            </Link>
            <span className="text-border">/</span>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber/25 bg-amber/10 text-amber">
                <Compass size={17} />
              </span>
              <div>
                <h1 className="font-display text-xl leading-none text-paper">
                  {firstName ? `${firstName}'s Atlas` : "Your Atlas"}
                </h1>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">the realm, as charted</span>
              </div>
            </div>
          </div>
          <span className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-amber/70 md:flex">
            <Feather className="h-3.5 w-3.5" />
            ink reveals the world
          </span>
        </header>

        {/* ── Hero: map (atmosphere) + explicit resume card (control) ── */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_330px]">
          <div className="relative overflow-hidden rounded-2xl border border-amber/20 bg-[#1a140c] shadow-2xl shadow-black/50">
            {!loaded && <LoadingMap reduce={reduce} />}
            {loaded && error && regions.length === 0 && settlements.length === 0 && <TornMap />}
            {loaded && !error && (
              <RealmMap
                regions={regions}
                settlements={settlements}
                activeId={activeStory && activeStory.writingMode !== "campaign" ? activeStory.id : null}
                dispatchCount={dispatches.length}
                reduce={reduce}
                isEmpty={isEmpty}
              />
            )}
            {/* a quiet caption so the map reads as overview, not the only control */}
            <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5C4423]/80">
              regions = stories · fog = words unwritten · keeps = live tables
            </div>
          </div>

          <ResumeCard loaded={loaded} activeStory={activeStory} activeHref={activeHref} isEmpty={isEmpty} unreadComments={unreadComments} reduce={reduce} />
        </section>

        {/* ── Charted lands: the scannable works grid (clarity) ── */}
        <section className="mt-8">
          <SectionTitle icon={<BookOpen size={15} />} eyebrow="Charted lands" title={isEmpty ? "No lands charted yet" : "Your works"} action={!isEmpty && loaded ? { label: "Open library", href: "/browse" } : undefined} />
          {!loaded ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl border border-border-subtle bg-elevated/50" />
              ))}
            </div>
          ) : isEmpty ? (
            <Link href="/create" className="block rounded-2xl border border-dashed border-amber/30 bg-elevated/30 p-8 text-center transition-colors hover:border-amber/50">
              <Compass size={22} className="mx-auto mb-3 text-amber" />
              <p className="font-display text-lg text-paper">Chart your first land</p>
              <p className="mt-1 font-reading text-sm italic text-text-secondary">The realm is fog. Set down a story and the coastlines appear.</p>
            </Link>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allStories.slice(0, 6).map((s) => (
                <WorkCard key={s.id} story={s} active={activeStory?.id === s.id} />
              ))}
            </div>
          )}
        </section>

        {/* ── Two columns: live tables + letters (clarity) ── */}
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div>
            <SectionTitle icon={<MapIcon size={15} />} eyebrow="Settlements" title={liveCampaigns.length === 0 ? "No tables open" : "Your live tables"} action={liveCampaigns.length > 0 ? { label: "All campaigns", href: "/campaign" } : { label: "Start one", href: "/create" }} />
            <div className="space-y-2.5">
              {!loaded ? (
                [0, 1].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-2xl border border-border-subtle bg-elevated/50" />)
              ) : liveCampaigns.length === 0 ? (
                <Link href="/create" className="block rounded-2xl border border-dashed border-border bg-elevated/30 p-4 text-[12.5px] italic text-text-ghost transition-colors hover:border-sage/30 hover:text-text-secondary">
                  No keeps on the map yet — start a campaign to raise one.
                </Link>
              ) : (
                liveCampaigns.slice(0, 3).map((c) => <TableRow key={c.id} camp={c} />)
              )}
            </div>
          </div>

          <div>
            <SectionTitle icon={<span className="text-[15px] leading-none">🕊️</span>} eyebrow="Dispatches" title={dispatches.length === 0 ? "The post is quiet" : "Letters by raven"} action={notifs.length > 4 ? { label: "See all", href: "/notifications" } : undefined} />
            <div className="space-y-2.5">
              {!loaded ? (
                [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl border border-border-subtle bg-elevated/50" />)
              ) : dispatches.length === 0 ? (
                <p className="rounded-2xl border border-border bg-elevated/40 p-4 text-[12.5px] italic text-text-ghost">No ravens on the wind. New notes, sparks, and readers will land here.</p>
              ) : (
                dispatches.map((n) => <LetterRow key={n.id} n={n} />)
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Resume card: the single most explicit control ────────────────────────────
function ResumeCard({
  loaded,
  activeStory,
  activeHref,
  isEmpty,
  unreadComments,
  reduce,
}: {
  loaded: boolean;
  activeStory: ApiStory | null;
  activeHref: string;
  isEmpty: boolean;
  unreadComments: number;
  reduce: boolean | null;
}) {
  if (!loaded) {
    return <div className="h-full min-h-[200px] animate-pulse rounded-2xl border border-amber/20 bg-elevated/40" />;
  }
  if (isEmpty || !activeStory) {
    return (
      <Link href="/create" className="group flex flex-col justify-center rounded-2xl border border-amber/40 bg-gradient-to-br from-amber/15 to-copper/10 p-5 transition-all hover:border-amber/60">
        <div className="flex items-center gap-2 text-amber">
          <Compass className="h-5 w-5" />
          <span className="font-display text-xl text-paper">Begin the survey</span>
        </div>
        <p className="mt-2 font-reading text-sm italic text-text-secondary">Pick a format — novel, webtoon, or campaign — and the first coastline appears.</p>
        <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-void">Start a story</span>
      </Link>
    );
  }

  const pct = chartedPct(activeStory.totalWords || 0);
  const chapterLabel = activeStory.chapterCount > 0 ? `Chapter ${activeStory.chapterCount}` : "Chapter 1";

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-amber/40 bg-gradient-to-br from-amber/15 to-copper/10 p-5 shadow-lg shadow-amber/5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber/10 blur-2xl" />
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-amber/80">
        <MapPin className="h-3.5 w-3.5" />
        currently surveying
      </div>
      <div className="mt-2 font-display text-2xl leading-tight text-paper">{activeStory.title}</div>

      {/* explicit facts — no decoding required */}
      <div className="mt-1 font-mono text-[11px] text-text-secondary">
        {chapterLabel} · {(activeStory.totalWords || 0).toLocaleString()} words
        {unreadComments > 0 && <span className="text-amber"> · {unreadComments} reader note{unreadComments === 1 ? "" : "s"}</span>}
      </div>

      {/* "% charted" — the fog-of-war idea, made literal */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-text-ghost">
          <span>charted</span>
          <span className="text-amber">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-void/50 ring-1 ring-amber/15">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber to-copper"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
      </div>

      <Link href={activeHref} className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber px-4 py-2.5 text-sm font-semibold text-void transition-colors hover:bg-amber/90">
        <Feather className="h-4 w-4" />
        Resume writing
      </Link>
    </div>
  );
}

// ── one work card — clear badge + counts + literal "% charted" meter ──────────
function WorkCard({ story, active }: { story: ApiStory; active: boolean }) {
  const kind = storyKind(story);
  const pct = chartedPct(story.totalWords || 0);
  const progress = story.chapterCount > 0 ? `${story.chapterCount} chapter${story.chapterCount === 1 ? "" : "s"} · ${(story.totalWords || 0).toLocaleString()}w` : `${(story.totalWords || 0).toLocaleString()} words`;
  return (
    <Link href={storyHref(story)} className={`group relative overflow-hidden rounded-2xl border bg-surface/70 p-4 transition-all hover:-translate-y-0.5 hover:border-amber/40 ${active ? "border-amber/40 ring-1 ring-amber/20" : "border-border-subtle"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${kind.cls}`}>{kind.label}</span>
        {active ? (
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-amber"><MapPin size={11} /> here</span>
        ) : (
          <ChevronRight size={15} className="text-text-ghost transition-colors group-hover:text-amber" />
        )}
      </div>
      <h3 className="mt-3 line-clamp-1 font-display text-lg text-paper">{story.title}</h3>
      <p className="mt-0.5 font-mono text-[11px] text-text-secondary">{progress}</p>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-text-ghost">
          <span>charted</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-void/40">
          <div className={`h-full rounded-full ${active ? "bg-gradient-to-r from-amber to-copper" : "bg-copper/60"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}

// ── one live-table row — role + players + session state, all literal ──────────
function TableRow({ camp }: { camp: MockCampaign }) {
  const inSession = !!camp.activeSession;
  const href = inSession ? `/campaign/${camp.id}/play/${camp.activeSession!.id}` : `/campaign/${camp.id}`;
  const role = camp.role === "gm" || camp.role === "both" ? "GMing" : camp.myCharacter ? `As ${camp.myCharacter.name}` : "Player";
  return (
    <Link href={href} className="flex items-center gap-3.5 rounded-2xl border border-border-subtle bg-surface/70 p-4 transition-colors hover:border-sage/40">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-subtle/30 text-sage">
        <MapIcon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">{role}</span>
        <span className="mt-0.5 block truncate font-display text-base text-paper">{camp.title}</span>
      </span>
      <span className="shrink-0 text-right">
        {inSession ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/30 bg-sage/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-sage">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" />
            in session
          </span>
        ) : (
          <span className="font-mono text-[11px] text-text-secondary">no live session</span>
        )}
        <span className="mt-1 block font-mono text-[10px] text-text-ghost">{camp.playerCount} at table</span>
      </span>
    </Link>
  );
}

// ── one letter — readable message + type label + time ────────────────────────
function LetterRow({ n }: { n: MockNotification }) {
  const subject = NOTIF_LABELS[n.type] ?? "a letter";
  return (
    <Link href={n.href || "/notifications"} className="group flex gap-3 rounded-2xl border border-border-subtle bg-surface/70 p-3.5 transition-colors hover:border-amber/30">
      <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose/80 to-burnt/70 text-[13px] ring-1 ring-burnt/40">
        ✶
        {!n.read && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber ring-2 ring-surface" />}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-text-ghost">{subject}</span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-text group-hover:text-paper">{n.message}</span>
        <span className="mt-1 block font-mono text-[10px] text-text-ghost">{relativeShort(n.createdAt)}</span>
      </span>
    </Link>
  );
}

// ── shared section header ─────────────────────────────────────────────────────
function SectionTitle({
  icon,
  eyebrow,
  title,
  action,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-3.5 flex items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
          <span className="text-amber/80">{icon}</span>
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-xl text-paper">{title}</h2>
      </div>
      {action && (
        <Link href={action.href} className="hidden items-center gap-1 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary transition-colors hover:text-paper sm:flex">
          {action.label}
          <ChevronRight size={13} />
        </Link>
      )}
    </div>
  );
}
