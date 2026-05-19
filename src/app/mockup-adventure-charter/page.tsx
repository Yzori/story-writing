import Image from "next/image";

const genres = ["Fantasy", "Mystery", "Dark Fantasy", "Political Intrigue", "Exploration"];
const notes = ["Violence", "Horror", "Death"];

export default function AdventureCharterMockup() {
  return (
    <main className="min-h-screen bg-void text-paper overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <Image
          src="/adventure_mode.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.08] blur-sm saturate-[0.65] mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,var(--t-gold-glow),transparent_34rem)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--t-ink)_0%,transparent_18%,transparent_82%,var(--t-ink)_100%)]" />
      </div>

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-10">
        <aside className="lg:sticky lg:top-10 lg:h-[calc(100vh-5rem)]">
          <div className="h-full rounded-lg border border-border bg-surface/65 p-3 shadow-card backdrop-blur-xl">
            <div className="relative h-[52vh] min-h-[420px] overflow-hidden rounded-md border border-border lg:h-full">
              <Image
                src="/adventure_mode.png"
                alt=""
                fill
                priority
                sizes="360px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-surface)_0%,transparent_44%)]" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="font-body text-[10px] uppercase tracking-[0.18em] text-gold-dark">Adventure mode</p>
                <h1 className="mt-2 font-display text-[34px] leading-[0.98] text-paper">
                  Expedition Charter
                </h1>
                <p className="mt-4 max-w-[22rem] font-body text-[13px] leading-relaxed text-text-secondary">
                  Shape the invitation your players will understand at a glance: premise, tone,
                  safety notes, and the first promise of the table.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex items-center">
          <form className="w-full rounded-lg border border-border bg-elevated/90 shadow-modal backdrop-blur-xl">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="p-7 sm:p-10 lg:p-12">
                <div className="flex items-start justify-between gap-6 border-b border-border pb-8">
                  <div>
                    <p className="font-body text-[10px] uppercase tracking-[0.22em] text-text-ghost">
                      New adventure
                    </p>
                    <input
                      aria-label="Adventure title"
                      defaultValue="The Ashen Cartographer"
                      className="mt-3 w-full bg-transparent font-display text-[40px] leading-[1] text-paper outline-none sm:text-[52px]"
                    />
                  </div>
                  <span className="hidden shrink-0 rounded-full border border-border bg-surface px-3 py-1 font-body text-[10px] uppercase tracking-[0.14em] text-text-secondary sm:inline-flex">
                    Draft
                  </span>
                </div>

                <label className="mt-9 block font-body text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                  Table premise
                </label>
                <textarea
                  aria-label="Adventure premise"
                  defaultValue="A salt-road city has begun receiving maps of rooms that do not exist yet. Each morning, one more door appears exactly where the ink predicted."
                  className="mt-3 min-h-[150px] w-full resize-none rounded-md border border-border bg-surface/55 px-4 py-4 font-reading text-[20px] leading-relaxed text-text outline-none focus:border-border-active"
                />

                <div className="mt-10 grid gap-8 border-t border-border pt-8 xl:grid-cols-2">
                  <section>
                    <div className="flex items-center justify-between">
                      <h2 className="font-body text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                        Setting signals
                      </h2>
                      <span className="font-mono text-[10px] text-text-tertiary">5/5</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {genres.map((genre) => (
                        <button
                          key={genre}
                          type="button"
                          className="rounded-full border border-border bg-transparent px-3 py-1.5 font-body text-[12px] text-text-secondary transition-colors hover:border-border-active hover:text-paper"
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-4 font-body text-[12px] text-gold-dark transition-colors hover:text-gold"
                    >
                      Edit genre set
                    </button>
                  </section>

                  <section>
                    <h2 className="font-body text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                      Reader guidance
                    </h2>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {["All Ages", "Teen", "Mature", "Explicit"].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          className={`rounded-md border px-3 py-2 text-left font-body text-[12px] transition-colors ${
                            rating === "Teen"
                              ? "border-gold/40 bg-gold-soft text-paper"
                              : "border-border bg-transparent text-text-secondary hover:border-border-active"
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {notes.map((note) => (
                        <span
                          key={note}
                          className="rounded-full border border-border bg-surface px-2.5 py-1 font-body text-[11px] text-text-secondary"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="mt-10 border-t border-border pt-8">
                  <label className="font-body text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                    Opening invitation
                  </label>
                  <div className="mt-3 rounded-md border border-border bg-surface/50 p-4">
                    <p className="font-reading text-[17px] leading-relaxed text-text">
                      Bring a character with a debt, a false name, or a reason to distrust maps.
                      The first session opens at the archive fire.
                    </p>
                  </div>
                </div>
              </div>

              <aside className="border-t border-border bg-surface/55 p-7 lg:border-l lg:border-t-0">
                <p className="font-body text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  Charter summary
                </p>
                <dl className="mt-6 space-y-5">
                  {[
                    ["Role", "Game Master"],
                    ["Players", "2-6 seats"],
                    ["Tone", "Wonder, dread, discovery"],
                    ["Pace", "Session-based"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">
                        {label}
                      </dt>
                      <dd className="mt-1 font-body text-[13px] text-text">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-8 rounded-md border border-border bg-elevated p-4">
                  <p className="font-display text-[18px] text-paper">What players see first</p>
                  <p className="mt-2 font-body text-[12px] leading-relaxed text-text-secondary">
                    A concise adventure pitch, tone markers, and clear content guidance before
                    they request a seat.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <button
                    type="button"
                    className="rounded-md bg-gold px-5 py-3 font-body text-[13px] font-semibold text-void transition-transform hover:scale-[1.01]"
                  >
                    Open the table
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border px-5 py-3 font-body text-[13px] text-text-secondary transition-colors hover:border-border-active hover:text-paper"
                  >
                    Save as draft
                  </button>
                </div>
              </aside>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
