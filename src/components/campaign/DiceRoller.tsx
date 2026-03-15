"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PlayerCharacter } from "./types";
import { parseStats, APPROACHES } from "./types";

// ── Animated Dice Face ─────────────────────────────────────

// Pip layout positions for each die face (1-6)
const PIP_LAYOUTS: Record<number, Array<{ x: number; y: number }>> = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
  3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
  4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
  5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
  6: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
};

function DiceFace({ value, rolling, index }: { value: number | null; rolling: boolean; index: number }) {
  const [display, setDisplay] = useState(value ?? 0);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (rolling) {
      setLanded(false);
      const interval = setInterval(() => setDisplay(Math.floor(Math.random() * 6) + 1), 80);
      return () => clearInterval(interval);
    } else if (value !== null) {
      setDisplay(value);
      // Trigger landed animation
      setLanded(true);
      const timer = setTimeout(() => setLanded(false), 600);
      return () => clearTimeout(timer);
    }
  }, [rolling, value]);

  const pips = PIP_LAYOUTS[rolling ? display : (value ?? 0)] ?? [];
  const showPips = display > 0;

  return (
    <motion.div
      animate={
        rolling
          ? {
              rotate: [0, index === 0 ? 15 : -15, index === 0 ? -10 : 10, 0],
              y: [0, -8, 4, -3, 0],
              scale: [1, 1.05, 0.95, 1],
            }
          : landed
            ? { rotate: 0, y: [0, -12, 0], scale: [1, 1.15, 1] }
            : { rotate: 0, y: 0, scale: 1 }
      }
      transition={
        rolling
          ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
          : landed
            ? { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
            : { duration: 0.3 }
      }
      className={`w-16 h-16 rounded-xl flex items-center justify-center relative border-2 transition-colors duration-300 ${
        rolling
          ? "bg-[#1a1a1a] border-amber/50"
          : value !== null
            ? "bg-[#1a1a1a] border-amber/60 shadow-[0_0_25px_rgba(200,150,60,0.4)]"
            : "bg-[#1a1a1a] border-white/20"
      }`}
    >
      {/* Pip dots */}
      {showPips ? (
        <div className="absolute inset-2">
          {pips.map((pip, i) => (
            <motion.div
              key={i}
              className={`absolute w-2.5 h-2.5 rounded-full ${
                rolling
                  ? "bg-amber/40"
                  : value !== null
                    ? "bg-amber shadow-[0_0_6px_rgba(200,150,60,0.6)]"
                    : "bg-white/20"
              }`}
              style={{
                left: `${pip.x}%`,
                top: `${pip.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              animate={landed ? { scale: [0.5, 1.2, 1] } : {}}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            />
          ))}
        </div>
      ) : (
        <span className="text-2xl font-display font-bold text-white/30">?</span>
      )}

      {/* Impact flash on landing */}
      {landed && (
        <motion.div
          initial={{ opacity: 0.6, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-xl border-2 border-amber/40"
        />
      )}
    </motion.div>
  );
}

// ── Outcome Display ────────────────────────────────────────

function OutcomeTier({ total }: { total: number }) {
  if (total >= 10) return (
    <div className="text-center mt-4">
      <div className="text-amber font-display text-xl font-bold drop-shadow-[0_0_12px_rgba(200,150,60,0.8)]">Full Success</div>
      <p className="text-[11px] text-amber/60 mt-1">You get what you want.</p>
    </div>
  );
  if (total >= 7) return (
    <div className="text-center mt-4">
      <div className="text-yellow-400 font-display text-xl font-bold">Partial Success</div>
      <p className="text-[11px] text-yellow-400/60 mt-1">You get it, but at a cost.</p>
    </div>
  );
  return (
    <div className="text-center mt-4">
      <div className="text-red-400 font-display text-xl font-bold">Failure</div>
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
  rollFatal?: boolean;
}

export default function DiceRoller({ visible, onClose, onRollComplete, characters, currentUserId, preSelectedAttribute, rollReason, rollOnSuccess, rollOnFailure, rollFatal }: DiceRollerProps) {
  const [rolling, setRolling] = useState(false);
  const [die1, setDie1] = useState<number | null>(null);
  const [die2, setDie2] = useState<number | null>(null);
  const [selectedApproach, setSelectedApproach] = useState<string | null>(null);
  const [aspectInvoked, setAspectInvoked] = useState(false);

  const myChar = characters.find((c) => c.userId === currentUserId);
  const stats = myChar ? parseStats(myChar.stats) : null;
  const approaches = stats?.approaches ?? { Bold: 0, Keen: 0, Subtle: 0 };
  const aspect = stats?.aspect ?? "";

  // Compute modifier
  const approachMod = selectedApproach ? (approaches[selectedApproach as keyof typeof approaches] ?? 0) : 0;
  const aspectMod = aspectInvoked && aspect ? 1 : 0;
  const totalMod = approachMod + aspectMod;

  const total = die1 !== null && die2 !== null ? die1 + die2 + totalMod : null;

  // Auto-select approach when GM pre-selects one
  useEffect(() => {
    if (preSelectedAttribute) {
      // Map GM's attribute pick to an approach (could be "Bold", "Keen", "Subtle" directly
      // or a legacy attribute name)
      const mapped = APPROACHES.find((a) => a.toLowerCase() === preSelectedAttribute.toLowerCase());
      if (mapped) {
        setSelectedApproach(mapped);
      } else {
        // Legacy mapping
        const legacyMap: Record<string, string> = { STR: "Bold", CON: "Bold", DEX: "Subtle", CHA: "Subtle", INT: "Keen", WIS: "Keen" };
        setSelectedApproach(legacyMap[preSelectedAttribute.toUpperCase()] ?? null);
      }
    }
  }, [preSelectedAttribute]);

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
        const finalMod = (selectedApproach ? (approaches[selectedApproach as keyof typeof approaches] ?? 0) : 0) + (aspectInvoked && aspect ? 1 : 0);
        onRollComplete(r1 + r2 + finalMod, finalMod, selectedApproach ?? "none");
      }, 2000);
    }, 1200);
  };

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setDie1(null);
        setDie2(null);
        setRolling(false);
        setSelectedApproach(null);
        setAspectInvoked(false);
      }, 300);
    }
  }, [visible]);

  const approachDescriptions: Record<string, string> = {
    Bold: "Force, courage, confrontation",
    Keen: "Perception, cunning, knowledge",
    Subtle: "Finesse, deception, diplomacy",
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
        >
          <div className="bg-[#111]/95 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-col items-center min-w-[320px]">
            <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-white/50 mb-2">Roll 2d6</h3>
            {rollReason && (
              <p className="text-xs text-violet-400 mb-2 text-center max-w-[280px]">
                GM: <span className="text-white/70">{rollReason}</span>
              </p>
            )}
            <p className="text-[10px] text-white/30 mb-5">
              10+ success &bull; 7-9 partial &bull; 6- fail
            </p>

            {/* Fatal warning */}
            {rollFatal && (
              <div className="w-full max-w-[280px] mb-3 px-3 py-2 rounded-lg bg-rose/10 border border-rose/30 text-center">
                <span className="text-[10px] uppercase tracking-widest font-bold text-rose">Fatal Stakes</span>
                <p className="text-[10px] text-rose/60 mt-0.5">Failure means death. Choose wisely.</p>
              </div>
            )}

            {/* Stakes */}
            {(rollOnSuccess || rollOnFailure) && (
              <div className="w-full max-w-[280px] mb-5 space-y-2">
                {rollOnSuccess && (
                  <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border transition-all duration-500 ${
                    total !== null && !rolling && total >= 7 ? "bg-emerald-500/15 border-emerald-500/30" : "bg-white/[0.02] border-white/5"
                  }`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider shrink-0 mt-0.5 transition-colors ${total !== null && !rolling && total >= 7 ? "text-emerald-400" : "text-emerald-400/40"}`}>Win</span>
                    <span className={`text-[11px] leading-relaxed transition-colors ${total !== null && !rolling && total >= 7 ? "text-white/80" : "text-white/40"}`}>{rollOnSuccess}</span>
                  </div>
                )}
                {rollOnFailure && (
                  <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border transition-all duration-500 ${
                    total !== null && !rolling && total < 7 ? "bg-red-500/15 border-red-500/30" : "bg-white/[0.02] border-white/5"
                  }`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider shrink-0 mt-0.5 transition-colors ${total !== null && !rolling && total < 7 ? "text-red-400" : "text-red-400/40"}`}>Lose</span>
                    <span className={`text-[11px] leading-relaxed transition-colors ${total !== null && !rolling && total < 7 ? "text-white/80" : "text-white/40"}`}>{rollOnFailure}</span>
                  </div>
                )}
              </div>
            )}

            {/* Approach selector */}
            <div className="mb-4 w-full">
              <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2 text-center">Approach</p>
              <div className="flex gap-2 justify-center">
                {APPROACHES.map((approach) => {
                  const mod = approaches[approach];
                  const isSelected = selectedApproach === approach;
                  return (
                    <button
                      key={approach}
                      onClick={() => setSelectedApproach(isSelected ? null : approach)}
                      disabled={!!preSelectedAttribute}
                      className={`px-3 py-2 rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-0.5 min-w-[80px] disabled:cursor-default ${
                        isSelected
                          ? "bg-amber/20 border-amber/40 text-amber"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white/70"
                      }`}
                    >
                      <span className="text-xs font-bold">{approach}</span>
                      <span className={`text-[9px] ${mod > 0 ? "text-amber/70" : mod < 0 ? "text-red-400/70" : "text-white/30"}`}>
                        {mod >= 0 ? `+${mod}` : mod}
                      </span>
                      <span className="text-[8px] text-white/20">{approachDescriptions[approach]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect invoke toggle */}
            {aspect && (
              <button
                onClick={() => setAspectInvoked(!aspectInvoked)}
                className={`mb-5 px-4 py-2 rounded-xl border text-xs transition-all cursor-pointer max-w-[280px] text-center leading-relaxed ${
                  aspectInvoked
                    ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                    : "bg-white/[0.02] border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                }`}
              >
                <span className="text-[9px] uppercase tracking-widest block mb-1 text-violet-400/60">
                  {aspectInvoked ? "Aspect Invoked (+1)" : "Invoke Aspect? (+1)"}
                </span>
                &ldquo;{aspect}&rdquo;
              </button>
            )}

            {/* Modifier summary */}
            {totalMod !== 0 && (
              <p className="text-[10px] text-amber/60 mb-3">
                Modifier: {totalMod >= 0 ? "+" : ""}{totalMod}
                {selectedApproach ? ` (${selectedApproach} ${approachMod >= 0 ? "+" : ""}${approachMod})` : ""}
                {aspectInvoked ? " + Aspect +1" : ""}
              </p>
            )}

            {/* Dice Tray */}
            <div
              className="relative mb-4 cursor-pointer group"
              onClick={executeRoll}
            >
              {/* Tray background */}
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-b from-[#1a1510] to-[#0d0b08] border border-amber/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),inset_0_-1px_0_rgba(200,150,60,0.05)]" />

              {/* Tray felt texture */}
              <div className="absolute -inset-4 rounded-2xl opacity-30"
                style={{
                  backgroundImage: "radial-gradient(circle at 30% 40%, rgba(200,150,60,0.03) 0%, transparent 60%), radial-gradient(circle at 70% 60%, rgba(200,150,60,0.02) 0%, transparent 50%)",
                }}
              />

              <div className="relative flex items-center gap-4 p-4">
                <DiceFace value={die1} rolling={rolling} index={0} />
                <span className="text-white/30 text-xl font-display select-none">+</span>
                <DiceFace value={die2} rolling={rolling} index={1} />
              </div>

              {/* Dice clatter lines — brief visual on roll */}
              {rolling && (
                <>
                  <motion.div
                    className="absolute top-1 left-6 w-3 h-px bg-amber/20"
                    animate={{ opacity: [0, 0.5, 0], x: [-4, 4] }}
                    transition={{ duration: 0.3, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute bottom-2 right-8 w-2 h-px bg-amber/20"
                    animate={{ opacity: [0, 0.4, 0], x: [3, -3] }}
                    transition={{ duration: 0.25, repeat: Infinity, delay: 0.1 }}
                  />
                </>
              )}
            </div>

            {/* Total + Outcome */}
            {total !== null && !rolling && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  className="text-3xl font-display font-bold text-white mb-1 relative"
                  initial={{ textShadow: "0 0 0px transparent" }}
                  animate={{
                    textShadow: total >= 10
                      ? "0 0 20px rgba(200,150,60,0.8)"
                      : total >= 7
                        ? "0 0 12px rgba(250,204,21,0.5)"
                        : "0 0 12px rgba(239,68,68,0.5)",
                  }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  = {total}
                </motion.div>
                <OutcomeTier total={total} />
              </motion.div>
            )}

            {die1 === null && !rolling && (
              <p className="text-[10px] text-amber/30 mt-2">Click the dice to roll</p>
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
