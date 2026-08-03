import { describe, it, expect } from "vitest";
import { countSyllables, countLineSyllables } from "@/lib/craft/syllables";

describe("countSyllables", () => {
  it("counts single-syllable words", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("sky")).toBe(1);
    expect(countSyllables("tree")).toBe(1);
    expect(countSyllables("the")).toBe(1);
    expect(countSyllables("eye")).toBe(1);
  });

  it("drops a silent final e", () => {
    expect(countSyllables("smile")).toBe(1);
    expect(countSyllables("whale")).toBe(1);
    expect(countSyllables("fire")).toBe(1);
  });

  it("keeps consonant + le as its own syllable", () => {
    expect(countSyllables("table")).toBe(2);
    expect(countSyllables("candle")).toBe(2);
    expect(countSyllables("little")).toBe(2);
    expect(countSyllables("people")).toBe(2);
  });

  it("silences -ed only after a consonant that is not t or d", () => {
    expect(countSyllables("hoped")).toBe(1);
    expect(countSyllables("whispered")).toBe(2);
    expect(countSyllables("wanted")).toBe(2);
    expect(countSyllables("folded")).toBe(2);
  });

  it("voices -es after a sibilant, silences it elsewhere", () => {
    expect(countSyllables("wishes")).toBe(2);
    expect(countSyllables("ashes")).toBe(2);
    expect(countSyllables("races")).toBe(2);
    expect(countSyllables("hopes")).toBe(1);
    expect(countSyllables("makes")).toBe(1);
  });

  it("splits vowel pairs that are really two syllables", () => {
    expect(countSyllables("poem")).toBe(2);
    expect(countSyllables("poetry")).toBe(3);
    expect(countSyllables("dial")).toBe(2);
    expect(countSyllables("giant")).toBe(2);
    expect(countSyllables("chaos")).toBe(2);
    expect(countSyllables("usual")).toBe(3);
  });

  it("leaves fused vowel pairs alone", () => {
    expect(countSyllables("special")).toBe(2);
    expect(countSyllables("nation")).toBe(2);
    expect(countSyllables("vision")).toBe(2);
    expect(countSyllables("guard")).toBe(1);
    expect(countSyllables("shoes")).toBe(1);
  });

  it("handles -ing after a vowel", () => {
    expect(countSyllables("being")).toBe(2);
    expect(countSyllables("seeing")).toBe(2);
    expect(countSyllables("dying")).toBe(2);
    expect(countSyllables("singing")).toBe(2);
    expect(countSyllables("writing")).toBe(2);
  });

  it("drops silent e inside -ely, -eful, -ement and compounds", () => {
    expect(countSyllables("lovely")).toBe(2);
    expect(countSyllables("hopeful")).toBe(2);
    expect(countSyllables("movement")).toBe(2);
    expect(countSyllables("something")).toBe(2);
    expect(countSyllables("someone")).toBe(2);
  });

  it("treats apostrophes as transparent and honours poetic elisions", () => {
    expect(countSyllables("heaven's")).toBe(2);
    expect(countSyllables("don't")).toBe(1);
    expect(countSyllables("o'er")).toBe(1);
    expect(countSyllables("ne'er")).toBe(1);
  });

  it("splits hyphenated compounds", () => {
    expect(countSyllables("moon-lit")).toBe(2);
    expect(countSyllables("self-same")).toBe(2);
  });

  it("uses the exception list for words the rules miss", () => {
    expect(countSyllables("business")).toBe(2);
    expect(countSyllables("rhythm")).toBe(2);
    expect(countSyllables("lion")).toBe(2);
    expect(countSyllables("idea")).toBe(3);
  });

  it("is case-insensitive", () => {
    expect(countSyllables("Poetry")).toBe(3);
    expect(countSyllables("CANDLE")).toBe(2);
  });

  it("returns 0 for empty or letterless input, never a negative", () => {
    expect(countSyllables("")).toBe(0);
    expect(countSyllables("   ")).toBe(0);
    expect(countSyllables("—")).toBe(0);
    expect(countSyllables("1999")).toBe(0);
  });

  it("counts at least one syllable for any word with letters", () => {
    expect(countSyllables("hmm")).toBe(1);
    expect(countSyllables("shh")).toBe(1);
  });
});

describe("countLineSyllables", () => {
  it("sums the words in a line", () => {
    expect(countLineSyllables("the woods are lovely dark and deep")).toBe(8);
  });

  it("counts a classic haiku line", () => {
    expect(countLineSyllables("an old silent pond")).toBe(5);
  });

  it("ignores punctuation between words", () => {
    expect(countLineSyllables("Hope is the thing with feathers—")).toBe(7);
  });

  it("counts hyphenated words as their parts", () => {
    expect(countLineSyllables("a moon-lit path")).toBe(4);
  });

  it("returns 0 for empty or whitespace-only lines", () => {
    expect(countLineSyllables("")).toBe(0);
    expect(countLineSyllables("   ")).toBe(0);
    expect(countLineSyllables("...")).toBe(0);
  });
});
