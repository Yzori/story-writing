import { describe, it, expect } from "vitest";
import {
  createCommentSchema,
  createUpdateSchema,
  createFlagSchema,
  createReactionSchema,
  updatePreferencesSchema,
  createCollaboratorSchema,
  updateCollaboratorSchema,
  createAgreementSchema,
  createSuggestionSchema,
  updateSuggestionSchema,
  createOpenCallSchema,
  createOpenCallResponseSchema,
  createLoreEntrySchema,
  createPlayerCharacterSchema,
  createBibleEntrySchema,
} from "@/lib/validations";

describe("Comment Schema", () => {
  it("accepts valid comment", () => {
    expect(createCommentSchema.safeParse({ content: "Great chapter!" }).success).toBe(true);
  });

  it("rejects empty comment", () => {
    expect(createCommentSchema.safeParse({ content: "" }).success).toBe(false);
  });

  it("rejects comment over 2000 chars", () => {
    expect(createCommentSchema.safeParse({ content: "x".repeat(2001) }).success).toBe(false);
  });

  it("accepts optional parentId UUID", () => {
    const r = createCommentSchema.safeParse({
      content: "Reply",
      parentId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(r.success).toBe(true);
  });

  it("rejects non-UUID parentId", () => {
    expect(
      createCommentSchema.safeParse({ content: "Reply", parentId: "not-uuid" }).success
    ).toBe(false);
  });
});

describe("Creator Update Schema", () => {
  it("accepts valid update", () => {
    expect(createUpdateSchema.safeParse({ content: "New chapter coming!" }).success).toBe(true);
  });

  it("rejects empty update", () => {
    expect(createUpdateSchema.safeParse({ content: "" }).success).toBe(false);
  });

  it("rejects update over 1000 chars", () => {
    expect(createUpdateSchema.safeParse({ content: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("Flag Schema", () => {
  it("accepts valid flag", () => {
    expect(createFlagSchema.safeParse({ reason: "spam" }).success).toBe(true);
  });

  it("accepts all reason types", () => {
    for (const reason of ["misrated", "harmful", "spam"]) {
      expect(createFlagSchema.safeParse({ reason }).success).toBe(true);
    }
  });

  it("rejects invalid reason", () => {
    expect(createFlagSchema.safeParse({ reason: "hate" }).success).toBe(false);
  });
});

describe("Reaction Schema", () => {
  it("accepts all reaction types", () => {
    const types = [
      "gasped", "cried", "laughed", "need-more",
      "saw-it-coming", "heartbroken", "inspired", "terrified",
    ];
    for (const type of types) {
      expect(createReactionSchema.safeParse({ type }).success).toBe(true);
    }
  });

  it("rejects invalid reaction type", () => {
    expect(createReactionSchema.safeParse({ type: "confused" }).success).toBe(false);
  });
});

describe("Preferences Schema", () => {
  it("accepts valid preferences", () => {
    const r = updatePreferencesSchema.safeParse({
      comfortRating: "teen",
      readingMode: "scroll",
      readingFont: "serif",
    });
    expect(r.success).toBe(true);
  });

  it("accepts empty (no changes)", () => {
    expect(updatePreferencesSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid comfort rating", () => {
    expect(
      updatePreferencesSchema.safeParse({ comfortRating: "nsfw" }).success
    ).toBe(false);
  });
});

describe("Collaborator Schemas", () => {
  it("accepts valid collaborator invite", () => {
    const r = createCollaboratorSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440001",
      role: "writer",
    });
    expect(r.success).toBe(true);
  });

  it("accepts all roles", () => {
    for (const role of ["writer", "illustrator", "editor", "worldbuilder"]) {
      expect(
        createCollaboratorSchema.safeParse({
          userId: "550e8400-e29b-41d4-a716-446655440001",
          role,
        }).success
      ).toBe(true);
    }
  });

  it("rejects non-UUID userId", () => {
    expect(
      createCollaboratorSchema.safeParse({ userId: "bob", role: "writer" }).success
    ).toBe(false);
  });

  it("update accepts valid status transitions", () => {
    for (const status of ["pending", "accepted", "declined"]) {
      expect(updateCollaboratorSchema.safeParse({ status }).success).toBe(true);
    }
  });
});

describe("Agreement Schema", () => {
  it("accepts valid agreement with splits totaling 100", () => {
    const r = createAgreementSchema.safeParse({
      template: "equal-partners",
      splits: [
        { userId: "550e8400-e29b-41d4-a716-446655440001", percent: 50 },
        { userId: "550e8400-e29b-41d4-a716-446655440002", percent: 50 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects splits not totaling 100", () => {
    const r = createAgreementSchema.safeParse({
      template: "equal-partners",
      splits: [
        { userId: "550e8400-e29b-41d4-a716-446655440001", percent: 60 },
        { userId: "550e8400-e29b-41d4-a716-446655440002", percent: 30 },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty splits", () => {
    const r = createAgreementSchema.safeParse({
      template: "equal-partners",
      splits: [],
    });
    expect(r.success).toBe(false);
  });

  it("accepts all template types", () => {
    for (const template of ["equal-partners", "lead-contributor", "work-for-hire", "custom"]) {
      const r = createAgreementSchema.safeParse({
        template,
        splits: [{ userId: "550e8400-e29b-41d4-a716-446655440001", percent: 100 }],
      });
      expect(r.success).toBe(true);
    }
  });
});

describe("Suggestion Schema", () => {
  it("accepts valid suggestion", () => {
    const r = createSuggestionSchema.safeParse({
      chapterId: "550e8400-e29b-41d4-a716-446655440001",
      content: "How about changing the ending?",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty content", () => {
    expect(
      createSuggestionSchema.safeParse({
        chapterId: "550e8400-e29b-41d4-a716-446655440001",
        content: "",
      }).success
    ).toBe(false);
  });

  it("update accepts valid statuses", () => {
    for (const status of ["pending", "woven", "revised", "passed"]) {
      expect(updateSuggestionSchema.safeParse({ status }).success).toBe(true);
    }
  });
});

describe("Open Call Schema", () => {
  it("accepts valid call", () => {
    const r = createOpenCallSchema.safeParse({
      role: "Illustrator",
      title: "Need cover artist",
      description: "Looking for someone to design the cover",
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(createOpenCallSchema.safeParse({}).success).toBe(false);
    expect(createOpenCallSchema.safeParse({ role: "Writer" }).success).toBe(false);
  });

  it("response accepts valid pitch", () => {
    expect(
      createOpenCallResponseSchema.safeParse({ pitch: "I'd love to help!" }).success
    ).toBe(true);
  });

  it("response rejects empty pitch", () => {
    expect(createOpenCallResponseSchema.safeParse({ pitch: "" }).success).toBe(false);
  });
});

describe("Lore Entry Schema", () => {
  it("accepts all categories", () => {
    for (const category of ["character", "place", "event", "item", "lore"]) {
      expect(
        createLoreEntrySchema.safeParse({ category, title: "Entry" }).success
      ).toBe(true);
    }
  });

  it("rejects invalid category", () => {
    expect(
      createLoreEntrySchema.safeParse({ category: "magic", title: "Entry" }).success
    ).toBe(false);
  });
});

describe("Player Character Schema", () => {
  it("accepts valid character", () => {
    const r = createPlayerCharacterSchema.safeParse({
      name: "Aragorn",
      description: "A ranger from the north",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(createPlayerCharacterSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects name over 200 chars", () => {
    expect(
      createPlayerCharacterSchema.safeParse({ name: "x".repeat(201) }).success
    ).toBe(false);
  });
});

describe("Bible Entry Schema", () => {
  it("accepts all entry types", () => {
    for (const type of ["character", "place", "note"]) {
      expect(
        createBibleEntrySchema.safeParse({ type, name: "Entry" }).success
      ).toBe(true);
    }
  });

  it("rejects invalid type", () => {
    expect(
      createBibleEntrySchema.safeParse({ type: "item", name: "Entry" }).success
    ).toBe(false);
  });
});
