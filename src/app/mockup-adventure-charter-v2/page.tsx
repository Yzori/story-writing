import Image from "next/image";

const GENRES = ["Fantasy", "Mystery", "Dark Fantasy", "Political Intrigue", "Exploration"];
const CONTENT_NOTES = ["Violence", "Horror", "Death"];
const RATINGS = ["All Ages", "Teen", "Mature", "Explicit"] as const;

export default function AdventureCharterV2() {
  const selectedRating = "Teen";
  const totalSeats = 6;
  const filledSeats = 3;
  const applicants = 8;

  return (
    <main className="relative min-h-screen overflow-hidden bg-void text-paper">
      {/* ── Atmospheric backdrop ───────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0">
        <Image
          src="/adventure_mode.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.06] saturate-[0.55] blur-[2px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,var(--t-gold-glow)_0%,transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_30%,rgba(8,5,3,0.85)_100%)]" />
        <Grain />
      </div>

      <div className="relative z-10 mx-auto max-w-[1320px] px-6 pt-24 pb-24 lg:px-10">
        {/* ── Breadcrumb + draft chip ──────────────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-10">
          <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">
            <span>Quiloria</span>
            <Pip />
            <span>Adventures</span>
            <Pip />
            <span className="text-gold/85">Draft charter</span>
          </nav>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Draft · saved 2m ago
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost">
              #4F9A2
            </span>
          </div>
        </header>

        {/* ── Two-column composition ───────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* LEFT: Charter draft (GM working surface) ──────────────── */}
          <article className="relative">
            <div className="relative rounded-[18px] border border-gold/[0.12] bg-gradient-to-br from-surface/85 via-surface/72 to-elevated/88 p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75)] backdrop-blur-2xl sm:p-12">
              <CornerOrnament className="absolute left-3 top-3" />
              <CornerOrnament className="absolute right-3 top-3 -scale-x-100" />
              <CornerOrnament className="absolute left-3 bottom-3 -scale-y-100" />
              <CornerOrnament className="absolute right-3 bottom-3 -scale-100" />

              {/* — Title block — manuscript title page — */}
              <section className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.36em] text-gold/65">
                  An Adventure Charter
                </p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className="h-px w-20 bg-gradient-to-r from-transparent to-gold/40" />
                  <Fleuron size={14} />
                  <span className="h-px w-20 bg-gradient-to-l from-transparent to-gold/40" />
                </div>
                <input
                  aria-label="Adventure title"
                  defaultValue="The Ashen Cartographer"
                  className="mt-5 w-full appearance-none border-0 !bg-transparent text-center font-display text-[40px] font-medium leading-[1.05] tracking-[-0.005em] text-text outline-none placeholder:text-text-ghost/60 focus:ring-0 sm:text-[56px]"
                />
                <div className="mt-6 inline-flex items-center gap-2.5 text-[12px]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                    chartered by
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/25 via-gold/10 to-copper/10 font-display text-[10px] font-bold text-gold">
                    A
                  </span>
                  <span className="font-display text-[14px] italic text-text">Ada Marlowe</span>
                </div>
              </section>

              <Divider />

              {/* — I · Premise — */}
              <Section index="I" label="Premise" hint="The first thing applicants read">
                <textarea
                  aria-label="Adventure premise"
                  defaultValue="A salt-road city has begun receiving maps of rooms that do not exist yet. Each morning, one more door appears exactly where the ink predicted. The Cartographer has not been seen in nine days, and her last apprentice is yours."
                  className="block w-full resize-none rounded-md border border-gold/[0.08] bg-surface/40 px-5 py-5 font-reading text-[20px] leading-[1.55] text-text outline-none transition-colors focus:border-gold/30"
                  rows={5}
                />
                <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  43 / 240 words
                </p>
              </Section>

              <Divider />

              {/* — II · Tone & Pace — */}
              <Section index="II" label="Tone & Pace">
                <div className="space-y-6">
                  <ToneSlider label="Wonder" rightLabel="Dread" position={0.62} />
                  <ToneSlider label="Episodic" rightLabel="Continuous" position={0.45} />
                  <ToneSlider label="Loose ruling" rightLabel="Tight ruling" position={0.32} />
                </div>

                <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  Setting signals
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {GENRES.map((g, i) => (
                    <Stamp key={g} variant={i === 0 ? "gold" : "ink"}>
                      {g}
                    </Stamp>
                  ))}
                  <button
                    type="button"
                    className="rounded-md border border-dashed border-border/70 px-3 py-1 font-body text-[12px] text-text-ghost transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    + add signal
                  </button>
                </div>
              </Section>

              <Divider />

              {/* — III · Reader guidance — */}
              <Section index="III" label="Reader Guidance">
                <div className="grid gap-7 sm:grid-cols-[1fr_1fr]">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                      Rating
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {RATINGS.map((r) => {
                        const active = r === selectedRating;
                        return (
                          <button
                            key={r}
                            type="button"
                            className={`relative rounded-md border px-2 py-2 font-body text-[11px] transition-colors ${
                              active
                                ? "border-gold/40 bg-gradient-to-b from-gold/[0.18] to-gold/[0.04] text-paper shadow-[0_0_18px_rgba(212,175,55,0.18)]"
                                : "border-border bg-surface/40 text-text-secondary hover:border-border-active"
                            }`}
                          >
                            {r}
                            {active && (
                              <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                      Content notes
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {CONTENT_NOTES.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border border-border bg-elevated/60 px-2.5 py-1 font-body text-[11px] text-text-secondary"
                        >
                          {n}
                        </span>
                      ))}
                      <button
                        type="button"
                        className="rounded-full border border-dashed border-border/70 px-2.5 py-1 font-body text-[11px] text-text-ghost hover:border-gold/40 hover:text-gold"
                      >
                        + add note
                      </button>
                    </div>
                  </div>
                </div>
              </Section>

              <Divider />

              {/* — IV · Opening invitation — */}
              <Section index="IV" label="Opening Invitation" hint="First words at the table">
                <blockquote className="relative rounded-md border border-gold/[0.14] bg-gradient-to-br from-surface/55 to-elevated/45 px-7 py-7">
                  <span className="pointer-events-none absolute -top-3 left-4 font-display text-[44px] leading-none text-gold/40">
                    “
                  </span>
                  <textarea
                    aria-label="Opening invitation"
                    defaultValue="Bring a character with a debt, a false name, or a reason to distrust maps. The first session opens at the archive fire."
                    rows={3}
                    className="block w-full resize-none bg-transparent font-reading text-[17px] italic leading-[1.6] text-text outline-none placeholder:text-text-ghost"
                  />
                  <span className="pointer-events-none absolute -bottom-8 right-4 font-display text-[44px] leading-none text-gold/40">
                    ”
                  </span>
                </blockquote>
              </Section>

              {/* Ornamental divider */}
              <div className="my-10 flex items-center justify-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/30" />
                <Fleuron size={20} />
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/30" />
              </div>

              {/* — CTA: Wax-seal "Open the table" — */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  className="group relative flex items-center gap-4 rounded-full border border-gold/40 bg-gradient-to-b from-gold/22 via-gold/12 to-copper/12 px-7 py-3.5 font-display text-[15px] font-semibold text-gold shadow-[0_0_40px_rgba(212,175,55,0.22)] transition-all hover:border-gold/70 hover:text-paper hover:shadow-[0_0_60px_rgba(212,175,55,0.4)]"
                >
                  <WaxSeal />
                  <span>Seal & open the table</span>
                  <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-gold/70 group-hover:text-paper/80 sm:inline">
                    sends to 12 followers
                  </span>
                </button>
                <button
                  type="button"
                  className="font-body text-[12px] text-text-ghost transition-colors hover:text-text"
                >
                  Save as draft · ⌘S
                </button>
              </div>
            </div>
          </article>

          {/* RIGHT: Live player view + pulse ───────────────────────── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">
                  <Fleuron size={10} />
                  What applicants see
                </p>
                <button className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold/70 hover:text-gold">
                  open full ↗
                </button>
              </div>

              {/* — Postcard preview — */}
              <div className="relative rounded-2xl border border-gold/15 bg-gradient-to-br from-elevated/92 to-surface/88 p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
                <div className="relative overflow-hidden rounded-xl">
                  <div className="relative aspect-[5/4]">
                    <Image
                      src="/adventure_mode.png"
                      alt=""
                      fill
                      sizes="420px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-elevated via-elevated/30 to-transparent" />
                    <div className="absolute right-3 top-3">
                      <WaxSeal />
                    </div>
                  </div>
                  <div className="absolute inset-x-4 bottom-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold/80">
                      An adventure by Ada Marlowe
                    </p>
                    <h3 className="mt-1 font-display text-[24px] leading-[0.98] text-paper">
                      The Ashen Cartographer
                    </h3>
                  </div>
                </div>

                <p className="mt-4 px-2 font-reading text-[13px] leading-[1.55] text-text-secondary">
                  A salt-road city has begun receiving maps of rooms that do not exist yet. Each
                  morning, one more door appears exactly where the ink predicted…
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5 px-2">
                  {["Fantasy", "Mystery", "Dark"].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-surface/50 px-2 py-0.5 font-body text-[10px] text-text-secondary"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Seats — lantern dots */}
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-gold/[0.12] bg-void/30 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalSeats }).map((_, i) => (
                      <Lantern key={i} lit={i < filledSeats} />
                    ))}
                  </div>
                  <div className="ml-auto text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                      Seats
                    </p>
                    <p className="font-display text-[14px] text-paper">
                      {filledSeats} of {totalSeats}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-3 w-full rounded-full border border-gold/30 bg-gradient-to-b from-gold/18 to-gold/5 py-2.5 font-display text-[13px] font-semibold text-gold transition-colors hover:border-gold/50 hover:text-paper"
                >
                  Request a seat
                </button>
                <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-text-ghost">
                  Teen · violence · horror · death
                </p>
              </div>

              {/* — Charter pulse — */}
              <div className="rounded-2xl border border-border bg-elevated/70 p-5 backdrop-blur-xl">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                  Charter pulse
                </p>
                <div className="mt-4 space-y-3.5">
                  <PulseRow label="Reviewing the draft" value={`${applicants} applicants`} accent />
                  <PulseRow label="Will be notified at open" value="12 followers" />
                  <PulseRow label="Estimated fill time" value="≈ 36 hours" />
                  <PulseRow label="First session window" value="Sat · 8pm CET" />
                </div>
              </div>

              {/* — Inline coaching — */}
              <div className="rounded-2xl border border-gold/[0.18] bg-gradient-to-br from-gold/[0.06] to-transparent p-5">
                <p className="font-display text-[14px] text-paper">
                  A charter is a promise, not a contract.
                </p>
                <p className="mt-2 font-body text-[12px] leading-relaxed text-text-secondary">
                  Players will gather under what you write. Be evocative, be honest about the room
                  you want at your table.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// ───────────────────────── helpers ─────────────────────────

function Section({
  index,
  label,
  hint,
  children,
}: {
  index: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-display text-[14px] tracking-[0.2em] text-gold/60">{index}</span>
        <h2 className="font-display text-[19px] tracking-tight text-paper">{label}</h2>
        {hint && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
            · {hint}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Divider() {
  return <div className="mt-9 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />;
}

function Pip() {
  return <span className="h-0.5 w-0.5 rounded-full bg-text-ghost/50" />;
}

function Fleuron({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-gold/70">
      <path
        d="M12 3v6M12 15v6M3 12h6M15 12h6"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <path
        d="M7.8 7.8l2 2M14.2 14.2l2 2M14.2 9.8l2-2M9.8 14.2l-2 2"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function CornerOrnament({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={`text-gold/30 ${className}`}
      aria-hidden
    >
      <path
        d="M2 2h7M2 2v7M2 9c4.5 0 7-2.5 7-7"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ToneSlider({
  label,
  rightLabel,
  position,
}: {
  label: string;
  rightLabel: string;
  position: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
        <span>{label}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="relative mt-2 h-[2px] rounded-full bg-gradient-to-r from-gold/25 via-border to-gold/25">
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-gold/60 bg-gradient-to-br from-gold to-copper shadow-[0_0_10px_rgba(212,175,55,0.55)]"
          style={{ left: `calc(${position * 100}% - 6px)` }}
        />
      </div>
    </div>
  );
}

function Stamp({
  children,
  variant = "ink",
}: {
  children: React.ReactNode;
  variant?: "ink" | "gold";
}) {
  return (
    <span
      className={`relative rounded-md border px-3 py-1 font-body text-[12px] tracking-wide transition-colors ${
        variant === "gold"
          ? "border-gold/30 bg-gradient-to-b from-gold/15 to-transparent text-paper"
          : "border-border bg-surface/40 text-text-secondary hover:border-gold/30 hover:text-paper"
      }`}
    >
      {children}
    </span>
  );
}

function Lantern({ lit }: { lit: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full transition-all ${
        lit
          ? "bg-gradient-to-br from-gold to-copper shadow-[0_0_8px_rgba(212,175,55,0.6)]"
          : "border border-border bg-elevated"
      }`}
    />
  );
}

function WaxSeal() {
  return (
    <span className="relative inline-flex h-8 w-8 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-ruby/80 via-ruby/55 to-copper/55 shadow-[0_0_12px_rgba(178,34,52,0.45),inset_-2px_-2px_4px_rgba(0,0,0,0.4),inset_2px_2px_4px_rgba(255,255,255,0.12)]" />
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        className="relative text-paper/90"
        aria-hidden
      >
        <path d="M12 3l2.4 5.2 5.6.6-4.2 3.8 1.3 5.5L12 15.5 6.9 18.1l1.3-5.5L4 8.8l5.6-.6z" fill="currentColor" opacity="0.9" />
      </svg>
    </span>
  );
}

function PulseRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
        {label}
      </span>
      <span className={`font-body text-[12px] ${accent ? "font-semibold text-gold" : "text-text"}`}>
        {value}
      </span>
    </div>
  );
}

function Grain() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.028] mix-blend-overlay"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <filter id="charter-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#charter-grain)" />
    </svg>
  );
}
