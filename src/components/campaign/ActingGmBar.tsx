"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface ActingGmPlayer {
  userId: string;
  name: string;
}

type ActingGmAction = "handoff" | "reclaim" | "propose" | "confirm" | "cancel";

interface ActingGmBarProps {
  sessionStatus: string;
  ownerId: string | null;
  actingGmId: string | null;
  takeoverProposerId: string | null;
  currentUserId: string | null;
  /** Active players at the table (handoff targets + name lookup). Excludes the owner. */
  players: ActingGmPlayer[];
  /** Whether the current user is an active player (can offer/confirm a takeover). */
  isActivePlayer: boolean;
  onAction: (action: ActingGmAction, targetUserId?: string) => void | Promise<void>;
}

/**
 * Live-play continuity (D2): planned handoff, table-consent takeover, and
 * reclaim — surfaced as one slim bar that adapts to who's looking. Hidden unless
 * the session is active and there's something to show or do.
 */
export default function ActingGmBar({
  sessionStatus,
  ownerId,
  actingGmId,
  takeoverProposerId,
  currentUserId,
  players,
  isActivePlayer,
  onAction,
}: ActingGmBarProps) {
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (sessionStatus !== "active" || !currentUserId) return null;

  const nameOf = (id: string | null) =>
    (id && players.find((p) => p.userId === id)?.name) || "A player";

  const isOwner = currentUserId === ownerId;
  const isRunningGm = currentUserId === (actingGmId ?? ownerId);
  const isActingGm = !!actingGmId && currentUserId === actingGmId;
  const amProposer = !!takeoverProposerId && currentUserId === takeoverProposerId;

  const run = (action: ActingGmAction, targetUserId?: string) => async () => {
    if (busy) return;
    setBusy(true);
    setPickerOpen(false);
    try {
      await onAction(action, targetUserId);
    } finally {
      setBusy(false);
    }
  };

  // ── Decide what this viewer sees ──────────────────────────────
  let tone: "amber" | "rose" | "muted" = "muted";
  let message: React.ReactNode = null;
  let actions: React.ReactNode = null;

  if (takeoverProposerId) {
    tone = "rose";
    if (amProposer) {
      message = <>You&rsquo;ve offered to run. Waiting for another player to confirm&hellip;</>;
      actions = <BarButton onClick={run("cancel")} disabled={busy} label="Withdraw" subtle />;
    } else if (isActivePlayer || isRunningGm) {
      message = <><strong className="text-paper">{nameOf(takeoverProposerId)}</strong> offered to run the session.</>;
      actions = (
        <>
          <BarButton onClick={run("confirm")} disabled={busy} label="Confirm" />
          <BarButton onClick={run("cancel")} disabled={busy} label="Dismiss" subtle />
        </>
      );
    } else {
      message = <><strong className="text-paper">{nameOf(takeoverProposerId)}</strong> offered to run the session.</>;
    }
  } else if (actingGmId) {
    tone = "amber";
    if (isActingGm) {
      message = <>You&rsquo;re running this session as <strong className="text-paper">substitute GM</strong>.</>;
      actions = <BarButton onClick={run("reclaim")} disabled={busy} label="Step down" subtle />;
    } else if (isOwner) {
      message = <><strong className="text-paper">{nameOf(actingGmId)}</strong> is running this session for you.</>;
      actions = <BarButton onClick={run("reclaim")} disabled={busy} label="Reclaim" />;
    } else {
      message = <><strong className="text-paper">{nameOf(actingGmId)}</strong> is running this session.</>;
    }
  } else if (isOwner && players.length > 0) {
    // Owner running normally — offer a planned handoff.
    message = <>Can&rsquo;t run tonight?</>;
    actions = <BarButton onClick={() => setPickerOpen((v) => !v)} disabled={busy} label={pickerOpen ? "Close" : "Hand off the session"} subtle />;
  } else if (isActivePlayer && !isRunningGm) {
    // Player — can offer to run if the Director seems away.
    message = <>Director away?</>;
    actions = <BarButton onClick={run("propose")} disabled={busy} label="Offer to run" subtle />;
  } else {
    return null;
  }

  const toneRing =
    tone === "rose" ? "border-rose/40 bg-rose/[0.08]" : tone === "amber" ? "border-amber/40 bg-amber/[0.08]" : "border-border bg-ink/70";

  return (
    // In-flow band that sits directly under the session header (the turn rail),
    // so it never overlaps it. Renders nothing when there's nothing to show.
    <div className="shrink-0 border-b border-border bg-void/80 px-3 py-2 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-2xl">
        <div className={`flex items-center justify-between gap-3 rounded-full border px-4 py-1.5 ${toneRing}`}>
          <span className="min-w-0 truncate text-[12.5px] text-text-secondary">{message}</span>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>

        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mx-auto mt-2 w-full max-w-sm overflow-hidden rounded-2xl border border-amber/25 bg-gradient-to-b from-elevated to-ink p-2 shadow-[0_18px_50px_-30px_rgba(216,178,90,0.6)]"
            >
              <p className="px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-text-ghost">Hand tonight&rsquo;s session to</p>
              {players.map((p) => (
                <button
                  key={p.userId}
                  type="button"
                  onClick={run("handoff", p.userId)}
                  disabled={busy}
                  className="block w-full rounded-xl px-3 py-2 text-left text-[13px] text-text transition-colors hover:bg-amber/10 hover:text-amber disabled:opacity-40"
                >
                  {p.name}
                </button>
              ))}
              <p className="px-2 py-1.5 text-[10px] leading-snug text-text-ghost">
                They run this session only. You reclaim it the moment you act again.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BarButton({
  onClick,
  disabled,
  label,
  subtle,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors disabled:opacity-40 ${
        subtle
          ? "border border-border text-text-tertiary hover:text-paper"
          : "bg-amber text-void hover:bg-amber/90"
      }`}
    >
      {label}
    </button>
  );
}
