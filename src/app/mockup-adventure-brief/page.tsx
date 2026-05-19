import Image from "next/image";

const tones = ["Wonder", "Dread", "Discovery"];
const genres = ["Fantasy", "Mystery", "Dark Fantasy", "Exploration"];
const guidance = ["Teen", "Violence", "Horror", "Death"];

export default function AdventureBriefMockup() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-void text-paper">
      <div className="fixed inset-0">
        <Image
          src="/adventure_mode.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.24] saturate-[0.8]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--t-void)_0%,color-mix(in_srgb,var(--t-void)_92%,transparent)_18%,color-mix(in_srgb,var(--t-void)_78%,transparent)_52%,var(--t-void)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_18%,var(--t-gold-glow),transparent_30rem)]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.22em] text-text-ghost">
              Adventure setup
            </p>
            <p className="mt-1 font-body text-[13px] text-text-secondary">
              Build the pitch your players will say yes to.
            </p>
          </div>
          <button className="rounded-full border border-border bg-elevated/55 px-4 py-2 font-body text-[12px] text-text-secondary backdrop-blur-xl transition-colors hover:border-border-active hover:text-paper">
            Back to modes
          </button>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form className="max-w-4xl">
            <div className="rounded-lg border border-border bg-elevated/80 p-6 shadow-modal backdrop-blur-2xl sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
                <div>
                  <label className="font-body text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                    Adventure title
                  </label>
                  <input
                    aria-label="Adventure title"
                    defaultValue="The Ashen Cartographer"
                    className="mt-3 w-full bg-transparent font-display text-[42px] leading-[0.98] text-paper outline-none sm:text-[64px]"
                  />
                </div>

                <div className="rounded-md border border-border bg-surface/70 p-4">
                  <p className="font-body text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                    You are
                  </p>
                  <p className="mt-2 font-display text-[25px] leading-tight text-paper">
                    Game Master
                  </p>
                  <p className="mt-3 font-body text-[12px] leading-relaxed text-text-secondary">
                    Narrate the world, open scenes, and guide the table through each turn.
                  </p>
                </div>
              </div>

              <div className="mt-9 border-t border-border pt-8">
                <label className="font-body text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  Premise
                </label>
                <textarea
                  aria-label="Premise"
                  defaultValue="A salt-road city has begun receiving maps of rooms that do not exist yet. Each morning, one more door appears exactly where the ink predicted."
                  className="mt-4 min-h-[178px] w-full resize-none border-0 bg-transparent font-reading text-[26px] leading-relaxed text-text outline-none placeholder:text-text-tertiary"
                />
              </div>

              <div className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
                <FieldGroup label="Genre">
                  {genres.map((genre) => (
                    <Chip key={genre}>{genre}</Chip>
                  ))}
                </FieldGroup>

                <FieldGroup label="Tone">
                  {tones.map((tone) => (
                    <Chip key={tone}>{tone}</Chip>
                  ))}
                </FieldGroup>

                <FieldGroup label="Guidance">
                  {guidance.map((item) => (
                    <Chip key={item}>{item}</Chip>
                  ))}
                </FieldGroup>
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md font-body text-[12px] leading-relaxed text-text-secondary">
                  Players will see the title, premise, tone, and guidance before requesting a seat.
                </p>
                <div className="flex gap-3">
                  <button className="rounded-md border border-border px-5 py-3 font-body text-[13px] text-text-secondary transition-colors hover:border-border-active hover:text-paper">
                    Save draft
                  </button>
                  <button className="rounded-md bg-gold px-5 py-3 font-body text-[13px] font-semibold text-void transition-transform hover:scale-[1.01]">
                    Open table
                  </button>
                </div>
              </div>
            </div>
          </form>

          <aside className="hidden lg:block">
            <div className="rounded-lg border border-border bg-surface/60 p-4 shadow-card backdrop-blur-xl">
              <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-border">
                <Image
                  src="/adventure_mode.png"
                  alt=""
                  fill
                  sizes="380px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--t-surface)_0%,transparent_48%)]" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-body text-[10px] uppercase tracking-[0.18em] text-gold-dark">
                    Player preview
                  </p>
                  <h2 className="mt-2 font-display text-[30px] leading-none text-paper">
                    The Ashen Cartographer
                  </h2>
                  <p className="mt-3 font-body text-[12px] leading-relaxed text-text-secondary">
                    Bring a character with a debt, a false name, or a reason to distrust maps.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-body text-[10px] uppercase tracking-[0.16em] text-text-ghost">
        {label}
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-full border border-border bg-transparent px-3 py-1.5 font-body text-[12px] text-text-secondary transition-colors hover:border-border-active hover:text-paper">
      {children}
    </button>
  );
}
