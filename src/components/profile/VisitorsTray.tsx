"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Gift, CircleDot, Hammer, Signpost } from "lucide-react";
import GiftJar from "./GiftJar";

interface VisitorsTrayProps {
  userId: string;
  ownerName: string;
  isOwner: boolean;
  signedIn: boolean;
  letterboxPolicy: "open" | "followers" | "closed";
  showGifts: boolean;
  circleActive: boolean;
  offeringsCount: number;
  crossroadsCount: number;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface TrayItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  whisper: string;
  onClick: () => void;
}

/**
 * What the writer has set out for visitors. Every pill here exists because
 * the host chose to put it on the table — the strip is the writer's choices
 * made legible. Hidden entirely when nothing is set out.
 */
export default function VisitorsTray({
  userId,
  ownerName,
  isOwner,
  signedIn,
  letterboxPolicy,
  showGifts,
  circleActive,
  offeringsCount,
  crossroadsCount,
}: VisitorsTrayProps) {
  const [giftOpen, setGiftOpen] = useState(false);

  const items: TrayItem[] = [];

  if (letterboxPolicy !== "closed") {
    items.push({
      key: "letter",
      icon: <Mail size={14} />,
      label: "Write a letter",
      whisper:
        letterboxPolicy === "followers"
          ? "open to followers"
          : "answered letters are kept",
      onClick: () => scrollTo("letterbox"),
    });
  }

  if (crossroadsCount > 0) {
    items.push({
      key: "crossroads",
      icon: <Signpost size={14} />,
      label: crossroadsCount === 1 ? "A story at a crossroads" : `${crossroadsCount} stories at a crossroads`,
      whisper: "cast your ink",
      onClick: () => scrollTo("crossroads"),
    });
  }

  if (showGifts && !isOwner) {
    items.push({
      key: "gift",
      icon: <Gift size={14} />,
      label: "Leave a gift",
      whisper: "ink for the well",
      onClick: () => setGiftOpen(true),
    });
  }
  if (showGifts && isOwner) {
    items.push({
      key: "gift",
      icon: <Gift size={14} />,
      label: "Gifts set out",
      whisper: "visitors can leave ink",
      onClick: () => {},
    });
  }

  if (circleActive) {
    items.push({
      key: "circle",
      icon: <CircleDot size={14} />,
      label: isOwner ? "The Circle is open" : "Join the Circle",
      whisper: isOwner ? "visitors can join" : "read chapters early",
      onClick: isOwner ? () => {} : () => scrollTo("circle"),
    });
  }

  if (offeringsCount > 0) {
    items.push({
      key: "studio",
      icon: <Hammer size={14} />,
      label: "Commission work",
      whisper: `${offeringsCount} ${offeringsCount === 1 ? "craft" : "crafts"} offered`,
      onClick: () => scrollTo("studio"),
    });
  }

  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="relative mx-auto mt-10 max-w-5xl px-5 lg:px-8"
    >
      <p className="mb-3 text-center text-[10px] uppercase tracking-[0.28em] text-text-ghost">
        {isOwner ? "Set out for your visitors" : `${ownerName} has set out`}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {items.map((item, i) => (
          <motion.button
            key={item.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 + i * 0.08, duration: 0.4 }}
            onClick={item.onClick}
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 backdrop-blur-xl transition-all hover:border-amber/25 hover:bg-amber/[0.04] hover:shadow-[0_0_18px_rgba(226,172,74,0.10)]"
          >
            <span className="text-amber">{item.icon}</span>
            <span className="text-[12px] text-text transition-colors group-hover:text-paper">
              {item.label}
            </span>
            <span className="hidden text-[10px] italic text-text-ghost sm:inline">
              {item.whisper}
            </span>
          </motion.button>
        ))}
      </div>

      <GiftJar
        userId={userId}
        ownerName={ownerName}
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
      />
    </motion.section>
  );
}
