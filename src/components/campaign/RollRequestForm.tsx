"use client";

import { useState } from "react";
import type { PlayerCharacter } from "@/types/campaign";

interface RollRequestFormProps {
  activeChars: PlayerCharacter[];
  onRequestRoll: (targetUserId: string, attribute: string, reason: string, onSuccess: string, onFailure: string, fatal?: boolean) => void;
}

export default function RollRequestForm({ activeChars, onRequestRoll }: RollRequestFormProps) {
  const [showRollForm, setShowRollForm] = useState(false);
  const [rollTarget, setRollTarget] = useState<string>("everyone");
  const [rollReason, setRollReason] = useState("");
  const [rollOnSuccess, setRollOnSuccess] = useState("");
  const [rollOnFailure, setRollOnFailure] = useState("");

  if (showRollForm) {
    return (
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-violet-400 font-bold">Call for a Moment of Truth</p>

        {/* Target */}
        <div>
          <label className="text-[9px] uppercase text-white/30 tracking-wider">Who</label>
          <select
            value={rollTarget}
            onChange={(e) => setRollTarget(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 cursor-pointer"
          >
            <option value="everyone">Everyone</option>
            {activeChars.map((c) => (
              <option key={c.userId} value={c.userId}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* What's at stake */}
        <div>
          <label className="text-[9px] uppercase text-white/30 tracking-wider">What&rsquo;s at stake?</label>
          <input
            type="text"
            value={rollReason}
            onChange={(e) => setRollReason(e.target.value)}
            placeholder="The bridge crumbles beneath their feet..."
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20"
          />
        </div>

        {/* Stakes */}
        <div>
          <label className="text-[9px] uppercase text-emerald-400/60 tracking-wider">If they succeed...</label>
          <input
            type="text"
            value={rollOnSuccess}
            onChange={(e) => setRollOnSuccess(e.target.value)}
            placeholder="They leap across just in time"
            className="w-full bg-black/30 border border-emerald-500/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-emerald-500/30"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase text-red-400/60 tracking-wider">If they fail...</label>
          <textarea
            value={rollOnFailure}
            onChange={(e) => setRollOnFailure(e.target.value)}
            placeholder="The stones give way and they plunge into darkness"
            className="w-full bg-black/30 border border-red-500/10 rounded-lg px-3 py-2 text-xs text-white outline-none mt-1 placeholder:text-white/20 focus:border-red-500/30 resize-none"
            rows={2}
          />
          <p className="text-[8px] text-white/15 mt-1 font-serif italic leading-relaxed">
            If failure means death, say so in your stakes — the narrative will carry the weight.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              if (rollReason.trim()) {
                onRequestRoll(rollTarget, "Bold", rollReason.trim(), rollOnSuccess.trim(), rollOnFailure.trim());
                setRollReason(""); setRollOnSuccess(""); setRollOnFailure("");
                setShowRollForm(false);
              }
            }}
            disabled={!rollReason.trim()}
            className="flex-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-[10px] uppercase tracking-wider font-bold rounded py-1.5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            Call for the Roll
          </button>
          <button onClick={() => setShowRollForm(false)} className="px-3 text-[10px] text-white/40 hover:text-white cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowRollForm(true)}
      className="bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 rounded-lg p-3 text-left transition-colors flex items-center justify-between group cursor-pointer"
    >
      <span className="text-sm text-violet-400 font-medium">Moment of Truth...</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400/50 group-hover:translate-x-1 transition-transform">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
      </svg>
    </button>
  );
}
