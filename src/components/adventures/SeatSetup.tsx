"use client";

import { useState } from "react";
import InkPicker from "@/components/adventures/InkPicker";

/**
 * Shown to a freshly seated writer with no character yet (accepted
 * from the board). One card: name, a few words, your ink.
 */
export default function SeatSetup({
  onSetup,
}: {
  onSetup: (
    characterName: string,
    characterBrief: string,
    inkColor: string
  ) => Promise<boolean>;
}) {
  const [characterName, setCharacterName] = useState("");
  const [characterBrief, setCharacterBrief] = useState("");
  const [inkColor, setInkColor] = useState("teal");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-5 border border-teal/30 rounded-[14px] bg-ink/70 p-4 sm:p-5 font-body">
      <p className="text-[10.5px] tracking-[0.24em] uppercase text-teal font-semibold mt-0 mb-1.5">
        You have a seat
      </p>
      <p className="text-[13px] text-text-secondary mt-0 mb-3.5">
        Bring your character to the table before the spotlight finds you.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value.slice(0, 80))}
          placeholder="Character name"
          className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
        />
        <input
          value={characterBrief}
          onChange={(e) => setCharacterBrief(e.target.value.slice(0, 500))}
          placeholder="In a few words — e.g. tide-surgeon"
          className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-3.5">
        <InkPicker value={inkColor} onChange={setInkColor} />
        <button
          onClick={async () => {
            if (busy || !characterName.trim()) return;
            setBusy(true);
            await onSetup(characterName.trim(), characterBrief.trim(), inkColor);
            setBusy(false);
          }}
          disabled={busy || !characterName.trim()}
          className="ml-auto font-semibold text-[13.5px] rounded-[11px] px-4 py-2.5 bg-gold text-on-gold border border-gold hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Take your place
        </button>
      </div>
    </div>
  );
}
