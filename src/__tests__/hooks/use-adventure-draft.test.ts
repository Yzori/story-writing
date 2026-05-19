import { describe, expect, it, vi } from "vitest";
import {
  adventureDraftContentKey,
  adventureDraftTypeKey,
  commitAdventureDraft,
} from "@/hooks/use-adventure-draft";

describe("adventure draft storage keys", () => {
  it("keeps content and turn type in separate localStorage keys", () => {
    const sessionId = "session-1";

    expect(adventureDraftContentKey(sessionId)).toBe("quiloria-draft-session-1");
    expect(adventureDraftTypeKey(sessionId)).toBe("quiloria-draft-type-session-1");
  });
});

describe("commitAdventureDraft", () => {
  it("clears the local draft only after a successful commit", async () => {
    const onCommitDraft = async () => {
      throw new Error("Network error");
    };
    const clearDraft = vi.fn();

    await expect(
      commitAdventureDraft({
        draftContent: "opens the door",
        draftType: "action",
        isGM: false,
        myCharName: "Mira",
        isListening: false,
        stopListening: vi.fn(),
        onCommitDraft,
        clearDraft,
      }),
    ).rejects.toThrow("Network error");

    expect(clearDraft).not.toHaveBeenCalled();
  });

  it("normalizes player name prefixes before committing", async () => {
    const onCommitDraft = vi.fn().mockResolvedValue(undefined);
    const clearDraft = vi.fn();

    await expect(
      commitAdventureDraft({
        draftContent: "Mira draws the map",
        draftType: "action",
        isGM: false,
        myCharName: "Mira",
        isListening: true,
        stopListening: vi.fn(),
        onCommitDraft,
        clearDraft,
      }),
    ).resolves.toBe(true);

    expect(onCommitDraft).toHaveBeenCalledWith("draws the map", "action");
    expect(clearDraft).toHaveBeenCalledOnce();
  });
});
