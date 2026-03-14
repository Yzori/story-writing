"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PlayerCharacter } from "./types";
import { parseStats } from "./types";

// ── Animated Dice Face ─────────────────────────────────────

function DiceFace({ value, rolling }: { value: number | null; rolling: boolean }) {
  const [display, setDisplay] = useState(value ?? 0);

  useEffect(() => {
    if (rolling) {
      const interval = setInterval(() => {
        setDisplay(Math.floor(Math.random() * 6) + 1);
      }, 80);
      return () => clearInterval(interval);
    } else if (value !== null) {
      setDisplay(value);
    }
  }, [rolling, value]);

  return (
    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-display font-bold border-2 transition-all duration-300 ${
      rolling
        ? "bg-black/50 border-amber/50 text-amber/50 animate-pulse"
        : value !== null
          ? "bg-black/30 border-amber/60 text-amber shadow-[0_0_20px_rgba(200,150,60,0.3)]"
          : "bg-black/50 border-white/20 text-white/30"
    }`}>
      {rolling ? display : value ?? "?"}
    </div>
  );
}

// ── Outcome Tier Display ───────────────────────────────────

function OutcomeTier({ total }: { total: number }) {
  if (total >= 10) {
    return (
      <div className="text-center mt-4">
        <div className="text-amber font-display text-xl font-bold drop-shadow-[0_0_12px_rgba(200,150,60,0.8)]">
          Full Success
        </div>
        <p className="text-[11px] text-amber/60 mt-1">You get what you want.</p>
      </div>
    );
  }
  if (total >= 7) {
    return (
      <div className="text-center mt-4">
        <div className="text-yellow-400 font-display text-xl font-bold">
          Partial Success
        </div>
        <p className="text-[11px] text-yellow-400/60 mt-1">You get it, but at a cost.</p>
      </div>
    );
  }
  return (
    <div className="text-center mt-4">
      <div className="text-red-400 font-display text-xl font-bold">
        Failure
      </div>
      <p className="text-[11px] text-red-400/60 mt-1">The GM makes a move.</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

interface DiceRollerProps {
  visible: boolean;
  onClose: () => void;
  onRollComplete: (total: number, modifier: number, attribute: string) => void;
  characters: PlayerCharacter[];
  currentUserId: string | null;
  preSelectedAttribute?: string | null;
  rollReason?: string | null;
  rollOnSuccess?: string | null;
  rollOnFailure?: string | null;
}

export default function DiceRoller({ visible, onClose, onRollComplete, characters, currentUserId, preSelectedAttribute, rollReason, rollOnSuccess, rollOnFailure }: DiceRollerProps) {
  const [rolling, setRolling] = useState(false);
  const [die1, setDie1] = useState<number | null>(null);
  const [die2, setDie2] = useState<number | null>(null);
  const [selectedAttr, setSelectedAttr] = useState<string | null>(null);
  const [modifier, setModifier] = useState(0);

  // Get current player's stats for attribute modifiers
  const myChar = characters.find((c) => c.userId === currentUserId);
  const stats = myChar ? parseStats(myChar.stats) : null;
  const attributes = stats?.attributes ?? {};

  // Auto-select attribute when GM pre-selects one
  useEffect(() => {
    if (preSelectedAttribute && attributes[preSelectedAttribute] !== undefined) {
      setSelectedAttr(preSelectedAttribute);
      setModifier(attrToMod(attributes[preSelectedAttribute]));
    }
  }, [preSelectedAttribute]);

  // Compute modifier from attribute value (PbtA-style: 10-11 = 0, 12-15 = +1, 16-17 = +2, 18+ = +3)
  const attrToMod = (val: number): number => {
    if (val >= 18) return 3;
    if (val >= 16) return 2;
    if (val >= 12) return 1;
    if (val >= 10) return 0;
    if (val >= 8) return -1;
    return -2;
  };

  const selectAttribute = (key: string) => {
    if (selectedAttr === key) {
      setSelectedAttr(null);
      setModifier(0);
    } else {
      setSelectedAttr(key);
      setModifier(attrToMod(attributes[key]));
    }
  };

  const total = die1 !== null && die2 !== null ? die1 + die2 + modifier : null;

  const executeRoll = () => {
    if (rolling) return;
    setRolling(true);
    setDie1(null);
    setDie2(null);

    setTimeout(() => {
      const r1 = Math.floor(Math.random() * 6) + 1;
      const r2 = Math.floor(Math.random() * 6) + 1;
      setDie1(r1);
      setDie2(r2);
      setRolling(false);

      setTimeout(() => {
        onRollComplete(r1 + r2 + (selectedAttr ? attrToMod(attributes[selectedAttr]) : 0), selectedAttr ? attrToMod(attributes[selectedAttr]) : 0, selectedAttr ?? "none");
      }, 2000);
    }, 1200);
  };

  // Reset state when closing
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setDie1(null);
        setDie2(null);
        setRolling(false);
        setSelectedAttr(null);
        setModifier(0);
      }, 300);
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
        >
          <div className="bg-[#111]/95 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-col items-center min-w-[300px]">
            <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/50 mb-2">Roll 2d6</h3>
            {rollReason && (
              <p className="text-xs text-violet-400 mb-3 text-center max-w-[250px]">
                GM requested: <span className="text-white/70">{rollReason}</span>
              </p>
            )}
            <p className="text-[10px] text-white/30 mb-4">
              10+ success &bull; 7-9 partial &bull; 6- fail
            </p>

            {/* Stakes — what's at risk */}
            {(rollOnSuccess || rollOnFailure) && (
              <div className="w-full max-w-[280px] mb-6 space-y-2">
                {rollOnSuccess && (
                  <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border transition-all duration-500 ${
                    total !== null && !rolling && total >= 7
                      ? "bg-emerald-500/15 border-emerald-500/30"
                      : "bg-white/[0.02] border-white/5"
                  }`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider shrink-0 mt-0.5 transition-colors ${
                      total !== null && !rolling && total >= 7 ? "text-emerald-400" : "text-emerald-400/40"
                    }`}>Win</span>
                    <span className={`text-[11px] leading-relaxed transition-colors ${
                      total !== null && !rolling && total >= 7 ? "text-white/80" : "text-white/40"
                    }`}>{rollOnSuccess}</span>
                  </div>
                )}
                {rollOnFailure && (
                  <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border transition-all duration-500 ${
                    total !== null && !rolling && total < 7
                      ? "bg-red-500/15 border-red-500/30"
                      : "bg-white/[0.02] border-white/5"
                  }`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider shrink-0 mt-0.5 transition-colors ${
                      total !== null && !rolling && total < 7 ? "text-red-400" : "text-red-400/40"
                    }`}>Lose</span>
                    <span className={`text-[11px] leading-relaxed transition-colors ${
                      total !== null && !rolling && total < 7 ? "text-white/80" : "text-white/40"
                    }`}>{rollOnFailure}</span>
                  </div>
                )}
              </div>
            )}

            {/* Attribute selector */}
            {Object.keys(attributes).length > 0 && (
              <div className="mb-6 w-full">
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2 text-center">Add modifier</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {Object.entries(attributes).map(([key, val]) => {
                    const mod = attrToMod(val);
                    const isSelected = selectedAttr === key;
                    return (
                      <button
                        key={key}
                        onClick={() => selectAttribute(key)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          isSelected
                            ? "bg-amber/20 border-amber/40 text-amber"
                            : "bg-white/5 border-white/10 text-white/50 hover:text-white/70"
                        }`}
                      >
                        <span className="font-bold">{key}</span>
                        <span className={`text-[9px] ${mod >= 0 ? "text-amber/70" : "text-red-400/70"}`}>
                          {mod >= 0 ? `+${mod}` : mod}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dice */}
            <div
              className="flex items-center gap-4 mb-4 cursor-pointer group"
              onClick={executeRoll}
            >
              <DiceFace value={die1} rolling={rolling} />
              <span className="text-white/30 text-xl font-display">+</span>
              <DiceFace value={die2} rolling={rolling} />
              {modifier !== 0 && (
                <>
                  <span className="text-white/30 text-xl font-display">{modifier >= 0 ? "+" : ""}</span>
                  <div className="w-10 h-16 rounded-xl flex items-center justify-center text-lg font-display font-bold border-2 border-amber/30 bg-amber/10 text-amber">
                    {modifier >= 0 ? `+${modifier}` : modifier}
                  </div>
                </>
              )}
            </div>

            {/* Total */}
            {total !== null && !rolling && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <div className="text-3xl font-display font-bold text-white mb-1">
                  = {total}
                </div>
                <OutcomeTier total={total} />
              </motion.div>
            )}

            {/* Click to roll hint */}
            {die1 === null && !rolling && (
              <p className="text-[10px] text-amber/40 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                Click the dice to roll
              </p>
            )}

            <button onClick={onClose} className="text-xs text-white/30 hover:text-white cursor-pointer mt-6">
              {total !== null ? "Close" : "Cancel"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
