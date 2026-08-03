import { describe, it, expect } from "vitest";
import { overlaysJsonSchema, createPanelsSchema, updatePanelSchema } from "@/lib/validations";
import { parseOverlays } from "@/types/editor";

const bubble = (extra: Record<string, unknown> = {}) => ({
  id: "b1",
  text: "Hello",
  x: 50,
  y: 40,
  width: 30,
  style: "speech",
  tailDirection: "bottom-left",
  fontSize: "medium",
  ...extra,
});

const parseJson = (input: unknown) => overlaysJsonSchema.safeParse(JSON.stringify(input));

describe("overlaysJsonSchema", () => {
  it("accepts a well-formed overlay and returns it as a JSON string", () => {
    const result = parseJson([bubble()]);
    expect(result.success).toBe(true);
    expect(JSON.parse(result.data as string)).toEqual([bubble()]);
  });

  it("accepts a legacy overlay with none of the new properties", () => {
    const result = parseJson([bubble()]);
    const [stored] = JSON.parse(result.data as string);
    expect(stored.ink).toBeUndefined();
    expect(stored.rotation).toBeUndefined();
    expect(stored.scale).toBeUndefined();
  });

  it("accepts the new ink, rotation and scale properties", () => {
    const result = parseJson([bubble({ ink: "gold", rotation: -12, scale: 1.4 })]);
    expect(result.success).toBe(true);
    const [stored] = JSON.parse(result.data as string);
    expect(stored).toMatchObject({ ink: "gold", rotation: -12, scale: 1.4 });
  });

  it("accepts an empty array and an empty string", () => {
    expect(parseJson([]).data).toBe("[]");
    expect(overlaysJsonSchema.safeParse("").data).toBe("[]");
  });

  // ── Clamping: bad numbers are corrected, never fatal ──────────

  it("clamps position and width into 0-100", () => {
    const result = parseJson([bubble({ x: 999, y: -50, width: 0 })]);
    expect(result.success).toBe(true);
    const [stored] = JSON.parse(result.data as string);
    expect(stored).toMatchObject({ x: 100, y: 0, width: 1 });
  });

  it("clamps rotation to +/-45 degrees", () => {
    const [over] = JSON.parse(parseJson([bubble({ rotation: 120 })]).data as string);
    const [under] = JSON.parse(parseJson([bubble({ rotation: -120 })]).data as string);
    expect(over.rotation).toBe(45);
    expect(under.rotation).toBe(-45);
  });

  it("clamps scale to 0.5-2", () => {
    const [big] = JSON.parse(parseJson([bubble({ scale: 40 })]).data as string);
    const [small] = JSON.parse(parseJson([bubble({ scale: 0.01 })]).data as string);
    expect(big.scale).toBe(2);
    expect(small.scale).toBe(0.5);
  });

  it("falls back to a safe number when a numeric field is not a number", () => {
    const result = parseJson([bubble({ x: "left", rotation: "sideways" })]);
    expect(result.success).toBe(true);
    const [stored] = JSON.parse(result.data as string);
    expect(stored.x).toBe(50);
    expect(stored.rotation).toBe(0);
  });

  it("fills in defaults for missing enum properties", () => {
    const result = overlaysJsonSchema.safeParse(
      JSON.stringify([{ id: "b1", text: "hi", x: 10, y: 10, width: 20 }])
    );
    expect(result.success).toBe(true);
    const [stored] = JSON.parse(result.data as string);
    expect(stored).toMatchObject({ style: "speech", tailDirection: "none", fontSize: "medium" });
  });

  // ── Rejection: malformed JSON and non-whitelisted keywords ────

  it("rejects malformed JSON", () => {
    expect(overlaysJsonSchema.safeParse("{not json").success).toBe(false);
  });

  it("rejects a payload that is not an array", () => {
    expect(parseJson({ id: "b1" }).success).toBe(false);
  });

  it("rejects an entry that is not an object", () => {
    expect(parseJson(["just a string"]).success).toBe(false);
  });

  it("rejects a style outside the whitelist", () => {
    expect(parseJson([bubble({ style: "speech; background:url(x)" })]).success).toBe(false);
  });

  it("rejects an ink, tail or size outside the whitelist", () => {
    expect(parseJson([bubble({ ink: "neon" })]).success).toBe(false);
    expect(parseJson([bubble({ tailDirection: "sideways" })]).success).toBe(false);
    expect(parseJson([bubble({ fontSize: "enormous" })]).success).toBe(false);
  });

  it("rejects text over the per-overlay cap", () => {
    expect(parseJson([bubble({ text: "x".repeat(2001) })]).success).toBe(false);
  });

  it("rejects more than 50 overlays on one panel", () => {
    const many = Array.from({ length: 51 }, (_, i) => bubble({ id: `b${i}` }));
    expect(parseJson(many).success).toBe(false);
  });

  it("rejects an overlays string over the 50KB cap", () => {
    expect(overlaysJsonSchema.safeParse("x".repeat(50_001)).success).toBe(false);
  });

  it("drops unknown properties instead of storing them", () => {
    const result = parseJson([bubble({ onclick: "alert(1)" })]);
    expect(result.success).toBe(true);
    expect(result.data as string).not.toContain("onclick");
  });
});

describe("panel schemas carry overlay validation", () => {
  it("sanitizes overlays on panel creation", () => {
    const result = createPanelsSchema.safeParse({
      panels: [{ imageData: "data:image/png;base64,AAA", overlays: JSON.stringify([bubble({ rotation: 90 })]) }],
    });
    expect(result.success).toBe(true);
    const [stored] = JSON.parse(result.data!.panels[0].overlays as string);
    expect(stored.rotation).toBe(45);
  });

  it("rejects a panel update whose overlays are malformed", () => {
    expect(updatePanelSchema.safeParse({ overlays: "{not json" }).success).toBe(false);
  });

  it("leaves a panel update without overlays alone", () => {
    const result = updatePanelSchema.safeParse({ caption: "A quiet street" });
    expect(result.success).toBe(true);
    expect(result.data!.overlays).toBeUndefined();
  });
});

describe("parseOverlays (read path)", () => {
  it("keeps legacy rows loading and normalizes what it cannot trust", () => {
    const overlays = parseOverlays(
      JSON.stringify([
        bubble(),
        { id: "b2", text: "x", x: 500, y: -5, width: 40, style: "evil", tailDirection: "nope", fontSize: "huge", rotation: 900, scale: 99 },
        "not an overlay",
      ])
    );

    expect(overlays).toHaveLength(2);
    expect(overlays[0]).toEqual(bubble());
    expect(overlays[1]).toMatchObject({
      x: 100,
      y: 0,
      style: "speech",
      tailDirection: "none",
      fontSize: "medium",
      rotation: 45,
      scale: 2,
    });
  });

  it("returns an empty list for malformed or non-array JSON", () => {
    expect(parseOverlays("{not json")).toEqual([]);
    expect(parseOverlays(JSON.stringify({ id: "b1" }))).toEqual([]);
    expect(parseOverlays("")).toEqual([]);
  });
});
