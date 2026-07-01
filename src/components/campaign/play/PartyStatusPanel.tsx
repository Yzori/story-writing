"use client";

import type { CharacterMarkKind, PlayerCharacter, SessionRosterEntry } from "@/types/campaign";
import CharacterSheetSection from "@/components/campaign/CharacterSheetSection";

interface PartyStatusPanelProps {
  characters: PlayerCharacter[];
  activePlayerId: string | null;
  onChangeCharacterStatus: (characterId: string, status: "active" | "retired" | "dead") => void;
  onInviteNewCharacter?: (userId: string) => void;
  roster?: SessionRosterEntry[];
  currentUserId?: string | null;
  onCreateMark?: (
    characterId: string,
    input: { kind: CharacterMarkKind; text: string },
  ) => Promise<unknown>;
  onRemoveMark?: (characterId: string, markId: string) => Promise<void>;
}

/**
 * The Director's party view in the rail — status (depart / fall / revive),
 * marks, invites. A thin frame around the kept CharacterSheetSection.
 */
export default function PartyStatusPanel(props: PartyStatusPanelProps) {
  return (
    <section aria-label="Party status" className="px-1">
      <CharacterSheetSection {...props} isGM />
    </section>
  );
}
