import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/server/auth";
import { verifySessionGmAccess } from "@/server/services/collaboration";
import {
  loadSessionReadout,
  type SessionReadout,
  type ReadoutStall,
} from "@/server/services/session-readout";

export const metadata = {
  title: "Session readout · Quiloria",
};

type PageProps = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

// ms → a short human duration ("42s", "6m 12s", "1h 03m").
function dur(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${String(rm).padStart(2, "0")}m`;
}

function Stat({
  label,
  value,
  hint,
  alarm,
}: {
  label: string;
  value: string;
  hint?: string;
  alarm?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-text-ghost">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-medium tabular-nums ${
          alarm ? "text-rose" : "text-paper"
        }`}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-xs text-text-secondary">{hint}</div>
      ) : null}
    </div>
  );
}

function StallRow({ stall }: { stall: ReadoutStall }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-white/5 py-2 text-sm">
      <span className="font-medium tabular-nums text-rose">
        {dur(stall.gapMs)}
      </span>
      <span className="text-text-secondary">
        of silence after{" "}
        <span className="text-paper">{stall.afterLabel}</span>
        <span className="text-text-ghost"> ({stall.afterType})</span> — broken by{" "}
        <span className="text-paper">{stall.brokenByLabel}</span>
      </span>
    </li>
  );
}

function Readout({ r }: { r: SessionReadout }) {
  const stallish =
    (r.longestGapMs ?? 0) >= r.stallThresholdMs || r.stallCount > 0;
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-1 text-xs uppercase tracking-widest text-text-ghost">
        Post-session readout
      </div>
      <h1 className="text-2xl font-medium text-paper">{r.title}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {r.status === "completed" ? "Completed" : `Status: ${r.status}`} ·{" "}
        {r.totalTurns} turns · {r.totalWords.toLocaleString()} words ·{" "}
        {dur(r.activeSpanMs)} of writing
      </p>

      {/* The stall signal — the reason this page exists. */}
      <h2 className="mb-3 mt-8 text-sm uppercase tracking-wide text-text-ghost">
        Momentum
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Median gap"
          value={r.medianGapMs === null ? "—" : dur(r.medianGapMs)}
          hint="typical wait between turns"
        />
        <Stat
          label="Longest silence"
          value={r.longestGapMs === null ? "—" : dur(r.longestGapMs)}
          hint="the worst stall"
          alarm={(r.longestGapMs ?? 0) >= r.stallThresholdMs}
        />
        <Stat
          label="Stalls"
          value={String(r.stallCount)}
          hint={`gaps over ${dur(r.stallThresholdMs)}`}
          alarm={r.stallCount > 0}
        />
        <Stat
          label="Trailing silence"
          value={dur(r.trailingSilenceMs)}
          hint="pen idle before close"
          alarm={r.trailingSilenceMs >= r.stallThresholdMs}
        />
        <Stat label="Turns" value={`${r.storyTurns} + ${r.logTurns}`} hint="story + log" />
        <Stat label="Wall clock" value={dur(r.wallClockMs)} hint="open → close" />
      </div>

      {r.stalls.length > 0 ? (
        <>
          <h2 className="mb-1 mt-8 text-sm uppercase tracking-wide text-text-ghost">
            Where it stalled
          </h2>
          <ul>
            {r.stalls.map((s, i) => (
              <StallRow key={i} stall={s} />
            ))}
          </ul>
        </>
      ) : stallish ? null : (
        <p className="mt-8 text-sm text-sage">
          No stall over {dur(r.stallThresholdMs)} — the pen kept moving.
        </p>
      )}

      {/* Who carried it, who went quiet. */}
      <h2 className="mb-3 mt-8 text-sm uppercase tracking-wide text-text-ghost">
        The table
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-text-ghost">
              <th className="py-2 pr-3 font-normal">Who</th>
              <th className="py-2 pr-3 text-right font-normal">Turns</th>
              <th className="py-2 pr-3 text-right font-normal">Words</th>
              <th className="py-2 pr-3 text-right font-normal">Quiet before end</th>
            </tr>
          </thead>
          <tbody>
            {r.authors.map((a) => (
              <tr key={a.userId} className="border-b border-white/5">
                <td className="py-2 pr-3 text-paper">
                  {a.label}
                  {a.isDirector ? (
                    <span className="ml-2 text-xs text-amber">Director</span>
                  ) : null}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">
                  {a.turns}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">
                  {a.words.toLocaleString()}
                </td>
                <td
                  className={`py-2 pr-3 text-right tabular-nums ${
                    a.quietBeforeEndMs >= r.stallThresholdMs
                      ? "text-rose"
                      : "text-text-secondary"
                  }`}
                >
                  {dur(a.quietBeforeEndMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-8 text-xs text-text-ghost">
        Instrument only — the stall signal the playtest rests on. Not shown to
        players.
      </p>
    </div>
  );
}

export default async function ReadoutPage({ params }: PageProps) {
  const { storyId, sessionId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/campaign/${storyId}/readout/${sessionId}`);
  }

  const check = await verifySessionGmAccess(storyId, sessionId, session.user.id);
  if (check.error === "NOT_FOUND") notFound();
  if (check.error === "FORBIDDEN") {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center text-text-secondary">
        Only the Director can read a session&rsquo;s readout.{" "}
        <Link href={`/campaign/${storyId}`} className="text-amber underline">
          Back to the campaign
        </Link>
      </div>
    );
  }
  if (check.error) notFound();

  const readout = await loadSessionReadout(check.session, check.story.userId);
  return <Readout r={readout} />;
}
