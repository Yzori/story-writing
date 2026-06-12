"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Hammer, SlidersHorizontal, Flame, Mail, CircleDot } from "lucide-react";
import CircleCard from "@/components/circle/CircleCard";
import GiftJar from "../GiftJar";
import { PollCard, type ProfilePoll } from "../ProfileCrossroads";
import { useRoomParallax, ZoneLabel } from "./Room";

interface SideTableProps {
  userId: string;
  ownerName: string;
  isOwner: boolean;
  signedIn: boolean;
  showGifts: boolean;
  letterboxPolicy: "open" | "followers" | "closed";
  hearthEnabled: boolean;
  circleActive: boolean;
  offeringsCount: number;
  polls: ProfilePoll[];
  onRefreshPolls: () => void;
  onArrange: () => void;
  /** Ambient stage mode: one poll, circle as an object — the zone opens for the rest. */
  compact?: boolean;
  onOpenDoor?: () => void;
}

/**
 * The table by the door: everything the writer set out for visitors —
 * the gift jar, the signpost where tales stand at a crossroads, the door
 * to the Circle, the commission shingle. Owners see the arrangement
 * itself, with the key to change it.
 */
export default function SideTable({
  userId,
  ownerName,
  isOwner,
  signedIn,
  showGifts,
  letterboxPolicy,
  hearthEnabled,
  circleActive,
  offeringsCount,
  polls,
  onRefreshPolls,
  onArrange,
  compact = false,
  onOpenDoor,
}: SideTableProps) {
  const parallax = useRoomParallax(4);
  const [giftOpen, setGiftOpen] = useState(false);
  const visiblePolls = compact ? polls.slice(0, 1) : polls;

  return (
    <motion.div style={parallax} className="flex h-full flex-col">
      <ZoneLabel>For visitors</ZoneLabel>

      <div className="space-y-4">
        {/* Owner: the arrangement, plainly stated */}
        {isOwner && (
          <div className="rounded-xl border border-border bg-elevated/50 p-4">
            <ul className="space-y-2 text-[11px] text-text-secondary">
              <li className="flex items-center gap-2">
                <Flame size={11} className={hearthEnabled ? "text-amber" : "text-text-ghost"} />
                {hearthEnabled ? "Hearth lit — candles welcome" : "Hearth unlit"}
              </li>
              <li className="flex items-center gap-2">
                <Mail size={11} className={letterboxPolicy !== "closed" ? "text-amber" : "text-text-ghost"} />
                Letterbox {letterboxPolicy === "open" ? "open to all" : letterboxPolicy === "followers" ? "open to followers" : "closed"}
              </li>
              <li className="flex items-center gap-2">
                <Gift size={11} className={showGifts ? "text-amber" : "text-text-ghost"} />
                {showGifts ? "Gifts set out" : "No gifts"}
              </li>
            </ul>
            <button
              onClick={onArrange}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-amber/25 bg-amber/[0.05] px-3 py-1.5 text-[11px] text-amber transition-colors hover:bg-amber/10"
            >
              <SlidersHorizontal size={11} />
              Arrange the study
            </button>
          </div>
        )}

        {/* The gift jar */}
        {showGifts && !isOwner && (
          <button
            onClick={() => setGiftOpen(true)}
            className="group flex w-full items-center gap-3 rounded-xl border border-border bg-elevated/50 p-4 text-left transition-all hover:border-amber/25 hover:bg-amber/[0.04]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber/25 bg-amber/[0.06] text-amber transition-shadow group-hover:shadow-[0_0_14px_rgba(226,172,74,0.2)]">
              <Gift size={15} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] text-paper">Leave a gift</span>
              <span className="block text-[10px] italic text-text-ghost">
                ink drops for {ownerName}&apos;s well
              </span>
            </span>
          </button>
        )}

        {/* The signpost — open crossroads */}
        {visiblePolls.length > 0 && (
          <div className="space-y-3" id="crossroads">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-ghost">
              At a crossroads
            </p>
            {visiblePolls.map((poll, i) => (
              <PollCard
                key={poll.id}
                poll={poll}
                isOwner={isOwner}
                signedIn={signedIn}
                index={i}
                onRefresh={onRefreshPolls}
              />
            ))}
            {compact && polls.length > visiblePolls.length && (
              <button
                onClick={onOpenDoor}
                className="w-full text-center text-[11px] italic text-text-ghost transition-colors hover:text-amber"
              >
                …{polls.length - visiblePolls.length} more {polls.length - visiblePolls.length === 1 ? "choice stands" : "choices stand"} open
              </button>
            )}
          </div>
        )}

        {/* The door to the Circle */}
        {circleActive && !isOwner && (
          compact ? (
            <button
              onClick={onOpenDoor}
              className="group flex w-full items-center gap-3 rounded-xl border border-border bg-elevated/50 p-4 text-left transition-all hover:border-amber/25 hover:bg-amber/[0.04]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber/25 bg-amber/[0.06] text-amber">
                <CircleDot size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] text-paper">The Circle is open</span>
                <span className="block text-[10px] italic text-text-ghost">
                  early chapters for confidants
                </span>
              </span>
            </button>
          ) : (
            <div id="circle">
              <CircleCard creatorId={userId} creatorName={ownerName} />
            </div>
          )
        )}

        {/* The commission shingle */}
        {offeringsCount > 0 && (
          <button
            onClick={() =>
              document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" })
            }
            className="group flex w-full items-center gap-3 rounded-xl border border-border bg-elevated/50 p-4 text-left transition-all hover:border-amber/25 hover:bg-amber/[0.04]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-elevated text-amber">
              <Hammer size={15} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] text-paper">Commission work</span>
              <span className="block text-[10px] italic text-text-ghost">
                {offeringsCount} {offeringsCount === 1 ? "craft" : "crafts"} offered below
              </span>
            </span>
          </button>
        )}
      </div>

      <GiftJar
        userId={userId}
        ownerName={ownerName}
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
      />
    </motion.div>
  );
}
