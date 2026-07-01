"use client";

import { useState } from "react";
import DiceRollerRitual from "@/components/campaign/manuscript/DiceCast";

type ForceOutcome = "random" | "success" | "partial" | "failure";

export default function DiceRitualMockup() {
  const [visible, setVisible] = useState(false);
  const [forceOutcome, setForceOutcome] = useState<ForceOutcome>("random");
  const [fatal, setFatal] = useState(false);
  const [stakesOn, setStakesOn] = useState(true);
  const [showAspect, setShowAspect] = useState(true);
  const [reason, setReason] = useState(
    "Decipher the rune sequence before the altar finishes waking."
  );
  const [aspect, setAspect] = useState("I will not be a thing that breaks.");
  const [onSuccess, setOnSuccess] = useState(
    "You read the binding clear and find a way to bend the awakening to your will."
  );
  const [onFailure, setOnFailure] = useState(
    "The runes burn your skin. The altar wakes on its own terms."
  );

  const handleRollSubmit = async (intent: { attribute: string; aspectInvoked: boolean }) => {
    await new Promise((r) => setTimeout(r, 180));

    let d1: number;
    let d2: number;
    if (forceOutcome === "success") {
      d1 = 6;
      d2 = 5;
    } else if (forceOutcome === "partial") {
      d1 = 4;
      d2 = 4;
    } else if (forceOutcome === "failure") {
      d1 = 2;
      d2 = 2;
    } else {
      d1 = Math.floor(Math.random() * 6) + 1;
      d2 = Math.floor(Math.random() * 6) + 1;
    }

    const approachMods: Record<string, number> = { Bold: 1, Keen: 2, Subtle: 0 };
    const approachMod = approachMods[intent.attribute] ?? 0;
    const aspectMod = intent.aspectInvoked ? 1 : 0;
    const modifier = approachMod + aspectMod;
    const total = d1 + d2 + modifier;
    const tier: "success" | "partial" | "failure" =
      total >= 10 ? "success" : total >= 7 ? "partial" : "failure";

    return { dice: [d1, d2] as [number, number], modifier, total, tier };
  };

  return (
    <div className="min-h-screen bg-void px-6 py-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border-subtle bg-ink/40 p-8">
          <p className="mb-2 font-display text-[10px] uppercase tracking-[0.4em] text-amber/55">
            mockup
          </p>
          <h1 className="mb-3 font-display text-4xl text-paper">The Casting</h1>
          <p className="mb-7 max-w-prose text-text-secondary">
            A reimagined dice-roll experience for adventure mode. Atmospheric, ritual,
            irrevocable. Use the controls on the right to force outcomes and toggle
            scenarios.
          </p>

          <button
            onClick={() => setVisible(true)}
            className="rounded-full border border-amber/45 bg-amber/10 px-7 py-3 font-display text-sm uppercase tracking-[0.34em] text-amber transition-all hover:border-amber/75 hover:bg-amber/15"
            style={{
              boxShadow: "0 0 30px rgba(243,180,97,0.2), inset 0 1px 0 rgba(243,180,97,0.2)",
            }}
          >
            Open the casting
          </button>

          <div className="mt-10 space-y-5 text-sm text-text-secondary">
            <Section title="The vibe">
              Cosmic backdrop with faint stars, a stone tablet with etched corners,
              ember particles drifting up during the cast, whisper-text fading past.
              Dice are dark runestones, not plastic d6s. Pips ignite amber when the
              dice wake.
            </Section>
            <Section title="The ritual">
              <span className="font-display italic">Idle</span> — runestones float
              gently in the well, slowly turning, contemplating fate. Choose your
              approach (Bold / Keen / Subtle sigils), optionally invoke your aspect
              (which ignites it in gold). One CTA: <span className="font-display italic">Cast the bones</span>.
              <br />
              <br />
              <span className="font-display italic">Casting</span> — dice tumble in
              3D for ~1.9s, embers rise, whispers drift, text says
              &ldquo;the world holds its breath…&rdquo;
              <br />
              <br />
              <span className="font-display italic">Settling</span> — ~550ms beat of
              stillness as the dice land. Pure tension.
              <br />
              <br />
              <span className="font-display italic">Revealed</span> — impact ripple
              expands, pips ignite, total counts up from 0, a tier-tinted aura
              washes through the whole modal, then a poetic proclamation inscribes
              itself letter by letter.
            </Section>
            <Section title="Proclamations">
              Not &ldquo;Full Success&rdquo;. Try them at each tier:
              <ul className="mt-2 space-y-1 font-display italic text-text">
                <li>10+ &mdash; &ldquo;The world bends to your will.&rdquo;</li>
                <li>7&ndash;9 &mdash; &ldquo;The thread frays &mdash; but it holds.&rdquo;</li>
                <li>6&minus; &mdash; &ldquo;The mountain refuses you.&rdquo;</li>
                <li>fatal &mdash; &ldquo;The dark accepts what you have given.&rdquo;</li>
              </ul>
            </Section>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-border-subtle bg-ink/40 p-6">
          <h2 className="font-display text-lg text-paper">Controls</h2>

          <div>
            <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
              Force outcome
            </label>
            <select
              value={forceOutcome}
              onChange={(e) => setForceOutcome(e.target.value as ForceOutcome)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            >
              <option value="random">Random</option>
              <option value="success">Full success (6+5)</option>
              <option value="partial">Partial (4+4)</option>
              <option value="failure">Failure (2+2)</option>
            </select>
          </div>

          <Toggle label="Fatal stakes" checked={fatal} onChange={setFatal} />
          <Toggle label="Show stakes (win/lose)" checked={stakesOn} onChange={setStakesOn} />
          <Toggle label="Show aspect" checked={showAspect} onChange={setShowAspect} />

          <div>
            <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            />
          </div>

          {showAspect && (
            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                Aspect
              </label>
              <input
                value={aspect}
                onChange={(e) => setAspect(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </div>
          )}

          {stakesOn && (
            <>
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                  On success
                </label>
                <textarea
                  value={onSuccess}
                  onChange={(e) => setOnSuccess(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text"
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                  On failure
                </label>
                <textarea
                  value={onFailure}
                  onChange={(e) => setOnFailure(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text"
                />
              </div>
            </>
          )}

          <p className="border-t border-border-subtle pt-4 text-[10px] leading-relaxed text-text-tertiary">
            The DiceRoller you have in production keeps its current contract
            (intent in, dice/modifier/total/tier out). This mockup mirrors that
            contract so we can swap it in cleanly once approved.
          </p>
        </div>
      </div>

      <DiceRollerRitual
        visible={visible}
        onClose={() => setVisible(false)}
        onRollSubmit={handleRollSubmit}
        aspect={showAspect ? aspect : null}
        rollReason={reason}
        rollOnSuccess={stakesOn ? onSuccess : null}
        rollOnFailure={stakesOn ? onFailure : null}
        rollFatal={fatal}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 font-display text-[10px] uppercase tracking-[0.3em] text-amber/60">{title}</h3>
      <div className="text-[13px] leading-relaxed text-text-secondary">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-sm text-text">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-amber/50" : "bg-subtle"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
