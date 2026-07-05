"use client";

import { useState } from "react";
import type { SessionWager } from "@/hooks/use-session-wagers";

/**
 * The wagers, pinned in the dark at the rim of the page — the audience's
 * own hand before the candle is lit. Slips are tilted paper scraps: content
 * and "held by N", never a name, never an amount. Begin seals the book
 * (slips dim, hands vanish); at the last line the true ones stamp gold.
 *
 * Renders through PageRoom's `rim` layer (fixed, pointer-events-none) —
 * every interactive slip opts back in with pointer-events-auto. Fixed slot
 * table, no Math.random (SSR rule). On small viewports the rim has no
 * room, so the slips dock as a strip along the foot of the dark.
 */

const SLOTS: Array<{ side: "left" | "right"; top: number; tilt: number }> = [
  { side: "left", top: 16, tilt: -2.5 },
  { side: "right", top: 22, tilt: 2 },
  { side: "left", top: 40, tilt: 1.5 },
  { side: "right", top: 47, tilt: -1.5 },
  { side: "left", top: 64, tilt: 2.5 },
  { side: "right", top: 71, tilt: -2 },
];

function SlipBody({
  wager,
  sealed,
  canHold,
  onHold,
  canPull,
  onPull,
}: {
  wager: SessionWager;
  sealed: boolean;
  canHold: boolean;
  onHold: (id: string) => void;
  canPull: boolean;
  onPull: (id: string) => void;
}) {
  return (
    <>
      {wager.status === "true" && <span className="wager-stamp">it came true</span>}
      <p className="font-reading text-[12.5px] italic leading-snug text-text-secondary">
        “{wager.content}”
      </p>
      <p className="mt-1 flex items-baseline gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-text-ghost">
        <span>
          {wager.holdCount === 0
            ? wager.isMine
              ? "yours"
              : "held by no one yet"
            : `held by ${wager.holdCount}`}
          {wager.myHold && <span className="text-amber"> · you hold it</span>}
        </span>
        {!sealed && canHold && !wager.isMine && !wager.myHold && (
          <button
            type="button"
            onClick={() => onHold(wager.id)}
            className="cursor-pointer text-text-tertiary transition-colors hover:text-amber"
            title="Hold this wager — you think it happens too"
          >
            hold it
          </button>
        )}
        {canPull && (
          <button
            type="button"
            onClick={() => onPull(wager.id)}
            className="cursor-pointer text-text-tertiary transition-colors hover:text-rose"
            title="Pull this slip off the rim"
          >
            pull it
          </button>
        )}
      </p>
    </>
  );
}

export default function WagerRim({
  wagers,
  sealed,
  canHold,
  onHold,
  canCompose,
  onCompose,
  canPull,
  onPull,
}: {
  wagers: SessionWager[];
  /** The session has begun — the book is sealed, slips dim. */
  sealed: boolean;
  /** A watcher with a token (holding is anonymous). */
  canHold: boolean;
  onHold: (id: string) => void;
  /** Watch page, pre-begin. Sign-in is enforced server-side. */
  canCompose: boolean;
  onCompose: (content: string) => Promise<void>;
  /** The Director's moderation hand. */
  canPull: boolean;
  onPull: (id: string) => void;
}) {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [murmur, setMurmur] = useState<string | null>(null);

  if (wagers.length === 0 && !canCompose) return null;

  const pinned = wagers.slice(0, SLOTS.length);
  const overflow = wagers.length - pinned.length;

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      await onCompose(trimmed);
      setDraft("");
      setComposing(false);
      setMurmur(null);
    } catch (err) {
      setMurmur(err instanceof Error ? err.message : "Failed to pin the wager");
    }
  };

  const composer = composing ? (
    <div className="wager-slip pointer-events-auto w-[190px] px-3 py-2.5">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setComposing(false);
            setMurmur(null);
          }
        }}
        placeholder="I think this happens…"
        rows={2}
        maxLength={120}
        autoFocus
        className="block w-full resize-none bg-transparent font-reading text-[12.5px] italic leading-snug text-text-secondary outline-none placeholder:text-text-ghost"
        aria-label="Your wager — what you think happens tonight"
      />
      {murmur && <p className="mt-1 font-mono text-[9px] text-rose/90">{murmur}</p>}
      <div className="mt-1.5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setComposing(false);
            setMurmur(null);
          }}
          className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.12em] text-text-ghost transition-colors hover:text-text-secondary"
        >
          never mind
        </button>
        <button
          type="button"
          onClick={() => void commit()}
          disabled={!draft.trim()}
          className="wax-seal cursor-pointer px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
        >
          pin it
        </button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setComposing(true)}
      className="wager-slip pointer-events-auto cursor-pointer px-3 py-2 text-left transition-colors hover:border-amber/40"
      title="Pin a wager — what do you think happens tonight?"
    >
      <span className="font-reading text-[12.5px] italic text-text-tertiary">
        + I think this happens…
      </span>
    </button>
  );

  return (
    <>
      {/* The rim proper — wide rooms only. */}
      <div className="hidden lg:block">
        {pinned.map((wager, i) => {
          const slot = SLOTS[i];
          return (
            <div
              key={wager.id}
              className={`wager-slip pointer-events-auto absolute w-[180px] px-3 py-2.5 ${
                sealed && wager.status === "open" ? "wager-slip--sealed" : ""
              } ${wager.status !== "open" && wager.status !== "true" ? "wager-slip--sealed" : ""} ${
                wager.status === "true" ? "wager-slip--true" : ""
              }`}
              style={{
                top: `${slot.top}%`,
                [slot.side]: "max(8px, calc(50% - 360px - 200px))",
                transform: `rotate(${slot.tilt}deg)`,
              }}
            >
              <SlipBody
                wager={wager}
                sealed={sealed}
                canHold={canHold}
                onHold={onHold}
                canPull={canPull}
                onPull={onPull}
              />
            </div>
          );
        })}
        {overflow > 0 && (
          <p
            className="absolute bottom-[10%] font-mono text-[9px] uppercase tracking-[0.14em] text-text-ghost"
            style={{ left: "max(8px, calc(50% - 360px - 190px))" }}
          >
            +{overflow} more {overflow === 1 ? "slip" : "slips"} in the dark
          </p>
        )}
        {!sealed && canCompose && (
          <div
            className="absolute"
            style={{ bottom: "16%", right: "max(8px, calc(50% - 360px - 200px))" }}
          >
            {composer}
          </div>
        )}
      </div>

      {/* Small rooms: the slips dock along the foot of the dark. */}
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 flex gap-2 overflow-x-auto bg-black/40 px-3 py-2 backdrop-blur-sm lg:hidden">
        {wagers.map((wager) => (
          <div
            key={wager.id}
            className={`wager-slip w-[170px] shrink-0 px-3 py-2 ${
              sealed && wager.status !== "true" ? "wager-slip--sealed" : ""
            } ${wager.status === "true" ? "wager-slip--true" : ""}`}
          >
            <SlipBody
              wager={wager}
              sealed={sealed}
              canHold={canHold}
              onHold={onHold}
              canPull={canPull}
              onPull={onPull}
            />
          </div>
        ))}
        {!sealed && canCompose && <div className="w-[190px] shrink-0">{composer}</div>}
      </div>
    </>
  );
}
