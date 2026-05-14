import { describe, expect, it } from "vitest";
import { adventureDraftContentKey, adventureDraftTypeKey } from "@/hooks/use-adventure-draft";

describe("adventure draft storage keys", () => {
  it("keeps content and turn type in separate localStorage keys", () => {
    const sessionId = "session-1";

    expect(adventureDraftContentKey(sessionId)).toBe("inkwell-draft-session-1");
    expect(adventureDraftTypeKey(sessionId)).toBe("inkwell-draft-type-session-1");
  });
});
