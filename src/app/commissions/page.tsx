"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface Artisan {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Offering {
  id: string;
  craft: CraftType;
  title: string;
  description: string;
  priceMin: number;
  priceMax: number;
  deliveryDays: number;
  revisionRounds: number;
  completedCount: number;
  portfolioUrls: string[];
  artisan: Artisan;
}

interface UserStory {
  id: string;
  title: string;
}

interface PastCommission {
  id: string;
  status: string;
  brief: string;
  createdAt: string;
  offering: { id: string; title: string; craft: CraftType };
  artisan: { id: string; displayName: string };
}

type CraftType =
  | "custom-chapter"
  | "cover-art"
  | "character-art"
  | "editing"
  | "poetry"
  | "worldbuilding"
  | "gm-for-hire"
  | "webtoon-panels"
  | "screenplay-coverage"
  | "scene-illustration"
  | "ghostwriting"
  | "story-bible";

type Hall = "writing" | "visual" | "services";

// ── Hall metadata ───────────────────────────────────────────────────────────

const HALLS: Array<{
  id: Hall;
  label: string;
  byline: string;
  body: string;
  tone: { text: string; border: string; soft: string };
  crafts: CraftType[];
}> = [
  {
    id: "visual",
    label: "Visual artists",
    byline: "Art that sits inside your story.",
    body:
      "Cover artists, character designers, webtoon panelists, and scene illustrators who read the chapter before they sketch.",
    tone: { text: "text-violet", border: "border-violet/30", soft: "bg-violet/[0.06]" },
    crafts: ["cover-art", "character-art", "scene-illustration", "webtoon-panels"],
  },
  {
    id: "writing",
    label: "Writing and editing",
    byline: "Words for hire — chapters, edits, ghostwriting, verse.",
    body:
      "Writers who know what a margin note is for. Custom chapters, line edits, ghostwriting, poetry, screenplay coverage.",
    tone: { text: "text-amber", border: "border-amber/30", soft: "bg-amber/[0.06]" },
    crafts: ["custom-chapter", "ghostwriting", "editing", "poetry", "screenplay-coverage"],
  },
  {
    id: "services",
    label: "Story services",
    byline: "Structure for the world behind the story.",
    body:
      "Worldbuilders, GMs for hire, story-bible keepers. The people who keep your map honest and your continuity standing.",
    tone: { text: "text-teal", border: "border-teal/30", soft: "bg-teal/[0.06]" },
    crafts: ["worldbuilding", "gm-for-hire", "story-bible"],
  },
];

const CRAFT_LABELS: Record<CraftType, string> = {
  "custom-chapter": "Custom Chapter",
  ghostwriting: "Ghostwriting",
  poetry: "Poetry",
  "screenplay-coverage": "Screenplay Coverage",
  editing: "Editing",
  "cover-art": "Cover Art",
  "character-art": "Character Art",
  "webtoon-panels": "Webtoon Panels",
  "scene-illustration": "Scene Illustration",
  worldbuilding: "Worldbuilding",
  "gm-for-hire": "GM for Hire",
  "story-bible": "Story Bible",
};

function craftToHall(craft: CraftType): Hall {
  for (const h of HALLS) if (h.crafts.includes(craft)) return h.id;
  return "writing";
}

function craftLabel(craft: CraftType): string {
  return CRAFT_LABELS[craft] ?? craft;
}

function relativeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Mode = "browse" | "brief";

export default function CommissionsPage() {
  const { data: session } = useSession();

  const [mode, setMode] = useState<Mode>("browse");
  const [filter, setFilter] = useState<Hall | "all">("all");
  const [query, setQuery] = useState("");

  // Offerings
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOffering, setModalOffering] = useState<Offering | null>(null);
  const [prefillBrief, setPrefillBrief] = useState<string>("");

  // Past commissions → past artists rail
  const [pastCommissions, setPastCommissions] = useState<PastCommission[]>([]);

  // Brief mode state
  const [briefHall, setBriefHall] = useState<Hall | null>(null);
  const [briefCraft, setBriefCraft] = useState<CraftType | null>(null);
  const [briefText, setBriefText] = useState("");
  const [briefBudget, setBriefBudget] = useState("");
  const [briefTimeline, setBriefTimeline] = useState<"flexible" | "soon" | "rush">("soon");

  // ── Fetch offerings ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/scriptorium/offerings?limit=50")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.offerings) setOfferings(data.offerings);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Fetch past commissions (patron role) ─────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    fetch("/api/scriptorium/commissions?role=patron")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.commissions)) setPastCommissions(data.commissions);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // ── Derived ─────────────────────────────────────────────────────────
  const filteredOfferings = useMemo(() => {
    return offerings.filter((o) => {
      if (filter !== "all" && craftToHall(o.craft) !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          o.title.toLowerCase().includes(q) ||
          o.artisan.displayName.toLowerCase().includes(q) ||
          craftLabel(o.craft).toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [offerings, filter, query]);

  const hallCounts = useMemo(() => {
    const counts: Record<Hall, number> = { writing: 0, visual: 0, services: 0 };
    for (const o of offerings) counts[craftToHall(o.craft)]++;
    return counts;
  }, [offerings]);

  // Past artists — dedupe by artisan id, take 6 most recent
  const pastArtists = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{
      artisanId: string;
      artisanName: string;
      hall: Hall;
      craftLabel: string;
      delivered: string;
      when: string;
    }> = [];
    for (const c of pastCommissions) {
      if (seen.has(c.artisan.id)) continue;
      seen.add(c.artisan.id);
      result.push({
        artisanId: c.artisan.id,
        artisanName: c.artisan.displayName,
        hall: craftToHall(c.offering.craft),
        craftLabel: craftLabel(c.offering.craft),
        delivered: c.offering.title,
        when: relativeShort(c.createdAt),
      });
      if (result.length >= 6) break;
    }
    return result;
  }, [pastCommissions]);

  // Brief mode matches
  const briefMatches = useMemo(() => {
    if (!briefHall) return [] as Offering[];
    return offerings
      .filter((o) => craftToHall(o.craft) === briefHall && (!briefCraft || o.craft === briefCraft))
      .slice(0, 4);
  }, [offerings, briefHall, briefCraft]);

  function openCommissionModalWithBrief(offering: Offering, brief?: string) {
    setPrefillBrief(brief ?? "");
    setModalOffering(offering);
  }

  return (
    <div className="min-h-screen bg-void pb-24 text-text md:pb-0">
      {/* ─── Compact hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-amber/[0.05] blur-[140px]" />
        <div className="pointer-events-none absolute top-20 right-0 h-[320px] w-[320px] rounded-full bg-violet/[0.04] blur-[140px]" />

        <div className="relative mx-auto max-w-6xl px-6 pt-12 pb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">Commissions</div>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-light leading-[1.05] text-paper sm:text-5xl">
            Hire a craft. <span className="text-amber italic">Or open your studio.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-secondary">
            Writers, illustrators, worldbuilders, and gamemasters who know what serialized stories need.
          </p>

          {/* Two-ways toggle */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-border-subtle bg-ink/40 p-1">
            <button
              onClick={() => setMode("browse")}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors ${
                mode === "browse" ? "bg-amber text-void" : "text-text-secondary hover:text-paper"
              }`}
            >
              Browse commissions
            </button>
            <button
              onClick={() => setMode("brief")}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors ${
                mode === "brief" ? "bg-amber text-void" : "text-text-secondary hover:text-paper"
              }`}
            >
              Post a brief
            </button>
          </div>

          {/* Search + filter row — browse mode only */}
          {mode === "browse" && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative max-w-xl flex-1">
                <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-ghost" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="5" />
                  <path d="M11 11l3 3" strokeLinecap="round" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by craft, artist, or what you need…"
                  className="w-full rounded-full border border-border-subtle bg-ink/60 py-2.5 pl-10 pr-4 text-[13.5px] text-paper placeholder:text-text-ghost/60 outline-none focus:border-amber/30"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(["all", "visual", "writing", "services"] as const).map((id) => {
                  const hall = HALLS.find((h) => h.id === id);
                  const selected = filter === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setFilter(id)}
                      className={`rounded-full border px-3.5 py-1.5 text-[12.5px] capitalize transition-colors ${
                        selected
                          ? "border-amber/40 bg-amber/15 text-amber"
                          : "border-border-subtle bg-surface/40 text-text-secondary hover:border-amber/20"
                      }`}
                    >
                      {id === "all" ? "All" : id}
                      {id !== "all" && hall && (
                        <span className={`ml-1.5 text-[10px] ${selected ? "text-amber/70" : hall.tone.text}`}>●</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Brief mode: composer + matches ──────────────────────────── */}
      {mode === "brief" && (
        <BriefComposer
          briefHall={briefHall}
          setBriefHall={(h) => {
            setBriefHall(h);
            setBriefCraft(null);
          }}
          briefCraft={briefCraft}
          setBriefCraft={setBriefCraft}
          briefText={briefText}
          setBriefText={setBriefText}
          briefBudget={briefBudget}
          setBriefBudget={setBriefBudget}
          briefTimeline={briefTimeline}
          setBriefTimeline={setBriefTimeline}
          matches={briefMatches}
          onPickMatch={(o) => openCommissionModalWithBrief(o, briefText)}
        />
      )}

      {/* ─── Commission categories — browse only ───────────────────── */}
      {mode === "browse" && (
        <section className="relative mx-auto max-w-6xl px-6 pb-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(["visual", "writing", "services"] as const).map((id) => (
              <HallCard
                key={id}
                hall={id}
                illustration={
                  id === "writing" ? <WritingHallSVG /> : id === "visual" ? <VisualHallSVG /> : <ServicesHallSVG />
                }
                offeringCount={hallCounts[id]}
                onEnter={() => setFilter(id)}
                active={filter === id}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Artists you've worked with ──────────────────────────────── */}
      {mode === "browse" && pastArtists.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-8">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-ghost">
                Craftspeople you&apos;ve worked with
              </div>
            </div>
            <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2 [scrollbar-width:thin]">
              {pastArtists.map((p) => {
                const hall = HALLS.find((h) => h.id === p.hall)!;
                return (
                  <Link
                    key={p.artisanId}
                    href={`/commissions?artisan=${p.artisanId}`}
                    className="group relative flex w-[280px] shrink-0 items-start gap-3 rounded-2xl border border-border-subtle bg-surface/50 p-4 transition-colors hover:border-amber/25"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-[14px] ${hall.tone.border} ${hall.tone.soft} ${hall.tone.text}`}>
                      {p.artisanName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-[14px] text-paper">{p.artisanName}</div>
                      <div className={`text-[10.5px] uppercase tracking-[0.12em] ${hall.tone.text}`}>{p.craftLabel}</div>
                      <div className="mt-1.5 line-clamp-2 font-reading text-[12px] italic leading-snug text-text-secondary">
                        {p.delivered}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10.5px] text-text-ghost">{p.when}</span>
                        <span className="text-[11px] text-amber group-hover:text-amber-light">Hire again →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Offerings board ──────────────────────────────────────────── */}
      {mode === "browse" && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-light text-paper">
              {filter === "all" ? "All offerings" : HALLS.find((h) => h.id === filter)?.label}
            </h2>
            {!loading && (
              <p className="text-[12px] italic text-text-ghost">
                {filteredOfferings.length > 0
                  ? `${filteredOfferings.length} ${filteredOfferings.length === 1 ? "offering" : "offerings"} listed`
                  : "Artists opening soon"}
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl border border-border-subtle bg-surface/30" />
              ))}
            </div>
          ) : filteredOfferings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
              <p className="font-display text-[18px] text-paper">No offerings match.</p>
              <p className="mt-1 text-[12.5px] italic text-text-ghost">
                Clear the filters or post a brief and let the right artist find you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOfferings.map((o) => (
                <OfferingCard key={o.id} offering={o} onBrief={() => setModalOffering(o)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Quiet footer band ────────────────────────────────────────── */}
      <section className="border-t border-border-subtle bg-ink/30">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-12 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-ghost">How a commission moves</div>
            <div className="mt-4 space-y-3">
              <FlowStep n="i" title="Brief" body="Post what you need, or pitch a craftsperson directly from their card." />
              <FlowStep n="ii" title="Quote" body="They quote in drops with a delivery window and revision count." />
              <FlowStep n="iii" title="Deliver" body="Files exchange through the platform. Drops release on your sign-off." />
            </div>
          </div>
          <div className="rounded-2xl border border-amber/20 bg-gradient-to-br from-amber/[0.08] to-transparent p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/80">For artists and craftspeople</div>
            <h3 className="mt-2 font-display text-[22px] font-light text-paper">Open your studio.</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
              List an offering with your craft, your price, and your revision policy. Quiloria handles the brief, the escrow, and the delivery handoff.
            </p>
            <Link
              href={session ? "/commissions/offerings" : "/register"}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber px-4 py-2 text-[12.5px] font-semibold text-void shadow shadow-amber/15 transition-colors hover:bg-amber-light"
            >
              List an offering
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Commission modal (preserved) ────────────────────────────── */}
      <AnimatePresence>
        {modalOffering && (
          <CommissionModal
            offering={modalOffering}
            prefillBrief={prefillBrief}
            onClose={() => {
              setModalOffering(null);
              setPrefillBrief("");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Hall card ─────────────────────────────────────────────────────────────

function HallCard({
  hall,
  illustration,
  onEnter,
  active,
  offeringCount = 0,
}: {
  hall: Hall;
  illustration: React.ReactNode;
  onEnter: () => void;
  active: boolean;
  offeringCount?: number;
}) {
  const meta = HALLS.find((h) => h.id === hall)!;
  return (
    <button
      onClick={onEnter}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-surface to-ink/80 p-5 text-left transition-all hover:-translate-y-0.5 ${
        active ? `${meta.tone.border} shadow-lg` : "border-border-subtle hover:border-amber/20"
      }`}
    >
      <div className={`pointer-events-none absolute -top-20 -right-10 h-44 w-44 rounded-full ${meta.tone.soft} blur-3xl`} />

      <div className="relative">
        <div className="mb-3 h-32 overflow-hidden rounded-xl border border-border-subtle bg-ink/40">
          {illustration}
        </div>
        <div className={`font-mono text-[9.5px] uppercase tracking-[0.22em] ${meta.tone.text}`}>{meta.byline}</div>
        <h3 className="mt-1 font-display text-[19px] font-light text-paper">{meta.label}</h3>
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-text-secondary">{meta.body}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {meta.crafts.slice(0, 3).map((c) => (
            <span key={c} className="rounded-full border border-border-subtle bg-ink/40 px-2 py-0.5 text-[10.5px] text-text-ghost">
              {craftLabel(c)}
            </span>
          ))}
          {meta.crafts.length > 3 && (
            <span className="self-center text-[10.5px] italic text-text-ghost/80">+{meta.crafts.length - 3}</span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 text-[12px] ${meta.tone.text}`}>
            Browse {hall === "visual" ? "artists" : "offerings"}
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {offeringCount > 0 ? (
            <span className="text-[10.5px] italic text-text-ghost">
              {offeringCount} offering{offeringCount === 1 ? "" : "s"} listed
            </span>
          ) : (
            <span className="text-[10.5px] italic text-text-ghost">Opening soon</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Offering card (craft-aware) ──────────────────────────────────────────

function OfferingCard({ offering, onBrief }: { offering: Offering; onBrief: () => void }) {
  const hallId = craftToHall(offering.craft);
  const hall = HALLS.find((h) => h.id === hallId)!;
  const firstPortfolio = offering.portfolioUrls?.[0];
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface/60 transition-colors hover:border-amber/25">
      {hallId === "visual" && (
        <div className="relative h-32 overflow-hidden bg-gradient-to-br from-amber/30 via-violet/25 to-burnt/20">
          {firstPortfolio ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firstPortfolio} alt={offering.title} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.4))]" />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-void/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-paper backdrop-blur">
            {craftLabel(offering.craft)}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {hallId !== "visual" && (
          <span className={`mb-2 inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] ${hall.tone.text} ${hall.tone.border} ${hall.tone.soft}`}>
            {craftLabel(offering.craft)}
          </span>
        )}

        <h3 className="font-display text-[16.5px] font-medium leading-tight text-paper">{offering.title}</h3>

        <p className={`mt-2.5 text-[12.5px] leading-relaxed text-text-secondary ${hallId === "writing" ? "font-reading italic" : ""} line-clamp-3`}>
          {hallId === "writing" ? `"${offering.description}"` : offering.description}
        </p>

        {/* Artist + completed strip */}
        <div className="mt-4 flex items-center gap-2.5 border-t border-border-subtle pt-3">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-display text-[11px] ${hall.tone.border} ${hall.tone.soft} ${hall.tone.text}`}>
            {offering.artisan.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] text-paper">{offering.artisan.displayName}</div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-text-ghost">
              <span>{offering.completedCount} delivered</span>
              {offering.completedCount >= 10 && (
                <span title="Trusted craftsperson — 10+ delivered" className="text-amber/90">
                  <WaxSealIcon />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price + delivery + CTA */}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="font-display text-[18px] text-paper">
              <span className={hall.tone.text}>{offering.priceMin}</span>
              <span className="ml-1 text-[12px] text-text-ghost">
                {offering.priceMax > offering.priceMin ? `–${offering.priceMax}` : ""} drops · from
              </span>
            </div>
            <div className="text-[11px] text-text-ghost">{offering.deliveryDays}d · {offering.revisionRounds} revision{offering.revisionRounds === 1 ? "" : "s"}</div>
          </div>
          <button
            onClick={onBrief}
            className="rounded-full border border-border-subtle bg-ink/40 px-3.5 py-1.5 text-[11.5px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber"
          >
            Brief them →
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── How-it-works step ────────────────────────────────────────────────────

function FlowStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border-subtle bg-surface/40 p-4">
      <span className="font-display text-[15px] italic text-amber/70">{n}.</span>
      <div className="min-w-0">
        <div className="font-display text-[14.5px] text-paper">{title}</div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{body}</div>
      </div>
    </div>
  );
}

// ─── Brief composer ───────────────────────────────────────────────────────

function BriefComposer({
  briefHall,
  setBriefHall,
  briefCraft,
  setBriefCraft,
  briefText,
  setBriefText,
  briefBudget,
  setBriefBudget,
  briefTimeline,
  setBriefTimeline,
  matches,
  onPickMatch,
}: {
  briefHall: Hall | null;
  setBriefHall: (h: Hall | null) => void;
  briefCraft: CraftType | null;
  setBriefCraft: (c: CraftType | null) => void;
  briefText: string;
  setBriefText: (s: string) => void;
  briefBudget: string;
  setBriefBudget: (s: string) => void;
  briefTimeline: "flexible" | "soon" | "rush";
  setBriefTimeline: (t: "flexible" | "soon" | "rush") => void;
  matches: Offering[];
  onPickMatch: (o: Offering) => void;
}) {
  const hallMeta = briefHall ? HALLS.find((h) => h.id === briefHall)! : null;
  return (
    <section className="mx-auto max-w-6xl px-6 pb-12">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* — The brief — */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-amber/20 bg-gradient-to-br from-surface to-ink/80 p-6 shadow-xl shadow-void/30"
        >
          <div className="pointer-events-none absolute -top-20 -right-10 h-40 w-40 rounded-full bg-amber/[0.05] blur-3xl" />
          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">Commission brief</div>
            <h2 className="mt-1 font-display text-[26px] font-light text-paper">
              Describe the scene you can&apos;t see yet.
            </h2>
            <p className="mt-1.5 text-[12.5px] italic text-text-ghost">
              Pick a craft, sketch the need, and craftspeople surface beside you.
            </p>

            <FieldLabel n="i" label="What craft do you need?" />
            <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["visual", "writing", "services"] as const).map((h) => {
                const meta = HALLS.find((x) => x.id === h)!;
                const selected = briefHall === h;
                return (
                  <button
                    key={h}
                    onClick={() => setBriefHall(h)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? `${meta.tone.border} ${meta.tone.soft}`
                        : "border-border-subtle bg-ink/40 hover:border-text-ghost/30"
                    }`}
                  >
                    <div className={`text-[12.5px] font-medium ${selected ? meta.tone.text : "text-paper"}`}>
                      {meta.label}
                    </div>
                    <div className="mt-0.5 text-[10.5px] italic leading-tight text-text-ghost">
                      {meta.byline.split(" — ")[0] ?? meta.byline}
                    </div>
                  </button>
                );
              })}
            </div>

            {hallMeta && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <FieldLabel n="ii" label="Narrow the craft" optional />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setBriefCraft(null)}
                    className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                      briefCraft === null
                        ? `${hallMeta.tone.border} ${hallMeta.tone.soft} ${hallMeta.tone.text}`
                        : "border-border-subtle bg-ink/40 text-text-secondary hover:border-text-ghost/30"
                    }`}
                  >
                    Any
                  </button>
                  {hallMeta.crafts.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBriefCraft(c)}
                      className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                        briefCraft === c
                          ? `${hallMeta.tone.border} ${hallMeta.tone.soft} ${hallMeta.tone.text}`
                          : "border-border-subtle bg-ink/40 text-text-secondary hover:border-text-ghost/30"
                      }`}
                    >
                      {craftLabel(c)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <FieldLabel n="iii" label="Tell them what you need" />
            <textarea
              value={briefText}
              onChange={(e) => setBriefText(e.target.value.slice(0, 800))}
              rows={4}
              placeholder="A character lineup for a five-person heist crew, set in late-Victorian London. I have a moodboard. Color palette is warm and bruised."
              className="mt-2 w-full resize-none rounded-xl border border-border-subtle bg-ink/40 px-4 py-3 font-reading text-[14px] leading-relaxed text-paper outline-none placeholder:text-text-ghost/50 focus:border-amber/30"
            />
            <div className="mt-1 text-right text-[10px] text-text-ghost/70">{briefText.length}/800</div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel n="iv" label="Budget" />
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-border-subtle bg-ink/40 px-3 py-2.5">
                  <input
                    value={briefBudget}
                    onChange={(e) => setBriefBudget(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                    placeholder="380"
                    className="flex-1 bg-transparent text-[14px] text-paper outline-none placeholder:text-text-ghost/50"
                  />
                  <span className="text-[12px] text-text-ghost">drops</span>
                </div>
              </div>
              <div>
                <FieldLabel n="v" label="When" />
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(["flexible", "soon", "rush"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBriefTimeline(t)}
                      className={`rounded-xl border px-2 py-2.5 text-[11.5px] capitalize transition-colors ${
                        briefTimeline === t
                          ? "border-amber/40 bg-amber/[0.08] text-amber"
                          : "border-border-subtle bg-ink/40 text-text-secondary hover:border-text-ghost/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-[10.5px] italic text-text-ghost">
              Pick a matching craftsperson on the right to send your brief.
            </p>
          </div>
        </motion.div>

        {/* — Matches rail — */}
        <div className="self-start lg:sticky lg:top-8">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-ghost">
              {briefHall ? "Matching craftspeople" : "Waiting for a craft"}
            </div>
            {briefHall && matches.length > 0 && (
              <span className="text-[11px] italic text-text-ghost">{matches.length} ready to quote</span>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {!briefHall ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-border-subtle bg-surface/30 p-8 text-center"
              >
                <p className="font-display text-[15px] text-paper">Pick a craft to begin.</p>
                <p className="mt-1 text-[11.5px] italic text-text-ghost">
                  Matches appear here as you fill the brief.
                </p>
              </motion.div>
            ) : matches.length === 0 ? (
              <motion.div
                key="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-border-subtle bg-surface/40 p-8 text-center"
              >
                <p className="font-display text-[15px] text-paper">No exact matches yet.</p>
                <p className="mt-1 text-[11.5px] italic text-text-ghost">
                  Widen the craft or browse commissions.
                </p>
              </motion.div>
            ) : (
              <motion.div key="list" className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {matches.map((m) => (
                  <MatchCard key={m.id} offering={m} onPick={() => onPickMatch(m)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function FieldLabel({ n, label, optional }: { n: string; label: string; optional?: boolean }) {
  return (
    <div className="mt-5 flex items-baseline gap-2">
      <span className="font-display text-[12.5px] italic text-amber/70">{n}.</span>
      <span className="text-[11px] uppercase tracking-[0.16em] text-text-ghost">{label}</span>
      {optional && <span className="text-[10px] italic text-text-ghost/70">optional</span>}
    </div>
  );
}

function MatchCard({ offering, onPick }: { offering: Offering; onPick: () => void }) {
  const hall = HALLS.find((h) => h.id === craftToHall(offering.craft))!;
  return (
    <button
      onClick={onPick}
      className="flex w-full items-start gap-3 rounded-2xl border border-border-subtle bg-surface/50 p-4 text-left transition-colors hover:border-amber/25"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-[14px] ${hall.tone.border} ${hall.tone.soft} ${hall.tone.text}`}>
        {offering.artisan.displayName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-display text-[14.5px] text-paper">{offering.artisan.displayName}</span>
          <span className={`shrink-0 text-[10.5px] uppercase tracking-[0.12em] ${hall.tone.text}`}>{craftLabel(offering.craft)}</span>
        </div>
        <div className="mt-1 line-clamp-2 text-[12px] italic leading-snug text-text-secondary">{offering.title}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-text-ghost">
            from {offering.priceMin} drops · {offering.deliveryDays}d
          </span>
          <span className="text-[11px] text-amber">Quote me →</span>
        </div>
      </div>
    </button>
  );
}

// ─── Wax seal icon ────────────────────────────────────────────────────────

function WaxSealIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.6 L9.5 5.8 L13.9 6 L10.5 8.8 L11.7 13.1 L8 10.7 L4.3 13.1 L5.5 8.8 L2.1 6 L6.5 5.8 Z" opacity="0.85" />
      <circle cx="8" cy="8" r="1.4" fill="#0F0D0B" opacity="0.55" />
    </svg>
  );
}

// ─── Hall vignettes ──────────────────────────────────────────────────────

function WritingHallSVG() {
  return (
    <svg viewBox="0 0 240 128" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="w-lamp" cx="35%" cy="40%" r="40%">
          <stop offset="0%" stopColor="#E2AC4A" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#E2AC4A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="240" height="128" fill="#1a140d" />
      <rect x="0" y="0" width="240" height="128" fill="url(#w-lamp)" />
      <ellipse cx="120" cy="115" rx="110" ry="8" fill="#000" opacity="0.4" />
      <g transform="translate(60, 26) rotate(-3 60 40)">
        <rect x="2" y="3" width="120" height="90" fill="#000" opacity="0.4" rx="2" />
        <rect width="120" height="90" fill="#F3EBDB" rx="2" />
        <line x1="16" y1="0" x2="16" y2="90" stroke="#B8697A" strokeOpacity="0.4" strokeWidth="0.5" />
        <g stroke="#231A10" strokeOpacity="0.75" strokeWidth="0.55" strokeLinecap="round">
          <line x1="22" y1="12" x2="92" y2="12" />
          <line x1="22" y1="22" x2="104" y2="22" />
          <line x1="22" y1="32" x2="86" y2="32" />
          <line x1="22" y1="42" x2="100" y2="42" />
          <line x1="22" y1="52" x2="72" y2="52" />
          <line x1="22" y1="62" x2="94" y2="62" />
          <line x1="22" y1="72" x2="58" y2="72" />
        </g>
      </g>
      <g transform="translate(178, 70) rotate(-22)">
        <line x1="0" y1="0" x2="46" y2="-3" stroke="#B5862F" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 6 -1.5 Q 18 -7 28 -8 Q 38 -8 46 -3" fill="#E2AC4A" fillOpacity="0.9" stroke="#B5862F" strokeWidth="0.4" />
      </g>
      <g transform="translate(196, 86)">
        <ellipse cx="0" cy="0" rx="9" ry="3" fill="#1C1B28" />
        <rect x="-7" y="-12" width="14" height="14" rx="1.5" fill="#4A3E2C" />
        <ellipse cx="0" cy="-12" rx="7" ry="2" fill="#1C1B28" />
      </g>
    </svg>
  );
}

function VisualHallSVG() {
  return (
    <svg viewBox="0 0 240 128" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="v-glow" cx="60%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="canvas-paint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B8697A" />
          <stop offset="50%" stopColor="#E2AC4A" />
          <stop offset="100%" stopColor="#5A8A9A" />
        </linearGradient>
      </defs>
      <rect width="240" height="128" fill="#1a140d" />
      <rect x="0" y="0" width="240" height="128" fill="url(#v-glow)" />
      <line x1="100" y1="118" x2="86" y2="22" stroke="#5C4A30" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="156" y1="118" x2="170" y2="22" stroke="#5C4A30" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="60" x2="164" y2="60" stroke="#5C4A30" strokeWidth="2" strokeLinecap="round" />
      <rect x="76" y="20" width="104" height="80" fill="#F3EBDB" stroke="#B5862F" strokeWidth="1.5" rx="1" />
      <rect x="80" y="24" width="96" height="50" fill="url(#canvas-paint)" opacity="0.6" />
      <path d="M 80 60 Q 110 40 140 55 T 176 50" stroke="#4A3E2C" strokeWidth="1.2" fill="none" opacity="0.7" />
      <circle cx="100" cy="44" r="6" fill="#F3EBDB" opacity="0.5" />
      <g transform="translate(38, 90)">
        <ellipse cx="0" cy="0" rx="20" ry="11" fill="#7A5A3A" />
        <circle cx="-8" cy="-2" r="2.5" fill="#B8697A" />
        <circle cx="0" cy="2" r="2.5" fill="#E2AC4A" />
        <circle cx="8" cy="-2" r="2.5" fill="#5A8A9A" />
      </g>
      <g transform="translate(200, 88) rotate(-30)">
        <rect x="0" y="-1.2" width="22" height="2.4" rx="0.5" fill="#5C4A30" />
        <rect x="22" y="-2" width="6" height="4" rx="0.6" fill="#B5862F" />
        <path d="M 28 -1.5 L 36 -3 L 36 3 L 28 1.5 Z" fill="#4A3E2C" />
      </g>
    </svg>
  );
}

function ServicesHallSVG() {
  return (
    <svg viewBox="0 0 240 128" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="s-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5EB3B3" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#5EB3B3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="240" height="128" fill="#1a140d" />
      <rect x="0" y="0" width="240" height="128" fill="url(#s-glow)" />
      <g transform="translate(30, 30)">
        <rect x="2" y="3" width="140" height="76" fill="#000" opacity="0.4" rx="1.5" />
        <rect width="140" height="76" fill="#E6D9B8" rx="1.5" />
        <path d="M 12 22 Q 30 16 48 20 Q 64 14 80 22 Q 96 30 112 24 Q 122 22 128 28" stroke="#3A6B5A" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M 18 42 Q 34 38 50 44 Q 66 50 84 46 Q 100 42 118 48" stroke="#3A6B5A" strokeWidth="1" fill="none" strokeLinecap="round" />
        <circle cx="40" cy="34" r="3" fill="#3A6B5A" opacity="0.5" />
        <circle cx="90" cy="36" r="2" fill="#3A6B5A" opacity="0.5" />
        <path d="M 60 60 L 66 50 L 72 60 Z" fill="#5C4A30" opacity="0.6" />
        <path d="M 70 64 L 80 48 L 90 64 Z" fill="#5C4A30" opacity="0.6" />
        <g transform="translate(118, 60)">
          <circle r="8" fill="none" stroke="#B5862F" strokeWidth="0.7" />
          <path d="M 0 -8 L 2 0 L 0 8 L -2 0 Z" fill="#B5862F" />
          <path d="M -8 0 L 0 2 L 8 0 L 0 -2 Z" fill="#B5862F" opacity="0.5" />
        </g>
        <ellipse cx="0" cy="38" rx="4" ry="38" fill="#B5862F" opacity="0.5" />
        <ellipse cx="140" cy="38" rx="4" ry="38" fill="#B5862F" opacity="0.5" />
      </g>
      <g transform="translate(192, 80)">
        <polygon points="0,-15 13,-5 10,12 -10,12 -13,-5" fill="#4A3E2C" stroke="#B5862F" strokeWidth="0.7" />
        <polygon points="0,-15 13,-5 0,2" fill="#5A5870" />
        <polygon points="0,-15 -13,-5 0,2" fill="#28263A" />
        <path d="M-5 0H5M0-5V5" stroke="#E2AC4A" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ─── Commission modal ──────────────

function CommissionModal({
  offering,
  prefillBrief = "",
  onClose,
}: {
  offering: Offering;
  prefillBrief?: string;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [brief, setBrief] = useState(prefillBrief);
  const [storyId, setStoryId] = useState("");
  const [stories, setStories] = useState<UserStory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/stories?mine=true&limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.stories) setStories(data.stories);
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (brief.length < 20) {
      setError("Your brief must be at least 20 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, string> = { offeringId: offering.id, brief };
      if (storyId) body.storyId = storyId;
      const res = await fetch("/api/scriptorium/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to submit commission request.");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }, [brief, offering.id, storyId]);

  return (
    <motion.div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-void/80 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <motion.div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl rounded-b-none border border-border bg-ink p-5 shadow-2xl sm:rounded-b-xl sm:p-6"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
      >
        {success ? (
          <div className="py-8 text-center">
            <motion.div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber/30 bg-amber/10"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <svg width="28" height="28" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber">
                <path d="M3 8l3 3 7-7" />
              </svg>
            </motion.div>
            <h3 className="mb-2 font-display text-lg text-paper">Brief sent</h3>
            <p className="mb-6 text-sm text-text-secondary">
              The craftsperson will review and respond with a quote.
            </p>
            <button
              onClick={onClose}
              className="rounded-lg border border-amber/30 bg-amber/10 px-6 py-2 text-sm font-medium text-amber transition-colors hover:bg-amber/20"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="mb-1 font-display text-lg text-paper">{offering.title}</h3>
              <p className="text-sm text-text-secondary">
                Brief for {offering.artisan.displayName}
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                Your brief
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                maxLength={3000}
                rows={6}
                placeholder="Describe what you need — the more specific, the better the quote."
                className="w-full resize-none rounded-lg border border-border bg-surface/50 px-4 py-3 text-sm text-text placeholder:text-text-ghost transition-colors focus:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber/20"
              />
              <div className="mt-1.5 flex justify-between">
                {brief.length < 20 && brief.length > 0 && (
                  <span className="text-xs text-rose">At least 20 characters required</span>
                )}
                <span className="ml-auto text-xs text-text-ghost">{brief.length} / 3000</span>
              </div>
            </div>

            {stories.length > 0 && (
              <div className="mb-5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-ghost">
                  Link to a story (optional)
                </label>
                <select
                  value={storyId}
                  onChange={(e) => setStoryId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-sm text-text transition-colors focus:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber/20"
                >
                  <option value="">None</option>
                  {stories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <motion.p className="mb-4 text-sm text-rose" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error}
              </motion.p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || brief.length < 20}
                className="flex items-center gap-2 rounded-lg border border-amber/30 bg-amber/10 px-5 py-2 text-sm font-medium text-amber transition-colors hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <motion.span
                      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber/30 border-t-amber"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Sending…
                  </>
                ) : (
                  "Send brief"
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
