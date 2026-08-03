"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { formatNumber, formatTimeAgo } from "@/lib/format";
import type { StudioSnapshot } from "@/types/studio";
import { dueLabel, dueMs, storyHref, tableHref } from "@/components/dashboard/beats/types";
import { CoverArt } from "@/components/dashboard/studio-kit";
import { Eyebrow, GlassCard, InkRing, Jacket, Panel, Tile, WeekInk, rise } from "@/components/dashboard/glass/kit";

// ─────────────────────────────────────────────────────────────────────────────
// Studio — the writer's side of the stage. The hero is the manuscript you
// touched last; the watermark is your own closing line (or the bridge note you
// left for tomorrow-you). Everything else is the snapshot, quoted.
// ─────────────────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  prose: "Novel",
  novel: "Novel",
  poetry: "Poetry",
  screenplay: "Screenplay",
  webtoon: "Webtoon",
  illustrated: "Illustrated",
};

function formatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format.charAt(0).toUpperCase() + format.slice(1);
}

/** The ring holds one closing sentence, not the whole 240-char tail. */
function tailSentence(text: string, max = 130): string {
  const t = text.trim();
  const parts = t.split(/(?<=[.!?…”"])\s+/).filter(Boolean);
  let out = parts[parts.length - 1] ?? t;
  if (out.length > max) out = `…${out.slice(-max).trimStart()}`;
  return out;
}

export default function StudioTab({ snapshot, now }: { snapshot: StudioSnapshot; now: number }) {
  const reduce = useReducedMotion();
  const s = snapshot.signals;

  const shelf = [...snapshot.shelf].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const manuscript = s.manuscript;
  const heroWork = manuscript ? shelf.find((w) => w.id === manuscript.storyId) ?? shelf[0] : shelf[0];

  const wordsWeek = s.wordsTrend.slice(-7).reduce((a, b) => a + b, 0);

  // the watermark: the bridge note you left for tomorrow-you wins; otherwise
  // the manuscript's own closing line
  const quote = manuscript
    ? manuscript.bridgeNote
      ? `“${manuscript.bridgeNote}”`
      : `“${tailSentence(manuscript.lastLines)}”`
    : null;
  const quoteFrom = manuscript
    ? manuscript.bridgeNote
      ? "Your note to tomorrow-you"
      : `Your last line · ${formatTimeAgo(manuscript.updatedAt)}`
    : null;

  const orbits = [
    wordsWeek > 0 && { label: "Words this week", value: formatNumber(wordsWeek) },
    s.sparksWeek > 0 && { label: "Sparks · week", value: `✦ ${formatNumber(s.sparksWeek)}` },
    s.readersNow && s.readersNow.count > 0 && { label: "Reading now", value: String(s.readersNow.count) },
  ].filter(Boolean) as { label: string; value: string }[];

  // ── tonight's cards, most alive first ──
  const cards: React.ReactNode[] = [];
  for (const t of snapshot.tables) {
    if (t.status !== "running") continue;
    cards.push(
      <GlassCard
        key={`table-${t.adventureId}`}
        href={tableHref(t)}
        coverSeed={t.title}
        title={t.title}
        live
        meta={
          t.isMyTurn
            ? `the scene is yours — ${dueLabel(dueMs(t, now))}`
            : t.writingNow
              ? `${t.writingNow} is writing now · ${t.watchers} watching`
              : `Act ${t.actNo}, scene ${t.sceneNo} · ${t.castPresent} at the table`
        }
        cta={t.isMyTurn ? "Take your turn" : t.mySeatId ? "Sit down" : "Watch"}
      />
    );
  }
  if (s.readersNow && s.readersNow.count > 0) {
    const w = shelf.find((x) => x.title === s.readersNow?.storyTitle);
    cards.push(
      <GlassCard
        key="readers-now"
        href={w?.slug ? `/story/${w.slug}` : "#"}
        coverSeed={s.readersNow.storyTitle ?? "readers"}
        coverImage={w?.coverImageUrl}
        title={s.readersNow.storyTitle ?? "Your story"}
        live
        meta={`${s.readersNow.count} reading now`}
      />
    );
  }
  for (const n of s.readerNotes.slice(0, 2)) {
    cards.push(
      <GlassCard
        key={`note-${n.id}`}
        href={n.slug ? `/story/${n.slug}/read/${n.chapterId}` : "#"}
        coverSeed={n.storyTitle}
        title={`${n.author ?? "A reader"} left a note`}
        meta={`“${n.content.length > 64 ? `${n.content.slice(0, 63).trimEnd()}…` : n.content}” · ${n.storyTitle}`}
        cta="Answer"
      />
    );
  }
  if (s.suggestions.latest) {
    const sug = s.suggestions.latest;
    cards.push(
      <GlassCard
        key="suggestion"
        href={sug.storySlug ? `/story/${sug.storySlug}` : "/adventures"}
        coverSeed={sug.storyTitle}
        title="The audience sent a suggestion"
        meta={`${sug.storyTitle} · ${formatTimeAgo(sug.createdAt)}`}
        cta="Review"
      />
    );
  }
  if (s.commissions.latest) {
    const c = s.commissions.latest;
    cards.push(
      <GlassCard
        key="commission"
        href="/creator/earnings"
        coverSeed={c.title}
        title={`${c.patron ?? "A patron"} sent a commission`}
        meta={`“${c.title}”${c.craft ? ` · ${c.craft}` : ""}`}
        cta="Open"
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr] lg:gap-6">
      {/* ── HERO ── */}
      <motion.div className="relative flex min-h-[380px] items-start" {...rise(reduce, 0.05)}>
        {heroWork ? (
          <>
            <InkRing quote={quote} quoteFrom={quoteFrom} orbits={orbits} reduce={reduce} />
            <Jacket
              seed={heroWork.title}
              title={heroWork.title}
              image={heroWork.coverImageUrl}
              className="z-[2] -mt-14 ml-3 w-[clamp(170px,19vw,230px)] sm:ml-8"
            />
            <Link
              href={storyHref(heroWork)}
              className="group absolute bottom-0 left-2 z-[3] inline-flex items-center gap-2.5 rounded-full bg-gold-fill px-5 py-3 text-[14px] font-semibold text-on-gold shadow-[0_8px_30px_rgba(226,172,74,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(226,172,74,0.5)] sm:left-8"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
              {manuscript ? `Continue Chapter ${manuscript.chapterNumber}` : `Open ${heroWork.title}`}
            </Link>
          </>
        ) : (
          /* an empty shelf is an invitation, not a blank */
          <div className="flex w-full flex-col items-start justify-center gap-4 py-10">
            <InkRing quote="“Every story starts as an empty page that someone refused to leave empty.”" quoteFrom="The first page is waiting" orbits={[]} reduce={reduce} />
            <Link
              href="/create"
              className="z-[3] inline-flex items-center gap-2.5 rounded-full bg-gold-fill px-5 py-3 text-[14px] font-semibold text-on-gold shadow-[0_8px_30px_rgba(226,172,74,0.35)] transition-transform hover:-translate-y-0.5"
            >
              Start your first story
            </Link>
          </div>
        )}
      </motion.div>

      {/* ── IDENTITY ── */}
      <motion.div className="flex flex-col gap-3.5" {...rise(reduce, 0.12)}>
        <div className="grid grid-cols-3 gap-2.5">
          <Tile gold label="Words · week" value={formatNumber(wordsWeek)} />
          <Tile label="Sparks · week" value={formatNumber(s.sparksWeek)} />
          <Tile label="New followers" value={s.newFollowersWeek > 0 ? `+${s.newFollowersWeek}` : "0"} sub="this week" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Tile label="Works" value={String(shelf.length)} sub={`${shelf.filter((w) => w.status === "published").length} published`} />
          <Tile
            label="Chapters"
            value={String(shelf.reduce((a, w) => a + w.chapterCount, 0))}
            sub={`${formatNumber(shelf.reduce((a, w) => a + w.totalWords, 0))} words`}
          />
        </div>
        <WeekInk trend={s.wordsTrend} />
      </motion.div>

      {/* ── YOUR WORKS ── */}
      <motion.div {...rise(reduce, 0.2)}>
        <Panel title="Your works" moreHref="/write" moreLabel="The desk">
          {shelf.length === 0 ? (
            <p className="py-4 text-[13px] text-text-secondary">
              Nothing on the shelf yet. Your first story will stand here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {["Story", "Format", "Chapters", "Words", "Sparks", "State"].map((h) => (
                      <th key={h} className="px-2.5 pb-2.5 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-text-ghost">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shelf.slice(0, 6).map((w, i) => (
                    <tr key={w.id} className={i % 2 === 0 ? "bg-elevated/45" : ""}>
                      <td className="rounded-l-lg px-2.5 py-2.5 font-medium text-paper">
                        <Link href={storyHref(w)} className="flex items-center gap-2.5 hover:text-amber">
                          <CoverArt seed={w.title} title="" image={w.coverImageUrl} className="h-5 w-3.5 shrink-0 rounded-[2px_3px_3px_2px] border border-border-active" />
                          <span className="truncate">{w.title}</span>
                        </Link>
                      </td>
                      <td className="px-2.5 py-2.5 text-text-secondary">{formatLabel(w.format)}</td>
                      <td className="px-2.5 py-2.5 font-mono text-[12px]">{w.chapterCount}</td>
                      <td className="px-2.5 py-2.5 font-mono text-[12px]">{formatNumber(w.totalWords)}</td>
                      <td className="px-2.5 py-2.5 font-mono text-[12px] text-amber">{w.sparkCount > 0 ? `✦ ${w.sparkCount}` : "—"}</td>
                      <td className="rounded-r-lg px-2.5 py-2.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10.5px] ${
                            w.status === "published"
                              ? "border-sage/30 text-sage"
                              : "border-border text-text-ghost"
                          }`}
                        >
                          {w.status === "published" ? "Published" : "Draft"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </motion.div>

      {/* ── TONIGHT ── */}
      <motion.div className="flex flex-col gap-3" {...rise(reduce, 0.28)}>
        <div className="flex items-center gap-2 px-1">
          {cards.length > 0 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber shadow-[0_0_8px_rgba(226,172,74,0.8)]" />}
          <Eyebrow className="!text-[11px] normal-case tracking-normal text-text-secondary">Tonight</Eyebrow>
        </div>
        {cards.length === 0 ? (
          <div className="glass-panel rounded-2xl p-4 text-[13px] text-text-secondary">
            A quiet night. When readers arrive or a table goes live, it shows here first.
          </div>
        ) : (
          cards.slice(0, 4)
        )}
      </motion.div>
    </div>
  );
}
