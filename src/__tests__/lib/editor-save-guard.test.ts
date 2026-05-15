import { describe, expect, it } from "vitest";
import { canProceedAfterSaveFlush, getSaveGuardMessage } from "@/lib/editor-save-guard";

describe("editor save guard", () => {
  it("blocks risky editor actions after a failed flush", () => {
    expect(canProceedAfterSaveFlush(false)).toBe(false);
  });

  it("allows risky editor actions after a successful flush", () => {
    expect(canProceedAfterSaveFlush(true)).toBe(true);
  });

  it("uses action-specific failure messages", () => {
    expect(getSaveGuardMessage("publish")).toContain("publish cancelled");
    expect(getSaveGuardMessage("chapter-switch")).toContain("chapter switch cancelled");
    expect(getSaveGuardMessage("delete")).toContain("delete cancelled");
  });
});
