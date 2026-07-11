"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { INK_CHOICES } from "@/components/adventures/ink";
import InkPicker from "@/components/adventures/InkPicker";
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

/**
 * Open your own table: premise → genre → pace → your seat → post or
 * invite-only. One quiet page, not a wizard — five decisions.
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

  return (
    <div className="min-h-screen bg-void pb-24">
      <div className="max-w-[640px] mx-auto px-6 pt-24">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold-dark mb-3 text-center">
          A new adventure
        </p>
        <h1 className="font-display font-medium text-paper text-[clamp(28px,4vw,40px)] text-center [text-wrap:balance] mb-10">
          Open your own table
        </h1>

        <div className="space-y-7">
          <Field label="The title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="The Hollow Lantern"
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 font-display text-[17px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
            />
          </Field>

          <Field
            label="The premise"
            hint="What the table sits down to. Two or three sentences is plenty."
          >
            <textarea
              value={premise}
              onChange={(e) => setPremise(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="A funeral barge arrives three days early, and the town it was meant for no longer exists…"
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 font-reading italic text-[14px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
            />
          </Field>

          <Field label="Genre">
            <div className="flex gap-2 flex-wrap">
              {GENRES.map((g) => (
                <Choice key={g} selected={genre === g} onClick={() => setGenre(g)}>
                  {g}
                </Choice>
              ))}
            </div>
          </Field>

          <Field
            label="The pace"
            hint="Pace is a promise. Tables that write at one speed are tables that finish."
          >
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(PACE_LABELS) as AdventurePace[]).map((p) => (
                <Choice key={p} selected={pace === p} onClick={() => setPace(p)}>
                  {PACE_LABELS[p]}
                </Choice>
              ))}
            </div>
          </Field>

          <Field label="Your seat">
            <div className="flex gap-2 flex-wrap">
              <Choice
                selected={mySeat === "director"}
                onClick={() => setMySeat("director")}
              >
                I&apos;ll direct
              </Choice>
              <Choice
                selected={mySeat === "writer"}
                onClick={() => setMySeat("writer")}
              >
                I&apos;ll write a character — find me a Director
              </Choice>
            </div>
          </Field>

          {mySeat === "writer" && (
            <div className="border border-border rounded-xl p-4 space-y-4 bg-ink/60">
              <Field label="Your character">
                <input
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value.slice(0, 80))}
                  placeholder="Ilsa Voss"
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                />
              </Field>
              <Field label="In a few words">
                <input
                  value={characterBrief}
                  onChange={(e) => setCharacterBrief(e.target.value.slice(0, 500))}
                  placeholder="tide-surgeon"
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                />
              </Field>
              <Field label="Your ink">
                <InkPicker value={inkColor} onChange={setInkColor} />
              </Field>
            </div>
          )}

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

          {error && <p className="text-[12.5px] text-rose">{error}</p>}

          <div className="flex items-center gap-4 pt-2">
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
          </div>
        </div>
      </div>
    </div>
  );
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
      className={`px-3 py-1.5 rounded-lg text-[12px] border transition-all capitalize ${
        selected
          ? "border-amber/30 bg-amber/[0.06] text-amber"
          : "border-border text-text-ghost hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}
