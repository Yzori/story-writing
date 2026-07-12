"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { INK_CHOICES } from "@/components/adventures/ink";
import InkPicker from "@/components/adventures/InkPicker";
import { Grain, Motes } from "@/components/shared/Atmosphere";
import { PACE_LABELS, type AdventurePace } from "@/types/adventure";

const GENRES = [
  "fantasy",
  "mystery",
  "horror",
  "romance",
  "science fiction",
  "adventure",
  "historical",
  "literary",
];

/** What each pace asks of a writer — shown on the card, plainly. */
const PACE_PROMISES: Record<AdventurePace, string> = {
  "turn-daily": "A short turn most days. Brisk — scenes close fast.",
  "turn-2-days": "Write every other day. The steady default.",
  "turn-weekly": "One good turn a week. Roomy, for full lives.",
  live: "Everyone seated at once, writing in real time.",
};

const rise = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 30 },
  },
};

/**
 * Open your own table: premise → genre → pace → your seat → post or
 * invite-only. One quiet page, not a wizard — five decisions, with the
 * table's playbill taking shape beside them.
 */
export default function NewAdventurePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [pace, setPace] = useState<AdventurePace>("turn-daily");
  const [mySeat, setMySeat] = useState<"director" | "writer">("director");
  const [writerSeats, setWriterSeats] = useState(3);
  const [boardVisibility, setBoardVisibility] = useState<"private" | "board">(
    "private"
  );
  const [characterName, setCharacterName] = useState("");
  const [characterBrief, setCharacterBrief] = useState("");
  const [inkColor, setInkColor] = useState(INK_CHOICES[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        premise,
        genre,
        pace,
        mySeat,
        writerSeats,
        boardVisibility,
        ...(mySeat === "writer"
          ? { characterName, characterBrief, inkColor }
          : {}),
      }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok || !body?.data) {
      setError(body?.error?.message ?? "Something went wrong.");
      return;
    }
    router.push(`/adventures/${body.data.id}`);
  };

  const canSubmit =
    title.trim() &&
    premise.trim() &&
    (mySeat === "director" || characterName.trim());

  const preview = (
    <PlaybillPreview
      title={title}
      premise={premise}
      genre={genre}
      pace={pace}
      mySeat={mySeat}
      writerSeats={writerSeats}
      boardVisibility={boardVisibility}
    />
  );

  return (
    <div className="relative min-h-screen bg-void pb-28 overflow-hidden">
      <Motes count={14} seed={47} opacityScale={0.55} zClass="z-[1]" />
      <Grain />

      {/* candlelight pooling behind the heading */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_60%_100%_at_50%_-20%,var(--color-gold-glow),transparent_70%)] opacity-40"
      />

      <div className="relative z-[2] max-w-[1060px] mx-auto px-6 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-dark mb-3">
            A new adventure
          </p>
          <h1 className="font-display font-medium text-paper text-[clamp(28px,4vw,40px)] [text-wrap:balance] [text-shadow:0_0_44px_var(--color-gold-glow)] mb-3">
            Open your own table
          </h1>
          <p className="text-[14px] text-text-secondary m-0">
            A premise, a pace, your seat. The board fills the chairs.
          </p>
        </motion.div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 lg:items-start">
          <motion.div
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            initial="hidden"
            animate="show"
            className="space-y-8 max-w-[640px]"
          >
            <motion.div variants={rise}>
              <Field label="The title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                  placeholder="The Hollow Lantern"
                  className="w-full bg-elevated border border-border rounded-lg px-3.5 py-3 font-display text-[17px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                />
              </Field>
            </motion.div>

            <motion.div variants={rise}>
              <Field
                label="The premise"
                hint="What the table sits down to. Two or three sentences is plenty."
              >
                <textarea
                  value={premise}
                  onChange={(e) => setPremise(e.target.value.slice(0, 1000))}
                  rows={3}
                  placeholder="A funeral barge arrives three days early, and the town it was meant for no longer exists…"
                  className="w-full bg-elevated border border-border rounded-lg px-3.5 py-3 font-reading italic text-[14px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
                />
              </Field>
            </motion.div>

            <motion.div variants={rise}>
              <Field label="Genre">
                <div className="flex gap-2 flex-wrap">
                  {GENRES.map((g) => (
                    <Choice key={g} selected={genre === g} onClick={() => setGenre(g)}>
                      {g}
                    </Choice>
                  ))}
                </div>
              </Field>
            </motion.div>

            <motion.div variants={rise}>
              <Field
                label="The pace"
                hint="Pace is a promise. Tables that write at one speed are tables that finish."
              >
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {(Object.keys(PACE_LABELS) as AdventurePace[]).map((p) => (
                    <OptionCard
                      key={p}
                      selected={pace === p}
                      onClick={() => setPace(p)}
                      title={PACE_LABELS[p]}
                      body={PACE_PROMISES[p]}
                    />
                  ))}
                </div>
              </Field>
            </motion.div>

            <motion.div variants={rise}>
              <Field label="Your seat">
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <OptionCard
                    selected={mySeat === "director"}
                    onClick={() => setMySeat("director")}
                    title="I'll direct"
                    body="You run the world — open scenes, answer the table's asks, keep the pace."
                  />
                  <OptionCard
                    selected={mySeat === "writer"}
                    onClick={() => setMySeat("writer")}
                    title="I'll write a character"
                    body="You take a writer's chair and play one character. The board finds you a Director."
                  />
                </div>
              </Field>
            </motion.div>

            <AnimatePresence initial={false}>
              {mySeat === "writer" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="overflow-hidden !mt-3"
                >
                  <div className="border border-border rounded-xl p-4 space-y-4 bg-ink/60">
                    <Field label="Your character">
                      <input
                        value={characterName}
                        onChange={(e) =>
                          setCharacterName(e.target.value.slice(0, 80))
                        }
                        placeholder="Ilsa Voss"
                        className="w-full bg-elevated border border-border rounded-lg px-3.5 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                      />
                    </Field>
                    <Field label="In a few words">
                      <input
                        value={characterBrief}
                        onChange={(e) =>
                          setCharacterBrief(e.target.value.slice(0, 500))
                        }
                        placeholder="tide-surgeon"
                        className="w-full bg-elevated border border-border rounded-lg px-3.5 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                      />
                    </Field>
                    <Field label="Your ink">
                      <InkPicker value={inkColor} onChange={setInkColor} />
                    </Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={rise}>
              <Field label="Writer seats at the table">
                <div className="flex gap-2">
                  {[2, 3, 4].map((n) => (
                    <Choice
                      key={n}
                      selected={writerSeats === n}
                      onClick={() => setWriterSeats(n)}
                    >
                      {n}
                    </Choice>
                  ))}
                </div>
              </Field>
            </motion.div>

            <motion.div variants={rise}>
              <Field label="Who can find it">
                <div className="flex gap-2 flex-wrap">
                  <Choice
                    selected={boardVisibility === "private"}
                    onClick={() => setBoardVisibility("private")}
                  >
                    Invite only
                  </Choice>
                  <Choice
                    selected={boardVisibility === "board"}
                    onClick={() => setBoardVisibility("board")}
                  >
                    Post it to the board
                  </Choice>
                </div>
              </Field>
            </motion.div>

            {/* the playbill, on small screens — takes shape before you commit */}
            <motion.div variants={rise} className="lg:hidden">
              {preview}
            </motion.div>

            {error && <p className="text-[12.5px] text-rose">{error}</p>}

            <motion.div variants={rise} className="flex items-center gap-4 pt-2">
              <button
                onClick={submit}
                disabled={!canSubmit || busy}
                className="font-semibold text-[14px] rounded-[11px] px-5 py-3 bg-gold text-on-gold border border-gold hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Setting the table…" : "Open the table"}
              </button>
              <Link
                href="/adventures"
                className="text-[13px] text-text-ghost hover:text-paper transition-colors"
              >
                Not yet
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="hidden lg:block lg:sticky lg:top-24"
          >
            {preview}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * The table's playbill, taking shape as the form is filled — the same
 * card the board renders, so "post it to the board" is concrete.
 */
function PlaybillPreview({
  title,
  premise,
  genre,
  pace,
  mySeat,
  writerSeats,
  boardVisibility,
}: {
  title: string;
  premise: string;
  genre: string;
  pace: AdventurePace;
  mySeat: "director" | "writer";
  writerSeats: number;
  boardVisibility: "private" | "board";
}) {
  const openWriters = mySeat === "director" ? writerSeats : writerSeats - 1;
  const seeking =
    mySeat === "writer"
      ? openWriters > 0
        ? `Seeking · a Director & ${writerCount(openWriters)}`
        : "Seeking · a Director"
      : `Seeking · ${writerCount(openWriters)}`;
  const posted = boardVisibility === "board";

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.24em] text-gold-dark font-semibold mb-3 flex items-center gap-3 after:content-[''] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gold/30 after:to-transparent">
        The playbill
      </p>
      <div
        className={`relative rounded-md p-6 text-center flex flex-col gap-3 transition-all before:content-[''] before:absolute before:inset-[7px] before:rounded-[3px] before:pointer-events-none before:transition-all ${
          posted
            ? "border border-border bg-gradient-to-b from-elevated/40 to-ink/90 shadow-[0_12px_30px_rgba(0,0,0,0.35)] before:border before:border-gold/20"
            : "border border-dashed border-border bg-ink/40 before:border before:border-dashed before:border-gold/20"
        }`}
      >
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-dark capitalize">
          {genre}
        </div>
        <h2
          className={`font-display font-medium text-[22px] m-0 [text-wrap:balance] ${
            title.trim() ? "text-paper" : "text-text-ghost"
          }`}
        >
          {title.trim() || "Untitled table"}
        </h2>
        <div className="text-gold/55 text-[12px] tracking-[0.6em] indent-[0.6em]">
          ✦
        </div>
        <p
          className={`font-reading italic text-[13.5px] m-0 leading-relaxed line-clamp-4 ${
            premise.trim() ? "text-text" : "text-text-ghost"
          }`}
        >
          {premise.trim() || "Your premise, in two or three sentences…"}
        </p>
        <div className="text-[11px] tracking-[0.22em] uppercase text-gold-light font-bold border-t border-b border-gold/20 py-1.5">
          {seeking}
        </div>
        <div className="text-[12px] text-teal">{PACE_LABELS[pace]}</div>
        <div className="text-[12px] text-text-ghost">
          {mySeat === "director" ? (
            <>
              Directed by <b className="text-paper font-semibold">you</b>
            </>
          ) : (
            <>Your chair is taken, premise written, waiting for a Director.</>
          )}
        </div>
      </div>
      <p className="text-[11.5px] text-text-ghost mt-2.5 leading-relaxed">
        {posted
          ? "Pinned to the board — anyone looking for a table at your pace can ask for a seat."
          : "Invite only — shown just to the people you send the link."}
      </p>
    </div>
  );
}

function writerCount(n: number): string {
  const words = ["one writer", "two writers", "three writers", "four writers"];
  return words[n - 1] ?? `${n} writers`;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-text-ghost mt-1.5 mb-0">{hint}</p>}
    </div>
  );
}

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center min-h-[44px] px-4 py-2 rounded-lg text-[13px] border transition-all capitalize ${
        selected
          ? "border-amber/30 bg-amber/[0.06] text-amber"
          : "border-border text-text-ghost hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}

/** A first-class choice: label + what it means, card-sized to its weight. */
function OptionCard({
  selected,
  onClick,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border px-4 py-3.5 transition-all ${
        selected
          ? "border-gold/45 bg-amber/[0.05] shadow-[0_0_24px_-8px_var(--color-gold-glow)]"
          : "border-border bg-ink/40 hover:border-border-active"
      }`}
    >
      <div
        className={`text-[13.5px] font-semibold mb-1 ${
          selected ? "text-gold-light" : "text-text"
        }`}
      >
        {title}
      </div>
      <div className="text-[12px] leading-relaxed text-text-ghost">{body}</div>
    </button>
  );
}
