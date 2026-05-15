import { describe, expect, it } from "vitest";
import {
  isLogTurnType,
  isStoryTurnType,
  parseIllustrationMetadata,
  parseRollMetadata,
  parseRollRequestMetadata,
  parseSceneBreakMetadata,
} from "@/lib/campaign-turns";

describe("campaign turn helpers", () => {
  it("classifies log and story turn types", () => {
    expect(isLogTurnType("roll-request")).toBe(true);
    expect(isLogTurnType("dialogue")).toBe(false);
    expect(isStoryTurnType("scene-break")).toBe(true);
    expect(isStoryTurnType("ooc")).toBe(false);
  });

  it("parses roll request metadata safely", () => {
    expect(parseRollRequestMetadata(JSON.stringify({
      targetUserId: "everyone",
      attribute: "bold",
      reason: "Hold the bridge",
      fatal: true,
    }))).toEqual({
      targetUserId: "everyone",
      attribute: "bold",
      reason: "Hold the bridge",
      fatal: true,
    });

    expect(parseRollRequestMetadata("{bad json")).toBeNull();
    expect(parseRollRequestMetadata(JSON.stringify({ attribute: "bold" }))).toBeNull();
  });

  it("round-trips roll-request status and requiredUserIds", () => {
    const meta = {
      targetUserId: "everyone",
      attribute: "keen",
      reason: "Spot the ambush",
      status: "open" as const,
      requiredUserIds: ["user-a", "user-b"],
    };
    expect(parseRollRequestMetadata(JSON.stringify(meta))).toEqual(meta);

    expect(parseRollRequestMetadata(JSON.stringify({
      targetUserId: "user-a",
      attribute: "bold",
      reason: "Force the door",
      status: "cancelled",
    }))?.status).toBe("cancelled");
  });

  it("rejects unknown roll-request status values", () => {
    expect(parseRollRequestMetadata(JSON.stringify({
      targetUserId: "everyone",
      attribute: "bold",
      reason: "Hold",
      status: "pending",
    }))).toBeNull();
  });

  it("parses scene, illustration, and roll metadata", () => {
    expect(parseSceneBreakMetadata(JSON.stringify({
      title: "The Black Gate",
      mood: "dread",
      aspects: ["storm", "ruin"],
    }))).toEqual({
      title: "The Black Gate",
      mood: "dread",
      aspects: ["storm", "ruin"],
    });

    expect(parseIllustrationMetadata(JSON.stringify({
      imageUrl: "https://example.com/scene.png",
      caption: "A bridge in rain",
    }))).toEqual({
      imageUrl: "https://example.com/scene.png",
      caption: "A bridge in rain",
    });

    expect(parseRollMetadata(JSON.stringify({
      total: 9,
      modifier: 1,
      attribute: "keen",
      tier: "partial",
      rollRequestTurnId: "request-1",
    }))).toEqual({
      total: 9,
      modifier: 1,
      attribute: "keen",
      tier: "partial",
      rollRequestTurnId: "request-1",
    });
  });
});
