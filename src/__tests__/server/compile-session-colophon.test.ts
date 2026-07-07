import { describe, expect, it } from "vitest";
import {
  compileSessionToHTML,
  type CompileContributor,
} from "@/server/services/compile-session";

// Slice A+B — the book that knows it was co-authored: provenance stamps on
// every block + the colophon (contributions and the split).

const GM = "gm-user";
const P1 = "player-1";
const P2 = "player-2";

function turn(over: Partial<{ id: string; userId: string; characterName: string | null; type: string; content: string; metadata: string | null }>) {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    userId: over.userId ?? GM,
    characterName: over.characterName ?? null,
    type: over.type ?? "narration",
    content: over.content ?? "text",
    metadata: over.metadata ?? null,
  };
}

const contributors: CompileContributor[] = [
  { userId: GM, role: "the Director", displayName: "Aldric", words: 30, isDirector: true },
  { userId: P1, role: "Sister Vael", displayName: "Mara", words: 12, isDirector: false },
  { userId: P2, role: "Corvin Ashe", displayName: "Jai", words: 8, isDirector: false },
];

describe("provenance stamps", () => {
  it("stamps every block with its single author", () => {
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: null,
      gmUserId: GM,
      turns: [
        turn({ userId: GM, type: "narration", content: "The door opens." }),
        turn({ userId: P1, type: "action", characterName: "Sister Vael", content: "She steps in." }),
      ],
    });
    expect(html).toContain(`data-author="${GM}"`);
    expect(html).toContain(`data-author-name="the Director"`);
    expect(html).toContain(`data-author="${P1}"`);
    expect(html).toContain(`data-author-name="Sister Vael"`);
  });

  it("keeps a player's description in its own block (single-author invariant)", () => {
    // A player description must NOT merge into the preceding GM narration —
    // otherwise the block would carry two authors and the stamp would lie.
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: null,
      gmUserId: GM,
      turns: [
        turn({ userId: GM, type: "narration", content: "Night falls." }),
        turn({ userId: P1, type: "description", characterName: "Sister Vael", content: "cold and starless" }),
      ],
    });
    // Two distinct authored blocks.
    expect(html).toContain(`data-author="${GM}"`);
    expect(html).toContain(`data-author="${P1}"`);
    expect((html.match(/<p data-author=/g) ?? []).length).toBe(2);
  });

  it("stamps the opening blockquote as the Director", () => {
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: "It begins.",
      gmUserId: GM,
      turns: [],
    });
    expect(html).toMatch(/<blockquote data-author="gm-user" data-author-name="the Director">/);
  });
});

describe("colophon", () => {
  it("lists the hands and their contributions", () => {
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: null,
      gmUserId: GM,
      turns: [turn({ userId: GM, content: "x" })],
      contributors,
    });
    expect(html).toContain("The hands that made this");
    expect(html).toContain("Aldric");
    expect(html).toContain("30 words");
    expect(html).toContain("Sister Vael");
    expect(html).toContain("12 words");
  });

  it("shows a signed split as signed", () => {
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: null,
      gmUserId: GM,
      turns: [turn({ userId: GM, content: "x" })],
      contributors,
      split: {
        usedAgreement: true,
        ownerId: GM,
        shares: [
          { userId: GM, percent: 50 },
          { userId: P1, percent: 30 },
          { userId: P2, percent: 20 },
        ],
      },
    });
    expect(html).toContain("split as signed");
    expect(html).toContain("Aldric 50%");
    expect(html).toContain("Mara 30%");
  });

  it("is honest when no split was signed", () => {
    const evenSplit = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: null,
      gmUserId: GM,
      turns: [turn({ userId: GM, content: "x" })],
      contributors,
      split: {
        usedAgreement: false,
        ownerId: GM,
        shares: [
          { userId: GM, percent: 33.3 },
          { userId: P1, percent: 33.3 },
          { userId: P2, percent: 33.3 },
        ],
      },
    });
    expect(evenSplit).toContain("shared evenly among the table");

    const ownerOnly = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: null,
      gmUserId: GM,
      turns: [turn({ userId: GM, content: "x" })],
      contributors,
      split: { usedAgreement: false, ownerId: GM, shares: [{ userId: GM, percent: 100 }] },
    });
    expect(ownerOnly).toContain("the take goes to Aldric");
  });

  it("omits the colophon entirely when there are no contributors", () => {
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: null,
      turns: [turn({ userId: GM, content: "x" })],
    });
    expect(html).not.toContain("The hands that made this");
  });
});

describe("byline (slice E)", () => {
  it("names the table up top, humans not characters", () => {
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: "It begins.",
      gmUserId: GM,
      turns: [turn({ userId: GM, content: "x" })],
      contributors,
    });
    expect(html).toContain("by the table — Aldric, Mara, and Jai");
    // Byline comes before the opening blockquote.
    expect(html.indexOf("by the table")).toBeLessThan(html.indexOf("<blockquote"));
  });

  it("reads naturally with two hands", () => {
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: null,
      gmUserId: GM,
      turns: [turn({ userId: GM, content: "x" })],
      contributors: contributors.slice(0, 2),
    });
    expect(html).toContain("by the table — Aldric and Mara");
  });

  it("credits a solo author plainly", () => {
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: null,
      gmUserId: GM,
      turns: [turn({ userId: GM, content: "x" })],
      contributors: contributors.slice(0, 1),
    });
    expect(html).toContain("by Aldric");
    expect(html).not.toContain("the table");
  });

  it("has no byline without contributors", () => {
    const html = compileSessionToHTML({
      sessionTitle: "T",
      sessionOpening: "It begins.",
      turns: [turn({ userId: GM, content: "x" })],
    });
    expect(html).not.toMatch(/>by /);
  });
});
