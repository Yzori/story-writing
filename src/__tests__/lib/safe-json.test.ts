import { describe, it, expect } from "vitest";
import { safeParseJson } from "@/lib/safe-json";

describe("safeParseJson", () => {
  it("parses valid JSON", () => {
    expect(safeParseJson('{"key":"value"}', {})).toEqual({ key: "value" });
  });

  it("parses arrays", () => {
    expect(safeParseJson("[1,2,3]", [])).toEqual([1, 2, 3]);
  });

  it("parses primitives", () => {
    expect(safeParseJson("42", 0)).toBe(42);
    expect(safeParseJson('"hello"', "")).toBe("hello");
    expect(safeParseJson("true", false)).toBe(true);
    expect(safeParseJson("null", "fallback")).toBe(null);
  });

  it("returns fallback for invalid JSON", () => {
    expect(safeParseJson("{bad json}", "default")).toBe("default");
    expect(safeParseJson("not json", [])).toEqual([]);
  });

  it("returns fallback for null input", () => {
    expect(safeParseJson(null, "fallback")).toBe("fallback");
  });

  it("returns fallback for undefined input", () => {
    expect(safeParseJson(undefined, { default: true })).toEqual({ default: true });
  });

  it("returns fallback for empty string", () => {
    expect(safeParseJson("", 42)).toBe(42);
  });

  it("never throws", () => {
    // These would all throw with JSON.parse
    expect(() => safeParseJson("}{", "safe")).not.toThrow();
    expect(() => safeParseJson("'single quotes'", "safe")).not.toThrow();
    expect(() => safeParseJson(undefined, null)).not.toThrow();
  });
});
