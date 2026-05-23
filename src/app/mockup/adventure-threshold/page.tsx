"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

const campaign = {
  title: "The Door Under Bellweather Hill",
  invitation:
    "The old well behind the chapel has been sealed for forty years. Last night, something knocked from the other side.",
  host: "Mara Vale",
  cadence: "One scene per week",
  seats: { taken: 3, total: 5 },
  tone: ["Bright wonder", "Haunted dread", "Personal stakes"],
  cast: [
    { name: "Edda Rook", role: "The witness", note: "notices what rooms try to hide" },
    { name: "Silas Penn", role: "The anchor", note: "keeps promises past reason" },
    { name: "Tomas Wren", role: "The seeker", note: "follows maps that should not exist" },
  ],
};

const archetypes = [
  ["anchor", "Anchor", "Loyalty, warmth, moral gravity"],
  ["seeker", "Seeker", "Clues, truths, hidden meanings"],
  ["outsider", "Outsider", "Sees what others learned to ignore"],
  ["shield", "Shield", "Stands in the doorway"],
  ["witness", "Witness", "Notices, remembers, carries proof"],
  ["tempter", "Tempter", "Bargains, beauty, bad ideas"],
] as const;

function analyseVoice(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const lower = trimmed.toLowerCase();
  const shadow = (lower.match(/\b(door|well|dark|blood|ash|cold|gone|below|fear|shadow)\b/g) || []).length;
  const warmth = (lower.match(/\b(warm|home|kind|light|gold|laugh|hope|hand|song)\b/g) || []).length;
  return {
    words: words.length,
    mood: shadow === warmth ? "Balanced" : shadow > warmth ? "Shadowed" : "Lit",
    cadence: words.length < 45 ? "Opening" : words.length < 95 ? "Gathering" : "Ready",
  };
}

export default function AdventureThresholdMockup() {
  const [name, setName] = useState("June Marrow");
  const [knownFor, setKnownFor] = useState("fixing locks no one admits are broken");
  const [archetype, setArchetype] = useState<(typeof archetypes)[number][0]>("outsider");
  const [glimpse, setGlimpse] = useState(
    "June keeps the chapel key under her tongue because pockets can be searched. When the knocking starts under Bellweather Hill, she is the only one who counts the pauses between each sound and realizes someone is spelling her name."
  );
  const [cadence, setCadence] = useState("Weekly");

  const voice = useMemo(() => analyseVoice(glimpse), [glimpse]);
  const selectedArchetype = archetypes.find(([id]) => id === archetype) ?? archetypes[0];
  const ready = name.trim().length > 0 && knownFor.trim().length > 0 && glimpse.trim().length >= 120;
  const openSeats = campaign.seats.total - campaign.seats.taken;

  return (
    <main className="min-h-screen bg-void text-text">
      <section className="relative min-h-[92vh] overflow-hidden border-b border-border">
        <Image
          src="/adventure_mode.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.22] saturate-[0.7]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--t-void)_0%,color-mix(in_srgb,var(--t-void)_90%,transparent)_38%,color-mix(in_srgb,var(--t-void)_74%,transparent)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--t-void)_0%,transparent_34%,var(--t-void)_100%)]" />

        <div className="relative z-10 mx-auto grid min-h-[92vh] max-w-7xl grid-cols-1 content-center gap-10 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <Link
              href="/mockup/join-adventure"
              className="mb-8 inline-flex text-[11px] uppercase tracking-[0.22em] text-text-ghost transition-colors hover:text-amber"
            >
              Back to current mockup
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-amber/75">
              Invitation to adventure
            </p>
            <h1 className="mt-4 font-display text-[48px] font-medium leading-[1.02] text-paper sm:text-[70px]">
              {campaign.title}
            </h1>
            <p className="mt-6 max-w-2xl border-l border-amber/35 pl-5 font-reading text-[20px] italic leading-relaxed text-text-secondary">
              {campaign.invitation}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {campaign.tone.map((tone) => (
                <span key={tone} className="rounded-md border border-amber/20 bg-amber/[0.06] px-3 py-1.5 text-[12px] text-amber">
                  {tone}
                </span>
              ))}
            </div>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <Signal label="Host" value={campaign.host} />
              <Signal label="Cadence" value={campaign.cadence} />
              <Signal label="Open seats" value={`${openSeats} of ${campaign.seats.total}`} />
            </div>
          </motion.div>

          <aside className="rounded-lg border border-border bg-surface/82 p-5 shadow-card backdrop-blur-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-ghost">
              Around the table
            </p>
            <div className="mt-5 space-y-3">
              {campaign.cast.map((member, index) => (
                <div key={member.name} className="flex gap-3 rounded-md border border-border-subtle bg-elevated/35 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber/20 bg-amber/[0.07] font-display text-[13px] text-amber">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-display text-[15px] text-paper">{member.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-ghost">{member.role}</p>
                    <p className="mt-1 text-[12px] italic leading-snug text-text-secondary">{member.note}</p>
                  </div>
                </div>
              ))}
              <div className="rounded-md border border-dashed border-amber/25 bg-amber/[0.03] p-4 text-center">
                <p className="font-display text-[16px] text-paper">{openSeats} empty chairs</p>
                <p className="mt-1 text-[12px] italic text-text-ghost">The table is still listening.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-10">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber/75">
            Character audition
          </p>
          <h2 className="mt-3 font-display text-[34px] font-medium text-paper">
            Show who reaches the door.
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-secondary">
            The form asks for story function, voice, and table rhythm. It avoids a generic pitch box and gives the host a quick read on how the player writes.
          </p>

          <div className="mt-8 space-y-5">
            <FormBlock number="I" title="The Name They Use">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block rounded-lg border border-border bg-elevated/45 p-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 w-full bg-transparent font-display text-[22px] text-paper outline-none"
                  />
                </label>
                <label className="block rounded-lg border border-border bg-elevated/45 p-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">Known for</span>
                  <input
                    value={knownFor}
                    onChange={(event) => setKnownFor(event.target.value)}
                    className="mt-2 w-full bg-transparent font-reading text-[15px] italic text-paper outline-none"
                  />
                </label>
              </div>
            </FormBlock>

            <FormBlock number="II" title="The Part They Play">
              <div className="grid gap-2 sm:grid-cols-2">
                {archetypes.map(([id, label, hint]) => {
                  const selected = archetype === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setArchetype(id)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-amber/35 bg-amber/[0.08]"
                          : "border-border bg-elevated/35 hover:border-amber/25"
                      }`}
                    >
                      <span className={selected ? "font-display text-[15px] text-amber" : "font-display text-[15px] text-paper"}>
                        {label}
                      </span>
                      <span className="mt-1 block text-[12px] leading-snug text-text-secondary">{hint}</span>
                    </button>
                  );
                })}
              </div>
            </FormBlock>

            <FormBlock number="III" title="The First Glimpse">
              <label className="block rounded-lg border border-border bg-elevated/45 p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">
                  Opening sample
                </span>
                <textarea
                  value={glimpse}
                  onChange={(event) => setGlimpse(event.target.value)}
                  rows={6}
                  className="mt-3 w-full resize-none bg-transparent font-reading text-[17px] leading-relaxed text-paper outline-none"
                />
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Signal label="Words" value={`${voice.words}`} />
                <Signal label="Mood" value={voice.mood} />
                <Signal label="Cadence" value={voice.cadence} />
              </div>
            </FormBlock>

            <FormBlock number="IV" title="The Table Contract">
              <div className="flex flex-wrap gap-2">
                {["When called", "When inspired", "Weekly", "Twice weekly", "Whenever it opens"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCadence(option)}
                    className={`rounded-md border px-3 py-2 text-[12px] transition-colors ${
                      cadence === option
                        ? "border-amber/35 bg-amber/[0.08] text-amber"
                        : "border-border bg-elevated/35 text-text-secondary hover:border-amber/25 hover:text-paper"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </FormBlock>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-border bg-surface/82 p-5 shadow-card backdrop-blur-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-ghost">
              Application preview
            </p>
            <div className="mt-5 rounded-lg border border-amber/18 bg-amber/[0.04] p-5">
              <p className="font-display text-[26px] leading-tight text-paper">{name || "Unnamed character"}</p>
              <p className="mt-2 font-reading text-[14px] italic text-text-secondary">
                Known for {knownFor || "something not yet spoken"}
              </p>
              <div className="mt-4 rounded-md border border-border bg-void/35 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ghost">
                  {selectedArchetype[1]}
                </p>
                <p className="mt-1 text-[12px] leading-snug text-text-secondary">{selectedArchetype[2]}</p>
              </div>
              <p className="mt-4 line-clamp-5 font-reading text-[14px] leading-relaxed text-text">
                {glimpse}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[12px] text-text-secondary">
                <span>{cadence}</span>
                <span>{ready ? "Ready to send" : "Needs more voice"}</span>
              </div>
            </div>
            <button
              type="button"
              className={`mt-4 w-full rounded-lg px-4 py-3 text-[13px] font-semibold transition-colors ${
                ready
                  ? "bg-amber text-void hover:bg-amber-light"
                  : "bg-elevated text-text-ghost"
              }`}
            >
              Send audition
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/70 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-ghost">{label}</p>
      <p className="mt-1 font-display text-[17px] text-paper">{value}</p>
    </div>
  );
}

function FormBlock({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/62 p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-amber/25 bg-amber/[0.07] font-mono text-[10px] uppercase text-amber">
          {number}
        </span>
        <h3 className="font-display text-[20px] text-paper">{title}</h3>
      </div>
      {children}
    </section>
  );
}
