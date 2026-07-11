"use client";

import { INK_CHOICES, INK_STYLES } from "@/components/adventures/ink";
import type { AdventureInk } from "@/types/adventure";

/** Pick your ink — one swatch per distinct accent. */
export default function InkPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (ink: AdventureInk) => void;
}) {
  return (
    <div className="flex gap-2.5">
      {INK_CHOICES.map((ink) => (
        <button
          key={ink}
          title={ink}
          onClick={() => onChange(ink)}
          className={`w-7 h-7 rounded-full ${INK_STYLES[ink].pip} transition-transform ${
            value === ink
              ? "ring-2 ring-paper scale-110"
              : "opacity-60 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}
