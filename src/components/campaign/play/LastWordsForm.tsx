"use client";

import { useState } from "react";

interface LastWordsFormProps {
  onLastWords: (content: string) => void;
  onSent: () => void;
}

/**
 * The fallen character's goodbye — one final description turn, offered once.
 */
export default function LastWordsForm({ onLastWords, onSent }: LastWordsFormProps) {
  const [content, setContent] = useState("");

  return (
    <div className="relative rounded-2xl border border-rose/20 bg-ink p-5">
      <div className="absolute top-0 left-5 -translate-y-1/2 bg-void px-2 font-display text-[10px] uppercase tracking-[0.2em] text-rose">
        Your character has fallen
      </div>

      <p className="mb-3 font-serif text-xs italic text-text-tertiary">
        Write your final moment — a last breath, a whispered name, a defiant gaze. This is your character&apos;s goodbye.
      </p>

      <textarea
        className="min-h-[70px] w-full resize-none bg-transparent font-serif text-[17px] leading-[1.9] text-paper/90 outline-none placeholder:text-text-ghost"
        placeholder="Their final words, their last thought..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="mt-3 flex items-center justify-end border-t border-rose/10 pt-3">
        <button
          onClick={() => {
            if (content.trim()) {
              onLastWords(content.trim());
              onSent();
            }
          }}
          disabled={!content.trim()}
          className="cursor-pointer rounded-full border border-rose/20 bg-rose/10 px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-rose transition-all hover:bg-rose hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
        >
          Final Words
        </button>
      </div>
    </div>
  );
}
