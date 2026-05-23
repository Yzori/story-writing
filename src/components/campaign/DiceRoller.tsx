"use client";

import type { PlayerCharacter } from "@/types/campaign";
import { APPROACHES, parseStats } from "@/types/campaign";
import DiceRollerRitual from "./DiceRollerRitual";

interface DiceRollerProps {
  visible: boolean;
  onClose: () => void;
  // The server resolves the dice. The client only sends intent (which approach,
  // whether aspect is invoked); the server rolls with crypto-grade RNG and
  // returns the resolved dice + tier so the UI can animate to the real result.
  onRollSubmit: (intent: { attribute: string; aspectInvoked: boolean }) => Promise<{
    dice: [number, number];
    modifier: number;
    total: number;
    tier: "success" | "partial" | "failure";
  }>;
  characters: PlayerCharacter[];
  currentUserId: string | null;
  preSelectedAttribute?: string | null;
  rollReason?: string | null;
  rollOnSuccess?: string | null;
  rollOnFailure?: string | null;
  rollFatal?: boolean;
}

function mapPreselectedApproach(attribute?: string | null) {
  if (!attribute) return null;
  const direct = APPROACHES.find((approach) => approach.toLowerCase() === attribute.toLowerCase());
  if (direct) return direct;

  const legacyMap: Record<string, string> = {
    STR: "Bold",
    CON: "Bold",
    DEX: "Subtle",
    CHA: "Subtle",
    INT: "Keen",
    WIS: "Keen",
  };
  return legacyMap[attribute.toUpperCase()] ?? null;
}

export default function DiceRoller({
  visible,
  onClose,
  onRollSubmit,
  characters,
  currentUserId,
  preSelectedAttribute,
  rollReason,
  rollOnSuccess,
  rollOnFailure,
  rollFatal,
}: DiceRollerProps) {
  const myChar = characters.find((character) => character.userId === currentUserId);
  const stats = myChar ? parseStats(myChar.stats) : null;

  return (
    <DiceRollerRitual
      visible={visible}
      onClose={onClose}
      onRollSubmit={onRollSubmit}
      approaches={stats?.approaches ?? { Bold: 0, Keen: 0, Subtle: 0 }}
      aspect={stats?.aspect ?? null}
      preSelectedAttribute={mapPreselectedApproach(preSelectedAttribute)}
      rollReason={rollReason}
      rollOnSuccess={rollOnSuccess}
      rollOnFailure={rollOnFailure}
      rollFatal={rollFatal}
    />
  );
}
