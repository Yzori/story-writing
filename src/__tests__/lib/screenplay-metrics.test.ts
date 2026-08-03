import { describe, expect, it } from "vitest";
import {
  estimateScreenplayMetrics,
  type ScreenplayDocNode,
} from "@/lib/craft/screenplay-metrics";

// Page estimation lays the script on the Courier grid: 55 lines a page,
// a fixed measure per element, standard blank lines between elements.
// `lines` is the unit under test — pages are that number over 55.

function block(type: string, text: string): ScreenplayDocNode {
  return { type, content: text ? [{ type: "text", text }] : [] };
}

function doc(...blocks: ScreenplayDocNode[]): ScreenplayDocNode {
  return { type: "doc", content: blocks };
}

/** `n` four-letter words joined by spaces: 5n - 1 characters. */
function filler(n: number): string {
  return Array.from({ length: n }, () => "word").join(" ");
}

const EMPTY = { pages: 0, runtimeMinutes: 0, sceneCount: 0, wordCount: 0, lines: 0 };

describe("estimateScreenplayMetrics", () => {
  it("is all zeros for an empty, missing, or blank doc", () => {
    expect(estimateScreenplayMetrics(null)).toEqual(EMPTY);
    expect(estimateScreenplayMetrics(doc())).toEqual(EMPTY);
    expect(estimateScreenplayMetrics(doc(block("action", "")))).toEqual(EMPTY);
  });

  it("counts a short scene on the grid", () => {
    // scene(1) + blank(1) + action(1) + blank(1) + character(1) + dialogue(1)
    const metrics = estimateScreenplayMetrics(
      doc(
        block("sceneHeading", "INT. LIGHTHOUSE - NIGHT"),
        block("action", "Rain on the glass."),
        block("characterName", "MAREN"),
        block("dialogue", "It's not coming back.")
      )
    );
    expect(metrics.lines).toBe(6);
    expect(metrics.sceneCount).toBe(1);
    expect(metrics.wordCount).toBe(13);
  });

  it("wraps action at 61 characters and dialogue at 35", () => {
    const long = filler(16); // 79 characters
    expect(estimateScreenplayMetrics(doc(block("action", long))).lines).toBe(2);
    expect(estimateScreenplayMetrics(doc(block("dialogue", long))).lines).toBe(3);
    // Right at the measure: 59 characters still fits one action line.
    expect(estimateScreenplayMetrics(doc(block("action", filler(12)))).lines).toBe(1);
  });

  it("spills a word longer than the measure onto further lines", () => {
    expect(estimateScreenplayMetrics(doc(block("dialogue", "x".repeat(80)))).lines).toBe(3);
  });

  it("gives a parenthetical the brackets the editor draws in CSS", () => {
    // 20 chars of text, 22 with brackets — fits the 25-char measure.
    expect(
      estimateScreenplayMetrics(doc(block("parenthetical", "beat and then softer"))).lines
    ).toBe(1);
    // 26 chars becomes 28 with brackets and wraps.
    expect(
      estimateScreenplayMetrics(doc(block("parenthetical", "quietly, almost to himself"))).lines
    ).toBe(2);
  });

  it("puts two blank lines above a scene heading and none inside a speech", () => {
    const metrics = estimateScreenplayMetrics(
      doc(
        block("sceneHeading", "INT. CAR - DAY"),
        block("characterName", "PILAR"),
        block("parenthetical", "flat"),
        block("dialogue", "Drive."),
        block("sceneHeading", "EXT. ROAD - DAY")
      )
    );
    // scene(1) + blank(1) + char(1) + paren(1) + dialogue(1) + blank(2) + scene(1)
    expect(metrics.lines).toBe(8);
    expect(metrics.sceneCount).toBe(2);
  });

  it("separates two speeches that are not joined by a character name", () => {
    const joined = doc(block("characterName", "ADE"), block("dialogue", "Now."));
    const loose = doc(block("dialogue", "Now."), block("dialogue", "Later."));
    expect(estimateScreenplayMetrics(joined).lines).toBe(2); // flush
    expect(estimateScreenplayMetrics(loose).lines).toBe(3); // blank between
  });

  it("treats bare paragraphs as action and skips empty blocks", () => {
    const metrics = estimateScreenplayMetrics(
      doc(
        block("paragraph", "He waits."),
        block("action", ""),
        block("paragraph", "She does not.")
      )
    );
    expect(metrics.lines).toBe(3); // the empty block prints nothing
    expect(metrics.wordCount).toBe(5);
  });

  it("breaks a line on a hard break", () => {
    const node: ScreenplayDocNode = {
      type: "action",
      content: [
        { type: "text", text: "A door." },
        { type: "hardBreak" },
        { type: "text", text: "Then another." },
      ],
    };
    expect(estimateScreenplayMetrics(doc(node)).lines).toBe(2);
  });

  it("reads about a minute a page", () => {
    // 28 single-line actions with a blank between: 55 lines exactly.
    const metrics = estimateScreenplayMetrics(
      doc(...Array.from({ length: 28 }, () => block("action", filler(12))))
    );
    expect(metrics.lines).toBe(55);
    expect(metrics.pages).toBe(1);
    expect(metrics.runtimeMinutes).toBe(1);
  });

  it("rounds pages to a tenth and runtime to whole minutes", () => {
    const metrics = estimateScreenplayMetrics(
      doc(...Array.from({ length: 100 }, () => block("action", filler(12))))
    );
    expect(metrics.lines).toBe(199); // 100 lines + 99 blanks
    expect(metrics.pages).toBe(3.6);
    expect(metrics.runtimeMinutes).toBe(4);
  });

  it("never reports zero pages or minutes for a script that has content", () => {
    const metrics = estimateScreenplayMetrics(doc(block("action", "A single line.")));
    expect(metrics.pages).toBe(0.1);
    expect(metrics.runtimeMinutes).toBe(1);
  });
});
