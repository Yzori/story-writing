"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * "Show the hands" — the optional reader reveal (compile spec slice C). A
 * co-authored chapter carries a data-author-name on every block (the compile's
 * provenance stamp). This finds those hands and, on toggle, tints each passage
 * by its author and labels it — so a reader who loved a part can see who wrote
 * it. Reading stays clean by default; the control only appears when a chapter
 * truly has more than one hand.
 */

const PLAYER_PALETTE = [
  "var(--color-teal)",
  "var(--color-lavender)",
  "var(--color-rose)",
  "var(--color-sage)",
  "var(--color-copper)",
];

type Hand = { name: string; color: string };

export default function CoAuthorReveal({ chapterId }: { chapterId: string }) {
  const [hands, setHands] = useState<Hand[]>([]);
  const [shown, setShown] = useState(false);

  const colorByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of hands) m.set(h.name, h.color);
    return m;
  }, [hands]);

  // Discover the distinct hands in the rendered chapter. The Director gets the
  // candle-gold; players cycle the palette in first-seen order.
  const scan = useCallback(() => {
    const names: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("[data-author-name]")) {
      const n = el.getAttribute("data-author-name");
      if (n && !names.includes(n)) names.push(n);
    }
    if (names.length < 2) {
      setHands([]);
      return;
    }
    let p = 0;
    setHands(
      names.map((name) =>
        name === "the Director"
          ? { name, color: "var(--color-amber)" }
          : { name, color: PLAYER_PALETTE[p++ % PLAYER_PALETTE.length] },
      ),
    );
  }, []);

  // Re-discover when the chapter changes; the content renders a beat after us.
  useEffect(() => {
    setShown(false);
    const t = setTimeout(scan, 250);
    return () => clearTimeout(t);
  }, [chapterId, scan]);

  // Paint the hands on, and keep them painted as blocks come and go (paginated
  // page turns). Only while the reader has opted in.
  useEffect(() => {
    if (hands.length < 2 || !shown) {
      document.body.classList.remove("reveal-hands");
      return;
    }
    const paint = () => {
      document.body.classList.add("reveal-hands");
      let prev: string | null = null;
      for (const el of document.querySelectorAll<HTMLElement>("[data-author-name]")) {
        const name = el.getAttribute("data-author-name") ?? "";
        const c = colorByName.get(name);
        if (c) el.style.setProperty("--hand", c);
        // The border carries continuity; only label when the hand changes, so
        // a long single-author stretch doesn't repeat the name every block.
        el.classList.toggle("same-hand", name === prev);
        prev = name;
      }
    };
    paint();
    const obs = new MutationObserver(paint);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      document.body.classList.remove("reveal-hands");
      for (const el of document.querySelectorAll<HTMLElement>("[data-author-name]")) {
        el.style.removeProperty("--hand");
        el.classList.remove("same-hand");
      }
    };
  }, [shown, hands, colorByName]);

  if (hands.length < 2) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-[70vw]">
      <div className="flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-elevated/80 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em] text-text-secondary transition-colors hover:text-paper"
          aria-pressed={shown}
        >
          {shown ? "hide the hands" : "show the hands"}
        </button>
        {shown && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {hands.map((h) => (
              <li key={h.name} className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: h.color }}
                />
                {h.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
