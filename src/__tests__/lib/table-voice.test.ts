import { describe, expect, it } from "vitest";
import { hasSecondPersonAddress, countTableVoicePassages } from "@/lib/table-voice";

// Slice D — table-voice detection. Detects "you"-address a reader trips on.
// Detection only; the human smooths it. Never an AI rewrite (the bright line).

describe("hasSecondPersonAddress", () => {
  it("catches second-person pronouns as whole words", () => {
    expect(hasSecondPersonAddress("the door opens on you")).toBe(true);
    expect(hasSecondPersonAddress("cold against your knuckles")).toBe(true);
    expect(hasSecondPersonAddress("the choice is yours")).toBe(true);
    expect(hasSecondPersonAddress("brace yourself")).toBe(true);
    expect(hasSecondPersonAddress("You're too late")).toBe(true); // apostrophe is a boundary
  });

  it("does not fire on third-person narration", () => {
    expect(hasSecondPersonAddress("the door opens on them")).toBe(false);
    expect(hasSecondPersonAddress("Vael crosses to the door")).toBe(false);
  });

  it("does not false-match 'you' inside another word", () => {
    expect(hasSecondPersonAddress("the young priest knelt")).toBe(false);
    expect(hasSecondPersonAddress("a yourt on the steppe")).toBe(false);
  });
});

describe("countTableVoicePassages", () => {
  it("counts only narration/consequence passages that address the table", () => {
    const turns = [
      { type: "narration", content: "The bell tolls beneath you." }, // 1
      { type: "narration", content: "Vael leans over the gunwale." }, // 0 (3rd person)
      { type: "consequence", content: "The cold climbs your wrist." }, // 1
      { type: "action", content: "I look at you, old friend." }, // player line — not counted
      { type: "dialogue", content: "Is that you?" }, // dialogue — not counted
    ];
    expect(countTableVoicePassages(turns)).toBe(2);
  });

  it("is zero for a clean book-voice session", () => {
    const turns = [
      { type: "narration", content: "The lantern goes out; the moon is enough." },
      { type: "action", content: "Corvin flexes his four-fingered hand." },
    ];
    expect(countTableVoicePassages(turns)).toBe(0);
  });
});
