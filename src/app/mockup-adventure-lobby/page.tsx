import Image from "next/image";

// ── Fake data (mockup only) ───────────────────────────────────────────────
const TITLE = "The Ashen Cartographer";
const GM = "Ada Marlowe";
const COUNTDOWN = "2 days · 14 hours";
const LEADING_NIGHT = "Sat · 8pm CET";

const PARTY: Seat[] = [
  { state: "lit", character: "Rook", player: "Mira", tone: "the apprentice", color: "gold" },
  { state: "lit", character: "Vellis Tarn", player: "Joren", tone: "the cartwright", color: "copper" },
  { state: "lit", character: "Hollow", player: "Cass", tone: "the unmapped", color: "amethyst" },
  { state: "empty", character: "", player: "", tone: "" },
  { state: "empty", character: "", player: "", tone: "" },
  { state: "empty", character: "", player: "", tone: "" },
];

const APPLICANTS = [
  { name: "Sable Marsh", player: "Pip Carter", pitch: "A debt collector who only takes memories." },
  { name: "Echo of the Salt", player: "Will Trent", pitch: "Speaks for a place that no longer exists." },
];

const POLL_OPTIONS = [
  { label: "Sat · 8pm CET", votes: 4, leading: true },
  { label: "Sun · 6pm CET", votes: 2 },
  { label: "Tue · 9pm CET", votes: 1 },
];

const GENRES = ["Fantasy", "Mystery", "Dark Fantasy"];

type Seat = {
  state: "lit" | "empty";
  character: string;
  player: string;
  tone: string;
  color?: "gold" | "copper" | "amethyst" | "sage" | "rose";
};

export default function AdventureLobbyMockup() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-void text-paper">
      {/* Custom flame flicker keyframes — Tailwind ships `pulse`/`spin` already */}
      <style>{`
        @keyframes flicker {
          0%, 100% { opacity: 0.95; transform: translate(-50%, -50%) scale(1, 1); }
          25% { opacity: 0.78; transform: translate(-50%, -50%) scale(1.06, 0.95); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(0.97, 1.07); }
          75% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.03, 0.97); }
        }
      `}</style>

      {/* ── Atmospheric backdrop ─────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0">
        <Image
          src="/adventure_mode.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.05] saturate-[0.55] blur-[3px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,var(--t-gold-glow)_0%,transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,transparent_25%,rgba(8,5,3,0.92)_100%)]" />
        <Grain />
      </div>

      <div className="relative z-10 mx-auto max-w-[1240px] px-6 pt-24 pb-24 lg:px-10">
        {/* ── Breadcrumb + status chip ─────────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-12">
          <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">
            <span>Quiloria</span>
            <Pip />
            <span>Adventures</span>
            <Pip />
            <span className="text-gold/85">{TITLE}</span>
            <Pip />
            <span>Lobby</span>
          </nav>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Table open · awaiting curtain
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost">
              #4F9A2
            </span>
          </div>
        </header>

        {/* ── Atmospheric title ────────────────────────────────── */}
        <section className="mb-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.36em] text-gold/70">
            Pre-session Lobby
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="h-px w-24 bg-gradient-to-r from-transparent to-gold/40" />
            <Fleuron size={14} />
            <span className="h-px w-24 bg-gradient-to-l from-transparent to-gold/40" />
          </div>
          <h1 className="mt-5 font-display text-[42px] font-medium leading-[1.04] tracking-[-0.005em] text-paper sm:text-[56px]">
            Gather at the lantern.
          </h1>
          <p className="mt-4 font-reading text-[15px] italic text-text-secondary">
            The charter is sealed. The room is quiet. Three seats remain unlit.
          </p>
        </section>

        {/* ══════════════════════════════════════════════════════
           THE TABLE — bigger lantern + integrated poll + host + seats + door
           ══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden rounded-[22px] border border-gold/[0.14] bg-gradient-to-br from-surface/85 via-surface/70 to-elevated/85 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          {/* Inner radial glow from "lantern" — deeper now */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_50%_12%,rgba(212,175,55,0.22)_0%,transparent_55%)]" />

          <CornerOrnament className="absolute left-3 top-3" />
          <CornerOrnament className="absolute right-3 top-3 -scale-x-100" />
          <CornerOrnament className="absolute left-3 bottom-3 -scale-y-100" />
          <CornerOrnament className="absolute right-3 bottom-3 -scale-100" />

          <div className="relative px-6 pb-10 pt-28 sm:px-12 sm:pb-14 sm:pt-32">
            {/* —— Big lantern centerpiece —— */}
            <div className="flex flex-col items-center text-center">
              <CountdownLantern />
              <p className="mt-36 font-mono text-[10px] uppercase tracking-[0.32em] text-gold/65">
                The lantern lights in
              </p>
              <p className="mt-2 font-display text-[40px] leading-none tracking-tight text-paper sm:text-[52px]">
                {COUNTDOWN}
              </p>
              <p className="mt-2 font-reading text-[14px] italic text-text-secondary">
                {LEADING_NIGHT} <span className="text-gold/80">· currently leading</span>
              </p>
            </div>

            {/* —— Candidate nights — the poll IS the countdown source —— */}
            <div className="mx-auto mt-10 max-w-2xl">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/25" />
                <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold/65">
                  Candidate nights
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/25" />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {POLL_OPTIONS.map((opt) => (
                  <CandidateTile key={opt.label} opt={opt} totalVotes={7} />
                ))}
              </div>
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                Voted by the table · 7 votes · poll closes in 1d
              </p>
            </div>

            {/* —— Host card — GM at the head of the arc —— */}
            <div className="mx-auto mt-12 max-w-lg">
              <HostCard />
            </div>

            {/* —— "Around the lantern" ornament divider —— */}
            <div className="my-10 flex items-center justify-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/25" />
              <span className="font-mono text-[10px] uppercase tracking-[0.36em] text-gold/55">
                Around the lantern · 3 of 6 lit
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/25" />
            </div>

            {/* —— Party seats —— */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {PARTY.map((seat, i) => (
                <SeatCard key={i} seat={seat} index={i} />
              ))}
            </div>

            {/* —— At the door (applicants) —— */}
            <div className="mt-12 rounded-2xl border border-amber/[0.18] bg-gradient-to-br from-amber/[0.05] to-transparent p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <DoorIcon />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70">
                      At the door
                    </p>
                    <p className="mt-1 font-display text-[18px] text-paper">
                      Two travellers are waiting to be welcomed.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-gold/25 bg-void/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gold/80 hover:border-gold/50 hover:text-paper"
                >
                  Review all ↗
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {APPLICANTS.map((a) => (
                  <ApplicantCard key={a.name} applicant={a} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
           RITUALS — what to do while you wait (now 2 cards, poll moved up)
           ══════════════════════════════════════════════════════ */}
        <section className="mt-12">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-[22px] text-paper">Rituals before the first scene</h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">
              · while you wait
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* — Ritual: Open invitations — */}
            <RitualCard icon="seal" title="Open invitations" subtitle="Share the door with three more souls.">
              <div className="mt-5 rounded-lg border border-gold/[0.14] bg-void/30 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                  Charter link
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 truncate font-mono text-[11px] text-gold/80">
                    quiloria.app/join/ashen-4f9a2
                  </code>
                  <button
                    type="button"
                    className="rounded-md border border-gold/25 bg-gold/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:border-gold/50 hover:text-paper"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <ShareTile label="Mastodon" />
                <ShareTile label="Discord" />
                <ShareTile label="Email" />
              </div>
            </RitualCard>

            {/* — Ritual: Opening scene — */}
            <RitualCard icon="quill" title="The opening scene" subtitle="The first words at the table.">
              <div className="mt-4 rounded-lg border border-gold/[0.14] bg-gradient-to-br from-surface/40 to-elevated/30 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  Drafted · 184 words
                </p>
                <p className="mt-2 font-reading text-[13px] italic leading-[1.55] text-text-secondary line-clamp-4">
                  &ldquo;The archive fire crackles in the salt-dark. A folded chart waits on the table,
                  sealed in ink that has not yet dried…&rdquo;
                </p>
              </div>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-void/30 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold/80 hover:border-gold/50 hover:text-paper"
              >
                Continue drafting ↗
              </button>
            </RitualCard>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
           THE PROMISE — tone bars + genres + opening invitation
           ══════════════════════════════════════════════════════ */}
        <section className="mt-12 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-gold/[0.14] bg-gradient-to-br from-surface/65 to-elevated/65 p-7 backdrop-blur-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70">
              The promise of this table
            </p>
            <h3 className="mt-3 font-display text-[22px] text-paper">A balanced wonder, leaning haunted.</h3>

            <div className="mt-7 space-y-6">
              <ToneSlider label="Wonder" rightLabel="Dread" position={0.62} />
              <ToneSlider label="Episodic" rightLabel="Continuous" position={0.45} />
              <ToneSlider label="Loose ruling" rightLabel="Tight ruling" position={0.32} />
            </div>

            <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
              Setting signals
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {GENRES.map((g, i) => (
                <Stamp key={g} variant={i === 0 ? "gold" : "ink"}>{g}</Stamp>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-gold/[0.14] bg-gradient-to-br from-elevated/85 to-surface/85 p-7 backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,var(--t-gold-glow),transparent_60%)] opacity-50" />
            <p className="relative font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70">
              The opening invitation
            </p>
            <blockquote className="relative mt-5 rounded-md border border-gold/[0.18] bg-void/30 px-6 py-6">
              <span className="pointer-events-none absolute -top-3 left-4 font-display text-[44px] leading-none text-gold/45">
                &ldquo;
              </span>
              <p className="font-reading text-[17px] italic leading-[1.6] text-text">
                Bring a character with a debt, a false name, or a reason to distrust maps. The first
                session opens at the archive fire.
              </p>
              <span className="pointer-events-none absolute -bottom-8 right-4 font-display text-[44px] leading-none text-gold/45">
                &rdquo;
              </span>
            </blockquote>
            <p className="relative mt-7 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
              Posted by <span className="text-text">{GM}</span> · 2 days ago
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
           LANTERN VIGIL — readiness checklist + final CTA
           ══════════════════════════════════════════════════════ */}
        <section className="mt-14">
          <div className="relative overflow-hidden rounded-[22px] border border-gold/25 bg-gradient-to-br from-void/85 via-surface/55 to-void/85 p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] sm:p-12">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.18)_0%,transparent_55%)]" />

            <div className="relative grid gap-10 lg:grid-cols-[1fr_minmax(280px,360px)] lg:gap-16">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold/65">
                  The lantern is lit when…
                </p>
                <h3 className="mt-3 font-display text-[28px] leading-[1.1] tracking-tight text-paper sm:text-[34px]">
                  Three more breaths and the curtain rises.
                </h3>

                <div className="mt-8 space-y-4">
                  <CheckRow lit={true} label="The charter has been sealed" caption="2 days ago" />
                  <CheckRow lit={true} label="At least one seat is lit" caption="3 of 6" />
                  <CheckRow lit={true} label="The opening scene is drafted" caption="184 words" />
                  <CheckRow lit={false} label="The party has agreed on a night" caption="poll closes in 1d" />
                  <CheckRow lit={false} label="The two at the door have been answered" caption="2 applicants pending" />
                </div>
              </div>

              <aside className="flex flex-col items-center justify-center text-center">
                <div className="relative">
                  <LightLanternCTA />
                </div>
                <p className="mt-5 font-display text-[15px] italic text-text-secondary">
                  Or wait for Saturday. The lantern keeps.
                </p>
                <button type="button" className="mt-2 font-body text-[12px] text-text-ghost hover:text-text">
                  Begin the first session anyway →
                </button>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Pieces
// ═══════════════════════════════════════════════════════════════════════════

function CountdownLantern() {
  return (
    <div className="relative">
      {/* Outer halo — bigger, deeper */}
      <div className="pointer-events-none absolute inset-[-100px] rounded-full bg-[radial-gradient(circle,var(--t-gold-glow),transparent_60%)] opacity-80" />
      {/* Hanging chain — vanishing into the dark above */}
      <div className="absolute left-1/2 top-[-110px] h-28 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-gold/25 to-gold/55" />

      {/* Lantern body — ~224px tall */}
      <div className="relative flex h-56 w-44 flex-col items-center">
        {/* Top finial */}
        <div className="h-1.5 w-2 rounded-t-full bg-copper" />
        <div className="-mt-px h-1.5 w-5 rounded-sm bg-gradient-to-b from-copper to-copper/55" />
        {/* Cap */}
        <div className="-mt-px h-3 w-20 rounded-t-md bg-gradient-to-b from-copper via-copper/80 to-copper/45 shadow-[0_0_12px_rgba(184,115,51,0.5)]" />
        <div className="-mt-px h-2.5 w-28 rounded-sm bg-gradient-to-b from-copper/85 to-copper/40 shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
        {/* Glass body */}
        <div className="relative -mt-px h-40 w-32 overflow-hidden rounded-md border border-copper/45 bg-gradient-to-b from-gold/28 via-gold/12 to-copper/22 shadow-[inset_0_0_40px_rgba(212,175,55,0.4),inset_4px_0_10px_rgba(255,255,255,0.12),0_0_60px_rgba(212,175,55,0.55)]">
          {/* Flame — three layered orbs, staggered flicker */}
          <div
            className="absolute left-1/2 top-1/2 h-28 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#FFE5A8_0%,rgba(212,175,55,0.85)_42%,transparent_75%)] blur-[2px]"
            style={{ animation: "flicker 2.6s ease-in-out infinite" }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-20 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#FFF5DC_0%,#FFE5A8_50%,transparent_82%)] blur-[1px]"
            style={{ animation: "flicker 1.7s ease-in-out infinite 0.3s" }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-10 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper/95 blur-[0.5px]"
            style={{ animation: "flicker 1.1s ease-in-out infinite 0.6s" }}
          />
          {/* Glass frame cross */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-copper/25" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-copper/12" />
          {/* Refraction highlight on the left edge */}
          <div className="absolute inset-y-3 left-2 w-1 rounded-full bg-gradient-to-b from-paper/35 via-paper/10 to-transparent blur-[1.5px]" />
        </div>
        {/* Base */}
        <div className="-mt-px h-2 w-28 rounded-sm bg-gradient-to-b from-copper/85 to-copper/45 shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
        <div className="-mt-px h-1.5 w-24 rounded-b-md bg-gradient-to-b from-copper/70 to-copper/30" />
      </div>

      {/* Pool of light on the table surface below the lantern */}
      <div className="pointer-events-none absolute left-1/2 bottom-[-110px] h-36 w-[560px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.42)_0%,rgba(212,175,55,0.15)_38%,transparent_72%)] blur-[2px]" />
      {/* Implied table-line at the pool's far edge */}
      <div className="pointer-events-none absolute left-1/2 bottom-[-50px] h-px w-[460px] -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/22 to-transparent" />
    </div>
  );
}

function HostCard() {
  return (
    <div>
      {/* "HOST" ornament label */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/30" />
        <span className="font-mono text-[10px] uppercase tracking-[0.36em] text-gold/70">
          ✦ Host
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/30" />
      </div>

      <div className="mt-4 flex items-center gap-5 rounded-2xl border border-gold/25 bg-gradient-to-br from-elevated/92 to-surface/65 p-5 shadow-[0_0_36px_rgba(212,175,55,0.16),inset_0_0_30px_rgba(212,175,55,0.05)]">
        {/* Larger portrait disc */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-gold/45 bg-gradient-to-br from-gold/30 via-gold/12 to-copper/15 font-display text-[26px] font-bold text-gold shadow-[0_0_24px_rgba(212,175,55,0.45)]">
          A
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-elevated bg-gradient-to-br from-gold to-copper shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
        </div>

        {/* Identity + live status */}
        <div className="min-w-0 flex-1 text-left">
          <p className="font-display text-[20px] leading-tight text-paper">{GM}</p>
          <p className="mt-0.5 font-reading text-[12px] italic text-text-secondary">
            The cartographer&rsquo;s voice · Game Master
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <Fleuron size={9} />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold/75">
              drafting the opening scene
            </span>
            <span className="ml-1 inline-flex items-center gap-0.5">
              <Spark delay="0s" />
              <Spark delay="0.2s" />
              <Spark delay="0.4s" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateTile({
  opt,
  totalVotes,
}: {
  opt: { label: string; votes: number; leading?: boolean };
  totalVotes: number;
}) {
  const pct = Math.round((opt.votes / totalVotes) * 100);
  return (
    <button
      type="button"
      className={`group relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-all ${
        opt.leading
          ? "border-gold/40 bg-gradient-to-br from-gold/15 to-gold/[0.04] shadow-[0_0_24px_rgba(212,175,55,0.18)] hover:border-gold/60"
          : "border-border bg-void/30 hover:border-gold/30 hover:bg-void/50"
      }`}
    >
      {/* Vote-share fill bar */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 ${
          opt.leading
            ? "bg-gradient-to-r from-gold/20 via-gold/8 to-transparent"
            : "bg-gradient-to-r from-paper/[0.05] to-transparent"
        }`}
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className={`font-display text-[14px] leading-tight ${opt.leading ? "text-paper" : "text-text-secondary"}`}>
            {opt.label}
          </p>
          {opt.leading && (
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-gold/85">
              ✦ leading
            </p>
          )}
        </div>
        <div className="text-right">
          <p className={`font-display text-[18px] tabular-nums leading-none ${opt.leading ? "text-gold" : "text-text-ghost"}`}>
            {opt.votes}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">votes</p>
        </div>
      </div>
    </button>
  );
}

function SeatCard({ seat, index }: { seat: Seat; index: number }) {
  if (seat.state === "empty") {
    return (
      <div className="group flex flex-col items-center rounded-xl border border-dashed border-gold/[0.18] bg-void/20 px-3 py-4 transition-colors hover:border-gold/35">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-dashed border-gold/30 [animation:spin_18s_linear_infinite]" />
          <span className="font-display text-[18px] text-gold/40">⛶</span>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
          Seat {index + 1}
        </p>
        <p className="mt-1 font-display text-[13px] italic text-text-ghost/80">awaiting</p>
      </div>
    );
  }

  const tones: Record<NonNullable<Seat["color"]>, string> = {
    gold: "from-gold/25 via-gold/10 to-copper/10 text-gold border-gold/35",
    copper: "from-copper/25 via-copper/10 to-gold/10 text-copper border-copper/35",
    amethyst: "from-amethyst/25 via-amethyst/10 to-gold/5 text-amethyst border-amethyst/35",
    sage: "from-sage/25 via-sage/10 to-gold/5 text-sage border-sage/35",
    rose: "from-rose/25 via-rose/10 to-gold/5 text-rose border-rose/35",
  };
  const tone = tones[seat.color || "gold"];
  const initial = seat.character.charAt(0).toUpperCase();

  return (
    <div className="group relative flex flex-col items-center rounded-xl border border-gold/[0.14] bg-gradient-to-br from-elevated/80 to-surface/55 px-3 py-4 shadow-[inset_0_0_24px_rgba(212,175,55,0.06)] transition-all hover:border-gold/30">
      <div className={`relative flex h-14 w-14 items-center justify-center rounded-full border bg-gradient-to-br font-display text-[20px] font-bold shadow-[0_0_18px_rgba(212,175,55,0.25)] ${tone}`}>
        {initial}
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-elevated bg-gold shadow-[0_0_6px_rgba(212,175,55,0.7)]" />
      </div>
      <p className="mt-3 font-display text-[14px] text-paper">{seat.character}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">{seat.player}</p>
      <p className="mt-1 font-reading text-[11px] italic text-text-secondary">{seat.tone}</p>
    </div>
  );
}

function ApplicantCard({ applicant }: { applicant: { name: string; player: string; pitch: string } }) {
  return (
    <div className="group relative rounded-xl border border-amber/[0.18] bg-gradient-to-br from-amber/[0.06] to-transparent p-4 transition-colors hover:border-amber/30">
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber/30 bg-gradient-to-br from-amber/25 via-amber/10 to-copper/10 font-display text-[14px] font-bold text-amber">
          {applicant.name.charAt(0)}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-elevated bg-amber [animation:pulse_2s_ease-in-out_infinite]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] text-paper">{applicant.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
            {applicant.player}
          </p>
        </div>
      </div>
      <p className="mt-3 font-reading text-[13px] italic leading-[1.5] text-text-secondary">
        &ldquo;{applicant.pitch}&rdquo;
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-full border border-sage/30 bg-sage/10 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-sage hover:border-sage/55 hover:text-paper"
        >
          Welcome in
        </button>
        <button
          type="button"
          className="rounded-full border border-border bg-void/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-text-ghost hover:border-rose/40 hover:text-rose"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

function RitualCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: "seal" | "quill";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/[0.12] bg-gradient-to-br from-surface/75 to-elevated/65 p-6 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gradient-to-br from-gold/15 to-copper/10 text-gold shadow-[0_0_18px_rgba(212,175,55,0.18)]">
          {icon === "seal" && <SealIcon />}
          {icon === "quill" && <QuillIcon />}
        </div>
        <div>
          <p className="font-display text-[15px] text-paper">{title}</p>
          <p className="mt-0.5 font-reading text-[12px] italic text-text-secondary">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ShareTile({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-md border border-border bg-void/30 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary transition-colors hover:border-gold/30 hover:text-gold"
    >
      {label}
    </button>
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
      className={`rounded-md border px-3 py-1 font-body text-[12px] tracking-wide ${
        variant === "gold"
          ? "border-gold/30 bg-gradient-to-b from-gold/15 to-transparent text-paper"
          : "border-border bg-surface/40 text-text-secondary"
      }`}
    >
      {children}
    </span>
  );
}

function CheckRow({ lit, label, caption }: { lit: boolean; label: string; caption?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          lit
            ? "border-gold/50 bg-gradient-to-br from-gold to-copper shadow-[0_0_10px_rgba(212,175,55,0.7)]"
            : "border-border bg-void/40"
        }`}
      >
        {lit && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-void">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <div className="flex flex-1 items-baseline justify-between gap-3">
        <span className={`font-display text-[15px] ${lit ? "text-paper" : "text-text-ghost"}`}>
          {label}
        </span>
        {caption && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}

function LightLanternCTA() {
  return (
    <button
      type="button"
      className="group relative flex flex-col items-center gap-4 rounded-3xl border border-gold/40 bg-gradient-to-b from-gold/25 via-gold/12 to-copper/15 px-10 py-7 shadow-[0_0_60px_rgba(212,175,55,0.3)] transition-all hover:border-gold/70 hover:shadow-[0_0_80px_rgba(212,175,55,0.5)]"
    >
      <div className="relative">
        <div className="absolute inset-[-20px] rounded-full bg-[radial-gradient(circle,var(--t-gold-glow),transparent_70%)] opacity-70 transition-opacity group-hover:opacity-100" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-paper/95 via-gold to-copper shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.3),inset_3px_3px_6px_rgba(255,255,255,0.4)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-void">
            <path
              d="M12 2c-1 4-5 5-5 9a5 5 0 0010 0c0-4-4-5-5-9z"
              fill="currentColor"
              opacity="0.85"
            />
          </svg>
        </div>
      </div>
      <span className="font-display text-[18px] font-semibold text-paper">Light the lantern</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold/80">
        Begin the first session
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tiny components / icons
// ═══════════════════════════════════════════════════════════════════════════

function Pip() {
  return <span className="h-0.5 w-0.5 rounded-full bg-text-ghost/50" />;
}

function Fleuron({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-gold/70">
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <path d="M7.8 7.8l2 2M14.2 14.2l2 2M14.2 9.8l2-2M9.8 14.2l-2 2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function CornerOrnament({ className = "" }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={`text-gold/30 ${className}`} aria-hidden>
      <path d="M2 2h7M2 2v7M2 9c4.5 0 7-2.5 7-7" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function Spark({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1 w-1 rounded-full bg-gold/80 [animation:pulse_1.2s_ease-in-out_infinite]"
      style={{ animationDelay: delay }}
    />
  );
}

function DoorIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber/30 bg-gradient-to-br from-amber/15 to-copper/10 text-amber">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22V4a2 2 0 012-2h12a2 2 0 012 2v18" />
        <path d="M4 22h16" />
        <circle cx="15" cy="13" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}

function SealIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 5l1.6 4 4 .4-3 2.7.9 4-3.5-2-3.5 2 .9-4-3-2.7 4-.4z" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function QuillIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 4c-7 1-12 6-13 13l-2 3 3-2c7-1 12-6 13-13z" />
      <path d="M14 6l-9 9" />
    </svg>
  );
}

function Grain() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.028] mix-blend-overlay" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <filter id="lobby-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#lobby-grain)" />
    </svg>
  );
}
