"use client";

import { useState } from "react";
import { Dice5, Send, Skull, Sparkles, Users, X } from "lucide-react";
import type { PlayerCharacter } from "@/types/campaign";
import { APPROACHES } from "@/types/campaign";

interface RollRequestFormProps {
  activeChars: PlayerCharacter[];
  onRequestRoll: (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => void;
}

const STAKE_PRESETS = [
  {
    label: "Pressure",
    reason: "Act before the danger escalates.",
    success: "They seize the opening and keep control.",
    failure: "The situation worsens before anyone can stop it.",
  },
  {
    label: "Discovery",
    reason: "Uncover what is really happening here.",
    success: "They read the signs clearly and gain leverage.",
    failure: "They learn the truth, but too late or at a cost.",
  },
  {
    label: "Escape",
    reason: "Get clear before the trap closes.",
    success: "They slip free with seconds to spare.",
    failure: "The way out narrows and someone is exposed.",
  },
] as const;

export default function RollRequestForm({ activeChars, onRequestRoll }: RollRequestFormProps) {
  const [showRollForm, setShowRollForm] = useState(false);
  const [rollTarget, setRollTarget] = useState<string>("everyone");
  const [rollApproach, setRollApproach] = useState<string>("Bold");
  const [rollReason, setRollReason] = useState("");
  const [rollOnSuccess, setRollOnSuccess] = useState("");
  const [rollOnFailure, setRollOnFailure] = useState("");
  const [fatal, setFatal] = useState(false);

  const selectedTargetName = rollTarget === "everyone"
    ? "Everyone"
    : activeChars.find((character) => character.userId === rollTarget)?.name ?? "Someone";

  const resetForm = () => {
    setRollReason("");
    setRollOnSuccess("");
    setRollOnFailure("");
    setFatal(false);
  };

  if (showRollForm) {
    return (
      <div className="overflow-hidden rounded-2xl border border-lavender/25 bg-lavender/[0.04] shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
        <div className="border-b border-lavender/15 bg-subtle/30 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-lavender">
                <Dice5 size={14} />
                Moment of Truth
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Frame the risk, then put the dice in motion.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRollForm(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-subtle/20 text-text-secondary transition-colors hover:text-paper"
              aria-label="Close roll request"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-[9px] uppercase tracking-[0.16em] text-text-ghost">Who is on the spot?</label>
              <span className="truncate text-[10px] text-lavender">{selectedTargetName}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRollTarget("everyone")}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[10px] uppercase tracking-wider transition-colors ${
                  rollTarget === "everyone"
                    ? "border-lavender/45 bg-lavender/15 text-lavender"
                    : "border-border bg-elevated text-text-secondary hover:text-paper"
                }`}
              >
                <Users size={13} />
                Everyone
              </button>
              {activeChars.map((character) => (
                <button
                  key={character.userId}
                  type="button"
                  onClick={() => setRollTarget(character.userId)}
                  className={`min-h-9 rounded-full border px-3 text-[10px] uppercase tracking-wider transition-colors ${
                    rollTarget === character.userId
                      ? "border-lavender/45 bg-lavender/15 text-lavender"
                      : "border-border bg-elevated text-text-secondary hover:text-paper"
                  }`}
                >
                  {character.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[9px] uppercase tracking-[0.16em] text-text-ghost">Approach</label>
            <div className="grid grid-cols-3 gap-2">
              {APPROACHES.map((approach) => (
                <button
                  key={approach}
                  type="button"
                  onClick={() => setRollApproach(approach)}
                  className={`min-h-10 rounded-xl border px-2 py-2 text-[11px] font-bold transition-colors ${
                    rollApproach === approach
                      ? "border-lavender/45 bg-lavender/15 text-lavender shadow-[0_0_18px_rgba(167,139,250,0.12)]"
                      : "border-border bg-elevated text-text-secondary hover:text-paper"
                  }`}
                >
                  {approach}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[9px] uppercase tracking-[0.16em] text-text-ghost">Quick stakes</label>
            <div className="grid gap-2">
              {STAKE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setRollReason(preset.reason);
                    setRollOnSuccess(preset.success);
                    setRollOnFailure(preset.failure);
                  }}
                  className="rounded-xl border border-border bg-elevated px-3 py-2 text-left transition-colors hover:border-lavender/30 hover:bg-lavender/[0.06]"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-lavender">{preset.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-text-secondary">{preset.reason}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-text-ghost">The risk</label>
            <textarea
              value={rollReason}
              onChange={(event) => setRollReason(event.target.value)}
              placeholder="The altar wakes unless someone deciphers the binding..."
              className="min-h-20 w-full resize-none rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm leading-relaxed text-paper outline-none placeholder:text-text-ghost focus:border-lavender/35"
            />
          </div>

          <div className="grid gap-2">
            <div className="rounded-xl border border-sage/20 bg-sage/[0.04] p-3">
              <label className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-sage">On a hit</label>
              <input
                type="text"
                value={rollOnSuccess}
                onChange={(event) => setRollOnSuccess(event.target.value)}
                placeholder="They gain control, clarity, or a way through."
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-paper outline-none placeholder:text-text-ghost focus:border-sage/35"
              />
            </div>

            <div className="rounded-xl border border-rose/20 bg-rose/[0.04] p-3">
              <label className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-rose">On a miss</label>
              <textarea
                value={rollOnFailure}
                onChange={(event) => setRollOnFailure(event.target.value)}
                placeholder="The danger lands, the cost comes due, or the clock advances."
                className="min-h-16 w-full resize-none rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-paper outline-none placeholder:text-text-ghost focus:border-rose/35"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFatal((value) => !value)}
            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
              fatal
                ? "border-rose/45 bg-rose/10"
                : "border-border bg-elevated hover:border-rose/25 hover:bg-rose/[0.04]"
            }`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${fatal ? "border-rose bg-rose/20 text-rose" : "border-border text-text-tertiary"}`}>
              <Skull size={12} />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-rose">Fatal stakes</span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-text-secondary">
                Mark this only when failure can end a character&apos;s story.
              </span>
            </span>
          </button>

          <div className="flex gap-2 border-t border-border-subtle pt-3">
            <button
              type="button"
              onClick={() => {
                if (!rollReason.trim()) return;
                onRequestRoll(rollTarget, rollApproach, rollReason.trim(), rollOnSuccess.trim(), rollOnFailure.trim(), fatal);
                resetForm();
                setShowRollForm(false);
              }}
              disabled={!rollReason.trim()}
              className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full border border-lavender/30 bg-lavender/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-lavender transition-colors hover:bg-lavender/25 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Send size={13} />
              Call Roll
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowRollForm(false);
              }}
              className="min-h-10 rounded-full border border-border px-4 py-2 text-[10px] uppercase tracking-wider text-text-secondary transition-colors hover:text-paper"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowRollForm(true)}
      className="group relative min-h-20 overflow-hidden rounded-2xl border border-lavender/25 bg-lavender/[0.05] p-4 text-left shadow-[0_12px_36px_rgba(0,0,0,0.22)] transition-colors hover:border-lavender/40 hover:bg-lavender/10"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-lavender/60" />
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold text-lavender">
            <Dice5 size={16} />
            Moment of Truth
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed text-text-secondary">
            Call for a roll with target, approach, and consequences in one move.
          </span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-lavender/20 bg-subtle/30 text-lavender transition-transform group-hover:translate-x-0.5">
          <Sparkles size={14} />
        </span>
      </span>
    </button>
  );
}
