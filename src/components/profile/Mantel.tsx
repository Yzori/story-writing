"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Flame } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";

export interface MantelCandle {
  id: string;
  litAt: string;
  visitor: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface MantelProps {
  enabled: boolean;
  count: number;
  candles: MantelCandle[];
  hasLit: boolean;
  isOwner: boolean;
  signedIn: boolean;
  ownerName: string;
  onLight: () => Promise<boolean>;
  /** "hero" centers under the identity block; "room" spans the scene's top. */
  variant?: "hero" | "room";
}

/** Deterministic small variation so the mantel reads hand-placed, not minted. */
function candleHeight(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return 14 + (h % 9); // 14–22px stick
}

function Candle({ candle, index }: { candle: MantelCandle; index: number }) {
  const stick = candleHeight(candle.id);
  const name = candle.visitor.displayName || "A visitor";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + index * 0.06, duration: 0.4 }}
      className="group relative flex flex-col items-center"
    >
      {/* Tooltip */}
      <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-elevated/95 px-2.5 py-1 text-[10px] text-text-secondary opacity-0 shadow-[var(--t-shadow-modal)] backdrop-blur-xl transition-opacity group-hover:opacity-100">
        <span className="text-paper">{name}</span>
        <span className="text-text-ghost"> · {formatTimeAgo(candle.litAt)}</span>
      </div>

      {/* Flame */}
      <motion.div
        className="relative h-2.5 w-1.5"
        animate={{ scaleY: [1, 1.25, 0.95, 1.15, 1], scaleX: [1, 0.9, 1.05, 0.92, 1] }}
        transition={{
          duration: 1.6 + (index % 4) * 0.3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: (index % 5) * 0.22,
        }}
        style={{ transformOrigin: "bottom center" }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-amber via-amber to-paper/90" />
        <div className="absolute -inset-1.5 rounded-full bg-amber/30 blur-[5px]" />
      </motion.div>

      {/* Stick */}
      <div
        className="w-[5px] rounded-b-[2px] rounded-t-[1px] bg-gradient-to-b from-paper/75 to-paper/35"
        style={{ height: stick }}
      />
    </motion.div>
  );
}

/**
 * The mantelpiece: candles lit by visitors over the last seven days.
 * The simplest way a reader touches their writer — one warm gesture,
 * standing in the room for a week.
 */
export default function Mantel({
  enabled,
  count,
  candles,
  hasLit,
  isOwner,
  signedIn,
  ownerName,
  onLight,
  variant = "hero",
}: MantelProps) {
  const [lighting, setLighting] = useState(false);
  const [justLit, setJustLit] = useState(false);

  if (!enabled) return null;

  const handleLight = async () => {
    if (lighting || hasLit) return;
    setLighting(true);
    const ok = await onLight();
    setLighting(false);
    if (ok) {
      setJustLit(true);
      window.setTimeout(() => setJustLit(false), 2600);
    }
  };

  const overflow = count - candles.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className={`relative w-full ${
        variant === "room" ? "max-w-none" : "mx-auto mt-8 max-w-2xl"
      }`}
    >
      {/* Candles standing on the shelf */}
      <div className="flex min-h-[44px] items-end justify-center gap-3 px-6 sm:gap-4">
        {candles.length === 0 ? (
          <p className="pb-1 font-reading text-[12px] italic text-text-ghost">
            {isOwner
              ? "The mantel waits for its first candle."
              : "No candles burning yet — the mantel is bare."}
          </p>
        ) : (
          candles.map((c, i) => <Candle key={c.id} candle={c} index={i} />)
        )}
        {overflow > 0 && (
          <span className="pb-0.5 font-mono text-[10px] text-amber/70">+{overflow}</span>
        )}
      </div>

      {/* The shelf itself — a gilt rule */}
      <div className="mx-auto h-px w-full bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

      <div className="mt-3 flex flex-col items-center gap-1.5">
        {count > 0 && (
          <p className="font-mono text-[10px] tracking-wider text-text-ghost">
            {count} {count === 1 ? "candle" : "candles"} burning this week
          </p>
        )}

        {isOwner ? null : !signedIn ? (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/[0.05] px-3.5 py-1.5 text-[11px] text-amber transition-colors hover:bg-amber/10"
          >
            <Flame size={12} />
            Sign in to light a candle
          </Link>
        ) : hasLit || justLit ? (
          <AnimatePresence mode="wait">
            <motion.p
              key={justLit ? "just" : "already"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 text-[11px] text-amber"
            >
              <Flame size={12} />
              {justLit ? `Your candle burns for ${ownerName}` : "Your candle is burning here"}
            </motion.p>
          </AnimatePresence>
        ) : (
          <button
            onClick={handleLight}
            disabled={lighting}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/[0.06] px-4 py-1.5 text-[12px] text-amber transition-all hover:bg-amber/[0.12] hover:shadow-[0_0_18px_rgba(226,172,74,0.18)] disabled:opacity-50"
          >
            <Flame size={13} className={lighting ? "animate-pulse" : ""} />
            {lighting ? "Striking the match…" : "Light a candle"}
          </button>
        )}

        {/* What a candle even is — for whoever hasn't lit one yet */}
        {!isOwner && !hasLit && !justLit && (
          <p className="text-[10px] italic text-text-ghost">
            a small hello that burns on the mantel for a week — it&apos;s free
          </p>
        )}
      </div>
    </motion.div>
  );
}
