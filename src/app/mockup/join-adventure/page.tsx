"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Static mockup data ──────────────────────────────────────────────────────

const CAMPAIGN = {
  title: "Reagent of Salt",
  hook: "Three kingdoms burned for a substance you can hold in your palm. The fourth is yours.",
  gm: {
    name: "Iris Halloran",
    handle: "@irishal",
    line: "I run slow, lyrical games. Bring grief, bring a knife, bring something to lose.",
    avatarHue: "from-amber/40 via-amber/15 to-transparent",
  },
  tone: ["Grim & Lyrical", "Slow-burn", "Low magic", "Tragedy welcomed"],
  cadence: "One scene per week · Sundays",
  seats: { taken: 3, total: 5 },
  cast: [
    { name: "Calwen of the Tide", archetype: "The Inheritor", hue: "from-teal/40 to-teal/5" },
    { name: "Brother Ash", archetype: "The Faithful", hue: "from-sage/40 to-sage/5" },
    { name: "Reka the Quiet", archetype: "The Hunted", hue: "from-rose/40 to-rose/5" },
  ],
  prompt:
    "It's the third night of rain. Your character is alone in a tavern that doesn't want them. The door opens behind them. What do they do before they turn around?",
};

const ARCHETYPES = [
  { id: "outsider", label: "The Outsider", hint: "Doesn't belong. Sees what locals miss." },
  { id: "believer", label: "The Believer", hint: "Devotion is a structure. They live inside it." },
  { id: "trickster", label: "The Trickster", hint: "Lies as a love language." },
  { id: "inheritor", label: "The Inheritor", hint: "Born into something they didn't ask for." },
  { id: "wounded", label: "The Wounded", hint: "Carries an old hurt with a long shadow." },
  { id: "faithful", label: "The Faithful", hint: "Loyal past reason. Sometimes past sense." },
  { id: "unseen", label: "The Unseen", hint: "Moves through rooms unnoticed. Likes it that way." },
  { id: "hunted", label: "The Hunted", hint: "Something is coming. They've been running for years." },
];

// ─── Voice fingerprint ───────────────────────────────────────────────────────

function analyseVoice(text: string) {
  const trimmed = text.trim();
  const words = trimmed.length ? trimmed.split(/\s+/) : [];
  const wordCount = words.length;
  const sentences = trimmed
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentenceCount = sentences.length || 1;
  const avgLen = wordCount / sentenceCount;
  const cadence = avgLen < 9 ? "Clipped" : avgLen < 16 ? "Measured" : "Long-breathed";

  const moodWords = trimmed.toLowerCase();
  const darkHits = (moodWords.match(/\b(rain|cold|blood|knife|ash|grief|silence|dark|gone|burn)\b/g) || []).length;
  const lightHits = (moodWords.match(/\b(warm|gold|laugh|home|hope|sun|kind|bloom|soft)\b/g) || []).length;
  const mood = darkHits === lightHits ? "Balanced" : darkHits > lightHits ? "Shadowed" : "Lit";

  const adverbs = (moodWords.match(/\b\w+ly\b/g) || []).length;
  const restraint = adverbs <= 1 ? "Restrained" : adverbs <= 3 ? "Textured" : "Ornate";

  return { wordCount, cadence, mood, restraint };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function JoinAdventureMockup() {
  const [name, setName] = useState("");
  const [oneLine, setOneLine] = useState("");
  const [archetype, setArchetype] = useState<string | null>(null);
  const [glimpse, setGlimpse] = useState("");

  const [cadence, setCadence] = useState(2);
  const [spotlight, setSpotlight] = useState<"driver" | "reactor" | "fades">("reactor");
  const [proudLink, setProudLink] = useState("");

  const voice = useMemo(() => analyseVoice(glimpse), [glimpse]);
  const archetypeLabel = ARCHETYPES.find((a) => a.id === archetype)?.label ?? null;
  const ready = name.trim() && oneLine.trim() && archetype && glimpse.trim().length >= 80;

  const cadenceLabel = [
    "When I'm called",
    "When inspired",
    "Weekly",
    "Twice a week",
    "Whenever the door opens",
  ][cadence];

  return (
    <div className="min-h-screen bg-void text-text relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full bg-amber/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute top-60 -right-32 w-[520px] h-[520px] rounded-full bg-rose/[0.05] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full bg-violet/[0.05] blur-[120px]" />

      {/* ─── Act 1 · The Threshold ─────────────────────────────────────── */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
          <div className="text-[11px] tracking-[0.3em] uppercase text-text-ghost mb-8 flex items-center gap-3">
            <span className="h-px w-10 bg-border-subtle" />
            <span>You are stepping into</span>
            <span className="h-px w-10 bg-border-subtle" />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-5xl sm:text-6xl text-paper font-light tracking-tight mb-5"
          >
            {CAMPAIGN.title}
          </motion.h1>

          <motion.blockquote
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="font-reading italic text-[19px] text-text-secondary max-w-2xl leading-relaxed border-l border-amber/30 pl-5 mb-10"
          >
            "{CAMPAIGN.hook}"
          </motion.blockquote>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-surface/60 border border-border-subtle rounded-2xl p-5 flex items-start gap-4 backdrop-blur-sm">
              <div className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${CAMPAIGN.gm.avatarHue} border border-amber/20 flex items-center justify-center text-amber font-display text-xl shrink-0`}>
                {CAMPAIGN.gm.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost mb-1">Storyteller</div>
                <div className="text-paper text-[15px] font-medium leading-tight">{CAMPAIGN.gm.name}</div>
                <div className="text-text-ghost text-[12px] mb-2">{CAMPAIGN.gm.handle}</div>
                <p className="text-text-secondary text-[12.5px] leading-snug italic">"{CAMPAIGN.gm.line}"</p>
              </div>
            </div>

            <div className="bg-surface/60 border border-border-subtle rounded-2xl p-5 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost mb-3">The room you're walking into</div>
              <div className="flex flex-wrap gap-1.5">
                {CAMPAIGN.tone.map((t) => (
                  <span key={t} className="text-[11.5px] px-2.5 py-1 rounded-full bg-amber/[0.07] border border-amber/15 text-amber/90">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border-subtle text-[12px] text-text-secondary flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 1.5" /></svg>
                {CAMPAIGN.cadence}
              </div>
            </div>

            <div className="bg-surface/60 border border-border-subtle rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost">The cast already inside</div>
                <div className="text-[11px] text-amber/90 font-medium">{CAMPAIGN.seats.taken} of {CAMPAIGN.seats.total} seats</div>
              </div>
              <div className="space-y-2">
                {CAMPAIGN.cast.map((c) => (
                  <div key={c.name} className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.hue} border border-border-subtle shrink-0`} />
                    <div className="min-w-0">
                      <div className="text-paper text-[12.5px] leading-tight truncate">{c.name}</div>
                      <div className="text-text-ghost text-[10.5px] italic">{c.archetype}</div>
                    </div>
                  </div>
                ))}
                {Array.from({ length: CAMPAIGN.seats.total - CAMPAIGN.seats.taken }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border border-dashed border-amber/30 shrink-0" />
                    <div className="text-text-ghost text-[12px] italic">empty chair</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Act 2 · Forge Your Character ──────────────────────────────── */}
      <section className="relative border-t border-border-subtle/60 bg-void/40">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
          <div className="space-y-12">
            <header>
              <div className="text-[10px] uppercase tracking-[0.3em] text-amber/80 mb-3">Audition · One pass, no résumé</div>
              <h2 className="font-display text-3xl text-paper font-light">Forge the one who arrives.</h2>
              <p className="text-text-secondary text-[13.5px] mt-2 max-w-xl leading-relaxed">
                There is no pitch box here. The GM is reading you for voice, not credentials — show them who walks through the door.
              </p>
            </header>

            <div>
              <SectionTitle index="i" title="The Spark" subtitle="A name. A line. A shape." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldShell label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 60))}
                    placeholder="...a name spoken in firelight"
                    className="w-full bg-transparent text-paper text-[16px] font-display tracking-tight placeholder:text-text-ghost/60 focus:outline-none"
                  />
                </FieldShell>
                <FieldShell label="Known for">
                  <input
                    value={oneLine}
                    onChange={(e) => setOneLine(e.target.value.slice(0, 90))}
                    placeholder="an ex-priest who can't stop hearing the gods"
                    className="w-full bg-transparent text-paper text-[14px] italic font-reading placeholder:text-text-ghost/60 focus:outline-none"
                  />
                </FieldShell>
              </div>

              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost mb-3">Archetype — pick the function they play in the story</div>
                <div className="flex flex-wrap gap-2">
                  {ARCHETYPES.map((a) => {
                    const selected = archetype === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setArchetype(a.id)}
                        title={a.hint}
                        className={`group relative px-3.5 py-1.5 rounded-full text-[12.5px] border transition-all duration-200 ${
                          selected
                            ? "bg-amber/15 border-amber/40 text-amber"
                            : "bg-surface/40 border-border-subtle text-text-secondary hover:border-amber/20 hover:text-paper"
                        }`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                  <button className="px-3.5 py-1.5 rounded-full text-[12.5px] border border-dashed border-border-subtle text-text-ghost hover:text-amber hover:border-amber/30 transition">
                    + Write your own
                  </button>
                </div>
                {archetype && (
                  <motion.p
                    key={archetype}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-text-ghost italic text-[12px] mt-3"
                  >
                    {ARCHETYPES.find((a) => a.id === archetype)?.hint}
                  </motion.p>
                )}
              </div>
            </div>

            <div>
              <SectionTitle index="ii" title="A First Glimpse" subtitle="Write the moment we meet your character. Two paragraphs is plenty." />

              <div className="rounded-2xl border border-amber/15 bg-gradient-to-b from-amber/[0.04] to-transparent p-5 mb-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-amber/80 mb-2">The GM has set the scene</div>
                <p className="font-reading italic text-text leading-relaxed text-[14.5px]">
                  "{CAMPAIGN.prompt}"
                </p>
              </div>

              <div className="relative rounded-2xl border border-border-subtle bg-ink/60 focus-within:border-amber/30 transition-colors">
                <textarea
                  value={glimpse}
                  onChange={(e) => setGlimpse(e.target.value.slice(0, 1500))}
                  rows={8}
                  placeholder="Start anywhere. Mid-sentence is welcome."
                  className="w-full bg-transparent text-paper font-reading text-[15px] leading-[1.75] px-5 py-4 placeholder:text-text-ghost/50 focus:outline-none resize-none"
                />
                <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-4 text-text-ghost">
                    <FingerprintPill label="Words" value={String(voice.wordCount)} />
                    <FingerprintPill label="Cadence" value={voice.cadence} />
                    <FingerprintPill label="Mood" value={voice.mood} />
                    <FingerprintPill label="Touch" value={voice.restraint} />
                  </div>
                  <div className={voice.wordCount >= 80 ? "text-sage" : "text-text-ghost"}>
                    {voice.wordCount >= 80 ? "✓ enough to read for voice" : `~${Math.max(0, 80 - voice.wordCount)} more words`}
                  </div>
                </div>
              </div>
              <p className="text-text-ghost text-[11.5px] italic mt-2">
                No grading. The GM and current cast read this to feel whether your voice sits beside theirs.
              </p>
            </div>

            <div>
              <SectionTitle index="iii" title="The Contract" subtitle="What kind of player are you? Honest answers help the GM cast well." />

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] text-text-secondary">How often you can write</span>
                    <span className="text-[12px] text-amber">{cadenceLabel}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    value={cadence}
                    onChange={(e) => setCadence(parseInt(e.target.value))}
                    className="w-full accent-amber"
                  />
                  <div className="flex justify-between text-[10px] text-text-ghost mt-1.5">
                    <span>when called</span>
                    <span>weekly</span>
                    <span>whenever</span>
                  </div>
                </div>

                <div>
                  <div className="text-[12px] text-text-secondary mb-2">Where you shine</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "driver", label: "I drive scenes", hint: "I'll start the trouble." },
                      { id: "reactor", label: "I shine in reactions", hint: "Throw the dice, I'll catch." },
                      { id: "fades", label: "I fade in and out", hint: "Some weeks loud, some weeks quiet." },
                    ].map((opt) => {
                      const selected = spotlight === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSpotlight(opt.id as typeof spotlight)}
                          className={`text-left rounded-xl border px-3.5 py-3 transition ${
                            selected
                              ? "border-amber/40 bg-amber/[0.08]"
                              : "border-border-subtle bg-surface/40 hover:border-amber/20"
                          }`}
                        >
                          <div className={`text-[12.5px] mb-0.5 ${selected ? "text-amber" : "text-paper"}`}>{opt.label}</div>
                          <div className="text-[10.5px] text-text-ghost italic leading-snug">{opt.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <FieldShell
                  label="Something you've written, if you want"
                  hint="Optional. A link to a chapter, a poem, anywhere — Quiloria or off."
                >
                  <input
                    value={proudLink}
                    onChange={(e) => setProudLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-transparent text-paper text-[13px] placeholder:text-text-ghost/60 focus:outline-none"
                  />
                </FieldShell>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-10 self-start">
            <div className="text-[10px] uppercase tracking-[0.3em] text-text-ghost mb-3">What the GM will receive</div>
            <DossierCard
              name={name}
              oneLine={oneLine}
              archetype={archetypeLabel}
              glimpse={glimpse}
              cadence={cadenceLabel}
              spotlight={spotlight}
              voice={voice}
              ready={!!ready}
            />

            <button
              disabled={!ready}
              className={`mt-5 w-full px-6 py-3.5 rounded-full font-medium text-[13.5px] transition-all ${
                ready
                  ? "bg-amber text-void hover:bg-amber-light shadow-lg shadow-amber/20"
                  : "bg-surface/60 border border-border-subtle text-text-ghost cursor-not-allowed"
              }`}
            >
              {ready ? "Send to the GM →" : "Finish the audition"}
            </button>
            <p className="text-text-ghost text-[10.5px] italic text-center mt-3 leading-relaxed">
              The GM and current cast may read your audition.<br />
              You can withdraw any time before they answer.
            </p>

            <div className="mt-6 text-center">
              <Link href="/story/rea-2s633f" className="text-text-ghost text-[11px] hover:text-amber transition-colors">
                ← Back to the story
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-center">
        <div className="text-[10px] uppercase tracking-[0.25em] text-text-ghost/70">Mockup · /mockup/join-adventure</div>
      </footer>
    </div>
  );
}

function SectionTitle({ index, title, subtitle }: { index: string; title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-display italic text-amber/60 text-[15px] tracking-wide">{index}.</span>
        <h3 className="font-display text-paper text-[22px] font-light">{title}</h3>
      </div>
      <p className="text-text-ghost text-[12.5px] italic ml-7">{subtitle}</p>
    </div>
  );
}

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost mb-2">{label}</div>
      <div className="rounded-xl border border-border-subtle bg-ink/60 px-4 py-3 focus-within:border-amber/30 transition-colors">
        {children}
      </div>
      {hint && <div className="text-[10.5px] text-text-ghost/80 italic mt-1.5">{hint}</div>}
    </label>
  );
}

function FingerprintPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[9.5px] uppercase tracking-[0.14em] text-text-ghost/70">{label}</span>
      <span className="text-text-secondary text-[11.5px]">{value}</span>
    </span>
  );
}

function DossierCard({
  name,
  oneLine,
  archetype,
  glimpse,
  cadence,
  spotlight,
  voice,
  ready,
}: {
  name: string;
  oneLine: string;
  archetype: string | null;
  glimpse: string;
  cadence: string;
  spotlight: "driver" | "reactor" | "fades";
  voice: ReturnType<typeof analyseVoice>;
  ready: boolean;
}) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const spotlightLabel = {
    driver: "Drives scenes",
    reactor: "Shines in reactions",
    fades: "Fades in and out",
  }[spotlight];

  return (
    <motion.div
      animate={{
        borderColor: ready ? "rgba(251, 191, 36, 0.35)" : "rgba(255,255,255,0.08)",
      }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl bg-gradient-to-b from-surface to-ink/80 border p-5 overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber/30 via-amber/10 to-transparent border border-amber/25 flex items-center justify-center text-amber font-display text-2xl shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost mb-1">Character Dossier</div>
          <div className={`font-display text-[19px] leading-tight ${name ? "text-paper" : "text-text-ghost italic"}`}>
            {name || "Unnamed"}
          </div>
          {archetype && (
            <div className="mt-1 inline-block text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20">
              {archetype}
            </div>
          )}
        </div>
      </div>

      <p className={`font-reading italic text-[13.5px] leading-snug mb-4 ${oneLine ? "text-text-secondary" : "text-text-ghost/60"}`}>
        {oneLine ? `"${oneLine}"` : "…known for what?"}
      </p>

      <div className="border-t border-border-subtle pt-3 mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost mb-1.5">First glimpse</div>
        <p className={`font-reading text-[12.5px] leading-relaxed ${glimpse ? "text-text" : "text-text-ghost/60 italic"}`}>
          {glimpse
            ? glimpse.length > 220
              ? glimpse.slice(0, 220).trim() + "…"
              : glimpse
            : "the door opens, and…"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-subtle">
        <Pill>{cadence}</Pill>
        <Pill>{spotlightLabel}</Pill>
        {voice.wordCount > 0 && <Pill>{voice.cadence} · {voice.mood}</Pill>}
      </div>
    </motion.div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-surface/80 border border-border-subtle text-text-secondary">
      {children}
    </span>
  );
}
